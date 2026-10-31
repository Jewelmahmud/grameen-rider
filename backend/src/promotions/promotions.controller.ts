import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('active')
  async getActivePromotions(@Query('vehicleType') vehicleType?: string) {
    return this.promotionsService.findActivePromotions(vehicleType);
  }

  @Post('validate')
  async validatePromoCode(
    @Request() req: ExpressRequest,
    @Body()
    body: {
      code: string;
      tripAmount: number;
      vehicleType?: string;
    },
  ) {
    const result = await this.promotionsService.validatePromoCode(
      body.code,
      req.userProfile.id,
      body.tripAmount,
      body.vehicleType,
    );

    return {
      valid: true,
      promotion: result.promotion,
      discountAmount: result.discountAmount,
      finalAmount: Math.max(0, body.tripAmount - result.discountAmount),
    };
  }
}
