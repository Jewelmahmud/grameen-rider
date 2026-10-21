import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Driver } from './driver.entity';

@Entity('driver_availability_history')
export class DriverAvailabilityHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'driver_id' })
  @Index()
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'boolean', name: 'is_online' })
  isOnline: boolean;

  @Column({ type: 'boolean', name: 'is_available' })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @Index()
  longitude: number;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'vehicle_type' })
  vehicleType: string;

  @CreateDateColumn({ name: 'recorded_at' })
  @Index()
  recordedAt: Date;
}

