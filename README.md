# 🚗 Grameen Ride (গ্রামীণ রাইড)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-ea2849?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter%203.24+-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![React](https://img.shields.io/badge/Web-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%20%2B%20PostGIS-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Cache-Redis%207-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Streaming-Apache%20Kafka%203.5-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

> **Connecting rural and peri-urban Bangladesh with reliable, community-first transportation.**  
> Grameen Ride is an open-source, full-stack mobility platform tailored specifically for the transit realities of rural Bangladesh—connecting passengers with CNGs, Easy Bikes, Rickshaws, Motorbikes, and local rentals via lightweight apps, offline-tolerant routing, and native Bangla interfaces.

---

## 🧭 Monorepo Structure

The project is organized as a clean, standardized monorepo:

```text
grameen-rider/
├── backend/                  # NestJS core API & Realtime Gateway
│   ├── src/                  # Controllers, services, TypeORM entities & modules
│   ├── docker-compose.yml    # PostgreSQL (PostGIS), Redis, Kafka & Zookeeper
│   └── README.md             # Backend architectural documentation & API guides
│
├── frontend/                 # Web Portal & Dispatcher Dashboard
│   ├── src/                  # React 18, Vite, TypeScript & Tailwind-ready UI
│   └── README.md             # Web application setup & build instructions
│
├── mobile/                   # Mobile Applications (Flutter)
│   ├── user/                 # Grameen Ride (Passenger / Customer App)
│   │   ├── lib/              # Location search, vehicle selector, booking flows
│   │   └── pubspec.yaml      # Dart package & assets configuration
│   │
│   └── rider/                # Grameen Partner (Driver / Rider App)
│       ├── lib/              # Live GPS tracking, ride requests, driver earnings
│       └── pubspec.yaml      # Driver app configuration & background telemetry
│
├── .gitignore                # Unified monorepo ignore rules (Node, Flutter, IDEs)
└── README.md                 # Project root overview & getting started guide
```

---

## 📱 Mobile Architecture: Why Two Dedicated Apps?

We maintain two focused, separate mobile applications rather than a bloated monolithic app:

| Requirement | 🧍 Passenger App (`mobile/user`) | 🚕 Driver / Partner App (`mobile/rider`) |
| :--- | :--- | :--- |
| **Primary Goal** | Search destinations, compare fares, book & pay | Accept trip dispatches, broadcast GPS, view daily income |
| **Usage Pattern** | Short sessions (2–5 minutes per trip) | Continuous 8–12 hour active shift |
| **Location Tracking** | Foreground while booking | **Continuous Background Location** (`ACCESS_BACKGROUND_LOCATION`) |
| **OS Privileges** | Standard permissions | Battery whitelisting, Keep-screen-on, overlay alerts |
| **Onboarding (KYC)** | Instant OTP verification via phone number | NID, Driving License, BRTA vehicle docs, admin approval |
| **Download Size** | Ultra-lightweight for low-bandwidth rural devices | Dedicated telemetry and offline job sync engine |

---

## ⚡ Tech Stack Highlights

- **Backend**: [NestJS](https://nestjs.com/) (Modular Architecture), [TypeORM](https://typeorm.io/) on **PostgreSQL 15** with **PostGIS** for spatial geospatial queries.
- **Realtime Dispatch**: [Socket.IO](https://socket.io/) gateway for instant bidirectional ride requests and driver telemetry.
- **Event Streaming & Buffering**: [Apache Kafka](https://kafka.apache.org/) for trip state events, notifications, and analytics; [Redis](https://redis.io/) for driver geo-indexing and caching.
- **Mobile (Cross-Platform)**: [Flutter](https://flutter.dev/) with OpenStreetMap / Esri satellite imagery tiles, native Nikosh Bengali typography, and offline fallback.
- **Web Frontend**: [React](https://react.dev/) with [Vite](https://vitejs.dev/) and TypeScript for operations, trip analytics, and system monitoring.
- **Payments & SMS**: SSLCommerz, PortPOS, and local Bangladesh SMS gateway integrations.

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker & Docker Compose](https://www.docker.com/)
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (v3.24+)
- [Git](https://git-scm.com/)

---

### 2. Backend Setup
1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create your environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Start the supporting database and messaging stack (PostgreSQL, Redis, Kafka):
   ```bash
   docker-compose up -d
   ```
4. Install dependencies and start the development server:
   ```bash
   npm install
   npm run start:dev
   ```
   The API will boot at `http://localhost:3000/api`. You can verify health at `http://localhost:3000/api/health`.

---

### 3. Web Dashboard Setup
1. Open a separate terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies and run the Vite dev server:
   ```bash
   npm install
   npm run dev
   ```
   Access the dashboard at `http://localhost:5173`.

---

### 4. Running the Mobile Apps

#### Passenger App (`mobile/user`)
```bash
cd mobile/user
flutter pub get
flutter run
```

#### Driver / Partner App (`mobile/rider`)
```bash
cd mobile/rider
flutter pub get
flutter run
```

---

## 🗺️ Key Features Built for Rural Bangladesh

- 🇧🇩 **Full Bengali Localization (বাংলা)**: Native Bengali typography using the Nikosh font family for maximum readability.
- 🛰️ **Hybrid Map Modes**: Fast switching between vector road maps and high-resolution satellite imagery—crucial for rural areas without standardized street addresses.
- 🛺 **Rural Vehicle Tiers**: Native booking support for Rickshaws, Battery-run Easy Bikes, CNGs, Pickup Vans, and Microbus rentals.
- 📶 **Network Resiliency**: Circuit breaker patterns on external auth/payment endpoints and graceful degradation on low 2G/3G rural networks.

---

## 🤝 Contributing

We welcome contributions from developers passionate about inclusive technology, rural mobility, and open infrastructure!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
