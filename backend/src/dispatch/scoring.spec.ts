import { Candidate, passesRatingFilter, scoreCandidates } from './scoring';

const now = new Date('2026-11-16T10:00:00Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const weights = { proximity: 0.6, fairness: 0.3, idle: 0.1 };

const driver = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  driverId: id,
  userProfileId: `p-${id}`,
  vehicleId: `v-${id}`,
  distanceKm: 1,
  tripsToday: 0,
  lastTripEndedAt: minutesAgo(30),
  rating: 4.5,
  ratingCount: 50,
  ...over,
});

describe('scoreCandidates', () => {
  it('prefers the closer driver when work is equal', () => {
    const ranked = scoreCandidates([driver('far', { distanceKm: 4 }), driver('near', { distanceKm: 1 })], 5, weights, now);
    expect(ranked.map((c) => c.driverId)).toEqual(['near', 'far']);
  });

  it('lets a driver with fewer trips today beat a slightly closer busy driver', () => {
    const ranked = scoreCandidates(
      [driver('busy', { distanceKm: 1, tripsToday: 8 }), driver('quiet', { distanceKm: 1.5, tripsToday: 0 })],
      5,
      weights,
      now,
    );
    expect(ranked[0].driverId).toBe('quiet');
  });

  it('still sends a much closer busy driver ahead of a far quiet one (proximity weighs most)', () => {
    const ranked = scoreCandidates(
      [driver('busy-near', { distanceKm: 0.2, tripsToday: 4 }), driver('quiet-far', { distanceKm: 4.8, tripsToday: 0 })],
      5,
      weights,
      now,
    );
    expect(ranked[0].driverId).toBe('busy-near');
  });

  it('ignores rating and lifetime experience in the score', () => {
    const ranked = scoreCandidates(
      [driver('veteran', { rating: 5, ratingCount: 900 }), driver('newcomer', { rating: 0, ratingCount: 0 })],
      5,
      weights,
      now,
    );
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  it('counts a driver who has never finished a trip as fully idle', () => {
    const [c] = scoreCandidates([driver('fresh', { lastTripEndedAt: null })], 5, weights, now);
    expect(c.parts.idle).toBe(1);
  });

  it('gives full fairness to everyone when nobody has trips today', () => {
    const ranked = scoreCandidates([driver('a'), driver('b')], 5, weights, now);
    expect(ranked.every((c) => c.parts.fairness === 1)).toBe(true);
  });

  it('honours admin-tuned weights', () => {
    const ranked = scoreCandidates(
      [driver('near-busy', { distanceKm: 0.5, tripsToday: 6 }), driver('far-quiet', { distanceKm: 3, tripsToday: 0 })],
      5,
      { proximity: 0.2, fairness: 0.8, idle: 0 },
      now,
    );
    expect(ranked[0].driverId).toBe('far-quiet');
  });
});

describe('passesRatingFilter', () => {
  it('filters low-rated drivers only once they have enough ratings', () => {
    expect(passesRatingFilter({ rating: 2.9, ratingCount: 50 }, 3.5, 20)).toBe(false);
    expect(passesRatingFilter({ rating: 2.9, ratingCount: 5 }, 3.5, 20)).toBe(true);
    expect(passesRatingFilter({ rating: 4.1, ratingCount: 50 }, 3.5, 20)).toBe(true);
  });
});
