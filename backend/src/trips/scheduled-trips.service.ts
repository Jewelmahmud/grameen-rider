import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import Redis from 'ioredis';
import { Trip } from '../entities/trip.entity';
import { DispatchService } from '../dispatch/dispatch.service';
import { SettingsService } from '../settings/settings.service';
import { RealtimeService } from '../realtime/realtime.service';

/** Rides start looking for a driver this long before their scheduled time. */
const RIDE_DISPATCH_LEAD_MINUTES = 15;

/**
 * Every minute:
 *  - scheduled rides enter dispatch at T − 15 min, rentals at T − dispatchLead (default 60 min);
 *  - rentals still without a driver at T − opsAlert (default 30 min) raise an operations alert;
 *  - assigned rentals get reminders at the configured minutes before start.
 * Redis keys make each alert/reminder fire once even with several instances.
 */
@Injectable()
export class ScheduledTripsService {
  private readonly logger = new Logger(ScheduledTripsService.name);

  constructor(
    @InjectRepository(Trip) private tripsRepository: Repository<Trip>,
    private dispatch: DispatchService,
    private settings: SettingsService,
    private realtime: RealtimeService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    await this.activateDue().catch((e) => this.logger.error('Activating scheduled trips failed', e));
    await this.alertUnassignedRentals().catch((e) => this.logger.error('Rental alerts failed', e));
    await this.sendRentalReminders().catch((e) => this.logger.error('Rental reminders failed', e));
  }

  /** Kept for callers/tests of the old name. */
  async activateScheduledTrips(): Promise<void> {
    await this.activateDue();
  }

  async activateDue(now = new Date()): Promise<number> {
    const rentalLead = await this.settings.get<number>('service.rental.dispatchLeadMinutes');
    const horizon = new Date(now.getTime() + Math.max(rentalLead, RIDE_DISPATCH_LEAD_MINUTES) * 60_000);
    const due = await this.tripsRepository.find({
      where: { status: 'scheduled', scheduledDatetime: LessThanOrEqual(horizon) },
    });

    let started = 0;
    for (const trip of due) {
      const lead = trip.serviceType === 'rental' ? rentalLead : RIDE_DISPATCH_LEAD_MINUTES;
      if (new Date(trip.scheduledDatetime).getTime() - now.getTime() > lead * 60_000) continue;
      try {
        // Conditional update: only one instance moves it to searching_driver.
        const res = await this.tripsRepository.update({ id: trip.id, status: 'scheduled' }, { status: 'searching_driver' });
        if (!res.affected) continue;
        trip.status = 'searching_driver';
        await this.realtime.notifyTripStatusUpdated(trip, 'scheduled');
        await this.dispatch.start(trip);
        started++;
        this.logger.log(`Dispatch started for scheduled ${trip.serviceType} ${trip.tripNumber}`);
      } catch (err) {
        this.logger.error(`Failed to activate scheduled trip ${trip.id}`, err);
      }
    }
    return started;
  }

  async alertUnassignedRentals(now = new Date()): Promise<number> {
    const alertMinutes = await this.settings.get<number>('service.rental.opsAlertMinutes');
    const cutoff = new Date(now.getTime() + alertMinutes * 60_000);
    const late = await this.tripsRepository.find({
      where: {
        serviceType: 'rental',
        status: In(['scheduled', 'searching_driver']),
        driverId: IsNull(),
        scheduledDatetime: LessThanOrEqual(cutoff),
      },
    });

    let sent = 0;
    for (const trip of late) {
      if (!(await this.once(`ops-alert:${trip.id}`, 86_400))) continue;
      this.realtime.notifyOps('ops.rental.unassigned', {
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        scheduledAt: trip.scheduledDatetime,
        pickupAddress: trip.pickupAddress,
        vehicleType: trip.vehicleType,
        minutesToStart: Math.round((new Date(trip.scheduledDatetime).getTime() - now.getTime()) / 60_000),
      });
      sent++;
    }
    return sent;
  }

  async sendRentalReminders(now = new Date()): Promise<number> {
    const reminderMinutes = await this.settings.get<number[]>('service.rental.reminderMinutes');
    if (!reminderMinutes?.length) return 0;
    const horizon = new Date(now.getTime() + Math.max(...reminderMinutes) * 60_000);
    const upcoming = await this.tripsRepository.find({
      where: {
        serviceType: 'rental',
        status: 'accepted',
        driverId: Not(IsNull()),
        scheduledDatetime: LessThanOrEqual(horizon),
      },
      relations: ['driver'],
    });

    let sent = 0;
    for (const trip of upcoming) {
      const minutesLeft = (new Date(trip.scheduledDatetime).getTime() - now.getTime()) / 60_000;
      if (minutesLeft < 0) continue;
      // The tightest reminder threshold we've passed, e.g. 15 when 12 minutes are left.
      const threshold = [...reminderMinutes].sort((a, b) => a - b).find((m) => minutesLeft <= m);
      if (threshold === undefined || !(await this.once(`reminder:${trip.id}:${threshold}`, 86_400))) continue;

      const payload = { tripId: trip.id, tripNumber: trip.tripNumber, scheduledAt: trip.scheduledDatetime, minutesToStart: Math.round(minutesLeft) };
      this.realtime.notifyUser(trip.passengerId, 'trip.reminder', payload);
      if (trip.driver?.userProfileId) this.realtime.notifyUser(trip.driver.userProfileId, 'trip.reminder', payload);
      sent++;
    }
    return sent;
  }

  private async once(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      return (await this.redis.set(`sched:${key}`, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
    } catch {
      return false;
    }
  }
}
