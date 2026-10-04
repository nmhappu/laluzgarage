# LaluZ Garage — Native Android (Jetpack Compose + Material 3) Migration Plan

> [!IMPORTANT]
> **PRIMARY DIRECTIVE: 1:1 IDENTICAL UI & INTERACTION REPLICATION**
> The native Jetpack Compose application must be visually, functionally, and behaviorally identical to the existing React 19 web application. All color tokens, typography scales, spacing, micro-interactions, elevation states, and responsive patterns (phone bottom dock vs tablet navigation rail) must match 1:1.

---

## 1. Context Retention Across Conversations
This document and workspace rules ([GEMINI.md](file:///c:/Users/appu/Desktop/laluzgarage/GEMINI.md)) serve as the **persistent single source of truth** across all AI agent sessions. 
- Because AI chat contexts reset between new conversations, any new conversation automatically inspects this file to immediately resume execution with zero context loss and zero guesswork.
- Every architectural decision, progress milestone, and design token is version-controlled here.

---

## 2. Core Architecture & Strategic Decisions

### 1. Dual-Track Operational Model
- **Remote / Desktop Track**: React 19 + Tailwind v4 + Vite continues serving desktop workstations, workshop reception, and remote management.
- **Shop-Floor Native Track (`compose-app/`)**: Native Android app written in Kotlin + Jetpack Compose + Material 3 specifically engineered for shop-floor mechanics and service advisors on handheld phones and rugged tablets.
- **Single Shared Source of Truth**: Both tracks query and update the same Google Cloud Firestore collections and Firebase Authentication accounts with 100% schema alignment with [types.ts](file:///c:/Users/appu/Desktop/laluzgarage/src/types.ts) and [firestore.rules](file:///c:/Users/appu/Desktop/laluzgarage/firestore.rules).

### 2. Device & Session Model (Rugged Tablets + Personal Phones)
Technicians share rugged tablets in service bays while also having the app on personal smartphones:
- **Layer 1: Device Authentication (Firebase Auth)**
  - *Shared Workshop Tablets*: Kept persistently authenticated with the workshop station account.
  - *Personal Phones*: Authenticated with individual technician credentials.
- **Layer 2: Fast Session Switcher (Advisor PIN)**
  - Technicians authorize vehicle intake and complete job cards by selecting their avatar and entering their 4-digit PIN (stored in `users/{userId}.pin`).
  - Top app bar includes an instant "Lock / Switch Operator" action on shared tablets so technicians can hand off tablets seamlessly without logging out of Firebase.

### 3. Tooling Decisions
- **Dependency Injection**: **Hilt** (`@HiltViewModel`, `@AndroidEntryPoint`) for compile-time safety and guaranteed runtime stability on workshop tablets.
- **Build System**: **Kotlin DSL (`build.gradle.kts`)** + **Gradle Version Catalog (`gradle/libs.versions.toml`)**.
- **Target SDK**: Android 15 (API 35), **Min SDK**: Android 8.0 (API 26) to support all commercial rugged tablets.

---

## 3. 1:1 Design System & Token Parity

### Color Palette (Mirrors `src/index.css` 1:1)

| Token | Dark Mode (Obsidian) | Light Mode (Clean Slate) | Usage in Compose M3 |
| :--- | :--- | :--- | :--- |
| `background` | `#07080A` | `#FFFFFF` | `MaterialTheme.colorScheme.background` |
| `surface` | `#07080A` / `#0C0E12` | `#F8FAFC` | `MaterialTheme.colorScheme.surface` |
| `surfaceVariant` / `muted` | `#12141A` | `#F1F5F9` | `MaterialTheme.colorScheme.surfaceVariant` |
| `primary` / `accent` | `#10B981` (Emerald) | `#10B981` (Emerald) | `MaterialTheme.colorScheme.primary` |
| `secondary` | `#3B82F6` (Electric Blue) | `#3B82F6` | `MaterialTheme.colorScheme.secondary` |
| `border` / `outline` | `#1E232E` | `#E2E8F0` | `MaterialTheme.colorScheme.outline` |
| `text` / `foreground` | `#F8FAFC` | `#0F172A` | `MaterialTheme.colorScheme.onBackground` |
| `textMuted` | `#94A3B8` | `#64748B` | `MaterialTheme.colorScheme.onSurfaceVariant` |
| `statusSuccess` | `#10B981` | `#10B981` | Status chip: Completed / In Stock |
| `statusPending` | `#FBBF24` (Amber) | `#FBBF24` | Status chip: Pending / In Progress |
| `statusUrgent` | `#F43F5E` (Rose) | `#F43F5E` | Status chip: Overdue / Out of Stock |
| `whatsapp` | `#128C7E` | `#128C7E` | Customer communication triggers |

### Typography & Motion Parity
- **Font**: Google Sans / Plus Jakarta Sans.
- **Motion**: Standard M3 Emphasized Decelerate `CubicBezierEasing(0.2f, 0f, 0f, 1f)` with 200ms–400ms durations matching `m3Variants` in React.

---

## 4. Execution Roadmap (Milestones A -> B -> C -> D)

### Phase A: Auth, PIN Pad & Adaptive Navigation Shell (COMPLETED)
- [x] Bootstrap `compose-app/` Gradle structure with Version Catalog (`libs.versions.toml`).
- [x] Setup `LaluzTheme` with dark/light dynamic tokens, Google Sans typography, and vector logo.
- [x] Implement **1:1 Login Screen**:
  - Email/Password form with smooth mode transitions, password toggle, and error alert banners.
  - Pending approval screen for unassigned workshop users.
- [x] Implement **1:1 Advisor PIN Verification (`AdvisorVerification`)**:
  - 4-digit input slots, custom numeric keypad, haptic feedback, and error shake animation.
- [x] Implement **1:1 Adaptive Navigation Shell (`WindowSizeClass`)**:
  - Phone: `NavigationBar` + `TopAppBar` with dynamic operator switcher and "+ Intake" FAB.
  - Rugged Tablet: `NavigationRail` with persistent side rail, "+ Intake" FAB, and operator lock button.
- [x] Verified full Debug APK compilation (`app-debug.apk`).

### Phase B: Service History, Job Cards & Vehicle Ledger Drawer (COMPLETED)
- [x] Live Firestore service records query with status filtering (`all`, `pending`, `in-progress`, `completed`).
- [x] Implemented **1:1 ServiceRecordCard**:
  - Calendar date pill, monospace plate styling, vehicle make/model, customer & phone.
  - Overdue delta calculator (`X days overdue`, `Due today`, `Due in X days`).
  - Mileage / Dead Vehicle status chips, allocated parts badge, and formatted grand total.
- [x] Implemented **1:1 EditRecordSheetContent (Vehicle Ledger)**:
  - Vehicle Hero card with plate, customer, phone, and odometer.
  - Segmented status selector pills (`Pending`, `In Progress`, `Completed`) with final completion mileage input.
  - Interactive task checklist with dynamic checkbox toggling and custom task creation.
  - Parts allocation picker with stock quantity checks, increment/decrement controls, and line item calculations.
  - Billing summary card with live labor charge input and auto-tallied grand total.
  - Final remarks & advice text area.
- [x] Implemented **Adaptive Dual-Pane Services View (`ServicesScreen`)**:
  - **Phones**: Single-column `LazyColumn` + gesture-driven `ModalBottomSheet`.
  - **Rugged Tablets**: Master-Detail Two-Pane layout (45% job list on the left, 55% embedded vehicle ledger on the right).
- [x] Verified full Debug APK compilation with Phase B integrated (`app-debug.apk`).

### Phase C: Multi-Step Vehicle Intake Wizard (COMPLETED)
- [x] Multi-step pager (`IntakeWizardScreen` with linear progress indicator and step animations):
  - [x] Step 1: Customer Discovery (`Step1CustomerDiscovery` with live search, selection card, and inline new customer registration).
  - [x] Step 2: Vehicle Selection & Registration (`Step2VehicleSelection` with customer fleet lookup, uppercase plate formatting, make/model, color, and Key Tag vs. Screen PIN passcode selector).
  - [x] Step 3: Job Specification (`Step3JobSpecification` with odometer input, dead vehicle toggle, quick task preset chips, custom task adder, personal belongings tracking, and advisor handover remarks).
- [x] Implemented **1:1 IntakeSuccessScreen**:
  - Green checkmark status badge with summary card (plate, customer, tasks).
  - Direct WhatsApp URL intent trigger with pre-filled registration alert.
  - Immediate "Open Active Job Card" navigation.
- [x] Integrated into `LaluzNavigation` with floating action triggers and draft discard protection dialog.
- [x] Verified full Debug APK compilation with Phase C integrated (`app-debug.apk`).

### Phase D: Inventory & Parts Management (COMPLETED)
- [x] Real-time inventory parts stream with live stock calculations and warehouse valuation (`InventoryRepository`).
- [x] Implemented **1:1 PartCard**:
  - Uppercase bold title, category chip, warehouse shelf location tag with `Place` icon in electric blue.
  - Low stock visual alert badge (`LOW STOCK` in rose `#F43F5E`) when `stockQuantity <= minStockLevel`.
  - Tabular price formatting in Indian Rupees and green/rose stock status text.
- [x] Implemented **1:1 PartFormDialog**:
  - Add & Edit spare parts with validation (name, category dropdown, price, stock quantity, min stock alert, warehouse shelf location).
  - Admin deletion safeguard confirmation dialog.
- [x] Implemented **Adaptive Inventory View (`InventoryScreen`)**:
  - Metric summary header (total parts count, active low-stock alerts).
  - Category filter chips row with toggleable "Low Stock Only" filter pill.
  - **Phone**: Single-column scrollable list.
  - **Rugged Tablet**: 2-column responsive card grid (`LazyVerticalGrid`).
  - Floating action button "+ Add Part".
- [x] Verified full Debug APK compilation with Phase A, B, C, and D fully integrated (`app-debug.apk`).

---

## 5. Authentication & Role Synchronization Engine
To ensure 100% parity with React's `AuthContext.tsx` and [firestore.rules](file:///c:/Users/appu/Desktop/laluzgarage/firestore.rules):
- **User Document Sync (`AuthRepository.syncUserProfile`)**:
  - Automatically initializes `users/{uid}` with `name`, `email`, `status: offline`, `tags: []` if missing.
  - Migrates pre-registered user profiles created by managers before first sign-in.
- **Zero-Admin Bootstrap**:
  - If no user document in Firestore has `role == 'admin'` or `tags` containing `'admin'`, the first authenticating user is promoted to `role = 'admin'` and writes `/settings/admin_lock`.
- **Pending Role Screen (`PendingApprovalScreen`)**:
  - Displays user profile (Name, Account Email, and UID with one-click copy button).
  - Offers real-time **Check Activation Status** button (`authViewModel.refreshProfile()`) and **Sign Out** button.
- **ADB Telemetry Logging**:
  - Android logcat tag: `LaluzAuth` logs real-time auth status, snapshot updates, and bootstrap execution.
