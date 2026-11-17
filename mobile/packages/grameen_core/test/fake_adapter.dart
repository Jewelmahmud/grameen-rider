import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

typedef FakeHandler = FakeResponse Function(RequestOptions request);

class FakeResponse {
  const FakeResponse(this.status, [this.body]);
  final int status;
  final Object? body;
}

/// Dio adapter that answers from [routes] (`'METHOD /path'` → handler) and
/// records every request it saw.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.routes);

  final Map<String, FakeHandler> routes;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final key = '${options.method} ${options.uri.path}';
    final handler = routes[key];
    if (handler == null) {
      return ResponseBody.fromString(
        jsonEncode({'statusCode': 404, 'message': 'No fake route for $key'}),
        404,
        headers: _jsonHeaders,
      );
    }
    final response = handler(options);
    return ResponseBody.fromString(
      response.body == null ? '' : jsonEncode(response.body),
      response.status,
      headers: _jsonHeaders,
    );
  }

  @override
  void close({bool force = false}) {}

  static const _jsonHeaders = {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  };
}
