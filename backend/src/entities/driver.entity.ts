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
import { Vehicle } from './vehicle.entity';
import { TripTracking } from './trip-tracking.entity';
import { DriverEarning } from './driver-earning.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, name: 'user_profile_id' })
  @Index()
  userProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_profile_id' })
  userProfile: UserProfile;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'license_number' })
  licenseNumber: string;

  @Column({ type: 'date', nullable: true, name: 'license_expiry_date' })
  licenseExpiryDate: Date;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    name: 'vehicle_registration_number',
  })
  vehicleRegistrationNumber: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  rating: number;

  @Column({ type: 'integer', default: 0, name: 'total_rides' })
  totalRides: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, name: 'total_earnings' })
  totalEarnings: number;

  @Column({ type: 'boolean', default: false, name: 'is_online' })
  @Index()
  isOnline: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_available' })
  @Index()
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'current_latitude' })
  currentLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'current_longitude' })
  currentLongitude: number;

  @Column({ type: 'timestamp', nullable: true, name: 'current_location_updated_at' })
  currentLocationUpdatedAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    name: 'verification_status',
  })
  @Index()
  verificationStatus: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bank_account_number' })
  bankAccountNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'bank_name' })
  bankName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'account_holder_name' })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'ifsc_code' })
  ifscCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles: Vehicle[];

  @OneToMany(() => TripTracking, (tracking) => tracking.driver)
  tripTrackings: TripTracking[];

  @OneToMany(() => DriverEarning, (earning) => earning.driver)
  earnings: DriverEarning[];
}

