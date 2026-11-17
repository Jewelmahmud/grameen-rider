import {
  IsString,
  IsIn,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minTripAmount?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  userUsageLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableVehicleTypes?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** all | employees (GiLab employees only) | new_users (no completed trip yet). */
  @IsOptional()
  @IsIn(['all', 'employees', 'new_users'])
  audience?: 'all' | 'employees' | 'new_users';
}

export class UpdatePromotionDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['percentage', 'fixed']) discountType?: 'percentage' | 'fixed';
  @IsOptional() @IsNumber() @Min(0) discountValue?: number;
  @IsOptional() @IsNumber() @Min(0) maxDiscountAmount?: number;
  @IsOptional() @IsNumber() @Min(0) minTripAmount?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsNumber() @Min(1) usageLimit?: number;
  @IsOptional() @IsNumber() @Min(1) userUsageLimit?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) applicableVehicleTypes?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsIn(['all', 'employees', 'new_users']) audience?: 'all' | 'employees' | 'new_users';
}
