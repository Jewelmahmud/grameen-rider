import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { TripOffer } from '../entities/trip-offer.entity';
import { Driver } from '../entities/driver.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { CandidatesService } from './candidates.service';
import { DispatchService, DISPATCH_QUEUE } from './dispatch.service';
import { DispatchProcessor } from './dispatch.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripOffer, Driver, UserProfile]),
    BullModule.registerQueue({ name: DISPATCH_QUEUE }),
    RealtimeModule,
  ],
  providers: [CandidatesService, DispatchService, DispatchProcessor],
  exports: [DispatchService],
})
export class DispatchModule {}
