/**
 * Fair-share ranking (docs/WEB_PLATFORM_PLAN.md §4.3, ADR-004).
 *
 *   score = wProximity · (1 − distance / radius)
 *         + wFairness  · (1 − tripsToday / most trips today among the candidates)
 *         + wIdle      · min(idle minutes / 60, 1)
 *
 * Rating and lifetime trips are deliberately not in the score: they would keep favouring the same
 * drivers. Rating is a filter only (see passesRatingFilter).
 */
export interface Candidate {
  driverId: string;
  userProfileId: string;
  vehicleId: string;
  distanceKm: number;
  tripsToday: number;
  lastTripEndedAt: Date | null;
  rating: number;
  ratingCount: number;
}

export interface Weights {
  proximity: number;
  fairness: number;
  idle: number;
}

export interface ScoredCandidate extends Candidate {
  score: number;
  parts: { proximity: number; fairness: number; idle: number };
}

export function scoreCandidates(
  candidates: Candidate[],
  radiusKm: number,
  weights: Weights,
  now: Date = new Date(),
): ScoredCandidate[] {
  const maxTrips = Math.max(0, ...candidates.map((c) => c.tripsToday));

  return candidates
    .map((c) => {
      const proximity = radiusKm > 0 ? clamp01(1 - c.distanceKm / radiusKm) : 0;
      const fairness = maxTrips > 0 ? clamp01(1 - c.tripsToday / maxTrips) : 1;
      // A driver with no finished trip yet counts as fully idle.
      const idle = c.lastTripEndedAt
        ? clamp01((now.getTime() - c.lastTripEndedAt.getTime()) / 3_600_000)
        : 1;
      const score = weights.proximity * proximity + weights.fairness * fairness + weights.idle * idle;
      return { ...c, score: round4(score), parts: { proximity: round4(proximity), fairness: round4(fairness), idle: round4(idle) } };
    })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
}

/** New drivers (fewer than `minCount` ratings) are never filtered out by rating. */
export function passesRatingFilter(c: Pick<Candidate, 'rating' | 'ratingCount'>, minRating: number, minCount: number) {
  return c.ratingCount < minCount || c.rating >= minRating;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round4 = (n: number) => Math.round(n * 10000) / 10000;
