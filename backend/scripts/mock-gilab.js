/* eslint-disable */
/**
 * Local stand-in for the GiLab auth server, for development and smoke tests only.
 * Never point a deployed environment at it.
 *
 *   node scripts/mock-gilab.js            # listens on http://127.0.0.1:5098
 *   AUTH_SERVER_URL=http://127.0.0.1:5098 npm run start:dev
 *
 * Implements the routes Grameen Ride calls: /oauth/login, /oauth/send-otp, /api/v1/registration,
 * /oauth/verify-phone, /oauth/resend-verification, /oauth/refresh, /oauth/logout, /oauth/introspect,
 * /oauth/me. Error bodies use GiLab's shape: { success: false, error: { code, message } }.
 *
 * Test users (password for all: mock-pass-123; OTP and verification code: 123456):
 *   01700000010  global admin, GiLab employee "Administrative Assistant"  → super_admin
 *   01700000011  customer                                                 → customer
 *   01700000012  grameen_ride_operations                                  → operations
 *   01700000013  company-scoped admin (not global)                        → customer
 *   01700000014  unverified phone                                         → VERIFICATION_REQUIRED
 */
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const PORT = Number(process.env.MOCK_GILAB_PORT || 5098);
const SECRET = crypto.randomBytes(32).toString('hex'); // per run: tokens die with the process
const ISS = 'grameen-auth-server';
const AUD = 'grameen-applications';
const PASSWORD = 'mock-pass-123';
const CODE = '123456';
const ACCESS_TTL = Number(process.env.MOCK_GILAB_ACCESS_TTL || 900);

const role = (name, isGlobal = false) => ({ name, isGlobal, assignment: { isActive: true, companyId: isGlobal ? null : 'mock-company' } });
const users = [
  { id: '00000000-0000-4000-8000-000000000010', phone: '01700000010', firstName: 'Admin', lastName: 'Test', email: 'admin@mock.test', roles: [role('admin', true)], isEmployee: true, designation: 'Administrative Assistant', verified: true },
  { id: '00000000-0000-4000-8000-000000000011', phone: '01700000011', firstName: 'Rahim', lastName: 'Customer', roles: [role('customer')], isEmployee: false, verified: true },
  { id: '00000000-0000-4000-8000-000000000012', phone: '01700000012', firstName: 'Ops', lastName: 'Staff', roles: [role('grameen_ride_operations')], isEmployee: false, verified: true },
  { id: '00000000-0000-4000-8000-000000000013', phone: '01700000013', firstName: 'Company', lastName: 'Admin', roles: [role('admin', false)], isEmployee: false, verified: true },
  { id: '00000000-0000-4000-8000-000000000014', phone: '01700000014', firstName: 'New', lastName: 'User', roles: [role('customer')], isEmployee: false, verified: false },
];
const refreshTokens = new Map(); // refresh token → user id

const fail = (res, status, code, message) => send(res, status, { success: false, error: { code, message, statusCode: status } });
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const publicUser = (u) => ({
  id: u.id, firstName: u.firstName, lastName: u.lastName, phone: u.phone, email: u.email ?? null,
  isEmployee: u.isEmployee, designation: u.isEmployee ? u.designation : undefined, roles: u.roles,
});
const issue = (u) => {
  const accessToken = jwt.sign({ sub: u.id, roles: u.roles.map((r) => r.name), permissions: [] }, SECRET, { algorithm: 'HS256', issuer: ISS, audience: AUD, expiresIn: ACCESS_TTL });
  const refreshToken = crypto.randomBytes(24).toString('hex');
  refreshTokens.set(refreshToken, u.id);
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL };
};
const fromBearer = (req) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const p = jwt.verify(token, SECRET, { issuer: ISS, audience: AUD });
    return users.find((u) => u.id === p.sub);
  } catch {
    return undefined;
  }
};
const normalise = (phone) => String(phone || '').replace(/^\+?880/, '0');

const routes = {
  'POST /oauth/login': (b, res) => {
    const u = users.find((x) => (b.phone && x.phone === normalise(b.phone)) || (b.email && x.email === b.email));
    if (!b.phone && !b.email) return fail(res, 400, 'MISSING_CREDENTIALS', 'Phone or email is required');
    const ok = u && ((b.password && b.password === PASSWORD) || (b.mfaCode && b.mfaCode === CODE));
    if (!ok) {
      console.log(`  login refused for ${b.phone ?? b.email}: ${u ? (b.mfaCode ? 'wrong code' : 'wrong password') : 'no test user with that phone/email'}`);
      return fail(res, 401, 'AUTH_FAILED', 'ভুল ফোন নম্বর বা পাসওয়ার্ড');
    }
    if (!u.verified) return fail(res, 401, 'VERIFICATION_REQUIRED', 'ফোন নম্বর যাচাই করা হয়নি');
    send(res, 200, { success: true, user: publicUser(u), tokens: issue(u), message: 'লগইন সফল হয়েছে' });
  },
  'POST /oauth/send-otp': (b, res) => send(res, 200, { success: true, message: `OTP sent to ${normalise(b.phone)}` }),
  'POST /api/v1/registration': (b, res) => {
    if (users.some((u) => u.phone === normalise(b.phone))) return fail(res, 409, 'USER_EXISTS', 'An account already exists');
    const u = { id: crypto.randomUUID(), phone: normalise(b.phone), firstName: b.firstName, lastName: b.lastName, email: b.email, roles: [role(b.roleName || 'customer')], isEmployee: false, verified: false };
    users.push(u);
    send(res, 201, { success: true, data: { ...publicUser(u), status: 'ACTIVE' } });
  },
  'POST /oauth/verify-phone': (b, res) => {
    const u = users.find((x) => x.phone === normalise(b.phone));
    if (!u || b.code !== CODE) return fail(res, 400, 'INVALID_CODE', 'ভুল কোড');
    u.verified = true;
    send(res, 200, { success: true, message: 'Phone verified' });
  },
  'POST /oauth/resend-verification': (_b, res) => send(res, 200, { success: true }),
  'POST /oauth/refresh': (b, res) => {
    const u = users.find((x) => x.id === refreshTokens.get(b.refreshToken));
    if (!u) return fail(res, 401, 'AUTH_FAILED', 'Invalid refresh token');
    const { accessToken, expiresIn } = issue(u);
    send(res, 200, { success: true, tokens: { accessToken, expiresIn } });
  },
  'POST /oauth/logout': (b, res) => {
    const revoked = Boolean(b.refreshToken && refreshTokens.delete(b.refreshToken));
    send(res, 200, { success: true, sessionRevoked: revoked, message: 'Logout successful' });
  },
  'POST /oauth/introspect': (b, res) => {
    try {
      const p = jwt.verify(b.token, SECRET, { issuer: ISS, audience: AUD });
      send(res, 200, { active: true, sub: p.sub, iss: p.iss, aud: p.aud, exp: p.exp, token_type: 'access_token' });
    } catch {
      send(res, 200, { active: false });
    }
  },
  'GET /oauth/me': (_b, res, req) => {
    const u = fromBearer(req);
    if (!u) return fail(res, 401, 'AUTH_FAILED', 'Invalid token');
    send(res, 200, { success: true, data: publicUser(u) });
  },
};

http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const route = routes[`${req.method} ${req.url.split('?')[0]}`];
      if (!route) return fail(res, 404, 'NOT_FOUND', `${req.method} ${req.url}`);
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return fail(res, 400, 'BAD_JSON', 'Invalid JSON');
      }
      console.log(`${req.method} ${req.url}`);
      route(body, res, req);
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Mock GiLab on http://127.0.0.1:${PORT}`));
