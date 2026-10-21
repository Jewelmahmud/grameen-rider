import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body()
    payload: {
      phone?: string;
      email?: string;
      password: string;
      mfaCode?: string;
    },
  ) {
    return this.authService.login(payload);
  }

  @Post('register')
  async register(
    @Body()
    payload: {
      roleName: 'grameen_ride_driver' | 'customer';
      phone: string;
      password: string;
      firstName: string;
      lastName: string;
      email?: string;
    },
  ) {
    return this.authService.register(payload);
  }
}
