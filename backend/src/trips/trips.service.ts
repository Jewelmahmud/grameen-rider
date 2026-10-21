import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { DriverMatchingService } from './driver-matching.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    private eventEmitter: EventEmitter2,
    private driverMatchingService: DriverMatchingService,
    private realtimeService: RealtimeService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  async createTrip(data: CreateTripDto, userProfileId: string): Promise<Trip> {
    const tripNumber = this.generateTripNumber();

    const trip = this.tripsRepository.create({
      ...data,
      tripNumber,
      passengerId: userProfileId,
      status: 'searching_driver',
      paymentStatus: 'pending',
    });

    const savedTrip = await this.tripsRepository.save(trip);

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

  async updateStatus(tripId: string, status: Trip['status']): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const oldStatus = trip.status;
    trip.status = status;
    const updatedTrip = await this.tripsRepository.save(trip);

    this.eventEmitter.emit('trip.status.changed', {
      tripId: updatedTrip.id,
      oldStatus,
      newStatus: status,
    });

    await this.realtimeService.notifyTripStatusUpdated(updatedTrip, oldStatus);

    return updatedTrip;
  }

  async acceptTrip(tripId: string, driverId: string): Promise<Trip> {
    const lockKey = `trip:accept:${tripId}`;
    const lockValue = `${driverId}:${Date.now()}`;
    const lockAcquired = await this.redisClient.set(lockKey, lockValue, 'EX', 30, 'NX');

    if (!lockAcquired) {
      throw new Error('Trip is already being accepted by another driver');
    }

    try {
      const trip = await this.findById(tripId);
      if (!trip) {
        throw new Error('Trip not found');
      }

      if (!['pending', 'searching_driver'].includes(trip.status)) {
        throw new Error('Trip is no longer available');
      }

      const oldStatus = trip.status;
      trip.driverId = driverId;
      trip.status = 'accepted';
      trip.acceptedAt = new Date();

      const updatedTrip = await this.tripsRepository.save(trip);

      this.eventEmitter.emit('trip.status.changed', {
        tripId: updatedTrip.id,
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

  private generateTripNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TRIP-${dateStr}-${random}`;
  }
}

interface CreateTripDto {
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
}

