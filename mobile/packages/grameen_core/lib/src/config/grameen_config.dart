import 'package:flutter/foundation.dart';

/// Backend endpoints for one build of an app.
///
/// Values come from `--dart-define`:
///
/// ```
/// flutter run --dart-define=API_BASE_URL=https://api.example.com
/// ```
///
/// `API_BASE_URL` is the server origin without `/api`. `SOCKET_URL` defaults
/// to the same origin, because the Socket.IO gateway runs in the same process.
class GrameenConfig {
  const GrameenConfig({
    required this.serverUrl,
    String? socketUrl,
    this.connectTimeout = const Duration(seconds: 15),
    this.receiveTimeout = const Duration(seconds: 30),
  }) : socketUrl = socketUrl ?? serverUrl;

  /// Reads `API_BASE_URL` / `SOCKET_URL`, falling back to the local
  /// docker-compose backend on port 5006.
  factory GrameenConfig.fromEnvironment() {
    const apiOverride = String.fromEnvironment('API_BASE_URL');
    const socketOverride = String.fromEnvironment('SOCKET_URL');
    final serverUrl = apiOverride.isNotEmpty ? apiOverride : _localDefault();
    return GrameenConfig(
      serverUrl: _trimSlash(serverUrl),
      socketUrl: socketOverride.isNotEmpty ? _trimSlash(socketOverride) : null,
    );
  }

  final String serverUrl;
  final String socketUrl;
  final Duration connectTimeout;
  final Duration receiveTimeout;

  /// REST base, e.g. `http://10.0.2.2:5006/api`.
  String get apiBaseUrl => '$serverUrl/api';

  // The Android emulator reaches the host machine through 10.0.2.2, not localhost.
  static String _localDefault() {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5006';
    }
    return 'http://localhost:5006';
  }

  static String _trimSlash(String url) =>
      url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
