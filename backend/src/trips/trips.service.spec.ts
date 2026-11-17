import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TripsService, TripActor } from './trips.service';
import { Trip } from '../entities/trip.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { StoredQuote } from '../pricing/pricing.service';
import { computeFare } from '../pricing/fare-engine';

const passenger = { id: 'pass-1', isEmployee: false } as UserProfile;
const passengerActor: TripActor = { userProfileId: 'pass-1', driverId: null, isStaff: false };
const driverActor: TripActor = { userProfileId: 'drv-profile-1', driverId: 'driver-1', isStaff: false };

const breakdown = computeFare(
  { baseFare: 40, baseKm: 2, perKm: 14, perMinute: 0.5, minimumFare: 50, extraPassengerFare: 0, returnLegFactor: null, commissionPct: null },
  { serviceType: 'ride', distanceKm: 10, durationMinutes: 20, passengerCount: 1, roundTrip: false, isNight: false, nightMultiplier: 1, defaultCommissionPct: 15 },
); // fare 162, gross commission 24, driver earning 138

const quote = (over: Partial<StoredQuote> = {}): StoredQuote =>
  ({
    id: 'q-1',
    passengerId: 'pass-1',
    serviceType: 'ride',
    vehicleType: 'motorcycle',
    pickup: { address: 'A', latitude: 23.8, longitude: 90.4 },
    dropoff: { address: 'B', latitude: 23.9, longitude: 90.4 },
    stops: [],
    roundTrip: false,
    scheduledAt: null,
    passengerCount: 1,
    distanceKm: 10,
    straightLineKm: 8,
    durationMinutes: 20,
    fareRateId: 'rate-1',
    fareRateVersion: 3,
    routeFareId: null,
    breakdown,
    employeeDiscount: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    ...over,
  }) as StoredQuote;

const makeTrip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    tripNumber: 'TRIP-1',
    passengerId: 'pass-1',
    driverId: 'driver-1',
    serviceType: 'ride',
    status: 'accepted',
    subtotal: 162,
    totalFare: 162,
    fareSnapshot: { breakdown },
    driver: { userProfileId: 'drv-profile-1' },
    ...over,
  }) as Trip;

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepo: Record<string, jest.Mock>;
  let driverRepo: Record<string, jest.Mock>;
  let earningRepo: Record<string, jest.Mock>;
  let pricing: Record<string, jest.Mock>;
  let perks: Record<string, jest.Mock>;
  let promotions: Record<string, jest.Mock>;
  let dispatch: Record<string, jest.Mock>;
  let settings: { get: jest.Mock };
  let saved: Partial<Trip>;

  beforeEach(() => {
    saved = {};
    tripsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(async (t) => t),
      exist: jest.fn().mockResolvedValue(false),
    };
    driverRepo = { increment: jest.fn(), update: jest.fn() };
    earningRepo = { create: jest.fn((e) => e), save: jest.fn(async (e) => e) };
    pricing = {
      getQuote: jest.fn().mockResolvedValue(quote()),
      checkSchedule: jest.fn().mockResolvedValue(null),
      consumeQuote: jest.fn(),
    };
    perks = {
      discountFor: jest.fn().mockResolvedValue(0),
      isActiveFor: jest.fn().mockResolvedValue(false),
      audienceContext: jest.fn().mockResolvedValue({ isEmployee: false, completedTrips: 0 }),
    };
    promotions = {
      validatePromoCode: jest.fn().mockResolvedValue({ promotion: { id: 'promo-1' }, discountAmount: 30 }),
      applyPromoCode: jest.fn(),
    };
    dispatch = { start: jest.fn(), next: jest.fn(), closeOffers: jest.fn() };
    settings = { get: jest.fn().mockResolvedValue(['cash']) };
    const dataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          create: jest.fn((_e, data) => data),
          save: jest.fn(async (_e, data) => (saved = { ...data, id: 'trip-new' })),
        }),
      ),
    };

    service = new TripsService(
      tripsRepo as any,
      driverRepo as any,
      earningRepo as any,
      { emit: jest.fn() } as any,
      { notifyTripCreated: jest.fn(), notifyTripStatusUpdated: jest.fn() } as any,
      promotions as any,
      pricing as any,
      perks as any,
      settings as any,
      dispatch as any,
      dataSource as any,
    );
  });

  describe('createTrip', () => {
    it('books at the quoted price and starts dispatch for an immediate ride', async () => {
      const trip = await service.createTrip({ quoteId: 'q-1', paymentMethod: 'cash' }, passenger);

      expect(saved).toMatchObject({
        subtotal: 162,
        totalFare: 162,
        commissionAmount: 24,
        status: 'searching_driver',
        pricingMode: 'distance',
        serviceType: 'ride',
      });
      expect((saved.fareSnapshot as any).fareRateVersion).toBe(3);
      expect(pricing.consumeQuote).toHaveBeenCalledWith('q-1');
      expect(dispatch.start).toHaveBeenCalledWith(trip);
    });

    it('waits for the scheduler when the trip is scheduled', async () => {
      const at = new Date(Date.now() + 3 * 3600_000);
      pricing.getQuote.mockResolvedValue(quote({ serviceType: 'rental', scheduledAt: at.toISOString() }));
      pricing.checkSchedule.mockResolvedValue(at);

      await service.createTrip({ quoteId: 'q-1', paymentMethod: 'cash' }, passenger);

      expect(saved.status).toBe('scheduled');
      expect(dispatch.start).not.toHaveBeenCalled();
    });

    it('applies the larger of promo and employee discount, recording the promo only when it wins', async () => {
      perks.discountFor.mockResolvedValue(16);
      await service.createTrip({ quoteId: 'q-1', paymentMethod: 'cash', promotionCode: 'SAVE30' }, passenger);
      expect(saved).toMatchObject({ discountAmount: 30, totalFare: 132, promotionId: 'promo-1', employeeDiscountAmount: 0 });
      expect(promotions.applyPromoCode).toHaveBeenCalled();

      promotions.applyPromoCode.mockClear();
      perks.discountFor.mockResolvedValue(40);
      await service.createTrip({ quoteId: 'q-1', paymentMethod: 'cash', promotionCode: 'SAVE30' }, passenger);
      expect(saved).toMatchObject({ discountAmount: 40, totalFare: 122, promotionId: null, employeeDiscountAmount: 40 });
      expect(promotions.applyPromoCode).not.toHaveBeenCalled();
    });

    it('keeps the driver earning whole when a discount applies (platform-funded)', async () => {
      perks.discountFor.mockResolvedValue(30);
      await service.createTrip({ quoteId: 'q-1', paymentMethod: 'cash' }, passenger);
      expect((saved.fareSnapshot as any).breakdown).toMatchObject({ driverEarning: 138, platformNet: -6 });
    });

    it('rejects a payment method the admin has not enabled', async () => {
      await expect(service.createTrip({ quoteId: 'q-1', paymentMethod: 'card' }, passenger)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a second immediate ride while one is active', async () => {
      tripsRepo.exist.mockResolvedValue(true);
      await expect(service.createTrip({ quoteId: 'q-1', paymentMethod: 'cash' }, passenger)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('viewing', () => {
    it('hides trips from people who are not part of them', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip());
      await expect(
        service.findForActor('trip-1', { userProfileId: 'stranger', driverId: null, isStaff: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('shows trips to the passenger, the assigned driver and staff', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip());
      await expect(service.findForActor('trip-1', passengerActor)).resolves.toBeDefined();
      await expect(service.findForActor('trip-1', driverActor)).resolves.toBeDefined();
      await expect(
        service.findForActor('trip-1', { userProfileId: 'ops', driverId: null, isStaff: true }),
      ).resolves.toBeDefined();
    });
  });

  describe('lifecycle', () => {
    it('only lets the assigned driver move the trip on', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip());
      await expect(service.arriveAtPickup('trip-1', 'driver-2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('enforces the status order', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'accepted' }));
      await expect(service.startTrip('trip-1', 'driver-1')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.arriveAtPickup('trip-1', 'driver-1')).resolves.toMatchObject({ status: 'driver_arrived' });
    });

    it('pays the driver from the fare snapshot on completion and frees them for rides', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'in_progress', startedAt: new Date(Date.now() - 600_000) }));

      await service.completeTrip('trip-1', 'driver-1');

      expect(earningRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 162, commissionAmount: 24, netEarnings: 138, commissionPercentage: 15 }),
      );
      expect(driverRepo.increment).toHaveBeenCalledWith({ id: 'driver-1' }, 'totalEarnings', 138);
      expect(driverRepo.update).toHaveBeenCalledWith(
        'driver-1',
        expect.objectContaining({ isAvailable: true, lastTripEndedAt: expect.any(Date) }),
      );
    });
  });

  describe('cancelTrip', () => {
    it('cancels as the passenger and closes open offers', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'searching_driver', driverId: null }));
      const trip = await service.cancelTrip('trip-1', passengerActor, 'changed plans');
      expect(trip).toMatchObject({ status: 'cancelled', cancelledBy: 'passenger', cancellationReason: 'changed plans' });
      expect(dispatch.closeOffers).toHaveBeenCalledWith('trip-1', 'trip_cancelled');
    });

    it('sends the trip back to dispatch when the driver gives it up', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'accepted' }));
      const trip = await service.cancelTrip('trip-1', driverActor);
      expect(trip).toMatchObject({ status: 'searching_driver', driverId: null });
      expect(driverRepo.update).toHaveBeenCalledWith('driver-1', { isAvailable: true });
      expect(dispatch.next).toHaveBeenCalledWith('trip-1');
    });

    it('refuses strangers', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip());
      await expect(
        service.cancelTrip('trip-1', { userProfileId: 'stranger', driverId: null, isStaff: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cannot cancel a trip in progress', async () => {
      tripsRepo.findOne.mockResolvedValue(makeTrip({ status: 'in_progress' }));
      await expect(service.cancelTrip('trip-1', passengerActor)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
