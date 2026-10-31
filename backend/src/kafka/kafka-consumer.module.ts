import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripTracking } from '../entities/trip-tracking.entity';
import { Driver } from '../entities/driver.entity';
import { KafkaConsumerService } from './kafka-consumer.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripTracking, Driver]),
    RealtimeModule,
    NotificationsModule,
  ],
  providers: [KafkaConsumerService],
})
export class KafkaConsumerModule {}
