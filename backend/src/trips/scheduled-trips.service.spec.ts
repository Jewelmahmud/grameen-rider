import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduledTripsService } from './scheduled-trips.service';
import { Trip } from '../entities/trip.entity';
import { DriverMatchingService } from './driver-matching.service';

const makeTrip = (overrides: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    tripNumber: 'TR-001',
    status: 'pending',
    scheduledDatetime: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
    pickupLatitude: 23.8,
    pickupLongitude: 90.4,
    vehicleType: 'cng',
    ...overrides,
  } as Trip);

describe('ScheduledTripsService', () => {
  let service: ScheduledTripsService;
  let tripsRepo: { find: jest.Mock; update: jest.Mock };
  let driverMatchingService: { findOptimalDrivers: jest.Mock };

  beforeEach(async () => {
    tripsRepo = { find: jest.fn(), update: jest.fn() };
    driverMatchingService = { findOptimalDrivers: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledTripsService,
        { provide: getRepositoryToken(Trip), useValue: tripsRepo },
        { provide: DriverMatchingService, useValue: driverMatchingService },
      ],
    }).compile();

    service = module.get<ScheduledTripsService>(ScheduledTripsService);
  });

  it('should activate trips scheduled within 15 minutes', async () => {
    const trip = makeTrip();
    tripsRepo.find.mockResolvedValue([trip]);
    tripsRepo.update.mockResolvedValue(undefined);
    driverMatchingService.findOptimalDrivers.mockResolvedValue([]);

    await service.activateScheduledTrips();

    expect(tripsRepo.update).toHaveBeenCalledWith(trip.id, { status: 'searching_driver' });
    expect(driverMatchingService.findOptimalDrivers).toHaveBeenCalledWith(
      { latitude: trip.pickupLatitude, longitude: trip.pickupLongitude },
      trip.vehicleType,
    );
  });

  it('should skip trips without scheduledDatetime', async () => {
    const trip = makeTrip({ scheduledDatetime: null });
    tripsRepo.find.mockResolvedValue([trip]);

    await service.activateScheduledTrips();

    expect(tripsRepo.update).not.toHaveBeenCalled();
  });

  it('should skip trips already past their scheduled time', async () => {
    // Scheduled in the past
    const trip = makeTrip({ scheduledDatetime: new Date(Date.now() - 60 * 1000) });
    tripsRepo.find.mockResolvedValue([trip]);

    await service.activateScheduledTrips();

    // filter: scheduledDatetime > now is false, so trip is excluded
    expect(tripsRepo.update).not.toHaveBeenCalled();
  });

  it('should handle empty scheduled trips list gracefully', async () => {
    tripsRepo.find.mockResolvedValue([]);

    await expect(service.activateScheduledTrips()).resolves.toBeUndefined();
    expect(tripsRepo.update).not.toHaveBeenCalled();
  });

  it('should continue on per-trip activation failure', async () => {
    const trip1 = makeTrip({ id: 'trip-1' });
    const trip2 = makeTrip({ id: 'trip-2', tripNumber: 'TR-002' });
    tripsRepo.find.mockResolvedValue([trip1, trip2]);
    tripsRepo.update
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'));
    driverMatchingService.findOptimalDrivers.mockResolvedValue([]);

    await expect(service.activateScheduledTrips()).resolves.toBeUndefined();
    // First trip activated
    expect(driverMatchingService.findOptimalDrivers).toHaveBeenCalledTimes(1);
  });
});
