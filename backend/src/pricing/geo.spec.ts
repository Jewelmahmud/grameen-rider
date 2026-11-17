import { dhakaMonthStart, dhakaWorkDayStart, haversineKm, inDhakaWindow } from './geo';

describe('geo helpers', () => {
  it('returns 0 for identical points instead of NaN', () => {
    expect(haversineKm({ latitude: 23.81, longitude: 90.41 }, { latitude: 23.81, longitude: 90.41 })).toBe(0);
  });

  it('measures Dhaka (Shahbag) to Gazipur at roughly 30 km', () => {
    const km = haversineKm({ latitude: 23.7385, longitude: 90.3958 }, { latitude: 23.9999, longitude: 90.4203 });
    expect(km).toBeGreaterThan(28);
    expect(km).toBeLessThan(31);
  });

  it('handles night windows that cross midnight, in Dhaka time', () => {
    // 17:30 UTC = 23:30 Dhaka
    expect(inDhakaWindow(new Date('2026-11-16T17:30:00Z'), '22:00', '06:00')).toBe(true);
    // 23:00 UTC = 05:00 Dhaka next day
    expect(inDhakaWindow(new Date('2026-11-16T23:00:00Z'), '22:00', '06:00')).toBe(true);
    // 06:00 UTC = 12:00 Dhaka
    expect(inDhakaWindow(new Date('2026-11-16T06:00:00Z'), '22:00', '06:00')).toBe(false);
  });

  it('starts the month and work day in Dhaka time', () => {
    // 2026-11-30 19:00 UTC is already 1 December in Dhaka
    expect(dhakaMonthStart(new Date('2026-11-30T19:00:00Z')).toISOString()).toBe('2026-11-30T18:00:00.000Z');
    // 03:00 Dhaka is before the 04:00 reset, so the work day began 04:00 the previous day
    expect(dhakaWorkDayStart(new Date('2026-11-16T21:00:00Z'), 4).toISOString()).toBe('2026-11-15T22:00:00.000Z');
  });
});
