import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker = require('opossum');
import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';

interface JWTPayload {
  sub: string; // User ID (UUID)
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  roles?: string[];
  permissions?: string[];
}

interface AuthValidationResult {
  valid: boolean;
  user?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    roles?: string[];
    permissions?: string[];
  };
  error?: string;
  fromFallback?: boolean;
}

@Injectable()
export class AuthCircuitBreakerService {
  private breaker: CircuitBreaker;
  private axiosInstance: AxiosInstance;
  private jwtSecret: string;

  constructor(
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    const circuitOptions = {
      timeout: parseInt(this.configService.get('CIRCUIT_BREAKER_TIMEOUT') || '5000'),
      errorThresholdPercentage: parseInt(this.configService.get('CIRCUIT_BREAKER_THRESHOLD') || '50'),
      resetTimeout: parseInt(this.configService.get('CIRCUIT_BREAKER_RESET_TIMEOUT') || '30000'),
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
    };

    this.breaker = new CircuitBreaker(
      async (token: string) => await this.validateWithAuthServer(token),
      circuitOptions,
    );

    this.breaker.fallback(() => ({
      valid: false,
      error: 'Auth service unavailable',
      fromFallback: true,
    }));

    this.breaker.on('open', () => console.warn('Auth circuit breaker opened'));
    this.breaker.on('close', () => console.info('Auth circuit breaker closed'));
    this.breaker.on('halfOpen', () => console.info('Auth circuit breaker half-open'));

    const authServerUrl = this.configService.get('AUTH_SERVER_URL');
    const timeout = parseInt(this.configService.get('AUTH_SERVER_TIMEOUT') || '5000');

    this.axiosInstance = axios.create({
      baseURL: authServerUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.jwtSecret = this.configService.get('AUTH_SERVER_JWT_SECRET');
  }

  async validateToken(token: string): Promise<AuthValidationResult> {
    // Option 1: Validate JWT locally if secret is available
    if (this.jwtSecret) {
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
        
        return {
          valid: true,
          user: {
            id: decoded.sub,
            roles: decoded.roles || [],
            permissions: decoded.permissions || [],
          },
        };
      } catch (jwtError) {
        return {
          valid: false,
          error: 'Invalid or expired token',
        };
      }
    }

    // Option 2: Validate token with Auth Server API (with circuit breaker)
    try {
      return await this.breaker.fire(token);
    } catch (error) {
      return {
        valid: false,
        error: 'Token validation failed',
        fromFallback: true,
      };
    }
  }

  private async validateWithAuthServer(token: string): Promise<AuthValidationResult> {
    const endpoint = this.configService.get('AUTH_SERVER_VALIDATE_ENDPOINT') || '/api/auth/validate';
    
    try {
      const response = await this.axiosInstance.post(endpoint, { token });
      
      if (response.data.valid && response.data.user) {
        return {
          valid: true,
          user: {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            phone: response.data.user.phone,
            roles: response.data.user.roles || [],
            permissions: response.data.user.permissions || [],
          },
        };
      }
      
      return {
        valid: false,
        error: 'Invalid token',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Auth server error: ${error.message}`);
      }
      throw error;
    }
  }
}

