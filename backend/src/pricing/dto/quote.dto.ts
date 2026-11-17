import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlaceDto {
  @IsString() @MaxLength(500) address: string;
  @IsLatitude() latitude: number;
  @IsLongitude() longitude: number;
}

export class QuoteRequestDto {
  @IsIn(['ride', 'rental']) serviceType: 'ride' | 'rental';

  /** Omit to get a price for every enabled vehicle type of the service. */
  @IsOptional() @IsString() @MaxLength(20) vehicleType?: string;

  @ValidateNested() @Type(() => PlaceDto) pickup: PlaceDto;
  @ValidateNested() @Type(() => PlaceDto) dropoff: PlaceDto;

  /** Rentals: stops between pickup and dropoff, in order. */
  @IsOptional() @ValidateNested({ each: true }) @Type(() => PlaceDto) @ArrayMaxSize(10) stops?: PlaceDto[];

  /** Rentals: come back to the pickup point at the end. */
  @IsOptional() @IsBoolean() roundTrip?: boolean;

  /** Road distance of the outbound route from the app's routing service. Never trusted below straight-line. */
  @IsOptional() @IsNumber() @Min(0) @Max(2000) distanceKm?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(3000) durationMinutes?: number;

  /** Required for rentals; optional for rides (omit = now). */
  @IsOptional() @IsDateString() scheduledAt?: string;

  @IsOptional() @IsInt() @Min(1) @Max(20) passengerCount?: number;
}
