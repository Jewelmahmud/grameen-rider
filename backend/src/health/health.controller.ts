import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @Inject(DataSource) private dataSource: DataSource,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        const dbCheck = await this.checkDatabase();
        return { database: dbCheck };
      },
      async () => {
        const redisCheck = await this.checkRedis();
        return { redis: redisCheck };
      },
    ]);
  }

  @Get('detailed')
  async detailedCheck() {
    const dbCheck = await this.checkDatabase();
    const redisCheck = await this.checkRedis();
    
    const checks = {
      database: dbCheck,
      redis: redisCheck,
    };

    const status = dbCheck.status === 'up' && redisCheck.status === 'up' ? 'ok' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  private async checkDatabase() {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        return {
          status: 'up' as const,
        };
      }
      return {
        status: 'down' as const,
        message: 'Database not initialized',
      };
    } catch (error) {
      return {
        status: 'down' as const,
        message: error.message,
      };
    }
  }

  private async checkRedis() {
    try {
      await this.redisClient.ping();
      return {
        status: 'up' as const,
      };
    } catch (error) {
      return {
        status: 'down' as const,
        message: error.message,
      };
    }
  }
}
