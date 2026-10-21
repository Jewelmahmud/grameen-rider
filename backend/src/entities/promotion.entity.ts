import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'discount_type',
  })
  discountType: 'percentage' | 'fixed';

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_value' })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_discount_amount' })
  maxDiscountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, name: 'min_trip_amount' })
  minTripAmount: number;

  @Column({ type: 'timestamp', name: 'valid_from' })
  @Index()
  validFrom: Date;

  @Column({ type: 'timestamp', name: 'valid_until' })
  @Index()
  validUntil: Date;

  @Column({ type: 'integer', nullable: true, name: 'usage_limit' })
  usageLimit: number;

  @Column({ type: 'integer', default: 0, name: 'usage_count' })
  usageCount: number;

  @Column({ type: 'integer', default: 1, name: 'user_usage_limit' })
  userUsageLimit: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @Index()
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'applicable_vehicle_types' })
  applicableVehicleTypes: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'applicable_user_types' })
  applicableUserTypes: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

