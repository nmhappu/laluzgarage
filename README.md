# LaluZ Garage
A high-performance, precision-crafted workshop management application built for modern technicians. **LaluZ Garage** streamlines customer relationship management, vehicle service tracking, and inventory control with a focus on speed, reliability, and mobile accessibility.

## Features

- **Dynamic Dashboard**: Real-time business metrics including customer growth, active service queue, and parts utilization with visual growth indicators.
- **Precision Service Intake**: Advanced multi-step job card system with PIN/Security tracking, vehicle identification, and atomic part allocation.
- **Comprehensive Logbook**: Full service history tracking with status-specific visual identifiers (Pending, In-Progress, Completed, Cancelled) and advanced filtering.
- **Intelligent Inventory**: Atomically managed stock catalog with "Low Stock" alerts, transaction-safe adjustments, and precise location tracking.
- **Customer CRM**: 360-degree view of customer profiles, linked vehicle assets, and full historical transaction logs regardless of service status.
- **Mobile-First Design**: Native gesture support, adaptive layouts, and high-DPI precision corners for a seamless experience on tablets and phones.
- **Workshop Dark Theme**: High-contrast, accessibility-conscious dark mode optimized for low-light garage environments using the "Plus Jakarta Sans" geometric typeface.

## Tech Stack

- **Frontend**: React 18 (Functional components, Hooks)
- **Runtime/Build**: Vite & TypeScript
- **Styling**: Tailwind CSS 4.0 (Modern utility-first architecture)
- **Database**: Firebase Firestore (Real-time NoSQL synchronization)
- **Animation**: Framer Motion (Smooth layout and state transitions)
- **Typography**: Plus Jakarta Sans (UI), Lexend (Logo), JetBrains Mono (Data)
- **Icons**: Lucide React
- **Mobile**: Capacitor (Native Android bridge support)

## Project Structure

```text
src/
├── components/       # UI Components (Inventory, ServiceHistory, Navigation, etc.)
│   └── ui/           # Shared high-precision primitive components
├── contexts/         # React Contexts for Theme, Auth, and UI state
├── lib/              # Core utilities (Firebase initialization, Tailwind merging)
├── services/         # Business logic layer (Inventory service, Service handlers)
├── types.ts          # Centralized TypeScript interfaces and enums
└── main.tsx          # Application entry point
```

## Mobile Development (Android)

This project is fully compatible with native Android development via **Capacitor**.

### How to run locally
1. **Sync Assets**: Run `npx cap sync` after local builds.
2. **Open Android Studio**: Use `npx cap open android` to launch the platform.
3. **Build**: Ensure `npm run build` is executed before syncing to the native platform.

## Environment Setup

Check ".env.example"

## License
MIT License. Copyright (©) 2026 Prince Santhosh. See `LICENSE` for details.
