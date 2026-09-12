<div align="left">

# LaluZ Garage

**A workshop management application built for garage technicians, service advisors, and workshop managers.**

[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

[Features](#key-features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Architecture](#project-architecture) • [Database](#database-schema)

---

</div>

## Key Features

### 1. Vehicle Intake Wizard
- **Advisor PIN Verification**: 4-digit PIN authentication before vehicle registration to log advisor accountability.
- **Intake Flow**:

  1. **Customer Discovery**: Quick select or instant inline profile creation.
  2. **Vehicle Selection / Registration**: Multi-vehicle support per customer, plate formatting, exterior colour tagging, and Key vs. Screen PIN passcode logging.
  3. **Job Specification**: Checklist tasks, odometer mileage, input for Dead Vehicle, customer personal belongings tracking, and estimated delivery dates.

### 2. Service Tracking & Job Cards
- **Interactive Checklists**: Check off repair tasks directly inside job cards.
- **Overdue Intelligence**: Automated delivery deadline tracking with status badges
- **Vehicle Ledger Drawer**: Displays a vehicle's historical service records, lifetime spend, and chronological repairs.
- **Job Completion Modal**: Validates final odometer progression, hand-over remarks, and generates final invoice tallies.

### 3. Real-Time Parts Inventory & Billing
- **Stock Allocation**: Technicians allocate parts from the warehouse inventory directly into service records.
- **Billing Engine**: Dynamically calculates `Total = Labor Charges + Parts Total`.
- **Stock Safeguards**: Low-stock visual warning badges when inventory falls to or below `minStockLevel`.
- **Item Categorisation**: Tagging across Brakes, Engine, Electrical, Body, and warehouse shelf locations.

### 4. WhatsApp Templates
- **WhatsApp Alerts**: Pre-filled customer messages on vehicle intake and job delivery.
- 
### 5. Watchlist & Advisor Analytics
- **Dashboard Stat Tiles**: Watchlist metrics for Total Services, Pending Work, Completed Jobs, and Issues Attended.
- **Embedded Sparklines**: 14-day operational trend charts.
- **Advisor Performance**: Revenue attribution breakdown per advisor.

---

## Tech Stack

| Domain | Technology / Library | Version | Usage |
| :--- | :--- | :--- | :--- |
| **UI Framework** | [React](https://react.dev/) | `^19.3.0` | Core UI engine, Concurrent features |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `~5.8.2` | Strict typing and interfaces |
| **Bundler / Server** | [Vite](https://vitejs.dev/) | `^8.3.0` | High-speed ESM development and build |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `^4.3.3` | Modern utility CSS with custom CSS tokens |
| **Animations** | [Motion](https://motion.dev/) | `^13.2.0` | Layout transitions, spring drawers, glyph morphing |
| **Backend & Auth** | [Firebase](https://firebase.google.com/) | `^12.19.0` | Firestore real-time DB & Firebase Authentication |
| **Mobile Runtime** | [Capacitor](https://capacitorjs.com/) | `^8.5.1` | Native Android wrapper, System Bars, Back Button |
| **Icons** | [Lucide React](https://lucide.dev/) & [Material Symbols](https://fonts.google.com/icons) | `^1.44.0` | Interface controls and primary navigation glyphs |
| **Data Viz** | [Recharts](https://recharts.org/) | `^3.10.1` | Dashboard sparkline trends & advisor charts |
| **Date Engine** | [date-fns](https://date-fns.org/) | `^4.4.0` | ISO parsing, overdue delta computing, calendar |
| **Headless UI** | [Radix UI Select](https://www.radix-ui.com/) | `^2.3.7` | Accessible select primitives |

---

## Project Architecture

```text
laluzgarage/
├── android/                   # Native Android Studio project (Capacitor 8)
├── external-items/            # Custom SVG icon assets and glyphs
├── public/                    # Static assets, PWA icons, manifest
├── src/
│   ├── components/            # UI components
│   │   ├── auth/              # Login, authentication modals & guards
│   │   ├── dashboard/         # Stat tiles, sparklines, recent logs
│   │   ├── intake/            # Multi-step intake wizard & PIN verification
│   │   ├── inventory/         # Parts inventory list, part modal forms
│   │   ├── nav/               # Desktop sidebar, mobile top/bottom bars
│   │   ├── services/          # Job cards, filter bar, service details & edit
│   │   │   └── sheet/         # Vehicle ledger drawer & slide-overs
│   │   ├── settings/          # Advisor accounts, WhatsApp presets, analytics
│   │   ├── shared/            # Reusable dialogues, status badges, calendars
│   │   ├── ui/                # Headless selects, morph text, search icons
│   │   └── vehicle/           # Vehicle registry cards & management modals
│   ├── contexts/              # React contexts (Auth, Theme, UI state)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Firebase config, utility helpers, formatting
│   ├── services/              # WhatsApp formatting, vCard & contacts exporter
│   ├── styles/                # Supplementary styles & design tokens
│   ├── types.ts               # Core TypeScript interfaces & domain schemas
│   ├── App.tsx                # App routes, layout wrappers, and listeners
│   ├── index.css              # Tailwind v4 theme, font definitions, custom utilities
│   └── main.tsx               # App entrypoint & PWA registration
├── capacitor.config.ts        # Capacitor mobile configuration
├── firestore.rules            # Firestore security rules and schema enforcement
├── package.json               # Dependencies and scripts
└── vite.config.ts             # Vite build configuration
```

---

## Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Android Studio**: (Optional, for Android build)

### 1. Clone & Install
```bash
git clone https://github.com/nmhappu/laluzgarage.git
cd laluzgarage
npm install
```

### 2. Configure Environment Variables

```env
# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=your_db_id
```

### 3. Run Development Server
```bash
npm run dev
```
will be hosted on `http://localhost:3000`.

### 4. Run Tests & Linting
```bash
npm run test    # Runs Vitest test suite
npm run lint    # Runs ESLint and TypeScript type checking
```

---

## Database Schema

App uses Cloud Firestore with real-time listeners (`onSnapshot`):

```
Firestore
├── /customers/{customerId}
│   └── name, phone, technicianId, createdAt, updatedAt
├── /vehicles/{vehicleId}
│   └── customerId, make, model, colour, plateNumber, passwordOrPin, technicianId, createdAt
├── /parts/{partId}
│   └── name, sku, category, stockQuantity, price, minStockLevel, location, updatedAt
├── /serviceRecords/{recordId}
│   └── vehicleId, customerId, technicianId, date, expectedDeliveryDate, mileage, completionMileage
│       isDeadVehicle, isUnknownMileage, description, status, laborCost, partsCost, totalCost, partsUsed[]
├── /users/{userId}
│   └── name, email, status (online/offline), pin (4-digit), tags[], createdAt
└── /settings/whatsapp
    └── intakeTemplate, deliveryTemplate, updatedAt
```

---

## WhatsApp Template Syntax

Custom message templates are editable under Settings and have dynamic variables:

| Placeholder | Description |
| :--- | :--- |
| `{customer_name}` | Customer full name
| `{vehicle_plate}` | Vehicle registration plate
| `{vehicle_make}` | Vehicle manufacturer
| `{vehicle_model}` | Model identifier
| `{vehicle_title}` | Full vehicle name
| `{job_description}` |  Repair checklist items
| `{parts_list}` | Formatted list of allocated parts with quantities
| `{labor_cost}` | Formatted labor charges
| `{total_cost}` | Formatted grand total

---

## License

Distributed under the **GNU Affero General Public License v3.0**. See [`LICENSE`](LICENSE) for more information.

Copyright (c) 2026 **Prince Santhosh**. All rights reserved.
