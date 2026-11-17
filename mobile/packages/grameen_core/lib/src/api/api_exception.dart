import 'package:dio/dio.dart';

enum ApiErrorKind {
  network,
  timeout,
  cancelled,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  server,
  unknown,
}

/// Error raised by every API call in this package.
///
/// The backend's `GlobalExceptionFilter` answers with
/// `{statusCode, message, error, code?, path, timestamp}` where `message` is a
/// string, a list of validation messages, or (for errors forwarded from the
/// auth server) an object.
class ApiException implements Exception {
  const ApiException({
    required this.kind,
    required this.message,
    this.statusCode,
    this.code,
    this.details = const [],
  });

  factory ApiException.fromDio(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          kind: ApiErrorKind.timeout,
          message: 'The server took too long to respond.',
        );
      case DioExceptionType.cancel:
        return const ApiException(
          kind: ApiErrorKind.cancelled,
          message: 'Request cancelled.',
        );
      case DioExceptionType.connectionError:
        return const ApiException(
          kind: ApiErrorKind.network,
          message: 'Could not reach the server. Check your connection.',
        );
      case DioExceptionType.badResponse:
        final response = error.response;
        return ApiException.fromResponse(response?.statusCode, response?.data);
      default:
        return ApiException(
          kind: ApiErrorKind.network,
          message: error.message ?? 'Network error.',
        );
    }
  }

  factory ApiException.fromResponse(int? statusCode, Object? body) {
    final messages = _extractMessages(body);
    final code = _extractCode(body);
    return ApiException(
      kind: _kindFor(statusCode),
      statusCode: statusCode,
      code: code,
      message: messages.isNotEmpty ? messages.first : 'Request failed ($statusCode).',
      details: messages,
    );
  }

  final ApiErrorKind kind;
  final String message;
  final int? statusCode;

  /// Machine-readable code such as `MISSING_TOKEN`, when the backend sends one.
  final String? code;

  /// All messages, e.g. every failed validation rule.
  final List<String> details;

  bool get isUnauthorized => kind == ApiErrorKind.unauthorized;
  bool get isNotFound => kind == ApiErrorKind.notFound;
  bool get isConflict => kind == ApiErrorKind.conflict;

  // Codes the apps react to. See docs/WEB_PLATFORM_PLAN.md §7.6.

  /// Login refused until the phone is verified: go to the verify-phone step.
  bool get isVerificationRequired => code == 'VERIFICATION_REQUIRED';

  /// The price expired before booking: get a new quote and show it.
  bool get isQuoteExpired => code == 'QUOTE_EXPIRED';

  /// The offer timed out or the trip went elsewhere: dismiss the offer card.
  bool get isOfferGone => code == 'OFFER_NO_LONGER_AVAILABLE';

  /// The passenger already has a ride in progress.
  bool get isActiveTripExists => code == 'ACTIVE_TRIP_EXISTS';

  /// Blocked on Grameen Ride: show a message, don't loop back to login.
  bool get isAccountBlocked => code == 'ACCOUNT_BLOCKED';

  /// GiLab (the login service) is down.
  bool get isAuthServiceDown => code == 'AUTH_SERVICE_UNAVAILABLE';

  /// Too many attempts at GiLab.
  bool get isRateLimited => code == 'AUTH_RATE_LIMIT_EXCEEDED' || statusCode == 429;
  bool get isNetwork =>
      kind == ApiErrorKind.network || kind == ApiErrorKind.timeout;

  static ApiErrorKind _kindFor(int? status) {
    if (status == null) return ApiErrorKind.unknown;
    if (status == 400 || status == 422) return ApiErrorKind.badRequest;
    if (status == 401) return ApiErrorKind.unauthorized;
    if (status == 403) return ApiErrorKind.forbidden;
    if (status == 404) return ApiErrorKind.notFound;
    if (status == 409) return ApiErrorKind.conflict;
    if (status >= 500) return ApiErrorKind.server;
    return ApiErrorKind.unknown;
  }

  static List<String> _extractMessages(Object? body) {
    if (body is String && body.isNotEmpty) return [body];
    if (body is! Map) return const [];
    // Errors forwarded from the auth server carry the useful text in
    // `error: {message, code, statusCode}`, next to a generic top-level
    // message such as "Bad Gateway Exception", so look there first.
    final error = body['error'];
    if (error is Map) {
      final nested = _extractMessages({'message': error['message']});
      if (nested.isNotEmpty) return nested;
    }
    final message = body['message'];
    if (message is String && message.isNotEmpty) return [message];
    if (message is List) {
      return message.map((m) => m.toString()).where((m) => m.isNotEmpty).toList();
    }
    if (message is Map) {
      final nested = _extractMessages(message);
      if (nested.isNotEmpty) return nested;
    }
    if (error is String && error.isNotEmpty) return [error];
    return const [];
  }

  static String? _extractCode(Object? body) {
    if (body is! Map) return null;
    final code = body['code'];
    if (code != null) return code.toString();
    for (final nested in [body['error'], body['message']]) {
      final found = _extractCode(nested);
      if (found != null) return found;
    }
    return null;
  }

  @override
  String toString() =>
      'ApiException(${statusCode ?? kind.name}${code != null ? ' $code' : ''}): $message';
}
