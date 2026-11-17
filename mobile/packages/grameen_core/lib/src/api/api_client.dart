import 'package:dio/dio.dart';

import '../auth/token_store.dart';
import '../config/grameen_config.dart';
import '../models/auth.dart';
import '../models/json.dart';
import 'api_exception.dart';

/// Thin wrapper over Dio for the Grameen Ride REST API.
///
/// Adds the bearer token and turns every failure into [ApiException].
/// Access tokens are short-lived (GiLab: 15 minutes), so the client refreshes
/// them with the stored refresh token: before a request when the token has
/// expired, and once after a 401. Only when the refresh itself is refused does
/// it call [onUnauthorized] so the session can log the user out.
class ApiClient {
  ApiClient({
    required GrameenConfig config,
    required this.tokenStore,
    Dio? dio,
    this.onUnauthorized,
  }) : dio = dio ?? Dio() {
    this.dio.options
      ..baseUrl = config.apiBaseUrl
      ..connectTimeout = config.connectTimeout
      ..receiveTimeout = config.receiveTimeout
      ..contentType = Headers.jsonContentType
      ..responseType = ResponseType.json;
    this.dio.interceptors.add(_AuthInterceptor(this));
  }

  final Dio dio;
  final TokenStore tokenStore;

  /// Called when a request is refused and the session can't be refreshed.
  void Function()? onUnauthorized;

  Future<AuthTokens?>? _refreshing;

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? query,
    bool authenticated = true,
  }) =>
      _send('GET', path, query: query, authenticated: authenticated);

  Future<dynamic> post(String path, {Object? data, bool authenticated = true}) =>
      _send('POST', path, data: data, authenticated: authenticated);

  Future<dynamic> put(String path, {Object? data}) =>
      _send('PUT', path, data: data);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  /// A valid access token, refreshing first if the stored one has expired.
  /// Null when signed out or the session can no longer be refreshed.
  /// Use it for connections that don't go through Dio, such as the socket.
  Future<String?> freshAccessToken() async {
    final tokens = tokenStore.cached ?? await tokenStore.read();
    if (tokens == null) return null;
    if (!tokens.isExpired(DateTime.now().add(_expiryMargin))) return tokens.accessToken;
    return (await refreshTokens())?.accessToken;
  }

  /// Exchanges the refresh token for a new access token. Concurrent callers
  /// share one request. Returns null (and keeps nothing) when the server
  /// refuses the refresh token; rethrows network errors so a flaky
  /// connection doesn't log anyone out.
  Future<AuthTokens?> refreshTokens() => _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<AuthTokens?> _doRefresh() async {
    final current = tokenStore.cached ?? await tokenStore.read();
    final refreshToken = current?.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return null;
    try {
      final body = asJson(await _send(
        'POST',
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        authenticated: false,
      ));
      final fresh = AuthTokens.fromJson(asJson(body['tokens']));
      if (fresh.accessToken.isEmpty || fresh.accessToken == 'null') return null;
      // GiLab doesn't rotate refresh tokens: keep the one we have.
      final merged = AuthTokens(
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken ?? refreshToken,
        expiresAt: fresh.expiresAt,
      );
      await tokenStore.write(merged);
      return merged;
    } on ApiException catch (e) {
      if (e.isUnauthorized || e.kind == ApiErrorKind.badRequest || e.kind == ApiErrorKind.forbidden) {
        return null;
      }
      rethrow;
    }
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Object? data,
    bool authenticated = true,
  }) async {
    try {
      final response = await dio.request<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: Options(
          method: method,
          extra: {_authKey: authenticated},
        ),
      );
      return response.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

const _authKey = 'grameen.authenticated';
const _retriedKey = 'grameen.retried';

/// Refresh a little before the real expiry so a request doesn't race it.
const _expiryMargin = Duration(seconds: 30);

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._client);

  final ApiClient _client;

  @override
  Future<void> onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    if (options.extra[_authKey] != false) {
      try {
        final token = await _client.freshAccessToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
      } on ApiException {
        // Network trouble while refreshing: send with the old token and let
        // the server decide.
        final tokens = _client.tokenStore.cached;
        if (tokens != null) options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    final sentToken = options.headers.containsKey('Authorization');
    if (err.response?.statusCode != 401 || !sentToken) return handler.next(err);

    if (options.extra[_retriedKey] != true) {
      try {
        final fresh = await _client.refreshTokens();
        if (fresh != null) {
          options
            ..headers['Authorization'] = 'Bearer ${fresh.accessToken}'
            ..extra[_retriedKey] = true;
          return handler.resolve(await _client.dio.fetch<dynamic>(options));
        }
      } on ApiException {
        return handler.next(err);
      } on DioException catch (e) {
        return handler.next(e);
      }
    }
    _client.onUnauthorized?.call();
    handler.next(err);
  }
}
