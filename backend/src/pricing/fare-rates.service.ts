import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FareRate } from '../entities/fare-rate.entity';
import { ServiceType } from '../entities/trip.entity';
import { RateInput } from './fare-engine';

export type RateFields = Omit<RateInput, never> & { waitingPerMinute: number };

/**
 * Starting rates, written once into fare_rates on first start (version 1). Ride rates are the
 * ones that used to be hard-coded in FareCalculationService. Rental rates are placeholders: the
 * business sets real ones from the admin console.
 */
export const DEFAULT_RATES: Record<ServiceType, Record<string, RateFields>> = {
  ride: {
    rickshaw: rate(30, 2, 12, 0.5, 30),
    motorcycle: rate(40, 2, 14, 0.5, 40),
    auto: rate(45, 2, 15, 0.6, 45),
    van: rate(80, 2, 22, 1.0, 80),
    cng: rate(50, 2, 18, 0.8, 50),
    car: rate(100, 2, 25, 1.0, 100),
    pickup_van: rate(120, 3, 28, 1.2, 120),
  },
  rental: {
    car: { ...rate(300, 10, 25, 0, 300), returnLegFactor: 1 },
    van: { ...rate(250, 10, 22, 0, 250), returnLegFactor: 1 },
    pickup_van: { ...rate(400, 10, 30, 0, 400), returnLegFactor: 1 },
  },
};

function rate(baseFare: number, baseKm: number, perKm: number, perMinute: number, minimumFare: number): RateFields {
  return {
    baseFare,
    baseKm,
    perKm,
    perMinute,
    minimumFare,
    waitingPerMinute: 0,
    extraPassengerFare: 0,
    returnLegFactor: null,
    commissionPct: null,
  };
}

const CACHE_MS = 60_000;

@Injectable()
export class FareRatesService implements OnModuleInit {
  private readonly logger = new Logger(FareRatesService.name);
  private cache: { at: number; rates: FareRate[] } | null = null;

  constructor(
    @InjectRepository(FareRate) private readonly repo: Repository<FareRate>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      if ((await this.repo.count()) > 0) return;
      const rows = (Object.keys(DEFAULT_RATES) as ServiceType[]).flatMap((serviceType) =>
        Object.entries(DEFAULT_RATES[serviceType]).map(([vehicleType, fields]) =>
          this.repo.create({ serviceType, vehicleType, version: 1, isCurrent: true, createdBy: null, ...fields }),
        ),
      );
      await this.repo.save(rows);
      this.logger.log(`Seeded ${rows.length} starting fare rates`);
    } catch (error) {
      this.logger.error('Could not seed fare rates', error instanceof Error ? error.stack : error);
    }
  }

  async current(serviceType: ServiceType, vehicleType: string): Promise<FareRate | null> {
    const rates = await this.allCurrent();
    return rates.find((r) => r.serviceType === serviceType && r.vehicleType === vehicleType) ?? null;
  }

  async listCurrent(serviceType?: ServiceType): Promise<FareRate[]> {
    const rates = await this.allCurrent();
    return serviceType ? rates.filter((r) => r.serviceType === serviceType) : rates;
  }

  history(serviceType: ServiceType, vehicleType: string): Promise<FareRate[]> {
    return this.repo.find({ where: { serviceType, vehicleType }, order: { version: 'DESC' } });
  }

  /** Saves a new version and makes it current. Old versions stay for trips that used them. */
  async save(
    serviceType: ServiceType,
    vehicleType: string,
    fields: RateFields,
    actorAuthUserId: string,
  ): Promise<{ before: FareRate | null; after: FareRate }> {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FareRate);
      const before = await repo
        .createQueryBuilder('r')
        .setLock('pessimistic_write')
        .where('r.service_type = :serviceType AND r.vehicle_type = :vehicleType AND r.is_current = true', {
          serviceType,
          vehicleType,
        })
        .getOne();
      const last = await repo.findOne({ where: { serviceType, vehicleType }, order: { version: 'DESC' } });
      if (before) await repo.update(before.id, { isCurrent: false });
      const after = await repo.save(
        repo.create({
          serviceType,
          vehicleType,
          version: (last?.version ?? 0) + 1,
          isCurrent: true,
          createdBy: actorAuthUserId,
          ...fields,
        }),
      );
      return { before, after };
    });
    this.cache = null;
    return result;
  }

  async findVersion(id: string): Promise<FareRate> {
    const rate = await this.repo.findOne({ where: { id } });
    if (!rate) throw new NotFoundException('Fare rate not found');
    return rate;
  }

  private async allCurrent(): Promise<FareRate[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.rates;
    const rates = await this.repo.find({ where: { isCurrent: true } });
    this.cache = { at: Date.now(), rates };
    return rates;
  }
}
