import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TripsService, CreateTripDto } from './trips.service';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { DriverMatchingService } from './driver-matching.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PromotionsService } from '../promotions/promotions.service';

const makeTrip = (overrides: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    tripNumber: 'TRIP-001',
    passengerId: 'user-1',
    driverId: 'driver-1',
    status: 'searching_driver',
    vehicleType: 'cng',
    totalFare: 200,
    paymentStatus: 'pending',
    startedAt: new Date(),
    driver: { userProfileId: 'driver-up-1' },
    ...overrides,
  } as Trip);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
});

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepo: ReturnType<typeof makeRepo>;
  let driverRepo: ReturnType<typeof makeRepo>;
  let earningRepo: ReturnType<typeof makeRepo>;
  let eventEmitter: { emit: jest.Mock };
  let realtimeService: Record<string, jest.Mock>;
  let promotionsService: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let redisClient: { set: jest.Mock; get: jest.Mock; del: jest.Mock };
  let driverMatchingService: Record<string, jest.Mock>;

  beforeEach(async () => {
    tripsRepo = makeRepo();
    driverRepo = makeRepo();
    earningRepo = makeRepo();
    eventEmitter = { emit: jest.fn() };
    realtimeService = {
      notifyTripCreated: jest.fn(),
      notifyTripStatusUpdated: jest.fn(),
      notifyTripBroadcastToDrivers: jest.fn(),
    };
    promotionsService = {
      validatePromoCode: jest.fn(),
      applyPromoCode: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          create: jest.fn((Entity, data) => data),
          save: jest.fn((Entity, data) => Promise.resolve({ ...data, id: 'trip-new' })),
        };
        return cb(manager);
      }),
    };
    redisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('some-lock'),
      del: jest.fn().mockResolvedValue(1),
    };
    driverMatchingService = {
      findOptimalDrivers: jest.fn().mockResolvedValue([]),
      broadcastTripToDrivers: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: getRepositoryToken(Trip), useValue: tripsRepo },
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(DriverEarning), useValue: earningRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DriverMatchingService, useValue: driverMatchingService },
        { provide: RealtimeService, useValue: realtimeService },
        { provide: PromotionsService, useValue: promotionsService },
        { provide: DataSource, useValue: dataSource },
        { provide: 'REDIS_CLIENT', useValue: redisClient },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
  });

  describe('createTrip', () => {
    const dto: CreateTripDto = {
      vehicleType: 'cng',
      rentalType: 'single',
      pickupAddress: '1 Main St',
      pickupLatitude: 23.8,
      pickupLongitude: 90.4,
      dropoffAddress: '2 Other St',
      dropoffLatitude: 23.9,
      dropoffLongitude: 90.5,
      baseFare: 50,
      subtotal: 150,
      totalFare: 150,
    };

    it('should create a trip successfully', async () => {
      const result = await service.createTrip(dto, 'user-1');
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('trip.created', expect.any(Object));
      expect(result.id).toBe('trip-new');
    });

    it('should apply promo code when provided', async () => {
      promotionsService.validatePromoCode.mockResolvedValue({
        promotion: { id: 'promo-1' },
        discountAmount: 30,
      });
      promotionsService.applyPromoCode.mockResolvedValue(undefined);

      await service.createTrip({ ...dto, promotionCode: 'SAVE10' }, 'user-1');
      expect(promotionsService.validatePromoCode).toHaveBeenCalledWith(
        'SAVE10', 'user-1', 150, 'cng',
      );
    });
  });

  describe('acceptTrip', () => {
    it('should throw BadRequestException when Redis lock not acquired', async () => {
      redisClient.set.mockResolvedValue(null);
      await expect(service.acceptTrip('trip-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when trip not found', async () => {
      tripsRepo.findOne.mockResolvedValue(null);
      await expect(service.acceptTrip('bad', 'driver-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trip is not in acceptable status', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'completed' }));
      await expect(service.acceptTrip('trip-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });

    it('should accept the trip and set status to accepted', async () => {
      const trip = makeTrip({ status: 'searching_driver' });
      const accepted = makeTrip({ status: 'accepted', acceptedAt: new Date() });
      tripsRepo.findOne.mockResolvedValue(trip);
      tripsRepo.save.mockResolvedValue(accepted);
      redisClient.get.mockResolvedValue(expect.any(String));

      const result = await service.acceptTrip('trip-1', 'driver-1');
      expect(result.status).toBe('accepted');
      expect(eventEmitter.emit).toHaveBeenCalledWith('trip.status.changed', expect.any(Object));
    });
  });

  describe('arriveAtPickup', () => {
    it('should throw NotFoundException when trip not found', async () => {
      tripsRepo.findOne.mockResolvedValue(null);
      await expect(service.arriveAtPickup('bad', 'driver-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when driver is not assigned', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ driverId: 'other-driver' }));
      await expect(service.arriveAtPickup('trip-1', 'driver-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not accepted', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'in_progress' }));
      await expect(service.arriveAtPickup('trip-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });

    it('should transition trip to driver_arrived', async () => {
      const trip = makeTrip({ status: 'accepted' });
      const updated = makeTrip({ status: 'driver_arrived' });
      tripsRepo.findOne.mockResolvedValue(trip);
      tripsRepo.save.mockResolvedValue(updated);

      const result = await service.arriveAtPickup('trip-1', 'driver-1');
      expect(result.status).toBe('driver_arrived');
    });
  });

  describe('startTrip', () => {
    it('should throw BadRequestException when status is not driver_arrived', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'accepted' }));
      await expect(service.startTrip('trip-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });

    it('should transition trip to in_progress', async () => {
      const trip = makeTrip({ status: 'driver_arrived' });
      const updated = makeTrip({ status: 'in_progress' });
      tripsRepo.findOne.mockResolvedValue(trip);
      tripsRepo.save.mockResolvedValue(updated);

      const result = await service.startTrip('trip-1', 'driver-1');
      expect(result.status).toBe('in_progress');
    });
  });

  describe('completeTrip', () => {
    it('should throw BadRequestException when status is not in_progress', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'accepted' }));
      await expect(service.completeTrip('trip-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });

    it('should complete trip and create earning record', async () => {
      const trip = makeTrip({ status: 'in_progress', totalFare: 200 });
      const completed = makeTrip({ status: 'completed' });
      tripsRepo.findOne.mockResolvedValue(trip);
      tripsRepo.save.mockResolvedValue(completed);
      earningRepo.create.mockReturnValue({});
      earningRepo.save.mockResolvedValue({});
      driverRepo.increment.mockResolvedValue(undefined);

      const result = await service.completeTrip('trip-1', 'driver-1');
      expect(result.status).toBe('completed');
      expect(earningRepo.save).toHaveBeenCalled();
      expect(driverRepo.increment).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelTrip', () => {
    it('should throw NotFoundException when trip not found', async () => {
      tripsRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelTrip('bad', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-cancellable status', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'completed' }));
      await expect(service.cancelTrip('trip-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should cancel trip and re-enable driver availability', async () => {
      const trip = makeTrip({ status: 'accepted', driverId: 'driver-1' });
      const cancelled = makeTrip({ status: 'cancelled' });
      tripsRepo.findOne.mockResolvedValue(trip);
      tripsRepo.save.mockResolvedValue(cancelled);
      driverRepo.update.mockResolvedValue(undefined);

      const result = await service.cancelTrip('trip-1', { cancelledBy: 'passenger' });
      expect(result.status).toBe('cancelled');
      expect(driverRepo.update).toHaveBeenCalledWith('driver-1', { isAvailable: true });
    });
  });
});
