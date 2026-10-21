import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteLocation } from '../entities/favorite-location.entity';

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
    const location = this.favoriteLocationRepository.create({
      ...data,
      userProfileId,
    });
    return this.favoriteLocationRepository.save(location);
  }

  async findByUserProfileId(userProfileId: string): Promise<FavoriteLocation[]> {
    return this.favoriteLocationRepository.find({
      where: { userProfileId },
    });
  }
}

interface CreateFavoriteLocationDto {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType?: 'home' | 'work' | 'other';
  isDefault?: boolean;
}

