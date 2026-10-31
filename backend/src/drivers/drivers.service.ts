import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { UserProfile } from '../entities/user-profile.entity';

export interface CreateDriverProfileDto {
  licenseNumber: string;
  licenseExpiryDate?: string;
  vehicleRegistrationNumber: string;
}

export interface EarningsSummary {
  today: { grossEarnings: number; netEarnings: number; rides: number };
  thisWeek: { grossEarnings: number; netEarnings: number; rides: number };
  allTime: { grossEarnings: number; netEarnings: number; rides: number };
  recent: DriverEarning[];
}

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(DriverEarning)
    private earningRepository: Repository<DriverEarning>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
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

    const savedDriver = await this.driverRepository.save(driver);

    // Mark the user profile as a driver
    await this.userProfileRepository.update(userProfileId, { userType: 'driver' });

    return savedDriver;
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
    await this.driverRepository.update(driverId, { isOnline, isAvailable });
  }

  async getEarningsSummary(userProfileId: string): Promise<EarningsSummary> {
    const driver = await this.driverRepository.findOne({ where: { userProfileId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [todayRows, weekRows, allRows, recent] = await Promise.all([
      this.earningRepository
        .createQueryBuilder('e')
        .where('e.driver_id = :driverId', { driverId: driver.id })
        .andWhere('e.created_at >= :start', { start: startOfToday })
        .select(['SUM(e.amount) as gross', 'SUM(e.net_earnings) as net', 'COUNT(*) as rides'])
        .getRawOne(),

      this.earningRepository
        .createQueryBuilder('e')
        .where('e.driver_id = :driverId', { driverId: driver.id })
        .andWhere('e.created_at >= :start', { start: startOfWeek })
        .select(['SUM(e.amount) as gross', 'SUM(e.net_earnings) as net', 'COUNT(*) as rides'])
        .getRawOne(),

      this.earningRepository
        .createQueryBuilder('e')
        .where('e.driver_id = :driverId', { driverId: driver.id })
        .select(['SUM(e.amount) as gross', 'SUM(e.net_earnings) as net', 'COUNT(*) as rides'])
        .getRawOne(),

      this.earningRepository.find({
        where: { driverId: driver.id },
        order: { createdAt: 'DESC' },
        take: 20,
        relations: ['trip'],
      }),
    ]);

    const toSummary = (row: any) => ({
      grossEarnings: parseFloat(row?.gross ?? '0') || 0,
      netEarnings: parseFloat(row?.net ?? '0') || 0,
      rides: parseInt(row?.rides ?? '0', 10) || 0,
    });

    return {
      today: toSummary(todayRows),
      thisWeek: toSummary(weekRows),
      allTime: toSummary(allRows),
      recent,
    };
  }
}
