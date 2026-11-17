import { applyBestDiscount, computeFare, employeeDiscountAmount, FareInput, RateInput } from './fare-engine';

const rate: RateInput = {
  baseFare: 40,
  baseKm: 2,
  perKm: 14,
  perMinute: 0.5,
  minimumFare: 50,
  extraPassengerFare: 10,
  returnLegFactor: null,
  commissionPct: null,
};

const input = (over: Partial<FareInput> = {}): FareInput => ({
  serviceType: 'ride',
  distanceKm: 10,
  durationMinutes: 20,
  passengerCount: 1,
  roundTrip: false,
  isNight: false,
  nightMultiplier: 1,
  defaultCommissionPct: 15,
  ...over,
});

describe('computeFare', () => {
  it('prices a ride by km: base + km beyond the included ones + minutes', () => {
    const f = computeFare(rate, input());
    // 40 + (10 - 2) * 14 + 20 * 0.5 = 40 + 112 + 10
    expect(f).toMatchObject({ pricingMode: 'distance', distanceFare: 112, timeFare: 10, fare: 162 });
    expect(f.grossCommission).toBe(24); // 15 % of 162 = 24.3
    expect(f.driverEarning).toBe(138);
  });

  it('never goes below the minimum fare', () => {
    expect(computeFare(rate, input({ distanceKm: 0.5, durationMinutes: 2 })).fare).toBe(50);
  });

  it('uses the route fare instead of the km rate when one matches', () => {
    const f = computeFare(rate, input({ routeFixedFare: 120 }));
    expect(f).toMatchObject({ pricingMode: 'route', fare: 120, distanceFare: 0 });
  });

  it('ignores route fares for rentals', () => {
    expect(computeFare(rate, input({ serviceType: 'rental', routeFixedFare: 120 })).pricingMode).toBe('distance');
  });

  it('adds the night surcharge to rides only', () => {
    expect(computeFare(rate, input({ isNight: true, nightMultiplier: 1.2 }))).toMatchObject({
      nightSurcharge: 32,
      fare: 194,
    });
    expect(computeFare(rate, input({ serviceType: 'rental', isNight: true, nightMultiplier: 1.2 })).nightSurcharge).toBe(0);
  });

  it('charges extra passengers above the first', () => {
    expect(computeFare(rate, input({ passengerCount: 3 })).extraPassengerFare).toBe(20);
  });

  it('charges the return leg of a rental round trip by the return factor', () => {
    const r = { ...rate, returnLegFactor: 0.5 };
    const f = computeFare(r, input({ serviceType: 'rental', roundTrip: true, distanceKm: 20, durationMinutes: 0 }));
    // charged km = 20 * 1.5 = 30 → 40 + 28 * 14
    expect(f).toMatchObject({ chargedKm: 30, distanceFare: 392, fare: 432 });
  });

  it('counts a full return leg when no factor is set', () => {
    const f = computeFare(rate, input({ serviceType: 'rental', roundTrip: true, distanceKm: 10, durationMinutes: 0 }));
    expect(f.chargedKm).toBe(20);
  });

  it('uses the rate commission override before the global one', () => {
    expect(computeFare({ ...rate, commissionPct: 10 }, input()).grossCommission).toBe(16);
  });
});

describe('applyBestDiscount', () => {
  const base = computeFare(rate, input()); // fare 162, commission 24

  it('applies the larger discount, never both', () => {
    expect(applyBestDiscount(base, { promotion: 30, employee: 16 })).toMatchObject({
      discount: 30,
      discountSource: 'promotion',
      total: 132,
    });
    expect(applyBestDiscount(base, { promotion: 10, employee: 16 })).toMatchObject({
      discount: 16,
      discountSource: 'employee',
    });
  });

  it('is platform-funded: the driver earning is unchanged, the platform net drops', () => {
    const d = applyBestDiscount(base, { employee: 30 });
    expect(d.driverEarning).toBe(base.driverEarning);
    expect(d.platformNet).toBe(24 - 30);
  });

  it('never discounts below zero', () => {
    expect(applyBestDiscount(base, { promotion: 1000 }).total).toBe(0);
  });
});

describe('employeeDiscountAmount', () => {
  it('is the percentage of the fare, capped by what is left of the monthly cap', () => {
    expect(employeeDiscountAmount(200, { pct: 10, monthlyCap: 1000, usedThisMonth: 0 })).toBe(20);
    expect(employeeDiscountAmount(200, { pct: 10, monthlyCap: 1000, usedThisMonth: 990 })).toBe(10);
    expect(employeeDiscountAmount(200, { pct: 10, monthlyCap: 1000, usedThisMonth: 1200 })).toBe(0);
  });
});
