import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  SupportedPaymentProvider,
  PaymentProviderClient,
} from './providers/payment-provider.interface';
import { PortPosProvider } from './providers/portpos.provider';
import { SSLCommerzProvider } from './providers/sslcommerz.provider';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private eventEmitter: EventEmitter2,
    private readonly portPosProvider: PortPosProvider,
    private readonly sslCommerzProvider: SSLCommerzProvider,
  ) {}

  async createPayment(data: CreatePaymentDto): Promise<Payment> {
    const paymentProvider = (data.paymentProvider || 'sslcommerz') as SupportedPaymentProvider;
    const transactionId = data.transactionId || `PAY-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const payment = this.paymentRepository.create({
      ...data,
      transactionId,
      paymentProvider,
      paymentStatus: 'pending',
    });

    let savedPayment = await this.paymentRepository.save(payment);

    try {
      const providerClient = this.getProviderClient(paymentProvider);
      const initiation = await providerClient.initiatePayment({
        payment: savedPayment,
        payload: data.gatewayPayload || {},
      });

      savedPayment.externalTransactionId =
        initiation.externalTransactionId || savedPayment.externalTransactionId;
      savedPayment.paymentStatus = 'processing';
      savedPayment.metadata = {
        ...(savedPayment.metadata || {}),
        gatewayInit: initiation.raw,
        checkoutUrl: initiation.checkoutUrl,
      };
      savedPayment = await this.paymentRepository.save(savedPayment);

      this.eventEmitter.emit('payment.created', {
        paymentId: savedPayment.id,
        tripId: savedPayment.tripId,
        amount: savedPayment.amount,
        paymentProvider: savedPayment.paymentProvider,
      });

      return savedPayment;
    } catch (error: any) {
      savedPayment.paymentStatus = 'failed';
      savedPayment.metadata = {
        ...(savedPayment.metadata || {}),
        error: error?.message || 'Payment initiation failed',
      };
      await this.paymentRepository.save(savedPayment);
      throw error;
    }
  }

  async findById(id: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id },
      relations: ['trip', 'passengerProfile', 'driver'],
    });
  }

  async verifyPayment(
    paymentId: string,
    payload: Record<string, any>,
  ): Promise<Payment> {
    const payment = await this.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const provider = (payment.paymentProvider || 'sslcommerz') as SupportedPaymentProvider;
    const providerClient = this.getProviderClient(provider);
    const verification = await providerClient.verifyPayment({ payment, payload });

    payment.externalTransactionId = verification.externalTransactionId || payment.externalTransactionId;
    payment.paymentStatus = verification.success ? 'completed' : 'failed';
    payment.paymentDate = verification.success ? new Date() : payment.paymentDate;
    payment.metadata = {
      ...(payment.metadata || {}),
      gatewayVerify: verification.raw,
      verifiedAt: new Date().toISOString(),
    };

    const updatedPayment = await this.paymentRepository.save(payment);

    this.eventEmitter.emit('payment.verified', {
      paymentId: updatedPayment.id,
      tripId: updatedPayment.tripId,
      status: updatedPayment.paymentStatus,
      provider,
    });

    return updatedPayment;
  }

  private getProviderClient(provider: SupportedPaymentProvider): PaymentProviderClient {
    switch (provider) {
      case 'portpos':
        return this.portPosProvider;
      case 'sslcommerz':
      default:
        return this.sslCommerzProvider;
    }
  }
}

interface CreatePaymentDto {
  tripId: string;
  passengerProfileId: string;
  driverId?: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  paymentProvider?: string;
  transactionId?: string;
  gatewayPayload?: Record<string, any>;
}

