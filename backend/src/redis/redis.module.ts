import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const logger = new Logger('Redis');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        const redisPassword = configService.get('REDIS_PASSWORD');
        
        const client = new Redis(redisUrl, {
          password: redisPassword || undefined,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          // Fail fast while Redis is unreachable instead of queueing: callers treat Redis as a cache
          // (token checks, settings) or return a clear 503 (quotes). Queueing made every request
          // wait through reconnect retries (~10 s) during an outage.
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          commandTimeout: 1000,
        });
        let lastLog = 0;
        client.on('error', (err) => {
          if (Date.now() - lastLog < 60_000) return;
          lastLog = Date.now();
          logger.warn(`Redis unavailable: ${err.message || err}`);
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

