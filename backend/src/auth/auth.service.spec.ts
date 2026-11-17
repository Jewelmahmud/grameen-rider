import axios from 'axios';
import { BadGatewayException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GilabClient } from './gilab.client';
import { UserProfilesService } from '../user-profiles/user-profiles.service';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { ...actual, __esModule: true, default: { ...actual.default, create: jest.fn() } };
});

const mockedCreate = axios.create as jest.Mock;

describe('AuthService + GilabClient', () => {
  let post: jest.Mock;
  let get: jest.Mock;
  let syncUserProfileFromAuthResponse: jest.Mock;

  const makeService = (env: Record<string, string | undefined>) => {
    const config = { get: jest.fn((key: string) => env[key]) } as unknown as ConfigService;
    return new AuthService(
      config,
      { syncUserProfileFromAuthResponse } as unknown as UserProfilesService,
      new GilabClient(config),
    );
  };

  const axiosError = (status: number, data: unknown = { success: false }) =>
    Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status, data } });

  beforeEach(() => {
    post = jest.fn().mockResolvedValue({ data: { success: true, user: { id: 'auth-1' } } });
    get = jest.fn();
    syncUserProfileFromAuthResponse = jest.fn().mockResolvedValue(undefined);
    mockedCreate.mockReturnValue({ post, get });
  });

  it('appends the login path to an origin-only AUTH_SERVER_URL and normalises the phone', async () => {
    const service = makeService({ AUTH_SERVER_URL: 'https://auth.grameenbazaar.com/' });

    await service.login({ phone: '+8801700000001', password: 'x' });

    expect(post).toHaveBeenCalledWith(
      'https://auth.grameenbazaar.com/oauth/login',
      { phone: '01700000001', password: 'x' },
      { headers: {} },
    );
    expect(syncUserProfileFromAuthResponse).toHaveBeenCalled();
  });

  it('sends the application id, and trusted-server headers only on rate-limited routes', async () => {
    const service = makeService({ GILAB_APPLICATION_ID: 'app-1', GILAB_CLIENT_SECRET: 'secret' });

    await service.login({ phone: '01700000001', password: 'x' }, '::ffff:10.1.2.3');
    expect(post.mock.calls[0][2].headers).toEqual({
      'X-Application-ID': 'app-1',
      'X-Client-Secret': 'secret',
      'X-End-User-IP': '10.1.2.3',
    });

    await service.refresh('refresh-token');
    expect(post.mock.calls[1][2].headers).toEqual({ 'X-Application-ID': 'app-1' });
  });

  it('does not send the client secret without an end-user IP', async () => {
    const service = makeService({ GILAB_APPLICATION_ID: 'app-1', GILAB_CLIENT_SECRET: 'secret' });
    await service.login({ phone: '01700000001', password: 'x' });
    expect(post.mock.calls[0][2].headers).toEqual({ 'X-Application-ID': 'app-1' });
  });

  it('registers with the Grameen Ride company id', async () => {
    const service = makeService({ GRAMEEN_RIDE_COMPANY_ID: 'company-1' });
    post.mockResolvedValueOnce({ data: { success: true, data: { id: 'auth-2' } } });

    await service.register({
      roleName: 'customer',
      phone: '8801700000001',
      password: 'Password1',
      firstName: 'Rahim',
      lastName: 'Uddin',
    });

    expect(post.mock.calls[0][0]).toBe('https://auth.grameenbazaar.com/api/v1/registration');
    expect(post.mock.calls[0][1]).toMatchObject({ phone: '01700000001', companyId: 'company-1' });
    expect(syncUserProfileFromAuthResponse).toHaveBeenCalled();
  });

  it('honours custom paths and full-URL overrides', async () => {
    await makeService({ AUTH_SERVER_URL: 'https://auth.example.com', AUTH_SERVER_LOGIN_PATH: 'v2/login' }).login({
      phone: '01700000001',
      password: 'x',
    });
    expect(post.mock.calls[0][0]).toBe('https://auth.example.com/v2/login');

    await makeService({ AUTH_SERVER_REGISTRATION_URL: 'https://signup.example.com/register' }).register({
      roleName: 'customer',
      phone: '01700000001',
      password: 'Password1',
      firstName: 'A',
      lastName: 'B',
    });
    expect(post.mock.calls[1][0]).toBe('https://signup.example.com/register');
  });

  it('rejects a login without credentials before calling GiLab', async () => {
    const service = makeService({});
    await expect(service.login({ password: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.login({ phone: '01700000001' })).rejects.toBeInstanceOf(BadRequestException);
    expect(post).not.toHaveBeenCalled();
  });

  it('accepts OTP login with mfaCode instead of a password', async () => {
    await makeService({}).login({ phone: '01700000001', mfaCode: '123456' });
    expect(post.mock.calls[0][1]).toEqual({ phone: '01700000001', mfaCode: '123456' });
  });

  it('logs out with the bearer token and the refresh token', async () => {
    await makeService({}).logout('access', 'refresh');
    expect(post).toHaveBeenCalledWith(
      'https://auth.grameenbazaar.com/oauth/logout',
      { refreshToken: 'refresh' },
      { headers: { Authorization: 'Bearer access' } },
    );
  });

  it('maps a 401 to Unauthorized and other auth-server errors to Bad Gateway', async () => {
    const service = makeService({});

    post.mockRejectedValueOnce(axiosError(401));
    await expect(service.login({ phone: 'p', password: 'x' })).rejects.toBeInstanceOf(UnauthorizedException);

    post.mockRejectedValueOnce(axiosError(500));
    await expect(service.login({ phone: 'p', password: 'x' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('passes auth-server client errors through with their own status', async () => {
    const service = makeService({});
    post.mockRejectedValueOnce(axiosError(409, { error: { code: 'USER_EXISTS' } }));

    await expect(
      service.register({ roleName: 'customer', phone: '01700000001', password: 'Password1', firstName: 'A', lastName: 'B' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('still returns the login response when the profile sync fails', async () => {
    syncUserProfileFromAuthResponse.mockRejectedValueOnce(new Error('db down'));
    const result = await makeService({}).login({ phone: '01700000001', password: 'x' });
    expect(result).toEqual({ success: true, user: { id: 'auth-1' } });
  });
});
