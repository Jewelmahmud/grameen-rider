import 'package:flutter_test/flutter_test.dart';
import 'package:grameen_core/grameen_core.dart';

void main() {
  late RealtimeClient client;

  setUp(() => client = RealtimeClient(
      config: const GrameenConfig(serverUrl: 'http://test.local')));
  tearDown(() => client.dispose());

  test('routes trip.status.updated to tripStatus', () async {
    final next = client.tripStatus.first;
    client.handleEvent('trip.status.updated', {
      'tripId': 't1',
      'status': 'accepted',
      'oldStatus': 'searching_driver',
      'driverId': 'd1',
    });

    final event = await next;
    expect(event.status, TripStatus.accepted);
    expect(event.oldStatus, TripStatus.searchingDriver);
    expect(event.driverId, 'd1');
  });

  test('routes trip offers and drops repeats of the same offer', () async {
    final received = <DriverOffer>[];
    final sub = client.offers.listen(received.add);
    final offer = {
      'offerId': 'o1',
      'tripId': 't1',
      'pickup': {'address': 'Mirpur 10', 'latitude': 23.8, 'longitude': 90.36},
      'dropoff': {'address': 'Gulshan 2', 'latitude': 23.79, 'longitude': 90.41},
      'total': '150.00',
      'expiresAt': '2026-11-17T10:00:15.000Z',
    };

    client.handleEvent('trip.offer', offer);
    client.handleEvent('trip.offer', offer);
    client.handleEvent('trip.offer', {...offer, 'offerId': 'o2'});
    client.handleEvent('trip.offer', {'tripId': 't9'}); // no offerId: ignored
    await Future<void>.delayed(Duration.zero);

    expect(received.map((o) => o.offerId), ['o1', 'o2']);
    expect(received.first.total, 150.0);
    await sub.cancel();
  });

  test('routes closed offers and dispatch pauses', () async {
    final closed = client.offersClosed.first;
    final paused = client.dispatchPaused.first;
    client.handleEvent('trip.offer.closed', {'offerId': 'o1', 'tripId': 't1', 'reason': 'timeout'});
    client.handleEvent('dispatch.paused', {'until': '2026-11-17T10:10:00.000Z', 'reason': 'decline_streak'});

    expect((await closed).reason, 'timeout');
    expect((await paused).until.toUtc(), DateTime.utc(2026, 11, 17, 10, 10));
  });

  test('parses driver locations and ignores payloads without a tripId', () async {
    final received = <DriverLocationEvent>[];
    final sub = client.driverLocation.listen(received.add);

    client.handleEvent('driver.location.updated', {'latitude': 1, 'longitude': 2});
    client.handleEvent('driver.location.updated', 'garbage');
    client.handleEvent('driver.location.updated', {
      'tripId': 't1',
      'driverId': 'd1',
      'latitude': 23.8041,
      'longitude': 90.3654,
      'timestamp': '2026-10-31T09:00:00.000Z',
    });
    await Future<void>.delayed(Duration.zero);

    expect(received, hasLength(1));
    expect(received.single.latitude, 23.8041);
    await sub.cancel();
  });

  test('location ping lets the server take the driver from the token', () {
    const ping = DriverLocationPing(tripId: 't1', latitude: 23.8, longitude: 90.3);
    expect(ping.toJson(), {'tripId': 't1', 'latitude': 23.8, 'longitude': 90.3});
    expect(const DriverLocationPing(latitude: 1, longitude: 2).toJson().containsKey('tripId'), isFalse);
  });

  test('connect without a token reports MISSING_TOKEN and stays disconnected', () async {
    final failure = client.authFailures.first;
    await client.connect(tokenProvider: () async => null);
    expect(await failure, 'MISSING_TOKEN');
    expect(client.state, RealtimeConnection.disconnected);
  });
}
