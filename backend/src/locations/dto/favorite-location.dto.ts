import { IsBoolean, IsIn, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

const TYPES = ['home', 'work', 'other'] as const;

export class CreateFavoriteLocationDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(500) address: string;
  @IsLatitude() latitude: number;
  @IsLongitude() longitude: number;
  @IsOptional() @IsIn(TYPES) locationType?: (typeof TYPES)[number];
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateFavoriteLocationDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
  @IsOptional() @IsIn(TYPES) locationType?: (typeof TYPES)[number];
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

/** Only these fields are copied from a request; ids and owners never are. */
export const FAVORITE_FIELDS = ['name', 'address', 'latitude', 'longitude', 'locationType', 'isDefault'] as const;
