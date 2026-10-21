import { Controller, Get, Post, Request, Body } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('favorites')
  async getFavoriteLocations(@Request() req: ExpressRequest) {
    return this.locationsService.findByUserProfileId(req.userProfile.id);
  }

  @Post('favorites')
  async createFavoriteLocation(@Request() req: ExpressRequest, @Body() body: any) {
    return this.locationsService.createFavoriteLocation(req.userProfile.id, body);
  }
}

