import { ConflictException } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { Candidate } from './scoring';
import { Trip } from '../entities/trip.entity';
import { TripOffer } from '../entities/trip-offer.entity';

const settings: Record<string, unknown> = {
  'matching.ride.startRadiusKm': 5,
  'matching.rental.startRadiusKm': 10,
  'matching.radiusStepKm': 2,
  'matching.maxRadiusKm': 9,
  'matching.ride.maxSearchSeconds': 180,
  'matching.missesPerWave': 2,
  'matching.weights.proximity': 0.6,
  'matching.weights.fairness': 0.3,
  'matching.weights.idle': 0.1,
  'matching.minRating': 3.5,
  'matching.minRatingCount': 20,
  'matching.locationMaxAgeMinutes': 5,
  'matching.requireVerifiedVehicle': false,
  'matching.dayResetHour': 4,
  'matching.ride.offerTimeoutSeconds': 15,
  'matching.rental.offerTimeoutSeconds': 60,
  'matching.declineStreakLimit': 2,
  'matching.declinePauseMinutes': 10,
  'matching.employeePriority': true,
};

const candidate = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  driverId: id,
  userProfileId: `p-${id}`,
  vehicleId: `v-${id}`,
  distanceKm: 1,
  tripsToday: 0,
  lastTripEndedAt: null,
  rating: 4.5,
  ratingCount: 50,
  ...over,
});

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    tripNumber: 'T-1',
    passengerId: 'pass-1',
    serviceType: 'ride',
    status: 'searching_driver',
    vehicleType: 'motorcycle',
    pickupLatitude: 23.8,
    pickupLongitude: 90.4,
    dropoffLatitude: 23.9,
    dropoffLongitude: 90.4,
    totalFare: 162,
    subtotal: 162,
    dispatchStartedAt: new Date(),
    dispatchWave: 1,
    dispatchRadiusKm: 5,
    isEmployeeBooking: false,
    passenger: { id: 'pass-1', firstName: 'Rahim', isEmployee: false },
    ...over,
  }) as Trip;

describe('DispatchService', () => {
  let tripsRepo: Record<string, jest.Mock>;
  let offersRepo: Record<string, jest.Mock>;
  let driversRepo: Record<string, jest.Mock>;
  let queue: { add: jest.Mock; getJob: jest.Mock };
  let redis: Record<string, jest.Mock>;
  let candidates: { find: jest.Mock };
  let realtime: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let service: DispatchService;
  let previousOffers: Partial<TripOffer>[];

  beforeEach(() => {
    previousOffers = [];
    tripsRepo = { findOne: jest.fn().mockResolvedValue(trip()), update: jest.fn(), exist: jest.fn() };
    offersRepo = {
      exist: jest.fn().mockResolvedValue(false),
      find: jest.fn(async () => previousOffers),
      findOne: jest.fn(),
      create: jest.fn((o) => o),
      save: jest.fn(async (o) => ({ ...o, id: 'offer-1' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    driversRepo = { findOne: jest.fn().mockResolvedValue({ id: 'd1', userProfileId: 'p-d1' }) };
    queue = { add: jest.fn(), getJob: jest.fn().mockResolvedValue(null) };
    const store = new Map<string, number>();
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      incr: jest.fn(async (k: string) => {
        store.set(k, (store.get(k) ?? 0) + 1);
        return store.get(k);
      }),
      expire: jest.fn(),
    };
    candidates = { find: jest.fn().mockResolvedValue([]) };
    realtime = {
      notifyTripOffer: jest.fn(),
      notifyOfferClosed: jest.fn(),
      notifyDriverPaused: jest.fn(),
      notifyTripStatusUpdated: jest.fn(),
      notifyOps: jest.fn(),
      notifyUser: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };

    service = new DispatchService(
      tripsRepo as any,
      offersRepo as any,
      driversRepo as any,
      { findOne: jest.fn() } as any,
      queue as any,
      redis as any,
      dataSource as any,
      candidates as any,
      { get: jest.fn(async (k: string) => settings[k]), getMany: jest.fn(async (ks: string[]) => Object.fromEntries(ks.map((k) => [k, settings[k]]))) } as any,
      { badgeForDriver: jest.fn().mockResolvedValue(null) } as any,
      realtime as any,
      { emit: jest.fn() } as any,
    );
  });

  it('offers the trip to the single best driver and schedules the timeout', async () => {
    candidates.find.mockResolvedValue([
      candidate('busy', { distanceKm: 1, tripsToday: 6 }),
      candidate('quiet', { distanceKm: 1.2, tripsToday: 0 }),
    ]);

    await service.next('trip-1');

    expect(offersRepo.save).toHaveBeenCalledTimes(1);
    expect(offersRepo.save.mock.calls[0][0]).toMatchObject({ driverId: 'quiet', wave: 1, outcome: 'pending' });
    expect(realtime.notifyTripOffer).toHaveBeenCalledWith('p-quiet', expect.objectContaining({ offerId: 'offer-1' }));
    expect(queue.add).toHaveBeenCalledWith({ kind: 'timeout', offerId: 'offer-1' }, expect.objectContaining({ delay: 15_000 }));
  });

  it('never offers twice at once', async () => {
    offersRepo.exist.mockResolvedValue(true);
    await service.next('trip-1');
    expect(candidates.find).not.toHaveBeenCalled();
  });

  it('does not offer again to drivers who already saw the trip', async () => {
    previousOffers = [{ driverId: 'd-old', wave: 1, outcome: 'declined' }];
    candidates.find.mockResolvedValue([candidate('d-new')]);
    await service.next('trip-1');
    expect(candidates.find.mock.calls[0][0].excludeDriverIds).toEqual(['d-old']);
  });

  it('widens the radius after enough misses in a wave', async () => {
    previousOffers = [
      { driverId: 'a', wave: 1, outcome: 'declined' },
      { driverId: 'b', wave: 1, outcome: 'timeout' },
    ];
    candidates.find.mockResolvedValue([candidate('c')]);

    await service.next('trip-1');

    expect(candidates.find.mock.calls[0][0].radiusKm).toBe(7);
    expect(tripsRepo.update).toHaveBeenCalledWith('trip-1', { dispatchWave: 2, dispatchRadiusKm: 7 });
  });

  it('keeps widening up to the max radius when nobody is in range, then retries later', async () => {
    await service.next('trip-1');
    expect(candidates.find.mock.calls.map((c) => c[0].radiusKm)).toEqual([5, 7, 9]);
    expect(queue.add).toHaveBeenCalledWith({ kind: 'next', tripId: 'trip-1' }, expect.objectContaining({ delay: 15_000 }));
  });

  it('skips paused drivers and drivers below the rating bar', async () => {
    candidates.find.mockResolvedValue([
      candidate('paused'),
      candidate('low', { rating: 2, ratingCount: 40 }),
      candidate('ok', { distanceKm: 4 }),
    ]);
    redis.exists.mockImplementation(async (k: string) => (k.endsWith('paused') ? 1 : 0));

    await service.next('trip-1');

    expect(offersRepo.save.mock.calls[0][0].driverId).toBe('ok');
  });

  it('gives up on a ride after the max search time', async () => {
    tripsRepo.findOne.mockResolvedValue(trip({ dispatchStartedAt: new Date(Date.now() - 200_000) }));
    await service.next('trip-1');
    expect(tripsRepo.update).toHaveBeenCalledWith('trip-1', { status: 'no_driver_found' });
    expect(realtime.notifyOps).toHaveBeenCalledWith('dispatch.no_driver_found', expect.anything());
  });

  it('starts employee bookings one step wider and with queue priority', async () => {
    await service.start(trip({ isEmployeeBooking: true }));
    expect(tripsRepo.update).toHaveBeenCalledWith('trip-1', expect.objectContaining({ dispatchRadiusKm: 7 }));
    expect(queue.add).toHaveBeenCalledWith({ kind: 'next', tripId: 'trip-1' }, expect.objectContaining({ priority: 1 }));
  });

  it('rejects a response when the driver has no pending offer', async () => {
    offersRepo.findOne.mockResolvedValue(null);
    await expect(service.respond('trip-1', 'd1', true)).rejects.toBeInstanceOf(ConflictException);
  });

  it('loses the race cleanly: an offer that is no longer pending cannot be accepted', async () => {
    offersRepo.findOne.mockResolvedValue({ id: 'offer-1', tripId: 'trip-1', driverId: 'd1', outcome: 'pending' });
    const qb = (row: unknown) => ({ setLock: () => ({ where: () => ({ getOne: async () => row }) }) });
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: { name: string }) =>
          ({
            createQueryBuilder: () =>
              entity.name === 'Trip'
                ? qb(trip())
                : qb({ id: 'offer-1', outcome: 'timeout', expiresAt: new Date(Date.now() + 5000) }),
          }) as any,
      }),
    );

    await expect(service.respond('trip-1', 'd1', true)).rejects.toBeInstanceOf(ConflictException);
  });

  it('moves on after a decline and pauses a driver who keeps declining', async () => {
    offersRepo.findOne.mockResolvedValue({ id: 'offer-1', tripId: 'trip-1', driverId: 'd1', outcome: 'pending' });

    await service.respond('trip-1', 'd1', false);
    expect(queue.add).toHaveBeenCalledWith({ kind: 'next', tripId: 'trip-1' }, expect.anything());
    expect(realtime.notifyDriverPaused).not.toHaveBeenCalled();

    await service.respond('trip-1', 'd1', false);
    expect(redis.set).toHaveBeenCalledWith('dispatch:pause:d1', '1', 'EX', 600);
    expect(realtime.notifyDriverPaused).toHaveBeenCalledWith('p-d1', expect.objectContaining({ reason: 'declined_in_a_row' }));
  });

  it('treats an unanswered offer as a miss and moves on', async () => {
    offersRepo.findOne.mockResolvedValue({ id: 'offer-1', tripId: 'trip-1', driverId: 'd1', outcome: 'pending' });
    await service.handleTimeout('offer-1');
    expect(offersRepo.update).toHaveBeenCalledWith({ id: 'offer-1', outcome: 'pending' }, expect.objectContaining({ outcome: 'timeout' }));
    expect(realtime.notifyOfferClosed).toHaveBeenCalledWith('p-d1', expect.objectContaining({ reason: 'timeout' }));
    expect(queue.add).toHaveBeenCalledWith({ kind: 'next', tripId: 'trip-1' }, expect.anything());
  });
});
