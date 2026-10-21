# Tech Stack Recommendation for Grameen Ride App

## Overview
This document outlines the recommended technology stack for building a scalable, real-time ride-sharing application with Kafka and FCM integration, integrated with an existing Auth Server.

**Architecture**: Modular Monolith - Single deployable Node.js application with internal modules, designed to evolve into microservices if needed. Separate Auth Server handles authentication.

---

## Backend Architecture

### Primary Backend Framework: Node.js + NestJS (Recommended for Modular Monolith)
- **Language**: TypeScript (Recommended)
- **Framework**: **NestJS** (Highly Recommended)
  - Built-in module system perfect for Modular Monolith
  - Dependency injection for clean module boundaries
  - TypeScript-first for type safety
  - Event-driven architecture support
  - Easy to extract modules to microservices later
- **Alternative**: Express.js with custom module organization
- **Why Node.js**: 
  - Excellent real-time capabilities with WebSockets
  - Large ecosystem for Kafka integration (`kafkajs`)
  - Great support for FCM (`firebase-admin`)
  - Fast development cycle
  - Good performance for I/O-intensive operations
  - TypeScript support for type safety

---

## Auth Server Integration

### Existing Auth Server
- **Purpose**: Handles user authentication, login, registration, and roles
- **Integration Method**: JWT token validation via API
- **Communication**: REST API or JWT token verification

### Integration Pattern
```
Client (Flutter App) 
  → Auth Server (Login/Register)
  → Receives JWT Token
  → Sends JWT Token to Ride App API
  → Ride App validates JWT with Auth Server
  → Ride App extracts auth_user_id from JWT
  → Ride App uses auth_user_id for all operations
```

### JWT Token Structure (Expected)
```json
{
  "auth_user_id": "user-123",
  "email": "user@example.com",
  "phone": "+8801234567890",
  "roles": ["user", "driver"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Auth Middleware
```typescript
// Example middleware structure
async function validateAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  // Validate token with Auth Server
  const response = await fetch(`${AUTH_SERVER_URL}/api/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  if (response.ok) {
    const userData = await response.json();
    req.auth_user_id = userData.auth_user_id;
    req.user = userData;
    next();
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## Database Layer

### Primary Database: PostgreSQL
- **Version**: PostgreSQL 15+
- **Why**:
  - ACID compliance
  - Excellent JSONB support
  - PostGIS extension for geospatial queries (driver matching)
  - Strong consistency
  - Great for complex queries
  - Supports full-text search
  - Excellent for transactional data (payments, trips)

### Caching Layer: Redis
- **Version**: Redis 7+
- **Use Cases**:
  - JWT token blacklisting (if needed)
  - Driver location caching (real-time)
  - Rate limiting (per user/IP)
  - Trip matching cache
  - Notification queue
  - Real-time driver availability
  - Session data
- **Pattern**: Redis Pub/Sub for real-time updates

### Search Engine: Elasticsearch (Optional)
- **Use Cases**:
  - Location search
  - Address autocomplete
  - Trip history search
  - Driver/rider search

---

## Message Queue & Event Streaming

### Apache Kafka
- **Version**: Kafka 3.5+
- **Purpose**: 
  - **External Integration**: Integration with external systems (FCM, analytics, future microservices)
  - **Event Publishing**: Modules publish events to Kafka for external consumption
  - **Future-Proofing**: Easy migration path to microservices
- **Topics**:
  1. `trip-events` - Trip lifecycle events (created, accepted, cancelled, completed)
  2. `location-updates` - Real-time driver location updates
  3. `notification-events` - Notification events (consumed by FCM service)
  4. `payment-events` - Payment processing events
  5. `driver-availability` - Driver online/offline status
  6. `trip-matching` - Driver-passenger matching events
  7. `user-profile-updates` - Profile sync events from Auth Server (optional)

**Note**: In Modular Monolith, modules communicate **in-process** via events or direct calls. Kafka is used for:
- Publishing events to external systems (FCM, analytics)
- Future microservices extraction
- Integration with external services

### Internal Event Bus (In-Process)
- **NestJS Event Emitter** or **EventEmitter2** for internal module communication
- **Purpose**: Inter-module communication within the same process
- **Benefits**: Fast, no network overhead, type-safe
- **Pattern**: Modules emit events, other modules listen synchronously or asynchronously

---

## Push Notifications

### Firebase Cloud Messaging (FCM)
- **Purpose**: Push notifications to mobile apps
- **Setup**:
  - Server-side SDK: `firebase-admin` (Node.js)
  - Client-side SDK: `firebase_messaging` (Flutter)
- **Use Cases**:
  - Trip status updates
  - Driver assignment notifications
  - Payment confirmations
  - Promotional notifications
  - Support response notifications

**Integration Pattern** (Modular Monolith):
```
Trip Module (in-process) → Internal Event → Notification Module → FCM API → Mobile App
                                                      ↓
                                              Kafka (optional, for external)
```

**Flow**:
1. Event occurs in Trip Module (trip created, driver assigned, etc.)
2. Trip Module emits internal event (via NestJS EventEmitter)
3. Notification Module listens to internal event
4. Notification Module queries FCM token from database
5. Notification Module sends notification via FCM
6. Notification record created in database
7. Notification Module publishes to Kafka (optional, for analytics/external systems)
8. Mobile app receives notification

---

## Mobile App

### Frontend: Flutter (Already in use)
- **Version**: Flutter 3.33.0+
- **State Management**: Provider/Riverpod
- **Key Packages**:
  - `firebase_messaging` - FCM integration
  - `socket_io_client` - Real-time WebSocket communication
  - `geolocator` - Location services
  - `http` - API calls to backend
  - `dio` - Advanced HTTP client (alternative)

### Authentication Flow (Flutter)
```dart
// 1. Login via Auth Server
final authResponse = await authService.login(phone, password);

// 2. Store JWT token
await secureStorage.write(key: 'jwt_token', value: authResponse.token);

// 3. Use token in API calls
final headers = {
  'Authorization': 'Bearer ${token}',
  'Content-Type': 'application/json',
};
```

---

## Real-time Communication

### WebSocket Server
- **Technology**: Socket.io (Node.js)
- **Purpose**: 
  - Real-time trip updates
  - Live location tracking
  - Driver-passenger chat (optional)
  - Instant status updates
- **Authentication**: JWT token validation via Auth Server

### Alternative: Server-Sent Events (SSE)
- Simpler than WebSocket
- One-way communication from server to client
- Good for trip status updates
- Less overhead than WebSocket

---

## API Gateway

### Kong or AWS API Gateway
- **Purpose**:
  - Request routing
  - Rate limiting (per auth_user_id)
  - JWT token validation (can validate with Auth Server)
  - Request/Response transformation
  - API versioning
  - Load balancing

### Load Balancer
- **Nginx** or **HAProxy**
- Load balancing
- SSL termination
- Reverse proxy
- Health checks

---

## Authentication & Authorization

### JWT Token Validation
- **Method**: Validate JWT tokens with Auth Server
- **Library**: `jsonwebtoken` or direct API call to Auth Server
- **Pattern**: Middleware validates token on each request
- **Storage**: Redis for token blacklisting (if needed)

### User Identification
- Extract `auth_user_id` from JWT token
- Use `auth_user_id` to find/create `user_profile` in database
- All operations use `user_profile.id` (UUID) internally

### Role-Based Access Control
- Roles come from Auth Server (via JWT)
- Check roles for authorization (e.g., driver-only endpoints)

---

## Payment Gateway Integration

### Mobile Money Services (Bangladesh)
- **bKash API**
- **Nagad API**
- **Rocket (DBBL Mobile Banking)**

### Payment Processing Flow (Modular Monolith)
```
User → App → Payment Module → Payment Gateway → Internal Event → Notification Module → FCM
                                                      ↓
                                                 Kafka (external)
```

---

## Containerization & Orchestration

### Docker
- **Purpose**: Containerization
- **Docker Compose** for local development

### Kubernetes (Production)
- **Purpose**: Container orchestration
- Auto-scaling
- Service discovery
- Load balancing
- Health checks

---

## Monitoring & Logging

### Application Monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Datadog** or **New Relic** (Alternative)

### Logging
- **ELK Stack**:
  - Elasticsearch
  - Logstash
  - Kibana
- **Alternative**: Loki + Grafana

### Error Tracking
- **Sentry** - Error tracking and monitoring
- **Rollbar** - Alternative

---

## CI/CD Pipeline

### Version Control
- **Git** (GitHub/GitLab/Bitbucket)

### CI/CD Tools
- **GitHub Actions**
- **GitLab CI/CD**
- **Jenkins** (Alternative)

### Deployment
- **Docker Registry** (Docker Hub, AWS ECR)
- **Kubernetes** or **Docker Swarm**

---

## Recommended Architecture (Complete)

### Modular Monolith Architecture

```
┌─────────────────────────────────────────────────────┐
│              Auth Server (Existing)                  │
│  - User Authentication                              │
│  - JWT Token Generation                             │
│  - User Roles Management                            │
└───────────────────────┬─────────────────────────────┘
                        │
                        │ JWT Token Validation
                        │
┌───────────────────────▼─────────────────────────────┐
│           API Gateway (Kong/Nginx)                  │
│  - JWT Validation (via Auth Server)                 │
│  - Rate Limiting                                    │
│  - Request Routing                                  │
└───────────────────────┬─────────────────────────────┘
                        │
                        │ HTTP/WebSocket
                        │
┌───────────────────────▼─────────────────────────────┐
│      Grameen Ride Backend (Single Deployment)       │
│  ┌───────────────────────────────────────────────┐ │
│  │         NestJS Application (Modular)          │ │
│  │                                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │   Trip   │  │  Driver  │  │ Payment  │   │ │
│  │  │  Module  │  │  Module  │  │  Module  │   │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘   │ │
│  │       │             │             │          │ │
│  │       └─────────────┼─────────────┘          │ │
│  │                     │                        │ │
│  │         ┌───────────▼───────────┐           │ │
│  │         │  Internal Event Bus   │           │ │
│  │         │  (NestJS EventEmitter)│           │ │
│  │         └───────────┬───────────┘           │ │
│  │                     │                        │ │
│  │  ┌──────────┐  ┌───▼────┐  ┌──────────┐   │ │
│  │  │Notification│ │Location│ │ Analytics│   │ │
│  │  │  Module   │ │ Module │ │  Module  │   │ │
│  │  └────┬──────┘ └────────┘ └──────────┘   │ │
│  │       │                                    │ │
│  └───────┼────────────────────────────────────┘ │
│          │                                      │
└──────────┼──────────────────────────────────────┘
           │
           │ (External Events)
           │
┌──────────▼───────────────────────────┐
│   Apache Kafka Cluster               │
│  (External Integration)              │
│  - FCM notifications                 │
│  - Analytics/BI                      │
│  - Future microservices              │
└──────────────────────────────────────┘

┌──────────┬───────────────────────────────┐
│          │                               │
│  ┌───────▼──────┐  ┌──────────────────┐ │
│  │   FCM API    │  │  Redis (Cache)   │ │
│  └──────────────┘  └──────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   PostgreSQL Database              │ │
│  │   (Shared by all modules)          │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Key Characteristics**:
- **Single Deployment**: One Node.js application
- **Internal Modules**: Communicate via in-process events (NestJS EventEmitter)
- **Shared Database**: All modules use the same PostgreSQL database
- **Kafka for External**: Used for external integrations, not inter-module communication
- **Easy Migration**: Modules can be extracted to microservices later

### Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend** | Node.js + Express/NestJS (TypeScript) | API services |
| **Auth Server** | Existing (External) | User authentication |
| **Database** | PostgreSQL 15+ | Primary data store |
| **Cache** | Redis 7+ | Caching & sessions |
| **Message Queue** | Apache Kafka 3.5+ | Event streaming |
| **Notifications** | Firebase Cloud Messaging | Push notifications |
| **Real-time** | Socket.io / WebSocket | Live updates |
| **Search** | Elasticsearch (Optional) | Search functionality |
| **API Gateway** | Kong / Nginx | API routing |
| **Auth** | JWT (validated via Auth Server) | Authentication |
| **Monitoring** | Prometheus + Grafana | Metrics & monitoring |
| **Logging** | ELK Stack | Log management |
| **Error Tracking** | Sentry | Error monitoring |
| **Containerization** | Docker | Containerization |
| **Orchestration** | Kubernetes | Container orchestration |
| **CI/CD** | GitHub Actions | CI/CD pipeline |
| **Mobile** | Flutter | Mobile app |

---

## Modular Monolith Breakdown (Internal Modules)

### Module Structure (NestJS)

```
src/
├── app.module.ts              # Root module
├── common/                    # Shared utilities
├── trips/                     # Trip Module
│   ├── trips.module.ts
│   ├── trips.controller.ts
│   ├── trips.service.ts
│   └── trips.events.ts
├── drivers/                   # Driver Module
│   ├── drivers.module.ts
│   ├── drivers.controller.ts
│   ├── drivers.service.ts
│   └── drivers.events.ts
├── payments/                  # Payment Module
├── notifications/             # Notification Module
├── locations/                 # Location Module
└── analytics/                 # Analytics Module (optional)
```

### Module Responsibilities

### 1. API Gateway (External)
- **Technology**: Kong or Nginx
- **Responsibilities**:
  - Routes requests to the monolithic application
  - Validates JWT tokens with Auth Server
  - Handles rate limiting
  - Load balancing

### 2. Trip Module
- **Technology**: NestJS Module
- **Responsibilities**:
  - Trip creation and management
  - Trip status updates
  - Trip history queries
  - Emits internal events (trip.created, trip.completed, etc.)
  - Publishes events to Kafka (for external systems)

### 3. Driver Module
- **Technology**: NestJS Module
- **Responsibilities**:
  - Driver profile management
  - Location tracking
  - Driver availability management
  - Driver matching algorithm
  - Emits internal events (driver.location.updated, driver.available, etc.)
  - Publishes events to Kafka (for external systems)

### 4. Notification Module
- **Technology**: NestJS Module
- **Responsibilities**:
  - Listens to internal events (from Trip, Driver, Payment modules)
  - Sends FCM notifications
  - Manages notification preferences
  - Notification history
  - Publishes to Kafka (optional, for analytics)

### 5. Location Module
- **Technology**: NestJS Module
- **Responsibilities**:
  - Real-time location tracking
  - Geospatial queries (PostGIS)
  - Driver matching algorithm
  - Listens to driver location updates (internal events)
  - Publishes location events to Kafka (for external systems)

### 6. Payment Module
- **Technology**: NestJS Module
- **Responsibilities**:
  - Payment processing
  - Payment gateway integration (bKash, Nagad, Rocket)
  - Payment history
  - Emits internal events (payment.completed, payment.failed, etc.)
  - Publishes events to Kafka (for external systems)

### 7. Analytics Module (Optional)
- **Technology**: NestJS Module
- **Responsibilities**:
  - Listens to all internal events
  - Generates reports
  - Business intelligence
  - Dashboard data
  - Can consume from Kafka for external analytics tools

### Internal Communication Pattern

```typescript
// Example: Trip Module emits event
@Injectable()
export class TripsService {
  constructor(private eventEmitter: EventEmitter2) {}
  
  async createTrip(data: CreateTripDto) {
    const trip = await this.tripsRepository.create(data);
    
    // Emit internal event (in-process)
    this.eventEmitter.emit('trip.created', {
      tripId: trip.id,
      passengerId: trip.passengerId,
      // ... other data
    });
    
    // Publish to Kafka (external)
    await this.kafkaProducer.send({
      topic: 'trip-events',
      messages: [{ value: JSON.stringify(eventData) }]
    });
    
    return trip;
  }
}

// Notification Module listens to event
@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private eventEmitter: EventEmitter2,
    private fcmService: FcmService
  ) {}
  
  onModuleInit() {
    // Listen to internal event
    this.eventEmitter.on('trip.created', async (data) => {
      await this.sendTripCreatedNotification(data);
    });
  }
}
```

### Benefits of Modular Monolith

1. **Single Deployment**: Easier to deploy and manage
2. **Fast Communication**: In-process events are faster than network calls
3. **Type Safety**: TypeScript ensures type safety across modules
4. **Easy Testing**: Test modules in isolation or together
5. **Shared Database**: No data consistency issues
6. **Evolution Path**: Easy to extract modules to microservices later
7. **Lower Complexity**: No service discovery, no network latency between modules
8. **Cost Effective**: Fewer infrastructure resources needed

---

## Recommended Package Versions

### Node.js Backend (package.json)
```json
{
  "name": "grameen-ride-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "@nestjs/core": "^10.0.0",
    "@nestjs/common": "^10.0.0",
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
    "node-cron": "^3.0.3",
    "@nestjs/event-emitter": "^1.1.0"  // For internal module events
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "@types/express": "^4.17.20",
    "@types/jsonwebtoken": "^9.0.5",
    "ts-node": "^10.9.1",
    "ts-node-dev": "^2.0.0",
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
```

### Flutter Mobile App (pubspec.yaml)
```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_messaging: ^14.7.0
  socket_io_client: ^2.0.3
  geolocator: ^10.1.0
  http: ^1.1.0
  dio: ^5.3.2
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.1
  shared_preferences: ^2.2.2
```

---

## Environment Variables

### Backend Services
```env
# Server
NODE_ENV=production
PORT=3000

# Auth Server Integration
AUTH_SERVER_URL=https://auth-server.example.com
AUTH_SERVER_VALIDATE_ENDPOINT=/api/auth/validate
AUTH_SERVER_JWT_SECRET=your-jwt-secret  # If validating locally
AUTH_SERVER_API_KEY=your-api-key  # If needed

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/grameenride
DB_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=grameen-ride-service
KAFKA_GROUP_ID=ride-service-group

# FCM
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-fcm-project-id

# Payment Gateways
BKASH_API_URL=https://api.bkash.com
BKASH_API_KEY=your-bkash-key
BKASH_SECRET_KEY=your-bkash-secret

NAGAD_API_URL=https://api.nagad.com
NAGAD_API_KEY=your-nagad-key
NAGAD_SECRET_KEY=your-nagad-secret

# WebSocket
SOCKET_IO_PORT=3001

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_PORT=9090

# Security
JWT_SECRET=your-jwt-secret  # For token parsing (if needed)
API_RATE_LIMIT=100  # Requests per minute
```

---

## API Endpoints Structure

### Trip Service
```
POST   /api/trips                    - Create trip
GET    /api/trips                    - Get user trips
GET    /api/trips/:id                - Get trip details
PUT    /api/trips/:id/cancel         - Cancel trip
PUT    /api/trips/:id/rate           - Rate trip
```

### Driver Service
```
GET    /api/drivers/me               - Get driver profile
PUT    /api/drivers/me               - Update driver profile
POST   /api/drivers/vehicles         - Register vehicle
PUT    /api/drivers/availability     - Update availability
POST   /api/drivers/location         - Update location
GET    /api/drivers/earnings         - Get earnings
```

### Notification Service
```
GET    /api/notifications            - Get notifications
PUT    /api/notifications/:id/read   - Mark as read
POST   /api/notifications/fcm-token  - Update FCM token
```

### Payment Service
```
POST   /api/payments                 - Initiate payment
GET    /api/payments/:id             - Get payment status
POST   /api/payments/:id/verify      - Verify payment
```

---

## Security Considerations

1. **JWT Validation**: Always validate JWT tokens with Auth Server
2. **HTTPS/TLS**: All communications encrypted
3. **Rate Limiting**: Per user (auth_user_id) rate limiting
4. **Input Validation**: Sanitize all inputs (use Joi)
5. **SQL Injection Prevention**: Use parameterized queries (pg)
6. **XSS Prevention**: Sanitize outputs
7. **CORS**: Configure properly
8. **Secrets Management**: Use environment variables or Vault
9. **API Keys**: Secure storage for FCM, payment gateways
10. **Token Blacklisting**: Use Redis for revoked tokens (if needed)

---

## Next Steps

1. **Set up infrastructure** (PostgreSQL, Redis, Kafka)
2. **Configure Auth Server integration** (JWT validation)
3. **Implement authentication middleware**
4. **Build trip service with Kafka integration**
5. **Implement notification service with FCM**
6. **Set up real-time location tracking**
7. **Integrate payment gateway**
8. **Set up monitoring and logging**
9. **Implement CI/CD pipeline**
10. **Update Flutter app for JWT token handling**

---

## Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [PostgreSQL PostGIS](https://postgis.net/)
- [Redis Documentation](https://redis.io/docs/)
- [Socket.io Documentation](https://socket.io/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Express.js Documentation](https://expressjs.com/)
