/// Shared backend layer for the Grameen Ride User and Rider apps.
///
/// ```dart
/// final core = GrameenCore.create();
/// await core.session.restore();
/// final quotes = await core.api.pricing.quote(request);
/// await core.realtime.connect(tokenProvider: core.session.accessToken);
/// ```
library;

import 'package:dio/dio.dart';

import 'src/api/api_client.dart';
import 'src/api/grameen_api.dart';
import 'src/auth/session.dart';
import 'src/auth/token_store.dart';
import 'src/config/grameen_config.dart';
import 'src/realtime/realtime_client.dart';

export 'src/api/api_client.dart';
export 'src/api/api_exception.dart';
export 'src/api/grameen_api.dart';
export 'src/auth/session.dart';
export 'src/auth/token_store.dart';
export 'src/config/grameen_config.dart';
export 'src/models/auth.dart';
export 'src/models/driver.dart';
export 'src/models/enums.dart';
export 'src/models/misc.dart';
export 'src/models/offer.dart';
export 'src/models/public_config.dart';
export 'src/models/quote.dart';
export 'src/models/trip.dart';
export 'src/models/user_profile.dart';
export 'src/realtime/realtime_client.dart';
export 'src/realtime/realtime_events.dart';

/// The objects an app needs, wired together. Create one at startup and
/// provide it (e.g. with `Provider`) to the widget tree.
class GrameenCore {
  GrameenCore._({
    required this.config,
    required this.client,
    required this.api,
    required this.session,
    required this.realtime,
  });

  /// [dio] is for tests that need a fake HTTP adapter.
  factory GrameenCore.create({
    GrameenConfig? config,
    TokenStore? tokenStore,
    Dio? dio,
  }) {
    final resolved = config ?? GrameenConfig.fromEnvironment();
    final client = ApiClient(
      config: resolved,
      tokenStore: tokenStore ?? SecureTokenStore(),
      dio: dio,
    );
    final api = GrameenApi(client);
    return GrameenCore._(
      config: resolved,
      client: client,
      api: api,
      session: Session(client: client, api: api),
      realtime: RealtimeClient(config: resolved),
    );
  }

  final GrameenConfig config;
  final ApiClient client;
  final GrameenApi api;
  final Session session;
  final RealtimeClient realtime;
}
