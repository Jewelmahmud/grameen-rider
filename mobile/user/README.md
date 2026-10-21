# 🧍 Grameen Ride (Passenger / User App)

[![Flutter](https://img.shields.io/badge/Flutter-3.24+-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![Dart](https://img.shields.io/badge/Dart-3.5+-0175C2?logo=dart&logoColor=white)](https://dart.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

The customer-facing mobile application for passengers across rural and peri-urban Bangladesh. Designed to be fast, ultra-intuitive, and accessible even on entry-level smartphones and unstable data networks.

---

## 🌟 Key Capabilities

- 🔍 **Intuitive Landmark & Map Search**: Select pickup and destination points using landmarks, bazar locations, or map pin drops.
- 🛺 **Multiple Local Vehicle Options**: Instant fare estimates for CNG auto-rickshaws, easy bikes, traditional rickshaws, motorbikes, and private car rentals.
- 🗺️ **Live Driver Tracking**: Real-time map visualization of assigned driver arrival and trip progress using Socket.IO.
- 💵 **Transparent Fares**: Fair, predictable pricing calculated per kilometer with no surprise surge spikes. Supports cash and MFS (bKash/Nagad via SSLCommerz/PortPOS).
- 🇧🇩 **Native Bengali Interface (বাংলা)**: Styled with clear Nikosh typography and voice-friendly iconography for effortless navigation.
- ⭐ **Safety & Community Reviews**: Rate drivers, access emergency support, and save frequent rural locations (e.g., local hat/bazar, hospital, school).

---

## 🛠️ Tech Stack

- **Framework**: Flutter (Material 3)
- **Mapping**: `flutter_map` with OpenStreetMap & Esri World Imagery tiles
- **Location**: `geolocator` & `geocoding` (foreground only)
- **Networking & Realtime**: `socket_io_client` & `http`
- **State Management**: `provider`
- **Typography**: Local Nikosh Bengali font family

---

## 🚀 Running the App

### 1. Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (v3.24+)
- Android Studio or VS Code with Flutter extension
- Connected Android/iOS device or emulator

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
├── demo/           # UI and navigation demo screens
├── l10n/           # Bengali & English localization ARB files
├── models/         # Trip, RideType, and RentalType models
├── services/       # Geocoding, map routing, socket connection, and fare calculator
├── user/           # Booking flow, trip tracking, profile, and settings screens
└── widgets/        # Reusable bottom navigation bars, map overlays, and brand logos
```
