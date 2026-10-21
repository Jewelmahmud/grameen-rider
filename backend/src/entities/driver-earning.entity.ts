import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Driver } from './driver.entity';
import { Trip } from './trip.entity';

@Entity('driver_earnings')
export class DriverEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'driver_id' })
  @Index()
  driverId: string;

  @ManyToOne(() => Driver, (driver) => driver.earnings)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true, name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, name: 'commission_percentage' })
  commissionPercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, name: 'commission_amount' })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'net_earnings' })
  netEarnings: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    name: 'payout_status',
  })
  @Index()
  payoutStatus: 'pending' | 'processing' | 'paid' | 'failed';

  @Column({ type: 'timestamp', nullable: true, name: 'payout_date' })
  @Index()
  payoutDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payment_reference' })
  paymentReference: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'payout_method',
  })
  payoutMethod: 'bank_transfer' | 'mobile_money' | 'cash';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

