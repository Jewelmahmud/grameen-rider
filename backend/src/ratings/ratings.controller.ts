import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { RatingsService } from './ratings.service';

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('trips/:id/rate')
  async submitRating(
    @Param('id') tripId: string,
    @Request() req: ExpressRequest,
    @Body() body: { rating: number; review?: string; tags?: string[] },
  ) {
    return this.ratingsService.submitRating(tripId, req.userProfile.id, {
      rating: body.rating,
      review: body.review,
      tags: body.tags,
    });
  }

  @Get('drivers/:id/ratings')
  async getDriverRatings(
    @Param('id') driverId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ratingsService.findByDriverId(
      driverId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
