import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PaymentProviderClient } from './payment-provider.interface';
import { Payment } from '../../entities/payment.entity';

@Injectable()
export class PortPosProvider implements PaymentProviderClient {
  constructor(private readonly configService: ConfigService) {}

  async initiatePayment(params: {
    payment: Payment;
    payload: Record<string, any>;
  }) {
    const initUrl = this.configService.get<string>('PORTPOS_INIT_URL');
    const apiKey = this.configService.get<string>('PORTPOS_API_KEY');

    if (!initUrl || !apiKey) {
      throw new Error('PortPos configuration is missing (PORTPOS_INIT_URL / PORTPOS_API_KEY)');
    }

    const requestPayload = {
      amount: Number(params.payment.amount),
      currency: params.payment.currency,
      order_id: params.payment.transactionId,
      transaction_id: params.payment.transactionId,
      ...params.payload,
    };

    const response = await axios.post(initUrl, requestPayload, {
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = response.data || {};
    return {
      externalTransactionId:
        data.transaction_id || data.tran_id || data.id || params.payment.transactionId,
      checkoutUrl:
        data.redirect_url || data.checkout_url || data.payment_url || data.GatewayPageURL,
      raw: data,
    };
  }

  async verifyPayment(params: {
    payment: Payment;
    payload: Record<string, any>;
  }) {
    const verifyUrl = this.configService.get<string>('PORTPOS_VERIFY_URL');
    const apiKey = this.configService.get<string>('PORTPOS_API_KEY');

    if (!verifyUrl || !apiKey) {
      throw new Error('PortPos configuration is missing (PORTPOS_VERIFY_URL / PORTPOS_API_KEY)');
    }

    const requestPayload = {
      transaction_id:
        params.payload.transaction_id ||
        params.payment.externalTransactionId ||
        params.payment.transactionId,
      ...params.payload,
    };

    const response = await axios.post(verifyUrl, requestPayload, {
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = response.data || {};
    const status = String(data.status || data.payment_status || data.transaction_status || '')
      .toLowerCase();
    const success = ['success', 'succeeded', 'paid', 'completed', 'valid'].includes(status);

    return {
      success,
      externalTransactionId:
        data.transaction_id || data.tran_id || data.id || params.payment.externalTransactionId,
      raw: data,
    };
  }
}
