import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { KafkaModule } from './kafka/kafka.module';
import { KafkaConsumerModule } from './kafka/kafka-consumer.module';
import { AuthModule } from './auth/auth.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { TripsModule } from './trips/trips.module';
import { DriversModule } from './drivers/drivers.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LocationsModule } from './locations/locations.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RatingsModule } from './ratings/ratings.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SupportModule } from './support/support.module';
import { AdminModule } from './admin/admin.module';
import { GilabModule } from './auth/gilab.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { PerksModule } from './perks/perks.module';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Dispatch jobs (offers, timeouts) run on the same Redis.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get<string>('REDIS_QUEUE_URL') || config.get<string>('REDIS_URL') || 'redis://localhost:6379',
        redis: { password: config.get<string>('REDIS_PASSWORD') || undefined },
        prefix: 'grameen-ride',
      }),
    }),
    DatabaseModule,
    RedisModule,
    GilabModule,
    SettingsModule,
    AuditModule,
    PerksModule,
    PricingModule,
    KafkaModule,
    KafkaConsumerModule,
    AuthModule,
    UserProfilesModule,
    TripsModule,
    DriversModule,
    PaymentsModule,
    NotificationsModule,
    LocationsModule,
    HealthModule,
    RealtimeModule,
    RatingsModule,
    PromotionsModule,
    SupportModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

