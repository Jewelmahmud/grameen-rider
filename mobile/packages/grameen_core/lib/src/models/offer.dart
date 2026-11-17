import 'enums.dart';
import 'json.dart';
import 'quote.dart';

/// A trip offered to this driver alone, with a deadline. Comes from the
/// `trip.offer` socket event or `GET /drivers/me/offers/current`.
/// Answer with `TripsApi.acceptOffer` / `declineOffer` before [expiresAt].
class DriverOffer {
  const DriverOffer({
    required this.offerId,
    required this.tripId,
    required this.pickup,
    required this.dropoff,
    required this.expiresAt,
    this.tripNumber,
    this.serviceType = ServiceType.ride,
    this.vehicleType = VehicleType.unknown,
    this.scheduledAt,
    this.distanceToPickupKm = 0,
    this.tripDistanceKm,
    this.total = 0,
    this.driverEarning = 0,
    this.paymentMethod,
    this.passengerFirstName,
    this.passengerEmployeeBadge,
  });

  factory DriverOffer.fromJson(Json json) {
    final passenger = asJson(json['passenger']);
    return DriverOffer(
      offerId: json['offerId'].toString(),
      tripId: json['tripId'].toString(),
      tripNumber: asString(json['tripNumber']),
      serviceType: ServiceType.fromWire(json['serviceType']),
      vehicleType: VehicleType.fromWire(json['vehicleType']),
      pickup: GeoPoint.fromJson(asJson(json['pickup'])),
      dropoff: GeoPoint.fromJson(asJson(json['dropoff'])),
      scheduledAt: asDate(json['scheduledAt']),
      distanceToPickupKm: asDouble(json['distanceToPickupKm']) ?? 0,
      tripDistanceKm: asDouble(json['tripDistanceKm']),
      total: asDouble(json['total']) ?? 0,
      driverEarning: asDouble(json['driverEarning']) ?? 0,
      paymentMethod: asString(json['paymentMethod']),
      passengerFirstName: asString(passenger['firstName']),
      passengerEmployeeBadge: asString(passenger['employeeBadge']),
      expiresAt: asDate(json['expiresAt']) ?? DateTime.now(),
    );
  }

  final String offerId;
  final String tripId;
  final String? tripNumber;
  final ServiceType serviceType;
  final VehicleType vehicleType;
  final GeoPoint pickup;
  final GeoPoint dropoff;

  /// Set for rentals and scheduled rides.
  final DateTime? scheduledAt;
  final double distanceToPickupKm;
  final double? tripDistanceKm;

  /// What the passenger pays.
  final double total;

  /// What the driver earns: based on the full fare, even when the passenger
  /// has a discount.
  final double driverEarning;
  final String? paymentMethod;
  final String? passengerFirstName;

  /// Set when the passenger is a GiLab employee, e.g. "GiLab কর্মী · Manager".
  final String? passengerEmployeeBadge;
  final DateTime expiresAt;

  Duration timeLeft([DateTime? now]) {
    final left = expiresAt.difference(now ?? DateTime.now());
    return left.isNegative ? Duration.zero : left;
  }

  bool isExpired([DateTime? now]) => timeLeft(now) == Duration.zero;
}
