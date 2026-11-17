import '../models/auth.dart';
import '../models/driver.dart';
import '../models/enums.dart';
import '../models/json.dart';
import '../models/misc.dart';
import '../models/offer.dart';
import '../models/public_config.dart';
import '../models/quote.dart';
import '../models/trip.dart';
import '../models/user_profile.dart';
import 'api_client.dart';
import 'api_exception.dart';

/// Every customer and driver endpoint (everything except `/admin`), grouped
/// like `grameen-rider.postman_collection.json`.
class GrameenApi {
  GrameenApi(ApiClient client)
      : auth = AuthApi(client),
        config = ConfigApi(client),
        profile = ProfileApi(client),
        pricing = PricingApi(client),
        trips = TripsApi(client),
        drivers = DriversApi(client),
        vehicles = VehiclesApi(client),
        promotions = PromotionsApi(client),
        notifications = NotificationsApi(client),
        locations = LocationsApi(client),
        support = SupportApi(client),
        payments = PaymentsApi(client),
        health = HealthApi(client);

  final AuthApi auth;
  final ConfigApi config;
  final ProfileApi profile;
  final PricingApi pricing;
  final TripsApi trips;
  final DriversApi drivers;
  final VehiclesApi vehicles;
  final PromotionsApi promotions;
  final NotificationsApi notifications;
  final LocationsApi locations;
  final SupportApi support;
  final PaymentsApi payments;
  final HealthApi health;
}

class AuthApi {
  AuthApi(this._client);
  final ApiClient _client;

  /// Password login with phone (`01XXXXXXXXX`) or email.
  Future<AuthResult> login({String? phone, String? email, required String password}) async =>
      AuthResult.fromJson(asJson(await _client.post(
        '/auth/login',
        data: compactJson({'phone': phone, 'email': email, 'password': password}),
        authenticated: false,
      )));

  /// Sends a one-time login code by SMS. Then call [loginWithCode].
  Future<void> sendLoginCode(String phone) => _client.post(
        '/auth/otp/send',
        data: {'phone': phone, 'purpose': 'login'},
        authenticated: false,
      );

  Future<AuthResult> loginWithCode({required String phone, required String code}) async =>
      AuthResult.fromJson(asJson(await _client.post(
        '/auth/login',
        data: {'phone': phone, 'mfaCode': code},
        authenticated: false,
      )));

  /// Creates the GiLab account. GiLab sends an SMS code; the phone must be
  /// verified with [verifyPhone] before the first login.
  Future<AuthResult> register({
    required RegistrationRole role,
    required String phone,
    required String password,
    required String firstName,
    required String lastName,
    String? email,
  }) async =>
      AuthResult.fromJson(asJson(await _client.post(
        '/auth/register',
        data: compactJson({
          'roleName': role.wire,
          'phone': phone,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
        }),
        authenticated: false,
      )));

  Future<void> verifyPhone({required String phone, required String code}) => _client.post(
        '/auth/verify-phone',
        data: {'phone': phone, 'code': code},
        authenticated: false,
      );

  Future<void> resendVerification(String phone) => _client.post(
        '/auth/resend-verification',
        data: {'type': 'phone', 'phone': phone},
        authenticated: false,
      );

  /// Ends the session at GiLab; the refresh token stops working.
  Future<void> logout({String? refreshToken}) =>
      _client.post('/auth/logout', data: compactJson({'refreshToken': refreshToken}));
}

class ConfigApi {
  ConfigApi(this._client);
  final ApiClient _client;

  /// Vehicle types per service, payment methods, booking windows, support contact.
  Future<PublicConfig> public() async =>
      PublicConfig.fromJson(asJson(await _client.get('/config/public', authenticated: false)));
}

class ProfileApi {
  ProfileApi(this._client);
  final ApiClient _client;

  Future<UserProfile> me() async =>
      UserProfile.fromJson(asJson(await _client.get('/user-profiles/me')));

  Future<void> updateFcmToken(String fcmToken) =>
      _client.put('/user-profiles/fcm-token', data: {'fcmToken': fcmToken});

  /// `bn` or `en`; used for SMS and push messages.
  Future<void> setLanguage(String language) =>
      _client.put('/user-profiles/language', data: {'languagePreference': language});
}

class PricingApi {
  PricingApi(this._client);
  final ApiClient _client;

  /// Prices for every enabled vehicle type (or just one). Each quote is held
  /// for a few minutes; book with its `quoteId`. Errors: `SCHEDULE_TOO_SOON`,
  /// `SCHEDULE_TOO_FAR`, `SCHEDULE_REQUIRED`, `VEHICLE_TYPE_NOT_AVAILABLE`,
  /// `NO_PRICE_AVAILABLE`, `QUOTE_STORE_UNAVAILABLE`.
  Future<QuoteResponse> quote(QuoteRequest request) async =>
      QuoteResponse.fromJson(asJson(await _client.post('/pricing/quote', data: request.toJson())));
}

class TripsApi {
  TripsApi(this._client);
  final ApiClient _client;

  /// Books a quote. Throws [ApiException] with `isQuoteExpired` (get a new
  /// quote) or `isActiveTripExists` (show the current ride).
  Future<Trip> create(CreateTripRequest request) async =>
      Trip.fromJson(asJson(await _client.post('/trips', data: request.toJson())));

  /// The caller's trips as passenger, newest first. Drivers use
  /// [DriversApi.myTrips].
  Future<List<Trip>> mine() async =>
      asList(await _client.get('/trips'), Trip.fromJson);

  Future<Trip> byId(String tripId) async =>
      Trip.fromJson(asJson(await _client.get('/trips/$tripId')));

  /// Driver: accept the trip offered to you. Throws with `isOfferGone` when it
  /// timed out or went to someone else.
  Future<Trip> acceptOffer(String tripId) async =>
      Trip.fromJson(asJson(await _client.put('/trips/$tripId/offer/accept')));

  /// Driver: pass on the offer; it moves to the next driver.
  Future<void> declineOffer(String tripId) => _client.put('/trips/$tripId/offer/decline');

  Future<Trip> arrive(String tripId) => _transition(tripId, 'arrive');
  Future<Trip> start(String tripId) => _transition(tripId, 'start');
  Future<Trip> complete(String tripId) => _transition(tripId, 'complete');

  /// Passenger: allowed until the trip starts. Driver: hands the trip back to
  /// matching. The server works out who is cancelling from the login.
  Future<Trip> cancel(String tripId, {String? reason}) async =>
      Trip.fromJson(asJson(await _client.put(
        '/trips/$tripId/cancel',
        data: compactJson({'cancellationReason': reason}),
      )));

  /// Once per completed trip; the passenger rates the driver and the driver the passenger.
  Future<void> rate(String tripId, RateTripRequest request) =>
      _client.post('/trips/$tripId/rate', data: request.toJson());

  Future<Trip> _transition(String tripId, String action) async =>
      Trip.fromJson(asJson(await _client.put('/trips/$tripId/$action')));
}

class DriversApi {
  DriversApi(this._client);
  final ApiClient _client;

  Future<Driver> create(CreateDriverRequest request) async =>
      Driver.fromJson(asJson(await _client.post('/drivers', data: request.toJson())));

  /// The caller's driver profile, or null if they have not created one yet.
  Future<Driver?> me() async {
    try {
      return Driver.fromJson(asJson(await _client.get('/drivers/me')));
    } on ApiException catch (e) {
      if (e.isNotFound) return null;
      rethrow;
    }
  }

  Future<DriverEarnings> earnings() async =>
      DriverEarnings.fromJson(asJson(await _client.get('/drivers/me/earnings')));

  /// The offer waiting for this driver, if any. Call on app start and resume,
  /// in case the socket event was missed.
  Future<DriverOffer?> currentOffer() async {
    final data = await _client.get('/drivers/me/offers/current');
    return data is Map && data['offerId'] != null ? DriverOffer.fromJson(asJson(data)) : null;
  }

  /// The driver's trips: [DriverTripsFilter.active] to restore the current
  /// trip after a restart, `upcoming` for accepted rentals, `history` for past.
  Future<List<Trip>> myTrips({DriverTripsFilter? filter}) async => asList(
        await _client.get('/drivers/me/trips', query: filter == null ? null : {'status': filter.wire}),
        Trip.fromJson,
      );

  Future<void> updateLocation({required double latitude, required double longitude}) =>
      _client.put('/drivers/location',
          data: {'latitude': latitude, 'longitude': longitude});

  Future<void> updateAvailability({required bool isOnline, required bool isAvailable}) =>
      _client.put('/drivers/availability',
          data: {'isOnline': isOnline, 'isAvailable': isAvailable});

  Future<Paged<Rating>> ratings(String driverId, {int page = 1, int limit = 20}) async =>
      Paged.fromJson(
        asJson(await _client.get('/drivers/$driverId/ratings',
            query: {'page': page, 'limit': limit})),
        Rating.fromJson,
      );
}

class VehiclesApi {
  VehiclesApi(this._client);
  final ApiClient _client;

  Future<Vehicle> add(VehicleInput input) async =>
      Vehicle.fromJson(asJson(await _client.post('/vehicles', data: input.toJson())));

  Future<List<Vehicle>> mine() async =>
      asList(await _client.get('/vehicles'), Vehicle.fromJson);

  Future<Vehicle> byId(String vehicleId) async =>
      Vehicle.fromJson(asJson(await _client.get('/vehicles/$vehicleId')));

  Future<Vehicle> update(String vehicleId, VehicleInput input) async =>
      Vehicle.fromJson(
          asJson(await _client.put('/vehicles/$vehicleId', data: input.toJson())));

  /// Soft delete on the backend.
  Future<void> remove(String vehicleId) => _client.delete('/vehicles/$vehicleId');
}

class PromotionsApi {
  PromotionsApi(this._client);
  final ApiClient _client;

  Future<List<Promotion>> active({VehicleType? vehicleType}) async => asList(
        await _client.get('/promotions/active',
            query: vehicleType == null ? null : {'vehicleType': vehicleType.wire}),
        Promotion.fromJson,
      );

  Future<PromoValidation> validate({
    required String code,
    required double tripAmount,
    VehicleType? vehicleType,
  }) async =>
      PromoValidation.fromJson(asJson(await _client.post(
        '/promotions/validate',
        data: compactJson({
          'code': code,
          'tripAmount': tripAmount,
          'vehicleType': vehicleType?.wire,
        }),
      )));
}

class NotificationsApi {
  NotificationsApi(this._client);
  final ApiClient _client;

  Future<List<AppNotification>> mine() async =>
      asList(await _client.get('/notifications'), AppNotification.fromJson);

  Future<void> markRead(String notificationId) =>
      _client.put('/notifications/$notificationId/read');
}

class LocationsApi {
  LocationsApi(this._client);
  final ApiClient _client;

  Future<List<FavoriteLocation>> favorites() async =>
      asList(await _client.get('/locations/favorites'), FavoriteLocation.fromJson);

  Future<FavoriteLocation> addFavorite(FavoriteLocationInput input) async =>
      FavoriteLocation.fromJson(asJson(
          await _client.post('/locations/favorites', data: input.toJson())));

  Future<FavoriteLocation> updateFavorite(
          String locationId, FavoriteLocationInput input) async =>
      FavoriteLocation.fromJson(asJson(await _client
          .put('/locations/favorites/$locationId', data: input.toJson())));

  Future<void> deleteFavorite(String locationId) =>
      _client.delete('/locations/favorites/$locationId');
}

class SupportApi {
  SupportApi(this._client);
  final ApiClient _client;

  Future<SupportTicket> createTicket(CreateTicketRequest request) async =>
      SupportTicket.fromJson(
          asJson(await _client.post('/support/tickets', data: request.toJson())));

  Future<List<SupportTicket>> myTickets() async =>
      asList(await _client.get('/support/tickets'), SupportTicket.fromJson);

  Future<SupportMessage> sendMessage(String ticketId, String message) async =>
      SupportMessage.fromJson(asJson(await _client.post(
          '/support/tickets/$ticketId/messages',
          data: {'message': message})));

  Future<List<SupportMessage>> messages(String ticketId) async => asList(
      await _client.get('/support/tickets/$ticketId/messages'),
      SupportMessage.fromJson);
}

class PaymentsApi {
  PaymentsApi(this._client);
  final ApiClient _client;

  Future<PaymentCheckout> create({
    required String tripId,
    required double amount,
    required String paymentMethod,
    String currency = 'BDT',
  }) async =>
      PaymentCheckout.fromJson(asJson(await _client.post('/payments', data: {
        'tripId': tripId,
        'amount': amount,
        'paymentMethod': paymentMethod,
        'currency': currency,
      })));

  Future<Payment> byId(String paymentId) async =>
      Payment.fromJson(asJson(await _client.get('/payments/$paymentId')));

  Future<Payment> verify(String paymentId, {required String transactionId}) async =>
      Payment.fromJson(asJson(await _client.post('/payments/$paymentId/verify',
          data: {'transactionId': transactionId})));
}

class HealthApi {
  HealthApi(this._client);
  final ApiClient _client;

  /// True when the backend answers `GET /health`.
  Future<bool> check() async {
    try {
      await _client.get('/health', authenticated: false);
      return true;
    } on ApiException {
      return false;
    }
  }
}

enum DriverTripsFilter {
  active('active'),
  upcoming('upcoming'),
  history('history');

  const DriverTripsFilter(this.wire);
  final String wire;
}
