import 'json.dart';

// Every enum keeps the backend's string in `wire` and parses unknown values
// to `unknown` instead of throwing, so a new backend value never crashes an
// older app build.

/// Vehicle types accepted by the backend (`vehicles.vehicle_type`).
enum VehicleType {
  van('van'),
  rickshaw('rickshaw'),
  cng('cng'),
  motorcycle('motorcycle'),
  auto('auto'),
  pickupVan('pickup_van'),
  car('car'),
  carRental('car_rental'),
  boatRental('boat_rental'),
  unknown('unknown');

  const VehicleType(this.wire);
  final String wire;

  /// Types offered at launch, in display order: motorbike, car, battery
  /// auto (easy bike), Bangladeshi van, rickshaw. The rest stay parseable
  /// for old trips but are not shown for booking.
  static const launch = [motorcycle, car, auto, van, rickshaw];

  bool get isLaunched => launch.contains(this);

  static VehicleType fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

enum RentalType {
  single('single'),
  hourly('hourly'),
  daily('daily'),
  custom('custom'),
  unknown('unknown');

  const RentalType(this.wire);
  final String wire;

  static RentalType fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

enum TripStatus {
  pending('pending'),

  /// Booked for later (rentals and scheduled rides); matching starts before the start time.
  scheduled('scheduled'),
  searchingDriver('searching_driver'),
  accepted('accepted'),
  driverAssigned('driver_assigned'),
  driverArriving('driver_arriving'),
  driverArrived('driver_arrived'),
  inProgress('in_progress'),
  completed('completed'),
  cancelled('cancelled'),

  /// Nobody accepted in time (rides). The passenger can book again.
  noDriverFound('no_driver_found'),
  disputed('disputed'),
  unknown('unknown');

  const TripStatus(this.wire);
  final String wire;

  static TripStatus fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);

  /// No further status changes are expected.
  bool get isTerminal =>
      this == completed || this == cancelled || this == noDriverFound || this == disputed;

  /// Still waiting for a driver to accept.
  bool get isSearching => this == pending || this == searchingDriver;

  /// A driver is attached and the trip is not over.
  bool get hasDriver =>
      this == accepted ||
      this == driverAssigned ||
      this == driverArriving ||
      this == driverArrived ||
      this == inProgress;

  /// The trip should be shown as the current one (searching or underway).
  bool get isActive => isSearching || hasDriver;

  /// Booked for later and not started; shown under "upcoming".
  bool get isUpcoming => this == scheduled;

  /// The passenger may still cancel (the server enforces the same list).
  bool get passengerCanCancel =>
      this == pending ||
      this == scheduled ||
      this == searchingDriver ||
      this == accepted ||
      this == driverAssigned ||
      this == driverArriving ||
      this == driverArrived;
}

/// Ride (now or scheduled) or rental (booked ahead, km-priced, optional stops and round trip).
enum ServiceType {
  ride('ride'),
  rental('rental'),
  unknown('unknown');

  const ServiceType(this.wire);
  final String wire;

  static ServiceType fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, ride);
}

/// Grameen Ride's own roles, resolved by the server from the GiLab token.
enum PlatformRole {
  superAdmin('super_admin'),
  rideAdmin('ride_admin'),
  operations('operations'),
  driver('driver'),
  customer('customer'),
  unknown('unknown');

  const PlatformRole(this.wire);
  final String wire;

  static PlatformRole fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

/// Which discount a quote or trip got. Promotions and employee discounts never stack.
enum DiscountSource {
  none('none'),
  promotion('promotion'),
  employee('employee');

  const DiscountSource(this.wire);
  final String wire;

  static DiscountSource fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, none);
}

/// How a driver's offer ended.
enum OfferOutcome {
  pending('pending'),
  accepted('accepted'),
  declined('declined'),
  timeout('timeout'),
  cancelled('cancelled'),
  unknown('unknown');

  const OfferOutcome(this.wire);
  final String wire;

  static OfferOutcome fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

enum CancelledBy {
  passenger('passenger'),
  driver('driver'),
  system('system'),
  unknown('unknown');

  const CancelledBy(this.wire);
  final String wire;

  static CancelledBy fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

enum DriverVerificationStatus {
  pending('pending'),
  approved('approved'),
  rejected('rejected'),
  unknown('unknown');

  const DriverVerificationStatus(this.wire);
  final String wire;

  static DriverVerificationStatus fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

enum UserType {
  passenger('passenger'),
  driver('driver'),
  unknown('unknown');

  const UserType(this.wire);
  final String wire;

  static UserType fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

/// Role names the auth server accepts on registration.
enum RegistrationRole {
  customer('customer'),
  driver('grameen_ride_driver');

  const RegistrationRole(this.wire);
  final String wire;
}

enum LocationType {
  home('home'),
  work('work'),
  other('other');

  const LocationType(this.wire);
  final String wire;

  static LocationType fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, other);
}

enum TicketCategory {
  tripIssue('trip_issue'),
  paymentIssue('payment_issue'),
  driverComplaint('driver_complaint'),
  passengerComplaint('passenger_complaint'),
  technicalIssue('technical_issue'),
  accountIssue('account_issue'),
  other('other');

  const TicketCategory(this.wire);
  final String wire;

  static TicketCategory fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, other);
}

enum TicketStatus {
  open('open'),
  inProgress('in_progress'),
  resolved('resolved'),
  closed('closed'),
  unknown('unknown');

  const TicketStatus(this.wire);
  final String wire;

  static TicketStatus fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}

enum TicketPriority {
  low('low'),
  medium('medium'),
  high('high'),
  urgent('urgent');

  const TicketPriority(this.wire);
  final String wire;

  static TicketPriority fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, medium);
}

enum PaymentStatus {
  pending('pending'),
  processing('processing'),
  completed('completed'),
  paid('paid'),
  failed('failed'),
  refunded('refunded'),
  unknown('unknown');

  const PaymentStatus(this.wire);
  final String wire;

  static PaymentStatus fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);

  bool get isSettled => this == completed || this == paid;
}

enum DiscountType {
  percentage('percentage'),
  fixed('fixed'),
  unknown('unknown');

  const DiscountType(this.wire);
  final String wire;

  static DiscountType fromWire(Object? value) =>
      enumFromWire(values, value, (v) => v.wire, unknown);
}
