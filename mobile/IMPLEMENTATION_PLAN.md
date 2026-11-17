# Grameen Rider — Mobile Implementation Plan (User app + Rider/Driver app)

Source of truth: `grameen-rider.postman_collection.json` (Grameen Rider API v1, base `{{baseUrl}}/api`, Bearer auth),
cross-checked against `backend/src`.

> **Naming.** In this plan the **User app** (`mobile/user`, package `grameen_ride_user`) is the passenger app and the
> **Rider app** (`mobile/rider`, package `grameen_ride_driver`) is the driver app. Watch out: the backend socket layer
> uses `role: 'rider'` to mean *passenger* and `'driver'` for driver. The client code should hide this behind an enum.

---

## 1. Where we are today

| Area | State |
|---|---|
| Both apps | Flutter, `provider`, `http`, `socket_io_client`, `flutter_map`, `geolocator`, Bangla/English l10n, Nikosh font. |
| Code layout | `rider/lib` is a near-copy of `user/lib` (all passenger screens are present in the driver app too). Only `main.dart`, `rider_main_screen.dart`, realtime and a few widgets differ. |
| Backend wiring | **None.** No REST client. Login is a fake OTP screen that sets `isLoggedIn=true` in SharedPreferences. Favorites live in SharedPreferences. Fares come from local `PriceCalculator`. |
| Realtime | `RealtimeService` connects to hard-coded `http://localhost:5006`, registers with the phone number as `userProfileId`. Driver app streams GPS via `driver_location_ping` (method `emitDriverLocationPing` exists only in the rider copy). |
| Rider tabs | Home is real; Trips / Notifications / Settings tabs are placeholder `Text` widgets. |

---

## 2. Backend gaps to settle first (blockers / risks)

These came up while mapping the collection to the screens. Each needs a decision before the matching mobile phase.

| # | Issue | Impact on mobile | Proposed fix |
|---|---|---|---|
| B1 | `GET /trips/fare-estimate` takes a **JSON body on a GET**. | Dart `http.get` can't send a body; proxies often drop it. | Switch to query params or `POST /trips/fare-estimate`. |
| B2 | `POST /trips` accepts `baseFare`, `subtotal`, `totalFare` from the client. | Client can set its own price. | Server recomputes fare (and applies promo) and ignores client totals; app only shows the estimate. |
| B3 | `GET /trips` only returns trips where the caller is **passenger** (`findByPassengerId`). | Driver app has no trip history / no way to recover the active trip after restart. | Return driver trips when caller is a driver, or add `GET /drivers/me/trips` and `GET /trips/active`. |
| B4 | Login is phone + **password** only; the product needs **both password and OTP** (decision D1). | OTP login has no endpoint. | Add `POST /auth/otp/request {phone, purpose}` and `POST /auth/otp/verify {phone, code}` → same `{success, user, tokens}` shape as `/auth/login`. Send codes with the existing `notifications/sms.service.ts` (BulkSMSBD) unless the auth server can issue them. Needs: 6-digit code, 5 min expiry, rate limit per phone + IP, max 5 attempts. |
| B5 | No refresh-token, logout or profile-update endpoints in the collection (auth server returns `tokens.accessToken`/`refreshToken`). | Users get logged out when the token expires; can't edit name/photo. | Add `POST /auth/refresh`, `POST /auth/logout`, `PUT /user-profiles/me`. |
| B6 | Socket.IO has **no auth**: client self-declares `userProfileId` + role; `driver_location_ping` trusts client `driverId`. `trip.status.updated` is also broadcast to every rider and every driver. | Anyone can impersonate a driver location or watch all trips. | Authenticate the socket with the JWT in `handshake.auth.token`; derive identity server-side; emit status only to the trip room + passenger + assigned driver. |
| B7 | No endpoint for drivers to list open requests (only the `trip.new_request` push). | If a push is missed, the driver never sees the request. | Add `GET /trips/nearby-requests` (driver only). |
| B8 | No document upload (licence, NID, vehicle photos) for driver onboarding. | Admin verifies driver with no evidence. | Add a presigned-upload endpoint; optional for MVP. |
| B9 | Payments: cash is the launch default (D4); SSLCommerz or aamarPay comes next. The backend already has an SSLCommerz provider (and PortPos), but no aamarPay. | `POST /payments` already returns `checkoutUrl`; the app opens it and then verifies. | Launch: trips default to `paymentMethod: "cash"`, driver confirms cash received on complete. Next: finish SSLCommerz end to end (success/fail/cancel callback URLs that deep-link back to the app); add an aamarPay provider only if chosen over SSLCommerz. |
| B10 | Launch vehicle types are fixed (D3), but the backend fare table also prices `cng`, `pickup_van`, `car_rental`, `boat_rental`, and the app enum offers them too. | Users could book types with no drivers. | Expose an `enabledVehicleTypes` setting (e.g. `GET /config` or `system_settings`) so the apps only show launch types, and review the launch rates in `fare-calculation.service.ts`. |

---

## 3. Shared foundation (both apps)

Build this once and reuse it, instead of growing two copies.

### 3.1 Shared package
Create `mobile/packages/grameen_core` (path dependency from both `pubspec.yaml`s):

```
grameen_core/lib/
  config/env.dart            # API_BASE_URL, SOCKET_URL via --dart-define
  api/api_client.dart        # dio + auth/refresh/error interceptors
  api/api_exception.dart     # maps backend exception-filter shape to typed errors
  api/endpoints/             # auth, profile, trips, drivers, vehicles, promotions,
                             # notifications, locations, support, payments
  models/                    # json_serializable models (see 3.3)
  auth/token_store.dart      # flutter_secure_storage
  auth/session.dart          # ChangeNotifier: current user, role, login/logout
  realtime/realtime_client.dart  # socket.io wrapper, typed event streams, reconnect
  push/push_service.dart     # FCM init + PUT /user-profiles/fcm-token
  l10n/, theme/, widgets/    # shared theme (0xFF1bc266, Nikosh), map widgets, logo
```

Move `map_service.dart`, `location_service.dart`, `trip_map_widget.dart`, `mobile_map_widget.dart`, `app_logo.dart` into
the package and delete the duplicates.

### 3.2 Packages to add
`dio`, `flutter_secure_storage`, `json_annotation` + `json_serializable` + `build_runner`, `firebase_core`,
`firebase_messaging`, `flutter_local_notifications`, `go_router` (deep links from notifications), `mocktail` (tests).
Keep `provider` for state (already in use, enough for this scope).

### 3.3 Models (from collection bodies)
`AuthTokens`, `UserProfile`, `Trip` (+ `TripStatus`: `pending, searching_driver, accepted, driver_assigned,
driver_arriving, driver_arrived, in_progress, completed, cancelled, disputed`), `FareEstimate`, `Driver`, `DriverEarnings`,
`Vehicle`, `Promotion`, `PromoValidation`, `AppNotification`, `FavoriteLocation` (`locationType`, `isDefault`),
`SupportTicket`, `SupportMessage`, `Payment`, `Rating`. `VehicleType`, `RentalType` (`single|hourly|daily|custom`) enums
serialize to backend strings.

### 3.4 Cross-cutting rules
- Base URL from `--dart-define=API_BASE_URL=...` (Android emulator: `http://10.0.2.2:5006`). No hard-coded `localhost`.
- `Authorization: Bearer` added by interceptor; on 401 try refresh once (when B5 lands), else log out.
- Never store tokens in SharedPreferences; use secure storage.
- Every list screen: loading, empty, error+retry states; pull-to-refresh.
- Connectivity: show offline banner; queue `PUT /drivers/location` while offline is **not** needed (send latest only).
- All strings through ARB files (bn default, en).

### 3.5 Realtime contract (from `backend/src/realtime`)
| Direction | Event | Payload | Used by |
|---|---|---|---|
| client → server | `register` | `{userProfileId, role: 'rider'\|'driver'}` | both (also sent in handshake `auth`) |
| client → server | `join_trip` | `{tripId}` | both, once a trip is active |
| client → server | `driver_location_ping` | `{tripId, driverId, latitude, longitude, heading?, speedKmh?}` | Rider app during trip |
| server → client | `trip.created` | trip summary | User app |
| server → client | `trip.new_request` | trip request (pickup, dropoff, fare…) | Rider app |
| server → client | `trip.status.updated` | `{tripId, status, …}` | both |
| server → client | `driver.location.updated` | ping + `timestamp` | User app (live driver marker) |

`userProfileId` must be the backend profile id from `GET /user-profiles/me`, **not** the phone number as today.

---

## 4. Endpoint → app matrix

| Endpoint | User app | Rider app |
|---|:-:|:-:|
| `POST /auth/register` (`roleName: customer`) | ✅ | |
| `POST /auth/register` (`roleName: grameen_ride_driver`) | | ✅ |
| `POST /auth/login` | ✅ | ✅ |
| `GET /user-profiles/me`, `PUT /user-profiles/fcm-token` | ✅ | ✅ |
| `GET /trips/fare-estimate` | ✅ | |
| `POST /trips` (with optional `promotionCode`) | ✅ | |
| `GET /trips`, `GET /trips/:id` | ✅ | ✅ (needs B3) |
| `PUT /trips/:id/accept · arrive · start · complete` | | ✅ |
| `PUT /trips/:id/cancel` (`cancelledBy`) | ✅ `passenger` | ✅ `driver` |
| `POST /trips/:id/rate` | ✅ rate driver | ✅ rate passenger (backend already decides who is rated from the caller) |
| `POST /drivers`, `GET /drivers/me` | | ✅ |
| `GET /drivers/me/earnings` | | ✅ |
| `PUT /drivers/location`, `PUT /drivers/availability` | | ✅ |
| `GET /drivers/:id/ratings` | ✅ (driver card) | ✅ (my ratings) |
| `POST/GET/PUT/DELETE /vehicles` | | ✅ |
| `GET /promotions/active`, `POST /promotions/validate` | ✅ | |
| `GET /notifications`, `PUT /notifications/:id/read` | ✅ | ✅ |
| `GET/POST/PUT/DELETE /locations/favorites` | ✅ | |
| `POST/GET /support/tickets`, `GET/POST …/messages` | ✅ | ✅ |
| `POST /payments`, `GET /payments/:id`, `POST …/verify` | ✅ | (view only on trip detail) |
| `/admin/*` | ❌ (web admin, `frontend/`) | ❌ |
| `GET /health` | startup/diagnostics | startup/diagnostics |

---

## 5. User app (passenger) — phases

### U0. Cleanup
- Remove `lib/rider/` from the user app; route `main.dart` through `Session` instead of `isLoggedIn` bool.
- Migrate to `grameen_core`.

### U1. Auth & profile
- Screens: Splash (health check + token restore) → Login with two tabs, **Password** and **OTP** (phone → code → verify; resend timer) → Register (first/last name, phone, optional email, password; phone confirmed by OTP once B4 lands) → Home. Same login screen in the Rider app.
- `POST /auth/register {roleName: "customer", …}`, `POST /auth/login`, then `GET /user-profiles/me`.
- After login: init FCM, `PUT /user-profiles/fcm-token`; connect socket with profile id.
- Profile page shows `/user-profiles/me`; logout clears secure storage + disconnects socket.
- Phone validation for `+8801XXXXXXXXX`.

### U2. Booking flow
- Home: map, pickup (current location / favorite / search via Nominatim), dropoff, vehicle type, rental type (existing `rental_type_screen`, `rental_details_screen`).
- Compute distance/duration via existing `MapService` route (ORS) → `GET /trips/fare-estimate` (B1) → show fare per vehicle type. Keep `PriceCalculator` only as offline fallback.
- Promo: list `GET /promotions/active?vehicleType=`; enter code → `POST /promotions/validate {code, tripAmount, vehicleType}` → show discount.
- Confirm → `POST /trips` → go to **Searching driver** screen; `join_trip`.

### U3. Live trip
- Single `ActiveTripController` (ChangeNotifier) driven by `trip.status.updated` + polling `GET /trips/:id` every 15 s as fallback.
- States → UI: `searching_driver` (spinner + cancel) → `accepted/driver_assigned` (driver card: name, vehicle, rating from `GET /drivers/:id/ratings`, call button) → `driver_arriving` (live marker from `driver.location.updated`, ETA) → `driver_arrived` → `in_progress` (route + live marker) → `completed` → Payment → Rating.
- Cancel: `PUT /trips/:id/cancel {cancellationReason, cancelledBy: "passenger"}` with reason picker.
- Restore active trip on app start from `GET /trips` (first non-terminal status).

### U4. Payment & rating
- Launch: cash only. The trip summary shows "Pay cash to driver"; no payment call from the user app.
- Next (SSLCommerz/aamarPay): payment sheet with Cash / Online. Online → `POST /payments {tripId, amount, paymentMethod, currency: "BDT"}` → open `checkoutUrl` in an in-app browser → return via deep link → `POST /payments/:id/verify` → `GET /payments/:id` for status.
- Rating: `POST /trips/:id/rate {rating, review, tags[]}`; tag chips (`punctual`, `clean_vehicle`, `polite`, `safe_driving`…).

### U5. History, favorites, notifications, support
- Trips tab: `GET /trips` list (status chips, filters), detail via `GET /trips/:id` (receipt, rating, report issue).
- Favorites: replace SharedPreferences service with `/locations/favorites` CRUD; one-time migration of local favorites on first login; `home`/`work`/`other` types, `isDefault`.
- Notifications: `GET /notifications`, mark read on open, badge count on tab; FCM tap → deep link to trip/ticket.
- Support: replace WhatsApp-only screen with tickets: create (`category`, `priority`, optional `tripId`), list, chat thread (`GET/POST …/messages`). Keep WhatsApp as a secondary button.

---

## 6. Rider app (driver) — phases

### R0. Cleanup
- Delete passenger screens copied from the user app (`lib/user/*` except login/settings, `rental_*`, `favorite_*`, `location_picker_*`), and `lib/demo`.
- Migrate to `grameen_core`. Fix `driverId` (currently phone number) to the real driver id from `GET /drivers/me`.

### R1. Auth & onboarding (state machine on `GET /drivers/me`)
1. Register `POST /auth/register {roleName: "grameen_ride_driver", …}` / Login.
2. No driver profile (404) → **Driver profile form**: `POST /drivers {licenseNumber, licenseExpiryDate, vehicleRegistrationNumber}`.
3. No vehicle → **Add vehicle**: `POST /vehicles {vehicleType, licensePlate, seatingCapacity, make, model, year, color}`.
4. Verification pending → **Waiting for approval** screen (pull to refresh, support link). Rejected → show `rejectionReason`, allow edit/resubmit.
5. Approved → Home.

### R2. Home: go online & receive requests
- Online toggle → `PUT /drivers/availability {isOnline, isAvailable}`.
- While online: foreground location stream → `PUT /drivers/location` every ~15 s or 50 m (throttled). Needs Android foreground service + background location permission (`geolocator` foreground notification config; iOS `UIBackgroundModes: location`).
- Listen `trip.new_request` → full-screen **Request card**: pickup, dropoff, distance, fare, passenger count, 15 s countdown, sound/vibration; also delivered via FCM when app is backgrounded.
- Accept → `PUT /trips/:id/accept` (backend uses a Redis lock; handle 409 "already taken" gracefully). Decline → dismiss locally.

### R3. Active trip
- `join_trip`; stream `driver_location_ping` every 3–5 s / 10 m (existing code), stop on terminal status.
- Buttons in order: **Arrived** `PUT /arrive` → **Start trip** `PUT /start` → **Complete** `PUT /complete`. Disable buttons while a call is in flight; make them idempotent on retry.
- Navigation: "Open in Google Maps" (existing `MapService` URL launchers) for pickup then dropoff; call passenger.
- Cancel with reason → `PUT /cancel {cancelledBy: "driver"}`.
- On complete: show the fare to collect in cash and a "Cash received" confirmation; then rate the passenger (`POST /trips/:id/rate`, same stars + tags UI as the user app, driver-side tags such as `polite`, `on_time`, `respectful`).
- Restore active trip on restart (needs B3).

### R4. Earnings, vehicles, ratings, profile
- Earnings tab: `GET /drivers/me/earnings` — today / week / month totals, per-trip list.
- Vehicles: list/add/edit/soft-delete (`/vehicles`), mark active vehicle.
- My ratings: `GET /drivers/{driverId}/ratings?page=&limit=20` with infinite scroll + average.
- Profile from `/user-profiles/me` + `/drivers/me` (verification badge, licence expiry warning).

### R5. Notifications & support
- Same notification and support-ticket modules as the user app (shared package widgets).

---

## 7. Testing & quality

- **Unit**: models (`fromJson` against the collection's example bodies), `ApiClient` interceptors, `ActiveTripController` state transitions, driver onboarding state machine.
- **Widget**: login/register validation, booking summary, request card countdown, trip action buttons.
- **Integration**: run against the docker-compose backend; script the happy path both ways: user creates trip → driver accepts → arrive → start → complete → user pays + rates.
- Use the Postman collection (`postman collection run`) as the contract check in CI before mobile releases; add response examples to the collection so models can be generated/verified.
- `flutter analyze` clean, `flutter_lints` upgraded to current.

---

## 8. Suggested sequence

| Sprint | Backend | Shared | User app | Rider app |
|---|---|---|---|---|
| 1 | B1, B3, B4 (OTP endpoints), B10 | `grameen_core`: env, ApiClient, auth, models ✅ | U0, U1 | R0, R1 |
| 2 | B2, B6 (socket auth) | RealtimeClient, FCM | U2 | R2 |
| 3 | B7 | — | U3 | R3 |
| 4 | B5 | Notifications + support widgets | U4, U5 | R4, R5 |
| 5 | B8, B9 (bKash checkout) | — | polish, offline, l10n pass | background location hardening, battery tests |

The end-to-end trip (sprints 2–3) is the critical path; both apps must reach the same phase together so the flow can be tested.

---

## 9. Decisions (answered 2026-10-31)

| # | Question | Decision | What it changes |
|---|---|---|---|
| D1 | Password or OTP login? | **Both.** | Login screen has Password and OTP tabs in both apps; backend needs OTP endpoints (B4). |
| D2 | Can drivers rate passengers? | **Yes.** | Rider app gets a rating step after completing a trip (R3). Backend already supports it. |
| D3 | Launch vehicle types? | **Motorbike, Car, Battery auto (easy bike), Bangladeshi van, Rickshaw.** | Apps show only these: `motorcycle`, `car`, `auto`, `van`, `rickshaw`. `cng`, `pickup_van`, `car_rental`, `boat_rental` stay in the code for later but are hidden (B10). |
| D4 | Default payment? | **Cash first; SSLCommerz or aamarPay soon.** | U4 launches cash-only; online payment follows using the `checkoutUrl` flow (B9). |
| D5 | One app or two? | **Two separate apps** over the shared `grameen_core` package (recommended; see below). | No change to the current layout. |

### Why two apps (D5)
- **Location permission.** The driver app must track location in the background. Google Play and the App Store review background location strictly and ask why each app needs it; a single app would have to justify it for every passenger too, and passengers would see a scarier permission prompt.
- **Size and low-end phones.** Passengers in rural areas often have cheap phones and limited data. Keeping driver-only code (onboarding, foreground location service, earnings) out of the passenger app keeps it smaller.
- **Separate releases.** Driver-side fixes (location, trip actions) can ship without re-releasing the passenger app, and the other way round.
- **Simpler screens.** No role switching, no "which mode am I in" bugs, and each app's home screen is built for one job.
- **The cost is small now.** `grameen_core` already holds the API, models, login and realtime code, so the second app is mostly its own screens.
- **Downside:** two store listings, and a driver who also rides needs both apps. One account works in both, since both log in against the same backend.

### Vehicle type mapping (D3)
| Product name | Backend `vehicleType` | Notes |
|---|---|---|
| Motorbike | `motorcycle` | |
| Car | `car` | Also supports hourly/daily rental via `rentalType`. |
| Battery auto (easy bike) | `auto` | Confirm this is the battery-powered three-wheeler, not CNG. |
| Bangladeshi van | `van` | Current fare (৳80 base, ৳22/km) looks priced for a microbus; review for a rickshaw-van. |
| Rickshaw | `rickshaw` | |
