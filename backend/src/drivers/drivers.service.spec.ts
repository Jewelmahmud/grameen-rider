import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { UserProfile } from '../entities/user-profile.entity';

const makeDriver = (overrides: Partial<Driver> = {}): Driver =>
  ({
    id: 'd-1',
    userProfileId: 'up-1',
    licenseNumber: 'LIC-001',
    vehicleRegistrationNumber: 'REG-001',
    verificationStatus: 'pending',
    rating: 0,
    totalRides: 0,
    totalEarnings: 0,
    isOnline: false,
    isAvailable: false,
    ...overrides,
  } as Driver);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('DriversService', () => {
  let service: DriversService;
  let driverRepo: ReturnType<typeof makeRepo>;
  let vehicleRepo: ReturnType<typeof makeRepo>;
  let earningRepo: ReturnType<typeof makeRepo>;
  let userProfileRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    driverRepo = makeRepo();
    vehicleRepo = makeRepo();
    earningRepo = makeRepo();
    userProfileRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepo },
        { provide: getRepositoryToken(DriverEarning), useValue: earningRepo },
        { provide: getRepositoryToken(UserProfile), useValue: userProfileRepo },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
  });

  describe('createDriverProfile', () => {
    const dto = {
      licenseNumber: 'LIC-001',
      vehicleRegistrationNumber: 'REG-001',
    };

    it('should throw ConflictException if driver profile already exists', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      await expect(service.createDriverProfile('up-1', dto)).rejects.toThrow(ConflictException);
    });

    it('should create a driver profile and set userType to driver', async () => {
      const driver = makeDriver();
      driverRepo.findOne.mockResolvedValue(null);
      driverRepo.create.mockReturnValue(driver);
      driverRepo.save.mockResolvedValue(driver);
      userProfileRepo.update.mockResolvedValue(undefined);

      const result = await service.createDriverProfile('up-1', dto);
      expect(driverRepo.save).toHaveBeenCalled();
      expect(userProfileRepo.update).toHaveBeenCalledWith('up-1', { userType: 'driver' });
      expect(result).toEqual(driver);
    });
  });

  describe('getDriverProfile', () => {
    it('should return driver with vehicles relation', async () => {
      const driver = makeDriver();
      driverRepo.findOne.mockResolvedValue(driver);
      const result = await service.getDriverProfile('up-1');
      expect(driverRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userProfileId: 'up-1' }, relations: ['vehicles'] }),
      );
      expect(result).toEqual(driver);
    });

    it('should return null when no driver found', async () => {
      driverRepo.findOne.mockResolvedValue(null);
      const result = await service.getDriverProfile('up-1');
      expect(result).toBeNull();
    });
  });

  describe('updateLocation', () => {
    it('should update the driver location', async () => {
      driverRepo.update.mockResolvedValue(undefined);
      await service.updateLocation('d-1', 23.8, 90.4);
      expect(driverRepo.update).toHaveBeenCalledWith(
        'd-1',
        expect.objectContaining({ currentLatitude: 23.8, currentLongitude: 90.4 }),
      );
    });
  });

  describe('updateAvailability', () => {
    it('should update online and available status', async () => {
      driverRepo.update.mockResolvedValue(undefined);
      await service.updateAvailability('d-1', true, true);
      expect(driverRepo.update).toHaveBeenCalledWith('d-1', { isOnline: true, isAvailable: true });
    });
  });

  describe('getEarningsSummary', () => {
    it('should throw NotFoundException when driver not found', async () => {
      driverRepo.findOne.mockResolvedValue(null);
      await expect(service.getEarningsSummary('up-1')).rejects.toThrow(NotFoundException);
    });

    it('should return earnings summary with zeros when no earnings', async () => {
      const driver = makeDriver();
      driverRepo.findOne.mockResolvedValue(driver);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ gross: null, net: null, rides: null }),
      };
      earningRepo.createQueryBuilder.mockReturnValue(mockQb);
      earningRepo.find.mockResolvedValue([]);

      const result = await service.getEarningsSummary('up-1');
      expect(result.today.grossEarnings).toBe(0);
      expect(result.today.netEarnings).toBe(0);
      expect(result.today.rides).toBe(0);
      expect(result.recent).toEqual([]);
    });
  });
});
