import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../entities/vehicle.entity';

const makeVehicle = (overrides: Partial<Vehicle> = {}): Vehicle =>
  ({
    id: 'v-1',
    driverId: 'd-1',
    vehicleType: 'cng',
    licensePlate: 'DHA-1234',
    seatingCapacity: 3,
    isActive: true,
    isVerified: false,
    ...overrides,
  } as Vehicle);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: repo },
      ],
    }).compile();
    service = module.get<VehiclesService>(VehiclesService);
  });

  describe('createVehicle', () => {
    it('should create and return a vehicle', async () => {
      const vehicle = makeVehicle();
      repo.create.mockReturnValue(vehicle);
      repo.save.mockResolvedValue(vehicle);

      const result = await service.createVehicle('d-1', {
        vehicleType: 'cng',
        licensePlate: 'DHA-1234',
        seatingCapacity: 3,
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ driverId: 'd-1', isActive: true }));
      expect(result).toEqual(vehicle);
    });
  });

  describe('findByDriverId', () => {
    it('should return only active vehicles for the driver', async () => {
      const vehicles = [makeVehicle(), makeVehicle({ id: 'v-2' })];
      repo.find.mockResolvedValue(vehicles);

      const result = await service.findByDriverId('d-1');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { driverId: 'd-1', isActive: true } }),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('updateVehicle', () => {
    it('should throw NotFoundException when vehicle not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.updateVehicle('bad', 'd-1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when driver does not own vehicle', async () => {
      repo.findOne.mockResolvedValue(makeVehicle({ driverId: 'other-driver' }));
      await expect(service.updateVehicle('v-1', 'd-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('should update and return the vehicle', async () => {
      const vehicle = makeVehicle();
      const updated = makeVehicle({ seatingCapacity: 4 });
      repo.findOne.mockResolvedValue(vehicle);
      repo.save.mockResolvedValue(updated);

      const result = await service.updateVehicle('v-1', 'd-1', { seatingCapacity: 4 });
      expect(result.seatingCapacity).toBe(4);
    });
  });

  describe('deleteVehicle', () => {
    it('should throw NotFoundException when vehicle not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.deleteVehicle('bad', 'd-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when driver does not own vehicle', async () => {
      repo.findOne.mockResolvedValue(makeVehicle({ driverId: 'other-driver' }));
      await expect(service.deleteVehicle('v-1', 'd-1')).rejects.toThrow(ForbiddenException);
    });

    it('should soft-delete by setting isActive to false', async () => {
      const vehicle = makeVehicle();
      repo.findOne.mockResolvedValue(vehicle);
      repo.save.mockResolvedValue({ ...vehicle, isActive: false });

      await service.deleteVehicle('v-1', 'd-1');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });
  });
});
