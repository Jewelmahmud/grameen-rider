import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Trip } from './trip.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_profile_id' })
  @Index()
  userProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_profile_id' })
  userProfile: UserProfile;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'notification_type',
  })
  @Index()
  notificationType: 'trip_confirmed' | 'trip_cancelled' | 'driver_assigned' | 'driver_arriving' | 'driver_arrived' | 'trip_started' | 'trip_completed' | 'payment_received' | 'payment_failed' | 'promotion' | 'system' | 'support_response';

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'uuid', nullable: true, name: 'trip_id' })
  @Index()
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  @Index()
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date;

  @Column({ type: 'boolean', default: false, name: 'fcm_sent' })
  fcmSent: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'fcm_sent_at' })
  fcmSentAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'fcm_message_id' })
  fcmMessageId: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}

