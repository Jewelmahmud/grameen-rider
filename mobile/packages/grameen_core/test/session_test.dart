import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grameen_core/grameen_core.dart';

import 'fake_adapter.dart';

void main() {
  const config = GrameenConfig(serverUrl: 'http://test.local');
  const profileJson = {
    'id': 'profile-1',
    'authUserId': 'auth-1',
    'phoneNumber': '+8801700000001',
    'firstName': 'Rahim',
    'lastName': 'Uddin',
    'userType': 'passenger',
  };

  ({Session session, InMemoryTokenStore store, FakeAdapter adapter, ApiClient client})
      build(Map<String, FakeHandler> routes, {AuthTokens? tokens}) {
    final store = InMemoryTokenStore(tokens);
    final adapter = FakeAdapter(routes);
    final client = ApiClient(
      config: config,
      tokenStore: store,
      dio: Dio()..httpClientAdapter = adapter,
    );
    final session = Session(client: client, api: GrameenApi(client));
    return (session: session, store: store, adapter: adapter, client: client);
  }

  test('login stores tokens and loads the profile', () async {
    final t = build({
      'POST /api/auth/login': (_) => const FakeResponse(200, {
            'success': true,
            'user': {'id': 'auth-1'},
            'tokens': {'accessToken': 'tok', 'refreshToken': 'ref', 'expiresIn': 900},
          }),
      'GET /api/user-profiles/me': (r) => r.headers['Authorization'] == 'Bearer tok'
          ? const FakeResponse(200, profileJson)
          : const FakeResponse(401, {'message': 'no token'}),
    });

    await t.session.login(phone: '+8801700000001', password: 'Password123!');

    expect(t.session.status, SessionStatus.signedIn);
    expect(t.session.profile!.id, 'profile-1');
    expect(t.session.profile!.fullName, 'Rahim Uddin');
    expect(t.store.cached!.refreshToken, 'ref');
  });

  test('a token the backend rejects is not reported as a wrong password', () async {
    final t = build({
      'POST /api/auth/login': (_) =>
          const FakeResponse(200, {'success': true, 'tokens': {'accessToken': 'tok'}}),
      'GET /api/user-profiles/me': (_) => const FakeResponse(401, {
            'statusCode': 401,
            'error': 'Invalid or expired token',
            'code': 'INVALID_TOKEN',
          }),
    });

    final error = await t.session
        .login(phone: '+8801700000001', password: 'right')
        .then<ApiException?>((_) => null, onError: (Object e) => e as ApiException);

    expect(error!.code, Session.tokenRejectedCode);
    expect(error.isUnauthorized, isFalse);
    expect(t.session.isSignedIn, isFalse);
    expect(t.store.cached, isNull);
  });

  test('register reports when the phone must be verified first', () async {
    final t = build({
      'POST /api/auth/register': (_) => const FakeResponse(201, {'success': true, 'data': {'id': 'auth-3'}}),
      'POST /api/auth/login': (_) => const FakeResponse(401, {
            'statusCode': 401,
            'code': 'VERIFICATION_REQUIRED',
            'message': 'Verify your phone',
          }),
    });

    final outcome = await t.session.register(
      role: RegistrationRole.customer,
      phone: '01700000003',
      password: 'Password123!',
      firstName: 'Nadia',
      lastName: 'Akter',
    );

    expect(outcome, RegistrationOutcome.verificationRequired);
    expect(t.session.isSignedIn, isFalse);
  });

  test('code login sends the OTP as mfaCode', () async {
    final t = build({
      'POST /api/auth/otp/send': (_) => const FakeResponse(200, {'success': true}),
      'POST /api/auth/login': (r) => (r.data as Map)['mfaCode'] == '123456'
          ? const FakeResponse(200, {'success': true, 'tokens': {'accessToken': 'tok'}})
          : const FakeResponse(401, {'code': 'AUTH_FAILED'}),
      'GET /api/user-profiles/me': (_) => const FakeResponse(200, profileJson),
    });

    await t.session.sendLoginCode('01700000001');
    await t.session.loginWithCode(phone: '01700000001', code: '123456');

    expect(t.session.isSignedIn, isTrue);
    expect(t.adapter.requests.first.data, {'phone': '01700000001', 'purpose': 'login'});
  });

  test('restore refreshes an expired token instead of logging out', () async {
    final t = build({
      'POST /api/auth/refresh': (_) => const FakeResponse(200, {'tokens': {'accessToken': 'new', 'expiresIn': 900}}),
      'GET /api/user-profiles/me': (r) => r.headers['Authorization'] == 'Bearer new'
          ? const FakeResponse(200, profileJson)
          : const FakeResponse(401, {}),
    }, tokens: AuthTokens(accessToken: 'old', refreshToken: 'ref', expiresAt: DateTime.now().subtract(const Duration(hours: 1))));

    await t.session.restore();

    expect(t.session.isSignedIn, isTrue);
  });

  test('logout ends the GiLab session with the refresh token', () async {
    final t = build({
      'GET /api/user-profiles/me': (_) => const FakeResponse(200, profileJson),
      'POST /api/auth/logout': (_) => const FakeResponse(200, {'success': true}),
    }, tokens: const AuthTokens(accessToken: 'tok', refreshToken: 'ref'));
    await t.session.restore();

    await t.session.logout();

    expect(t.adapter.requests.last.data, {'refreshToken': 'ref'});
    expect(t.session.status, SessionStatus.signedOut);
    expect(t.store.cached, isNull);
  });

  test('register falls back to login when no tokens come back', () async {
    final t = build({
      'POST /api/auth/register': (_) =>
          const FakeResponse(201, {'success': true, 'user': {'id': 'auth-2'}}),
      'POST /api/auth/login': (_) =>
          const FakeResponse(200, {'success': true, 'tokens': {'accessToken': 'tok'}}),
      'GET /api/user-profiles/me': (_) => const FakeResponse(200, profileJson),
    });

    final outcome = await t.session.register(
      role: RegistrationRole.driver,
      phone: '+8801700000002',
      password: 'Password123!',
      firstName: 'Karim',
      lastName: 'Ali',
    );

    expect(outcome, RegistrationOutcome.signedIn);
    expect(t.session.isSignedIn, isTrue);
    expect(t.adapter.requests.first.data['roleName'], 'grameen_ride_driver');
    expect(t.adapter.requests.first.data.containsKey('email'), isFalse);
  });

  test('restore without tokens signs out', () async {
    final t = build({});
    await t.session.restore();
    expect(t.session.status, SessionStatus.signedOut);
    expect(t.adapter.requests, isEmpty);
  });

  test('restore with a rejected token clears it', () async {
    final t = build(
      {'GET /api/user-profiles/me': (_) => const FakeResponse(401, {'message': 'expired'})},
      tokens: const AuthTokens(accessToken: 'old'),
    );

    await t.session.restore();

    expect(t.session.status, SessionStatus.signedOut);
    expect(t.store.cached, isNull);
  });

  test('restore keeps credentials when the server is unreachable', () async {
    final t = build(
      {'GET /api/user-profiles/me': (_) => const FakeResponse(503, {'message': 'down'})},
      tokens: const AuthTokens(accessToken: 'tok'),
    );

    await expectLater(t.session.restore(), throwsA(isA<ApiException>()));

    expect(t.session.status, SessionStatus.unknown);
    expect(t.store.cached, isNotNull);
  });

  test('a 401 on any call while signed in logs out', () async {
    final t = build({
      'GET /api/user-profiles/me': (_) => const FakeResponse(200, profileJson),
      'GET /api/trips': (_) => const FakeResponse(401, {'message': 'expired'}),
    }, tokens: const AuthTokens(accessToken: 'tok'));
    await t.session.restore();
    expect(t.session.isSignedIn, isTrue);

    await expectLater(GrameenApi(t.client).trips.mine(), throwsA(isA<ApiException>()));
    await Future<void>.delayed(Duration.zero);

    expect(t.session.status, SessionStatus.signedOut);
    expect(t.store.cached, isNull);
  });
}
