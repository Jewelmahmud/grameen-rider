import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../api/grameen_api.dart';
import '../models/auth.dart';
import '../models/enums.dart';
import '../models/user_profile.dart';
import 'token_store.dart';

enum SessionStatus {
  /// [Session.restore] has not finished (or failed on the network).
  unknown,
  signedOut,
  signedIn,
}

/// Who is logged in. Apps listen to this to switch between the login flow
/// and the main screens, and to connect/disconnect realtime.
///
/// Login errors to handle in the UI (all [ApiException]):
/// `isVerificationRequired` → verify the phone first, `isAccountBlocked`,
/// `isRateLimited`, `isAuthServiceDown`, and `isUnauthorized` (wrong password or code).
class Session extends ChangeNotifier {
  Session({required ApiClient client, required GrameenApi api})
      : _client = client,
        _api = api,
        _tokenStore = client.tokenStore {
    _client.onUnauthorized = _handleUnauthorized;
  }

  final ApiClient _client;
  final GrameenApi _api;
  final TokenStore _tokenStore;

  SessionStatus _status = SessionStatus.unknown;
  UserProfile? _profile;

  SessionStatus get status => _status;
  UserProfile? get profile => _profile;
  bool get isSignedIn => _status == SessionStatus.signedIn;

  /// Call once at startup. An expired access token is refreshed with the
  /// stored refresh token. Throws [ApiException] on network failure and
  /// leaves [status] as `unknown`, so the app can show a retry button
  /// instead of logging the user out.
  Future<void> restore() async {
    final tokens = await _tokenStore.read();
    if (tokens == null) {
      await _signOutLocally();
      return;
    }
    if (tokens.isExpired() && await _client.refreshTokens() == null) {
      await _signOutLocally();
      return;
    }
    try {
      await _loadProfile();
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await _signOutLocally();
        return;
      }
      rethrow;
    }
  }

  /// Phone (`01XXXXXXXXX`) or email, with the GiLab password.
  Future<void> login({String? phone, String? email, required String password}) async {
    final result = await _api.auth.login(phone: phone, email: email, password: password);
    await _signInWith(_tokensOf(result));
  }

  /// Step 1 of code login: GiLab texts a one-time code to [phone].
  Future<void> sendLoginCode(String phone) => _api.auth.sendLoginCode(phone);

  /// Step 2 of code login.
  Future<void> loginWithCode({required String phone, required String code}) async {
    final result = await _api.auth.loginWithCode(phone: phone, code: code);
    await _signInWith(_tokensOf(result));
  }

  /// Creates the account, then tries to log in. GiLab normally requires the
  /// phone to be verified first, in which case this returns
  /// [RegistrationOutcome.verificationRequired]: show the code screen, call
  /// [verifyPhoneAndLogin] (or [verifyPhone] then [login]).
  Future<RegistrationOutcome> register({
    required RegistrationRole role,
    required String phone,
    required String password,
    required String firstName,
    required String lastName,
    String? email,
  }) async {
    final result = await _api.auth.register(
      role: role,
      phone: phone,
      password: password,
      firstName: firstName,
      lastName: lastName,
      email: email,
    );
    if (result.tokens != null) {
      await _signInWith(result.tokens!);
      return RegistrationOutcome.signedIn;
    }
    try {
      await login(phone: phone, password: password);
      return RegistrationOutcome.signedIn;
    } on ApiException catch (e) {
      if (e.isVerificationRequired) return RegistrationOutcome.verificationRequired;
      rethrow;
    }
  }

  Future<void> verifyPhone({required String phone, required String code}) =>
      _api.auth.verifyPhone(phone: phone, code: code);

  Future<void> resendVerificationCode(String phone) => _api.auth.resendVerification(phone);

  /// After registration: verify the phone and sign in with the password just chosen.
  Future<void> verifyPhoneAndLogin({
    required String phone,
    required String code,
    required String password,
  }) async {
    await verifyPhone(phone: phone, code: code);
    await login(phone: phone, password: password);
  }

  /// Code of the error thrown when the auth server accepted the credentials
  /// but the backend refused the token it issued (e.g. misconfigured GiLab app id).
  static const tokenRejectedCode = 'TOKEN_REJECTED';

  /// A valid access token for the socket connection, refreshed if needed.
  Future<String?> accessToken() => _client.freshAccessToken();

  Future<UserProfile> refreshProfile() => _loadProfile();

  /// Ends the session at GiLab (best effort) and clears local credentials.
  Future<void> logout() async {
    final refreshToken = (_tokenStore.cached ?? await _tokenStore.read())?.refreshToken;
    try {
      await _api.auth.logout(refreshToken: refreshToken);
    } on ApiException {
      // Offline or already expired: signing out locally is enough.
    }
    await _signOutLocally();
  }

  AuthTokens _tokensOf(AuthResult result) {
    final tokens = result.tokens;
    if (tokens == null) {
      throw ApiException(
        kind: ApiErrorKind.unauthorized,
        message: result.message ?? 'Login failed.',
      );
    }
    return tokens;
  }

  // The credentials were already accepted at this point, so a 401 here is a
  // backend problem, not a wrong password — report it as such.
  Future<void> _signInWith(AuthTokens tokens) async {
    await _tokenStore.write(tokens);
    try {
      await _loadProfile();
    } on ApiException catch (e) {
      await _tokenStore.clear();
      if (!e.isUnauthorized) rethrow;
      throw ApiException(
        kind: ApiErrorKind.server,
        statusCode: e.statusCode,
        code: tokenRejectedCode,
        message: 'Signed in, but the server could not verify the login token.',
        details: e.details,
      );
    }
  }

  Future<UserProfile> _loadProfile() async {
    final profile = await _api.profile.me();
    _profile = profile;
    _status = SessionStatus.signedIn;
    notifyListeners();
    return profile;
  }

  Future<void> _signOutLocally() async {
    await _tokenStore.clear();
    final changed = _status != SessionStatus.signedOut || _profile != null;
    _profile = null;
    _status = SessionStatus.signedOut;
    if (changed) notifyListeners();
  }

  void _handleUnauthorized() {
    if (_status == SessionStatus.signedIn) _signOutLocally();
  }

  @override
  void dispose() {
    if (_client.onUnauthorized == _handleUnauthorized) {
      _client.onUnauthorized = null;
    }
    super.dispose();
  }
}
