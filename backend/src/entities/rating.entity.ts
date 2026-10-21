import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Trip } from './trip.entity';
import { UserProfile } from './user-profile.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'trip_id' })
  @Index()
  tripId: string;

  @ManyToOne(() => Trip, (trip) => trip.ratings)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'uuid', name: 'rater_profile_id' })
  raterProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'rater_profile_id' })
  raterProfile: UserProfile;

  @Column({ type: 'uuid', name: 'rated_profile_id' })
  @Index()
  ratedProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'rated_profile_id' })
  ratedProfile: UserProfile;

  @Column({ type: 'integer' })
  @Index()
  rating: number;

  @Column({ type: 'text', nullable: true })
  review: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

