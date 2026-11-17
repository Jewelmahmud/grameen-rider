import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// ─── Pricing ────────────────────────────────────────────────────────────────

export class FareRateDto {
  @IsNumber() @Min(0) @Max(100000) baseFare: number;
  @IsNumber() @Min(0) @Max(500) baseKm: number;
  @IsNumber() @Min(0) @Max(10000) perKm: number;
  @IsNumber() @Min(0) @Max(1000) perMinute: number;
  @IsNumber() @Min(0) @Max(100000) minimumFare: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) waitingPerMinute?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) extraPassengerFare?: number;
  /** Rentals: share of the return leg charged on round trips (0–1; 1 = full price). */
  @IsOptional() @IsNumber() @Min(0) @Max(1) returnLegFactor?: number | null;
  /** Empty = use the global commission. */
  @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number | null;
}

export class ZoneDto {
  @IsString() @MaxLength(150) nameBn: string;
  @IsString() @MaxLength(150) nameEn: string;
  @IsLatitude() centerLatitude: number;
  @IsLongitude() centerLongitude: number;
  @IsInt() @Min(50) @Max(50000) radiusM: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateZoneDto {
  @IsOptional() @IsString() @MaxLength(150) nameBn?: string;
  @IsOptional() @IsString() @MaxLength(150) nameEn?: string;
  @IsOptional() @IsLatitude() centerLatitude?: number;
  @IsOptional() @IsLongitude() centerLongitude?: number;
  @IsOptional() @IsInt() @Min(50) @Max(50000) radiusM?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class RouteFareDto {
  @IsUUID() originZoneId: string;
  @IsUUID() destinationZoneId: string;
  @IsString() @MaxLength(20) vehicleType: string;
  @IsNumber() @Min(0) @Max(100000) fixedFare: number;
  @IsOptional() @IsBoolean() bidirectional?: boolean;
  @IsOptional() @IsInt() @Min(-100) @Max(100) priority?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() validFrom?: string | null;
  @IsOptional() @IsDateString() validTo?: string | null;
}

export class UpdateRouteFareDto {
  @IsOptional() @IsUUID() originZoneId?: string;
  @IsOptional() @IsUUID() destinationZoneId?: string;
  @IsOptional() @IsString() @MaxLength(20) vehicleType?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) fixedFare?: number;
  @IsOptional() @IsBoolean() bidirectional?: boolean;
  @IsOptional() @IsInt() @Min(-100) @Max(100) priority?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() validFrom?: string | null;
  @IsOptional() @IsDateString() validTo?: string | null;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export class UpdateSettingsDto {
  /** { "matching.weights.fairness": 0.4, ... } — each key is checked against its own permission. */
  @IsObject() values: Record<string, unknown>;
}

// ─── People ─────────────────────────────────────────────────────────────────

export class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}

export class ListUsersQueryDto extends ListQueryDto {
  @IsOptional() @IsIn(['super_admin', 'ride_admin', 'operations', 'driver', 'customer']) role?: string;
  @IsOptional() @IsIn(['true', 'false']) employee?: 'true' | 'false';
  @IsOptional() @IsIn(['active', 'blocked']) status?: 'active' | 'blocked';
}

export class ListDriversQueryDto extends ListQueryDto {
  @IsOptional() @IsIn(['pending', 'approved', 'rejected']) verification?: 'pending' | 'approved' | 'rejected';
  @IsOptional() @IsIn(['true', 'false']) suspended?: 'true' | 'false';
  @IsOptional() @IsIn(['true', 'false']) online?: 'true' | 'false';
}

export class ReasonDto {
  @IsString() @MaxLength(500) reason: string;
}

export class UpdateVehicleDto {
  @IsOptional() @IsBoolean() isVerified?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() servesRide?: boolean;
  @IsOptional() @IsBoolean() servesRental?: boolean;
}

// ─── Trips ──────────────────────────────────────────────────────────────────

export class ListTripsQueryDto extends ListQueryDto {
  @IsOptional() @IsString() @MaxLength(30) status?: string;
  @IsOptional() @IsIn(['ride', 'rental']) service?: 'ride' | 'rental';
  @IsOptional() @IsString() @MaxLength(20) vehicleType?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() driverId?: string;
  @IsOptional() @IsUUID() passengerId?: string;
  @IsOptional() @IsIn(['true', 'false']) employee?: 'true' | 'false';
}

export class AssignDriverDto {
  @IsUUID() driverId: string;
  @IsOptional() @IsUUID() vehicleId?: string;
}

export class DateRangeDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class FairnessQueryDto {
  /** Any time on the Dhaka work day to report; default today. */
  @IsOptional() @IsDateString() date?: string;
}

export class AuditQueryDto extends ListQueryDto {
  @IsOptional() @IsString() @MaxLength(50) entity?: string;
  @IsOptional() @IsString() @MaxLength(64) entityId?: string;
  @IsOptional() @IsUUID() actor?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class UpcomingQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(168) hours?: number;
}
