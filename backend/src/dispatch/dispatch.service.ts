import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { DRIVER_COMMITTED_STATUSES, Trip } from '../entities/trip.entity';
import { TripOffer } from '../entities/trip-offer.entity';
import { Driver } from '../entities/driver.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { SettingsService } from '../settings/settings.service';
import { EmployeePerksService } from '../perks/employee-perks.service';
import { RealtimeService } from '../realtime/realtime.service';
import { dhakaWorkDayStart } from '../pricing/geo';
import { CandidatesService } from './candidates.service';
import { passesRatingFilter, scoreCandidates, ScoredCandidate } from './scoring';

export const DISPATCH_QUEUE = 'dispatch';
export type DispatchJob = { kind: 'next'; tripId: string } | { kind: 'timeout'; offerId: string };

/** When nobody is in range at the largest radius, look again after this long. */
const RETRY_WHEN_EMPTY_MS = 15_000;
/** Network slack for an accept that arrives just after the countdown ends. */
const ACCEPT_GRACE_MS = 2_000;

/**
 * Fair-share dispatch (ADR-004): offer each trip to one driver at a time, best score first.
 * Decline or timeout moves to the next driver; after `missesPerWave` misses the radius widens.
 * All state lives in the database (trips + trip_offers), so a restart loses nothing.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripOffer) private readonly offers: Repository<TripOffer>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>,
    @InjectQueue(DISPATCH_QUEUE) private readonly queue: Queue<DispatchJob>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly candidates: CandidatesService,
    private readonly settings: SettingsService,
    private readonly perks: EmployeePerksService,
    private readonly realtime: RealtimeService,
    private readonly events: EventEmitter2,
  ) {}

  /** Starts (or restarts) the search for a trip that is in `searching_driver`. */
  async start(trip: Trip): Promise<void> {
    const startRadius = await this.settings.get<number>(
      trip.serviceType === 'rental' ? 'matching.rental.startRadiusKm' : 'matching.ride.startRadiusKm',
    );
    const priority = await this.isPriority(trip);
    // Employee bookings start one step wider so the first offer reaches more drivers.
    const radius = priority ? startRadius + (await this.settings.get<number>('matching.radiusStepKm')) : startRadius;

    await this.trips.update(trip.id, { dispatchStartedAt: new Date(), dispatchWave: 1, dispatchRadiusKm: radius });
    await this.enqueueNext(trip.id, 0, priority);
  }

  /** One dispatch step. Safe to run twice: a lock and the "pending offer" check prevent double offers. */
  async next(tripId: string): Promise<void> {
    const lockKey = `dispatch:lock:${tripId}`;
    if (!(await this.redis.set(lockKey, '1', 'PX', 10_000, 'NX'))) return;
    try {
      await this.step(tripId);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async handleTimeout(offerId: string): Promise<void> {
    const offer = await this.offers.findOne({ where: { id: offerId } });
    if (!offer || offer.outcome !== 'pending') return;

    const updated = await this.offers.update({ id: offerId, outcome: 'pending' }, { outcome: 'timeout', respondedAt: new Date() });
    if (!updated.affected) return;

    const driver = await this.drivers.findOne({ where: { id: offer.driverId } });
    if (driver) {
      this.realtime.notifyOfferClosed(driver.userProfileId, { offerId, tripId: offer.tripId, reason: 'timeout' });
      await this.recordMiss(driver);
    }
    await this.enqueueNext(offer.tripId);
  }

  /** The driver's answer to their pending offer on this trip. */
  async respond(tripId: string, driverId: string, accept: boolean): Promise<Trip> {
    const offer = await this.offers.findOne({ where: { tripId, driverId, outcome: 'pending' } });
    if (!offer) {
      throw new ConflictException({ code: 'OFFER_NO_LONGER_AVAILABLE', message: 'This trip is no longer offered to you' });
    }
    return accept ? this.accept(offer) : this.decline(offer);
  }

  async currentOfferFor(driverId: string) {
    const offer = await this.offers.findOne({
      where: { driverId, outcome: 'pending' },
      order: { offeredAt: 'DESC' },
    });
    if (!offer || offer.expiresAt.getTime() < Date.now()) return null;
    const trip = await this.trips.findOne({ where: { id: offer.tripId }, relations: ['passenger'] });
    return trip ? this.offerPayload(offer, trip, trip.passenger) : null;
  }

  /** Closes any open offer, e.g. when the passenger cancels or staff assign manually. */
  async closeOffers(tripId: string, reason: string): Promise<void> {
    const open = await this.offers.find({ where: { tripId, outcome: 'pending' }, relations: ['driver'] });
    if (!open.length) return;
    await this.offers.update({ tripId, outcome: 'pending' }, { outcome: 'cancelled', respondedAt: new Date() });
    for (const o of open) {
      this.realtime.notifyOfferClosed(o.driver.userProfileId, { offerId: o.id, tripId, reason });
    }
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private async step(tripId: string) {
    const trip = await this.trips.findOne({ where: { id: tripId }, relations: ['passenger'] });
    if (!trip || trip.status !== 'searching_driver') return;
    if (await this.offers.exist({ where: { tripId, outcome: 'pending' } })) return;

    const s = await this.settings.getMany([
      'matching.ride.maxSearchSeconds',
      'matching.missesPerWave',
      'matching.radiusStepKm',
      'matching.maxRadiusKm',
      'matching.weights.proximity',
      'matching.weights.fairness',
      'matching.weights.idle',
      'matching.minRating',
      'matching.minRatingCount',
      'matching.locationMaxAgeMinutes',
      'matching.requireVerifiedVehicle',
      'matching.dayResetHour',
      'matching.ride.offerTimeoutSeconds',
      'matching.rental.offerTimeoutSeconds',
    ]);
    const now = new Date();

    if (trip.serviceType === 'ride') {
      const started = trip.dispatchStartedAt ?? trip.requestedAt;
      if (now.getTime() - new Date(started).getTime() > s['matching.ride.maxSearchSeconds'] * 1000) {
        return this.giveUp(trip, 'search_timeout');
      }
    } else if (trip.scheduledDatetime && now > new Date(trip.scheduledDatetime)) {
      return this.giveUp(trip, 'start_time_passed');
    }

    // Offers from this dispatch run only: a staff "redispatch" restarts the run and may re-offer everyone.
    const previous = await this.offers.find({
      where: { tripId, ...(trip.dispatchStartedAt ? { offeredAt: MoreThanOrEqual(trip.dispatchStartedAt) } : {}) },
    });
    let wave = trip.dispatchWave || 1;
    let radius = Number(trip.dispatchRadiusKm) || s['matching.maxRadiusKm'];
    const maxRadius = s['matching.maxRadiusKm'];
    const missesInWave = previous.filter((o) => o.wave === wave && (o.outcome === 'declined' || o.outcome === 'timeout')).length;

    const widen = () => {
      radius = Math.min(maxRadius, radius + s['matching.radiusStepKm']);
      wave += 1;
    };
    if (missesInWave >= s['matching.missesPerWave'] && radius < maxRadius) widen();

    const find = async () => {
      const found = await this.candidates.find({
        trip,
        radiusKm: radius,
        excludeDriverIds: previous.map((o) => o.driverId),
        workDayStart: dhakaWorkDayStart(now, s['matching.dayResetHour']),
        locationSince: new Date(now.getTime() - s['matching.locationMaxAgeMinutes'] * 60_000),
        requireVerifiedVehicle: s['matching.requireVerifiedVehicle'],
        now,
      });
      const eligible = [];
      for (const c of found) {
        if (!passesRatingFilter(c, s['matching.minRating'], s['matching.minRatingCount'])) continue;
        if (await this.isPaused(c.driverId)) continue;
        eligible.push(c);
      }
      return scoreCandidates(
        eligible,
        radius,
        { proximity: s['matching.weights.proximity'], fairness: s['matching.weights.fairness'], idle: s['matching.weights.idle'] },
        now,
      );
    };

    let ranked = await find();
    while (!ranked.length && radius < maxRadius) {
      widen();
      ranked = await find();
    }

    if (wave !== trip.dispatchWave || radius !== Number(trip.dispatchRadiusKm)) {
      await this.trips.update(trip.id, { dispatchWave: wave, dispatchRadiusKm: radius });
    }

    if (!ranked.length) {
      await this.enqueueNext(trip.id, RETRY_WHEN_EMPTY_MS, await this.isPriority(trip));
      return;
    }

    const timeoutSeconds =
      trip.serviceType === 'rental' ? s['matching.rental.offerTimeoutSeconds'] : s['matching.ride.offerTimeoutSeconds'];
    await this.makeOffer(trip, ranked[0], wave, timeoutSeconds);
  }

  private async makeOffer(trip: Trip, best: ScoredCandidate, wave: number, timeoutSeconds: number) {
    const now = new Date();
    const offer = await this.offers.save(
      this.offers.create({
        tripId: trip.id,
        driverId: best.driverId,
        vehicleId: best.vehicleId,
        wave,
        score: best.score,
        distanceKm: Math.round(best.distanceKm * 100) / 100,
        outcome: 'pending',
        offeredAt: now,
        expiresAt: new Date(now.getTime() + timeoutSeconds * 1000),
      }),
    );

    this.realtime.notifyTripOffer(best.userProfileId, await this.offerPayload(offer, trip, trip.passenger));
    this.events.emit('dispatch.offer.created', { offerId: offer.id, tripId: trip.id, driverUserProfileId: best.userProfileId });
    await this.queue.add({ kind: 'timeout', offerId: offer.id }, { delay: timeoutSeconds * 1000, jobId: `timeout:${offer.id}`, removeOnComplete: true });
  }

  private async accept(offer: TripOffer): Promise<Trip> {
    let oldStatus = '';
    const trip = await this.dataSource.transaction(async (m) => {
      const tripRow = await m
        .getRepository(Trip)
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id: offer.tripId })
        .getOne();
      const offerRow = await m
        .getRepository(TripOffer)
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: offer.id })
        .getOne();

      if (!tripRow || !offerRow || offerRow.outcome !== 'pending' || tripRow.status !== 'searching_driver') {
        throw new ConflictException({ code: 'OFFER_NO_LONGER_AVAILABLE', message: 'This trip is no longer offered to you' });
      }
      if (offerRow.expiresAt.getTime() + ACCEPT_GRACE_MS < Date.now()) {
        throw new ConflictException({ code: 'OFFER_NO_LONGER_AVAILABLE', message: 'The offer has expired' });
      }

      const driver = await m
        .getRepository(Driver)
        .createQueryBuilder('d')
        .setLock('pessimistic_write')
        .where('d.id = :id', { id: offerRow.driverId })
        .getOne();
      if (!driver || driver.isSuspended || driver.verificationStatus !== 'approved') {
        throw new ForbiddenException({ code: 'DRIVER_UNAVAILABLE', message: 'Your account cannot take trips right now' });
      }
      if (tripRow.serviceType === 'ride') {
        const busy = await m.getRepository(Trip).exist({
          where: { driverId: driver.id, status: In(DRIVER_COMMITTED_STATUSES), serviceType: 'ride' },
        });
        if (busy || !driver.isAvailable) {
          throw new ConflictException({ code: 'DRIVER_UNAVAILABLE', message: 'You already have an active trip' });
        }
      }

      oldStatus = tripRow.status;
      await m.getRepository(TripOffer).update(offerRow.id, { outcome: 'accepted', respondedAt: new Date() });
      tripRow.driverId = driver.id;
      tripRow.vehicleId = offerRow.vehicleId;
      tripRow.status = 'accepted';
      tripRow.acceptedAt = new Date();
      await m.getRepository(Trip).save(tripRow);
      if (tripRow.serviceType === 'ride') await m.getRepository(Driver).update(driver.id, { isAvailable: false });
      return tripRow;
    });

    await this.redis.del(streakKey(offer.driverId)).catch(() => undefined);
    await this.queue.getJob(`timeout:${offer.id}`).then((j) => j?.remove()).catch(() => undefined);

    const full = await this.trips.findOne({ where: { id: trip.id }, relations: ['driver', 'vehicle', 'passenger'] });
    this.events.emit('trip.status.changed', {
      tripId: full.id,
      passengerId: full.passengerId,
      driverUserProfileId: full.driver?.userProfileId ?? null,
      oldStatus,
      newStatus: full.status,
    });
    await this.realtime.notifyTripStatusUpdated(full, oldStatus, full.driver?.userProfileId);
    this.realtime.notifyUser(full.passengerId, 'trip.assigned', {
      tripId: full.id,
      driver: full.driver ? { id: full.driver.id, rating: Number(full.driver.rating) } : null,
      vehicle: full.vehicle
        ? { vehicleType: full.vehicle.vehicleType, licensePlate: full.vehicle.licensePlate, color: full.vehicle.color, model: full.vehicle.model }
        : null,
    });
    return full;
  }

  private async decline(offer: TripOffer): Promise<Trip> {
    const updated = await this.offers.update({ id: offer.id, outcome: 'pending' }, { outcome: 'declined', respondedAt: new Date() });
    if (!updated.affected) {
      throw new ConflictException({ code: 'OFFER_NO_LONGER_AVAILABLE', message: 'This trip is no longer offered to you' });
    }
    await this.queue.getJob(`timeout:${offer.id}`).then((j) => j?.remove()).catch(() => undefined);
    const driver = await this.drivers.findOne({ where: { id: offer.driverId } });
    if (driver) await this.recordMiss(driver);
    await this.enqueueNext(offer.tripId);
    return this.trips.findOne({ where: { id: offer.tripId } });
  }

  /** Declines and timeouts in a row; past the limit the driver is paused so work goes to others. */
  private async recordMiss(driver: Driver) {
    try {
      const [limit, pauseMinutes] = await Promise.all([
        this.settings.get<number>('matching.declineStreakLimit'),
        this.settings.get<number>('matching.declinePauseMinutes'),
      ]);
      const streak = await this.redis.incr(streakKey(driver.id));
      await this.redis.expire(streakKey(driver.id), 86_400);
      if (streak >= limit && pauseMinutes > 0) {
        await this.redis.set(pauseKey(driver.id), '1', 'EX', pauseMinutes * 60);
        await this.redis.del(streakKey(driver.id));
        this.realtime.notifyDriverPaused(driver.userProfileId, {
          until: new Date(Date.now() + pauseMinutes * 60_000).toISOString(),
          reason: 'declined_in_a_row',
        });
      }
    } catch (error) {
      this.logger.warn(`Could not record decline streak: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async isPaused(driverId: string): Promise<boolean> {
    try {
      return (await this.redis.exists(pauseKey(driverId))) === 1;
    } catch {
      return false;
    }
  }

  private async giveUp(trip: Trip, reason: string) {
    const oldStatus = trip.status;
    await this.trips.update(trip.id, { status: 'no_driver_found' });
    const updated = { ...trip, status: 'no_driver_found' } as Trip;
    await this.realtime.notifyTripStatusUpdated(updated, oldStatus);
    this.realtime.notifyOps('dispatch.no_driver_found', { tripId: trip.id, tripNumber: trip.tripNumber, serviceType: trip.serviceType, reason });
    this.events.emit('trip.status.changed', {
      tripId: trip.id,
      passengerId: trip.passengerId,
      driverUserProfileId: null,
      oldStatus,
      newStatus: 'no_driver_found',
    });
  }

  private async isPriority(trip: Trip): Promise<boolean> {
    return trip.isEmployeeBooking && (await this.settings.get<boolean>('matching.employeePriority'));
  }

  private async enqueueNext(tripId: string, delay = 0, priority = false) {
    await this.queue.add(
      { kind: 'next', tripId },
      { delay, priority: priority ? 1 : 5, removeOnComplete: true, attempts: 3, backoff: 2000 },
    );
  }

  private async offerPayload(offer: TripOffer, trip: Trip, passenger?: UserProfile | null) {
    const passengerProfile = passenger ?? (await this.profiles.findOne({ where: { id: trip.passengerId } }));
    const snapshot = (trip.fareSnapshot ?? {}) as { breakdown?: { driverEarning?: number } };
    return {
      offerId: offer.id,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      serviceType: trip.serviceType,
      vehicleType: trip.vehicleType,
      pickup: { address: trip.pickupAddress, latitude: Number(trip.pickupLatitude), longitude: Number(trip.pickupLongitude) },
      dropoff: { address: trip.dropoffAddress, latitude: Number(trip.dropoffLatitude), longitude: Number(trip.dropoffLongitude) },
      scheduledAt: trip.scheduledDatetime ? new Date(trip.scheduledDatetime).toISOString() : null,
      distanceToPickupKm: Number(offer.distanceKm),
      tripDistanceKm: trip.distanceKm != null ? Number(trip.distanceKm) : null,
      total: Number(trip.totalFare),
      driverEarning: Number(snapshot.breakdown?.driverEarning ?? trip.subtotal),
      paymentMethod: trip.paymentMethod ?? null,
      passenger: {
        firstName: passengerProfile?.firstName ?? null,
        employeeBadge: passengerProfile ? await this.perks.badgeForDriver(passengerProfile) : null,
      },
      expiresAt: offer.expiresAt.toISOString(),
    };
  }
}

const streakKey = (driverId: string) => `dispatch:streak:${driverId}`;
const pauseKey = (driverId: string) => `dispatch:pause:${driverId}`;
