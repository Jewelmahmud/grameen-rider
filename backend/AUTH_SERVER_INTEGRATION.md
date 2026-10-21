# Auth Server Integration Guide

## Overview
This document explains how to integrate the Grameen Ride App with your existing Auth Server.

---

## Key Changes from Original Design

### 1. Database Schema Changes
- **Removed**: `users` table with password, login, authentication fields
- **Added**: `user_profiles` table with `auth_user_id` reference
- **Changed**: All user references now link through `auth_user_id` from Auth Server

### 2. Authentication Flow
- **No Local Authentication**: All authentication handled by Auth Server
- **JWT Token Validation**: Tokens validated via Auth Server API
- **User Identification**: Uses `auth_user_id` from JWT token

---

## Integration Points

### 1. Auth Server Response Structure
Your Auth Server provides login response with the following structure:
```json
{
  "success": true,
  "user": {
    "id": "c9e4a5e4-dad9-4ed1-b2fb-54a8e5be34b7",  // UUID - This is auth_user_id
    "email": "jewel@grameenbazaar.com",
    "firstName": "Jewel",
    "lastName": "Mahmud",
    "phone": "+8801722611182",
    "isStaff": false,
    "status": "ACTIVE",
    "emailVerified": false,
    "phoneVerified": false,
    "mfaEnabled": false,
    "roles": [
      {
        "id": 1,
        "name": "admin",
        "description": "Administrator role with full system access",
        "isGlobal": true,
        "assignment": {
          "companyId": 3,
          "grantedBy": "c9e4a5e4-dad9-4ed1-b2fb-54a8e5be34b7",
          "grantedAt": "2025-11-02T16:27:12.839Z",
          "expiresAt": null,
          "isActive": true
        },
        "permissions": [
          "users.create",
          "users.read",
          "users.update",
          "users.delete",
          // ... more permissions
        ]
      }
    ]
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900  // 15 minutes
  },
  "message": "Login successful"
}
```

### 2. JWT Token Payload Structure
The JWT access token contains:
```json
{
  "sub": "c9e4a5e4-dad9-4ed1-b2fb-54a8e5be34b7",  // User ID (UUID) - REQUIRED
  "iss": "grameen-auth-server",
  "aud": "grameen-applications",
  "iat": 1762363564,
  "exp": 1762364464,
  "nbf": 1762363564,
  "jti": "d3f5c61a-fe3e-4c5b-a8c2-87478ed6be68",
  "roles": ["admin"],  // Array of role names
  "permissions": [
    "users.create",
    "users.read",
    // ... more permissions
  ]
}
```

**Key Field**: `sub` contains the user ID (UUID) which is used as `auth_user_id` in the database.

### 3. Token Validation Options

#### Option 1: Validate JWT Token Locally (Recommended)
If you have the JWT secret, you can validate tokens locally without calling Auth Server:
- Extract `sub` from JWT payload to get `auth_user_id`
- Verify token signature and expiration
- Faster and reduces load on Auth Server

#### Option 2: Validate Token via Auth Server API
If Auth Server provides a validation endpoint:
```
POST /api/auth/validate
Content-Type: application/json

Request:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200 OK):
{
  "valid": true,
  "user": {
    "id": "c9e4a5e4-dad9-4ed1-b2fb-54a8e5be34b7",
    "email": "jewel@grameenbazaar.com",
    // ... user data
  }
}

Response (401 Unauthorized):
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

#### Get User Info Endpoint (Optional)
If Auth Server provides user info endpoint:
```
GET /api/auth/users/:user_id
Authorization: Bearer <access_token>

Response (200 OK):
{
  "id": "c9e4a5e4-dad9-4ed1-b2fb-54a8e5be34b7",
  "email": "jewel@grameenbazaar.com",
  "firstName": "Jewel",
  "lastName": "Mahmud",
  "phone": "+8801722611182",
  // ... other user data
}
```

---

## Implementation Steps

### Step 1: Create Auth Middleware
```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const AUTH_SERVER_JWT_SECRET = process.env.AUTH_SERVER_JWT_SECRET;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL;
const AUTH_VALIDATE_ENDPOINT = process.env.AUTH_SERVER_VALIDATE_ENDPOINT;

interface JWTPayload {
  sub: string; // User ID (UUID)
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  roles?: string[];
  permissions?: string[];
}

export async function validateAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Option 1: Validate JWT locally (recommended if you have the secret)
    if (AUTH_SERVER_JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, AUTH_SERVER_JWT_SECRET) as JWTPayload;
        
        // Extract user ID from 'sub' field
        req.auth_user_id = decoded.sub; // UUID
        req.user = {
          id: decoded.sub,
          roles: decoded.roles || [],
          permissions: decoded.permissions || []
        };
        return next();
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    // Option 2: Validate token with Auth Server API
    if (AUTH_SERVER_URL && AUTH_VALIDATE_ENDPOINT) {
      const response = await axios.post(
        `${AUTH_SERVER_URL}${AUTH_VALIDATE_ENDPOINT}`,
        { token },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.valid && response.data.user) {
        req.auth_user_id = response.data.user.id; // UUID
        req.user = response.data.user;
        return next();
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Fallback: Decode without verification (not recommended for production)
    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded && decoded.sub) {
      req.auth_user_id = decoded.sub;
      req.user = { id: decoded.sub, roles: decoded.roles || [] };
      return next();
    }

    return res.status(401).json({ error: 'Token validation failed' });
  } catch (error) {
    console.error('Auth validation error:', error);
    res.status(401).json({ error: 'Token validation failed' });
  }
}
```

### Step 2: Create User Profile Sync Service
```typescript
// src/services/userProfile.service.ts
import { db } from '../db';
import axios from 'axios';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL;
const AUTH_SERVER_GET_USER_ENDPOINT = process.env.AUTH_SERVER_GET_USER_ENDPOINT;

interface AuthServerUser {
  id: string; // UUID
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: string;
}

export async function getOrCreateUserProfile(
  auth_user_id: string,
  userData?: AuthServerUser
) {
  // Check if profile exists
  let profile = await db.query(
    'SELECT * FROM user_profiles WHERE auth_user_id = $1',
    [auth_user_id]
  );

  if (profile.rows.length === 0) {
    // Fetch user data from Auth Server if not provided
    if (!userData && AUTH_SERVER_URL && AUTH_SERVER_GET_USER_ENDPOINT) {
      try {
        const response = await axios.get(
          `${AUTH_SERVER_URL}${AUTH_SERVER_GET_USER_ENDPOINT}/${auth_user_id}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        userData = response.data;
      } catch (error) {
        console.error('Failed to fetch user from Auth Server:', error);
        // Continue with minimal data
      }
    }

    // Create new profile
    const result = await db.query(
      `INSERT INTO user_profiles (
        auth_user_id, 
        phone_number, 
        email, 
        first_name, 
        last_name,
        email_verified,
        phone_verified
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth_user_id, // UUID
        userData?.phone || null,
        userData?.email || null,
        userData?.firstName || null,
        userData?.lastName || null,
        userData?.emailVerified || false,
        userData?.phoneVerified || false
      ]
    );
    profile = result;
  } else {
    // Update last_active_at
    await db.query(
      'UPDATE user_profiles SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
      [profile.rows[0].id]
    );
  }

  return profile.rows[0];
}

// Helper function to sync user data from Auth Server response
export async function syncUserProfileFromAuthResponse(authResponse: any) {
  const user = authResponse.user;
  if (!user || !user.id) {
    throw new Error('Invalid auth response: missing user data');
  }

  const profile = await getOrCreateUserProfile(user.id, user);
  
  // Update profile if user data changed
  if (user.email || user.phone || user.firstName || user.lastName) {
    await db.query(
      `UPDATE user_profiles 
       SET email = COALESCE($1, email),
           phone_number = COALESCE($2, phone_number),
           first_name = COALESCE($3, first_name),
           last_name = COALESCE($4, last_name),
           email_verified = $5,
           phone_verified = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE auth_user_id = $7`,
      [
        user.email || null,
        user.phone || null,
        user.firstName || null,
        user.lastName || null,
        user.emailVerified || false,
        user.phoneVerified || false,
        user.id
      ]
    );
  }

  return profile;
}
```

### Step 3: Update Routes to Use Auth Middleware
```typescript
// src/routes/trips.routes.ts
import { Router } from 'express';
import { validateAuth } from '../middleware/auth.middleware';
import { getOrCreateUserProfile } from '../services/userProfile.service';

const router = Router();

// All routes require authentication
router.use(validateAuth);

// Middleware to ensure user profile exists
router.use(async (req, res, next) => {
  try {
    // req.auth_user_id is set by validateAuth middleware (UUID)
    const userProfile = await getOrCreateUserProfile(req.auth_user_id);
    req.userProfile = userProfile; // Attach profile to request
    next();
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

router.post('/trips', async (req, res) => {
  // req.userProfile is already set by middleware
  const trip = await createTrip({
    passenger_id: req.userProfile.id, // Use internal UUID
    ...req.body
  });
  
  res.json(trip);
});

export default router;
```

### TypeScript Type Definitions
```typescript
// src/types/express.d.ts
import { UserProfile } from './userProfile';

declare global {
  namespace Express {
    interface Request {
      auth_user_id?: string; // UUID from Auth Server
      user?: {
        id: string;
        roles?: string[];
        permissions?: string[];
      };
      userProfile?: UserProfile; // Database user profile
    }
  }
}
```

---

## User Profile Creation Flow

### When User First Accesses Ride App:
1. User authenticates with Auth Server (separate flow)
2. User receives JWT token
3. User makes request to Ride App with JWT token
4. Ride App validates token with Auth Server
5. Ride App extracts `auth_user_id` from token
6. Ride App checks if `user_profile` exists
7. If not exists, creates new `user_profile` with `auth_user_id`
8. All subsequent operations use `user_profile.id` (UUID)

### User Type Assignment:
- **Passenger**: Default when profile is created
- **Driver**: Assigned when user completes driver registration
- Can be synced from Auth Server roles if available

---

## Database Schema Integration

### Key Tables:
1. **user_profiles**: Links to Auth Server via `auth_user_id`
   - `auth_user_id` (VARCHAR) - Reference to Auth Server user ID
   - `id` (UUID) - Internal UUID for all relationships

2. **All other tables**: Use `user_profile.id` (UUID) for relationships
   - `trips.passenger_id` → `user_profiles.id`
   - `drivers.user_profile_id` → `user_profiles.id`
   - `notifications.user_profile_id` → `user_profiles.id`

---

## Environment Variables

```env
# Auth Server Configuration
AUTH_SERVER_URL=https://auth-server.example.com
AUTH_SERVER_VALIDATE_ENDPOINT=/api/auth/validate  # Optional: if token validation endpoint exists
AUTH_SERVER_GET_USER_ENDPOINT=/api/auth/users  # Optional: if user info endpoint exists
AUTH_SERVER_JWT_SECRET=your-jwt-secret  # REQUIRED: For local JWT verification (get from Auth Server)
AUTH_SERVER_API_KEY=your-api-key  # Optional: If needed for admin operations

# Token Validation
TOKEN_VALIDATION_CACHE_TTL=300  # Cache valid tokens for 5 minutes (optional)
```

**Important**: You must get the `AUTH_SERVER_JWT_SECRET` from your Auth Server to validate JWT tokens locally. This is the secret used to sign the JWT tokens.

---

## Error Handling

### Invalid Token
```json
{
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

### User Not Found
```json
{
  "error": "User profile not found",
  "code": "USER_NOT_FOUND",
  "auth_user_id": "user-123"
}
```

### Auth Server Unavailable
```json
{
  "error": "Authentication service unavailable",
  "code": "AUTH_SERVICE_ERROR"
}
```

---

## Caching Strategy (Optional)

### Cache Valid Tokens
To reduce load on Auth Server, cache valid tokens:
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function validateAuthWithCache(token: string) {
  // Check cache first
  const cached = await redis.get(`token:${token}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Validate with Auth Server
  const result = await validateWithAuthServer(token);
  
  if (result.valid) {
    // Cache for 5 minutes
    await redis.setex(
      `token:${token}`,
      300,
      JSON.stringify(result)
    );
  }

  return result;
}
```

---

## Testing

### Test with Mock Auth Server
```typescript
// tests/mocks/authServer.mock.ts
export const mockAuthServer = {
  validateToken: jest.fn().mockResolvedValue({
    valid: true,
    auth_user_id: 'test-user-123',
    email: 'test@example.com',
    roles: ['user']
  })
};
```

---

## Security Considerations

1. **Token Validation**: Always validate tokens with Auth Server (don't trust client)
2. **HTTPS**: All communication with Auth Server must be over HTTPS
3. **Token Storage**: Store tokens securely in Flutter app (use `flutter_secure_storage`)
4. **Token Refresh**: Implement token refresh logic if Auth Server supports it
5. **Rate Limiting**: Rate limit token validation requests
6. **Error Handling**: Don't expose Auth Server internals in error messages

---

## Migration from Existing System

If you have existing users in the Ride App database:

1. **Export users** from Auth Server (get `auth_user_id` for each)
2. **Update user_profiles** table:
   ```sql
   ALTER TABLE user_profiles ADD COLUMN auth_user_id VARCHAR(255);
   UPDATE user_profiles SET auth_user_id = 'user-' || id::text;
   ALTER TABLE user_profiles ALTER COLUMN auth_user_id SET NOT NULL;
   CREATE UNIQUE INDEX idx_auth_user_id ON user_profiles(auth_user_id);
   ```
3. **Remove authentication fields**:
   ```sql
   ALTER TABLE user_profiles DROP COLUMN password_hash;
   ALTER TABLE user_profiles DROP COLUMN last_login_at;
   ```

---

## Support

For questions or issues:
1. Check Auth Server API documentation
2. Verify JWT token structure matches expected format
3. Check network connectivity to Auth Server
4. Review logs for authentication errors

