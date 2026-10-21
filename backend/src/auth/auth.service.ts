import { Injectable, UnauthorizedException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { UserProfilesService } from '../user-profiles/user-profiles.service';

interface AuthLoginPayload {
  phone?: string;
  email?: string;
  password: string;
  mfaCode?: string;
}

interface AuthRegistrationPayload {
  roleName: 'grameen_ride_driver' | 'customer';
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
}

@Injectable()
export class AuthService {
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly userProfilesService: UserProfilesService,
  ) {
    this.axiosInstance = axios.create({
      timeout: parseInt(this.configService.get('AUTH_SERVER_TIMEOUT') || '5000'),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async login(payload: AuthLoginPayload) {
    const loginUrl =
      this.configService.get('AUTH_SERVER_URL') ||
      'https://auth.grameenbazaar.com/oauth/login';

    try {
      const { data } = await this.axiosInstance.post(loginUrl, payload);

      if (data?.success && data?.user?.id) {
        await this.userProfilesService.syncUserProfileFromAuthResponse(data);
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          throw new UnauthorizedException(error.response.data);
        }
        throw new BadGatewayException(error.response.data);
      }

      throw new BadGatewayException('Auth server login request failed');
    }
  }

  async register(payload: AuthRegistrationPayload) {
    const registrationUrl =
      this.configService.get('AUTH_SERVER_REGISTRATION_URL') ||
      'https://auth.grameenbazaar.com/api/v1/registration';

    try {
      const { data } = await this.axiosInstance.post(registrationUrl, payload);

      if (data?.success && data?.user?.id) {
        await this.userProfilesService.syncUserProfileFromAuthResponse(data);
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          throw new UnauthorizedException(error.response.data);
        }
        throw new BadGatewayException(error.response.data);
      }

      throw new BadGatewayException('Auth server registration request failed');
    }
  }
}
