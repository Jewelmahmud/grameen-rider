import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Request as ExpressRequest } from 'express';
import { RatingsService } from './ratings.service';

class SubmitRatingBody {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) review?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true }) tags?: string[];
}

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('trips/:id/rate')
  async submitRating(
    @Param('id', ParseUUIDPipe) tripId: string,
    @Request() req: ExpressRequest,
    @Body() body: SubmitRatingBody,
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
