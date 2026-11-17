import '../models/enums.dart';
import '../models/json.dart';

/// Socket.IO event names used by `backend/src/realtime`.
///
/// The socket authenticates with the access token (`auth: {token}`); the
/// server works out who you are from it. Events go only to the people
/// involved: the passenger, the assigned driver, the driver an offer is for.
abstract final class RealtimeEvents {
  // client → server
  static const joinTrip = 'join_trip';
  static const driverLocationPing = 'driver_location_ping';

  // server → client: connection
  /// Sent after the token was accepted, with `{userProfileId, platformRoles, driverId}`.
  static const connected = 'connected';

  /// Token missing or refused (`{code}`); the server disconnects.
  static const authError = 'auth_error';

  /// The token ran out while connected; reconnect with a fresh one.
  static const authExpired = 'auth_expired';

  // server → client: trips
  static const tripCreated = 'trip.created';
  static const tripStatusUpdated = 'trip.status.updated';
  static const driverLocationUpdated = 'driver.location.updated';

  // server → client: driver only
  /// A trip offered to this driver alone, with a deadline.
  static const tripOffer = 'trip.offer';

  /// An offer ended before the driver answered (`{offerId, tripId, reason}`).
  static const tripOfferClosed = 'trip.offer.closed';

  /// Too many declines in a row: no offers until `until`.
  static const dispatchPaused = 'dispatch.paused';
}

/// `trip.created`, sent to the passenger who booked.
class TripCreatedEvent {
  const TripCreatedEvent({
    required this.tripId,
    this.tripNumber,
    required this.status,
    this.serviceType = ServiceType.ride,
  });

  factory TripCreatedEvent.fromJson(Json json) => TripCreatedEvent(
        tripId: json['tripId'].toString(),
        tripNumber: asString(json['tripNumber']),
        status: TripStatus.fromWire(json['status']),
        serviceType: ServiceType.fromWire(json['serviceType']),
      );

  final String tripId;
  final String? tripNumber;
  final TripStatus status;
  final ServiceType serviceType;
}

/// `trip.status.updated`, to the passenger, the driver and the trip room.
class TripStatusEvent {
  const TripStatusEvent({
    required this.tripId,
    required this.status,
    this.oldStatus,
    this.driverId,
    this.serviceType = ServiceType.ride,
  });

  factory TripStatusEvent.fromJson(Json json) => TripStatusEvent(
        tripId: json['tripId'].toString(),
        status: TripStatus.fromWire(json['status']),
        oldStatus: json['oldStatus'] == null ? null : TripStatus.fromWire(json['oldStatus']),
        driverId: asString(json['driverId']),
        serviceType: ServiceType.fromWire(json['serviceType']),
      );

  final String tripId;
  final TripStatus status;
  final TripStatus? oldStatus;
  final String? driverId;
  final ServiceType serviceType;
}

/// `driver.location.updated`, to the passenger and the trip room.
class DriverLocationEvent {
  const DriverLocationEvent({
    required this.tripId,
    required this.driverId,
    required this.latitude,
    required this.longitude,
    this.heading,
    this.speedKmh,
    this.timestamp,
  });

  factory DriverLocationEvent.fromJson(Json json) => DriverLocationEvent(
        tripId: json['tripId'].toString(),
        driverId: asString(json['driverId']) ?? '',
        latitude: asDouble(json['latitude']) ?? 0,
        longitude: asDouble(json['longitude']) ?? 0,
        heading: asDouble(json['heading']),
        speedKmh: asDouble(json['speedKmh']),
        timestamp: asDate(json['timestamp']),
      );

  final String tripId;
  final String driverId;
  final double latitude;
  final double longitude;
  final double? heading;
  final double? speedKmh;
  final DateTime? timestamp;
}

/// Body of `driver_location_ping`. The server takes the driver from the token;
/// without [tripId] it only updates the driver's position for matching.
class DriverLocationPing {
  const DriverLocationPing({
    required this.latitude,
    required this.longitude,
    this.tripId,
    this.heading,
    this.speedKmh,
  });

  final double latitude;
  final double longitude;
  final String? tripId;
  final double? heading;
  final double? speedKmh;

  Json toJson() => compactJson({
        'tripId': tripId,
        'latitude': latitude,
        'longitude': longitude,
        'heading': heading,
        'speedKmh': speedKmh,
      });
}

/// `trip.offer.closed`: dismiss the offer card for [tripId].
class OfferClosedEvent {
  const OfferClosedEvent({required this.offerId, required this.tripId, this.reason});

  factory OfferClosedEvent.fromJson(Json json) => OfferClosedEvent(
        offerId: asString(json['offerId']) ?? '',
        tripId: json['tripId'].toString(),
        reason: asString(json['reason']),
      );

  final String offerId;
  final String tripId;

  /// e.g. `timeout`, `trip_cancelled`, `assigned_by_staff`.
  final String? reason;
}

/// `dispatch.paused`: the driver declined too many offers in a row.
class DispatchPausedEvent {
  const DispatchPausedEvent({required this.until, this.reason});

  factory DispatchPausedEvent.fromJson(Json json) => DispatchPausedEvent(
        until: asDate(json['until']) ?? DateTime.now(),
        reason: asString(json['reason']),
      );

  final DateTime until;
  final String? reason;
}
