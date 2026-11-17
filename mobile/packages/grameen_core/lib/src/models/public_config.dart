import 'enums.dart';
import 'json.dart';

/// `GET /config/public`: admin settings the apps need before login.
/// Every getter falls back to the server's own default, so a missing key never
/// breaks the app.
class PublicConfig {
  const PublicConfig(this.values);

  factory PublicConfig.fromJson(Json json) => PublicConfig(json);

  /// Raw settings, keyed like `service.ride.vehicleTypes`.
  final Json values;

  List<VehicleType> get rideVehicleTypes =>
      _types('service.ride.vehicleTypes', VehicleType.launch);
  List<VehicleType> get rentalVehicleTypes =>
      _types('service.rental.vehicleTypes', const [VehicleType.car]);

  List<VehicleType> vehicleTypesFor(ServiceType service) =>
      service == ServiceType.rental ? rentalVehicleTypes : rideVehicleTypes;

  /// Payment methods customers can choose; cash at launch.
  List<String> get paymentMethods {
    final v = asStringList(values['payments.methods']);
    return v.isEmpty ? const ['cash'] : v;
  }

  int get rideScheduledMinLeadMinutes => _int('service.ride.scheduledMinLeadMinutes', 30);
  int get rideScheduledMaxDaysAhead => _int('service.ride.scheduledMaxDaysAhead', 7);
  int get rentalMinLeadMinutes => _int('service.rental.minLeadMinutes', 120);
  int get rentalMaxDaysAhead => _int('service.rental.maxDaysAhead', 30);

  String? get supportPhone => _text('support.phone');
  String? get supportWhatsapp => _text('support.whatsapp');

  bool get maintenance => asBool(values['maintenance.enabled']);
  String? get maintenanceMessage => _text('maintenance.message');

  List<VehicleType> _types(String key, List<VehicleType> fallback) {
    if (values[key] is! List) return fallback;
    return asStringList(values[key])
        .map(VehicleType.fromWire)
        .where((t) => t != VehicleType.unknown)
        .toList();
  }

  int _int(String key, int fallback) => asInt(values[key]) ?? fallback;

  String? _text(String key) {
    final v = asString(values[key])?.trim();
    return v == null || v.isEmpty ? null : v;
  }
}
