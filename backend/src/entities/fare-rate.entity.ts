import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ServiceType } from './trip.entity';

const money = { type: 'decimal' as const, precision: 10, scale: 2 };
/** TypeORM returns decimals as strings; convert to numbers on read. */
export const decimalTransformer = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};

/**
 * Km-based rate for one service + vehicle type. Rates are versioned: an edit inserts a new row and
 * marks it current, so trips can point at the exact version they were priced with.
 */
@Entity('fare_rates')
@Unique('uq_fare_rates_version', ['serviceType', 'vehicleType', 'version'])
@Index('ix_fare_rates_current', ['serviceType', 'vehicleType', 'isCurrent'])
export class FareRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, name: 'service_type' })
  serviceType: ServiceType;

  @Column({ type: 'varchar', length: 20, name: 'vehicle_type' })
  vehicleType: string;

  @Column({ type: 'integer' })
  version: number;

  @Column({ ...money, name: 'base_fare', transformer: decimalTransformer })
  baseFare: number;

  /** Km included in the base fare. */
  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'base_km', transformer: decimalTransformer })
  baseKm: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'per_km', transformer: decimalTransformer })
  perKm: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'per_minute', transformer: decimalTransformer })
  perMinute: number;

  @Column({ ...money, name: 'minimum_fare', transformer: decimalTransformer })
  minimumFare: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'waiting_per_minute', transformer: decimalTransformer })
  waitingPerMinute: number;

  /** Charged per passenger above the first. */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'extra_passenger_fare', transformer: decimalTransformer })
  extraPassengerFare: number;

  /** Rentals only: share of the return distance charged on round trips (1 = full price). */
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true, name: 'return_leg_factor', transformer: decimalTransformer })
  returnLegFactor: number | null;

  /** Overrides the global commission when set. */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'commission_pct', transformer: decimalTransformer })
  commissionPct: number | null;

  @Column({ type: 'boolean', default: true, name: 'is_current' })
  isCurrent: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
