import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grameen_core/grameen_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:grameen_ride_user/main.dart';
import 'package:grameen_ride_user/user/register_screen.dart';

/// Answers every request with [status] and [body], and records the requests.
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.status, this.body);

  final int status;
  final Object body;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options,
      Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    return ResponseBody.fromString(jsonEncode(body), status, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late _StubAdapter adapter;

  Future<void> pumpApp(WidgetTester tester, {int status = 200, Object body = const {}}) async {
    SharedPreferences.setMockInitialValues({});
    // A typical phone screen (360 x 800 logical pixels).
    tester.view
      ..physicalSize = const Size(1080, 2400)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    adapter = _StubAdapter(status, body);
    final core = GrameenCore.create(
      config: const GrameenConfig(serverUrl: 'http://test.local'),
      tokenStore: InMemoryTokenStore(),
      dio: Dio()..httpClientAdapter = adapter,
    );
    await tester.pumpWidget(MyApp(core: core));
    await tester.pumpAndSettle();
  }

  testWidgets('shows the login screen when nobody is signed in', (tester) async {
    await pumpApp(tester);

    expect(find.text('লগইন করুন'), findsOneWidget);
    expect(find.text('পাসওয়ার্ড'), findsWidgets);
    expect(adapter.requests, isEmpty);
  });

  testWidgets('validates phone and password before calling the API', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.text('লগইন করুন'));
    await tester.pump();

    expect(find.text('মোবাইল নম্বর দিন'), findsOneWidget);
    expect(find.text('পাসওয়ার্ড দিন'), findsOneWidget);
    expect(adapter.requests, isEmpty);
  });

  testWidgets('shows an error for a wrong password', (tester) async {
    await pumpApp(tester,
        status: 401, body: {'statusCode': 401, 'message': 'Invalid credentials'});

    await tester.enterText(find.byType(TextFormField).at(0), '01712345678');
    await tester.enterText(find.byType(TextFormField).at(1), 'wrong-pass');
    await tester.tap(find.text('লগইন করুন'));
    await tester.pumpAndSettle();

    expect(find.text('ফোন নম্বর বা পাসওয়ার্ড সঠিক নয়'), findsOneWidget);
    final request = adapter.requests.single;
    expect(request.uri.path, '/api/auth/login');
    expect(request.data, {'phone': '+8801712345678', 'password': 'wrong-pass'});
  });

  testWidgets('OTP tab does not pretend to log in', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.text('ওটিপি'));
    await tester.pump();
    await tester.enterText(find.byType(TextFormField).first, '01712345678');
    await tester.tap(find.text('ওটিপি পাঠান'));
    await tester.pump();

    expect(find.textContaining('ওটিপি লগইন শীঘ্রই আসছে'), findsOneWidget);
    expect(adapter.requests, isEmpty);
  });

  testWidgets('sign-up link opens the registration form', (tester) async {
    await pumpApp(tester);

    final signUpLink = find.textContaining('নতুন অ্যাকাউন্ট খুলুন');
    await tester.ensureVisible(signUpLink);
    await tester.tap(signUpLink);
    await tester.pumpAndSettle();

    expect(find.byType(RegisterScreen), findsOneWidget);
    final submit = find.text('অ্যাকাউন্ট খুলুন');
    await tester.scrollUntilVisible(submit, 200,
        scrollable: find
            .descendant(
                of: find.byType(RegisterScreen),
                matching: find.byType(Scrollable))
            .first);
    await tester.tap(submit);
    await tester.pump();
    expect(find.text('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'), findsOneWidget);
  });
}
