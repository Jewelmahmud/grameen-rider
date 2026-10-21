import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { DriverMatchingService } from './driver-matching.service';
import { DriversModule } from '../drivers/drivers.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Driver]), DriversModule, RealtimeModule],
  providers: [TripsService, DriverMatchingService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}

