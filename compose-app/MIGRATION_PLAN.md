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

## 4. Execution Roadmap (Step-by-Step Milestones)

### Milestone 1: Clean Foundation, Toolchain & Design Tokens (COMPLETED)
- [x] Clean wipe of previous source files while safely preserving `google-services.json` and `local.properties`.
- [x] Version Catalog (`gradle/libs.versions.toml`) configured with AGP 8.8.2, Kotlin 2.1.0, Compose BOM, Material 3, Hilt 2.55, KSP, Firebase BOM 33.8.0, Navigation Compose, and Coil.
- [x] Edge-to-edge transparent system bars setup with `enableEdgeToEdge()`.
- [x] 1:1 Design tokens in `Color.kt`, `Theme.kt`, and `Type.kt` matching web tokens (`#07080A` Obsidian dark, `#10B981` Emerald primary, `#3B82F6` Electric blue, `#F43F5E` urgent rose, `#FBBF24` amber).
- [x] Application class `@HiltAndroidApp LaluzApplication` and `@AndroidEntryPoint MainActivity`.
- [x] Verified full compilation of debug APK (`assembleDebug` passing with zero errors).

### Milestone 2: Auth Flow, Zero-Admin Bootstrap & Adaptive Navigation Shell (COMPLETED)
- [x] Kotlin domain models aligned with `types.ts` & `firestore.rules` (`WorkshopUser`, `UserRole`, `Customer`, `Vehicle`, `Part`, `ServiceRecord`).
- [x] Hilt `AppModule` injecting `FirebaseAuth`, `FirebaseFirestore`, and `Dispatchers.IO`.
- [x] `AuthRepository` with Firestore presence tracking (`online`/`offline`), profile sync, and automated zero-admin bootstrap.
- [x] `AuthViewModel` with clean state machine (`LOADING`, `UNAUTHENTICATED`, `PENDING_APPROVAL`, `AUTHENTICATED`).
- [x] 1:1 `LoginScreen`:
  - Progressive sign-in flow (Choice between Google and Email).
  - Clean M3 `OutlinedTextFields`, password visibility toggle, error alert banner.
  - Top header with brand title and `ThemeToggle` (Dark/Light mode).
  - Custom brand vector logo (`LaluzLogo`) and footer with attribution.
  - Device back handler returning from Email form to initial options.
- [x] 1:1 `PendingApprovalScreen`:
  - Shield alert icon with amber glow.
  - User profile summary with 1-click clipboard UID copy.
  - "Check Activation Status" and "Sign Out" actions.
- [x] Adaptive `AdaptiveScaffold`:
  - Compact (Phones): Bottom `NavigationBar` + TopAppBar with active technician name and "+ INTAKE" FAB.
  - Tablets: Left `NavigationRail` with persistent brand emblem, "+ Intake" FAB, and navigation items.

### Milestone 3: Services Screen & Dedicated Full-Screen Vehicle Ledger (COMPLETED)
- [x] Real-time Firestore stream of service records, vehicles, customers, and parts (`ServiceRepository`).
- [x] Compact, dense job cards list view (`CompactServiceRow`) with monospace license plate pill, customer name, vehicle model, status dot, overdue days calculator, and formatted total cost.
- [x] Status filter tabs row (`All Logs`, `Pending`, `In Progress`, `Completed`) with badge counts and quick search bar.
- [x] Dedicated full-screen `VehicleLedgerScreen`:
  - Customer hero card with instant phone dial and WhatsApp trigger buttons.
  - Segmented status selector pills (`Pending`, `In Progress`, `Completed`) with completion mileage input.
  - Interactive task checklist with dynamic checkbox toggling and "+ Add Task" quick input.
  - Spare parts allocation with stock quantity checks, increment (+) and decrement (-) buttons.
  - Billing summary card with editable labor charges and auto-calculated grand total.
  - Handover remarks & advice text area with instant Firestore update.
- [x] Verified full Debug APK compilation with Milestone 1, 2, and 3 integrated (`assembleDebug` SUCCESSFUL).

### Milestone 4: Multi-Step Vehicle Intake Wizard (COMPLETED)
- [x] Advisor PIN Verification Dialog (`AdvisorPinDialog`):
  - 4-digit PIN verification modal prior to accessing the wizard.
  - Verification against `WorkshopUser.pin` with fallback to default PIN `1234`.
- [x] Multi-step animated wizard (`IntakeWizardScreen`):
  - Top progress bar indicator tracking Step 1 of 3, 2 of 3, 3 of 3.
  - Smooth horizontal slide transitions between steps with system back handling.
  - Step 1: Customer Discovery — search existing customer records by phone, name, or plate; inline new customer creation.
  - Step 2: Vehicle Selection — select from customer's existing fleet or register new vehicle (make, model, color, physical key vs PIN).
  - Step 3: Job Specification — odometer reading with dead vehicle toggle, service checklist presets chips, custom complaint input, belongings, internal remarks.
  - Form validation: Next and Submit buttons selectively enabled based on step criteria.
  - Direct atomic Firestore creation for customer, vehicle, and `serviceRecords`.
  - Simple confirmation toast on completion returning directly to the Services list.
- [x] Verified compilation and Gradle test passes with 0 errors.

### Milestone 5: Inventory & Parts Management (NEXT)
- [ ] Real-time stock counts and low stock warnings.
- [ ] `PartCard` with warehouse shelf location tag.
- [ ] `PartFormDialog` for adding and editing spare parts.

### Milestone 8: Vehicle History & Customer Fleet
- [ ] Vehicle search and fleet cards.
- [ ] Vehicle Ledger drawer / history viewer.
- [ ] Add/Edit vehicle modal.

### Milestone 9: Dashboard & Workshop Analytics
- [ ] KPI summary cards (active jobs, daily intake, inventory alert count).
- [ ] Workshop performance analytics.

### Milestone 10: Settings, Team Roster & WhatsApp Presets
- [ ] User profile and dark/light theme switch.
- [ ] Team management: technician roles, tags, and PIN assignment.
- [ ] WhatsApp message template presets.

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
