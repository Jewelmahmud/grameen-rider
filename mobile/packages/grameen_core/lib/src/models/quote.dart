import 'enums.dart';
import 'json.dart';

/// A point with an address: pickup, dropoff or a rental stop.
class GeoPoint {
  const GeoPoint({
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  factory GeoPoint.fromJson(Json json) => GeoPoint(
        address: asString(json['address']) ?? '',
        latitude: asDouble(json['latitude']) ?? 0,
        longitude: asDouble(json['longitude']) ?? 0,
      );

  final String address;
  final double latitude;
  final double longitude;

  Json toJson() => {'address': address, 'latitude': latitude, 'longitude': longitude};
}

/// Body of `POST /pricing/quote`. Leave [vehicleType] out to price every
/// vehicle type enabled for the service.
class QuoteRequest {
  const QuoteRequest({
    required this.serviceType,
    required this.pickup,
    required this.dropoff,
    this.vehicleType,
    this.stops = const [],
    this.roundTrip = false,
    this.scheduledAt,
    this.passengerCount = 1,
    this.distanceKm,
    this.durationMinutes,
  });

  final ServiceType serviceType;
  final GeoPoint pickup;
  final GeoPoint dropoff;
  final VehicleType? vehicleType;

  /// Rentals only: stops between pickup and dropoff, in order (max 10).
  final List<GeoPoint> stops;

  /// Rentals only: come back to the pickup at the end.
  final bool roundTrip;

  /// Required for rentals; for rides, null means now.
  final DateTime? scheduledAt;
  final int passengerCount;

  /// Road distance from the app's routing, if known. The server never charges
  /// less than the straight-line distance.
  final double? distanceKm;
  final int? durationMinutes;

  Json toJson() => compactJson({
        'serviceType': serviceType.wire,
        'vehicleType': vehicleType?.wire,
        'pickup': pickup.toJson(),
        'dropoff': dropoff.toJson(),
        if (serviceType == ServiceType.rental && stops.isNotEmpty)
          'stops': stops.map((s) => s.toJson()).toList(),
        if (serviceType == ServiceType.rental) 'roundTrip': roundTrip,
        'scheduledAt': scheduledAt?.toUtc().toIso8601String(),
        'passengerCount': passengerCount,
        'distanceKm': distanceKm,
        'durationMinutes': durationMinutes,
      });
}

class QuoteBreakdown {
  const QuoteBreakdown({
    this.baseFare = 0,
    this.distanceFare = 0,
    this.timeFare = 0,
    this.extraPassengerFare = 0,
    this.nightSurcharge = 0,
  });

  factory QuoteBreakdown.fromJson(Json json) => QuoteBreakdown(
        baseFare: asDouble(json['baseFare']) ?? 0,
        distanceFare: asDouble(json['distanceFare']) ?? 0,
        timeFare: asDouble(json['timeFare']) ?? 0,
        extraPassengerFare: asDouble(json['extraPassengerFare']) ?? 0,
        nightSurcharge: asDouble(json['nightSurcharge']) ?? 0,
      );

  final double baseFare;
  final double distanceFare;
  final double timeFare;
  final double extraPassengerFare;
  final double nightSurcharge;
}

/// One priced option. Book it with [quoteId] before [expiresAt].
class TripQuote {
  const TripQuote({
    required this.quoteId,
    required this.serviceType,
    required this.vehicleType,
    required this.fare,
    required this.total,
    required this.expiresAt,
    this.isRouteFare = false,
    this.distanceKm = 0,
    this.chargedKm = 0,
    this.durationMinutes = 0,
    this.roundTrip = false,
    this.scheduledAt,
    this.breakdown = const QuoteBreakdown(),
    this.discount = 0,
    this.discountSource = DiscountSource.none,
  });

  factory TripQuote.fromJson(Json json) => TripQuote(
        quoteId: json['quoteId'].toString(),
        serviceType: ServiceType.fromWire(json['serviceType']),
        vehicleType: VehicleType.fromWire(json['vehicleType']),
        isRouteFare: json['pricingMode'] == 'route',
        distanceKm: asDouble(json['distanceKm']) ?? 0,
        chargedKm: asDouble(json['chargedKm']) ?? 0,
        durationMinutes: asInt(json['durationMinutes']) ?? 0,
        roundTrip: asBool(json['roundTrip']),
        scheduledAt: asDate(json['scheduledAt']),
        fare: asDouble(json['fare']) ?? 0,
        breakdown: QuoteBreakdown.fromJson(asJson(json['breakdown'])),
        discount: asDouble(json['discount']) ?? 0,
        discountSource: DiscountSource.fromWire(json['discountSource']),
        total: asDouble(json['total']) ?? 0,
        expiresAt: asDate(json['expiresAt']) ?? DateTime.now(),
      );

  final String quoteId;
  final ServiceType serviceType;
  final VehicleType vehicleType;

  /// A fixed fare between two admin-defined zones, instead of the km rate.
  final bool isRouteFare;
  final double distanceKm;
  final double chargedKm;
  final int durationMinutes;
  final bool roundTrip;
  final DateTime? scheduledAt;

  /// Price before discount.
  final double fare;
  final QuoteBreakdown breakdown;
  final double discount;
  final DiscountSource discountSource;

  /// What the passenger pays.
  final double total;
  final DateTime expiresAt;

  bool isExpired([DateTime? now]) => !(now ?? DateTime.now()).isBefore(expiresAt);
}

/// Response of `POST /pricing/quote`.
class QuoteResponse {
  const QuoteResponse({
    required this.serviceType,
    required this.quotes,
    required this.expiresAt,
    this.currency = 'BDT',
  });

  factory QuoteResponse.fromJson(Json json) => QuoteResponse(
        serviceType: ServiceType.fromWire(json['serviceType']),
        currency: asString(json['currency']) ?? 'BDT',
        expiresAt: asDate(json['expiresAt']) ?? DateTime.now(),
        quotes: asList(json['quotes'], TripQuote.fromJson),
      );

  final ServiceType serviceType;
  final String currency;
  final DateTime expiresAt;
  final List<TripQuote> quotes;
}

/// Body of `POST /trips`. The price comes from the quote; the server ignores
/// any price the app might send.
class CreateTripRequest {
  const CreateTripRequest({
    required this.quoteId,
    this.paymentMethod = 'cash',
    this.promotionCode,
    this.specialInstructions,
  });

  final String quoteId;
  final String paymentMethod;
  final String? promotionCode;
  final String? specialInstructions;

  Json toJson() => compactJson({
        'quoteId': quoteId,
        'paymentMethod': paymentMethod,
        'promotionCode': promotionCode,
        'specialInstructions': specialInstructions,
      });
}
