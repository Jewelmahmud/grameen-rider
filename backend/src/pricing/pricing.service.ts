import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { UserProfile } from '../entities/user-profile.entity';
import { ServiceType } from '../entities/trip.entity';
import { SettingsService } from '../settings/settings.service';
import { EmployeePerksService } from '../perks/employee-perks.service';
import { FareRatesService } from './fare-rates.service';
import { ZonesService } from './zones.service';
import { applyBestDiscount, computeFare, DiscountedFare, FareBreakdown } from './fare-engine';
import { inDhakaWindow, LatLng, pathKm } from './geo';
import { PlaceDto, QuoteRequestDto } from './dto/quote.dto';

/** Assumed average speed when the app sends no duration (rural roads, mixed traffic). */
const DEFAULT_SPEED_KMH = 20;
const QUOTE_PREFIX = 'quote:';

export interface StoredQuote {
  id: string;
  passengerId: string;
  serviceType: ServiceType;
  vehicleType: string;
  pickup: PlaceDto;
  dropoff: PlaceDto;
  stops: PlaceDto[];
  roundTrip: boolean;
  scheduledAt: string | null;
  passengerCount: number;
  distanceKm: number;
  straightLineKm: number;
  durationMinutes: number;
  fareRateId: string;
  fareRateVersion: number;
  routeFareId: string | null;
  breakdown: FareBreakdown;
  /** Employee discount available on this fare at quote time (re-checked at booking). */
  employeeDiscount: number;
  priced: DiscountedFare;
  createdAt: string;
  expiresAt: string;
}

/** Pure simulation input, for the admin fare simulator (no customer, nothing stored). */
export interface SimulationResult {
  vehicleType: string;
  rate: { id: string; version: number } | null;
  routeFare: { id: string; fixedFare: number } | null;
  breakdown: FareBreakdown | null;
  reason?: string;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly rates: FareRatesService,
    private readonly zones: ZonesService,
    private readonly settings: SettingsService,
    private readonly perks: EmployeePerksService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /** Prices one or every enabled vehicle type and stores each price as a quote for 10 minutes. */
  async quote(dto: QuoteRequestDto, profile: UserProfile) {
    const vehicleTypes = await this.vehicleTypesFor(dto.serviceType, dto.vehicleType);
    const scheduledAt = await this.checkSchedule(dto.serviceType, dto.scheduledAt);
    const ttl = await this.settings.get<number>('pricing.quoteTtlSeconds');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const quotes: StoredQuote[] = [];
    for (const vehicleType of vehicleTypes) {
      const priced = await this.price(dto, vehicleType, scheduledAt ?? now);
      if (!priced.breakdown || !priced.rate) continue;

      const employeeDiscount = await this.perks.discountFor(profile, vehicleType, priced.breakdown.fare, now);
      quotes.push({
        id: randomUUID(),
        passengerId: profile.id,
        serviceType: dto.serviceType,
        vehicleType,
        pickup: dto.pickup,
        dropoff: dto.dropoff,
        stops: dto.serviceType === 'rental' ? dto.stops ?? [] : [],
        roundTrip: dto.serviceType === 'rental' && Boolean(dto.roundTrip),
        scheduledAt: scheduledAt?.toISOString() ?? null,
        passengerCount: dto.passengerCount ?? 1,
        distanceKm: priced.distanceKm,
        straightLineKm: priced.straightLineKm,
        durationMinutes: priced.durationMinutes,
        fareRateId: priced.rate.id,
        fareRateVersion: priced.rate.version,
        routeFareId: priced.routeFare?.id ?? null,
        breakdown: priced.breakdown,
        employeeDiscount,
        priced: applyBestDiscount(priced.breakdown, { employee: employeeDiscount }),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (!quotes.length) {
      throw new BadRequestException({
        code: 'NO_PRICE_AVAILABLE',
        message: 'No price is set for the requested vehicle type(s)',
      });
    }

    try {
      const pipeline = this.redis.multi();
      for (const q of quotes) pipeline.set(QUOTE_PREFIX + q.id, JSON.stringify(q), 'EX', ttl);
      await pipeline.exec();
    } catch {
      throw new ServiceUnavailableException({ code: 'QUOTE_STORE_UNAVAILABLE', message: 'Pricing is unavailable, try again' });
    }

    return {
      serviceType: dto.serviceType,
      currency: 'BDT',
      expiresAt: expiresAt.toISOString(),
      quotes: quotes.map((q) => this.present(q)),
    };
  }

  /** Reads a quote for booking. Only its owner can use it, and only before it expires. */
  async getQuote(quoteId: string, passengerId: string): Promise<StoredQuote> {
    let raw: string | null;
    try {
      raw = await this.redis.get(QUOTE_PREFIX + quoteId);
    } catch {
      throw new ServiceUnavailableException({ code: 'QUOTE_STORE_UNAVAILABLE', message: 'Pricing is unavailable, try again' });
    }
    if (!raw) throw new ConflictException({ code: 'QUOTE_EXPIRED', message: 'This price has expired. Please check the price again.' });
    const quote = JSON.parse(raw) as StoredQuote;
    if (quote.passengerId !== passengerId) throw new ForbiddenException({ code: 'QUOTE_NOT_YOURS', message: 'Quote belongs to another user' });
    if (new Date(quote.expiresAt) <= new Date()) {
      throw new ConflictException({ code: 'QUOTE_EXPIRED', message: 'This price has expired. Please check the price again.' });
    }
    return quote;
  }

  async consumeQuote(quoteId: string): Promise<void> {
    try {
      await this.redis.del(QUOTE_PREFIX + quoteId);
    } catch {
      /* expires on its own */
    }
  }

  /** Admin simulator: which rule applies and the breakdown, without a customer or storage. */
  async simulate(dto: QuoteRequestDto): Promise<SimulationResult[]> {
    const vehicleTypes = dto.vehicleType ? [dto.vehicleType] : await this.vehicleTypesFor(dto.serviceType);
    const at = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
    const results: SimulationResult[] = [];
    for (const vehicleType of vehicleTypes) {
      const p = await this.price(dto, vehicleType, at);
      results.push({
        vehicleType,
        rate: p.rate ? { id: p.rate.id, version: p.rate.version } : null,
        routeFare: p.routeFare ? { id: p.routeFare.id, fixedFare: p.routeFare.fixedFare } : null,
        breakdown: p.breakdown,
        ...(p.rate ? {} : { reason: 'No current rate for this vehicle type' }),
      });
    }
    return results;
  }

  /** Re-validates a schedule at booking time (minutes may have passed since the quote). */
  async checkSchedule(serviceType: ServiceType, scheduledAtIso?: string | null): Promise<Date | null> {
    if (!scheduledAtIso) {
      if (serviceType === 'rental') {
        throw new BadRequestException({ code: 'SCHEDULE_REQUIRED', message: 'Rentals need a start time' });
      }
      return null;
    }
    const at = new Date(scheduledAtIso);
    const [minLead, maxDays] =
      serviceType === 'rental'
        ? await Promise.all([
            this.settings.get<number>('service.rental.minLeadMinutes'),
            this.settings.get<number>('service.rental.maxDaysAhead'),
          ])
        : await Promise.all([
            this.settings.get<number>('service.ride.scheduledMinLeadMinutes'),
            this.settings.get<number>('service.ride.scheduledMaxDaysAhead'),
          ]);
    const now = Date.now();
    if (at.getTime() < now + minLead * 60_000) {
      throw new BadRequestException({
        code: 'SCHEDULE_TOO_SOON',
        message: `Start time must be at least ${minLead} minutes from now`,
      });
    }
    if (at.getTime() > now + maxDays * 86_400_000) {
      throw new BadRequestException({
        code: 'SCHEDULE_TOO_FAR',
        message: `Start time must be within ${maxDays} days`,
      });
    }
    return at;
  }

  private async price(dto: QuoteRequestDto, vehicleType: string, at: Date) {
    const points: LatLng[] = [
      dto.pickup,
      ...(dto.serviceType === 'rental' ? dto.stops ?? [] : []),
      dto.dropoff,
    ];
    const straightLineKm = pathKm(points);
    const roadFactor = await this.settings.get<number>('pricing.roadFactor');
    // The app's road distance is used when given, but never below the straight line.
    const distanceKm = round2(dto.distanceKm != null ? Math.max(dto.distanceKm, straightLineKm) : straightLineKm * roadFactor);
    const durationMinutes = Math.round(dto.durationMinutes ?? (distanceKm / DEFAULT_SPEED_KMH) * 60);

    const rate = await this.rates.current(dto.serviceType, vehicleType);
    if (!rate) return { rate: null, routeFare: null, breakdown: null, distanceKm, straightLineKm, durationMinutes };

    const routeFare =
      dto.serviceType === 'ride' ? await this.zones.findBestRoute(dto.pickup, dto.dropoff, vehicleType, at) : null;

    const [nightMultiplier, nightStart, nightEnd, defaultCommissionPct] = await Promise.all([
      this.settings.get<number>('pricing.night.multiplier'),
      this.settings.get<string>('pricing.night.start'),
      this.settings.get<string>('pricing.night.end'),
      this.settings.get<number>('commission.defaultPct'),
    ]);

    const breakdown = computeFare(rate, {
      serviceType: dto.serviceType,
      distanceKm,
      durationMinutes,
      passengerCount: dto.passengerCount ?? 1,
      roundTrip: dto.serviceType === 'rental' && Boolean(dto.roundTrip),
      isNight: inDhakaWindow(at, nightStart, nightEnd),
      nightMultiplier,
      defaultCommissionPct,
      routeFixedFare: routeFare?.fixedFare ?? null,
    });

    return { rate, routeFare, breakdown, distanceKm, straightLineKm: round2(straightLineKm), durationMinutes };
  }

  private async vehicleTypesFor(serviceType: ServiceType, requested?: string): Promise<string[]> {
    const enabled = await this.settings.get<string[]>(
      serviceType === 'rental' ? 'service.rental.vehicleTypes' : 'service.ride.vehicleTypes',
    );
    if (!requested) return enabled;
    if (!enabled.includes(requested)) {
      throw new BadRequestException({
        code: 'VEHICLE_TYPE_NOT_AVAILABLE',
        message: `${requested} is not available for ${serviceType}`,
      });
    }
    return [requested];
  }

  /** What clients see: the price, the breakdown, and the discount already applied. */
  present(q: StoredQuote) {
    return {
      quoteId: q.id,
      serviceType: q.serviceType,
      vehicleType: q.vehicleType,
      pricingMode: q.breakdown.pricingMode,
      distanceKm: q.distanceKm,
      chargedKm: q.breakdown.chargedKm,
      durationMinutes: q.durationMinutes,
      roundTrip: q.roundTrip,
      scheduledAt: q.scheduledAt,
      fare: q.breakdown.fare,
      breakdown: {
        baseFare: q.breakdown.baseFare,
        distanceFare: q.breakdown.distanceFare,
        timeFare: q.breakdown.timeFare,
        extraPassengerFare: q.breakdown.extraPassengerFare,
        nightSurcharge: q.breakdown.nightSurcharge,
      },
      discount: q.priced.discount,
      discountSource: q.priced.discountSource,
      total: q.priced.total,
      expiresAt: q.expiresAt,
    };
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
