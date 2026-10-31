import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, Vehicle, DriverEarning, UserProfile])],
  providers: [DriversService, VehiclesService],
  controllers: [DriversController, VehiclesController],
  exports: [DriversService],
})
export class DriversModule {}
