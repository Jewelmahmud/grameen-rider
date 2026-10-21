import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderClient } from './payment-provider.interface';
import { Payment } from '../../entities/payment.entity';

@Injectable()
export class SSLCommerzProvider implements PaymentProviderClient {
  constructor(private readonly configService: ConfigService) {}

  async initiatePayment(params: {
    payment: Payment;
    payload: Record<string, any>;
  }) {
    const storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID');
    const storePassword = this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD');
    const isLive = this.configService.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';

    if (!storeId || !storePassword) {
      throw new Error(
        'SSLCommerz configuration is missing (SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD)',
      );
    }

    // sslcommerz-lts ships as CommonJS package.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SSLCommerzPayment = require('sslcommerz-lts');
    const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

    const requestPayload = {
      total_amount: Number(params.payment.amount),
      currency: params.payment.currency || 'BDT',
      tran_id: params.payment.transactionId,
      success_url:
        params.payload.success_url ||
        this.configService.get<string>('SSLCOMMERZ_SUCCESS_URL') ||
        'http://localhost:5006/api/payments/webhook/sslcommerz',
      fail_url:
        params.payload.fail_url ||
        this.configService.get<string>('SSLCOMMERZ_FAIL_URL') ||
        'http://localhost:5006/api/payments/webhook/sslcommerz',
      cancel_url:
        params.payload.cancel_url ||
        this.configService.get<string>('SSLCOMMERZ_CANCEL_URL') ||
        'http://localhost:5006/api/payments/webhook/sslcommerz',
      ipn_url:
        params.payload.ipn_url ||
        this.configService.get<string>('SSLCOMMERZ_IPN_URL') ||
        'http://localhost:5006/api/payments/webhook/sslcommerz',
      product_name: params.payload.product_name || 'Ride Fare',
      product_category: params.payload.product_category || 'Transportation',
      product_profile: params.payload.product_profile || 'general',
      cus_name: params.payload.cus_name || 'Rider',
      cus_email: params.payload.cus_email || 'rider@example.com',
      cus_add1: params.payload.cus_add1 || 'Dhaka',
      cus_city: params.payload.cus_city || 'Dhaka',
      cus_country: params.payload.cus_country || 'Bangladesh',
      cus_phone: params.payload.cus_phone || '01700000000',
      shipping_method: params.payload.shipping_method || 'NO',
      ...params.payload,
    };

    const response = await sslcz.init(requestPayload);
    const data = response || {};

    return {
      externalTransactionId: data.sessionkey || data.tran_id || params.payment.transactionId,
      checkoutUrl: data.GatewayPageURL,
      raw: data,
    };
  }

  async verifyPayment(params: {
    payment: Payment;
    payload: Record<string, any>;
  }) {
    const storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID');
    const storePassword = this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD');
    const isLive = this.configService.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';

    if (!storeId || !storePassword) {
      throw new Error(
        'SSLCommerz configuration is missing (SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD)',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SSLCommerzPayment = require('sslcommerz-lts');
    const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

    const valId = params.payload.val_id;
    if (!valId) {
      throw new Error('SSLCommerz verification requires val_id');
    }

    const response = await sslcz.validate({ val_id: valId });
    const data = response || {};
    const status = String(data.status || '').toLowerCase();
    const success = ['valid', 'validated', 'success', 'successful'].includes(status);

    return {
      success,
      externalTransactionId: data.tran_id || params.payment.externalTransactionId,
      raw: data,
    };
  }
}
