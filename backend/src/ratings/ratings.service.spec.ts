import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RatingsService } from './ratings.service';
import { Rating } from '../entities/rating.entity';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';

const makeTrip = (overrides: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    status: 'completed',
    driver: {
      id: 'driver-1',
      userProfileId: 'driver-up-1',
    },
    ...overrides,
  } as Trip);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
});

describe('RatingsService', () => {
  let service: RatingsService;
  let ratingRepo: ReturnType<typeof makeRepo>;
  let tripRepo: ReturnType<typeof makeRepo>;
  let driverRepo: ReturnType<typeof makeRepo>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    ratingRepo = makeRepo();
    tripRepo = makeRepo();
    driverRepo = makeRepo();

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const qb = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: '4.5' }),
        };
        const manager = {
          create: jest.fn((Entity, data) => data),
          save: jest.fn((Entity, data) => Promise.resolve({ ...data, id: 'rating-new' })),
          update: jest.fn().mockResolvedValue(undefined),
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: getRepositoryToken(Rating), useValue: ratingRepo },
        { provide: getRepositoryToken(Trip), useValue: tripRepo },
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
  });

  describe('submitRating', () => {
    it('should throw BadRequestException for rating outside 1-5', async () => {
      await expect(service.submitRating('trip-1', 'passenger-1', { rating: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitRating('trip-1', 'passenger-1', { rating: 6 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when trip not found', async () => {
      tripRepo.findOne.mockResolvedValue(null);
      await expect(service.submitRating('bad', 'passenger-1', { rating: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trip is not completed', async () => {
      tripRepo.findOne.mockResolvedValue(makeTrip({ status: 'in_progress' }));
      await expect(service.submitRating('trip-1', 'passenger-1', { rating: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user was not a trip participant', async () => {
      tripRepo.findOne.mockResolvedValue(makeTrip());
      ratingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.submitRating('trip-1', 'random-user', { rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already rated this trip', async () => {
      tripRepo.findOne.mockResolvedValue(makeTrip());
      ratingRepo.findOne.mockResolvedValue({ id: 'existing-rating' });
      await expect(
        service.submitRating('trip-1', 'passenger-1', { rating: 4 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit a rating from passenger and update driver average', async () => {
      tripRepo.findOne.mockResolvedValue(makeTrip());
      ratingRepo.findOne.mockResolvedValue(null);

      const result = await service.submitRating('trip-1', 'passenger-1', {
        rating: 5,
        review: 'Great!',
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result.id).toBe('rating-new');
    });

    it('should allow driver to rate passenger', async () => {
      tripRepo.findOne.mockResolvedValue(makeTrip());
      ratingRepo.findOne.mockResolvedValue(null);

      const result = await service.submitRating('trip-1', 'driver-up-1', { rating: 4 });
      expect(result.id).toBe('rating-new');
    });
  });

  describe('findByDriverId', () => {
    it('should throw NotFoundException when driver not found', async () => {
      driverRepo.findOne.mockResolvedValue(null);
      await expect(service.findByDriverId('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return paginated ratings for driver', async () => {
      const driver = { id: 'driver-1', userProfileId: 'driver-up-1' };
      driverRepo.findOne.mockResolvedValue(driver);
      ratingRepo.findAndCount.mockResolvedValue([[{ id: 'r-1' }], 1]);

      const result = await service.findByDriverId('driver-1', 1, 10);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
    });
  });
});
