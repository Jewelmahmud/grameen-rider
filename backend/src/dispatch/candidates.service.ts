import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { Candidate } from './scoring';

export interface CandidateQuery {
  trip: Pick<
    Trip,
    'pickupLatitude' | 'pickupLongitude' | 'vehicleType' | 'serviceType' | 'scheduledDatetime' | 'estimatedDurationMinutes'
  >;
  radiusKm: number;
  excludeDriverIds: string[];
  workDayStart: Date;
  locationSince: Date;
  requireVerifiedVehicle: boolean;
  now: Date;
}

/** Buffer around a committed trip in which the same driver can't be booked again. */
const CONFLICT_BUFFER_MINUTES = 30;

/**
 * Drivers who could take this trip, nearest-first, with what fair-share scoring needs.
 * PostGIS computes distance on the fly from current_latitude/longitude; at ~1k online drivers
 * that is fast without a spatial index.
 */
@Injectable()
export class CandidatesService {
  constructor(private readonly dataSource: DataSource) {}

  async find(q: CandidateQuery): Promise<Candidate[]> {
    const start = q.trip.scheduledDatetime ? new Date(q.trip.scheduledDatetime) : q.now;
    const durationMin = (q.trip.estimatedDurationMinutes ?? 60) + CONFLICT_BUFFER_MINUTES;
    const end = new Date(start.getTime() + durationMin * 60_000);
    const pickup = 'ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography';
    const driverPoint = 'ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography';

    const rows: any[] = await this.dataSource.query(
      `
      WITH cand AS (
        SELECT DISTINCT ON (d.id)
          d.id AS driver_id,
          d.user_profile_id,
          v.id AS vehicle_id,
          d.rating,
          d.last_trip_ended_at,
          ST_Distance(${driverPoint}, ${pickup}) / 1000.0 AS distance_km
        FROM drivers d
        JOIN vehicles v ON v.driver_id = d.id
        WHERE d.is_online
          AND d.verification_status = 'approved'
          AND NOT d.is_suspended
          AND d.current_latitude IS NOT NULL
          AND d.current_location_updated_at >= $8
          AND v.is_active
          AND v.vehicle_type = $4
          AND (($5 = 'ride' AND v.serves_ride) OR ($5 = 'rental' AND v.serves_rental))
          AND (NOT $9 OR v.is_verified)
          AND ($5 = 'rental' OR d.is_available)
          AND NOT (d.id = ANY($6::uuid[]))
          AND ST_DWithin(${driverPoint}, ${pickup}, $3 * 1000)
        ORDER BY d.id, v.is_verified DESC, v.created_at ASC
      )
      SELECT
        c.*,
        (SELECT count(*) FROM trips t
          WHERE t.driver_id = c.driver_id AND t.status = 'completed' AND t.completed_at >= $7)::int AS trips_today,
        (SELECT count(*) FROM ratings r WHERE r.rated_profile_id = c.user_profile_id)::int AS rating_count
      FROM cand c
      WHERE NOT EXISTS (
        SELECT 1 FROM trips t
        WHERE t.driver_id = c.driver_id
          AND t.status IN ('accepted', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress')
          AND COALESCE(t.scheduled_datetime, t.accepted_at, t.requested_at) < $11
          AND COALESCE(t.scheduled_datetime, t.accepted_at, t.requested_at)
              + make_interval(mins => COALESCE(t.estimated_duration_minutes, 60) + ${CONFLICT_BUFFER_MINUTES}) > $10
      )
      ORDER BY c.distance_km ASC
      LIMIT 50
      `,
      [
        Number(q.trip.pickupLatitude),
        Number(q.trip.pickupLongitude),
        q.radiusKm,
        q.trip.vehicleType,
        q.trip.serviceType,
        q.excludeDriverIds,
        q.workDayStart,
        q.locationSince,
        q.requireVerifiedVehicle,
        start,
        end,
      ],
    );

    return rows.map((r) => ({
      driverId: r.driver_id,
      userProfileId: r.user_profile_id,
      vehicleId: r.vehicle_id,
      distanceKm: Number(r.distance_km),
      tripsToday: Number(r.trips_today),
      lastTripEndedAt: r.last_trip_ended_at ? new Date(r.last_trip_ended_at) : null,
      rating: Number(r.rating ?? 0),
      ratingCount: Number(r.rating_count ?? 0),
    }));
  }
}
