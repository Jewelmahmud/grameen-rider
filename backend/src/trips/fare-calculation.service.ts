import { Injectable } from '@nestjs/common';

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  subtotal: number;
  platformFee: number;
  totalFare: number;
}

type VehicleRate = { baseKm: number; baseFare: number; perKm: number; perMinute: number; hourlyRate?: number; dailyRate?: number };

// BDT rates per vehicle type
const RATES: Record<string, VehicleRate> = {
  rickshaw:    { baseKm: 2,  baseFare: 30,  perKm: 12,  perMinute: 0.5 },
  cng:         { baseKm: 2,  baseFare: 50,  perKm: 18,  perMinute: 0.8 },
  motorcycle:  { baseKm: 2,  baseFare: 40,  perKm: 14,  perMinute: 0.5 },
  auto:        { baseKm: 2,  baseFare: 45,  perKm: 15,  perMinute: 0.6 },
  van:         { baseKm: 2,  baseFare: 80,  perKm: 22,  perMinute: 1.0 },
  pickup_van:  { baseKm: 3,  baseFare: 120, perKm: 28,  perMinute: 1.2 },
  car:         { baseKm: 2,  baseFare: 100, perKm: 25,  perMinute: 1.0, hourlyRate: 400,  dailyRate: 2800 },
  car_rental:  { baseKm: 0,  baseFare: 0,   perKm: 0,   perMinute: 0,   hourlyRate: 500,  dailyRate: 3200 },
  boat_rental: { baseKm: 0,  baseFare: 0,   perKm: 0,   perMinute: 0,   hourlyRate: 600,  dailyRate: 4000 },
};

const PLATFORM_FEE_RATE = 0.15; // 15%
const DEFAULT_RATE: VehicleRate = { baseKm: 2, baseFare: 50, perKm: 18, perMinute: 0.8 };

@Injectable()
export class FareCalculationService {
  calculate(
    vehicleType: string,
    distanceKm: number,
    durationMinutes: number,
    rentalType: 'single' | 'hourly' | 'daily' | 'custom',
    rentalDurationHours?: number,
  ): FareBreakdown {
    const rate = RATES[vehicleType] ?? DEFAULT_RATE;

    let baseFare: number;
    let distanceFare: number;
    let timeFare: number;

    if (rentalType === 'hourly' && rate.hourlyRate) {
      const hours = rentalDurationHours ?? 1;
      baseFare = rate.hourlyRate * hours;
      distanceFare = 0;
      timeFare = 0;
    } else if (rentalType === 'daily' && rate.dailyRate) {
      const days = rentalDurationHours ? Math.ceil(rentalDurationHours / 24) : 1;
      baseFare = rate.dailyRate * days;
      distanceFare = 0;
      timeFare = 0;
    } else {
      // single / custom — meter-based
      const chargeableKm = Math.max(0, distanceKm - rate.baseKm);
      baseFare = rate.baseFare;
      distanceFare = Math.round(chargeableKm * rate.perKm);
      timeFare = Math.round(durationMinutes * rate.perMinute);
    }

    const subtotal = Math.round(baseFare + distanceFare + timeFare);
    const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
    const totalFare = subtotal; // passenger always pays subtotal; driver gets (subtotal - platformFee)

    return { baseFare, distanceFare, timeFare, subtotal, platformFee, totalFare };
  }

  getRates(): typeof RATES {
    return RATES;
  }
}
