import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export const DHAKA = 'Asia/Dhaka';
export { dayjs };

const moneyFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** ৳ 1,250 */
export const money = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : `৳ ${moneyFmt.format(Number(v))}`;

export const num = (v: number | string | null | undefined, digits = 2) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(Number(v));

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${numFmt.format(v)}%`);

/** 16 Nov 2026, 3:40 PM (Dhaka time) */
export const dateTime = (v?: string | Date | null) => (v ? dayjs(v).tz(DHAKA).format('D MMM YYYY, h:mm A') : '—');
export const dateOnly = (v?: string | Date | null) => (v ? dayjs(v).tz(DHAKA).format('D MMM YYYY') : '—');
export const fromNow = (v?: string | Date | null) => (v ? dayjs(v).fromNow() : '—');

/** Value for <input type="datetime-local"> in Dhaka time, and back to ISO. */
export const toLocalInput = (v?: string | Date | null) => (v ? dayjs(v).tz(DHAKA).format('YYYY-MM-DDTHH:mm') : '');
export const fromLocalInput = (v: string) => (v ? dayjs.tz(v, DHAKA).toISOString() : undefined);

export const fullName = (p?: { firstName?: string | null; lastName?: string | null } | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
