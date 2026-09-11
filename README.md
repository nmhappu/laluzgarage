<div align="center">

# 🚗 LaluZ Garage

**A high-performance, mobile-first workshop management application built for automotive garage technicians, service advisors, and workshop managers.**

Streamline vehicle intake, job card progression, real-time parts inventory deduction, billing calculations, WhatsApp status alerts, and native phone contact exports.

[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Android Build](#-android--mobile-development) • [Architecture](#-project-architecture) • [Database](#-database-schema) • [Roadmap](#-roadmap)

---

</div>

## 📌 Overview

**LaluZ Garage** is engineered from the ground up to replace paper job cards and fragmented workshop systems with a mobile-optimized, real-time workspace. Whether accessed on an advisor's smartphone on the garage floor or on a desktop workstation, LaluZ Garage delivers fluid animations, instant search, offline-tolerant data caching, and native mobile integrations.

---

## ⚡ Key Features

### 1. 📋 Multi-Step Vehicle Intake Wizard
- **Advisor PIN Verification**: Secure 4-digit PIN authentication before vehicle registration to log advisor accountability.
- **Unified Live Search**: Instant fuzzy discovery across existing customer names, phone numbers, vehicle registration plates, and make/models.
- **3-Step Intake Flow**:
  1. **Customer Discovery**: Quick select or instant inline profile creation.
  2. **Vehicle Selection / Registration**: Multi-vehicle support per customer, plate formatting, exterior color tagging, and Key vs. Screen PIN passcode logging.
  3. **Job Specification**: Checklist tasks with interactive markdown syntax (`[ ]` / `[x]`), odometer mileage input with toggles for "Dead Vehicle" or "Unknown Mileage", customer personal belongings tracking, and promised delivery dates.
- **Animated Sinusoidal Progress Bar**: Custom `WavyProgress` visual indicator guiding advisors through intake stages.

### 2. 🔧 Service Tracking & Job Cards
- **Lifecycle Management**: Real-time status transitions across `Pending` ➔ `In-Progress` ➔ `Completed` / `Cancelled`.
- **Interactive Checklists**: Check off repair tasks directly inside job cards.
- **Overdue Intelligence**: Automated delivery deadline tracking with status badges (`Due Today`, `X Days Overdue`, `X Days Left`).
- **Vehicle Ledger Drawer**: Full-screen slide-over drawer displaying a vehicle's historical service records, lifetime spend, and chronological repairs.
- **Job Completion Modal**: Validates final odometer progression (`completionMileage >= startMileage`), hand-over remarks, and generates final invoice tallies.

### 3. 📦 Real-Time Parts Inventory & Billing
- **Dynamic Stock Allocation**: Technicians allocate parts from the warehouse inventory directly into service records with quantity deduction.
- **Automated Billing Engine**: Dynamically calculates `Total = Labor Charges + Parts Total`.
- **Stock Safeguards**: Low-stock visual warning badges when inventory falls to or below `minStockLevel`.
- **Item Categorization**: Tagging across Brakes, Engine, Electrical, Body, and warehouse shelf locations.

### 4. 💬 WhatsApp & Native Contacts Automation
- **Instant WhatsApp Alerts**: Pre-filled customer messages on vehicle intake and job delivery formatted via customizable template presets.
- **Dynamic Template Placeholders**: Supports `{customer_name}`, `{vehicle_make}`, `{vehicle_model}`, `{vehicle_plate}`, `{job_description}`, `{parts_list}`, `{labor_cost}`, and `{total_cost}`.
- **Native Android Contacts Export**: Dispatches `android.intent.action.INSERT` (`vnd.android.cursor.dir/contact`) intent to add customer contact details directly into the phone's address book with vehicle notes pre-filled.
- **Universal vCard 3.0**: RFC 2426 `.vcf` fallback generation via `navigator.share` or file download for desktop and iOS browsers.

### 5. 📊 Watchlist & Advisor Analytics
- **Dashboard Stat Tiles**: Watchlist metrics for Total Services, Pending Work, Completed Jobs, and Issues Attended.
- **Embedded Sparklines**: 14-day operational trend charts powered by `recharts`.
- **Advisor Performance**: Revenue attribution breakdown per advisor (labor vs. parts revenue).

### 6. 🎨 Google Material Design 3 (M3) Experience
- **Fluid Typography**: Engineered with `Google Sans`, `Plus Jakarta Sans`, and tabular numeric monospace formatting for registration plates, odometers, and currency (`₹`).
- **Seamless Canvas Design**: Clean, borderless layout architecture with subtle ambient backlight glows and divider-based detail rows.
- **Shared Layout Animations**: Smooth glyph morphing page titles powered by `motion` (`MorphText`), spring-physics drawers, and tab backdrop pills.
- **Circular Reveal Theming**: Dark mode (`#07080A`) and Light mode switching with native View Transitions API circular-wipe animations.

---

## 🛠️ Tech Stack

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

## 📁 Project Architecture

```text
laluzgarage/
├── android/                   # Native Android Studio project (Capacitor 8)
├── external-items/            # Custom SVG icon assets and glyphs
├── public/                    # Static assets, PWA icons, manifest
├── src/
│   ├── components/            # UI components organized by domain
│   │   ├── auth/              # Login, authentication modals & guards
│   │   ├── dashboard/         # Stat tiles, sparklines, recent logs
│   │   ├── intake/            # Multi-step intake wizard & PIN verification
│   │   ├── inventory/         # Parts inventory list, part modal forms
│   │   ├── nav/               # Desktop sidebar, mobile top/bottom bars
│   │   ├── services/          # Job cards, filter bar, service details & edit
│   │   │   └── sheet/         # Vehicle ledger drawer & slide-overs
│   │   ├── settings/          # Advisor accounts, WhatsApp presets, analytics
│   │   ├── shared/            # Reusable dialogs, status badges, calendars
│   │   ├── ui/                # Headless selects, morph text, search icons
│   │   └── vehicle/           # Vehicle registry cards & management modals
│   ├── contexts/              # React contexts (Auth, Theme, UI state)
│   ├── hooks/                 # Custom React hooks (useServiceIntake, useInventory, etc.)
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

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Android Studio**: (Optional, required only for native Android APK/AAB builds)

### 1. Clone & Install
```bash
git clone https://github.com/nmhappu/laluzgarage.git
cd laluzgarage
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (or use `.env.example` as a reference):

```env
# Optional Gemini AI Key for extended assistance
GEMINI_API_KEY=your_gemini_api_key

# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e
```

### 3. Run Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 4. Run Tests & Linting
```bash
npm run test    # Runs Vitest test suite
npm run lint    # Runs ESLint and TypeScript type checking
```

---

## 📱 Android & Mobile Development

LaluZ Garage is packaged with **Capacitor 8** for high-performance native Android distribution. It includes support for Android 15+ transparent system bars, edge-to-edge layout, hardware back button routing, and Google Native Auth.

| Command | Description |
| :--- | :--- |
| `npm run mobile:build` | Compiles the production web assets and copies them to the Android project |
| `npm run mobile:sync` | Builds web assets and synchronizes Capacitor plugins with Gradle |
| `npm run mobile:open` | Launches the project directly in Android Studio |

### Key Mobile Configurations (`capacitor.config.ts`)
- **Application ID**: `dev.appu.laluzgarage`
- **Status Bar**: Custom dark/light styling synchronized with app theme.
- **Hardware Back Button Handler**: Closes active modal/drawer sheets before prompting double-tap exit.

---

## 🗄️ Database Schema

The app uses Cloud Firestore with real-time listeners (`onSnapshot`):

```
Firestore
├── /customers/{customerId}
│   └── name, phone, technicianId, createdAt, updatedAt
├── /vehicles/{vehicleId}
│   └── customerId, make, model, color, plateNumber, passwordOrPin, technicianId, createdAt
├── /parts/{partId}
│   └── name, sku, category, stockQuantity, price, minStockLevel, location, updatedAt
├── /serviceRecords/{recordId}
│   └── vehicleId, customerId, technicianId, date, expectedDeliveryDate, mileage, completionMileage,
│       isDeadVehicle, isUnknownMileage, description, status, laborCost, partsCost, totalCost, partsUsed[]
├── /users/{userId}
│   └── name, email, status (online/offline), pin (4-digit), tags[], createdAt
└── /settings/whatsapp
    └── intakeTemplate, deliveryTemplate, updatedAt
```

---

## 💬 WhatsApp Template Syntax

Custom message templates are editable under **Settings ➔ WhatsApp Presets** and support the following runtime dynamic variables:

| Placeholder | Description | Example Output |
| :--- | :--- | :--- |
| `{customer_name}` | Capitalized customer full name | *Rahul Sharma* |
| `{vehicle_plate}` | Vehicle registration plate | *KA01AB1234* |
| `{vehicle_make}` | Vehicle manufacturer | *Ola* / *Honda* |
| `{vehicle_model}` | Model identifier | *S1 Pro* / *Activa 6G* |
| `{vehicle_title}` | Full vehicle name | *Ola S1 Pro (KA01AB1234)* |
| `{job_description}` | Sanitized checklist items without markdown syntax | *• Brake pad change\n• Oil service* |
| `{parts_list}` | Formatted list of allocated parts with quantities | *• Front Disc Pad x 1\n• 10W40 Oil 1L x 1* |
| `{labor_cost}` | Formatted labor charges | *₹650* |
| `{total_cost}` | Formatted grand total | *₹2,450* |

---

## 🔮 Roadmap & Future Considerations

- [ ] **Role-Based Access Control (RBAC)**: Distinct permissions for `admin`, `service manager`, and `technician`.
- [ ] **GST Billing Engine**: Automated CGST / SGST split computation, HSN code tagging on parts, and printable tax invoices.
- [ ] **Relational Database Migration**: Decoupled service layer architecture to facilitate migration to self-hosted PostgreSQL/MySQL.
- [ ] **Low-End Hardware Optimization**: Optional solid surface mode (`bg-workshop-bg/95`) toggles to maximize 60fps frame rates on entry-level Android devices.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

Copyright (c) 2026 **Prince Santhosh**. All rights reserved.
