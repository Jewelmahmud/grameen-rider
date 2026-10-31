import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Rating } from '../entities/rating.entity';
import { Trip } from '../entities/trip.entity';
import { Driver } from '../entities/driver.entity';

export interface SubmitRatingDto {
  rating: number;
  review?: string;
  tags?: string[];
}

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private dataSource: DataSource,
  ) {}

  async submitRating(
    tripId: string,
    raterProfileId: string,
    dto: SubmitRatingDto,
  ): Promise<Rating> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['driver'],
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== 'completed') {
      throw new BadRequestException('Ratings can only be submitted for completed trips');
    }

    // Determine who is being rated and enforce the rater is a trip participant
    let ratedProfileId: string;
    const isPassenger = trip.passengerId === raterProfileId;
    const isDriver = trip.driver?.userProfileId === raterProfileId;

    if (!isPassenger && !isDriver) {
      throw new ForbiddenException('You were not a participant in this trip');
    }

    if (isPassenger) {
      // Passenger rates the driver
      if (!trip.driver) {
        throw new BadRequestException('No driver assigned to this trip');
      }
      ratedProfileId = trip.driver.userProfileId;
    } else {
      // Driver rates the passenger
      ratedProfileId = trip.passengerId;
    }

    // Check for duplicate rating
    const existing = await this.ratingRepository.findOne({
      where: { tripId, raterProfileId },
    });
    if (existing) {
      throw new BadRequestException('You have already rated this trip');
    }

    return this.dataSource.transaction(async (manager) => {
      const rating = manager.create(Rating, {
        tripId,
        raterProfileId,
        ratedProfileId,
        rating: dto.rating,
        review: dto.review ?? null,
        tags: dto.tags ?? null,
      });
      const saved = await manager.save(Rating, rating);

      // Recompute driver's average rating when the passenger rates the driver
      if (isPassenger && trip.driverId) {
        const { avg } = await manager
          .createQueryBuilder(Rating, 'r')
          .innerJoin(Driver, 'd', 'd.user_profile_id = r.rated_profile_id')
          .where('d.id = :driverId', { driverId: trip.driverId })
          .select('AVG(r.rating)', 'avg')
          .getRawOne();

        await manager.update(Driver, trip.driverId, {
          rating: Math.round((parseFloat(avg) || 0) * 100) / 100,
        });
      }

      return saved;
    });
  }

  async findByDriverId(
    driverId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Rating[]; total: number; page: number; limit: number }> {
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const [data, total] = await this.ratingRepository.findAndCount({
      where: { ratedProfileId: driver.userProfileId },
      relations: ['raterProfile', 'trip'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
