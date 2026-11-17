import { ScheduledTripsService } from './scheduled-trips.service';
import { Trip } from '../entities/trip.entity';

const now = new Date('2026-11-16T10:00:00Z');
const inMinutes = (m: number) => new Date(now.getTime() + m * 60_000);

const settingsValues: Record<string, unknown> = {
  'service.rental.dispatchLeadMinutes': 60,
  'service.rental.opsAlertMinutes': 30,
  'service.rental.reminderMinutes': [60, 15],
};

describe('ScheduledTripsService', () => {
  let repo: { find: jest.Mock; update: jest.Mock };
  let dispatch: { start: jest.Mock };
  let realtime: Record<string, jest.Mock>;
  let redisKeys: Set<string>;
  let service: ScheduledTripsService;

  beforeEach(() => {
    repo = { find: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    dispatch = { start: jest.fn() };
    realtime = { notifyTripStatusUpdated: jest.fn(), notifyOps: jest.fn(), notifyUser: jest.fn() };
    redisKeys = new Set();
    const redis = {
      set: jest.fn(async (key: string) => (redisKeys.has(key) ? null : (redisKeys.add(key), 'OK'))),
    };
    const settings = { get: jest.fn(async (k: string) => settingsValues[k]) };
    service = new ScheduledTripsService(repo as any, dispatch as any, settings as any, realtime as any, redis as any);
  });

  it('starts rides 15 minutes ahead and rentals 60 minutes ahead', async () => {
    repo.find.mockResolvedValue([
      { id: 'ride-soon', serviceType: 'ride', scheduledDatetime: inMinutes(10) },
      { id: 'ride-later', serviceType: 'ride', scheduledDatetime: inMinutes(40) },
      { id: 'rental-soon', serviceType: 'rental', scheduledDatetime: inMinutes(50) },
    ] as Trip[]);

    const started = await service.activateDue(now);

    expect(started).toBe(2);
    expect(dispatch.start.mock.calls.map((c) => c[0].id)).toEqual(['ride-soon', 'rental-soon']);
  });

  it('does not start a trip another instance already moved on', async () => {
    repo.find.mockResolvedValue([{ id: 'ride-soon', serviceType: 'ride', scheduledDatetime: inMinutes(5) }] as Trip[]);
    repo.update.mockResolvedValue({ affected: 0 });
    expect(await service.activateDue(now)).toBe(0);
    expect(dispatch.start).not.toHaveBeenCalled();
  });

  it('alerts operations once about a rental with no driver close to its start', async () => {
    repo.find.mockResolvedValue([{ id: 'r1', tripNumber: 'T1', scheduledDatetime: inMinutes(25) }] as Trip[]);

    expect(await service.alertUnassignedRentals(now)).toBe(1);
    expect(await service.alertUnassignedRentals(now)).toBe(0);
    expect(realtime.notifyOps).toHaveBeenCalledWith('ops.rental.unassigned', expect.objectContaining({ tripId: 'r1', minutesToStart: 25 }));
  });

  it('sends each rental reminder once, to the passenger and the driver', async () => {
    repo.find.mockResolvedValue([
      { id: 'r1', passengerId: 'p1', scheduledDatetime: inMinutes(12), driver: { userProfileId: 'd1' } },
    ] as Trip[]);

    expect(await service.sendRentalReminders(now)).toBe(1);
    expect(await service.sendRentalReminders(now)).toBe(0);
    expect(realtime.notifyUser).toHaveBeenCalledWith('p1', 'trip.reminder', expect.objectContaining({ minutesToStart: 12 }));
    expect(realtime.notifyUser).toHaveBeenCalledWith('d1', 'trip.reminder', expect.anything());
  });
});
