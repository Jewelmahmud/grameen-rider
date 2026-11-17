import { Controller, Get, Post, Put, Delete, Request, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { LocationsService } from './locations.service';
import { CreateFavoriteLocationDto, UpdateFavoriteLocationDto } from './dto/favorite-location.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('favorites')
  getFavoriteLocations(@Request() req: ExpressRequest) {
    return this.locationsService.findByUserProfileId(req.userProfile.id);
  }

  @Post('favorites')
  createFavoriteLocation(@Request() req: ExpressRequest, @Body() body: CreateFavoriteLocationDto) {
    return this.locationsService.createFavoriteLocation(req.userProfile.id, body);
  }

  @Put('favorites/:id')
  updateFavoriteLocation(
    @Request() req: ExpressRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFavoriteLocationDto,
  ) {
    return this.locationsService.updateFavoriteLocation(id, req.userProfile.id, body);
  }

  @Delete('favorites/:id')
  async deleteFavoriteLocation(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.locationsService.deleteFavoriteLocation(id, req.userProfile.id);
    return { success: true };
  }
}
