import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { Producer } from 'kafkajs';

interface DriverMatch {
  id: string;
  userProfileId: string;
  vehicleType: string;
  currentLatitude: number;
  currentLongitude: number;
  rating: number;
  totalRides: number;
  distance_km: number;
  match_score: number;
}

@Injectable()
export class DriverMatchingService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private dataSource: DataSource,
    @Inject('KAFKA_PRODUCER') private kafkaProducer: Producer,
  ) {}

  async findOptimalDrivers(
    pickupLocation: { latitude: number; longitude: number },
    vehicleType: string,
    options: { maxDistanceKm?: number; limit?: number } = {},
  ): Promise<DriverMatch[]> {
    const { maxDistanceKm = 10, limit = 20 } = options;

    // Simplified query - in production, use PostGIS for accurate distance calculation
    const query = `
      SELECT 
        d.id,
        d.user_profile_id,
        v.vehicle_type,
        d.current_latitude,
        d.current_longitude,
        d.rating,
        d.total_rides,
        d.is_online,
        d.is_available,
        -- Calculate distance (simplified - use PostGIS in production)
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(d.current_latitude)) *
            cos(radians(d.current_longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(d.current_latitude))
          )
        ) AS distance_km,
        -- Calculate match score
        (
          GREATEST(0, 100 - ((6371 * acos(
            cos(radians($1)) * cos(radians(d.current_latitude)) *
            cos(radians(d.current_longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(d.current_latitude))
          )) / $3 * 100)) * 0.6 +
          (d.rating * 20) * 0.3 +
          (LEAST(d.total_rides / 100, 1) * 100) * 0.1
        ) AS match_score
        
      FROM drivers d
      INNER JOIN vehicles v ON v.driver_id = d.id
      WHERE d.is_online = TRUE 
        AND d.is_available = TRUE
        AND d.verification_status = 'approved'
        AND v.vehicle_type = $4
        AND v.is_active = TRUE
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(d.current_latitude)) *
            cos(radians(d.current_longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(d.current_latitude))
          )
        ) <= $3
      ORDER BY match_score DESC, distance_km ASC
      LIMIT $5
    `;

    const result = await this.dataSource.query(query, [
      pickupLocation.latitude,
      pickupLocation.longitude,
      maxDistanceKm,
      vehicleType,
      limit,
    ]);

    return result;
  }

  async broadcastTripToDrivers(tripId: string, potentialDrivers: DriverMatch[]) {
    for (const driver of potentialDrivers) {
      await this.kafkaProducer.send({
        topic: 'trip-broadcasts',
        messages: [
          {
            value: JSON.stringify({
              tripId,
              driverId: driver.id,
              matchScore: driver.match_score,
              estimatedArrivalMinutes: Math.round(driver.distance_km * 2),
            }),
          },
        ],
      });
    }
  }
}

