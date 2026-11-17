import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../entities/driver.entity';
import { Trip } from '../entities/trip.entity';
import { Promotion } from '../entities/promotion.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { TripOffer } from '../entities/trip-offer.entity';
import { PricingModule } from '../pricing/pricing.module';
import { TripsModule } from '../trips/trips.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AdminService } from './admin.service';
import { AdminPeopleService } from './admin-people.service';
import { AdminTripsService } from './admin-trips.service';
import { ReportsService } from './reports.service';
import { AdminController } from './admin.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminPeopleController } from './admin-people.controller';
import { AdminTripsController } from './admin-trips.controller';
import { AdminReportsController } from './admin-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Trip, Promotion, SupportTicket, UserProfile, Vehicle, TripOffer]),
    PricingModule,
    TripsModule,
    DispatchModule,
    RealtimeModule,
  ],
  providers: [AdminService, AdminPeopleService, AdminTripsService, ReportsService],
  // AdminController first: its literal `drivers/pending` must win over `drivers/:id`.
  controllers: [
    AdminController,
    AdminPricingController,
    AdminSettingsController,
    AdminPeopleController,
    AdminTripsController,
    AdminReportsController,
  ],
})
export class AdminModule {}
