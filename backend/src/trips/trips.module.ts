import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { DriverMatchingService } from './driver-matching.service';
import { ScheduledTripsService } from './scheduled-trips.service';
import { DriversModule } from '../drivers/drivers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Driver, DriverEarning]),
    DriversModule,
    RealtimeModule,
    PromotionsModule,
  ],
  providers: [TripsService, DriverMatchingService, ScheduledTripsService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}
