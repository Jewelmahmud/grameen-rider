import 'package:flutter_test/flutter_test.dart';
import 'package:grameen_core/grameen_core.dart';

void main() {
  group('Trip.fromJson', () {
    test('parses decimal strings and enum wire values', () {
      final trip = Trip.fromJson({
        'id': 't1',
        'tripNumber': 'GR-0001',
        'status': 'driver_arriving',
        'vehicleType': 'pickup_van',
        'rentalType': 'single',
        'pickupAddress': 'Mirpur 10, Dhaka',
        'pickupLatitude': '23.80410000',
        'pickupLongitude': '90.36540000',
        'dropoffAddress': 'Gulshan 2, Dhaka',
        'dropoffLatitude': 23.7925,
        'dropoffLongitude': 90.4078,
        'totalFare': '150.00',
        'passengerCount': 1,
        'cancelledBy': null,
        'requestedAt': '2026-10-31T08:00:00.000Z',
      });

      expect(trip.status, TripStatus.driverArriving);
      expect(trip.status.hasDriver, isTrue);
      expect(trip.vehicleType, VehicleType.pickupVan);
      expect(trip.pickup.latitude, closeTo(23.8041, 1e-6));
      expect(trip.totalFare, 150.0);
      expect(trip.cancelledBy, isNull);
      expect(trip.requestedAt!.toUtc(), DateTime.utc(2026, 10, 31, 8));
    });

    test('maps unknown status values to unknown instead of throwing', () {
      final trip = Trip.fromJson({'id': 't2', 'status': 'teleporting'});
      expect(trip.status, TripStatus.unknown);
      expect(trip.status.isActive, isFalse);
    });
  });

  test('only the five launch vehicle types are bookable', () {
    expect(VehicleType.launch.map((v) => v.wire),
        ['motorcycle', 'car', 'auto', 'van', 'rickshaw']);
    expect(VehicleType.cng.isLaunched, isFalse);
    expect(VehicleType.fromWire('boat_rental'), VehicleType.boatRental);
  });

  test('TripStatus groups', () {
    expect(TripStatus.searchingDriver.isActive, isTrue);
    expect(TripStatus.inProgress.isActive, isTrue);
    expect(TripStatus.completed.isTerminal, isTrue);
    expect(TripStatus.cancelled.isActive, isFalse);
  });

  test('new trip statuses: scheduled is upcoming, no_driver_found is final', () {
    expect(TripStatus.fromWire('scheduled').isUpcoming, isTrue);
    expect(TripStatus.scheduled.passengerCanCancel, isTrue);
    expect(TripStatus.noDriverFound.isTerminal, isTrue);
    expect(TripStatus.inProgress.passengerCanCancel, isFalse);
  });

  test('Trip reads rental fields', () {
    final trip = Trip.fromJson({
      'id': 't3',
      'status': 'scheduled',
      'serviceType': 'rental',
      'pricingMode': 'route',
      'roundTrip': true,
      'stops': [
        {'address': 'Gabtoli', 'latitude': 23.784, 'longitude': 90.344},
      ],
      'isEmployeeBooking': true,
      'employeeDiscountAmount': '50.00',
    });
    expect(trip.serviceType, ServiceType.rental);
    expect(trip.stops.single.address, 'Gabtoli');
    expect(trip.roundTrip, isTrue);
    expect(trip.isRouteFare, isTrue);
    expect(trip.employeeDiscountAmount, 50);
  });

  test('UserProfile reads roles, permissions and GiLab employee sparks', () {
    final p = UserProfile.fromJson({
      'id': 'p1',
      'authUserId': 'a1',
      'phoneNumber': '01700000010',
      'firstName': 'Admin',
      'lastName': 'Test',
      'platformRoles': ['super_admin', 'customer'],
      'permissions': ['trips.book', 'fares.write'],
      'isStaff': true,
      'isEmployee': true,
      'designation': 'Administrative Assistant',
      'status': 'active',
      'sparks': {
        'isEmployee': true,
        'designation': 'Administrative Assistant',
        'badge': 'GiLab staff · Administrative Assistant',
        'greetingName': 'Admin Test · Administrative Assistant',
        'discountPct': 10,
        'monthlyCapBdt': 1000,
        'usedThisMonthBdt': 120,
        'remainingThisMonthBdt': 880,
        'vehicleTypes': [],
        'priorityDispatch': true,
      },
    });
    expect(p.platformRoles, [PlatformRole.superAdmin, PlatformRole.customer]);
    expect(p.can('trips.book'), isTrue);
    expect(p.isDriver, isFalse);
    expect(p.displayName, 'Admin Test · Administrative Assistant');
    expect(p.sparks.remainingThisMonthBdt, 880);
    expect(p.sparks.priorityDispatch, isTrue);
  });

  test('an old profile without the new fields still parses', () {
    final p = UserProfile.fromJson({'id': 'p1', 'firstName': 'Rahim'});
    expect(p.platformRoles, [PlatformRole.customer]);
    expect(p.sparks.isEmployee, isFalse);
    expect(p.displayName, 'Rahim');
  });

  test('PublicConfig falls back to server defaults', () {
    final empty = PublicConfig.fromJson({});
    expect(empty.rideVehicleTypes, VehicleType.launch);
    expect(empty.paymentMethods, ['cash']);
    expect(empty.supportPhone, isNull);

    final set = PublicConfig.fromJson({
      'service.rental.vehicleTypes': ['car', 'van', 'hovercraft'],
      'payments.methods': ['cash', 'bkash'],
      'support.phone': '09600000000',
      'service.rental.minLeadMinutes': 180,
    });
    expect(set.vehicleTypesFor(ServiceType.rental), [VehicleType.car, VehicleType.van]);
    expect(set.paymentMethods, ['cash', 'bkash']);
    expect(set.supportPhone, '09600000000');
    expect(set.rentalMinLeadMinutes, 180);
  });

  test('DriverOffer parses the trip.offer payload', () {
    final now = DateTime.utc(2026, 11, 17, 10);
    final offer = DriverOffer.fromJson({
      'offerId': 'o1',
      'tripId': 't1',
      'tripNumber': 'GR-1001',
      'serviceType': 'ride',
      'vehicleType': 'motorcycle',
      'pickup': {'address': 'Gulshan 1', 'latitude': 23.78, 'longitude': 90.41},
      'dropoff': {'address': 'Motijheel', 'latitude': 23.73, 'longitude': 90.42},
      'scheduledAt': null,
      'distanceToPickupKm': 0.8,
      'tripDistanceKm': 7.9,
      'total': 108,
      'driverEarning': 102,
      'paymentMethod': 'cash',
      'passenger': {'firstName': 'Admin', 'employeeBadge': 'GiLab staff · Manager'},
      'expiresAt': '2026-11-17T10:00:15.000Z',
    });
    expect(offer.vehicleType, VehicleType.motorcycle);
    expect(offer.pickup.address, 'Gulshan 1');
    expect(offer.driverEarning, 102);
    expect(offer.passengerEmployeeBadge, contains('GiLab'));
    expect(offer.timeLeft(now), const Duration(seconds: 15));
    expect(offer.isExpired(now.add(const Duration(seconds: 20))), isTrue);
  });

  test('AuthResult reads tokens and role names', () {
    final now = DateTime.utc(2026, 1, 1);
    final result = AuthResult.fromJson({
      'success': true,
      'user': {
        'id': 'auth-1',
        'roles': [
          {'id': 1, 'name': 'grameen_ride_driver'},
        ],
      },
      'tokens': {'accessToken': 'a', 'refreshToken': 'r', 'expiresIn': 900},
      'message': 'Login successful',
    });

    expect(result.success, isTrue);
    expect(result.authUserId, 'auth-1');
    expect(result.roles, ['grameen_ride_driver']);
    expect(result.tokens!.accessToken, 'a');
    expect(AuthTokens.fromJson({'accessToken': 'a', 'expiresIn': 900}, now: now).expiresAt,
        now.add(const Duration(minutes: 15)));
  });

  test('DriverEarnings parses the summary shape', () {
    final earnings = DriverEarnings.fromJson({
      'today': {'grossEarnings': 300, 'netEarnings': 255, 'rides': 2},
      'thisWeek': {'grossEarnings': 1200.5, 'netEarnings': 1020, 'rides': 8},
      'allTime': {'grossEarnings': 5000, 'netEarnings': 4250, 'rides': 40},
      'recent': [
        {'id': 'e1', 'tripId': 't1', 'amount': '150.00', 'netEarnings': '127.50'},
      ],
    });

    expect(earnings.today.rides, 2);
    expect(earnings.thisWeek.grossEarnings, 1200.5);
    expect(earnings.recent.single.netEarnings, 127.5);
  });

  test('Paged reads {data, total, page, limit}', () {
    final page = Paged.fromJson({
      'data': [
        {'id': 'r1', 'tripId': 't1', 'rating': 5, 'tags': ['punctual']},
      ],
      'total': 21,
      'page': 1,
      'limit': 20,
    }, Rating.fromJson);

    expect(page.items.single.tags, ['punctual']);
    expect(page.hasMore, isTrue);
  });

  test('Driver verification status', () {
    final driver = Driver.fromJson({
      'id': 'd1',
      'userProfileId': 'p1',
      'licenseNumber': 'BDLIC-12345',
      'vehicleRegistrationNumber': 'DHA-CNG-5678',
      'rating': '4.80',
      'verificationStatus': 'approved',
    });

    expect(driver.isApproved, isTrue);
    expect(driver.rating, 4.8);
    expect(
      CreateDriverRequest(
        licenseNumber: 'BDLIC-12345',
        licenseExpiryDate: DateTime(2027, 12, 31),
        vehicleRegistrationNumber: 'DHA-CNG-5678',
      ).toJson()['licenseExpiryDate'],
      '2027-12-31',
    );
  });
}
