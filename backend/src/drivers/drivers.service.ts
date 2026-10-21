import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async getDriverProfile(userProfileId: string): Promise<Driver | null> {
    return this.driverRepository.findOne({
      where: { userProfileId },
      relations: ['vehicles'],
    });
  }

  async updateLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.driverRepository.update(driverId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      currentLocationUpdatedAt: new Date(),
    });
  }

  async updateAvailability(
    driverId: string,
    isOnline: boolean,
    isAvailable: boolean,
  ): Promise<void> {
    await this.driverRepository.update(driverId, {
      isOnline,
      isAvailable,
    });
  }
}

