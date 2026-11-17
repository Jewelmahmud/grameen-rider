import { ServiceType } from '../entities/trip.entity';

/** The rate fields the engine needs (a FareRate row, or the seeded defaults). */
export interface RateInput {
  baseFare: number;
  baseKm: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  extraPassengerFare: number;
  returnLegFactor: number | null;
  commissionPct: number | null;
}

export interface FareInput {
  serviceType: ServiceType;
  /** Outbound distance (pickup → stops → destination), already the best estimate we have. */
  distanceKm: number;
  durationMinutes: number;
  passengerCount: number;
  roundTrip: boolean;
  isNight: boolean;
  nightMultiplier: number;
  defaultCommissionPct: number;
  /** A matching route fare beats the km-based rate (rides only). */
  routeFixedFare?: number | null;
}

export interface FareBreakdown {
  pricingMode: 'distance' | 'route';
  chargedKm: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  extraPassengerFare: number;
  nightSurcharge: number;
  /** The price before discounts; drivers earn on this. */
  fare: number;
  commissionPct: number;
  /** Platform's share of `fare`, before any discount. */
  grossCommission: number;
  driverEarning: number;
}

export interface DiscountedFare extends FareBreakdown {
  discount: number;
  discountSource: 'none' | 'promotion' | 'employee';
  /** What the customer pays. */
  total: number;
  /** Platform's net: gross commission minus the (platform-funded) discount. May be negative. */
  platformNet: number;
}

const round = (n: number) => Math.round(n);

export function computeFare(rate: RateInput, input: FareInput): FareBreakdown {
  const commissionPct = rate.commissionPct ?? input.defaultCommissionPct;

  if (input.serviceType === 'ride' && input.routeFixedFare != null) {
    const fare = round(input.routeFixedFare);
    return finish({
      pricingMode: 'route',
      chargedKm: round2(input.distanceKm),
      baseFare: fare,
      distanceFare: 0,
      timeFare: 0,
      extraPassengerFare: 0,
      nightSurcharge: 0,
      fare,
      commissionPct,
    });
  }

  let chargedKm = input.distanceKm;
  if (input.serviceType === 'rental' && input.roundTrip) {
    chargedKm = input.distanceKm * (1 + (rate.returnLegFactor ?? 1));
  }

  const baseFare = rate.baseFare;
  const distanceFare = round(Math.max(0, chargedKm - rate.baseKm) * rate.perKm);
  const timeFare = round(input.durationMinutes * rate.perMinute);
  const extraPassengerFare = round(Math.max(0, input.passengerCount - 1) * rate.extraPassengerFare);

  let fare = Math.max(rate.minimumFare, baseFare + distanceFare + timeFare + extraPassengerFare);
  let nightSurcharge = 0;
  if (input.serviceType === 'ride' && input.isNight && input.nightMultiplier > 1) {
    nightSurcharge = round(fare * (input.nightMultiplier - 1));
    fare += nightSurcharge;
  }

  return finish({
    pricingMode: 'distance',
    chargedKm: round2(chargedKm),
    baseFare: round(baseFare),
    distanceFare,
    timeFare,
    extraPassengerFare,
    nightSurcharge,
    fare: round(fare),
    commissionPct,
  });
}

/** Promo and employee discounts don't stack: the larger one applies. Never below zero. */
export function applyBestDiscount(
  breakdown: FareBreakdown,
  discounts: { promotion?: number; employee?: number },
): DiscountedFare {
  const promotion = clamp(discounts.promotion ?? 0, breakdown.fare);
  const employee = clamp(discounts.employee ?? 0, breakdown.fare);
  const discount = Math.max(promotion, employee);
  const discountSource = discount === 0 ? 'none' : employee >= promotion ? 'employee' : 'promotion';
  return {
    ...breakdown,
    discount,
    discountSource,
    total: breakdown.fare - discount,
    platformNet: breakdown.grossCommission - discount,
  };
}

export function employeeDiscountAmount(
  fare: number,
  opts: { pct: number; monthlyCap: number; usedThisMonth: number },
): number {
  const remaining = Math.max(0, opts.monthlyCap - opts.usedThisMonth);
  return Math.min(round((fare * opts.pct) / 100), remaining);
}

function finish(b: Omit<FareBreakdown, 'grossCommission' | 'driverEarning'>): FareBreakdown {
  const grossCommission = round((b.fare * b.commissionPct) / 100);
  return { ...b, grossCommission, driverEarning: b.fare - grossCommission };
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(round(n), max));
const round2 = (n: number) => Math.round(n * 100) / 100;
