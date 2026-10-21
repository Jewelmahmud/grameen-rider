import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Driver } from './driver.entity';
import { Trip } from './trip.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'driver_id' })
  @Index()
  driverId: string;

  @ManyToOne(() => Driver, (driver) => driver.vehicles)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'vehicle_type',
  })
  @Index()
  vehicleType: 'van' | 'rickshaw' | 'cng' | 'motorcycle' | 'auto' | 'pickup_van' | 'car' | 'car_rental' | 'boat_rental';

  @Column({ type: 'varchar', length: 100, nullable: true })
  make: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'integer', nullable: true })
  year: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @Column({ type: 'varchar', length: 20, unique: true, name: 'license_plate' })
  licensePlate: string;

  @Column({ type: 'integer', name: 'seating_capacity' })
  seatingCapacity: number;

  @Column({ type: 'text', nullable: true, name: 'vehicle_image_url' })
  vehicleImageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  documents: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @Index()
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  @Index()
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Trip, (trip) => trip.vehicle)
  trips: Trip[];
}

