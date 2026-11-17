import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Zone } from './zone.entity';
import { decimalTransformer } from './fare-rate.entity';

/** Fixed ride fare between two zones for one vehicle type. Beats the km-based rate when it matches. */
@Entity('route_fares')
@Index('ix_route_fares_lookup', ['vehicleType', 'isActive'])
export class RouteFare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'origin_zone_id' })
  originZoneId: string;

  @ManyToOne(() => Zone, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'origin_zone_id' })
  originZone: Zone;

  @Column({ type: 'uuid', name: 'destination_zone_id' })
  destinationZoneId: string;

  @ManyToOne(() => Zone, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'destination_zone_id' })
  destinationZone: Zone;

  @Column({ type: 'varchar', length: 20, name: 'vehicle_type' })
  vehicleType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'fixed_fare', transformer: decimalTransformer })
  fixedFare: number;

  /** Also applies from destination back to origin. */
  @Column({ type: 'boolean', default: true })
  bidirectional: boolean;

  /** Higher wins when several routes match. */
  @Column({ type: 'integer', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  validFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_to' })
  validTo: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
