import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:latlong2/latlong.dart';
import '../models/ride_type.dart';

class PriceCalculator {
  static const double _basePrice = 50.0; // Base fare in BDT

  // Updated pricing structure with passenger capacity and extra charges
  static const Map<RideType, Map<String, dynamic>> _vehiclePricing = {
    RideType.van: {
      'pricePerKm': 15.0,
      'hourlyRate': 200.0,
      'dailyRate': 1500.0,
      'maxPassengers': 8,
      'extraPassengerRate': 12.0,
      'baseFare': 80.0,
    },
    RideType.rickshaw: {
      'pricePerKm': 12.0,
      'hourlyRate': 150.0,
      'dailyRate': 1000.0,
      'maxPassengers': 2,
      'extraPassengerRate': 10.0,
      'baseFare': 20.0,
    },
    RideType.cng: {
      'pricePerKm': 18.0,
      'hourlyRate': 250.0,
      'dailyRate': 2000.0,
      'maxPassengers': 3,
      'extraPassengerRate': 15.0,
      'baseFare': 50.0,
    },
    RideType.motorcycle: {
      'pricePerKm': 10.0,
      'hourlyRate': 120.0,
      'dailyRate': 800.0,
      'maxPassengers': 1,
      'extraPassengerRate': 0.0,
      'baseFare': 30.0,
    },
    RideType.auto: {
      'pricePerKm': 15.0,
      'hourlyRate': 200.0,
      'dailyRate': 1500.0,
      'maxPassengers': 4,
      'extraPassengerRate': 12.0,
      'baseFare': 60.0,
    },
    RideType.pickupVan: {
      'pricePerKm': 25.0,
      'hourlyRate': 350.0,
      'dailyRate': 3000.0,
      'maxPassengers': 10,
      'extraPassengerRate': 8.0,
      'baseFare': 150.0,
    },
    RideType.car: {
      'pricePerKm': 30.0,
      'hourlyRate': 400.0,
      'dailyRate': 3500.0,
      'maxPassengers': 4,
      'extraPassengerRate': 20.0,
      'baseFare': 200.0,
    },
    RideType.carRental: {
      'pricePerKm': 35.0,
      'hourlyRate': 450.0,
      'dailyRate': 4000.0,
      'maxPassengers': 4,
      'extraPassengerRate': 20.0,
      'baseFare': 200.0,
    },
    // New: Boat Rental pricing (assumed values)
    RideType.boatRental: {
      'pricePerKm': 28.0,
      'hourlyRate': 380.0,
      'dailyRate': 3200.0,
      'maxPassengers': 6,
      'extraPassengerRate': 15.0,
      'baseFare': 180.0,
    },
  };

  static double calculateDistanceFromCoordinates(
      LatLng pickup, LatLng dropoff) {
    double distanceInMeters = Geolocator.distanceBetween(
      pickup.latitude,
      pickup.longitude,
      dropoff.latitude,
      dropoff.longitude,
    );
    return distanceInMeters / 1000; // Convert to kilometers
  }

  static Future<double> calculateDistance(String pickup, String dropoff) async {
    try {
      // Get coordinates for pickup location
      List<Location> pickupLocations = await locationFromAddress(pickup);
      if (pickupLocations.isEmpty) return 0;

      // Get coordinates for dropoff location
      List<Location> dropoffLocations = await locationFromAddress(dropoff);
      if (dropoffLocations.isEmpty) return 0;

      // Calculate distance between points
      return calculateDistanceFromCoordinates(
        LatLng(pickupLocations.first.latitude, pickupLocations.first.longitude),
        LatLng(
            dropoffLocations.first.latitude, dropoffLocations.first.longitude),
      );
    } catch (e) {
      return 0;
    }
  }

  static double calculateSingleRidePrice(
    RideType rideType,
    double distanceKm, {
    int passengerCount = 1,
  }) {
    if (distanceKm <= 0) return 0;

    final pricing = _vehiclePricing[rideType]!;
    final baseFare = pricing['baseFare'] as double;
    final pricePerKm = pricing['pricePerKm'] as double;
    final maxPassengers = pricing['maxPassengers'] as int;
    final extraPassengerRate = pricing['extraPassengerRate'] as double;

    // Calculate base price
    double basePrice = baseFare + (distanceKm * pricePerKm);

    // Add passenger-based charges
    if (passengerCount > maxPassengers) {
      int extraPassengers = passengerCount - maxPassengers;
      basePrice += extraPassengers * extraPassengerRate * distanceKm;
    } else if (passengerCount > 1 && rideType != RideType.motorcycle) {
      // Small additional charge for multiple passengers even within limit
      basePrice += (passengerCount - 1) * extraPassengerRate * 0.5;
    }

    return basePrice;
  }

  static double calculateHourlyPrice(
    RideType rideType,
    int hours, {
    int passengerCount = 1,
  }) {
    final pricing = _vehiclePricing[rideType]!;
    final hourlyRate = pricing['hourlyRate'] as double;
    final maxPassengers = pricing['maxPassengers'] as int;
    final extraPassengerRate = pricing['extraPassengerRate'] as double;

    double basePrice = hourlyRate * hours;

    // Add passenger-based charges for hourly rentals
    if (passengerCount > maxPassengers) {
      int extraPassengers = passengerCount - maxPassengers;
      basePrice += extraPassengers * extraPassengerRate * hours;
    } else if (passengerCount > 1 && rideType != RideType.motorcycle) {
      basePrice += (passengerCount - 1) * extraPassengerRate * 0.3 * hours;
    }

    return basePrice;
  }

  static double calculateDailyPrice(
    RideType rideType,
    int days, {
    int passengerCount = 1,
  }) {
    final pricing = _vehiclePricing[rideType]!;
    final dailyRate = pricing['dailyRate'] as double;
    final maxPassengers = pricing['maxPassengers'] as int;
    final extraPassengerRate = pricing['extraPassengerRate'] as double;

    double basePrice = dailyRate * days;

    // Add passenger-based charges for daily rentals
    if (passengerCount > maxPassengers) {
      int extraPassengers = passengerCount - maxPassengers;
      basePrice += extraPassengers *
          extraPassengerRate *
          5 *
          days; // 5x multiplier for daily
    } else if (passengerCount > 1 && rideType != RideType.motorcycle) {
      basePrice += (passengerCount - 1) * extraPassengerRate * 2 * days;
    }

    return basePrice;
  }

  // Get maximum passenger capacity for a vehicle type
  static int getMaxPassengerCapacity(RideType rideType) {
    final pricing = _vehiclePricing[rideType];
    return pricing?['maxPassengers'] as int? ?? 3;
  }

  // Check if vehicle type requires passenger count selection
  static bool requiresPassengerCount(RideType rideType) {
    List<RideType> vehiclesNeedingPassengerCount = [
      RideType.van,
      RideType.rickshaw,
      RideType.cng,
      RideType.auto,
      RideType.boatRental,
    ];

    return vehiclesNeedingPassengerCount.contains(rideType);
  }

  // Get vehicle type name in Bangla
  static String getVehicleTypeName(RideType rideType) {
    switch (rideType) {
      case RideType.van:
        return 'ভ্যান';
      case RideType.rickshaw:
        return 'রিকশা';
      case RideType.cng:
        return 'সিএনজি';
      case RideType.motorcycle:
        return 'মটর বাইক';
      case RideType.auto:
        return 'অটো';
      case RideType.pickupVan:
        return 'পিকাপ ভ্যান';
      case RideType.car:
        return 'গাড়ি';
      case RideType.carRental:
        return 'কার রেন্টাল';
      case RideType.boatRental:
        return 'নৌকা রেন্টাল';
    }
  }
}
