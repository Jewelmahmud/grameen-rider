import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TokenVerificationService } from './token-verification.service';
import { GilabClient } from './gilab.client';

const now = () => Math.floor(Date.now() / 1000);
const makeToken = (over: Record<string, unknown> = {}) =>
  jwt.sign(
    {
      sub: 'user-1',
      iss: 'grameen-auth-server',
      aud: 'grameen-applications',
      exp: now() + 600,
      roles: ['customer'],
      permissions: [],
      ...over,
    },
    'not-the-real-secret',
  );

describe('TokenVerificationService', () => {
  let call: jest.Mock;
  let store: Map<string, string>;
  let redis: { get: jest.Mock; set: jest.Mock };
  let service: TokenVerificationService;

  beforeEach(() => {
    call = jest.fn();
    store = new Map();
    redis = {
      get: jest.fn(async (k: string) => store.get(k) ?? null),
      set: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    };
    const config = { get: jest.fn(() => undefined) } as unknown as ConfigService;
    service = new TokenVerificationService(config, { call } as unknown as GilabClient, redis as any);
  });

  it('accepts a token GiLab reports active and reads roles from its payload', async () => {
    const token = makeToken({ roles: ['grameen_ride_admin'] });
    call.mockResolvedValue({ active: true, sub: 'user-1', iss: 'grameen-auth-server', aud: 'grameen-applications' });

    const result = await service.verify(token);

    expect(result).toMatchObject({ sub: 'user-1', roles: ['grameen_ride_admin'] });
    expect(call).toHaveBeenCalledWith('introspect', { body: { token, token_type_hint: 'access_token' } });
  });

  it('serves repeat checks from the cache', async () => {
    const token = makeToken();
    call.mockResolvedValue({ active: true, sub: 'user-1' });

    await service.verify(token);
    await service.verify(token);

    expect(call).toHaveBeenCalledTimes(1);
  });

  it('rejects an inactive token and remembers it briefly', async () => {
    const token = makeToken();
    call.mockResolvedValue({ active: false });

    await expect(service.verify(token)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.verify(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('rejects a token from another issuer or audience', async () => {
    call.mockResolvedValue({ active: true, sub: 'user-1' });
    await expect(service.verify(makeToken({ iss: 'someone-else' }))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.verify(makeToken({ aud: 'other-apps' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the introspected subject differs from the token payload', async () => {
    call.mockResolvedValue({ active: true, sub: 'someone-else' });
    await expect(service.verify(makeToken())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reports the auth service as unavailable when introspection fails', async () => {
    call.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(service.verify(makeToken())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps working when Redis is down', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    redis.set.mockRejectedValue(new Error('redis down'));
    call.mockResolvedValue({ active: true, sub: 'user-1' });
    await expect(service.verify(makeToken())).resolves.toMatchObject({ sub: 'user-1' });
  });
});
