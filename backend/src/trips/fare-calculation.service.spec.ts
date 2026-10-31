import { FareCalculationService } from './fare-calculation.service';

describe('FareCalculationService', () => {
  let service: FareCalculationService;

  beforeEach(() => {
    service = new FareCalculationService();
  });

  describe('single trip fare', () => {
    it('should calculate base fare only when distance is within base km', () => {
      const result = service.calculate('cng', 1, 0, 'single');
      // 1 km < 2 km base, so chargeableKm = 0
      expect(result.baseFare).toBe(50);
      expect(result.distanceFare).toBe(0);
      expect(result.platformFee).toBe(Math.round(result.subtotal * 0.15));
    });

    it('should add distance and time fare for longer trips', () => {
      const result = service.calculate('cng', 5, 15, 'single');
      // chargeableKm = 5 - 2 = 3; distanceFare = 3 * 18 = 54; timeFare = 15 * 0.8 = 12
      expect(result.baseFare).toBe(50);
      expect(result.distanceFare).toBe(54);
      expect(result.timeFare).toBe(12);
      expect(result.subtotal).toBe(116);
      expect(result.platformFee).toBe(Math.round(116 * 0.15));
    });

    it('should use default rate for unknown vehicle type', () => {
      const result = service.calculate('unknown_vehicle', 3, 10, 'single');
      // falls back to DEFAULT_RATE (same as cng-ish: baseFare 50, perKm 18, baseKm 2)
      expect(result.baseFare).toBe(50);
      expect(result.subtotal).toBeGreaterThan(0);
    });
  });

  describe('hourly rental', () => {
    it('should calculate hourly rate for car', () => {
      const result = service.calculate('car', 0, 0, 'hourly', 2);
      expect(result.baseFare).toBe(400 * 2);
      expect(result.distanceFare).toBe(0);
      expect(result.timeFare).toBe(0);
      expect(result.subtotal).toBe(800);
    });

    it('should default to 1 hour when no duration provided', () => {
      const result = service.calculate('car', 0, 0, 'hourly');
      expect(result.baseFare).toBe(400);
    });
  });

  describe('daily rental', () => {
    it('should calculate daily rate for car_rental', () => {
      const result = service.calculate('car_rental', 0, 0, 'daily', 24);
      expect(result.baseFare).toBe(3200);
      expect(result.subtotal).toBe(3200);
      expect(result.platformFee).toBe(Math.round(3200 * 0.15));
    });
  });

  describe('platformFee', () => {
    it('should always be 15% of subtotal', () => {
      const vehicles = ['cng', 'motorcycle', 'rickshaw', 'van'];
      vehicles.forEach((v) => {
        const result = service.calculate(v, 5, 10, 'single');
        expect(result.platformFee).toBe(Math.round(result.subtotal * 0.15));
      });
    });
  });
});
