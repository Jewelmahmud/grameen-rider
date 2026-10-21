import 'package:socket_io_client/socket_io_client.dart' as io;

class RealtimeService {
  RealtimeService._();

  static final RealtimeService instance = RealtimeService._();

  io.Socket? _socket;

  bool get isConnected => _socket?.connected ?? false;

  void connect({
    required String userProfileId,
    String role = 'driver',
    String baseUrl = 'http://localhost:5006',
  }) {
    if (_socket?.connected == true) return;

    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth({'userProfileId': userProfileId, 'role': role})
          .build(),
    );

    _socket!.onConnect((_) {
      _socket!.emit('register', {'userProfileId': userProfileId, 'role': role});
    });
  }

  void on(String event, void Function(dynamic data) handler) {
    _socket?.on(event, handler);
  }

  void joinTrip(String tripId) {
    _socket?.emit('join_trip', {'tripId': tripId});
  }

  void emitDriverLocationPing({
    required String tripId,
    required String driverId,
    required double latitude,
    required double longitude,
  }) {
    _socket?.emit('driver_location_ping', {
      'tripId': tripId,
      'driverId': driverId,
      'latitude': latitude,
      'longitude': longitude,
    });
  }

  void off(String event) {
    _socket?.off(event);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
