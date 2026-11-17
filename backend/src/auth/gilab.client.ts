import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Thin HTTP client for the GiLab auth server (see grameenauthserver/docs/authserver.md).
 *
 * Every call sends X-Application-ID. Calls that GiLab rate-limits per IP (login, OTP, phone
 * verification) also send the trusted-server headers, so GiLab limits per end user instead of
 * per our server IP. Without them, five wrong passwords anywhere would lock out every user.
 */
export type GilabEndpoint =
  | 'login'
  | 'sendOtp'
  | 'register'
  | 'verifyPhone'
  | 'resendVerification'
  | 'refresh'
  | 'logout'
  | 'introspect'
  | 'me';

interface EndpointDef {
  path: string;
  /** Config key fragment: AUTH_SERVER_<KEY>_PATH and AUTH_SERVER_<KEY>_URL override the default. */
  key: string;
  method: 'GET' | 'POST';
  /** GiLab counts failed calls to this route per client IP. */
  rateLimitedPerIp?: boolean;
}

const ENDPOINTS: Record<GilabEndpoint, EndpointDef> = {
  login: { path: '/oauth/login', key: 'LOGIN', method: 'POST', rateLimitedPerIp: true },
  sendOtp: { path: '/oauth/send-otp', key: 'SEND_OTP', method: 'POST', rateLimitedPerIp: true },
  register: { path: '/api/v1/registration', key: 'REGISTRATION', method: 'POST' },
  verifyPhone: { path: '/oauth/verify-phone', key: 'VERIFY_PHONE', method: 'POST', rateLimitedPerIp: true },
  resendVerification: {
    path: '/oauth/resend-verification',
    key: 'RESEND_VERIFICATION',
    method: 'POST',
    rateLimitedPerIp: true,
  },
  refresh: { path: '/oauth/refresh', key: 'REFRESH', method: 'POST' },
  logout: { path: '/oauth/logout', key: 'LOGOUT', method: 'POST' },
  introspect: { path: '/oauth/introspect', key: 'INTROSPECT', method: 'POST' },
  me: { path: '/oauth/me', key: 'ME', method: 'GET' },
};

const DEFAULT_AUTH_SERVER_URL = 'https://auth.grameenbazaar.com';
const CLIENT_ERROR_STATUSES = new Set([400, 403, 404, 409, 422, 429]);

export interface GilabRequestOptions {
  body?: unknown;
  bearer?: string;
  /** End user's IP, forwarded so GiLab rate-limits per user (trusted server apps only). */
  endUserIp?: string;
}

@Injectable()
export class GilabClient {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(GilabClient.name);

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      timeout: parseInt(this.config.get('AUTH_SERVER_TIMEOUT') || '5000', 10),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  url(endpoint: GilabEndpoint): string {
    const def = ENDPOINTS[endpoint];
    const fullUrl = this.config.get<string>(`AUTH_SERVER_${def.key}_URL`);
    if (fullUrl) return fullUrl;

    const base = (this.config.get<string>('AUTH_SERVER_URL') || DEFAULT_AUTH_SERVER_URL).replace(/\/+$/, '');
    const path = this.config.get<string>(`AUTH_SERVER_${def.key}_PATH`) || def.path;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async call<T = any>(endpoint: GilabEndpoint, options: GilabRequestOptions = {}): Promise<T> {
    const def = ENDPOINTS[endpoint];
    const url = this.url(endpoint);
    const headers = this.headers(def, options);

    try {
      const { data } =
        def.method === 'GET'
          ? await this.http.get(url, { headers })
          : await this.http.post(url, options.body ?? {}, { headers });
      return data as T;
    } catch (error) {
      throw this.mapError(error, endpoint, url);
    }
  }

  private headers(def: EndpointDef, options: GilabRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    const applicationId = this.config.get<string>('GILAB_APPLICATION_ID');
    if (applicationId) headers['X-Application-ID'] = applicationId;
    if (options.bearer) headers['Authorization'] = `Bearer ${options.bearer}`;

    const clientSecret = this.config.get<string>('GILAB_CLIENT_SECRET');
    const ip = normaliseIp(options.endUserIp);
    if (def.rateLimitedPerIp && applicationId && clientSecret && ip) {
      headers['X-Client-Secret'] = clientSecret;
      headers['X-End-User-IP'] = ip;
    }
    return headers;
  }

  private mapError(error: unknown, endpoint: GilabEndpoint, url: string): Error {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      if (status === 401) return new UnauthorizedException(data);
      // The caller's own mistakes (bad input, duplicate phone, rate limit) keep their status;
      // anything else means the auth server failed.
      if (CLIENT_ERROR_STATUSES.has(status)) return new HttpException(data, status);
      this.logger.warn(`Auth server ${endpoint} failed: ${url} -> ${status}`);
      return new BadGatewayException(data);
    }

    this.logger.warn(
      `Auth server ${endpoint} request to ${url} failed: ${error instanceof Error ? error.message : error}`,
    );
    return new BadGatewayException(`Auth server ${endpoint} request failed`);
  }
}

/** Strips the IPv4-mapped IPv6 prefix Node reports (::ffff:10.0.0.1 → 10.0.0.1). */
export function normaliseIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  const trimmed = ip.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

/** GiLab's role-based registration only accepts 01XXXXXXXXX; it treats +8801…/8801… as the same number. */
export function normaliseBdPhone(phone: string): string {
  const digits = (phone || '').replace(/[\s-]/g, '');
  if (digits.startsWith('+880')) return `0${digits.slice(4)}`;
  if (digits.startsWith('880') && digits.length === 13) return `0${digits.slice(3)}`;
  return digits;
}
