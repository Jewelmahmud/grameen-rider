import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';

export interface CreateDriverProfileDto {
  licenseNumber: string;
  licenseExpiryDate?: string;
  vehicleRegistrationNumber: string;
}

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async createDriverProfile(
    userProfileId: string,
    dto: CreateDriverProfileDto,
  ): Promise<Driver> {
    const existing = await this.driverRepository.findOne({ where: { userProfileId } });
    if (existing) {
      throw new ConflictException('A driver profile already exists for this user');
    }

    const driver = this.driverRepository.create({
      userProfileId,
      licenseNumber: dto.licenseNumber,
      licenseExpiryDate: dto.licenseExpiryDate ? new Date(dto.licenseExpiryDate) : null,
      vehicleRegistrationNumber: dto.vehicleRegistrationNumber,
      verificationStatus: 'pending',
      rating: 0,
      totalRides: 0,
      totalEarnings: 0,
      isOnline: false,
      isAvailable: false,
    });

    return this.driverRepository.save(driver);
  }

  async getDriverProfile(userProfileId: string): Promise<Driver | null> {
    return this.driverRepository.findOne({
      where: { userProfileId },
      relations: ['vehicles'],
    });
  }

  async findById(driverId: string): Promise<Driver | null> {
    return this.driverRepository.findOne({
      where: { id: driverId },
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
