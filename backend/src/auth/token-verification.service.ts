import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
import CircuitBreaker = require('opossum');
import { GilabClient } from './gilab.client';

export interface VerifiedToken {
  sub: string;
  roles: string[];
  permissions: string[];
  exp: number;
}

interface IntrospectionResponse {
  active: boolean;
  sub?: string;
  exp?: number;
  iss?: string;
  aud?: string;
}

const CACHE_PREFIX = 'auth:token:';
const NEGATIVE_CACHE_SECONDS = 30;

/**
 * Verifies GiLab access tokens with POST /oauth/introspect and caches the result until the token
 * expires (ADR-001). GiLab signs with a shared HS256 secret we deliberately don't hold.
 *
 * Once GiLab says a token string is active, its payload can be decoded without re-verifying the
 * signature: GiLab has just vouched for those exact bytes.
 */
@Injectable()
export class TokenVerificationService {
  private readonly logger = new Logger(TokenVerificationService.name);
  private readonly breaker: CircuitBreaker<[string], IntrospectionResponse>;

  constructor(
    private readonly config: ConfigService,
    private readonly gilab: GilabClient,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.breaker = new CircuitBreaker((token: string) => this.introspect(token), {
      timeout: parseInt(this.config.get('CIRCUIT_BREAKER_TIMEOUT') || '5000', 10),
      errorThresholdPercentage: parseInt(this.config.get('CIRCUIT_BREAKER_THRESHOLD') || '50', 10),
      resetTimeout: parseInt(this.config.get('CIRCUIT_BREAKER_RESET_TIMEOUT') || '30000', 10),
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
    });
    this.breaker.on('open', () => this.logger.warn('Auth introspection circuit opened'));
    this.breaker.on('close', () => this.logger.log('Auth introspection circuit closed'));
  }

  async verify(token: string): Promise<VerifiedToken> {
    if (!token) throw this.invalid('No token provided', 'MISSING_TOKEN');

    const key = CACHE_PREFIX + createHash('sha256').update(token).digest('hex');
    const cached = await this.cacheGet(key);
    if (cached === 'inactive') throw this.invalid('Invalid or expired token', 'INVALID_TOKEN');
    if (cached) {
      const parsed = JSON.parse(cached) as VerifiedToken;
      if (parsed.exp * 1000 > Date.now()) return parsed;
    }

    let result: IntrospectionResponse;
    try {
      result = await this.breaker.fire(token);
    } catch (error) {
      this.logger.warn(`Token introspection unavailable: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException({
        error: 'Auth service unavailable',
        code: 'AUTH_SERVICE_UNAVAILABLE',
      });
    }

    const verified = this.check(token, result);
    if (!verified) {
      await this.cacheSet(key, 'inactive', NEGATIVE_CACHE_SECONDS);
      throw this.invalid('Invalid or expired token', 'INVALID_TOKEN');
    }

    const ttl = verified.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await this.cacheSet(key, JSON.stringify(verified), ttl);
    return verified;
  }

  private check(token: string, result: IntrospectionResponse): VerifiedToken | null {
    if (!result?.active) return null;

    const issuer = this.config.get<string>('GILAB_TOKEN_ISSUER') || 'grameen-auth-server';
    const audience = this.config.get<string>('GILAB_TOKEN_AUDIENCE') || 'grameen-applications';
    if (result.iss && result.iss !== issuer) return null;
    if (result.aud && result.aud !== audience) return null;

    const payload = jwt.decode(token) as jwt.JwtPayload | null;
    if (!payload?.sub || (result.sub && payload.sub !== result.sub)) return null;
    if (payload.iss !== issuer || payload.aud !== audience) return null;

    const exp = result.exp ?? payload.exp;
    if (!exp || exp * 1000 <= Date.now()) return null;

    return {
      sub: payload.sub,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      exp,
    };
  }

  private introspect(token: string): Promise<IntrospectionResponse> {
    return this.gilab.call<IntrospectionResponse>('introspect', {
      body: { token, token_type_hint: 'access_token' },
    });
  }

  private invalid(error: string, code: string) {
    return new UnauthorizedException({ error, code });
  }

  // Redis is a cache here: if it's down, every request just introspects.
  private async cacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      /* cache only */
    }
  }
}
