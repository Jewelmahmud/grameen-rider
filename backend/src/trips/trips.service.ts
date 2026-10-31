import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { DriverMatchingService } from './driver-matching.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PromotionsService } from '../promotions/promotions.service';

export interface CreateTripDto {
  vehicleType: string;
  rentalType: 'single' | 'hourly' | 'daily' | 'custom';
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  scheduledDatetime?: Date;
  passengerCount?: number;
  baseFare: number;
  subtotal: number;
  totalFare: number;
  specialInstructions?: string;
  promotionCode?: string;
}

export interface CancelTripDto {
  cancellationReason?: string;
  cancelledBy?: 'passenger' | 'driver' | 'system';
}

const DRIVER_COMMISSION_PERCENTAGE = 15;

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(DriverEarning)
    private driverEarningRepository: Repository<DriverEarning>,
    private eventEmitter: EventEmitter2,
    private driverMatchingService: DriverMatchingService,
    private realtimeService: RealtimeService,
    private promotionsService: PromotionsService,
    private dataSource: DataSource,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  async createTrip(data: CreateTripDto, userProfileId: string): Promise<Trip> {
    const tripNumber = this.generateTripNumber();

    // Validate and apply promotion code if provided
    let discountAmount = 0;
    let promotionId: string | null = null;

    if (data.promotionCode) {
      const promoResult = await this.promotionsService.validatePromoCode(
        data.promotionCode,
        userProfileId,
        Number(data.subtotal),
        data.vehicleType,
      );
      discountAmount = promoResult.discountAmount;
      promotionId = promoResult.promotion.id;
    }

    const totalFare = Math.max(0, Number(data.subtotal) - discountAmount);

    const savedTrip = await this.dataSource.transaction(async (manager) => {
      const trip = manager.create(Trip, {
        ...data,
        tripNumber,
        passengerId: userProfileId,
        status: 'searching_driver',
        paymentStatus: 'pending',
        discountAmount,
        promotionId,
        totalFare,
      });

      const saved = await manager.save(Trip, trip);

      if (promotionId) {
        await this.promotionsService.applyPromoCode(
          manager,
          promotionId,
          userProfileId,
          saved.id,
          discountAmount,
        );
      }

      return saved;
    });

    this.eventEmitter.emit('trip.created', {
      tripId: savedTrip.id,
      passengerId: savedTrip.passengerId,
      tripNumber: savedTrip.tripNumber,
    });

    await this.realtimeService.notifyTripCreated(savedTrip);

    const potentialDrivers = await this.driverMatchingService.findOptimalDrivers(
      {
        latitude: Number(savedTrip.pickupLatitude),
        longitude: Number(savedTrip.pickupLongitude),
      },
      savedTrip.vehicleType,
      { limit: 10 },
    );

    await this.driverMatchingService.broadcastTripToDrivers(savedTrip.id, potentialDrivers);
    await this.realtimeService.notifyTripBroadcastToDrivers(savedTrip, potentialDrivers);

    return savedTrip;
  }

  async findById(id: string): Promise<Trip | null> {
    return this.tripsRepository.findOne({
      where: { id },
      relations: ['passenger', 'driver', 'vehicle'],
    });
  }

  async findByPassengerId(passengerId: string): Promise<Trip[]> {
    return this.tripsRepository.find({
      where: { passengerId },
      order: { requestedAt: 'DESC' },
    });
  }

  async acceptTrip(tripId: string, driverId: string): Promise<Trip> {
    const lockKey = `trip:accept:${tripId}`;
    const lockValue = `${driverId}:${Date.now()}`;
    const lockAcquired = await this.redisClient.set(lockKey, lockValue, 'EX', 30, 'NX');

    if (!lockAcquired) {
      throw new BadRequestException('Trip is already being accepted by another driver');
    }

    try {
      const trip = await this.findById(tripId);
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      if (!['pending', 'searching_driver'].includes(trip.status)) {
        throw new BadRequestException('Trip is no longer available');
      }

      const oldStatus = trip.status;
      trip.driverId = driverId;
      trip.status = 'accepted';
      trip.acceptedAt = new Date();

      const updatedTrip = await this.tripsRepository.save(trip);

      this.eventEmitter.emit('trip.status.changed', {
        tripId: updatedTrip.id,
        passengerId: updatedTrip.passengerId,
        driverUserProfileId: updatedTrip.driver?.userProfileId ?? null,
        oldStatus,
        newStatus: updatedTrip.status,
      });

      await this.realtimeService.notifyTripStatusUpdated(updatedTrip, oldStatus);
      return updatedTrip;
    } finally {
      const currentLockValue = await this.redisClient.get(lockKey);
      if (currentLockValue === lockValue) {
        await this.redisClient.del(lockKey);
      }
    }
  }

  async arriveAtPickup(tripId: string, driverId: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('You are not the assigned driver for this trip');
    }

    if (trip.status !== 'accepted') {
      throw new BadRequestException(
        `Cannot mark arrival from status "${trip.status}". Trip must be in "accepted" status.`,
      );
    }

    const oldStatus = trip.status;
    trip.status = 'driver_arrived';
    trip.driverArrivedAt = new Date();

    const updatedTrip = await this.tripsRepository.save(trip);

    this.eventEmitter.emit('trip.status.changed', {
      tripId: updatedTrip.id,
      passengerId: updatedTrip.passengerId,
      driverUserProfileId: updatedTrip.driver?.userProfileId ?? null,
      oldStatus,
      newStatus: updatedTrip.status,
    });

    await this.realtimeService.notifyTripStatusUpdated(updatedTrip, oldStatus);
    return updatedTrip;
  }

  async startTrip(tripId: string, driverId: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('You are not the assigned driver for this trip');
    }

    if (trip.status !== 'driver_arrived') {
      throw new BadRequestException(
        `Cannot start trip from status "${trip.status}". Trip must be in "driver_arrived" status.`,
      );
    }

    const oldStatus = trip.status;
    trip.status = 'in_progress';
    trip.startedAt = new Date();

    const updatedTrip = await this.tripsRepository.save(trip);

    this.eventEmitter.emit('trip.status.changed', {
      tripId: updatedTrip.id,
      passengerId: updatedTrip.passengerId,
      driverUserProfileId: updatedTrip.driver?.userProfileId ?? null,
      oldStatus,
      newStatus: updatedTrip.status,
    });

    await this.realtimeService.notifyTripStatusUpdated(updatedTrip, oldStatus);
    return updatedTrip;
  }

  async completeTrip(tripId: string, driverId: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('You are not the assigned driver for this trip');
    }

    if (trip.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot complete trip from status "${trip.status}". Trip must be "in_progress".`,
      );
    }

    const oldStatus = trip.status;
    const now = new Date();
    trip.status = 'completed';
    trip.completedAt = now;

    if (trip.startedAt) {
      trip.actualDurationMinutes = Math.round(
        (now.getTime() - trip.startedAt.getTime()) / 60000,
      );
    }

    const updatedTrip = await this.tripsRepository.save(trip);

    await this.createDriverEarningRecord(updatedTrip);

    await this.driverRepository.increment({ id: driverId }, 'totalRides', 1);
    await this.driverRepository.increment(
      { id: driverId },
      'totalEarnings',
      Number(updatedTrip.totalFare),
    );

    this.eventEmitter.emit('trip.status.changed', {
      tripId: updatedTrip.id,
      passengerId: updatedTrip.passengerId,
      driverUserProfileId: updatedTrip.driver?.userProfileId ?? null,
      oldStatus,
      newStatus: updatedTrip.status,
    });

    await this.realtimeService.notifyTripStatusUpdated(updatedTrip, oldStatus);
    return updatedTrip;
  }

  async cancelTrip(tripId: string, dto: CancelTripDto): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const cancellableStatuses = [
      'pending',
      'searching_driver',
      'accepted',
      'driver_assigned',
      'driver_arriving',
      'driver_arrived',
    ];

    if (!cancellableStatuses.includes(trip.status)) {
      throw new BadRequestException(
        `Cannot cancel a trip with status "${trip.status}".`,
      );
    }

    const oldStatus = trip.status;
    trip.status = 'cancelled';
    trip.cancelledAt = new Date();
    trip.cancellationReason = dto.cancellationReason ?? null;
    trip.cancelledBy = dto.cancelledBy ?? 'passenger';

    const updatedTrip = await this.tripsRepository.save(trip);

    if (trip.driverId) {
      await this.driverRepository.update(trip.driverId, { isAvailable: true });
    }

    this.eventEmitter.emit('trip.status.changed', {
      tripId: updatedTrip.id,
      passengerId: updatedTrip.passengerId,
      driverUserProfileId: updatedTrip.driver?.userProfileId ?? null,
      oldStatus,
      newStatus: updatedTrip.status,
    });

    await this.realtimeService.notifyTripStatusUpdated(updatedTrip, oldStatus);
    return updatedTrip;
  }

  private async createDriverEarningRecord(trip: Trip): Promise<DriverEarning> {
    const amount = Number(trip.totalFare);
    const commissionAmount =
      Math.round((amount * DRIVER_COMMISSION_PERCENTAGE) / 100 * 100) / 100;
    const netEarnings = Math.round((amount - commissionAmount) * 100) / 100;

    const earning = this.driverEarningRepository.create({
      driverId: trip.driverId,
      tripId: trip.id,
      amount,
      commissionPercentage: DRIVER_COMMISSION_PERCENTAGE,
      commissionAmount,
      netEarnings,
      payoutStatus: 'pending',
    });

    return this.driverEarningRepository.save(earning);
  }

  private generateTripNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TRIP-${dateStr}-${random}`;
  }
}
