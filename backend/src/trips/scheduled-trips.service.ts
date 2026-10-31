import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { DriverMatchingService } from './driver-matching.service';

@Injectable()
export class ScheduledTripsService {
  private readonly logger = new Logger(ScheduledTripsService.name);

  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    private driverMatchingService: DriverMatchingService,
  ) {}

  // Runs every minute to pick up trips scheduled within the next 15 minutes
  @Cron(CronExpression.EVERY_MINUTE)
  async activateScheduledTrips(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    let trips: Trip[];
    try {
      trips = await this.tripsRepository.find({
        where: {
          status: 'pending',
          scheduledDatetime: LessThanOrEqual(windowEnd),
        },
      });
      // Filter to trips that are scheduled (have a scheduledDatetime) and not yet activated
      trips = trips.filter(
        (t) => t.scheduledDatetime != null && t.scheduledDatetime > now,
      );
    } catch (err) {
      this.logger.error('Failed to query scheduled trips', err);
      return;
    }

    for (const trip of trips) {
      try {
        await this.tripsRepository.update(trip.id, { status: 'searching_driver' });
        this.logger.log(`Activated scheduled trip ${trip.tripNumber}`);

        await this.driverMatchingService.findOptimalDrivers(
          { latitude: trip.pickupLatitude, longitude: trip.pickupLongitude },
          trip.vehicleType,
        );
      } catch (err) {
        this.logger.error(`Failed to activate scheduled trip ${trip.id}`, err);
      }
    }
  }
}
