import 'enums.dart';
import 'json.dart';

class Driver {
  const Driver({
    required this.id,
    required this.userProfileId,
    required this.licenseNumber,
    required this.vehicleRegistrationNumber,
    this.licenseExpiryDate,
    this.rating = 0,
    this.totalRides = 0,
    this.totalEarnings = 0,
    this.isOnline = false,
    this.isAvailable = false,
    this.currentLatitude,
    this.currentLongitude,
    this.verificationStatus = DriverVerificationStatus.pending,
    this.rejectionReason,
  });

  factory Driver.fromJson(Json json) => Driver(
        id: json['id'].toString(),
        userProfileId: asString(json['userProfileId']) ?? '',
        licenseNumber: asString(json['licenseNumber']) ?? '',
        vehicleRegistrationNumber:
            asString(json['vehicleRegistrationNumber']) ?? '',
        licenseExpiryDate: asDate(json['licenseExpiryDate']),
        rating: asDouble(json['rating']) ?? 0,
        totalRides: asInt(json['totalRides']) ?? 0,
        totalEarnings: asDouble(json['totalEarnings']) ?? 0,
        isOnline: asBool(json['isOnline']),
        isAvailable: asBool(json['isAvailable']),
        currentLatitude: asDouble(json['currentLatitude']),
        currentLongitude: asDouble(json['currentLongitude']),
        verificationStatus:
            DriverVerificationStatus.fromWire(json['verificationStatus']),
        rejectionReason: asString(json['rejectionReason']),
      );

  final String id;
  final String userProfileId;
  final String licenseNumber;
  final String vehicleRegistrationNumber;
  final DateTime? licenseExpiryDate;
  final double rating;
  final int totalRides;
  final double totalEarnings;
  final bool isOnline;
  final bool isAvailable;
  final double? currentLatitude;
  final double? currentLongitude;
  final DriverVerificationStatus verificationStatus;
  final String? rejectionReason;

  bool get isApproved =>
      verificationStatus == DriverVerificationStatus.approved;
}

/// Body of `POST /drivers`.
class CreateDriverRequest {
  const CreateDriverRequest({
    required this.licenseNumber,
    required this.licenseExpiryDate,
    required this.vehicleRegistrationNumber,
  });

  final String licenseNumber;
  final DateTime licenseExpiryDate;
  final String vehicleRegistrationNumber;

  Json toJson() => {
        'licenseNumber': licenseNumber,
        'licenseExpiryDate': _dateOnly(licenseExpiryDate),
        'vehicleRegistrationNumber': vehicleRegistrationNumber,
      };

  static String _dateOnly(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

class Vehicle {
  const Vehicle({
    required this.id,
    required this.vehicleType,
    required this.licensePlate,
    this.driverId,
    this.make,
    this.model,
    this.year,
    this.color,
    this.seatingCapacity,
    this.vehicleImageUrl,
    this.isActive = true,
    this.isVerified = false,
  });

  factory Vehicle.fromJson(Json json) => Vehicle(
        id: json['id'].toString(),
        driverId: asString(json['driverId']),
        vehicleType: VehicleType.fromWire(json['vehicleType']),
        licensePlate: asString(json['licensePlate']) ?? '',
        make: asString(json['make']),
        model: asString(json['model']),
        year: asInt(json['year']),
        color: asString(json['color']),
        seatingCapacity: asInt(json['seatingCapacity']),
        vehicleImageUrl: asString(json['vehicleImageUrl']),
        isActive: asBool(json['isActive'], fallback: true),
        isVerified: asBool(json['isVerified']),
      );

  final String id;
  final String? driverId;
  final VehicleType vehicleType;
  final String licensePlate;
  final String? make;
  final String? model;
  final int? year;
  final String? color;
  final int? seatingCapacity;
  final String? vehicleImageUrl;
  final bool isActive;
  final bool isVerified;
}

/// Body of `POST /vehicles` and `PUT /vehicles/:id`. Leave a field null to
/// keep its current value on update.
class VehicleInput {
  const VehicleInput({
    this.vehicleType,
    this.licensePlate,
    this.seatingCapacity,
    this.make,
    this.model,
    this.year,
    this.color,
  });

  final VehicleType? vehicleType;
  final String? licensePlate;
  final int? seatingCapacity;
  final String? make;
  final String? model;
  final int? year;
  final String? color;

  Json toJson() => compactJson({
        'vehicleType': vehicleType?.wire,
        'licensePlate': licensePlate,
        'seatingCapacity': seatingCapacity,
        'make': make,
        'model': model,
        'year': year,
        'color': color,
      });
}

class EarningsSummary {
  const EarningsSummary({
    required this.grossEarnings,
    required this.netEarnings,
    required this.rides,
  });

  factory EarningsSummary.fromJson(Json json) => EarningsSummary(
        grossEarnings: asDouble(json['grossEarnings']) ?? 0,
        netEarnings: asDouble(json['netEarnings']) ?? 0,
        rides: asInt(json['rides']) ?? 0,
      );

  final double grossEarnings;
  final double netEarnings;
  final int rides;
}

class DriverEarning {
  const DriverEarning({
    required this.id,
    required this.tripId,
    required this.amount,
    required this.netEarnings,
    this.commissionAmount = 0,
    this.payoutStatus,
    this.createdAt,
  });

  factory DriverEarning.fromJson(Json json) => DriverEarning(
        id: json['id'].toString(),
        tripId: asString(json['tripId']) ?? '',
        amount: asDouble(json['amount']) ?? 0,
        netEarnings: asDouble(json['netEarnings']) ?? 0,
        commissionAmount: asDouble(json['commissionAmount']) ?? 0,
        payoutStatus: asString(json['payoutStatus']),
        createdAt: asDate(json['createdAt']),
      );

  final String id;
  final String tripId;
  final double amount;
  final double netEarnings;
  final double commissionAmount;
  final String? payoutStatus;
  final DateTime? createdAt;
}

/// `GET /drivers/me/earnings`.
class DriverEarnings {
  const DriverEarnings({
    required this.today,
    required this.thisWeek,
    required this.allTime,
    required this.recent,
  });

  factory DriverEarnings.fromJson(Json json) => DriverEarnings(
        today: EarningsSummary.fromJson(asJson(json['today'])),
        thisWeek: EarningsSummary.fromJson(asJson(json['thisWeek'])),
        allTime: EarningsSummary.fromJson(asJson(json['allTime'])),
        recent: asList(json['recent'], DriverEarning.fromJson),
      );

  final EarningsSummary today;
  final EarningsSummary thisWeek;
  final EarningsSummary allTime;
  final List<DriverEarning> recent;
}
