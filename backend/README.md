# ⚙️ Grameen Ride - Backend API

[![NestJS](https://img.shields.io/badge/NestJS-10.x-ea2849?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B%20PostGIS-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7%2B-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Kafka-3.5%2B-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

A scalable ride-sharing backend application built with NestJS, PostgreSQL, Redis, and Kafka.

## Features

- ðŸ” Authentication via external Auth Server (JWT validation)
- ðŸš— Trip management with driver matching
- ðŸ’³ Payment processing integration
- ðŸ“± Push notifications via FCM
- ðŸ“ Real-time location tracking
- ðŸ”„ Event-driven architecture with Kafka
- âš¡ Circuit breaker pattern for resilience
- ðŸ“Š Health check endpoints

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 15+ with PostGIS extension
- Redis 7+
- Kafka 3.5+

## Quick Start

### Using Docker Compose

1. Clone the repository:
```bash
git clone <repository-url>
cd grameen_ride
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (especially Auth Server settings)

4. Start all services:
```bash
docker-compose up -d
```

5. Check health:
```bash
curl http://localhost:3000/api/health
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start infrastructure services (PostgreSQL, Redis, Kafka):
```bash
docker-compose up -d postgres redis zookeeper kafka
```

3. Start the application:
```bash
npm run start:dev
```

## Environment Variables

See `.env.example` for all available environment variables. Key ones:

- `AUTH_SERVER_URL`: Your Auth Server URL
- `AUTH_SERVER_JWT_SECRET`: JWT secret for token validation
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection URL
- `KAFKA_BROKERS`: Kafka broker addresses

## API Endpoints

### Health
- `GET /api/health` - Health check
- `GET /api/health/detailed` - Detailed health check

### User Profiles
- `GET /api/user-profiles/me` - Get current user profile
- `PUT /api/user-profiles/fcm-token` - Update FCM token

### Trips
- `POST /api/trips` - Create a trip
- `GET /api/trips` - Get user's trips
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id/cancel` - Cancel a trip

### Drivers
- `GET /api/drivers/me` - Get driver profile
- `PUT /api/drivers/location` - Update driver location
- `PUT /api/drivers/availability` - Update availability status

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment details

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

### Locations
- `GET /api/locations/favorites` - Get favorite locations
- `POST /api/locations/favorites` - Add favorite location

## Authentication

All endpoints (except health) require authentication via JWT token:

```bash
Authorization: Bearer <jwt_token>
```

The application validates tokens with your Auth Server or locally using the JWT secret.

## Database Schema

The application uses TypeORM with PostgreSQL. Tables are automatically created in development mode. See `DATABASE_SCHEMA.md` for the complete schema.

## Architecture

This is a modular monolith built with NestJS:

- **Modules**: Trips, Drivers, Payments, Notifications, Locations
- **Communication**: Internal events via NestJS EventEmitter
- **External Events**: Published to Kafka for external systems
- **Caching**: Redis for rate limiting and caching
- **Notifications**: FCM for push notifications

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm test
```

## Project Structure

```
src/
â”œâ”€â”€ auth/              # Authentication middleware and circuit breaker
â”œâ”€â”€ common/            # Shared utilities
â”œâ”€â”€ database/          # Database configuration
â”œâ”€â”€ drivers/           # Driver module
â”œâ”€â”€ entities/          # TypeORM entities
â”œâ”€â”€ health/            # Health check endpoints
â”œâ”€â”€ kafka/             # Kafka integration
â”œâ”€â”€ locations/          # Location services
â”œâ”€â”€ notifications/      # Notification and FCM services
â”œâ”€â”€ payments/          # Payment processing
â”œâ”€â”€ redis/             # Redis integration
â”œâ”€â”€ trips/             # Trip management
â”œâ”€â”€ user-profiles/     # User profile management
â”œâ”€â”€ app.module.ts      # Root module
â””â”€â”€ main.ts            # Application entry point
```

## License

UNLICENSED

