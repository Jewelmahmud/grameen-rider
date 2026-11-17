import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/grameen_config.dart';
import '../models/json.dart';
import '../models/offer.dart';
import 'realtime_events.dart';

enum RealtimeConnection { disconnected, connecting, connected }

/// Supplies a valid access token, refreshing it if needed (`Session.accessToken`).
typedef TokenProvider = Future<String?> Function();

/// Socket.IO connection to the backend gateway, exposed as typed streams.
///
/// The socket logs in with the access token. When the server reports the
/// token expired or refused, the client asks [TokenProvider] for a fresh one
/// and reconnects once; if that fails too, [authFailures] gets the code and
/// the client stays disconnected (the app should send the user to login).
///
/// Trip rooms joined with [joinTrip] are re-joined after every reconnect.
/// Duplicate `trip.offer` events for the same offer are collapsed.
class RealtimeClient {
  RealtimeClient({required GrameenConfig config, @visibleForTesting this.socketFactory})
      : _url = config.socketUrl;

  /// Builds the socket; tests replace it.
  final io.Socket Function(String url, Map<String, dynamic> auth)? socketFactory;

  final String _url;
  io.Socket? _socket;
  TokenProvider? _tokenProvider;
  bool _retriedAuth = false;
  final Set<String> _joinedTrips = {};
  final Set<String> _seenOffers = {};

  final _connection = StreamController<RealtimeConnection>.broadcast();
  final _authFailures = StreamController<String>.broadcast();
  final _tripCreated = StreamController<TripCreatedEvent>.broadcast();
  final _tripStatus = StreamController<TripStatusEvent>.broadcast();
  final _driverLocation = StreamController<DriverLocationEvent>.broadcast();
  final _offers = StreamController<DriverOffer>.broadcast();
  final _offersClosed = StreamController<OfferClosedEvent>.broadcast();
  final _dispatchPaused = StreamController<DispatchPausedEvent>.broadcast();

  RealtimeConnection _state = RealtimeConnection.disconnected;

  RealtimeConnection get state => _state;
  Stream<RealtimeConnection> get connection => _connection.stream;

  /// Codes such as `MISSING_TOKEN`, `INVALID_TOKEN`, `ACCOUNT_BLOCKED`.
  Stream<String> get authFailures => _authFailures.stream;
  Stream<TripCreatedEvent> get tripCreated => _tripCreated.stream;
  Stream<TripStatusEvent> get tripStatus => _tripStatus.stream;
  Stream<DriverLocationEvent> get driverLocation => _driverLocation.stream;

  /// Driver app: a trip offered to this driver. Show it with a countdown to
  /// `expiresAt`, then call `TripsApi.acceptOffer` or `declineOffer`.
  Stream<DriverOffer> get offers => _offers.stream;
  Stream<OfferClosedEvent> get offersClosed => _offersClosed.stream;
  Stream<DispatchPausedEvent> get dispatchPaused => _dispatchPaused.stream;

  /// Connects with a token from [tokenProvider]. Does nothing when already
  /// connected or when there is no token (signed out).
  Future<void> connect({required TokenProvider tokenProvider}) async {
    if (_socket != null) return;
    _tokenProvider = tokenProvider;
    _retriedAuth = false;
    await _open();
  }

  Future<void> _open() async {
    final token = await _tokenProvider?.call();
    if (token == null) {
      _setState(RealtimeConnection.disconnected);
      _authFailures.add('MISSING_TOKEN');
      return;
    }
    final auth = <String, dynamic>{'token': token};
    final socket = socketFactory?.call(_url, auth) ??
        io.io(
          _url,
          io.OptionBuilder()
              .setTransports(['websocket'])
              .setAuth(auth)
              .disableAutoConnect()
              .enableReconnection()
              .build(),
        );
    _socket = socket;

    socket
      ..on(RealtimeEvents.connected, (_) {
        _retriedAuth = false;
        for (final tripId in _joinedTrips) {
          socket.emit(RealtimeEvents.joinTrip, {'tripId': tripId});
        }
        _setState(RealtimeConnection.connected);
      })
      ..on(RealtimeEvents.authError, (data) => _onAuthProblem(_codeOf(data, 'INVALID_TOKEN')))
      ..on(RealtimeEvents.authExpired, (data) => _onAuthProblem(_codeOf(data, 'TOKEN_EXPIRED')))
      ..onDisconnect((_) => _setState(RealtimeConnection.disconnected))
      ..onReconnectAttempt((_) => _setState(RealtimeConnection.connecting));

    for (final event in const [
      RealtimeEvents.tripCreated,
      RealtimeEvents.tripStatusUpdated,
      RealtimeEvents.driverLocationUpdated,
      RealtimeEvents.tripOffer,
      RealtimeEvents.tripOfferClosed,
      RealtimeEvents.dispatchPaused,
    ]) {
      socket.on(event, (data) => handleEvent(event, data));
    }

    _setState(RealtimeConnection.connecting);
    socket.connect();
  }

  /// The server rejected or expired our token: try once more with a fresh one.
  Future<void> _onAuthProblem(String code) async {
    _closeSocket();
    if (!_retriedAuth && code != 'ACCOUNT_BLOCKED') {
      _retriedAuth = true;
      await _open();
      return;
    }
    _setState(RealtimeConnection.disconnected);
    _authFailures.add(code);
  }

  /// Follow a trip's status and driver location (passenger, assigned driver).
  void joinTrip(String tripId) {
    if (_joinedTrips.add(tripId) && _state == RealtimeConnection.connected) {
      _socket?.emit(RealtimeEvents.joinTrip, {'tripId': tripId});
    }
  }

  /// Stops re-joining [tripId] after reconnects. The gateway has no
  /// `leave_trip`, so the room is left on the next reconnect.
  void forgetTrip(String tripId) => _joinedTrips.remove(tripId);

  /// Driver app only. Send every few seconds while online; include `tripId`
  /// during a trip so the passenger sees the car move.
  void sendDriverLocation(DriverLocationPing ping) {
    _socket?.emit(RealtimeEvents.driverLocationPing, ping.toJson());
  }

  void disconnect() {
    _closeSocket();
    _tokenProvider = null;
    _joinedTrips.clear();
    _seenOffers.clear();
    _setState(RealtimeConnection.disconnected);
  }

  /// Closes all streams. The client cannot be used afterwards.
  void dispose() {
    disconnect();
    for (final c in [
      _connection,
      _authFailures,
      _tripCreated,
      _tripStatus,
      _driverLocation,
      _offers,
      _offersClosed,
      _dispatchPaused,
    ]) {
      c.close();
    }
  }

  /// Routes a raw socket event to its stream. Public for tests.
  @visibleForTesting
  void handleEvent(String event, Object? data) {
    if (data is! Map) return;
    final json = asJson(data);
    switch (event) {
      case RealtimeEvents.tripCreated when json['tripId'] != null:
        _tripCreated.add(TripCreatedEvent.fromJson(json));
      case RealtimeEvents.tripStatusUpdated when json['tripId'] != null:
        _tripStatus.add(TripStatusEvent.fromJson(json));
      case RealtimeEvents.driverLocationUpdated when json['tripId'] != null:
        _driverLocation.add(DriverLocationEvent.fromJson(json));
      case RealtimeEvents.tripOffer when json['offerId'] != null:
        if (_seenOffers.add(json['offerId'].toString())) _offers.add(DriverOffer.fromJson(json));
      case RealtimeEvents.tripOfferClosed when json['tripId'] != null:
        _offersClosed.add(OfferClosedEvent.fromJson(json));
      case RealtimeEvents.dispatchPaused:
        _dispatchPaused.add(DispatchPausedEvent.fromJson(json));
    }
  }

  void _closeSocket() {
    _socket
      ?..clearListeners()
      ..disconnect()
      ..dispose();
    _socket = null;
  }

  static String _codeOf(Object? data, String fallback) =>
      data is Map && data['code'] != null ? data['code'].toString() : fallback;

  void _setState(RealtimeConnection state) {
    if (_state == state || _connection.isClosed) return;
    _state = state;
    _connection.add(state);
  }
}
