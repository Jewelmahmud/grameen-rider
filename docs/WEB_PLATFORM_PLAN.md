# Grameen Ride — Web Platform Design & 2-Day Development Plan

**Status:** Proposed (rev 3: no bargaining; km-based prices for rides and rentals; fair-share auto-matching)
**Date:** 2026-11-16
**Scope:** `backend/` + `frontend/` (web customer booking + admin/operations console).
Mobile wiring stays in `mobile/IMPLEMENTATION_PLAN.md`; this plan adds what the apps need from the backend.
**Auth reference:** `grameenauthserver/docs/authserver.md` (newest copy; `grameen-rider/authserver.md` is an older copy
without the `isEmployee`/`designation` section).

---

## 0. TL;DR

- One platform, two services. **Both have a system-calculated price the customer sees before booking, and both are
  matched to a driver automatically.** There is no bargaining.
  - **Ride:** instant or scheduled point-to-point trip. Price = a fixed route fare if admin set one for that pair of
    areas, otherwise the km-based rate.
  - **Rental:** booked in advance for an appointed time (larger vehicles, round trips). Price = rental km-based rate
    for the planned distance (one way or round trip).
- **Fair-share matching:** each trip is offered to **one driver at a time**, chosen by proximity balanced with how
  much work each driver has had today, instead of broadcasting to 20 drivers.
- **GiLab Auth** is the single login/registration provider. Our backend proxies login/registration/OTP and verifies
  tokens with GiLab's **introspection** endpoint (no shared secret).
- 5 platform roles from GiLab roles: `super_admin` (global `admin`/`super_admin`), `ride_admin`, `operations`
  (incl. `grameen_ride_branch_admin`), `driver`, `customer` (everything else).
- **GiLab employees** get "sparks": addressed by designation, an employee badge drivers can see, a discount, priority
  dispatch and employee-only offers. All configurable by admin.
- Web is rebuilt on **Material UI (MUI)** with one design system for the customer pages and the console.
- Day 1 = backend. Day 2 = web.

---

## 1. Current-state assessment

| Area | What exists | Gap |
|---|---|---|
| Auth proxy | `POST /auth/login`, `/auth/register` forward to GiLab and sync `user_profiles`. | **No `X-Application-ID`** (required in production → `400 MISSING_APPLICATION_ID`). Registration sends no `companyId` (required). All logins come from our server IP, so GiLab's **5 failed attempts / 15 min per IP** limit would lock out every user at once. No refresh, logout, OTP or phone-verification routes. Sync drops `isEmployee`, `designation`, `avatar`, role details. |
| Token check | `AuthCircuitBreakerService`: HS256 verify with a shared secret, else `POST /api/auth/validate`. | That validate route doesn't exist on GiLab; the real one is `POST /oauth/introspect`. `iss`/`aud` not checked. No cache. |
| Roles | `RolesGuard` + `@Roles('admin')` on `/admin/*`. | Token roles are **names only**, company-scoped and global mixed: a company-level `admin` of another Grameen company would get our console. `grameen_ride_admin`, `super_admin`, operations locked out. |
| Fares | `FareCalculationService` with a constant `RATES` table, 15 % fee. Rentals priced by hour/day. | Not editable; no route fares, minimum fare, night surcharge; no km-based rental rates. |
| Trip creation | `POST /trips` stores fares **sent by the client** (`trips.service.ts:79`). | Price tampering. |
| Matching | `DriverMatchingService.findOptimalDrivers`: up to 20 drivers within 10 km, scored 60 % distance, 30 % rating, 10 % total rides, all sent to Kafka at once. | Broadcast → fastest tapper wins. Experienced drivers are favoured forever, so new drivers starve. Haversine via `acos` can return `NaN` when the points coincide. No PostGIS index use. |
| Scheduled trips | `ScheduledTripsService` cron every minute moves trips due in 15 min to `searching_driver`. | Fine for rides; rentals need an earlier dispatch window and an ops alert when nobody accepts. |
| Admin API | stats, driver verify, promotions create/toggle, support tickets. | No fares, settings, users, trips, reports, audit log. |
| Web | React 19 + Vite, custom CSS (~1.9k lines), login via backend proxy. | DEV auth bypass in `ProtectedRoute`, client-side role picker, mock fleet data, no admin pages, no design system. |
| DB | TypeORM, `synchronize` in development only. | `migrations/` empty → nothing deployable. |

---

## 2. Requirements

### 2.1 Functional
1. Customers book **rides** and **rentals** from web and mobile. They see the system price before confirming, and a
   driver is matched automatically.
2. Admin edits route-based and km-based ride fares, km-based rental rates, matching rules and all controls in §6.
3. Fare changes apply to new quotes only; trips keep their fare snapshot.
4. Driver work is shared fairly: nearby drivers with fewer jobs today are offered work first.
5. Platform roles come from GiLab; GiLab employees get the perks in §3.5.
6. Every admin/operations change is audit-logged.

### 2.2 Non-functional
| Concern | Target (MVP) |
|---|---|
| Load | ~5k DAU, peak ~10 bookings/min, ~1k online drivers pinging every 5 s (~200 Redis writes/s). One backend instance + Redis. |
| Quote latency | p95 < 300 ms. |
| Time to driver (ride) | median < 60 s in served areas. |
| Auth overhead | p95 < 20 ms on a cache hit; one introspection call per token (≤ 15 min life). |
| Availability | GiLab down → logins fail with a clear message; cached tokens keep working until they expire. |
| UX | Bangla first, English second; BDT whole taka; WCAG 2.1 AA in the console. |

### 2.3 Constraints
1–2 days, existing stack (NestJS 10, TypeORM, Postgres+PostGIS, Redis, Kafka, Socket.IO, React 19/Vite), small team.

---

## 3. Identity, roles and employees

### 3.1 GiLab integration (from `authserver.md`)

| Our route | GiLab route | Notes |
|---|---|---|
| `POST /auth/login` | `POST /oauth/login` | password, or `{phone, mfaCode}` after OTP |
| `POST /auth/otp/send` | `POST /oauth/send-otp` `{phone, purpose:"login"}` | OTP login (mobile B4 solved by GiLab) |
| `POST /auth/register` | `POST /api/v1/registration` | `roleName` ∈ `customer`, `grameen_ride_driver`; adds `companyId = GRAMEEN_RIDE_COMPANY_ID`; phone normalised to `01XXXXXXXXX` |
| `POST /auth/verify-phone` | `POST /oauth/verify-phone` `{phone, code}` | login is refused until verified (`401 VERIFICATION_REQUIRED`) |
| `POST /auth/resend-verification` | `POST /oauth/resend-verification` | |
| `POST /auth/refresh` | `POST /oauth/refresh` `{refreshToken}` | refresh token is **not rotated** |
| `POST /auth/logout` | `POST /oauth/logout` (Bearer + `{refreshToken}`) | ends that session only |
| (middleware) | `POST /oauth/introspect` | token validity |
| (middleware, on first sight / every 15 min) | `GET /oauth/me` with the user's token | role details (`isGlobal`, `companyId`, `isActive`) |

Every call to GiLab sends `X-Application-ID: GILAB_APPLICATION_ID`. Login/OTP calls also send `X-Client-Secret` and
`X-End-User-IP`, so GiLab rate-limits **per end user, not per our server IP**. This needs the GiLab team to add Grameen
Ride to `TRUSTED_SERVER_APPLICATION_IDS` (action item, §11). The client secret lives only in the backend env.

### 3.2 Token verification (ADR-001)
1. `sha256(token)` → Redis lookup. Hit → use cached claims.
2. Miss → `POST /oauth/introspect`. `active: false` → 401. `active: true` → check `iss = grameen-auth-server`,
   `aud = grameen-applications`, `exp`. Then decode the payload for `roles`/`permissions`. Decoding without verifying
   is safe here because GiLab has just confirmed this exact token string is genuine.
3. Cache claims until `exp`. Access tokens can't be revoked at GiLab, so caching to `exp` loses nothing.
4. GiLab unreachable on a miss → `503 AUTH_SERVICE_UNAVAILABLE` (existing circuit breaker kept).

### 3.3 Role mapping

| GiLab role (active) | Condition | Platform role | Console |
|---|---|---|---|
| `admin`, `super_admin` | role `isGlobal = true` | `super_admin` | Admin console, everything |
| `grameen_ride_admin` | any | `ride_admin` | Admin console, all but system switches |
| `grameen_ride_operations`, `grameen_ride_branch_admin` | any | `operations` | Operations console |
| `grameen_ride_driver` | any | `driver` | Driver app |
| `customer` and **any other role** (incl. company-scoped `admin`) | — | `customer` | Booking |

- The token lists active role names but not whether `admin` is global. The middleware reads `isGlobal` from the
  profile's stored `gilab_roles`, refreshed from the login response or `GET /oauth/me` (cached 15 min). If it can't be
  confirmed, the user gets `customer`.
- A user can hold several roles. Staff and drivers can also book as customers.
- The client never picks a role. The role picker in `DashboardLayout` is removed.

### 3.4 Permission matrix (`@RequirePermission(...)`, replaces `@Roles('admin')`)

| Permission | super_admin | ride_admin | operations | driver | customer |
|---|:-:|:-:|:-:|:-:|:-:|
| `fares.read` | ✅ | ✅ | ✅ | | |
| `fares.write` (ride rates, routes, zones, rental rates) | ✅ | ✅ | | | |
| `matching.write` (radius, timeouts, fairness weights) | ✅ | ✅ | | | |
| `settings.write` (service config) | ✅ | ✅ | | | |
| `settings.system` (maintenance, payment gateways, commission) | ✅ | | | | |
| `promotions.write`, `perks.write` | ✅ | ✅ | | | |
| `trips.read_all`, `trips.intervene` (cancel, reassign, manual assign) | ✅ | ✅ | ✅ | | |
| `drivers.verify`, `vehicles.verify` | ✅ | ✅ | ✅ | | |
| `drivers.suspend`, `users.block` | ✅ | ✅ | | | |
| `support.manage` | ✅ | ✅ | ✅ | | |
| `notifications.broadcast` | ✅ | ✅ | | | |
| `reports.read` | ✅ | ✅ | ✅ | | |
| `reports.export`, `audit.read` | ✅ | ✅ | | | |
| `trips.drive` | | | | ✅ | |
| `trips.book` | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.5 GiLab employee "sparks"

Source: `user.isEmployee` and `user.designation` on every successful GiLab login (password, OTP, verify-otp). Stored on
the profile at each login, and the latest login always wins. If GiLab's employee lookup fails, login still succeeds
with `false`, so perks pause until the next login (simpler and safer than keeping a stale "employee" flag for someone
who left).

Every number below (discount %, monthly cap, vehicle types, on/off switches) is an admin setting changed from the
console; the defaults are only starting values.

| Spark | Where it shows | Admin control |
|---|---|---|
| **Called by designation** | Greeting "স্বাগতম, {name} · {designation}", profile header, receipts | on/off |
| **Driver sees employee status** | "GiLab কর্মী · {designation}" badge on the driver's trip offer card and active trip | on/off |
| **Employee discount** | Ride and rental price | %, monthly cap (BDT), vehicle types |
| **Priority dispatch** | Employee bookings jump the dispatch queue in their area, and the first offer goes out with a wider radius | on/off |
| **Employee-only offers** | Promotions with `audience = employees`, shown on the home screen | via Promotions |
| **Admin visibility** | Employee filter and badge in customer list, trips and reports | — |

Rules:
- Promo code and employee discount **don't stack**; the larger one applies.
- Discounts are **platform-funded**: the driver earns on the pre-discount price, and the commission absorbs the
  discount. Otherwise drivers would decline employee trips.
- Defaults until the business sets them: discount 10 %, cap 1,000 BDT/month, all vehicle types, priority on.

---

## 4. Service flows

### 4.1 Ride
```
POST /pricing/quote {service: ride, pickup, dropoff, vehicleType?}
   ─► route fare if pickup/dropoff match an admin route, else km-based  ─► quote (Redis, 10 min)
POST /trips {quoteId, paymentMethod, promoCode?}
   now:       searching_driver ─► fair-share dispatch (§4.3)
   scheduled: scheduled ─► dispatch starts T − 15 min (existing cron)
   ─► accepted ─► driver_arriving ─► driver_arrived ─► in_progress ─► completed ─► rate both sides
```

### 4.2 Rental
```
POST /pricing/quote {service: rental, pickup, destination, stops?, roundTrip, startAt, vehicleType?, passengers}
   distance = pickup → stops → destination (→ pickup if roundTrip)
   price = rental km rate (§7.2)                         ─► quote (Redis, 10 min)
POST /trips {quoteId, paymentMethod, promoCode?}         ─► status scheduled, price fixed
   T − dispatchLead (default 60 min; at once if startAt is sooner) ─► fair-share dispatch (§4.3)
   driver accepts ─► driver_assigned; customer sees driver + vehicle
   reminders at T − 60 and T − 15 (push + SMS)
   T − 30 and still unassigned ─► alert operations; ops can assign manually or call the customer
   driver taps "on my way" ─► driver_arriving ─► driver_arrived ─► in_progress ─► completed
```
- The quoted price is final. If the customer adds stops during the trip (P1), the extra km are charged at the rental
  per-km rate and shown before the driver accepts the change.
- Cancellation: free until T − 120 min, then a fee (P1, admin-set).
- A driver with an accepted rental is not offered rides that would overlap its start time (start − 30 min).

### 4.3 Fair-share dispatch (same engine for rides and rentals)

**Candidates** (PostGIS `ST_DWithin` on a `geography` index):
- online, available, verified, not suspended, vehicle type and service (`serves_ride`/`serves_rental`) match
- within radius R (ride default 5 km, rental 10 km; grows per wave)
- rating ≥ minimum, applied only once a driver has ≥ 20 ratings, so new drivers aren't blocked
- not already offered this trip; no overlapping rental

**Score** (higher = offered first), every term normalised to 0–1 across the candidates:
```
score = wProximity · (1 − distanceKm / R)
      + wFairness  · (1 − tripsToday / maxTripsTodayAmongCandidates)
      + wIdle      · min(idleMinutes / 60, 1)          -- time since last trip ended
defaults: wProximity 0.6, wFairness 0.3, wIdle 0.1
```
Rating and total rides are **not** in the score, because they keep favouring the same drivers. Rating is a filter
only. The weights are admin settings, so the business can tune proximity vs fairness.

**Offer loop** (Bull job per trip):
1. Offer to the best candidate only (`trip.offer` socket + FCM), with a 15 s timeout (ride) or 60 s (rental).
2. Accept → `accepted` / `driver_assigned`. Accept runs in a transaction with `SELECT … FOR UPDATE` and checks the
   driver is still available, so a driver can't take two trips.
3. Decline or timeout → next candidate. After K misses in a wave (default 5) → widen R by a step (default +2 km)
   and recompute.
4. Ride gives up after max search time (default 3 min) → `no_driver_found`, customer can retry. Rental keeps
   trying until T − 30, then alerts ops.
5. Employee bookings and scheduled rentals at dispatch time are processed first in the dispatch queue.

**Fairness guardrails:**
- Declines and timeouts are counted per driver per day. Drivers above a threshold (default 5 in a row) are paused
  for 10 min, with a message, so the next trip goes to someone who wants it.
- `tripsToday` resets at 04:00 Asia/Dhaka.
- Reports show trips and earnings per driver per day, so ops can see whether the spread is fair.

---

## 5. High-level design

```
       ┌──────────── GiLab Auth: /oauth/login · send-otp · verify-phone · refresh · logout · introspect · me
       │                   (X-Application-ID, trusted-server headers)
 ┌─────┴──────────┐  ┌──────────────┐  ┌──────────────┐
 │ Web (React+MUI)│  │ User app     │  │ Driver app   │
 │ /book /console │  │ (Flutter)    │  │ (Flutter)    │
 └──────┬─────────┘  └──────┬───────┘  └──────┬───────┘
        │      REST /api + Socket.IO (JWT in handshake)
 ┌──────▼─────────────────────▼─────────────────▼─────────────────────────────┐
 │ NestJS                                                                     │
 │  auth/      proxy + introspection cache + role resolver + PermissionGuard  │
 │  pricing/   NEW  quotes, ride rates, route fares, zones, rental rates      │
 │  dispatch/  NEW  fair-share candidate scoring + one-at-a-time offer loop   │
 │             (replaces DriverMatchingService broadcast)                     │
 │  admin/     EXTENDED  fares, matching, settings, users, drivers, trips,    │
 │                       reports, audit                                       │
 │  trips/ drivers/ payments/ promotions/ support/ notifications/ realtime/   │
 └───┬───────────────┬─────────────────┬────────────────────┬─────────────────┘
 Postgres+PostGIS   Redis              Kafka                FCM / BulkSMSBD
 (source of truth)  geo, quotes,       trip events          push, SMS
                    token cache,       → earnings, notifs
                    dispatch jobs,
                    driver day stats
```

---

## 6. Admin controls (full list)

**P0** = in the 2-day build · **P1** = next sprint · **P2** = later.

### 6.1 Ride pricing
| Control | Detail | P |
|---|---|:-:|
| Km-based rate per vehicle type | base fare, included km, per km, per minute, minimum fare, waiting/min, extra passenger | P0 |
| Route-based fixed fares | origin zone → destination zone, per vehicle type, fixed BDT, bidirectional, priority, valid from/to | P0 |
| Zones | name bn/en, centre + radius drawn on a map | P0 |
| Commission | global %, override per vehicle type | P0 |
| Night surcharge | multiplier + time window | P0 |
| Fare simulator | pickup/dropoff/vehicle/service → which rule applies + breakdown, before saving | P0 |
| Rate history | versioned with who/when; trips keep their snapshot | P0 |
| Manual surge per zone with expiry | | P1 |
| Cancellation fee + grace minutes | | P1 |

### 6.2 Rental pricing and booking
| Control | P |
|---|:-:|
| Rental km rate per vehicle type: base fare, included km, per km, minimum fare | P0 |
| Return-leg factor for round trips (e.g. 1.0 = full price for the way back) | P0 |
| Rental-enabled vehicle types | P0 |
| Booking window: min lead time, max days ahead | P0 |
| Dispatch lead time (default 60 min), ops alert time (default T − 30) | P0 |
| Reminder times (T − 60, T − 15) | P0 |
| Waiting charge per hour beyond included hours | P1 |
| Cancellation fee schedule | P1 |

### 6.3 Matching (fair share)
| Control | P |
|---|:-:|
| Weights: proximity / fairness / idle | P0 |
| Start radius, radius step, max radius — per service | P0 |
| Offer timeout per service, misses per wave, max ride search time | P0 |
| Minimum rating and minimum rating count before it applies | P0 |
| Decline streak pause (count, minutes) | P0 |
| Employee priority on/off | P0 |

### 6.4 Service configuration
| Control | P |
|---|:-:|
| Enabled vehicle types per service (ride / rental) — replaces hard-coded lists (mobile B10) | P0 |
| Payment methods (cash on; SSLCommerz toggle) | P0 |
| Scheduled ride lead time | P0 |
| Support phone / WhatsApp shown in apps | P0 |
| Maintenance mode + message bn/en | P1 |
| Minimum app versions / force update | P1 |
| Service areas / operating hours by zone | P1 |

### 6.5 People
| Control | P |
|---|:-:|
| Customers: search, profile, trips, block/unblock with reason, employee filter + designation | P0 |
| Drivers: pending queue with documents, verify/reject, suspend/unsuspend, ratings, earnings, trips today, accept rate | P0 |
| Vehicles: verify, deactivate, ride/rental capable | P0 |
| Driver cash dues (commission owed on cash trips) + settle | P1 |
| Staff list (read-only mirror of GiLab platform roles) | P1 |

### 6.6 Operations
| Control | P |
|---|:-:|
| Trips list with filters (status, service, vehicle, date, driver, customer, employee) + timeline incl. every offer sent | P0 |
| Upcoming rentals board: next 24 h, assigned / unassigned, alerts at T − 30 | P0 |
| Manual assign (driver + vehicle) and reassign; admin cancel with reason | P0 |
| Support tickets | P0 |
| Live map of active trips and online drivers | P1 |
| Disputes: fare adjust / refund | P1 |
| Broadcast push/SMS to a segment | P1 |

### 6.7 Growth, perks, reports, governance
| Control | P |
|---|:-:|
| Promotions: create, edit, toggle, audience (all / employees / new users), usage count | P0 |
| Employee sparks (§3.5) | P0 |
| Overview KPIs: trips today, revenue, commission, online drivers, unassigned rentals, by service/vehicle | P0 |
| Fairness report: trips and earnings per driver per day, spread (min / median / max) | P0 |
| Reports: date-range summary + CSV of trips | P0 |
| Audit log viewer (actor, action, before/after) | P0 |

---

## 7. Deep dive

### 7.1 Data model (one migration)

```sql
ALTER TABLE user_profiles
  ADD platform_roles text[] NOT NULL DEFAULT '{customer}',
  ADD gilab_roles jsonb,                         -- [{name,isGlobal,companyId,isActive,expiresAt}]
  ADD gilab_roles_synced_at timestamp,
  ADD is_employee boolean NOT NULL DEFAULT false, ADD designation varchar(150),
  ADD employee_synced_at timestamp,
  ADD status varchar(20) NOT NULL DEFAULT 'active', ADD blocked_reason text;

CREATE TABLE fare_rates (                        -- one table for both services
  id uuid PK, service_type varchar(10),          -- ride | rental
  vehicle_type varchar(20), version int,
  base_fare, base_km, per_km, per_minute, minimum_fare, waiting_per_minute, extra_passenger_fare numeric,
  return_leg_factor numeric NULL,                -- rental round trips
  commission_pct numeric NULL, is_current boolean, created_by uuid, created_at timestamp,
  UNIQUE(service_type, vehicle_type, version));  -- an edit inserts a new version

CREATE TABLE zones (id uuid PK, name_bn, name_en varchar(150),
  center geography(Point,4326), radius_m int, is_active boolean);

CREATE TABLE route_fares (id uuid PK, origin_zone_id uuid FK, destination_zone_id uuid FK,
  vehicle_type varchar(20), fixed_fare numeric(10,2), bidirectional boolean, priority int,
  is_active boolean, valid_from timestamp NULL, valid_to timestamp NULL, updated_by uuid, updated_at timestamp);

CREATE TABLE trip_offers (                       -- dispatch log: who was offered what, and the outcome
  id uuid PK, trip_id uuid FK, driver_id uuid FK, wave int, rank int, score numeric(6,4),
  distance_km numeric(6,2), outcome varchar(10), -- accepted | declined | timeout | cancelled
  offered_at timestamp, responded_at timestamp NULL,
  INDEX (trip_id), INDEX (driver_id, offered_at));

CREATE TABLE admin_audit_logs (id uuid PK, actor_auth_user_id uuid, actor_role varchar(30),
  action varchar(80), entity varchar(50), entity_id varchar(64), before jsonb, after jsonb,
  ip varchar(64), created_at timestamp);

ALTER TABLE trips
  ADD service_type varchar(10) NOT NULL DEFAULT 'ride',   -- ride | rental
  ADD pricing_mode varchar(12),                           -- distance | route
  ADD fare_snapshot jsonb, ADD route_fare_id uuid NULL,
  ADD stops jsonb NULL, ADD round_trip boolean DEFAULT false,
  ADD commission_amount numeric(10,2), ADD employee_discount_amount numeric(10,2) DEFAULT 0,
  ADD is_employee_booking boolean DEFAULT false, ADD dispatch_started_at timestamp NULL;
-- statuses added: scheduled, no_driver_found. scheduledDatetime (exists) is the rental start time.
-- rental_type (single/hourly/daily/custom) is no longer used for pricing; kept for old rows.

ALTER TABLE drivers ADD last_trip_ended_at timestamp NULL,
  ADD is_suspended boolean DEFAULT false, ADD suspended_reason text NULL;
-- Built: no geography column. Distance is computed on the fly from current_latitude/longitude
-- (fast enough at ~1k online drivers); add a geography column + GIST index when that stops holding.
-- Zones store centre lat/lng + radius for the same reason.
ALTER TABLE vehicles ADD serves_ride boolean DEFAULT true, ADD serves_rental boolean DEFAULT false;
ALTER TABLE promotions ADD audience varchar(15) DEFAULT 'all';   -- all | employees | new_users
```
Daily counters (trips, declines, decline streak) live in Redis hashes keyed by driver + Dhaka date, rebuilt from
`trip_offers` if Redis is flushed. Seed: today's `RATES` → `fare_rates` v1 for rides; rental rows seeded for
`car`, `pickup_van`, `van`, `boat_rental` at first-guess rates for the business to correct; settings defaults into
`system_settings`.

### 7.2 Pricing engine (`backend/src/pricing/`)
```
quote(input):
  if service == ride:
      route = best active route_fare where ST_DWithin(origin.center, pickup, origin.radius)
              AND ST_DWithin(dest.center, dropoff, dest.radius) (or reversed if bidirectional), vehicle match
              ORDER BY priority DESC, (origin.radius + dest.radius) ASC
      if route: fare = route.fixed_fare ; mode = route
  if no route (or service == rental):
      r  = current fare_rate(service, vehicle)
      km = max(clientKm, haversineKm over the legs)        -- client can't go below straight lines
      if rental and roundTrip: km = outboundKm + returnKm · r.return_leg_factor
      fare = max(r.minimum, r.base + max(0, km − r.baseKm)·r.perKm + minutes·r.perMinute + extraPax)
      if ride and night window: fare ×= nightMultiplier
      mode = distance
  discount   = max(promo, employee within monthly cap)
  total      = round(fare − discount)
  commission = round(fare · commissionPct) − discount          -- platform-funded discount
  save {quoteId, snapshot: inputs, rule ids + versions, breakdown} in Redis for 10 min
```
Rates and active routes are cached in Redis for 60 s and invalidated on every admin write. `FareCalculationService`
becomes a wrapper so existing callers keep working.

### 7.3 Dispatch engine (`backend/src/dispatch/`)
- `CandidateService`: one PostGIS query (`ST_DWithin(d.location, pickup, R)` + `ST_Distance`) with the filters in
  §4.3, joined to the Redis day counters. Replaces the `acos` query (no `NaN` when points coincide, and it uses the
  index).
- `DispatchProcessor` (Bull queue `dispatch`): one job per trip, holding state `{wave, R, offered[]}`. Each step
  offers to the top candidate and schedules a timeout job. Accept/decline from the driver app cancels the timeout and
  advances the job.
- Priority: Bull job priority, with employee bookings and due rentals first.
- `ScheduledTripsService` cron: rides enter dispatch at T − 15; rentals at T − `dispatchLead`. It also raises the
  T − 30 ops alert for unassigned rentals.
- Every offer is written to `trip_offers`, which feeds the trip timeline and the fairness report.
- Kafka `trip-broadcasts` is no longer used for matching; trip status events stay on Kafka.

### 7.4 API additions

**Auth / public / customer / driver**
```
POST /auth/login · /auth/otp/send · /auth/register · /auth/verify-phone · /auth/resend-verification
POST /auth/refresh · /auth/logout
GET  /config/public                 vehicle types per service, payment methods, support contact, sparks summary
GET  /user-profiles/me              + platformRoles, isEmployee, designation, sparks
POST /pricing/quote                 ride or rental, one or all enabled vehicle types (replaces GET-with-body, mobile B1)
POST /trips {quoteId, paymentMethod, promotionCode?, note?}   client fare fields ignored (mobile B2)
PUT  /trips/:id/cancel
PUT  /trips/:id/offer/accept        driver: accept the current offer (replaces PUT /trips/:id/accept)
PUT  /trips/:id/offer/decline       driver
GET  /drivers/me/offers/current     driver: the pending offer, if a push was missed (mobile B7)
GET  /drivers/me/trips?status       driver: active + upcoming (rentals) + history (mobile B3)
```
The existing trip lifecycle (`arrive/start/complete`) serves both services.

**Admin / operations** (`/admin`, permission-checked, writes audit-logged, class-validator DTOs everywhere)
```
GET/PUT  /fares/rates?service · GET /fares/rates/:service/:vehicleType/history · POST /fares/simulate
CRUD     /zones · /route-fares
GET/PUT  /settings                  (keys split into settings.write / matching.write / settings.system)
GET      /users?q&role&employee&status · PUT /users/:id/block|unblock
GET      /drivers?status · PUT /drivers/:id/verify (exists) · PUT /drivers/:id/suspend
PUT      /vehicles/:id/verify · PUT /vehicles/:id
GET      /trips?status&service&vehicle&from&to&q&employee · GET /trips/:id (with offers)
PUT      /trips/:id/cancel · PUT /trips/:id/assign {driverId, vehicleId} · PUT /trips/:id/redispatch
GET      /rentals/upcoming?hours=24
GET/POST /promotions · PUT /promotions/:id · PUT /promotions/:id/toggle
GET      /support/tickets · PUT /support/tickets/:id/status   (exist)
GET      /stats · /reports/summary?from&to · /reports/fairness?date · /reports/trips.csv?from&to
GET      /audit-logs?entity&actor&from&to
```

### 7.5 Realtime
Authenticate the socket with the JWT (`handshake.auth.token`, same introspection cache) and derive identity
server-side. Events go only to the trip room and its two parties (mobile B6). New events: `trip.offer` (driver,
with countdown), `trip.offer.expired`, `trip.assigned` (customer). An `ops` room for staff gets the rental T − 30
alerts. Socket auth lands first; without it anyone could join the ops room or accept someone else's offer.

### 7.6 Error handling
| Case | Response | Client behaviour |
|---|---|---|
| Quote expired | `409 QUOTE_EXPIRED` | re-quote, show the new price |
| Offer expired / taken | `409 OFFER_NO_LONGER_AVAILABLE` | dismiss the card |
| Driver not available at accept | `409 DRIVER_UNAVAILABLE` | dismiss; dispatch moves on |
| No driver in time (ride) | trip `no_driver_found` | "No driver nearby, try again" + retry button |
| Rental unassigned at T − 30 | ops alert | ops assigns manually or calls the customer |
| Blocked account | `403 ACCOUNT_BLOCKED` | message, not a logout loop |
| GiLab down | `503 AUTH_SERVICE_UNAVAILABLE` | "Login service unavailable, try again" |
| GiLab `VERIFICATION_REQUIRED` | passed through | go to phone verification |

---

## 8. Web app (React + Material UI)

### 8.1 Stack
`@mui/material` + `@mui/icons-material`, `@mui/x-data-grid` (tables with server-side pagination/sort/filter),
`@mui/x-date-pickers` + `dayjs` (Asia/Dhaka), `@tanstack/react-query`, `react-hook-form` + `zod`, `react-i18next`
(bn/en), `leaflet` + `react-leaflet` (OSM, same maps as mobile). Pin exact versions at install. The existing
`styles.css` and custom components are retired page by page.

### 8.2 Design system
- **Theme tokens** in one `theme.ts` (`createTheme`, `cssVariables: true`, light + dark schemes):
  - Brand green `#1bc266` (from the apps) is too light for text on white (contrast 2.35:1). Use it for fills and
    accents only. `primary.main = #0f7a3f` (5.4:1 on white) for buttons and links, with white contrast text.
  - Neutral greys for surfaces; MUI `error`/`warning`/`info`/`success`, each checked against AA.
  - Typography: `Barlow` for English and digits, `SolaimanLipi` for Bangla (Barlow has no Bengali glyphs, so Bangla falls through); 14 px base in the console (dense),
    16 px on customer pages; line-height ~1.6 for Bangla.
  - Radius 3 px (chips included), 8-px spacing grid, elevation only on dialogs and menus (outlined cards elsewhere).
- **Layouts:**
  - Console: permanent `Drawer` (collapsible; temporary below `md`) with permission-filtered nav groups (Overview ·
    Operations · Pricing · Matching · People · Growth · Reports · Settings). `AppBar` with search, language switch,
    theme toggle, and a user menu with name, role and (for employees) the designation badge.
  - Customer: top `AppBar`, mobile-first content capped at 1200 px, bottom navigation on small screens.
- **Patterns, the same on every page:**
  - Page header: title, breadcrumbs, primary action on the right.
  - Lists: DataGrid with toolbar filters, an empty state, a skeleton while loading.
  - Edit: side `Drawer` form for quick edits; a full page for complex ones (route fares and zones on a map).
  - Destructive actions (block, cancel trip, deactivate rate): confirm `Dialog` naming the target, with a reason field.
  - Feedback: `Snackbar` for success; inline `Alert` for errors with the server's Bangla message.
  - Money always `৳ 1,250`, right-aligned, tabular numerals; dates `16 Nov 2026, 3:40 PM`.
  - One fixed status `Chip` colour per trip status across all pages.
- **Accessibility:** AA contrast, visible focus, full keyboard use in grids and dialogs, a label on every input,
  touch targets ≥ 44 px on customer pages, status never by colour alone.

### 8.3 Pages
```
src/
  theme/ (theme.ts, tokens)   i18n/ (bn.json, en.json)   api/ (http + refresh interceptor, modules)
  auth/ (AuthProvider: access token in memory, refresh token in sessionStorage; useMe; RequirePermission)
  layouts/ ConsoleLayout, CustomerLayout
  pages/
    auth/      Login (password | OTP tabs), Register, VerifyPhone
    book/      Book (Ride | Rental tabs: map → price per vehicle → confirm), FindingDriver (live status),
               MyTrips (active, upcoming rentals, history), TripDetail, Profile (employee badge, sparks)
    console/   Overview, Trips, TripDetail (with offer timeline), UpcomingRentals, Drivers, DriverDetail,
               Vehicles, Customers, Pricing/{RideRates, RentalRates, RouteFares, Zones, Simulator},
               Matching, Promotions, Sparks, Support, Reports (summary, fairness), Settings, AuditLog
```
After login, `GET /user-profiles/me` decides the landing page: staff → `/console`, others → `/book`. The DEV auth
bypass and the mock `MOCK_FLEET` data are removed.

---

## 9. Architecture decisions

### ADR-001: Verify GiLab tokens by introspection with a cache
**Context.** GiLab signs with HS256 (`authService.ts` → `jwt.sign(payload, secret)`); its `/oauth/jwks` returns a
placeholder symmetric key, not a public key. Local verification would need GiLab's master secret.

| | A: Shared HS256 secret | B: `/oauth/introspect` + Redis cache | C: GiLab moves to RS256 + real JWKS |
|---|---|---|---|
| Latency | ~0 | 1 call per token (≤ 15 min), then ~1 ms | ~0 |
| GiLab down | works | cached tokens only | works |
| If our server leaks | attacker mints tokens for **all** Grameen apps | only our cached sessions | only our sessions |
| Effort | exists | ~1 h | GiLab team |

**Decision.** B now; ask GiLab for C. **Revisit** when GiLab publishes RS256 keys.

### ADR-002: Pricing rules in versioned tables, server-issued quotes
**Decision.** Typed tables (`fare_rates` versioned per service and vehicle, `zones`, `route_fares`) plus a quote
snapshot in Redis; trips store the snapshot. Rejected: env constants (a deploy per price change) and one JSON blob
in `system_settings` (no validation or history). **Revisit** for polygon zones and automatic surge.

### ADR-003: Rental is a scheduled trip with its own km rates (no bargaining)
**Context.** Rev 2 had drivers offering prices and customers countering. The product owner chose a fixed km-based
price shown upfront, with automatic matching.
**Decision.** Rental = `trip` with `service_type = rental`, priced from `fare_rates(service = rental)`, dispatched
by the same engine as rides but earlier (T − 60). No offers table for prices.
**Consequences.** + Simpler for customers and drivers, one dispatch engine, ~3 h less work than rev 2. − The price
can't adapt to unusual trips (remote areas, festivals). Admin handles that with route fares and rates.
**Revisit** if drivers decline rentals often in some areas: add per-zone rental surcharges before considering
bargaining again.

### ADR-004: Fair-share sequential dispatch instead of broadcast
**Context.** Today a trip goes to up to 20 drivers at once, scored partly by rating and total rides. The fastest
tapper wins, and experienced drivers are always ranked higher.

| | A: Broadcast (today) | B: Sequential, proximity only | C: Sequential, proximity + fairness |
|---|---|---|---|
| Time to driver | fastest | slower (one at a time) | slower (one at a time) |
| Fairness | poor (tap speed, seniority) | poor (drivers parked in hot spots win) | good |
| Driver trust | low | medium | high |
| Effort | exists | ~2 h | ~2.5 h |

**Decision.** C with admin-tunable weights. Short offer timeouts (15 s) keep waits low.
**Consequences.** Median wait rises slightly in dense areas; it can be tuned by lowering the fairness weight or the
timeout. **Revisit** at high density: offer to 2 drivers at once and pick by score.

### ADR-005: Platform roles resolved server-side; global admin checked against role details
**Decision.** Role names come from the verified token; the `isGlobal` check for `admin`/`super_admin` comes from
GiLab role details on the profile (login response or `/oauth/me`, refreshed every 15 min). Authorize by permission,
not role name. **Consequence.** A role change in GiLab takes effect within 15 minutes.

### ADR-006: Material UI as the web design system
**Decision.** MUI, as the product owner asked. DataGrid and date pickers save most of a day, the look stays
consistent in bn/en, and accessibility defaults are good. **Consequence.** Larger bundle; route-level code splitting
keeps DataGrid out of the customer pages.

---

## 10. Two-day build plan

Focused engineering hours; each block ends with its unit tests green.

### Day 1 — Backend (≈ 10 h)
| # | Block | Output | h |
|---|---|---|---|
| 1 | GiLab client | One `GilabClient` (app-id + trusted-server headers, error mapping); login, OTP send, register (+companyId, phone normalisation), verify-phone, resend, refresh, logout. Update `auth.service.spec.ts`. | 1.5 |
| 2 | Token + roles | Introspection + Redis cache, `iss`/`aud`/`exp`, `/oauth/me` role sync, `resolvePlatformRoles`, `PermissionGuard`, blocked check. Tests: company-scoped `admin` → customer, global `admin` → super_admin, branch_admin → operations, unknown → customer. | 1.5 |
| 3 | Profile + sparks | Profile columns, employee sync on login, `/user-profiles/me` + sparks, `/config/public`. | 0.75 |
| 4 | Migration + seed | Entities, migration, seed rates and settings, driver `location` column + GIST index. | 0.75 |
| 5 | Pricing | `pricing/` module + quotes for both services; trips created from `quoteId` with snapshot, commission, employee discount. Tests: route beats km, bidirectional, min fare, night, round-trip factor, discount best-of + cap. | 2 |
| 6 | Dispatch | Candidate query, scoring, Bull offer loop with timeouts and waves, accept locking, decline pause, rental dispatch window + T − 30 alert, socket JWT auth + offer events, driver offer endpoints. Tests: fairness ordering, rating filter only after 20 ratings, timeout → next driver, double-accept race, overlap with a rental. | 2.5 |
| 7 | Admin APIs | §7.4 admin list, audit-log interceptor, DTO validation. | 1 |
| — | Contract | New requests in `grameen-rider.postman_collection.json`; Postman CLI run locally, incl. negative role cases. | (in blocks) |

### Day 2 — Web (≈ 10 h)
| # | Block | Output | h |
|---|---|---|---|
| 8 | Foundation | MUI theme + tokens, layouts, i18n, react-query, auth/refresh, permission routing; remove DEV bypass + mock data. | 1.5 |
| 9 | Auth pages | Login (password/OTP), Register, VerifyPhone. | 0.75 |
| 10 | Customer | Book (ride + rental tabs, map, price per vehicle, confirm), FindingDriver, MyTrips, TripDetail, Profile with badge. | 2.25 |
| 11 | Console: pricing + matching | Ride rates (with history), Rental rates, Zones on map, Route fares, Simulator, Matching settings. | 2 |
| 12 | Console: ops | Overview, Trips + detail with offer timeline, Upcoming rentals + manual assign, Drivers, Vehicles, Customers. | 2 |
| 13 | Console: rest | Promotions (audience), Sparks, Settings, Support, Reports (summary + fairness + CSV), Audit log. | 1.25 |
| 14 | Check | Smoke test with one test account per role, console a11y pass (contrast, keyboard), staging build. | 0.25 |

**If time runs short, cut in this order:** reports CSV → audit-log viewer (keep the logging) → vehicles page →
rate-history view → fairness report page (keep `trip_offers` logging). Never cut: server-side quotes, permission
guard, socket auth, accept locking, audit logging.

**Mobile follow-ups (not in these 2 days):** OTP login + phone verification, `/pricing/quote` + `quoteId`,
`/config/public`, employee badge + designation greeting, rental booking screen, and in the driver app the
one-at-a-time offer card with countdown (accept/decline) replacing the request list.

---

## 11. Testing, rollout and action items

**Tests.**
- Unit: role mapping, permission matrix, pricing cases, quote expiry, discount cap, candidate scoring, offer loop,
  accept race.
- Contract: Postman CLI run of the collection.
- Manual: one GiLab staging test account per platform role, plus one employee and three test drivers to watch the
  fair-share order.

**Rollout.** Migration on staging → seed → compare ride quotes against the old constants for the same inputs →
enable web → mobile moves to quotes and offer cards next release (keep `GET /trips/fare-estimate` and
`PUT /trips/:id/accept` for one release).

**Action items for the GiLab team (blockers for production login):**
1. Issue a Grameen Ride `X-Application-ID` and add it to `TRUSTED_SERVER_APPLICATION_IDS` with a client secret.
2. Give us the `companyId` that Grameen Ride registrations should use.
3. Confirm `grameen_ride_admin`, `grameen_ride_operations`, `grameen_ride_branch_admin` exist as roles.
4. Plan RS256 + real JWKS (ADR-001 C). Also, `/oauth/jwks` currently publishes a SHA-1 hash of the signing secret as
   `x5t`, which lets anyone test guesses of that secret offline. It should be removed until real keys exist.

**Admin sets before launch (from the console, no code change):** rental km rates per vehicle type (seeded values are
placeholders), the return-leg factor, and the employee discount numbers.

## 11a. Day 1 status (backend) — done 2026-11-16

| Block | State |
|---|---|
| 1 GiLab client | Done. `auth/gilab.client.ts`; login, OTP send, register (+companyId), verify-phone, resend, refresh, logout. |
| 2 Token + roles | Done. Introspection + Redis cache (`auth/token-verification.service.ts`), role mapping (`common/auth/platform-roles.ts`), permission matrix + global guard (`common/auth/permissions.ts`, `permission.guard.ts`). `RolesGuard`/`@Roles` removed. |
| 3 Profile + sparks | Done. `GET /user-profiles/me` returns `platformRoles`, `permissions`, `isStaff`, `sparks`; `GET /config/public`; promotions filtered by audience. |
| 4 Migration + seed | Done. `src/database/migrations/…-InitialSchema.ts` (full schema, verified run → revert → run, no drift); fare rates seeded on first start. |
| 5 Pricing | Done. `POST /pricing/quote`; `POST /trips {quoteId}` (client fares rejected); snapshot, commission, best-of discount, platform-funded. |
| 6 Dispatch | Done. `dispatch/` (fair-share scoring, one-at-a-time offers via Bull, accept locking, decline pause), scheduler (ride T−15, rental T−60, ops alert T−30, reminders), socket JWT auth, no more role-wide broadcasts. |
| 7 Admin APIs | Done. Pricing, zones, route fares, simulator, settings, users, drivers, vehicles, trips (cancel/assign/redispatch), upcoming rentals, overview, summary, fairness, CSV, audit log. |
| Contract | Postman collection updated (111 requests). Safe no-GiLab requests run green with Postman CLI. |

Verified: type-check, 171 unit tests, the candidate and route-fare SQL against a real PostGIS database, and the
app booting with every route mapped. **Not verified:** anything that needs Redis running (quotes, dispatch jobs,
token cache) or a real GiLab account end to end; neither was available on the dev machine.

## 11b. Day 2 status (web) — done 2026-11-17

| Block | State |
|---|---|
| 8 Foundation | MUI 7 theme (light/dark, AA primary), Barlow + SolaimanLipi, bn/en i18n, react-query, access token in memory + refresh token in sessionStorage with single-flight refresh, permission-filtered console nav and route guards. DEV auth bypass, mock fleet data and the old pages removed. |
| 9 Auth | Login (password / OTP tabs), Register, VerifyPhone. `VERIFICATION_REQUIRED` routes to verification; blocked, rate-limited and GiLab-down cases have their own messages. |
| 10 Customer | Book (ride + rental tabs, map pick + address search, stops, round trip, schedule), price per vehicle with countdown, payment + promo, confirm from `quoteId`; trip page (polls every 4 s), My trips, Profile with sparks. |
| 11 Pricing + matching | Ride/rental rates with version history and edit drawer, zones on a map, route fares, fare simulator, Matching and Sparks settings pages. |
| 12 Ops | Overview, Trips (server-paged, filters), Trip detail with dispatch timeline, cancel/assign/redispatch, Upcoming rentals with T − 30 highlight, Drivers + detail (verify, suspend, vehicle switches), Customers (block). |
| 13 Rest | Promotions (audience), Support, Reports + CSV, Fairness, Settings, Audit log. |

Backend fixes found while wiring the web: GiLab error codes were lost (nested `error.code` now lifted to the top
level); `/admin/trips` and `/admin/drivers` returned 500 (TypeORM `orderBy` needs property names with joins +
paging); a Redis outage made every request wait ~10 s (client now fails fast). `backend/scripts/mock-gilab.js` is a
local GiLab stand-in for development, with test users documented in its header.

Verified: web type-check and production build; 175 backend tests; a browser run against the real backend + mock
GiLab + scratch PostGIS database as global admin, operations, customer and an unverified user (login, OTP login,
phone verification, refresh on reload, logout, permission-hidden pages, zone edit in Bangla, settings save showing
in the audit log, every console page loading without console errors, phone-width layout). **Not verified:** price
quotes, booking and dispatch in the browser (need Redis), the real GiLab server, and a socket feed on the web
(trip page polls instead).

## 11c. Public site and customer extras — done 2026-11-17

Copy follows the StoryBrand SB7 framework (character, problem, guide, plan, call to action, failure, success) in
Bangla and English (`frontend/src/content/site.ts`), and only claims what the product does today.

| Page | Path |
|---|---|
| Landing (SB7, rides + rentals, driver and GiLab-employee hand-offs) | `/` |
| Drive with us (SB7 for drivers: fair-share matching) | `/drive` |
| Help centre (FAQ, contact) | `/help` |
| Terms, Privacy — **draft text, needs legal review** (banner shown) | `/terms`, `/privacy` |
| Forgot password (one-time-code login; GiLab has no reset endpoint) | `/forgot-password` |
| 404 | any unknown path |
| Customer support requests and replies | `/book/help` |
| Saved places (+ one-tap chips on the booking form) | `/book/places` |
| Rate the driver after a completed trip | trip page |
| Driver home: registration status + where to get the driver app | `/driver` |

Sign-up now requires agreeing to Terms and Privacy; `/register?role=driver` preselects driving. Backend hardening:
saved places validate input and copy only editable fields (a request could previously overwrite another user's place
by id); ratings validate 1–5; customers can't post or read internal support notes.

## 12. What to revisit as the system grows
- Server-side route distance (self-hosted OSRM) instead of `max(client, haversine)`.
- Polygon zones, automatic surge, per-zone rental surcharges, zone-scoped operations staff (branch admins limited to
  their area).
- Offer to 2 drivers at once in dense areas (ADR-004 revisit).
- Self-drive rental (deposits, inventory calendar, KYC).
- httpOnly cookie sessions for web; read replica / analytics store when reports slow the primary.
