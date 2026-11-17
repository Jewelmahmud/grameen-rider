import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TokenVerificationService } from './token-verification.service';
import { AuthContextService } from './auth-context.service';
import { AuthMiddleware } from './auth.middleware';
import { UserProfilesModule } from '../user-profiles/user-profiles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from '../common/auth/permission.guard';

/** Routes reachable without a token. Everything else goes through AuthMiddleware. */
const PUBLIC_ROUTES = [
  'health',
  'health/(.*)',
  'auth/login',
  'auth/otp/send',
  'auth/register',
  'auth/verify-phone',
  'auth/resend-verification',
  'auth/refresh',
  'config/public',
  'payments/webhook/(.*)',
];

@Module({
  imports: [ConfigModule, UserProfilesModule],
  providers: [
    TokenVerificationService,
    AuthContextService,
    AuthService,
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  controllers: [AuthController],
  exports: [TokenVerificationService, AuthContextService, AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        ...PUBLIC_ROUTES.flatMap((path) => [
          { path, method: RequestMethod.ALL },
          { path: `api/${path}`, method: RequestMethod.ALL },
        ]),
      )
      .forRoutes('*');
  }
}
