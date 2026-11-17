import { http } from './http';
import type {
  AuditLog,
  DriverRow,
  FareRate,
  LoginResponse,
  Me,
  Overview,
  Paged,
  Place,
  Promotion,
  PublicConfig,
  QuoteResponse,
  RouteFare,
  ServiceType,
  SettingView,
  SupportTicket,
  Trip,
  TripOffer,
  UserRow,
  Vehicle,
  Zone,
} from './types';

const get = <T>(url: string, params?: object) => http.get<T>(url, { params: clean(params) }).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => http.post<T>(url, body).then((r) => r.data);
const put = <T>(url: string, body?: unknown) => http.put<T>(url, body).then((r) => r.data);
const del = <T>(url: string) => http.delete<T>(url).then((r) => r.data);

/** Drops empty filters so they don't reach the query string. */
function clean(params?: object) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export interface LoginInput {
  phone?: string;
  email?: string;
  password?: string;
  mfaCode?: string;
}

export interface RegisterInput {
  roleName: 'customer' | 'grameen_ride_driver';
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export const authApi = {
  login: (body: LoginInput) => post<LoginResponse>('/auth/login', body),
  sendOtp: (phone: string) => post<{ success: boolean; message?: string }>('/auth/otp/send', { phone, purpose: 'login' }),
  register: (body: RegisterInput) => post<{ success: boolean; message?: string }>('/auth/register', body),
  verifyPhone: (phone: string, code: string) => post<{ success: boolean; message?: string }>('/auth/verify-phone', { phone, code }),
  resendVerification: (phone: string) => post('/auth/resend-verification', { type: 'phone', phone }),
  logout: (refreshToken?: string) => post('/auth/logout', { refreshToken }),
};

export const meApi = {
  me: () => get<Me>('/user-profiles/me'),
  setLanguage: (languagePreference: 'bn' | 'en') => put('/user-profiles/language', { languagePreference }),
  publicConfig: () => get<PublicConfig>('/config/public'),
};

export interface QuoteInput {
  serviceType: ServiceType;
  vehicleType?: string;
  pickup: Place;
  dropoff: Place;
  stops?: Place[];
  roundTrip?: boolean;
  scheduledAt?: string;
  passengerCount?: number;
}

export const bookingApi = {
  quote: (body: QuoteInput) => post<QuoteResponse>('/pricing/quote', body),
  createTrip: (body: { quoteId: string; paymentMethod: string; promotionCode?: string; specialInstructions?: string }) =>
    post<Trip>('/trips', body),
  myTrips: () => get<Trip[]>('/trips'),
  trip: (id: string) => get<Trip>(`/trips/${id}`),
  cancel: (id: string, reason?: string) => put<Trip>(`/trips/${id}/cancel`, { cancellationReason: reason }),
  validatePromo: (code: string, tripAmount: number, vehicleType: string) =>
    post<{ promotion: Promotion; discountAmount: number }>('/promotions/validate', { code, tripAmount, vehicleType }),
};

// ─── Console ────────────────────────────────────────────────────────────────

export type FareRateInput = Omit<FareRate, 'id' | 'serviceType' | 'vehicleType' | 'version' | 'isCurrent' | 'createdBy' | 'createdAt'>;
export type ZoneInput = Omit<Zone, 'id'>;
export type RouteFareInput = Omit<RouteFare, 'id' | 'originZone' | 'destinationZone'>;

export const pricingApi = {
  rates: (service?: ServiceType) => get<FareRate[]>('/admin/fares/rates', { service }),
  history: (service: ServiceType, vehicleType: string) => get<FareRate[]>(`/admin/fares/rates/${service}/${vehicleType}/history`),
  saveRate: (service: ServiceType, vehicleType: string, body: FareRateInput) =>
    put<FareRate>(`/admin/fares/rates/${service}/${vehicleType}`, body),
  simulate: (body: QuoteInput) => post<SimulationResult[]>('/admin/fares/simulate', body),
  zones: () => get<Zone[]>('/admin/zones'),
  createZone: (body: ZoneInput) => post<Zone>('/admin/zones', body),
  updateZone: (id: string, body: Partial<ZoneInput>) => put<Zone>(`/admin/zones/${id}`, body),
  deleteZone: (id: string) => del(`/admin/zones/${id}`),
  routes: () => get<RouteFare[]>('/admin/route-fares'),
  createRoute: (body: RouteFareInput) => post<RouteFare>('/admin/route-fares', body),
  updateRoute: (id: string, body: Partial<RouteFareInput>) => put<RouteFare>(`/admin/route-fares/${id}`, body),
  deleteRoute: (id: string) => del(`/admin/route-fares/${id}`),
};

export interface SimulationResult {
  vehicleType: string;
  rate: { id: string; version: number } | null;
  routeFare: { id: string; fixedFare: number } | null;
  breakdown: null | {
    pricingMode: 'distance' | 'route';
    chargedKm: number;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    extraPassengerFare: number;
    nightSurcharge: number;
    fare: number;
    commissionPct: number;
    grossCommission: number;
    driverEarning: number;
  };
  reason?: string;
}

export const settingsApi = {
  list: () => get<SettingView[]>('/admin/settings'),
  update: (values: Record<string, unknown>) => put<SettingView[]>('/admin/settings', { values }),
  audit: (q: { entity?: string; entityId?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    get<Paged<AuditLog>>('/admin/audit-logs', q),
};

export interface TripFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  service?: ServiceType | '';
  vehicleType?: string;
  from?: string;
  to?: string;
  employee?: 'true' | 'false' | '';
  driverId?: string;
  passengerId?: string;
}

export const opsApi = {
  overview: () => get<Overview>('/admin/overview'),
  trips: (q: TripFilters) => get<Paged<Trip>>('/admin/trips', q),
  trip: (id: string) => get<{ trip: Trip; offers: TripOffer[] }>(`/admin/trips/${id}`),
  cancelTrip: (id: string, reason: string) => put<Trip>(`/admin/trips/${id}/cancel`, { reason }),
  assign: (id: string, driverId: string, vehicleId?: string) => put<Trip>(`/admin/trips/${id}/assign`, { driverId, vehicleId }),
  redispatch: (id: string) => put(`/admin/trips/${id}/redispatch`),
  upcomingRentals: (hours = 24) => get<Trip[]>('/admin/rentals/upcoming', { hours }),
};

export const peopleApi = {
  users: (q: { page?: number; pageSize?: number; q?: string; role?: string; employee?: string; status?: string }) =>
    get<Paged<UserRow>>('/admin/users', q),
  user: (id: string) => get<UserRow & { tripsByStatus: { status: string; count: number }[]; driverId: string | null }>(`/admin/users/${id}`),
  block: (id: string, reason: string) => put(`/admin/users/${id}/block`, { reason }),
  unblock: (id: string) => put(`/admin/users/${id}/unblock`),
  drivers: (q: { page?: number; pageSize?: number; q?: string; verification?: string; suspended?: string; online?: string }) =>
    get<Paged<DriverRow>>('/admin/drivers', q),
  driver: (id: string) => get<DriverRow>(`/admin/drivers/${id}`),
  verifyDriver: (id: string, status: 'approved' | 'rejected', rejectionReason?: string) =>
    put(`/admin/drivers/${id}/verify`, { status, rejectionReason }),
  suspend: (id: string, reason: string) => put(`/admin/drivers/${id}/suspend`, { reason }),
  unsuspend: (id: string) => put(`/admin/drivers/${id}/unsuspend`),
  updateVehicle: (id: string, body: Partial<Pick<Vehicle, 'isVerified' | 'isActive' | 'servesRide' | 'servesRental'>>) =>
    put<Vehicle>(`/admin/vehicles/${id}`, body),
};

export type PromotionInput = Omit<Promotion, 'id' | 'usageCount'>;

export const growthApi = {
  promotions: () => get<Promotion[]>('/admin/promotions'),
  createPromotion: (body: Partial<PromotionInput>) => post<Promotion>('/admin/promotions', body),
  updatePromotion: (id: string, body: Partial<PromotionInput>) => put<Promotion>(`/admin/promotions/${id}`, body),
  togglePromotion: (id: string) => put<Promotion>(`/admin/promotions/${id}/toggle`),
  tickets: (status?: string) => get<SupportTicket[]>('/admin/support/tickets', { status }),
  updateTicket: (id: string, status: SupportTicket['status'], resolution?: string) =>
    put(`/admin/support/tickets/${id}/status`, { status, resolution }),
};

export interface SummaryRow {
  day: string;
  service_type: ServiceType;
  vehicle_type: string;
  trips: number;
  completed: number;
  cancelled: number;
  no_driver: number;
  revenue: number;
  platform_net: number;
  discounts: number;
  employee_trips: number;
}

export interface FairnessRow {
  driver_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  offers: number;
  accepted: number;
  declined: number;
  timeouts: number;
  completed: number;
  earnings: number;
}

export const reportsApi = {
  summary: (from?: string, to?: string) => get<SummaryRow[]>('/admin/reports/summary', { from, to }),
  fairness: (date?: string) =>
    get<{ from: string; to: string; drivers: FairnessRow[]; spread: Record<'completed' | 'earnings', { min: number; median: number; max: number }> }>(
      '/admin/reports/fairness',
      { date },
    ),
  tripsCsv: (from?: string, to?: string) =>
    http.get<Blob>('/admin/reports/trips.csv', { params: clean({ from, to }), responseType: 'blob' }).then((r) => r.data),
};

/** Lists from older endpoints may be a plain array or a page. */
export const itemsOf = <T>(data: T[] | Paged<T> | undefined): T[] => (Array.isArray(data) ? data : data?.items ?? []);

// ─── Customer extras: support, ratings, saved places, driver status ──────────

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderAuthUserId: string;
  message: string;
  createdAt: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType: 'home' | 'work' | 'other';
  isDefault?: boolean;
}

export type SavedPlaceInput = Omit<SavedPlace, 'id'>;

export const customerApi = {
  tickets: () => get<SupportTicket[]>('/support/tickets'),
  createTicket: (body: { subject: string; description: string; category: string; tripId?: string }) =>
    post<SupportTicket>('/support/tickets', body),
  messages: (ticketId: string) => get<SupportMessage[]>(`/support/tickets/${ticketId}/messages`),
  addMessage: (ticketId: string, message: string) => post<SupportMessage>(`/support/tickets/${ticketId}/messages`, { message }),
  rateTrip: (tripId: string, rating: number, review?: string) => post(`/trips/${tripId}/rate`, { rating, review: review || undefined }),
  places: () => get<SavedPlace[]>('/locations/favorites'),
  addPlace: (body: SavedPlaceInput) => post<SavedPlace>('/locations/favorites', body),
  updatePlace: (id: string, body: Partial<SavedPlaceInput>) => put<SavedPlace>(`/locations/favorites/${id}`, body),
  deletePlace: (id: string) => del(`/locations/favorites/${id}`),
  driverMe: () => get<DriverRow>('/drivers/me'),
};
