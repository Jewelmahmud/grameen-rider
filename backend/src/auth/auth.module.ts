import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthCircuitBreakerService } from './auth-circuit-breaker.service';
import { AuthMiddleware } from './auth.middleware';
import { UserProfilesModule } from '../user-profiles/user-profiles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule, UserProfilesModule],
  providers: [AuthCircuitBreakerService, AuthService],
  controllers: [AuthController],
  exports: [AuthCircuitBreakerService, AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply auth middleware globally except for health and public endpoints
    consumer
      .apply(AuthMiddleware)
      .exclude(
        'health',
        'health/(.*)',
        'api/health',
        'api/health/(.*)',
        'auth/login',
        'auth/register',
        'api/auth/login',
        'api/auth/register',
      )
      .forRoutes('*');
  }
}

