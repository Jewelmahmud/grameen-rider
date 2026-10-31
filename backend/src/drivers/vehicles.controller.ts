import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { VehiclesService } from './vehicles.service';
import { DriversService } from './drivers.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
  ) {}

  private async resolveDriverId(req: ExpressRequest): Promise<string> {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new NotFoundException('Driver profile not found. Register as a driver first.');
    }
    return driver.id;
  }

  @Post()
  async createVehicle(
    @Request() req: ExpressRequest,
    @Body()
    body: {
      vehicleType: 'van' | 'rickshaw' | 'cng' | 'motorcycle' | 'auto' | 'pickup_van' | 'car' | 'car_rental' | 'boat_rental';
      licensePlate: string;
      seatingCapacity: number;
      make?: string;
      model?: string;
      year?: number;
      color?: string;
    },
  ) {
    const driverId = await this.resolveDriverId(req);
    return this.vehiclesService.createVehicle(driverId, body);
  }

  @Get()
  async getMyVehicles(@Request() req: ExpressRequest) {
    const driverId = await this.resolveDriverId(req);
    return this.vehiclesService.findByDriverId(driverId);
  }

  @Get(':id')
  async getVehicle(@Param('id') id: string) {
    const vehicle = await this.vehiclesService.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  @Put(':id')
  async updateVehicle(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
    @Body()
    body: {
      vehicleType?: 'van' | 'rickshaw' | 'cng' | 'motorcycle' | 'auto' | 'pickup_van' | 'car' | 'car_rental' | 'boat_rental';
      licensePlate?: string;
      seatingCapacity?: number;
      make?: string;
      model?: string;
      year?: number;
      color?: string;
    },
  ) {
    const driverId = await this.resolveDriverId(req);
    return this.vehiclesService.updateVehicle(id, driverId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVehicle(@Param('id') id: string, @Request() req: ExpressRequest) {
    const driverId = await this.resolveDriverId(req);
    await this.vehiclesService.deleteVehicle(id, driverId);
  }
}
