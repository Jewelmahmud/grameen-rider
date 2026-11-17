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

export type ServiceType = 'ride' | 'rental';

export type TripStatus =
  | 'pending'
  | 'scheduled'
  | 'searching_driver'
  | 'accepted'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_driver_found'
  | 'disputed';

/** Statuses in which a driver is committed to the trip. */
export const DRIVER_COMMITTED_STATUSES: TripStatus[] = [
  'accepted',
  'driver_assigned',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
];

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
  status: TripStatus;

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

  // ─── Service, pricing and dispatch ────────────────────────────────────────

  @Column({ type: 'varchar', length: 10, default: 'ride', name: 'service_type' })
  @Index()
  serviceType: ServiceType;

  /** Which rule priced the trip: a fixed route fare or the km-based rate. */
  @Column({ type: 'varchar', length: 12, nullable: true, name: 'pricing_mode' })
  pricingMode: 'distance' | 'route' | null;

  /** Inputs, rule ids/versions and the full breakdown from the quote the trip was booked with. */
  @Column({ type: 'jsonb', nullable: true, name: 'fare_snapshot' })
  fareSnapshot: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true, name: 'route_fare_id' })
  routeFareId: string | null;

  /** Rental stops between pickup and destination: [{address, latitude, longitude}]. */
  @Column({ type: 'jsonb', nullable: true })
  stops: { address: string; latitude: number; longitude: number }[] | null;

  @Column({ type: 'boolean', default: false, name: 'round_trip' })
  roundTrip: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'commission_amount' })
  commissionAmount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'employee_discount_amount' })
  employeeDiscountAmount: number;

  @Column({ type: 'boolean', default: false, name: 'is_employee_booking' })
  isEmployeeBooking: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'dispatch_started_at' })
  dispatchStartedAt: Date | null;

  @Column({ type: 'integer', default: 0, name: 'dispatch_wave' })
  dispatchWave: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'dispatch_radius_km' })
  dispatchRadiusKm: number | null;

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

