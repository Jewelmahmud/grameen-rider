import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { DriverTripsController } from './driver-trips.controller';
import { DriverActorService } from './driver-actor.service';
import { ScheduledTripsService } from './scheduled-trips.service';
import { FareCalculationService } from './fare-calculation.service';
import { DriversModule } from '../drivers/drivers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { PricingModule } from '../pricing/pricing.module';
import { DispatchModule } from '../dispatch/dispatch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Driver, DriverEarning]),
    DriversModule,
    RealtimeModule,
    PromotionsModule,
    PricingModule,
    DispatchModule,
  ],
  providers: [TripsService, DriverActorService, ScheduledTripsService, FareCalculationService],
  controllers: [TripsController, DriverTripsController],
  exports: [TripsService, DriverActorService, FareCalculationService],
})
export class TripsModule {}
