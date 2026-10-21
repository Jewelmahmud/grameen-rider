Grameen Ride App - Complete Architecture & Implementation Guide
📋 Table of Contents
Architecture Overview

1. Critical Enhancements
2. Updated Database Schema
3. Enhanced Tech Stack
4. Implementation Code
5. Production Checklist

🏗️ Architecture Overview
Modular Monolith with Enhanced Resilience

┌─────────────────────────────────────────────────────┐
│              Auth Server (Existing)                  │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│           API Gateway (Kong/Nginx)                  │
│  - JWT Validation + Circuit Breaker                │
│  - Rate Limiting + IP Whitelisting                 │
│  - Request/Response Transformation                 │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│      Grameen Ride Backend (Single Deployment)       │
│  ┌───────────────────────────────────────────────┐ │
│  │         NestJS Application (Modular)          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │ Trip     │  │ Driver   │  │ Payment  │   │ │
│  │  │ Module   │  │ Module   │  │ Module   │   │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘   │ │
│  │       │             │             │          │ │
│  │  ┌────▼─────────────▼─────────────▼────┐    │ │
│  │  │         Saga Pattern               │    │ │
│  │  │    (Distributed Transactions)      │    │ │
│  │  └────────────────────────────────────┘    │ │
│  │                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │Location  │  │Notification││Background│   │ │
│  │  │ Module   │  │  Module   ││  Jobs    │   │ │
│  │  └──────────┘  └──────────┘ └──────────┘   │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────┬─────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────┐
│               Kafka Cluster                       │
│  - Event Sourcing                                │
│  - External Integrations                         │
│  - Analytics Pipeline                            │
└─────────────────────┬─────────────────────────────┘
                      │
┌─────────────────────┼─────────────────────────────┐
│  ┌──────────────────▼──────────────────┐          │
│  │           Redis Cluster             │          │
│  │  - Circuit Breaker State           │          │
│  │  - Rate Limiting                   │          │
│  │  - Driver Location Cache           │          │
│  └────────────────────────────────────┘          │
│                                                  │
│  ┌────────────────────────────────────┐          │
│  │       PostgreSQL + PostGIS         │          │
│  │  - Primary Data Store              │          │
│  │  - Read Replicas                   │          │
│  │  - Connection Pooling              │          │
│  └────────────────────────────────────┘          │
└──────────────────────────────────────────────────┘


🚀 Critical Enhancements
1. Circuit Breaker for Auth Server


// src/common/circuit-breaker.ts
import CircuitBreaker from 'opossum';

const circuitOptions = {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10
};

export class AuthCircuitBreaker {
  private static instance: AuthCircuitBreaker;
  private breaker: CircuitBreaker;

  private constructor() {
    this.breaker = new CircuitBreaker(async (token: string) => {
      return await this.validateWithAuthServer(token);
    }, circuitOptions);

    this.breaker.fallback(() => ({
      valid: false,
      error: 'Auth service unavailable',
      fromFallback: true
    }));

    this.breaker.on('open', () => console.warn('Auth circuit breaker opened'));
    this.breaker.on('close', () => console.info('Auth circuit breaker closed'));
    this.breaker.on('halfOpen', () => console.info('Auth circuit breaker half-open'));
  }

  static getInstance(): AuthCircuitBreaker {
    if (!AuthCircuitBreaker.instance) {
      AuthCircuitBreaker.instance = new AuthCircuitBreaker();
    }
    return AuthCircuitBreaker.instance;
  }

  async validateToken(token: string): Promise<any> {
    return this.breaker.fire(token);
  }

  private async validateWithAuthServer(token: string): Promise<any> {
    const response = await fetch(`${process.env.AUTH_SERVER_URL}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Auth server responded with status: ${response.status}`);
    }

    return response.json();
  }
}

2. Enhanced Driver Matching Algorithm

// src/services/driverMatching.service.ts
export class DriverMatchingService {
  async findOptimalDrivers(
    pickupLocation: { latitude: number; longitude: number },
    vehicleType: string,
    options: { maxDistanceKm?: number; limit?: number } = {}
  ): Promise<DriverMatch[]> {
    const { maxDistanceKm = 10, limit = 20 } = options;

    const query = `
      SELECT 
        d.id,
        d.user_profile_id,
        v.vehicle_type,
        d.current_latitude,
        d.current_longitude,
        d.rating,
        d.total_rides,
        d.is_online,
        d.is_available,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326),
          ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)
        ) * 111.139 AS distance_km,
        -- Calculate match score (distance 60%, rating 30%, experience 10%)
        (
          (CASE WHEN (ST_Distance(
            ST_SetSRID(ST_MakePoint($1, $2), 4326),
            ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)
          ) * 111.139) = 0 THEN 100
          ELSE GREATEST(0, 100 - ((ST_Distance(
            ST_SetSRID(ST_MakePoint($1, $2), 4326),
            ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)
          ) * 111.139) / $3 * 100)) END) * 0.6 +
          (d.rating * 20) * 0.3 + -- Convert 5-star to 100 points
          (LEAST(d.total_rides / 100, 1) * 100) * 0.1 -- Experience bonus
        ) AS match_score
        
      FROM drivers d
      INNER JOIN vehicles v ON v.driver_id = d.id
      WHERE d.is_online = TRUE 
        AND d.is_available = TRUE
        AND d.verification_status = 'approved'
        AND v.vehicle_type = $4
        AND v.is_active = TRUE
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326),
          ST_SetSRID(ST_MakePoint($1, $2), 4326),
          $3 / 111.139
        )
      ORDER BY match_score DESC, distance_km ASC
      LIMIT $5
    `;

    const result = await db.query(query, [
      pickupLocation.longitude,
      pickupLocation.latitude,
      maxDistanceKm,
      vehicleType,
      limit
    ]);

    return result.rows;
  }

  async broadcastTripToDrivers(tripId: string, potentialDrivers: DriverMatch[]) {
    // Implement trip broadcasting logic
    for (const driver of potentialDrivers) {
      await this.kafkaProducer.send({
        topic: 'trip-broadcasts',
        messages: [{
          value: JSON.stringify({
            tripId,
            driverId: driver.id,
            matchScore: driver.match_score,
            estimatedArrivalMinutes: Math.round(driver.distance_km * 2) // Rough estimate
          })
        }]
      });
    }
  }
}

3. Enhanced Rate Limiting

// src/middleware/rate-limiting.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    redisURL: process.env.REDIS_URL,
    prefix: 'rate_limit:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const strictRateLimiter = rateLimit({
  store: new RedisStore({
    redisURL: process.env.REDIS_URL,
    prefix: 'strict_rate_limit:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Strict limit for sensitive endpoints
  message: {
    error: 'Too many attempts, please try again later.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});

// Specific endpoint limiters
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    redisURL: process.env.REDIS_URL,
    prefix: 'auth_rate_limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

export const driverLocationRateLimiter = rateLimit({
  store: new RedisStore({
    redisURL: process.env.REDIS_URL,
    prefix: 'driver_location_rate_limit:'
  }),
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Max 5 location updates per 10 seconds
  message: {
    error: 'Too many location updates.',
    code: 'LOCATION_UPDATE_LIMIT_EXCEEDED'
  }
});


4. Saga Pattern Implementation

// src/sagas/tripCreation.saga.ts
export class TripCreationSaga {
  private steps = [
    'validate_passenger',
    'reserve_driver',
    'create_trip_record',
    'authorize_payment',
    'send_notifications'
  ];

  private compensations = new Map();

  async execute(tripData: CreateTripData): Promise<SagaResult> {
    const sagaId = generateSagaId();
    const context: SagaContext = { sagaId, tripData, stepData: {} };

    try {
      for (const step of this.steps) {
        context.currentStep = step;
        await this.executeStep(step, context);
      }

      return { success: true, sagaId, trip: context.stepData.trip };
    } catch (error) {
      console.error(`Saga ${sagaId} failed at step ${context.currentStep}:`, error);
      await this.compensate(context);
      return { success: false, sagaId, error: error.message };
    }
  }

  private async executeStep(step: string, context: SagaContext): Promise<void> {
    switch (step) {
      case 'validate_passenger':
        const passenger = await this.validatePassenger(context.tripData.passengerId);
        context.stepData.passenger = passenger;
        break;

      case 'reserve_driver':
        const driver = await this.reserveDriver(context.tripData);
        context.stepData.driver = driver;
        this.compensations.set('reserve_driver', () => this.releaseDriver(driver.id));
        break;

      case 'create_trip_record':
        const trip = await this.createTripRecord({
          ...context.tripData,
          driverId: context.stepData.driver.id
        });
        context.stepData.trip = trip;
        break;

      case 'authorize_payment':
        const paymentAuth = await this.authorizePayment({
          tripId: context.stepData.trip.id,
          amount: context.tripData.estimatedFare,
          passengerId: context.tripData.passengerId
        });
        context.stepData.paymentAuth = paymentAuth;
        this.compensations.set('authorize_payment', () => this.voidPaymentAuth(paymentAuth.id));
        break;

      case 'send_notifications':
        await this.sendInitialNotifications(context.stepData.trip);
        break;
    }
  }

  private async compensate(context: SagaContext): Promise<void> {
    const executedSteps = this.steps.slice(0, this.steps.indexOf(context.currentStep!));
    
    for (const step of executedSteps.reverse()) {
      const compensation = this.compensations.get(step);
      if (compensation) {
        try {
          await compensation();
        } catch (compError) {
          console.error(`Compensation failed for step ${step}:`, compError);
        }
      }
    }
  }
}


🗃️ Updated Database Schema
Critical Additions to Existing Schema


-- Add to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add to trips table for idempotency and auditing
ALTER TABLE trips ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by_auth_user_id VARCHAR(255);

-- Create audit tables
CREATE TABLE IF NOT EXISTS trip_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by_auth_user_id VARCHAR(255) NOT NULL,
    change_reason TEXT,
    metadata JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_trip_audit_trip_id (trip_id),
    INDEX idx_trip_audit_changed_at (changed_at)
);

CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    amount_changed BOOLEAN DEFAULT FALSE,
    old_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),
    changed_by_auth_user_id VARCHAR(255) NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_audit_payment_id (payment_id),
    INDEX idx_payment_audit_changed_at (changed_at)
);

-- Circuit breaker state table
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breaker_name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(20) NOT NULL CHECK (state IN ('closed', 'open', 'half-open')),
    failure_count INTEGER DEFAULT 0,
    last_failure_time TIMESTAMP,
    last_state_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    
    INDEX idx_breaker_name (breaker_name),
    INDEX idx_breaker_state (state)
);

-- Rate limiting configuration table
CREATE TABLE IF NOT EXISTS rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern VARCHAR(255) NOT NULL,
    max_requests INTEGER NOT NULL,
    window_ms INTEGER NOT NULL,
    user_type VARCHAR(50) DEFAULT 'all',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_endpoint_pattern (endpoint_pattern),
    INDEX idx_user_type (user_type),
    INDEX idx_is_active (is_active)
);


🛠️ Enhanced Tech Stack
Updated package.json

{
  "name": "grameen-ride-backend",
  "version": "1.0.0",
  "description": "Grameen Ride Backend with Enhanced Resilience",
  "dependencies": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/event-emitter": "^1.1.0",
    "@nestjs/schedule": "^4.0.0",
    "express": "^4.18.2",
    "typescript": "^5.2.2",
    "kafkajs": "^2.2.4",
    "firebase-admin": "^11.11.0",
    "pg": "^8.11.0",
    "ioredis": "^5.3.2",
    "socket.io": "^4.6.1",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.0.1",
    "opossum": "^8.0.0",
    "bull": "^4.12.0",
    "@nestjs/bull": "^10.0.0",
    "compression": "^1.7.4",
    "express-basic-auth": "^1.2.1",
    "node-cron": "^3.0.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "@types/express": "^4.17.20",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/compression": "^1.7.5",
    "@types/uuid": "^9.0.7",
    "ts-node": "^10.9.1",
    "ts-node-dev": "^2.0.0",
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}


Updated Environment Variables

# Server Configuration
NODE_ENV=production
PORT=3000
SOCKET_IO_PORT=3001

# Auth Server Integration
AUTH_SERVER_URL=https://auth-server.example.com
AUTH_SERVER_VALIDATE_ENDPOINT=/api/auth/validate
AUTH_SERVER_JWT_SECRET=your-jwt-secret
AUTH_SERVER_API_KEY=your-api-key
AUTH_SERVER_TIMEOUT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/grameenride
DB_POOL_SIZE=20
DB_IDLE_TIMEOUT=30000
DB_STATEMENT_TIMEOUT=30000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_TTL=3600

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=grameen-ride-service
KAFKA_GROUP_ID=ride-service-group
KAFKA_RETRY_ATTEMPTS=3

# FCM
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-fcm-project-id

# Payment Gateways
BKASH_API_URL=https://api.bkash.com
BKASH_API_KEY=your-bkash-key
BKASH_SECRET_KEY=your-bkash-secret
BKASH_TIMEOUT=30000

NAGAD_API_URL=https://api.nagad.com
NAGAD_API_KEY=your-nagad-key
NAGAD_SECRET_KEY=your-nagad-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
STRICT_RATE_LIMIT_MAX_REQUESTS=10

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=5000
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_PORT=9090
METRICS_PREFIX=grameen_ride

# Security
JWT_SECRET=your-jwt-secret
API_RATE_LIMIT=100
CORS_ORIGIN=https://yourapp.com
HELMET_ENABLED=true

# Background Jobs
REDIS_QUEUE_URL=redis://localhost:6379
JOB_CONCURRENCY=5


🔧 Implementation Code
Health Check Endpoint


// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { RedisHealthIndicator, DatabaseHealthIndicator } from './health.indicators';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redisHealth: RedisHealthIndicator,
    private dbHealth: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () => this.authServiceHealth('auth-service'),
    ]);
  }

  @Get('detailed')
  async detailedCheck() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        kafka: await this.checkKafka(),
        auth_server: await this.checkAuthServer(),
        fcm: await this.checkFCM(),
      }
    };

    // If any critical service is down, change status
    if (!health.checks.database.healthy || !health.checks.redis.healthy) {
      health.status = 'error';
    } else if (!health.checks.auth_server.healthy) {
      health.status = 'degraded';
    }

    return health;
  }

  private async checkDatabase() {
    try {
      await db.query('SELECT 1');
      return { healthy: true, response_time: Date.now() - start };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

Enhanced Auth Middleware


// src/middleware/enhanced-auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthCircuitBreaker } from '../common/circuit-breaker';
import { rateLimit } from 'express-rate-limit';

export async function enhancedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate token with circuit breaker
    const authResult = await AuthCircuitBreaker.getInstance().validateToken(token);
    
    if (!authResult.valid || authResult.fromFallback) {
      const status = authResult.fromFallback ? 503 : 401;
      return res.status(status).json({
        error: authResult.error || 'Invalid token',
        code: authResult.fromFallback ? 'AUTH_SERVICE_UNAVAILABLE' : 'INVALID_TOKEN'
      });
    }

    // Extract user data
    req.auth_user_id = authResult.user.id;
    req.user = {
      id: authResult.user.id,
      email: authResult.user.email,
      roles: authResult.user.roles || [],
      permissions: authResult.user.permissions || []
    };

    // Get or create user profile
    const userProfile = await getOrCreateUserProfile(req.auth_user_id, authResult.user);
    req.userProfile = userProfile;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
}

// Apply different rate limits based on user type
export const userAwareRateLimit = (userType: 'passenger' | 'driver' | 'admin') => {
  return rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: (req) => {
      switch (userType) {
        case 'admin': return 1000;
        case 'driver': return 200;
        case 'passenger': return 100;
        default: return 50;
      }
    },
    keyGenerator: (req) => {
      return `${userType}:${req.auth_user_id || req.ip}`;
    },
    message: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  });
};

Monitoring and Metrics

// src/monitoring/metrics.service.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export class MetricsService {
  // Business metrics
  private tripCounter = new Counter({
    name: 'grameen_trips_total',
    help: 'Total number of trips',
    labelNames: ['status', 'vehicle_type']
  });

  private driverOnlineGauge = new Gauge({
    name: 'grameen_drivers_online',
    help: 'Number of online drivers'
  });

  private responseTimeHistogram = new Histogram({
    name: 'grameen_response_time_seconds',
    help: 'API response time in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  });

  private paymentSuccessCounter = new Counter({
    name: 'grameen_payments_total',
    help: 'Payment processing results',
    labelNames: ['gateway', 'status']
  });

  // Circuit breaker metrics
  private circuitBreakerState = new Gauge({
    name: 'grameen_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['breaker_name']
  });

  recordTripCreation(status: string, vehicleType: string) {
    this.tripCounter.inc({ status, vehicle_type: vehicleType });
  }

  recordDriverOnline(count: number) {
    this.driverOnlineGauge.set(count);
  }

  recordResponseTime(method: string, route: string, statusCode: number, duration: number) {
    this.responseTimeHistogram.observe({ method, route, status_code: statusCode }, duration);
  }

  recordPaymentResult(gateway: string, status: string) {
    this.paymentSuccessCounter.inc({ gateway, status });
  }

  async getMetrics() {
    return register.metrics();
  }
}



✅ Production Readiness Checklist
Infrastructure Checklist
PostgreSQL with PostGIS extension installed

Redis cluster configured

Kafka cluster with required topics

Load balancer (Nginx/HAProxy)

SSL certificates configured

Backup strategy for databases

Monitoring stack (Prometheus + Grafana)

Log aggregation (ELK/Loki)

Container orchestration (Kubernetes/Docker Swarm)

Security Checklist
All environment variables secured

API rate limiting implemented

CORS properly configured

Helmet.js security headers

Input validation on all endpoints

SQL injection prevention

XSS protection

CSRF protection (if using sessions)

Regular security dependency updates

Performance Checklist
Database connection pooling configured

Redis caching implemented

Query timeouts set

Gzip compression enabled

CDN for static assets

Database indexes optimized

Background job processing

Memory leak monitoring

Resilience Checklist
Circuit breakers on external calls

Retry mechanisms with exponential backoff

Fallback strategies for critical services

Graceful degradation

Health check endpoints

Load testing performed

Disaster recovery plan

Monitoring Checklist
Application metrics exposed

Business metrics tracking

Error tracking (Sentry)

Performance monitoring

Real-time alerting

Log correlation IDs

APM tracing