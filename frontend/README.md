# 🌐 Grameen Ride - Web Dashboard

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

The administrative web interface and operations dashboard for the **Grameen Ride** ecosystem. It provides real-time trip monitoring, driver activity tracking, and direct integration testing tools for the backend API.

---

## 🛠️ Features

- 📊 **Operations Overview**: Monitor ongoing trips, active drivers, and live ride status.
- 🔐 **Authentication & Protected Routes**: Role-based access control protecting administrative routes.
- 🧪 **API Playground**: Built-in developer playground for testing REST endpoints and real-time events.
- ⚡ **Fast Developer Experience**: Powered by Vite for instant hot module replacement (HMR).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn / pnpm

### 2. Environment Variables
Create a `.env` file from the example:
```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your running Grameen Ride NestJS backend (defaults to `http://localhost:3000/api`).

### 3. Install & Run
```bash
npm install
npm run dev
```

The application will run locally at `http://localhost:5173`.

---

## 📦 Build for Production

To create an optimized production build:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```
