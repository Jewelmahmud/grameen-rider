import { Permission } from '../common/auth/permissions';

/**
 * Every admin-controlled setting, with its type, default and who may change it.
 * Defaults are starting points only; admins change them from the console (stored in system_settings).
 */
export type SettingType = 'number' | 'boolean' | 'string' | 'json';

export interface SettingDef {
  type: SettingType;
  default: unknown;
  /** Permission needed to change it. */
  permission: Permission;
  /** Exposed through GET /config/public. */
  public?: boolean;
  description: string;
  min?: number;
  max?: number;
}

const LAUNCH_RIDE_VEHICLES = ['motorcycle', 'car', 'auto', 'van', 'rickshaw'];

export const SETTINGS = {
  // ─── Service ──────────────────────────────────────────────────────────────
  'service.ride.vehicleTypes': {
    type: 'json', default: LAUNCH_RIDE_VEHICLES, permission: 'settings.write', public: true,
    description: 'Vehicle types customers can book for rides',
  },
  'service.rental.vehicleTypes': {
    type: 'json', default: ['car'], permission: 'settings.write', public: true,
    description: 'Vehicle types customers can book for rentals',
  },
  'service.ride.scheduledMinLeadMinutes': {
    type: 'number', default: 30, min: 0, permission: 'settings.write', public: true,
    description: 'Earliest a scheduled ride can start, in minutes from now',
  },
  'service.ride.scheduledMaxDaysAhead': {
    type: 'number', default: 7, min: 1, permission: 'settings.write', public: true,
    description: 'Latest a scheduled ride can be booked, in days ahead',
  },
  'service.rental.minLeadMinutes': {
    type: 'number', default: 120, min: 0, permission: 'settings.write', public: true,
    description: 'Earliest a rental can start, in minutes from now',
  },
  'service.rental.maxDaysAhead': {
    type: 'number', default: 30, min: 1, permission: 'settings.write', public: true,
    description: 'Latest a rental can be booked, in days ahead',
  },
  'service.rental.dispatchLeadMinutes': {
    type: 'number', default: 60, min: 5, permission: 'settings.write',
    description: 'How long before a rental starts the system looks for a driver',
  },
  'service.rental.opsAlertMinutes': {
    type: 'number', default: 30, min: 0, permission: 'settings.write',
    description: 'Alert operations when a rental has no driver this many minutes before it starts',
  },
  'service.rental.reminderMinutes': {
    type: 'json', default: [60, 15], permission: 'settings.write',
    description: 'Reminder times before a rental starts (minutes)',
  },
  'support.phone': { type: 'string', default: '', permission: 'settings.write', public: true, description: 'Support phone shown in the apps' },
  'support.whatsapp': { type: 'string', default: '', permission: 'settings.write', public: true, description: 'Support WhatsApp number' },

  // ─── System (super admin only) ────────────────────────────────────────────
  'payments.methods': {
    type: 'json', default: ['cash'], permission: 'settings.system', public: true,
    description: 'Payment methods customers can choose',
  },
  'commission.defaultPct': {
    type: 'number', default: 15, min: 0, max: 100, permission: 'settings.system',
    description: 'Platform commission % when a rate has no override',
  },
  'maintenance.enabled': { type: 'boolean', default: false, permission: 'settings.system', public: true, description: 'Show the maintenance screen' },
  'maintenance.message': { type: 'string', default: '', permission: 'settings.system', public: true, description: 'Maintenance message' },

  // ─── Pricing ──────────────────────────────────────────────────────────────
  'pricing.quoteTtlSeconds': { type: 'number', default: 600, min: 60, max: 3600, permission: 'fares.write', description: 'How long a price quote stays valid' },
  'pricing.roadFactor': {
    type: 'number', default: 1.3, min: 1, max: 3, permission: 'fares.write',
    description: 'Straight-line distance × this factor, when the app sends no road distance',
  },
  'pricing.night.multiplier': { type: 'number', default: 1, min: 1, max: 3, permission: 'fares.write', description: 'Night fare multiplier for rides (1 = off)' },
  'pricing.night.start': { type: 'string', default: '22:00', permission: 'fares.write', description: 'Night window start (HH:mm, Dhaka time)' },
  'pricing.night.end': { type: 'string', default: '06:00', permission: 'fares.write', description: 'Night window end (HH:mm, Dhaka time)' },

  // ─── Matching (fair share) ────────────────────────────────────────────────
  'matching.weights.proximity': { type: 'number', default: 0.6, min: 0, max: 1, permission: 'matching.write', description: 'Weight of closeness' },
  'matching.weights.fairness': { type: 'number', default: 0.3, min: 0, max: 1, permission: 'matching.write', description: 'Weight of fewer trips today' },
  'matching.weights.idle': { type: 'number', default: 0.1, min: 0, max: 1, permission: 'matching.write', description: 'Weight of time since last trip' },
  'matching.ride.startRadiusKm': { type: 'number', default: 5, min: 0.5, permission: 'matching.write', description: 'Ride search radius at start' },
  'matching.rental.startRadiusKm': { type: 'number', default: 10, min: 0.5, permission: 'matching.write', description: 'Rental search radius at start' },
  'matching.radiusStepKm': { type: 'number', default: 2, min: 0.5, permission: 'matching.write', description: 'Radius added per wave' },
  'matching.maxRadiusKm': { type: 'number', default: 15, min: 1, permission: 'matching.write', description: 'Largest search radius' },
  'matching.ride.offerTimeoutSeconds': { type: 'number', default: 15, min: 5, max: 120, permission: 'matching.write', description: 'Seconds a driver has to accept a ride' },
  'matching.rental.offerTimeoutSeconds': { type: 'number', default: 60, min: 10, max: 600, permission: 'matching.write', description: 'Seconds a driver has to accept a rental' },
  'matching.missesPerWave': { type: 'number', default: 5, min: 1, permission: 'matching.write', description: 'Declines/timeouts before widening the radius' },
  'matching.ride.maxSearchSeconds': { type: 'number', default: 180, min: 30, permission: 'matching.write', description: 'Give up on a ride after this long' },
  'matching.minRating': { type: 'number', default: 3.5, min: 0, max: 5, permission: 'matching.write', description: 'Drivers below this rating are not offered trips' },
  'matching.minRatingCount': { type: 'number', default: 20, min: 0, permission: 'matching.write', description: 'The rating filter applies only after this many ratings' },
  'matching.declineStreakLimit': { type: 'number', default: 5, min: 1, permission: 'matching.write', description: 'Declines/timeouts in a row before a pause' },
  'matching.declinePauseMinutes': { type: 'number', default: 10, min: 0, permission: 'matching.write', description: 'Pause length after a decline streak' },
  'matching.locationMaxAgeMinutes': { type: 'number', default: 5, min: 1, permission: 'matching.write', description: 'Ignore drivers whose location is older than this' },
  'matching.requireVerifiedVehicle': { type: 'boolean', default: false, permission: 'matching.write', description: 'Only offer trips to verified vehicles' },
  'matching.dayResetHour': { type: 'number', default: 4, min: 0, max: 23, permission: 'matching.write', description: 'Hour (Dhaka) when "trips today" resets' },
  'matching.employeePriority': { type: 'boolean', default: true, permission: 'matching.write', description: 'Dispatch GiLab employee bookings first' },

  // ─── Employee sparks ──────────────────────────────────────────────────────
  'perks.employee.enabled': { type: 'boolean', default: true, permission: 'perks.write', public: true, description: 'Employee sparks on/off' },
  'perks.employee.showDesignation': { type: 'boolean', default: true, permission: 'perks.write', description: 'Greet employees by designation' },
  'perks.employee.showBadgeToDriver': { type: 'boolean', default: true, permission: 'perks.write', description: 'Drivers see the employee badge' },
  'perks.employee.discountPct': { type: 'number', default: 10, min: 0, max: 100, permission: 'perks.write', description: 'Employee discount %' },
  'perks.employee.monthlyCapBdt': { type: 'number', default: 1000, min: 0, permission: 'perks.write', description: 'Employee discount cap per month (BDT)' },
  'perks.employee.vehicleTypes': { type: 'json', default: [], permission: 'perks.write', description: 'Vehicle types the discount applies to (empty = all)' },
} as const satisfies Record<string, SettingDef>;

export type SettingKey = keyof typeof SETTINGS;
