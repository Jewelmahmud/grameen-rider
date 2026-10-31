import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../entities/vehicle.entity';

export interface CreateVehicleDto {
  vehicleType: 'van' | 'rickshaw' | 'cng' | 'motorcycle' | 'auto' | 'pickup_van' | 'car' | 'car_rental' | 'boat_rental';
  licensePlate: string;
  seatingCapacity: number;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
}

export interface UpdateVehicleDto {
  vehicleType?: 'van' | 'rickshaw' | 'cng' | 'motorcycle' | 'auto' | 'pickup_van' | 'car' | 'car_rental' | 'boat_rental';
  licensePlate?: string;
  seatingCapacity?: number;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  isActive?: boolean;
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async createVehicle(driverId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepository.create({
      driverId,
      vehicleType: dto.vehicleType,
      licensePlate: dto.licensePlate,
      seatingCapacity: dto.seatingCapacity,
      make: dto.make ?? null,
      model: dto.model ?? null,
      year: dto.year ?? null,
      color: dto.color ?? null,
      isActive: true,
      isVerified: false,
    });

    return this.vehicleRepository.save(vehicle);
  }

  async findByDriverId(driverId: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { driverId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(vehicleId: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { id: vehicleId } });
  }

  async updateVehicle(
    vehicleId: string,
    driverId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.driverId !== driverId) {
      throw new ForbiddenException('You do not own this vehicle');
    }

    Object.assign(vehicle, dto);
    return this.vehicleRepository.save(vehicle);
  }

  async deleteVehicle(vehicleId: string, driverId: string): Promise<void> {
    const vehicle = await this.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.driverId !== driverId) {
      throw new ForbiddenException('You do not own this vehicle');
    }

    // Soft-delete: set isActive to false
    vehicle.isActive = false;
    await this.vehicleRepository.save(vehicle);
  }
}
