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
import { UserProfile } from './user-profile.entity';
import { Driver } from './driver.entity';
import { Vehicle } from './vehicle.entity';
import { TripTracking } from './trip-tracking.entity';
import { Payment } from './payment.entity';
import { Rating } from './rating.entity';
import { Notification } from './notification.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'trip_number' })
  @Index()
  tripNumber: string;

  @Column({ type: 'uuid', name: 'passenger_id' })
  @Index()
  passengerId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'passenger_id' })
  passenger: UserProfile;

  @Column({ type: 'uuid', nullable: true, name: 'driver_id' })
  @Index()
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true, name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ type: 'varchar', length: 20, name: 'vehicle_type' })
  vehicleType: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'rental_type',
  })
  rentalType: 'single' | 'hourly' | 'daily' | 'custom';

  @Column({ type: 'text', name: 'pickup_address' })
  pickupAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'pickup_latitude' })
  @Index()
  pickupLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'pickup_longitude' })
  @Index()
  pickupLongitude: number;

  @Column({ type: 'text', name: 'dropoff_address' })
  dropoffAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'dropoff_latitude' })
  @Index()
  dropoffLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'dropoff_longitude' })
  @Index()
  dropoffLongitude: number;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_datetime' })
  @Index()
  scheduledDatetime: Date;

  @Column({ type: 'integer', default: 1, name: 'passenger_count' })
  passengerCount: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'distance_km' })
  distanceKm: number;

  @Column({ type: 'integer', nullable: true, name: 'estimated_duration_minutes' })
  estimatedDurationMinutes: number;

  @Column({ type: 'integer', nullable: true, name: 'actual_duration_minutes' })
  actualDurationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_fare' })
  baseFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'distance_fare' })
  distanceFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'time_fare' })
  timeFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, name: 'extra_passenger_fare' })
  extraPassengerFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'uuid', nullable: true, name: 'promotion_id' })
  promotionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_fare' })
  totalFare: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    name: 'payment_status',
  })
  @Index()
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'payment_method',
  })
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'bank_transfer';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'searching_driver' | 'accepted' | 'driver_assigned' | 'driver_arriving' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

  @CreateDateColumn({ name: 'requested_at' })
  @Index()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'driver_arrived_at' })
  driverArrivedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'cancelled_by',
  })
  cancelledBy: 'passenger' | 'driver' | 'system';

  @Column({ type: 'integer', nullable: true, name: 'passenger_rating' })
  passengerRating: number;

  @Column({ type: 'integer', nullable: true, name: 'driver_rating' })
  driverRating: number;

  @Column({ type: 'text', nullable: true, name: 'passenger_review' })
  passengerReview: string;

  @Column({ type: 'text', nullable: true, name: 'driver_review' })
  driverReview: string;

  @Column({ type: 'text', nullable: true, name: 'special_instructions' })
  specialInstructions: string;

  @Column({ type: 'text', nullable: true, name: 'custom_rental_details' })
  customRentalDetails: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TripTracking, (tracking) => tracking.trip)
  trackings: TripTracking[];

  @OneToMany(() => Payment, (payment) => payment.trip)
  payments: Payment[];

  @OneToMany(() => Rating, (rating) => rating.trip)
  ratings: Rating[];

  @OneToMany(() => Notification, (notification) => notification.trip)
  notifications: Notification[];
}

