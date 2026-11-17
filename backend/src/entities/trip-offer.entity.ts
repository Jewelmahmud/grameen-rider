import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Trip } from './trip.entity';
import { Driver } from './driver.entity';
import { decimalTransformer } from './fare-rate.entity';

export type OfferOutcome = 'pending' | 'accepted' | 'declined' | 'timeout' | 'cancelled';

/** Dispatch log: every time a trip is offered to a driver, and what happened. Feeds fairness reports. */
@Entity('trip_offers')
@Index('ix_trip_offers_trip', ['tripId'])
@Index('ix_trip_offers_driver_time', ['driverId', 'offeredAt'])
export class TripOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'uuid', name: 'driver_id' })
  driverId: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true, name: 'vehicle_id' })
  vehicleId: string | null;

  @Column({ type: 'integer' })
  wave: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, transformer: decimalTransformer })
  score: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'distance_km', transformer: decimalTransformer })
  distanceKm: number;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  outcome: OfferOutcome;

  @Column({ type: 'timestamp', name: 'offered_at' })
  offeredAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;
}
