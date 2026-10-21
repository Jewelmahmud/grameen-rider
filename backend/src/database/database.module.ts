import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Trip } from '../entities/trip.entity';
import { TripTracking } from '../entities/trip-tracking.entity';
import { FavoriteLocation } from '../entities/favorite-location.entity';
import { Notification } from '../entities/notification.entity';
import { Rating } from '../entities/rating.entity';
import { Payment } from '../entities/payment.entity';
import { DriverEarning } from '../entities/driver-earning.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportMessage } from '../entities/support-message.entity';
import { Promotion } from '../entities/promotion.entity';
import { PromotionUsage } from '../entities/promotion-usage.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { DriverAvailabilityHistory } from '../entities/driver-availability-history.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = configService.get('DATABASE_URL');
        
        // Parse postgresql://user:pass@host:port/db format
        const match = databaseUrl?.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        
        if (!match) {
          throw new Error(`Invalid DATABASE_URL format: ${databaseUrl}`);
        }
        
        const options: TypeOrmModuleOptions = {
          type: 'postgres',
          host: match[3],
          port: parseInt(match[4]),
          username: match[1],
          password: match[2],
          database: match[5],
          entities: [
            UserProfile,
            Driver,
            Vehicle,
            Trip,
            TripTracking,
            FavoriteLocation,
            Notification,
            Rating,
            Payment,
            DriverEarning,
            SupportTicket,
            SupportMessage,
            Promotion,
            PromotionUsage,
            SystemSetting,
            DriverAvailabilityHistory,
          ],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
          extra: {
            max: parseInt(configService.get('DB_POOL_SIZE') || '20'),
            idleTimeoutMillis: parseInt(configService.get('DB_IDLE_TIMEOUT') || '30000'),
            statement_timeout: parseInt(configService.get('DB_STATEMENT_TIMEOUT') || '30000'),
          },
        };
        
        return options;
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

