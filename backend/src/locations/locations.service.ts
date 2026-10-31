import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteLocation } from '../entities/favorite-location.entity';

export interface CreateFavoriteLocationDto {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType?: 'home' | 'work' | 'other';
  isDefault?: boolean;
}

export interface UpdateFavoriteLocationDto {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  locationType?: 'home' | 'work' | 'other';
  isDefault?: boolean;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(FavoriteLocation)
    private favoriteLocationRepository: Repository<FavoriteLocation>,
  ) {}

  async createFavoriteLocation(
    userProfileId: string,
    data: CreateFavoriteLocationDto,
  ): Promise<FavoriteLocation> {
    // Enforce one home/work per user
    if (data.locationType === 'home' || data.locationType === 'work') {
      const existing = await this.favoriteLocationRepository.findOne({
        where: { userProfileId, locationType: data.locationType },
      });
      if (existing) {
        throw new BadRequestException(`You already have a ${data.locationType} location saved`);
      }
    }

    const location = this.favoriteLocationRepository.create({
      ...data,
      userProfileId,
    });
    return this.favoriteLocationRepository.save(location);
  }

  async findByUserProfileId(userProfileId: string): Promise<FavoriteLocation[]> {
    return this.favoriteLocationRepository.find({
      where: { userProfileId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateFavoriteLocation(
    locationId: string,
    userProfileId: string,
    data: UpdateFavoriteLocationDto,
  ): Promise<FavoriteLocation> {
    const location = await this.favoriteLocationRepository.findOne({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundException('Favorite location not found');
    }
    if (location.userProfileId !== userProfileId) {
      throw new ForbiddenException('You do not have access to this location');
    }

    // Enforce one home/work per user if type is changing
    const newType = data.locationType ?? location.locationType;
    if (
      data.locationType &&
      data.locationType !== location.locationType &&
      (data.locationType === 'home' || data.locationType === 'work')
    ) {
      const existing = await this.favoriteLocationRepository.findOne({
        where: { userProfileId, locationType: newType },
      });
      if (existing && existing.id !== locationId) {
        throw new BadRequestException(`You already have a ${newType} location saved`);
      }
    }

    Object.assign(location, data);
    return this.favoriteLocationRepository.save(location);
  }

  async deleteFavoriteLocation(locationId: string, userProfileId: string): Promise<void> {
    const location = await this.favoriteLocationRepository.findOne({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundException('Favorite location not found');
    }
    if (location.userProfileId !== userProfileId) {
      throw new ForbiddenException('You do not have access to this location');
    }
    await this.favoriteLocationRepository.remove(location);
  }
}
