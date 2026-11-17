import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grameen_core/grameen_core.dart';

import 'fake_adapter.dart';

void main() {
  const config = GrameenConfig(serverUrl: 'http://test.local');

  ({ApiClient client, FakeAdapter adapter}) build(
    Map<String, FakeHandler> routes, {
    AuthTokens? tokens,
  }) {
    final adapter = FakeAdapter(routes);
    final client = ApiClient(
      config: config,
      tokenStore: InMemoryTokenStore(tokens),
      dio: Dio()..httpClientAdapter = adapter,
    );
    return (client: client, adapter: adapter);
  }

  test('prefixes /api and sends the bearer token', () async {
    final t = build(
      {'GET /api/user-profiles/me': (_) => const FakeResponse(200, {'id': 'p1'})},
      tokens: const AuthTokens(accessToken: 'abc'),
    );

    await t.client.get('/user-profiles/me');

    final request = t.adapter.requests.single;
    expect(request.uri.toString(), 'http://test.local/api/user-profiles/me');
    expect(request.headers['Authorization'], 'Bearer abc');
  });

  test('omits the token on unauthenticated calls', () async {
    final t = build(
      {'POST /api/auth/login': (_) => const FakeResponse(200, {})},
      tokens: const AuthTokens(accessToken: 'abc'),
    );

    await t.client.post('/auth/login', data: {}, authenticated: false);

    expect(t.adapter.requests.single.headers.containsKey('Authorization'), isFalse);
  });

  test('maps validation errors with a message list', () async {
    final t = build({
      'POST /api/trips': (_) => const FakeResponse(400, {
            'statusCode': 400,
            'message': ['pickupAddress is required', 'vehicleType is invalid'],
            'error': 'Bad Request',
          }),
    });

    final error = await t.client
        .post('/trips', data: {})
        .then<ApiException?>((_) => null, onError: (Object e) => e as ApiException);

    expect(error!.kind, ApiErrorKind.badRequest);
    expect(error.message, 'pickupAddress is required');
    expect(error.details, hasLength(2));
  });

  test('reads nested auth-server messages and error codes', () {
    final error = ApiException.fromResponse(401, {
      'statusCode': 401,
      'message': {'success': false, 'message': 'Invalid credentials'},
      'code': 'INVALID_CREDENTIALS',
    });

    expect(error.isUnauthorized, isTrue);
    expect(error.message, 'Invalid credentials');
    expect(error.code, 'INVALID_CREDENTIALS');
  });

  test('reads auth-server errors forwarded inside a 502', () {
    final error = ApiException.fromResponse(502, {
      'statusCode': 502,
      'message': {
        'success': false,
        'error': {
          'message': 'Route not found',
          'code': 'ROUTE_NOT_FOUND',
          'statusCode': 404,
        },
      },
    });

    expect(error.kind, ApiErrorKind.server);
    expect(error.message, 'Route not found');
    expect(error.code, 'ROUTE_NOT_FOUND');
  });

  test('prefers the nested auth-server message over the generic one', () {
    // Shape the backend's exception filter actually returns (seen live).
    final error = ApiException.fromResponse(400, {
      'statusCode': 400,
      'error': {
        'message': 'Password is required unless logging in with OTP (mfaCode)',
        'code': 'PASSWORD_REQUIRED',
        'statusCode': 400,
      },
      'message': 'Http Exception',
      'path': '/api/auth/login',
    });

    expect(error.kind, ApiErrorKind.badRequest);
    expect(error.message, startsWith('Password is required'));
    expect(error.code, 'PASSWORD_REQUIRED');
  });

  test('calls onUnauthorized only when a token was sent', () async {
    var calls = 0;
    final routes = {
      'GET /api/trips': (_) => const FakeResponse(401, {'message': 'expired'}),
    };

    final withToken = build(routes, tokens: const AuthTokens(accessToken: 'x'));
    withToken.client.onUnauthorized = () => calls++;
    await expectLater(withToken.client.get('/trips'), throwsA(isA<ApiException>()));

    final withoutToken = build(routes);
    withoutToken.client.onUnauthorized = () => calls++;
    await expectLater(withoutToken.client.get('/trips'), throwsA(isA<ApiException>()));

    expect(calls, 1);
  });

  test('DriversApi.me returns null when the driver profile does not exist', () async {
    final t = build({
      'GET /api/drivers/me': (_) => const FakeResponse(404, {'message': 'Driver not found'}),
    });

    expect(await GrameenApi(t.client).drivers.me(), isNull);
  });

  test('quote sends the trip and parses prices per vehicle', () async {
    final t = build({
      'POST /api/pricing/quote': (_) => const FakeResponse(200, {
            'serviceType': 'rental',
            'currency': 'BDT',
            'expiresAt': '2026-11-17T10:10:00.000Z',
            'quotes': [
              {
                'quoteId': 'q1',
                'serviceType': 'rental',
                'vehicleType': 'car',
                'pricingMode': 'distance',
                'distanceKm': 12.4,
                'chargedKm': 18.6,
                'durationMinutes': 30,
                'roundTrip': true,
                'scheduledAt': '2026-11-18T04:00:00.000Z',
                'fare': 1240,
                'breakdown': {'baseFare': 300, 'distanceFare': 940, 'timeFare': 0, 'extraPassengerFare': 0, 'nightSurcharge': 0},
                'discount': 124,
                'discountSource': 'employee',
                'total': 1116,
                'expiresAt': '2026-11-17T10:10:00.000Z',
              },
            ],
          }),
    });

    final response = await GrameenApi(t.client).pricing.quote(QuoteRequest(
          serviceType: ServiceType.rental,
          pickup: const GeoPoint(address: 'Mirpur 10', latitude: 23.8041, longitude: 90.3654),
          dropoff: const GeoPoint(address: 'Savar', latitude: 23.8583, longitude: 90.2667),
          stops: const [GeoPoint(address: 'Gabtoli', latitude: 23.7840, longitude: 90.3440)],
          roundTrip: true,
          scheduledAt: DateTime.utc(2026, 11, 18, 4),
        ));

    final q = response.quotes.single;
    expect(q.quoteId, 'q1');
    expect(q.vehicleType, VehicleType.car);
    expect(q.discountSource, DiscountSource.employee);
    expect(q.total, 1116);
    expect(q.breakdown.distanceFare, 940);
    final body = t.adapter.requests.single.data as Map;
    expect(body['serviceType'], 'rental');
    expect(body['roundTrip'], true);
    expect(body['stops'], hasLength(1));
    expect(body['scheduledAt'], '2026-11-18T04:00:00.000Z');
    expect(body.containsKey('vehicleType'), isFalse);
  });

  test('booking sends only the quote id and choices, never a price', () async {
    final t = build({'POST /api/trips': (_) => const FakeResponse(201, {'id': 't1', 'status': 'searching_driver'})});

    await GrameenApi(t.client).trips.create(const CreateTripRequest(quoteId: 'q1', promotionCode: 'EID10'));

    expect(t.adapter.requests.single.data, {'quoteId': 'q1', 'paymentMethod': 'cash', 'promotionCode': 'EID10'});
  });

  test('cancel sends only the reason', () async {
    final t = build({'PUT /api/trips/t1/cancel': (_) => const FakeResponse(200, {'id': 't1', 'status': 'cancelled'})});
    await GrameenApi(t.client).trips.cancel('t1', reason: 'Changed plans');
    expect(t.adapter.requests.single.data, {'cancellationReason': 'Changed plans'});
  });

  group('token refresh', () {
    test('a 401 refreshes once and retries with the new token', () async {
      var unauthorized = 0;
      final t = build({
        'GET /api/trips': (r) => r.headers['Authorization'] == 'Bearer new'
            ? const FakeResponse(200, [])
            : const FakeResponse(401, {'code': 'INVALID_TOKEN'}),
        'POST /api/auth/refresh': (r) => (r.data as Map)['refreshToken'] == 'ref'
            ? const FakeResponse(200, {'success': true, 'tokens': {'accessToken': 'new', 'expiresIn': 900}})
            : const FakeResponse(401, {}),
      }, tokens: const AuthTokens(accessToken: 'old', refreshToken: 'ref'));
      t.client.onUnauthorized = () => unauthorized++;

      expect(await GrameenApi(t.client).trips.mine(), isEmpty);
      expect(unauthorized, 0);
      // GiLab doesn't rotate refresh tokens: the old one is kept.
      expect(t.client.tokenStore.cached!.accessToken, 'new');
      expect(t.client.tokenStore.cached!.refreshToken, 'ref');
    });

    test('an expired access token is refreshed before the request', () async {
      final t = build({
        'POST /api/auth/refresh': (_) => const FakeResponse(200, {'tokens': {'accessToken': 'new', 'expiresIn': 900}}),
        'GET /api/user-profiles/me': (r) => FakeResponse(200, {'id': 'p1', 'auth': r.headers['Authorization']}),
      }, tokens: AuthTokens(accessToken: 'old', refreshToken: 'ref', expiresAt: DateTime.now().subtract(const Duration(minutes: 1))));

      final me = await t.client.get('/user-profiles/me') as Map;

      expect(me['auth'], 'Bearer new');
      expect(t.adapter.requests.map((r) => r.uri.path), ['/api/auth/refresh', '/api/user-profiles/me']);
    });

    test('concurrent requests share one refresh', () async {
      final t = build({
        'POST /api/auth/refresh': (_) => const FakeResponse(200, {'tokens': {'accessToken': 'new', 'expiresIn': 900}}),
        'GET /api/trips': (_) => const FakeResponse(200, []),
      }, tokens: AuthTokens(accessToken: 'old', refreshToken: 'ref', expiresAt: DateTime.now().subtract(const Duration(minutes: 1))));

      await Future.wait([t.client.get('/trips'), t.client.get('/trips'), t.client.get('/trips')]);

      expect(t.adapter.requests.where((r) => r.uri.path == '/api/auth/refresh'), hasLength(1));
    });

    test('a refused refresh logs out once', () async {
      var unauthorized = 0;
      final t = build({
        'GET /api/trips': (_) => const FakeResponse(401, {}),
        'POST /api/auth/refresh': (_) => const FakeResponse(401, {'code': 'AUTH_FAILED'}),
      }, tokens: const AuthTokens(accessToken: 'old', refreshToken: 'dead'));
      t.client.onUnauthorized = () => unauthorized++;

      await expectLater(t.client.get('/trips'), throwsA(isA<ApiException>()));
      expect(unauthorized, 1);
    });
  });

  test('error codes the apps react to have named checks', () {
    expect(ApiException.fromResponse(409, {'code': 'QUOTE_EXPIRED', 'message': 'x'}).isQuoteExpired, isTrue);
    expect(ApiException.fromResponse(409, {'code': 'OFFER_NO_LONGER_AVAILABLE', 'message': 'x'}).isOfferGone, isTrue);
    expect(ApiException.fromResponse(401, {'code': 'VERIFICATION_REQUIRED', 'message': 'x'}).isVerificationRequired, isTrue);
    expect(ApiException.fromResponse(429, {'message': 'slow down'}).isRateLimited, isTrue);
  });

  test('driver current offer is null when nothing is offered', () async {
    final t = build({'GET /api/drivers/me/offers/current': (_) => const FakeResponse(200, null)});
    expect(await GrameenApi(t.client).drivers.currentOffer(), isNull);
  });
}
