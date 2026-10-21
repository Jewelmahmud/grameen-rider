import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PortPosProvider } from './providers/portpos.provider';
import { SSLCommerzProvider } from './providers/sslcommerz.provider';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Payment])],
  providers: [PaymentsService, PortPosProvider, SSLCommerzProvider],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}

