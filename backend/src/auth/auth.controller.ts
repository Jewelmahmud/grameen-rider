import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResendVerificationDto,
  SendOtpDto,
  VerifyPhoneDto,
} from './dto/auth.dto';

/**
 * Public except /auth/logout (see AuthModule exclusions). Responses are GiLab's, passed through,
 * so clients get `{ success, user, tokens }` exactly as GiLab documents it.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() payload: LoginDto, @Ip() ip: string) {
    return this.authService.login(payload, ip);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() payload: SendOtpDto, @Ip() ip: string) {
    return this.authService.sendOtp(payload, ip);
  }

  @Post('register')
  register(@Body() payload: RegisterDto, @Ip() ip: string) {
    return this.authService.register(payload, ip);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  verifyPhone(@Body() payload: VerifyPhoneDto, @Ip() ip: string) {
    return this.authService.verifyPhone(payload, ip);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() payload: ResendVerificationDto, @Ip() ip: string) {
    return this.authService.resendVerification(payload, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() payload: RefreshDto) {
    return this.authService.refresh(payload.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Body() payload: LogoutDto) {
    return this.authService.logout(req.accessToken!, payload.refreshToken);
  }
}
