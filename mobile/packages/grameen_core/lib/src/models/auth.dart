import 'json.dart';

class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    this.refreshToken,
    this.expiresAt,
  });

  /// Parses the auth server's `tokens` object:
  /// `{accessToken, refreshToken, expiresIn}` with `expiresIn` in seconds.
  factory AuthTokens.fromJson(Json json, {DateTime? now}) {
    final expiresIn = asInt(json['expiresIn']);
    return AuthTokens(
      accessToken: json['accessToken'].toString(),
      refreshToken: asString(json['refreshToken']),
      expiresAt: expiresIn == null
          ? null
          : (now ?? DateTime.now()).add(Duration(seconds: expiresIn)),
    );
  }

  final String accessToken;
  final String? refreshToken;
  final DateTime? expiresAt;

  bool isExpired([DateTime? now]) =>
      expiresAt != null && !(now ?? DateTime.now()).isBefore(expiresAt!);
}

/// Response of `POST /auth/login` and `POST /auth/register`, forwarded as-is
/// from the auth server.
class AuthResult {
  const AuthResult({
    required this.success,
    this.tokens,
    this.authUserId,
    this.roles = const [],
    this.message,
  });

  factory AuthResult.fromJson(Json json) {
    final user = asJson(json['user']);
    final tokens = json['tokens'];
    return AuthResult(
      success: asBool(json['success'], fallback: tokens != null),
      tokens: tokens is Map && tokens['accessToken'] != null
          ? AuthTokens.fromJson(asJson(tokens))
          : null,
      authUserId: asString(user['id']),
      roles: (user['roles'] is List)
          ? (user['roles'] as List)
              .map((r) => r is Map ? r['name']?.toString() : r?.toString())
              .whereType<String>()
              .toList()
          : const [],
      message: asString(json['message']),
    );
  }

  final bool success;
  final AuthTokens? tokens;
  final String? authUserId;
  final List<String> roles;
  final String? message;
}

/// What happened after registering.
enum RegistrationOutcome {
  /// Logged in already (the auth server didn't require verification).
  signedIn,

  /// Account created; the phone must be verified with the SMS code before login.
  verificationRequired,
}
