import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Trip } from './trip.entity';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_profile_id' })
  @Index()
  userProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_profile_id' })
  userProfile: UserProfile;

  @Column({ type: 'uuid', nullable: true, name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  @Index()
  category: 'trip_issue' | 'payment_issue' | 'driver_complaint' | 'passenger_complaint' | 'technical_issue' | 'account_issue' | 'other';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  @Index()
  status: 'open' | 'in_progress' | 'resolved' | 'closed';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'medium',
  })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_to_auth_user_id' })
  assignedToAuthUserId: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

