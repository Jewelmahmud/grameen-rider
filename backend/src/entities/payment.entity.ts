import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Trip } from './trip.entity';
import { UserProfile } from './user-profile.entity';
import { Driver } from './driver.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'trip_id' })
  @Index()
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'uuid', name: 'passenger_profile_id' })
  @Index()
  passengerProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'passenger_profile_id' })
  passengerProfile: UserProfile;

  @Column({ type: 'uuid', nullable: true, name: 'driver_id' })
  @Index()
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'BDT' })
  currency: string;

  @Column({ type: 'varchar', length: 20, name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_provider' })
  paymentProvider: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true, name: 'transaction_id' })
  @Index()
  transactionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_transaction_id' })
  externalTransactionId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    name: 'payment_status',
  })
  @Index()
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  @Column({ type: 'timestamp', nullable: true, name: 'payment_date' })
  @Index()
  paymentDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, name: 'refund_amount' })
  refundAmount: number;

  @Column({ type: 'text', nullable: true, name: 'refund_reason' })
  refundReason: string;

  @Column({ type: 'timestamp', nullable: true, name: 'refunded_at' })
  refundedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

