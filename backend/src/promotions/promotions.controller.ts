import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PromotionsService } from './promotions.service';
import { EmployeePerksService } from '../perks/employee-perks.service';

class ValidatePromoDto {
  @IsString() @MaxLength(50) code: string;
  @IsNumber() @Min(0) tripAmount: number;
  @IsOptional() @IsString() @MaxLength(20) vehicleType?: string;
}

@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly perks: EmployeePerksService,
  ) {}

  /** Only the promotions this customer can use (employee-only offers are shown to employees). */
  @Get('active')
  async getActivePromotions(@Request() req: ExpressRequest, @Query('vehicleType') vehicleType?: string) {
    return this.promotionsService.findActivePromotions(
      vehicleType,
      await this.perks.audienceContext(req.userProfile),
    );
  }

  @Post('validate')
  async validatePromoCode(@Request() req: ExpressRequest, @Body() body: ValidatePromoDto) {
    const result = await this.promotionsService.validatePromoCode(
      body.code,
      req.userProfile.id,
      body.tripAmount,
      body.vehicleType,
      await this.perks.audienceContext(req.userProfile),
    );

    return {
      valid: true,
      promotion: result.promotion,
      discountAmount: result.discountAmount,
      finalAmount: Math.max(0, body.tripAmount - result.discountAmount),
    };
  }
}
