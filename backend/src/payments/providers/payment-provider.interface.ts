import { Payment } from '../../entities/payment.entity';

export type SupportedPaymentProvider = 'portpos' | 'sslcommerz';

export interface PaymentInitiationResult {
  externalTransactionId?: string;
  checkoutUrl?: string;
  raw: Record<string, any>;
}

export interface PaymentVerificationResult {
  success: boolean;
  externalTransactionId?: string;
  raw: Record<string, any>;
}

export interface PaymentProviderClient {
  initiatePayment(params: {
    payment: Payment;
    payload: Record<string, any>;
  }): Promise<PaymentInitiationResult>;

  verifyPayment(params: {
    payment: Payment;
    payload: Record<string, any>;
  }): Promise<PaymentVerificationResult>;
}
