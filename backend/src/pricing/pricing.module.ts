import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FareRate } from '../entities/fare-rate.entity';
import { Zone } from '../entities/zone.entity';
import { RouteFare } from '../entities/route-fare.entity';
import { FareRatesService } from './fare-rates.service';
import { ZonesService } from './zones.service';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FareRate, Zone, RouteFare])],
  providers: [FareRatesService, ZonesService, PricingService],
  controllers: [PricingController],
  exports: [FareRatesService, ZonesService, PricingService],
})
export class PricingModule {}
