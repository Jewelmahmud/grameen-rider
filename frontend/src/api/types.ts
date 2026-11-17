export type PlatformRole = 'super_admin' | 'ride_admin' | 'operations' | 'driver' | 'customer';

export type Permission =
  | 'fares.read' | 'fares.write' | 'matching.write'
  | 'settings.read' | 'settings.write' | 'settings.system'
  | 'promotions.read' | 'promotions.write' | 'perks.write'
  | 'trips.read_all' | 'trips.intervene'
  | 'drivers.read' | 'drivers.verify' | 'drivers.suspend' | 'vehicles.verify'
  | 'users.read' | 'users.block' | 'support.manage' | 'notifications.broadcast'
  | 'reports.read' | 'reports.export' | 'audit.read'
  | 'trips.drive' | 'trips.book';

export type ServiceType = 'ride' | 'rental';

export type TripStatus =
  | 'pending' | 'scheduled' | 'searching_driver' | 'accepted' | 'driver_assigned' | 'driver_arriving'
  | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'no_driver_found' | 'disputed';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Sparks {
  isEmployee: boolean;
  designation: string | null;
  badge: string | null;
  greetingName: string | null;
  discountPct: number;
  monthlyCapBdt: number;
  usedThisMonthBdt: number;
  remainingThisMonthBdt: number;
  vehicleTypes: string[];
  priorityDispatch: boolean;
}

export interface Me {
  id: string;
  authUserId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  preferredLanguage?: 'bn' | 'en' | null;
  isEmployee: boolean;
  designation?: string | null;
  status: 'active' | 'blocked';
  platformRoles: PlatformRole[];
  permissions: Permission[];
  isStaff: boolean;
  sparks: Sparks;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  tokens: { accessToken: string; refreshToken?: string; expiresIn?: number };
  user?: unknown;
}

export interface Place {
  address: string;
  latitude: number;
  longitude: number;
}

export interface QuoteItem {
  quoteId: string;
  serviceType: ServiceType;
  vehicleType: string;
  pricingMode: 'distance' | 'route';
  distanceKm: number;
  chargedKm: number;
  durationMinutes: number;
  roundTrip: boolean;
  scheduledAt: string | null;
  fare: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    extraPassengerFare: number;
    nightSurcharge: number;
  };
  discount: number;
  discountSource: 'none' | 'promotion' | 'employee';
  total: number;
  expiresAt: string;
}

export interface QuoteResponse {
  serviceType: ServiceType;
  currency: 'BDT';
  expiresAt: string;
  quotes: QuoteItem[];
}

export interface Trip {
  id: string;
  tripNumber: string;
  passengerId: string;
  driverId: string | null;
  vehicleId: string | null;
  vehicleType: string;
  serviceType: ServiceType;
  pricingMode?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  stops?: Place[] | null;
  roundTrip?: boolean;
  scheduledDatetime: string | null;
  passengerCount: number;
  distanceKm: number | string | null;
  estimatedDurationMinutes: number | null;
  baseFare?: number | string;
  distanceFare?: number | string;
  timeFare?: number | string;
  subtotal?: number | string;
  discountAmount?: number | string;
  totalFare: number | string;
  commissionAmount?: number | string | null;
  employeeDiscountAmount?: number | string | null;
  isEmployeeBooking?: boolean;
  paymentMethod: string;
  paymentStatus?: string;
  status: TripStatus;
  requestedAt: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  dispatchWave?: number | null;
  dispatchRadiusKm?: number | string | null;
  specialInstructions?: string | null;
  passenger?: PersonLite | null;
  driver?: (DriverRow & { userProfile?: PersonLite }) | null;
  vehicle?: Vehicle | null;
}

export interface PersonLite {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  isEmployee?: boolean;
  designation?: string | null;
}

export interface UserRow extends PersonLite {
  authUserId: string;
  email?: string | null;
  platformRoles: PlatformRole[];
  isStaff: boolean;
  status: 'active' | 'blocked';
  blockedReason?: string | null;
  lastActiveAt?: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  vehicleType: string;
  driverId?: string;
  make?: string;
  model?: string;
  color?: string;
  licensePlate?: string;
  year?: number;
  isVerified: boolean;
  isActive: boolean;
  servesRide: boolean;
  servesRental: boolean;
}

export interface DriverRow {
  id: string;
  userProfileId: string;
  userProfile?: PersonLite;
  licenseNumber?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  isOnline: boolean;
  isAvailable: boolean;
  isSuspended: boolean;
  suspendedReason?: string | null;
  rating?: number | string;
  totalRides?: number;
  currentLocationUpdatedAt?: string | null;
  last30Days?: { offers: { outcome: string; count: number }[]; acceptRate: number | null };
  vehicles?: Vehicle[];
  createdAt: string;
}

export interface FareRate {
  id: string;
  serviceType: ServiceType;
  vehicleType: string;
  version: number;
  baseFare: number;
  baseKm: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  waitingPerMinute: number;
  extraPassengerFare: number;
  returnLegFactor: number | null;
  commissionPct: number | null;
  isCurrent: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface Zone {
  id: string;
  nameBn: string;
  nameEn: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusM: number;
  isActive: boolean;
}

export interface RouteFare {
  id: string;
  originZoneId: string;
  destinationZoneId: string;
  originZone?: Zone;
  destinationZone?: Zone;
  vehicleType: string;
  fixedFare: number;
  bidirectional: boolean;
  priority: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
}

export interface SettingView {
  key: string;
  value: unknown;
  default: unknown;
  type: 'number' | 'boolean' | 'string' | 'json';
  description: string;
  permission: Permission;
  editable: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number | string;
  maxDiscountAmount?: number | string | null;
  minTripAmount?: number | string | null;
  validFrom: string;
  validUntil: string;
  usageLimit?: number | null;
  userUsageLimit?: number | null;
  usageCount?: number;
  applicableVehicleTypes?: string[] | null;
  isActive: boolean;
  audience: 'all' | 'employees' | 'new_users';
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string | null;
  userProfile?: PersonLite;
  tripId?: string | null;
  createdAt: string;
}

export interface TripOffer {
  id: string;
  tripId: string;
  driverId: string;
  driver?: DriverRow & { userProfile?: PersonLite };
  wave: number;
  distanceKm: number | string;
  score: number | string;
  offeredAt: string;
  expiresAt: string;
  respondedAt?: string | null;
  outcome: 'pending' | 'accepted' | 'declined' | 'timeout' | 'cancelled';
}

export interface AuditLog {
  id: string;
  actorAuthUserId: string;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  createdAt: string;
}

export interface Overview {
  since: string;
  tripsToday: { service_type: ServiceType; status: TripStatus; count: number }[];
  money: { revenue: number; platform_net: number; discounts: number; completed: number };
  drivers: { online: number; available: number; pending_verification: number; total: number };
  rentalsNext24h: { unassigned: number; total: number };
  support: { open: number };
}

export interface PublicConfig {
  [key: string]: unknown;
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  code?: string;
}
