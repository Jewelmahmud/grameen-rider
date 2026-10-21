# Grameen Ride (গ্রামীণ রাইড)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-ea2849?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Flutter](https://img.shields.io/badge/Flutter-3.24+-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Kafka-3.5-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)

Ride-sharing built for rural and semi-urban Bangladesh.

Most ride-hailing apps don't work well outside big cities because they assume every road is named, GPS is pinpoint accurate, and everyone has a flagship phone. Grameen Ride is built around local realities: booking CNGs, Easy Bikes, Rickshaws, and Motorbikes using familiar landmarks, satellite imagery, and full Bangla support.

---

## What's in this repo

This is a monorepo containing the entire platform:

- **`backend/`** – NestJS API with PostgreSQL (PostGIS), Redis for driver locations, Kafka for events, and Socket.IO for real-time dispatch.
- **`frontend/`** – React + Vite web dashboard for trip monitoring and operations.
- **`mobile/user/`** – Passenger app (Flutter) for searching rides, checking fares, and live tracking.
- **`mobile/rider/`** – Driver app (Flutter) with background GPS broadcasting, trip request alerts, and earnings tracking.

> **Note on mobile apps**: We maintain two separate Flutter apps (`mobile/user` and `mobile/rider`). Driver apps need persistent background GPS tracking, audio alerts, and driver verification, whereas passenger apps stay lightweight and fast for budget phones.

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env

# Spin up Postgres, Redis, and Kafka
docker-compose up -d

# Install & run
npm install
npm run start:dev
```
API runs at `http://localhost:3000/api`. Health check: `http://localhost:3000/api/health`.

### 2. Admin / Web Dashboard

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Runs at `http://localhost:5173`.

### 3. Mobile Apps (Flutter)

Make sure you have Flutter installed and a device or emulator connected:

```bash
# Passenger app
cd mobile/user
flutter pub get
flutter run

# Driver app
cd mobile/rider
flutter pub get
flutter run
```

---

## Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL + PostGIS, Redis, Apache Kafka, Socket.IO
- **Mobile**: Flutter, OpenStreetMap / Esri Satellite, Geolocator, Provider
- **Frontend**: React 18, TypeScript, Vite
- **Payments**: SSLCommerz, PortPOS, Cash

---

## License

[MIT](LICENSE)
