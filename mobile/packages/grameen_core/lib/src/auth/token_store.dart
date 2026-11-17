import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth.dart';

/// Where the session's tokens live between launches.
abstract class TokenStore {
  /// Last tokens read or written, without touching storage.
  AuthTokens? get cached;

  Future<AuthTokens?> read();
  Future<void> write(AuthTokens tokens);
  Future<void> clear();
}

/// Keychain / Keystore-backed store. Tokens must never go to SharedPreferences.
class SecureTokenStore implements TokenStore {
  SecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _accessKey = 'grameen.accessToken';
  static const _refreshKey = 'grameen.refreshToken';
  static const _expiresAtKey = 'grameen.expiresAt';

  final FlutterSecureStorage _storage;
  AuthTokens? _cached;
  bool _loaded = false;

  @override
  AuthTokens? get cached => _cached;

  @override
  Future<AuthTokens?> read() async {
    if (_loaded) return _cached;
    final access = await _storage.read(key: _accessKey);
    if (access != null && access.isNotEmpty) {
      final expiresAt = await _storage.read(key: _expiresAtKey);
      _cached = AuthTokens(
        accessToken: access,
        refreshToken: await _storage.read(key: _refreshKey),
        expiresAt: expiresAt == null ? null : DateTime.tryParse(expiresAt),
      );
    }
    _loaded = true;
    return _cached;
  }

  @override
  Future<void> write(AuthTokens tokens) async {
    _cached = tokens;
    _loaded = true;
    await _storage.write(key: _accessKey, value: tokens.accessToken);
    if (tokens.refreshToken != null) {
      await _storage.write(key: _refreshKey, value: tokens.refreshToken);
    } else {
      await _storage.delete(key: _refreshKey);
    }
    if (tokens.expiresAt != null) {
      await _storage.write(
          key: _expiresAtKey, value: tokens.expiresAt!.toIso8601String());
    } else {
      await _storage.delete(key: _expiresAtKey);
    }
  }

  @override
  Future<void> clear() async {
    _cached = null;
    _loaded = true;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _expiresAtKey);
  }
}

/// Non-persistent store for tests and previews.
class InMemoryTokenStore implements TokenStore {
  InMemoryTokenStore([this._tokens]);

  AuthTokens? _tokens;

  @override
  AuthTokens? get cached => _tokens;

  @override
  Future<AuthTokens?> read() async => _tokens;

  @override
  Future<void> write(AuthTokens tokens) async => _tokens = tokens;

  @override
  Future<void> clear() async => _tokens = null;
}
