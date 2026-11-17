import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIVER_COMMITTED_STATUSES, Trip, TripStatus } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { PromotionsService } from '../promotions/promotions.service';
import { PricingService, StoredQuote } from '../pricing/pricing.service';
import { applyBestDiscount } from '../pricing/fare-engine';
import { EmployeePerksService } from '../perks/employee-perks.service';
import { SettingsService } from '../settings/settings.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { CreateTripDto } from './dto/create-trip.dto';

/** Who is acting on a trip. Derived from the verified token, never from the request body. */
export interface TripActor {
  userProfileId: string;
  driverId: string | null;
  isStaff: boolean;
}

const ACTIVE_RIDE_STATUSES: TripStatus[] = ['pending', 'searching_driver', ...DRIVER_COMMITTED_STATUSES];
const PASSENGER_CANCELLABLE: TripStatus[] = [
  'pending',
  'scheduled',
  'searching_driver',
  'accepted',
  'driver_assigned',
  'driver_arriving',
  'driver_arrived',
];
/** Commission used only for trips booked before rates moved into the database. */
const LEGACY_COMMISSION_PCT = 15;

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private tripsRepository: Repository<Trip>,
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
    @InjectRepository(DriverEarning) private driverEarningRepository: Repository<DriverEarning>,
    private eventEmitter: EventEmitter2,
    private realtimeService: RealtimeService,
    private promotionsService: PromotionsService,
    private pricing: PricingService,
    private perks: EmployeePerksService,
    private settings: SettingsService,
    private dispatch: DispatchService,
    private dataSource: DataSource,
  ) {}

  /**
   * Books a trip from a quote. The price is the quote's; the promo code and the employee discount
   * are re-checked now and only the larger applies. Immediate rides start dispatch at once;
   * scheduled rides and rentals wait for the scheduler.
   */
  async createTrip(dto: CreateTripDto, passenger: UserProfile): Promise<Trip> {
    const quote = await this.pricing.getQuote(dto.quoteId, passenger.id);
    const scheduledAt = await this.pricing.checkSchedule(quote.serviceType, quote.scheduledAt);

    const methods = await this.settings.get<string[]>('payments.methods');
    if (!methods.includes(dto.paymentMethod)) {
      throw new BadRequestException({ code: 'PAYMENT_METHOD_UNAVAILABLE', message: `${dto.paymentMethod} is not available` });
    }

    if (quote.serviceType === 'ride' && !scheduledAt) {
      const active = await this.tripsRepository.exist({
        where: { passengerId: passenger.id, serviceType: 'ride', status: In(ACTIVE_RIDE_STATUSES) },
      });
      if (active) {
        throw new ConflictException({ code: 'ACTIVE_TRIP_EXISTS', message: 'You already have a ride in progress' });
      }
    }

    const fare = quote.breakdown.fare;
    const employee = await this.perks.discountFor(passenger, quote.vehicleType, fare);
    let promotion = 0;
    let promotionId: string | null = null;
    if (dto.promotionCode) {
      const promo = await this.promotionsService.validatePromoCode(
        dto.promotionCode,
        passenger.id,
        fare,
        quote.vehicleType,
        await this.perks.audienceContext(passenger),
      );
      promotion = promo.discountAmount;
      promotionId = promo.promotion.id;
    }
    const priced = applyBestDiscount(quote.breakdown, { promotion, employee });
    const usesPromotion = priced.discountSource === 'promotion';
    const isEmployeeBooking = await this.perks.isActiveFor(passenger);

    const saved = await this.dataSource.transaction(async (manager) => {
      const trip = manager.create(Trip, {
        tripNumber: this.generateTripNumber(),
        passengerId: passenger.id,
        serviceType: quote.serviceType,
        vehicleType: quote.vehicleType,
        rentalType: 'single',
        pickupAddress: quote.pickup.address,
        pickupLatitude: quote.pickup.latitude,
        pickupLongitude: quote.pickup.longitude,
        dropoffAddress: quote.dropoff.address,
        dropoffLatitude: quote.dropoff.latitude,
        dropoffLongitude: quote.dropoff.longitude,
        stops: quote.stops.length ? quote.stops : null,
        roundTrip: quote.roundTrip,
        scheduledDatetime: scheduledAt,
        passengerCount: quote.passengerCount,
        distanceKm: quote.distanceKm,
        estimatedDurationMinutes: quote.durationMinutes,
        pricingMode: quote.breakdown.pricingMode,
        routeFareId: quote.routeFareId,
        baseFare: quote.breakdown.baseFare,
        distanceFare: quote.breakdown.distanceFare,
        timeFare: quote.breakdown.timeFare,
        extraPassengerFare: quote.breakdown.extraPassengerFare,
        subtotal: fare,
        discountAmount: priced.discount,
        promotionId: usesPromotion ? promotionId : null,
        employeeDiscountAmount: priced.discountSource === 'employee' ? priced.discount : 0,
        totalFare: priced.total,
        commissionAmount: priced.platformNet,
        isEmployeeBooking,
        fareSnapshot: this.snapshot(quote, priced),
        paymentMethod: dto.paymentMethod,
        paymentStatus: 'pending',
        specialInstructions: dto.specialInstructions ?? null,
        status: scheduledAt ? 'scheduled' : 'searching_driver',
      });
      const created = await manager.save(Trip, trip);
      if (usesPromotion && promotionId) {
        await this.promotionsService.applyPromoCode(manager, promotionId, passenger.id, created.id, priced.discount);
      }
      return created;
    });

    await this.pricing.consumeQuote(quote.id);
    this.eventEmitter.emit('trip.created', {
      tripId: saved.id,
      passengerId: saved.passengerId,
      tripNumber: saved.tripNumber,
    });
    await this.realtimeService.notifyTripCreated(saved);
    if (saved.status === 'searching_driver') await this.dispatch.start(saved);

    return saved;
  }

  async findById(id: string): Promise<Trip | null> {
    return this.tripsRepository.findOne({
      where: { id },
      relations: ['passenger', 'driver', 'vehicle'],
    });
  }

  /** A trip as its passenger, its driver or staff may see it. Others get 404 (no probing for ids). */
  async findForActor(id: string, actor: TripActor): Promise<Trip> {
    const trip = await this.findById(id);
    if (!trip || !this.canView(trip, actor)) throw new NotFoundException('Trip not found');
    return trip;
  }

  async findByPassengerId(passengerId: string): Promise<Trip[]> {
    return this.tripsRepository.find({
      where: { passengerId },
      order: { requestedAt: 'DESC' },
      relations: ['driver', 'vehicle'],
      take: 100,
    });
  }

  /** Driver view: active and upcoming trips first, then history. */
  async findByDriverId(driverId: string, status?: 'active' | 'upcoming' | 'history'): Promise<Trip[]> {
    const where =
      status === 'active'
        ? { driverId, status: In(DRIVER_COMMITTED_STATUSES) }
        : status === 'history'
          ? { driverId, status: In(['completed', 'cancelled'] as TripStatus[]) }
          : { driverId };
    const trips = await this.tripsRepository.find({ where, order: { requestedAt: 'DESC' }, relations: ['passenger'], take: 100 });
    if (status !== 'upcoming') return trips;
    const now = Date.now();
    return trips.filter((t) => t.scheduledDatetime && new Date(t.scheduledDatetime).getTime() > now && t.status === 'accepted');
  }

  async arriveAtPickup(tripId: string, driverId: string): Promise<Trip> {
    return this.advance(tripId, driverId, 'accepted', 'driver_arrived', (t) => (t.driverArrivedAt = new Date()));
  }

  async startTrip(tripId: string, driverId: string): Promise<Trip> {
    return this.advance(tripId, driverId, 'driver_arrived', 'in_progress', (t) => (t.startedAt = new Date()));
  }

  async completeTrip(tripId: string, driverId: string): Promise<Trip> {
    const now = new Date();
    const trip = await this.advance(tripId, driverId, 'in_progress', 'completed', (t) => {
      t.completedAt = now;
      if (t.startedAt) t.actualDurationMinutes = Math.round((now.getTime() - new Date(t.startedAt).getTime()) / 60000);
    });

    const earning = await this.createDriverEarningRecord(trip);
    await this.driverRepository.increment({ id: driverId }, 'totalRides', 1);
    await this.driverRepository.increment({ id: driverId }, 'totalEarnings', Number(earning.netEarnings));
    await this.driverRepository.update(driverId, {
      lastTripEndedAt: now,
      ...(trip.serviceType === 'ride' ? { isAvailable: true } : {}),
    });
    return trip;
  }

  /**
   * Cancel as the passenger (trip ends) or as the assigned driver (the trip goes back to dispatch,
   * so the passenger isn't left without a ride). Staff cancel through the admin API.
   */
  async cancelTrip(tripId: string, actor: TripActor, reason?: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip || !this.canView(trip, actor)) throw new NotFoundException('Trip not found');

    if (actor.driverId && trip.driverId === actor.driverId && trip.passengerId !== actor.userProfileId) {
      return this.releaseByDriver(trip, reason);
    }
    if (trip.passengerId !== actor.userProfileId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only the passenger or the assigned driver can cancel' });
    }
    return this.cancel(trip, 'passenger', reason);
  }

  /** Cancels regardless of who booked it. Used by the passenger flow and by staff. */
  async cancel(trip: Trip, by: 'passenger' | 'driver' | 'system', reason?: string): Promise<Trip> {
    if (!PASSENGER_CANCELLABLE.includes(trip.status)) {
      throw new BadRequestException(`Cannot cancel a trip with status "${trip.status}".`);
    }
    const oldStatus = trip.status;
    trip.status = 'cancelled';
    trip.cancelledAt = new Date();
    trip.cancellationReason = reason ?? null;
    trip.cancelledBy = by;
    const updated = await this.tripsRepository.save(trip);

    await this.dispatch.closeOffers(trip.id, 'trip_cancelled');
    if (trip.driverId && trip.serviceType === 'ride') {
      await this.driverRepository.update(trip.driverId, { isAvailable: true });
    }
    this.emitStatus(updated, oldStatus);
    await this.realtimeService.notifyTripStatusUpdated(updated, oldStatus, trip.driver?.userProfileId);
    return updated;
  }

  canView(trip: Trip, actor: TripActor): boolean {
    return (
      actor.isStaff ||
      trip.passengerId === actor.userProfileId ||
      (actor.driverId != null && trip.driverId === actor.driverId)
    );
  }

  private async releaseByDriver(trip: Trip, reason?: string): Promise<Trip> {
    if (!['accepted', 'driver_assigned', 'driver_arriving', 'driver_arrived'].includes(trip.status)) {
      throw new BadRequestException(`Cannot give up a trip with status "${trip.status}".`);
    }
    const oldStatus = trip.status;
    const driverProfileId = trip.driver?.userProfileId;
    const driverId = trip.driverId;
    trip.driverId = null;
    trip.vehicleId = null;
    trip.acceptedAt = null;
    trip.status = 'searching_driver';
    const updated = await this.tripsRepository.save(trip);
    if (updated.serviceType === 'ride') await this.driverRepository.update(driverId, { isAvailable: true });

    this.emitStatus(updated, oldStatus, driverProfileId, reason);
    await this.realtimeService.notifyTripStatusUpdated(updated, oldStatus, driverProfileId);
    // Previous offers (including this driver's) stay excluded, so the next driver is someone else.
    await this.dispatch.next(updated.id);
    return updated;
  }

  private async advance(
    tripId: string,
    driverId: string,
    from: TripStatus,
    to: TripStatus,
    mutate: (t: Trip) => void,
  ): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) throw new ForbiddenException('You are not the assigned driver for this trip');
    if (trip.status !== from) {
      throw new BadRequestException(`Cannot move trip from "${trip.status}" to "${to}". Trip must be "${from}".`);
    }
    const oldStatus = trip.status;
    trip.status = to;
    mutate(trip);
    const updated = await this.tripsRepository.save(trip);
    this.emitStatus(updated, oldStatus);
    await this.realtimeService.notifyTripStatusUpdated(updated, oldStatus, updated.driver?.userProfileId);
    return updated;
  }

  private emitStatus(trip: Trip, oldStatus: string, driverUserProfileId?: string | null, reason?: string) {
    this.eventEmitter.emit('trip.status.changed', {
      tripId: trip.id,
      passengerId: trip.passengerId,
      driverUserProfileId: driverUserProfileId ?? trip.driver?.userProfileId ?? null,
      oldStatus,
      newStatus: trip.status,
      ...(reason ? { reason } : {}),
    });
  }

  /** Drivers earn on the pre-discount fare; discounts come out of the platform's commission. */
  private async createDriverEarningRecord(trip: Trip): Promise<DriverEarning> {
    const breakdown = (trip.fareSnapshot as any)?.breakdown;
    const amount = Number(breakdown?.fare ?? trip.subtotal ?? trip.totalFare);
    const commissionPct = Number(breakdown?.commissionPct ?? LEGACY_COMMISSION_PCT);
    const commissionAmount = Number(breakdown?.grossCommission ?? Math.round((amount * commissionPct) / 100));
    const netEarnings = Number(breakdown?.driverEarning ?? amount - commissionAmount);

    return this.driverEarningRepository.save(
      this.driverEarningRepository.create({
        driverId: trip.driverId,
        tripId: trip.id,
        amount,
        commissionPercentage: commissionPct,
        commissionAmount,
        netEarnings,
        payoutStatus: 'pending',
      }),
    );
  }

  private snapshot(quote: StoredQuote, priced: ReturnType<typeof applyBestDiscount>) {
    return {
      quoteId: quote.id,
      quotedAt: quote.createdAt,
      fareRateId: quote.fareRateId,
      fareRateVersion: quote.fareRateVersion,
      routeFareId: quote.routeFareId,
      inputs: {
        distanceKm: quote.distanceKm,
        straightLineKm: quote.straightLineKm,
        durationMinutes: quote.durationMinutes,
        passengerCount: quote.passengerCount,
        roundTrip: quote.roundTrip,
        scheduledAt: quote.scheduledAt,
      },
      breakdown: priced,
    };
  }

  private generateTripNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    return `TRIP-${dateStr}-${random}`;
  }
}
