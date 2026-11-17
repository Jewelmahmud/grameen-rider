import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { EmployeePerksService } from './employee-perks.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Trip])],
  providers: [EmployeePerksService],
  exports: [EmployeePerksService],
})
export class PerksModule {}
