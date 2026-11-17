import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { dhakaWorkDayStart } from '../pricing/geo';
import { SettingsService } from '../settings/settings.service';

const DHAKA_TZ = 'Asia/Dhaka';
const MAX_CSV_ROWS = 50_000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: SettingsService,
  ) {}

  /** Console overview: today (Dhaka work day) at a glance. */
  async overview(now = new Date()) {
    const dayStart = dhakaWorkDayStart(now, await this.settings.get<number>('matching.dayResetHour'));
    const q = (sql: string, params: unknown[] = []) => this.dataSource.query(sql, params);

    const [byStatus, money, drivers, rentals, tickets] = await Promise.all([
      q(
        `SELECT service_type, status, count(*)::int AS count FROM trips WHERE requested_at >= $1 GROUP BY 1, 2`,
        [dayStart],
      ),
      q(
        `SELECT COALESCE(SUM(total_fare), 0)::float AS revenue,
                COALESCE(SUM(commission_amount), 0)::float AS platform_net,
                COALESCE(SUM(discount_amount), 0)::float AS discounts,
                count(*)::int AS completed
         FROM trips WHERE status = 'completed' AND completed_at >= $1`,
        [dayStart],
      ),
      q(
        `SELECT count(*) FILTER (WHERE is_online AND NOT is_suspended)::int AS online,
                count(*) FILTER (WHERE is_online AND is_available AND NOT is_suspended)::int AS available,
                count(*) FILTER (WHERE verification_status = 'pending')::int AS pending_verification,
                count(*)::int AS total
         FROM drivers`,
      ),
      q(
        `SELECT count(*) FILTER (WHERE driver_id IS NULL)::int AS unassigned, count(*)::int AS total
         FROM trips WHERE service_type = 'rental' AND status NOT IN ('completed','cancelled','no_driver_found')
           AND scheduled_datetime BETWEEN $1 AND $1::timestamp + interval '24 hours'`,
        [now],
      ),
      q(`SELECT count(*)::int AS open FROM support_tickets WHERE status IN ('open', 'in_progress')`),
    ]);

    return {
      since: dayStart.toISOString(),
      tripsToday: byStatus,
      money: money[0],
      drivers: drivers[0],
      rentalsNext24h: rentals[0],
      support: tickets[0],
    };
  }

  /** Per Dhaka day, service and vehicle type. */
  summary(from: Date, to: Date) {
    return this.dataSource.query(
      `SELECT (requested_at AT TIME ZONE 'UTC' AT TIME ZONE '${DHAKA_TZ}')::date AS day,
              service_type, vehicle_type,
              count(*)::int AS trips,
              count(*) FILTER (WHERE status = 'completed')::int AS completed,
              count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
              count(*) FILTER (WHERE status = 'no_driver_found')::int AS no_driver,
              COALESCE(SUM(total_fare) FILTER (WHERE status = 'completed'), 0)::float AS revenue,
              COALESCE(SUM(commission_amount) FILTER (WHERE status = 'completed'), 0)::float AS platform_net,
              COALESCE(SUM(discount_amount) FILTER (WHERE status = 'completed'), 0)::float AS discounts,
              count(*) FILTER (WHERE is_employee_booking)::int AS employee_trips
       FROM trips
       WHERE requested_at >= $1 AND requested_at < $2
       GROUP BY 1, 2, 3
       ORDER BY 1 DESC, 2, 3`,
      [from, to],
    );
  }

  /** How evenly work was shared on one Dhaka work day: per driver, plus the spread. */
  async fairness(date = new Date()) {
    const resetHour = await this.settings.get<number>('matching.dayResetHour');
    const from = dhakaWorkDayStart(date, resetHour);
    const to = new Date(from.getTime() + 86_400_000);

    const drivers: any[] = await this.dataSource.query(
      `WITH offers AS (
         SELECT driver_id,
                count(*)::int AS offers,
                count(*) FILTER (WHERE outcome = 'accepted')::int AS accepted,
                count(*) FILTER (WHERE outcome = 'declined')::int AS declined,
                count(*) FILTER (WHERE outcome = 'timeout')::int AS timeouts
         FROM trip_offers WHERE offered_at >= $1 AND offered_at < $2 GROUP BY driver_id
       ),
       done AS (
         SELECT t.driver_id, count(*)::int AS completed, COALESCE(SUM(e.net_earnings), 0)::float AS earnings
         FROM trips t LEFT JOIN driver_earnings e ON e.trip_id = t.id
         WHERE t.status = 'completed' AND t.completed_at >= $1 AND t.completed_at < $2
         GROUP BY t.driver_id
       )
       SELECT d.id AS driver_id, u.first_name, u.last_name, u.phone_number,
              COALESCE(o.offers, 0) AS offers, COALESCE(o.accepted, 0) AS accepted,
              COALESCE(o.declined, 0) AS declined, COALESCE(o.timeouts, 0) AS timeouts,
              COALESCE(x.completed, 0) AS completed, COALESCE(x.earnings, 0) AS earnings
       FROM drivers d
       JOIN user_profiles u ON u.id = d.user_profile_id
       LEFT JOIN offers o ON o.driver_id = d.id
       LEFT JOIN done x ON x.driver_id = d.id
       WHERE o.driver_id IS NOT NULL OR x.driver_id IS NOT NULL
       ORDER BY completed DESC, earnings DESC`,
      [from, to],
    );

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      drivers,
      spread: {
        completed: spread(drivers.map((d) => Number(d.completed))),
        earnings: spread(drivers.map((d) => Number(d.earnings))),
      },
    };
  }

  /** CSV of trips in the range, newest first, capped at 50,000 rows. */
  async tripsCsv(from: Date, to: Date): Promise<string> {
    const rows: any[] = await this.dataSource.query(
      `SELECT t.trip_number, t.service_type, t.vehicle_type, t.status, t.pricing_mode,
              t.requested_at, t.scheduled_datetime, t.completed_at, t.cancelled_at, t.cancelled_by,
              t.pickup_address, t.dropoff_address, t.distance_km, t.subtotal, t.discount_amount,
              t.employee_discount_amount, t.total_fare, t.commission_amount, t.payment_method, t.payment_status,
              t.is_employee_booking, p.phone_number AS passenger_phone, du.phone_number AS driver_phone
       FROM trips t
       LEFT JOIN user_profiles p ON p.id = t.passenger_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       LEFT JOIN user_profiles du ON du.id = d.user_profile_id
       WHERE t.requested_at >= $1 AND t.requested_at < $2
       ORDER BY t.requested_at DESC
       LIMIT ${MAX_CSV_ROWS}`,
      [from, to],
    );
    const header = rows.length ? Object.keys(rows[0]) : ['trip_number'];
    const lines = [header.join(',')];
    for (const r of rows) lines.push(header.map((h) => csvCell(r[h])).join(','));
    // BOM so Excel opens Bangla text correctly.
    return '﻿' + lines.join('\r\n');
  }
}

function spread(values: number[]) {
  if (!values.length) return { min: 0, median: 0, max: 0 };
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return { min: s[0], median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2, max: s[s.length - 1] };
}

/** Quotes cells and neutralises spreadsheet formulas (=, +, -, @ at the start). */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== String(v) ? `"${s.replace(/"/g, '""')}"` : s;
}
