# Grameen Auth Server: login, registration, "me" and token routes

Reference for the OAuth authentication endpoints used by the admin web app, customers and the other
Grameen apps. Every response below was captured from a running server (local, demo data) except where a
section says "not run live". Tokens are shortened to `eyJ…`.

- **Production base URL:** `https://auth.grameenbazaar.com`
- **Local base URL:** `http://localhost:5001`

## Contents
1. [Rules that apply everywhere](#1-rules-that-apply-everywhere)
2. [OAuth: login and tokens](#2-oauth-login-and-tokens)
3. [Registration](#3-registration)
4. ["Me" routes](#4-me-routes)
5. [Token handling summary](#5-token-handling-summary)
6. [Known issues](#6-known-issues)

---

## 1. Rules that apply everywhere

### Authentication
Protected routes take `Authorization: Bearer <access_token>`.

### Token lifetimes
| Token | Lifetime | Config |
|---|---|---|
| Access token | 15 minutes (`expiresIn: 900`) | `JWT_EXPIRES_IN` |
| Refresh token | 7 days | `JWT_REFRESH_EXPIRES_IN` |

### Application ID
`/oauth/*` routes need an `X-Application-ID: <uuid>` header (or `applicationId` in the body). It is
required in production; a missing one returns `400 MISSING_APPLICATION_ID`. In development it is
switched by `REQUIRE_APPLICATION_ID`.

### Rate limits (per client IP)
| Limit | Applies to | Behaviour |
|---|---|---|
| 5 per 15 minutes | `/oauth/login`, `/oauth/token`, `/oauth/send-otp`, `/oauth/verify-otp`, `/oauth/verify-phone`, `/oauth/resend-verification` | Only **failed** requests count, so successful logins behind a shared IP don't lock each other out. Returns `429 AUTH_RATE_LIMIT_EXCEEDED`. |
| 100 per 15 minutes | Every other route | Returns `429 RATE_LIMIT_EXCEEDED`. |

Settings: `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`,
`RATE_LIMIT_WINDOW_MS`. The limiter is in memory, so a server restart resets it.

**Server-side apps (trusted server clients).** An app that signs users in from its own backend
(for example Pathshala) sends every request from one server IP, so per-IP limits would let five wrong
passwords anywhere lock out all of its users. An app listed in `TRUSTED_SERVER_APPLICATION_IDS` can
send these headers and is then limited per end user instead:

| Header | Value |
|---|---|
| `X-Application-ID` | The app's id |
| `X-Client-Secret` | The app's client secret (checked against its stored hash; never send it from a browser) |
| `X-End-User-IP` | The end user's IP address (IPv4 or IPv6) |

A wrong secret, an app not on the list, or an invalid IP is ignored and the request is limited by its
own IP. Per-account lockout after repeated wrong passwords still applies.

### Error format
```json
{ "success": false, "error": { "code": "AUTH_FAILED", "message": "…", "statusCode": 401 } }
```
Validation errors add an `errors` list naming each failing field. Messages are mostly in Bangla.

---

## 2. OAuth: login and tokens

### `POST /oauth/login`
Header: `X-Application-ID`. Send an email **or** a phone, plus a password:
```json
{ "email": "farhana.akter@demo.grameen.test", "password": "Demo@12345" }
```
Other forms:
- **OTP login:** `{ "phone": "…", "mfaCode": "<otp>" }`, with the code from `POST /oauth/send-otp` (`{ "phone", "purpose": "login" }`). Accounts with authenticator MFA cannot use OTP alone.
- **Password on an MFA account:** add `"mfaCode"` with the authenticator code.

**200**
```json
{
  "success": true,
  "user": {
    "id": "0961faef-45bc-43be-9d53-fc783e787538",
    "email": "farhana.akter@demo.grameen.test",
    "firstName": "Farhana",
    "lastName": "Akter",
    "phone": "01000000004",
    "avatar": null,
    "isStaff": false,
    "status": "ACTIVE",
    "emailVerified": true,
    "phoneVerified": true,
    "mfaEnabled": false,
    "roles": [
      {
        "id": 17,
        "name": "admin",
        "description": "Demo admin",
        "isGlobal": false,
        "assignment": {
          "companyId": "f4ac73ef-65fe-469e-9c61-72d238e6dd22",
          "grantedBy": null,
          "grantedAt": "2026-11-15T12:55:11.635Z",
          "expiresAt": null,
          "isActive": true
        },
        "permissions": []
      }
    ]
  },
  "tokens": { "accessToken": "eyJ…", "refreshToken": "eyJ…", "expiresIn": 900 },
  "message": "লগইন সফল হয়েছে"
}
```
| Status | Code | When |
|---|---|---|
| 401 | `AUTH_FAILED` | Wrong password, or no account for that email/phone |
| 401 | `VERIFICATION_REQUIRED` | The email or phone is not verified yet |
| (error) | account-locked message | Too many wrong passwords on the account; the message gives the unlock time. The HTTP status was not checked. |
| 400 | `MISSING_CREDENTIALS` / `PASSWORD_REQUIRED` | No email/phone, or no password/OTP |
| 400 | `MISSING_APPLICATION_ID` | Header missing where it is enforced |
| 429 | `AUTH_RATE_LIMIT_EXCEEDED` | Too many failed attempts |

### `POST /oauth/refresh`
```json
{ "refreshToken": "eyJ…" }
```
**200**
```json
{ "success": true, "tokens": { "accessToken": "eyJ…", "expiresIn": 900 } }
```
The refresh token is **not** rotated here: keep the same one and use it again. **401 `AUTH_FAILED`** for an
invalid or expired token.

### `POST /oauth/logout`
Protected. Body (optional): `{ "refreshToken": "eyJ…" }`.

**200:** `{ "success": true, "sessionRevoked": true, "message": "Logout successful" }`

With a refresh token, the session behind it is ended (only if it belongs to the caller) and that refresh
token stops working. Without one, nothing is ended (`sessionRevoked: false`): access tokens are stateless
and expire within 15 minutes, and the user's other devices and apps stay signed in.

### `POST /oauth/introspect`
Public.
```json
{ "token": "eyJ…", "token_type_hint": "access_token" }
```
**200, valid token**
```json
{
  "active": true,
  "scope": "",
  "client_id": "grameen-applications",
  "username": "0961faef-45bc-43be-9d53-fc783e787538",
  "token_type": "Bearer",
  "exp": 1794753794,
  "iat": 1794752894,
  "sub": "0961faef-45bc-43be-9d53-fc783e787538",
  "aud": "grameen-applications",
  "iss": "grameen-auth-server"
}
```
**200, invalid token:** `{ "active": false }`

### `POST /oauth/revoke`
```json
{ "token": "eyJ…", "token_type_hint": "refresh_token" }
```
**200:** `{ "success": true }`. A refresh token's session is ended, so `/oauth/refresh` refuses it
afterwards. An unknown token also returns success (RFC 7009). Access tokens can't be revoked; they expire
on their own.

### `POST /oauth/token` (standard OAuth 2.0 for registered clients; not run live)
```json
{
  "grant_type": "authorization_code | refresh_token",
  "client_id": "…", "client_secret": "…",
  "redirect_uri": "…", "code": "…", "code_verifier": "…",
  "refresh_token": "…", "scope": "…"
}
```
`grant_type`, `client_id` and `client_secret` are required. Returns a standard OAuth token set. Rate-limited like login.

### Other OAuth routes (not run live)
`GET /oauth/authorize`, `GET /oauth/userinfo`, `GET /oauth/jwks`, the OIDC discovery document (served under
`/.well-known`), `POST /oauth/send-otp` (`{ phone | email, purpose? }`), `POST /oauth/verify-otp`
(`{ phone | email, otp, purpose? }`), Google and Facebook sign-in under `/oauth/google` and
`/oauth/facebook`, and `POST /oauth/social/login|link`, `DELETE /oauth/social/unlink`.

---

## 3. Registration

### `POST /oauth/register`
Header: `X-Application-ID`.
```json
{ "phone": "019928950791", "password": "Reg#Test1234", "firstName": "Reg", "lastName": "One", "email": "optional@example.com" }
```
Only `phone` is required. The password must be at least 8 characters (stricter rules apply if enabled by
`PASSWORD_REQUIRE_*` settings).

**201**
```json
{
  "success": true,
  "user": {
    "id": "1cc3b44a-4700-4563-9a38-2d78512cd813",
    "email": null,
    "firstName": "Reg",
    "lastName": "One",
    "phone": "019928950791",
    "status": "PENDING_VERIFICATION",
    "emailVerified": false,
    "phoneVerified": false,
    "createdAt": "2026-11-15T14:28:15.381Z"
  },
  "message": "নিবন্ধন সফল হয়েছে। অনুগ্রহ করে আপনার ফোন নম্বর যাচাই করুন।"
}
```
The new user gets the global `customer` role and a phone verification code. **They cannot log in until the
phone (and email, if given) is verified**: login returns `401 VERIFICATION_REQUIRED`.

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Duplicate phone or email, or invalid input (the `errors` list says which field) |

To verify:
| Route | Body |
|---|---|
| `POST /oauth/verify-phone` | `{ "phone", "code" }` (code 4–8 characters) |
| `POST /oauth/verify-email` | `{ "token" }` |
| `POST /oauth/resend-verification` | `{ "type": "email" \| "phone", "phone"?, "email"? }` |

### `POST /api/v1/registration` (public, role-based)
No authentication.
```json
{
  "roleName": "customer",
  "companyId": "f4ac73ef-65fe-469e-9c61-72d238e6dd22",
  "phone": "01952948856",
  "password": "Reg#Test1234",
  "firstName": "Pub",
  "lastName": "Two",
  "email": "optional@example.com"
}
```
- **Required:** `roleName`, `companyId` (a UUID), `phone`, `password` (8–128 characters), `firstName`, `lastName`.
- **Allowed roles:** `customer`, `grameen_bazaar_vendor`, `grameen_delivery_rider`, `grameen_tourism_tour_guide`, `grameen_tourism_vendor`, `grameen_ride_driver`, `grameen_delivery_partner`, `pathshala_user` (Pathshala school management accounts; previously `saas_user`).
- **Phone:** a Bangladeshi mobile in the form `01XXXXXXXXX` (11 digits). `+8801…` and `8801…` are normalised to the same account.
- **Names:** letters of any script (Bangla included), spaces, dots, hyphens and apostrophes.

**201**
```json
{
  "success": true,
  "message": "ব্যবহারকারী সফলভাবে নিবন্ধিত হয়েছে",
  "data": {
    "id": "ad6f18d0-adf1-458d-8f4f-4e4e18381bfa",
    "email": null,
    "firstName": "Pub",
    "lastName": "Two",
    "phone": "01952948856",
    "status": "ACTIVE",
    "isStaff": false,
    "emailVerified": false,
    "phoneVerified": false,
    "roles": [
      {
        "id": 16,
        "name": "customer",
        "description": "Customer role for end users of the ecosystem",
        "isGlobal": true,
        "company": { "id": "f4ac73ef-65fe-469e-9c61-72d238e6dd22", "name": "Grameen Innovation (Demo)", "code": "GIDEMO" }
      }
    ]
  }
}
```
Verification codes are sent, and the account still needs its phone verified before `/oauth/login` accepts it.

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_ROLE` | The role is not in the allowed list (for example `admin`) |
| 400 | `VALIDATION_ERROR` | Bad phone format, password length, names, or a missing field (the `errors` list names each one) |
| 400 | `COMPANY_NOT_FOUND` | `companyId` does not exist |
| 404 | `ROLE_NOT_FOUND` | The role does not exist |
| 409 | `USER_EXISTS` | Phone or email already registered. The message is the same for both on purpose, so it can't be used to discover who has an account. |

### Admin registration (not run live)
**`POST /api/v1/admin/users/register`**: admin only. Body: `phone`, `password` (required), `email`,
`firstName`, `lastName`, `status`, `gender`, `dateOfBirth`, `bloodGroup`, `isStaff`, `emailVerified`,
`phoneVerified`, `assignments: [{ companyId?, roleId }]`.

---

## 4. "Me" routes

### `GET /oauth/me`
Protected.

**200**
```json
{
  "success": true,
  "data": {
    "id": "0961faef-45bc-43be-9d53-fc783e787538",
    "email": "farhana.akter@demo.grameen.test",
    "firstName": "Farhana",
    "lastName": "Akter",
    "phone": "01000000004",
    "avatar": null,
    "status": "ACTIVE",
    "emailVerified": true,
    "phoneVerified": true,
    "mfaEnabled": false,
    "roles": [ { "id": 17, "name": "admin", "description": "Demo admin", "isGlobal": false, "permissions": [] } ],
    "addresses": []
  }
}
```
Each role also has an `assignment` (`companyId`, `grantedBy`, `grantedAt`, `expiresAt`, `isActive`), the
same shape as in the login response. Roles an admin turned off are listed with `isActive: false`.

### `POST /oauth/me/roles`
Protected. Lets someone with an existing account join another Grameen platform without registering again:
their own access token is the proof that the account is theirs, and their consent.
```json
{ "roleName": "pathshala_user" }
```
Only self-assignable roles are accepted (currently `pathshala_user`). The role is global (`companyId: null`).

**201** (added) / **200** (already held)
```json
{
  "success": true,
  "data": {
    "created": true,
    "role": { "id": 18, "name": "pathshala_user", "description": "…", "isGlobal": true,
              "assignment": { "companyId": null, "grantedAt": "…", "isActive": true } }
  }
}
```
| Status | Code | When |
|---|---|---|
| 400 | `INVALID_ROLE` | The role can't be self-assigned (for example `admin`) |
| 403 | `ROLE_REVOKED` | An admin turned this role off for the user; it is not turned back on |
| 403 | `ACCOUNT_NOT_ACTIVE` | The account is not `ACTIVE` |
| 404 | `ROLE_NOT_FOUND` | The role hasn't been created (run the migrations) |

### `GET /api/v1/users/profile` (not run live)
Returns the current user's profile with addresses.

---

## 5. Token handling summary
| | OAuth (`/oauth/*`) |
|---|---|
| Access token | 15 minutes |
| Refresh token | 7 days, **not rotated** (the same one keeps working) |
| Token field names | `accessToken`, `refreshToken`, `expiresIn` (camelCase) |
| Refresh request field | `refreshToken` |
| Response wrapper | `{ success, user, tokens }` at the top level |
| Logout | Ends the session of the refresh token you send |
| Sessions | Stored in the `sessions` table; refresh checks this table |

---

## 6. Known issues
1. **Fixed: logout and revoke now end the session.** (Before, `/oauth/refresh` kept accepting a revoked
   refresh token for up to 7 days.)
2. **`/oauth/register` accepts looser phone numbers than `/api/v1/registration`.** `/oauth/register`
   accepts any number the generic mobile-phone check allows (including 12-digit ones), while
   `/api/v1/registration` only accepts Bangladeshi `01XXXXXXXXX` numbers. A number can be valid in one
   route and rejected by the other.
3. **Public registration returns `status: "ACTIVE"` for an unverified account**, while `/oauth/register`
   returns `PENDING_VERIFICATION`. Both are blocked from logging in until verified, but the status
   values differ.
