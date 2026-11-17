import 'enums.dart';
import 'json.dart';
import 'quote.dart';

class Trip {
  const Trip({
    required this.id,
    required this.status,
    required this.vehicleType,
    required this.rentalType,
    required this.pickup,
    required this.dropoff,
    this.serviceType = ServiceType.ride,
    this.stops = const [],
    this.roundTrip = false,
    this.isRouteFare = false,
    this.employeeDiscountAmount,
    this.isEmployeeBooking = false,
    this.tripNumber,
    this.passengerId,
    this.driverId,
    this.vehicleId,
    this.passengerCount = 1,
    this.distanceKm,
    this.estimatedDurationMinutes,
    this.baseFare,
    this.subtotal,
    this.discountAmount,
    this.totalFare,
    this.paymentStatus = PaymentStatus.pending,
    this.paymentMethod,
    this.cancelledBy,
    this.cancellationReason,
    this.scheduledAt,
    this.requestedAt,
    this.acceptedAt,
    this.driverArrivedAt,
    this.startedAt,
    this.completedAt,
    this.cancelledAt,
    this.passengerRating,
    this.driverRating,
    this.specialInstructions,
  });

  factory Trip.fromJson(Json json) => Trip(
        id: json['id'].toString(),
        tripNumber: asString(json['tripNumber']),
        status: TripStatus.fromWire(json['status']),
        vehicleType: VehicleType.fromWire(json['vehicleType']),
        rentalType: RentalType.fromWire(json['rentalType']),
        serviceType: ServiceType.fromWire(json['serviceType']),
        stops: asList(json['stops'], GeoPoint.fromJson),
        roundTrip: asBool(json['roundTrip']),
        isRouteFare: json['pricingMode'] == 'route',
        employeeDiscountAmount: asDouble(json['employeeDiscountAmount']),
        isEmployeeBooking: asBool(json['isEmployeeBooking']),
        pickup: GeoPoint(
          address: asString(json['pickupAddress']) ?? '',
          latitude: asDouble(json['pickupLatitude']) ?? 0,
          longitude: asDouble(json['pickupLongitude']) ?? 0,
        ),
        dropoff: GeoPoint(
          address: asString(json['dropoffAddress']) ?? '',
          latitude: asDouble(json['dropoffLatitude']) ?? 0,
          longitude: asDouble(json['dropoffLongitude']) ?? 0,
        ),
        passengerId: asString(json['passengerId']),
        driverId: asString(json['driverId']),
        vehicleId: asString(json['vehicleId']),
        passengerCount: asInt(json['passengerCount']) ?? 1,
        distanceKm: asDouble(json['distanceKm']),
        estimatedDurationMinutes: asInt(json['estimatedDurationMinutes']),
        baseFare: asDouble(json['baseFare']),
        subtotal: asDouble(json['subtotal']),
        discountAmount: asDouble(json['discountAmount']),
        totalFare: asDouble(json['totalFare']),
        paymentStatus: PaymentStatus.fromWire(json['paymentStatus']),
        paymentMethod: asString(json['paymentMethod']),
        cancelledBy: json['cancelledBy'] == null
            ? null
            : CancelledBy.fromWire(json['cancelledBy']),
        cancellationReason: asString(json['cancellationReason']),
        scheduledAt: asDate(json['scheduledDatetime']),
        requestedAt: asDate(json['requestedAt']),
        acceptedAt: asDate(json['acceptedAt']),
        driverArrivedAt: asDate(json['driverArrivedAt']),
        startedAt: asDate(json['startedAt']),
        completedAt: asDate(json['completedAt']),
        cancelledAt: asDate(json['cancelledAt']),
        passengerRating: asDouble(json['passengerRating']),
        driverRating: asDouble(json['driverRating']),
        specialInstructions: asString(json['specialInstructions']),
      );

  final String id;
  final String? tripNumber;
  final TripStatus status;
  final VehicleType vehicleType;

  /// Legacy field kept for old trips; new trips use [serviceType].
  final RentalType rentalType;
  final ServiceType serviceType;

  /// Rental stops between pickup and dropoff.
  final List<GeoPoint> stops;
  final bool roundTrip;
  final bool isRouteFare;

  /// Part of [discountAmount] that came from the GiLab employee benefit.
  final double? employeeDiscountAmount;
  final bool isEmployeeBooking;
  final GeoPoint pickup;
  final GeoPoint dropoff;
  final String? passengerId;
  final String? driverId;
  final String? vehicleId;
  final int passengerCount;
  final double? distanceKm;
  final int? estimatedDurationMinutes;
  final double? baseFare;
  final double? subtotal;
  final double? discountAmount;
  final double? totalFare;
  final PaymentStatus paymentStatus;
  final String? paymentMethod;
  final CancelledBy? cancelledBy;
  final String? cancellationReason;
  final DateTime? scheduledAt;
  final DateTime? requestedAt;
  final DateTime? acceptedAt;
  final DateTime? driverArrivedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final double? passengerRating;
  final double? driverRating;
  final String? specialInstructions;
}

/// Body of `POST /trips/:id/rate`.
class RateTripRequest {
  const RateTripRequest({required this.rating, this.review, this.tags = const []});

  final int rating;
  final String? review;
  final List<String> tags;

  Json toJson() => compactJson({
        'rating': rating,
        'review': review,
        'tags': tags.isEmpty ? null : tags,
      });
}

class Rating {
  const Rating({
    required this.id,
    required this.tripId,
    required this.rating,
    this.raterProfileId,
    this.ratedProfileId,
    this.review,
    this.tags = const [],
    this.createdAt,
  });

  factory Rating.fromJson(Json json) => Rating(
        id: json['id'].toString(),
        tripId: asString(json['tripId']) ?? '',
        rating: asDouble(json['rating']) ?? 0,
        raterProfileId: asString(json['raterProfileId']),
        ratedProfileId: asString(json['ratedProfileId']),
        review: asString(json['review']),
        tags: asStringList(json['tags']),
        createdAt: asDate(json['createdAt']),
      );

  final String id;
  final String tripId;
  final double rating;
  final String? raterProfileId;
  final String? ratedProfileId;
  final String? review;
  final List<String> tags;
  final DateTime? createdAt;
}

/// `{data, total, page, limit}` pages, e.g. `GET /drivers/:id/ratings`.
class Paged<T> {
  const Paged({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory Paged.fromJson(Json json, T Function(Json) parse) => Paged(
        items: asList(json['data'], parse),
        total: asInt(json['total']) ?? 0,
        page: asInt(json['page']) ?? 1,
        limit: asInt(json['limit']) ?? 20,
      );

  final List<T> items;
  final int total;
  final int page;
  final int limit;

  bool get hasMore => page * limit < total;
}
