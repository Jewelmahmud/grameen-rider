export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance. Uses atan2, so identical points give 0 (not NaN like acos). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pathKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/** Bangladesh has no daylight saving: Dhaka is always UTC+6. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export function dhakaParts(date: Date) {
  const d = new Date(date.getTime() + DHAKA_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

/** Start of the current Dhaka calendar month, as a UTC Date. */
export function dhakaMonthStart(date: Date): Date {
  const p = dhakaParts(date);
  return new Date(Date.UTC(p.year, p.month, 1) - DHAKA_OFFSET_MS);
}

/** Start of the driver "work day" (resets at `resetHour` Dhaka time), as a UTC Date. */
export function dhakaWorkDayStart(date: Date, resetHour: number): Date {
  const p = dhakaParts(date);
  let start = Date.UTC(p.year, p.month, p.day, resetHour) - DHAKA_OFFSET_MS;
  if (start > date.getTime()) start -= 24 * 60 * 60 * 1000;
  return new Date(start);
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** True when `date` (Dhaka time) falls in [start, end). Handles windows that cross midnight. */
export function inDhakaWindow(date: Date, start: string, end: string): boolean {
  const now = dhakaParts(date).minutesOfDay;
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return false;
  return s < e ? now >= s && now < e : now >= s || now < e;
}
