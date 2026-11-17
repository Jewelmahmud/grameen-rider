import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GilabClient, normaliseBdPhone } from './gilab.client';
import { UserProfilesService } from '../user-profiles/user-profiles.service';
import {
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  SendOtpDto,
  VerifyPhoneDto,
} from './dto/auth.dto';

/**
 * Proxies GiLab login / registration so the backend sees every successful login and can store
 * the employee fields (`isEmployee`, `designation`) and role details that tokens don't carry.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userProfilesService: UserProfilesService,
    private readonly gilab: GilabClient,
  ) {}

  async login(payload: LoginDto, endUserIp?: string) {
    if (!payload.phone && !payload.email) {
      throw new BadRequestException({ code: 'MISSING_CREDENTIALS', message: 'Phone or email is required' });
    }
    if (!payload.password && !payload.mfaCode) {
      throw new BadRequestException({ code: 'PASSWORD_REQUIRED', message: 'Password or OTP is required' });
    }
    const body = { ...payload, ...(payload.phone ? { phone: normaliseBdPhone(payload.phone) } : {}) };
    const data = await this.gilab.call('login', { body, endUserIp });
    await this.syncProfile(data);
    return data;
  }

  async sendOtp(payload: SendOtpDto, endUserIp?: string) {
    return this.gilab.call('sendOtp', {
      body: { phone: normaliseBdPhone(payload.phone), purpose: payload.purpose ?? 'login' },
      endUserIp,
    });
  }

  async register(payload: RegisterDto, endUserIp?: string) {
    const companyId = this.configService.get<string>('GRAMEEN_RIDE_COMPANY_ID');
    if (!companyId) {
      this.logger.warn('GRAMEEN_RIDE_COMPANY_ID is not set; GiLab registration will reject the request');
    }
    const data = await this.gilab.call('register', {
      body: { ...payload, phone: normaliseBdPhone(payload.phone), ...(companyId ? { companyId } : {}) },
      endUserIp,
    });
    await this.syncProfile(data);
    return data;
  }

  async verifyPhone(payload: VerifyPhoneDto, endUserIp?: string) {
    return this.gilab.call('verifyPhone', {
      body: { phone: normaliseBdPhone(payload.phone), code: payload.code },
      endUserIp,
    });
  }

  async resendVerification(payload: ResendVerificationDto, endUserIp?: string) {
    return this.gilab.call('resendVerification', {
      body: { ...payload, ...(payload.phone ? { phone: normaliseBdPhone(payload.phone) } : {}) },
      endUserIp,
    });
  }

  async refresh(refreshToken: string) {
    return this.gilab.call('refresh', { body: { refreshToken } });
  }

  async logout(accessToken: string, refreshToken?: string) {
    return this.gilab.call('logout', {
      bearer: accessToken,
      body: refreshToken ? { refreshToken } : {},
    });
  }

  private async syncProfile(data: any) {
    const user = data?.user ?? data?.data;
    if (!data?.success || !user?.id) return;
    try {
      await this.userProfilesService.syncUserProfileFromAuthResponse(data);
    } catch (error) {
      // Login must not fail because our own profile copy couldn't be written.
      this.logger.error(`Profile sync failed for ${user.id}`, error instanceof Error ? error.stack : error);
    }
  }
}
