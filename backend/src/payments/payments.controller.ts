import { Controller, Get, Post, Param, Request, Body } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Request() req: ExpressRequest, @Body() body: any) {
    const payment = await this.paymentsService.createPayment({
      ...body,
      passengerProfileId: req.userProfile.id,
    });

    return {
      payment,
      checkoutUrl: payment?.metadata?.checkoutUrl || null,
    };
  }

  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Post(':id/verify')
  async verifyPayment(@Param('id') id: string, @Body() body: any) {
    return this.paymentsService.verifyPayment(id, body || {});
  }

  @Post('webhook/:provider')
  async paymentWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
  ) {
    const paymentId = body.paymentId || body.payment_id;
    if (!paymentId) {
      return { success: false, message: 'paymentId is required' };
    }
    const payment = await this.paymentsService.verifyPayment(paymentId, body || {});
    return { success: true, provider, status: payment.paymentStatus };
  }
}

