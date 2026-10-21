# 🚕 Grameen Partner (Driver / Rider App)

[![Flutter](https://img.shields.io/badge/Flutter-3.24+-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![Dart](https://img.shields.io/badge/Dart-3.5+-0175C2?logo=dart&logoColor=white)](https://dart.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

The dedicated mobile application for drivers and transport operators across rural and semi-urban Bangladesh. Built specifically to handle rural transit workflows, low-connectivity zones, and non-traditional vehicles (CNGs, battery-run Easy Bikes, motorbikes, and local rentals).

---

## 🌟 Key Capabilities

- 📍 **Continuous Background GPS Telemetry**: Broadcasts real-time vehicle coordinates to backend dispatch via Socket.IO even when minimized.
- 🔔 **Instant Trip Dispatch & Audio Alerts**: High-visibility incoming ride popups with pickup landmarks, distance estimation, and accept/decline timers.
- 🗺️ **Dual Map Layer System**: Easily switch between standard road maps and satellite imagery—ideal for rural routes where road labels are missing.
- 💰 **Earnings & Trip History**: Daily, weekly, and trip-by-trip earnings breakdown with cash/MFS payment reconciliations.
- 🇧🇩 **Bangla First (বাংলা)**: Fully localized in Bengali with native Nikosh typography for intuitive use by drivers of all literacy levels.
- 📴 **Offline Grace Period**: Caches critical trip details locally so navigation continues even through mobile network dead zones.

---

## 🛠️ Tech Stack

- **Framework**: Flutter (Material 3)
- **Mapping**: `flutter_map` with OpenStreetMap & Esri World Imagery tiles
- **Geolocation**: `geolocator` & `geocoding` with background service execution
- **Networking & Realtime**: `socket_io_client` & `http`
- **State Management**: `provider`
- **Typography**: Local Nikosh Bengali font family

---

## 🚀 Running the App

### 1. Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (v3.24+)
- Android Studio or VS Code with Flutter extension
- Android device or emulator with Google Play services

### 2. Setup
```bash
# Get dependencies
flutter pub get

# Run on connected device
flutter run
```

---

## 📂 Project Structure

```text
lib/
├── demo/           # Navigation and test fixtures
├── l10n/           # Bengali & English localization ARB files
├── models/         # Trip, Vehicle, and Favorite Location data models
├── rider/          # Driver dashboard, online toggle, and ride acceptance screens
├── services/       # Realtime Socket.IO, geolocation, and pricing engines
├── user/           # Driver authentication and onboarding screens
└── widgets/        # Reusable map overlays, buttons, and custom widgets
```
