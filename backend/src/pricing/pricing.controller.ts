import { Body, Controller, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PricingService } from './pricing.service';
import { QuoteRequestDto } from './dto/quote.dto';
import { RequirePermission } from '../common/auth/permission.guard';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  /** System price for a ride or rental. Book with POST /trips { quoteId } within `expiresAt`. */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trips.book')
  quote(@Request() req: ExpressRequest, @Body() dto: QuoteRequestDto) {
    return this.pricing.quote(dto, req.userProfile);
  }
}
