# Project Instructions & Technical Guide: LaluZ Garage

LaluZ Garage is a high-performance, mobile-first workshop management application designed for automotive garage technicians, service advisors, and workshop managers. It facilitates end-to-end garage operations: customer discovery, multi-step vehicle intake, job card tracking, parts inventory deduction, billing calculation, WhatsApp status alerts, phone contact exports, and technician performance tracking.

Built with **React 19**, **Vite 6**, **Tailwind CSS v4**, and **Firebase (Firestore & Auth)**, the application is packaged for both Web/PWA and native Android via **Capacitor**.

---

## 1. Project Status Overview

| Attribute | Current Status / Specification |
| :--- | :--- |
| **Operational State** | Fully functional workshop operations platform in active production/staging. |
| **Authentication** | Firebase Authentication (Email/Password & Google OAuth popup) with automatic profile creation and legacy account migration. |
| **Database** | Firebase Firestore (`ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e`) with real-time listeners and security rules enforcing schema validation and immutability. |
| **Platform Target** | Web SPA / PWA + Native Android (Capacitor 6 / 8, Android 15+ edge-to-edge transparent system bars support). |
| **Design System** | Google Material Design 3 (M3) inspired typography (`Google Sans`, `Plus Jakarta Sans`, `JetBrains Mono`), Material Web Circular Progress, Material Symbols Outlined, and custom dark/light theme switching with circular reveal view transitions. |
| **Offline / Local Sync** | LocalStorage caching for UI themes, custom tags taxonomy, and WhatsApp message presets. |

---

## 2. External Sources, Fonts, Icons & Libraries

Every external resource, stylesheet, typography source, icon system, and third-party library is explicitly documented below. Do not assume alternative packages or CDN links.

### 2.1 Typography & Web Fonts
Loaded via Google Fonts CDN (`index.html` & `src/index.css`):
`https://fonts.googleapis.com/css2?family=Google+Sans+Text:ital,wght@0,400;0,500;0,700;1,400&family=Google+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap`

| Font Family | CSS Variable / Token | Role & Usage in UI |
| :--- | :--- | :--- |
| **Google Sans & Google Sans Text** | `--font-sans`, `--font-google-sans`, `--font-numeric`, `--font-logo`, `.google-sans`, `.font-numeric`, `.font-plate` | Primary brand display & numeric typography. Used for headings, page titles, card headers, stat numbers, dialog headers, and all standardized numerical figures (phone numbers, odometers, PINs, monetary figures, metrics) with OpenType tabular figures (`tabular-nums`), as well as vehicle registration plate numbers (`font-plate`). |
| **Plus Jakarta Sans** | Fallback in `--font-sans` | Secondary high-legibility sans-serif. Used for body text, button labels, dropdown options, and metadata labels. |
| **JetBrains Mono** | `--font-mono` | Monospace typography. Reserved for system identifiers, database project IDs, and raw message template editing areas. |

### 2.2 Icon Systems
The codebase employs two distinct icon libraries plus custom SVG assets:

1. **Google Material Symbols Outlined** (Variable Icon Font):
   - Loaded via Google Fonts variable font stylesheet.
   - Syntax: `<span className="material-symbols-outlined select-none text-[20px] ...">icon_name</span>`
   - Primary usage: Core navigation and branding icons (`Navigation.tsx`).
   - Standard navigation glyphs used:
     - `grid_view`: Dashboard tab
     - `directions_car`: Vehicle registry tab
     - `inventory_2`: Inventory tab
     - `build`: Services history tab
     - `search`, `tune`, `dark_mode`, `light_mode`, `settings`, `logout`: Header and action buttons.

2. **Lucide React (`lucide-react` v0.546.0)**:
   - Imported as React components: `import { IconName } from 'lucide-react';`
   - Primary usage: Modals, forms, list items, action menus, and dialog controls.
   - Frequently used icons: `Search`, `Plus`, `Check`, `X`, `ChevronRight`, `ChevronDown`, `Phone`, `MessageSquare`, `Calendar`, `Wrench`, `Car`, `SlidersHorizontal`, `ArrowLeft`, `Clock`, `Sparkles`, `Trash2`, `Edit3`, `AlertTriangle`, `Gauge`.

3. **Custom SVGs & Brand Graphics**:
   - **OLA Electric Brand Watermark**: Inline SVG embedded inside `ServiceRecordCard` and `VehicleCard` when `vehicle.make === 'OLA'`.
   - **WavyProgress (`src/components/WavyProgress.tsx`)**: Custom animated SVG sinusoidal wave indicator displaying active progress during the 3-step vehicle intake wizard.
   - **LaluZ Garage Brand Icon**: Vector assets located at `/LALUZ GARAGE ICON.svg`, `/app_icon.svg`, and `/public/icon.png`.

### 2.3 Third-Party Libraries & Dependencies

| Library / Package | Version | Purpose & Architectural Usage |
| :--- | :--- | :--- |
| **`react` & `react-dom`** | `^19.0.0` | Core UI engine (functional components, hooks, concurrent rendering). |
| **`react-router-dom`** | `^7.14.1` | Client-side routing (`BrowserRouter`, `Routes`, `Route`, `useLocation`, `useNavigate`). URL query parameters (`qm`) synchronize active search queries with mobile search headers. |
| **`motion`** | `^12.23.24` | Animation engine (`motion/react`, `AnimatePresence`). Drives M3 page transitions, sliding drawers (`VehicleLedgerDrawer.tsx`), layout indicators (`layoutId="mobileActivePill"` and `layoutId="desktopActiveTabBackdrop"`), and modal spring physics. |
| **`@material/web`** | `^2.4.1` | Google Material 3 Web Components. Imports `@material/web/progress/circular-progress.js` to render `<md-circular-progress indeterminate>` loaders in `AuthContext.tsx` and `IntakeStepProgress.tsx`. |
| **`recharts`** | `^3.8.1` | Data visualization. Renders embedded SVG sparkline area charts in `StatTile.tsx` (14-day trends) and advisor revenue bar charts in `SettingsModal.tsx`. |
| **`@radix-ui/react-select`** | `^2.2.6` | Accessible headless select primitive wrapped in `src/components/ui/CustomSelect.tsx`. |
| **`date-fns`** | `^4.1.0` | Comprehensive date calculations, overdue delta computation (`differenceInDays`), ISO parsing (`parseISO`), and formatting (`format(d, 'dd MMM yyyy')`). Powers the custom `MaterialCalendar.tsx` date picker. |
| **`clsx` (`^2.1.1`) & `tailwind-merge` (`^3.5.0`)** | Shared in `src/lib/utils.ts` | Combined into `cn(...inputs)` helper for conflict-free Tailwind utility class merging. |
| **`firebase`** | `^12.12.0` | Firebase Client SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`). Handles real-time document listeners (`onSnapshot`), transactions, and structured security error reporting (`FirestoreErrorInfo`). |
| **`@tailwindcss/vite` & `tailwindcss`** | `^4.1.14` | Tailwind CSS v4 compiler. Configured via CSS custom properties `@theme`, utility declarations (`@utility`), and `@import "tailwindcss";` in `src/index.css`. |

### 2.4 Mobile Runtime Libraries (Capacitor)
- **`@capacitor/core` & `@capacitor/android`** (`^6.0.0`): Native container bridge.
- **`@capacitor/app`** (`^6.0.0`): Intercepts hardware back button presses in `BackButtonHandler.tsx`.
- **`@capacitor/status-bar`** (`^6.0.0`): Dynamic status bar coloring and style toggling (`Style.Dark` / `Style.Light`).
- **`@hugotomazi/capacitor-navigation-bar`** (`^4.0.1`): Controls Android system navigation bar color and icon contrast dynamically matching dark/light themes.
- **`@capacitor/splash-screen`** (`^6.0.4`): Hides native Android splash screen once the React app boots.

### 2.5 External Services & Protocols
- **WhatsApp Web & Mobile Protocol**: Direct integration via `https://wa.me/{phone}?text={encodedText}` for instant client messaging on vehicle intake and delivery.
- **Android Contacts Intent**: Native Android intent `android.intent.action.INSERT` with MIME type `vnd.android.cursor.dir/contact` to launch the device's native contacts application pre-filled with customer details.
- **vCard 3.0 Standard**: RFC 2426 vCard generator in `src/services/contactService.ts` used via `navigator.share` or `.vcf` file download for iOS and desktop browsers.

---

## 3. Database Schema & Collections (Firestore)

The Firestore database ID is `ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e`.

### 3.1 `/customers/{customerId}`
- `name` (string): Full customer name (validated `size() > 0`).
- `phone` (string): Primary contact phone number (e.g., `+91 9876543210`).
- `technicianId` (string): UID of the advisor/technician who created the record.
- `createdAt` (Timestamp): Record creation timestamp (immutable on update).
- `updatedAt` (Timestamp): Last update timestamp.

### 3.2 `/vehicles/{vehicleId}`
- `customerId` (string): Reference to the Customer document ID.
- `make` (string): Manufacturer (e.g., `Ola`, `Honda`, `Hyundai`, `Yamaha`).
- `model` (string): Model name (e.g., `S1 Pro`, `Activa 6G`, `i20`).
- `color` (string): Exterior color of the vehicle.
- `plateNumber` (string): Registration plate number (uppercased).
- `passwordOrPin` (string): Screen unlock passcode, PIN, or literal `"Key"` for physical keys.
- `technicianId` (string): UID of the advisor who registered the vehicle.
- `createdAt` (Timestamp): Creation timestamp (immutable on update).
- `updatedAt` (Timestamp): Last update timestamp.

### 3.3 `/parts/{partId}`
- `name` (string): Name of the spare part or supply.
- `sku` (string, optional): Stock Keeping Unit or barcode.
- `category` (string): Category (e.g., `Brakes`, `Engine`, `Electrical`, `Body`).
- `stockQuantity` (number/int): Current units in stock (validated `>= 0`).
- `price` (number): Unit selling price in INR (`₹`).
- `minStockLevel` (number): Threshold for low stock warnings.
- `location` (string): Warehouse or shelf location.
- `createdAt` (Timestamp): Creation timestamp.
- `updatedAt` (Timestamp): Last update timestamp.

### 3.4 `/serviceRecords/{recordId}`
- `vehicleId` (string): Reference to `/vehicles/{vehicleId}`.
- `customerId` (string): Reference to `/customers/{customerId}`.
- `technicianId` (string): UID of the assigned technician/advisor.
- `technicianName` (string, optional): Display name of the advisor handling the intake.
- `date` (string, ISO format `yyyy-MM-dd`): Intake date.
- `expectedDeliveryDate` (string, optional, ISO format): Promised delivery date for overdue calculation.
- `mileage` (number): Odometer mileage recorded at intake.
- `completionMileage` (number, optional): Odometer mileage recorded at final job completion.
- `isDeadVehicle` (boolean, optional): Flag indicating vehicle arrived non-functional / dead battery.
- `isUnknownMileage` (boolean, optional): Flag if odometer reading cannot be retrieved.
- `personalItems` (string, optional): Client possessions left inside vehicle (e.g., helmet, documents).
- `description` (string): Work required. Supports markdown checkbox task syntax `[ ] Task item` / `[x] Completed item`.
- `remarks` (string, optional): Internal advisor / technician notes.
- `finalRemarks` (string, optional): Handover remarks and advice upon completion.
- `status` (`'pending' | 'in-progress' | 'completed' | 'cancelled'`): Current status.
- `laborCost` (number): Workmanship charges.
- `partsCost` (number): Automatically computed sum of all allocated parts.
- `totalCost` (number): Grand total (`laborCost + partsCost`).
- `partsUsed` (array of objects):
  - `partId` (string): ID of part from `/parts`.
  - `name` (string): Part name snapshot.
  - `quantity` (number): Units allocated.
  - `unitPrice` (number): Price snapshot per unit.
- `createdAt` (Timestamp): Creation timestamp (immutable on update).
- `updatedAt` (Timestamp): Last update timestamp.

### 3.5 `/users/{userId}`
- `id` (string): Auth UID.
- `name` (string): Advisor / technician display name.
- `email` (string): Email address.
- `status` (`'online' | 'offline'`): Real-time availability indicator.
- `pin` (string, optional): 4-digit PIN for advisor verification during vehicle intake.
- `tags` (string[]): Advisor skill or department tags (e.g., `["tech", "electrical", "service"]`).
- `createdAt` (Timestamp): Profile creation timestamp.
- `updatedAt` (Timestamp): Profile update timestamp.

### 3.6 `/settings/{settingId}`
- Document `settings/whatsapp`:
  - `intakeTemplate` (string): Customizable WhatsApp message for vehicle intake.
  - `deliveryTemplate` (string): Customizable WhatsApp message for service delivery.
  - `updatedAt` (Timestamp): Timestamp of last template modification.

---

## 4. Core Business Logic & Pipelines

```
                                  WORKSHOP OPERATIONAL PIPELINE
                                  
  ┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
  │ 1. User Sign-In │ ──> │ 2. Advisor PIN Check │ ──> │ 3. Vehicle Intake    │
  └─────────────────┘     └──────────────────────┘     │    (3-Step Wizard)   │
                                                       └──────────┬───────────┘
                                                                  │
                                                                  ▼
  ┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
  │ 6. Delivery     │ <── │ 5. Complete Service  │ <── │ 4. Service Tracking  │
  │    & WhatsApp   │     │    & Final Billing   │     │    & Parts Deduct    │
  └─────────────────┘     └──────────────────────┘     └──────────────────────┘
```

### 4.1 Authentication & Profile Sync Pipeline (`AuthContext.tsx`)
1. User authenticates via Google OAuth popup or Email/Password.
2. `onAuthStateChanged` listens for the user session.
3. If no profile exists at `/users/{uid}`, it checks if an existing profile with matching email exists (e.g., created manually in Settings) and automatically migrates the document to the authenticated `uid`.
4. A real-time Firestore `onSnapshot` listener subscribes to the active user profile.
5. On logout, the snapshot listener is explicitly unsubscribed before calling `signOut()` to prevent permission-denied console errors. The user's status is toggled to `'offline'`.

### 4.2 Multi-Step Vehicle Intake Pipeline (`ServiceIntake.tsx`, `useServiceIntake.ts`)
1. **Advisor Verification**: Advisor must enter their 4-digit PIN. Validated against `/users` collection PINs (or fallback default `1234`).
2. **Step 1: Customer Discovery**:
   - Live fuzzy search across both vehicles (plate number, make, model, color, PIN) and customers (name, phone).
   - Selecting a matched vehicle/customer fast-tracks to Step 3.
   - If customer is new, an inline creation form captures name and phone (auto-formatted with `+91`).
3. **Step 2: Vehicle Selection / Registration**:
   - If customer exists, lists their registered vehicles.
   - Or allows adding a new vehicle (make, model, color, plate number, physical key toggle or screen PIN/password).
4. **Step 3: Job Specification**:
   - Odometer mileage input with quick toggles for "Dead Vehicle" and "Unknown Mileage".
   - Job description with markdown checklist support (`[ ] item`).
   - Personal items inventory left in vehicle.
   - Expected delivery date calendar selection.
5. **Atomic Submission**:
   - Creates Customer if new (`/customers`).
   - Creates Vehicle if new (`/vehicles`).
   - Creates Service Record (`/serviceRecords`) with status `'pending'`, initial costs, and timestamp.
6. **Intake Success & WhatsApp Notification**:
   - Displays modal with summary and a direct CTA to open WhatsApp with prefilled message formatted from `intakeTemplate`.

### 4.3 Service Management & Billing Pipeline (`ServiceHistory.tsx`)
1. **Status Progression**: Transitions jobs across `pending` -> `in-progress` -> `completed` / `cancelled`.
2. **Interactive Task Checklist**: Checkbox tasks inside `description` can be checked off in real time from the Edit Record modal.
3. **Parts Allocation & Stock Deduction**:
   - Technicians allocate parts from the `/parts` inventory into `record.partsUsed`.
   - Modifying parts updates the job's `partsCost` and `totalCost = laborCost + partsCost`.
4. **Completion Flow**:
   - When marking as `completed`, prompts for `completionMileage` (validated against initial mileage) and optional `finalRemarks`.
5. **Customer Contact Export (`contactService.ts`)**:
   - **Android**: Fires native Android Intent `android.intent.action.INSERT` with MIME type `vnd.android.cursor.dir/contact` to launch the device's system Contacts app with name, phone, and vehicle notes pre-filled.
   - **iOS / Web**: Uses `navigator.share` with an RFC 2426 vCard 3.0 file or triggers a `.vcf` file download.
6. **Delivery WhatsApp Notification**:
   - Formats `deliveryTemplate` with replaced variables (parts list, labor charges, total amount, vehicle plate) and opens `wa.me` URL.

### 4.4 Inventory Management Pipeline (`Inventory.tsx`, `useInventory.ts`)
- Real-time stock status monitoring.
- Part creation, pricing, reorder thresholds (`minStockLevel`), and category tagging.
- Automated low-stock indicators across parts lists.

### 4.5 WhatsApp Preset Template Pipeline (`whatsappPresetService.ts`)
- Supports dynamic placeholders:
  - `{customer_name}`: Formatted and capitalized customer name.
  - `{vehicle_make}`, `{vehicle_model}`, `{vehicle_plate}`, `{vehicle_title}`: Vehicle identifiers.
  - `{job_description}`: Cleaned task description without raw checkbox brackets.
  - `{parts_list}`: Bulleted list of parts replaced with quantities.
  - `{labor_cost}`, `{total_cost}`: Formatted currency strings (`₹`).
- Saved in Firestore at `/settings/whatsapp` with fallback to `localStorage`.

---

## 5. Comprehensive UI Guide from A to Z

This section details the UI architecture, styling conventions, and component tree to enable seamless modification of any screen.

### 5.1 Color Tokens & Theming (`src/index.css`)
Tailwind CSS v4 is configured with CSS custom properties mapped to semantic tokens:

| Token Name | Dark Mode (Default) | Light Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `--bg` / `--color-workshop-bg` | `#0B0D11` | `#FFFFFF` | Main canvas background |
| `--card-bg` / `--color-workshop-card` | `#181B24` | `#FFFFFF` | Elevated cards and sheets |
| `--surface-bg` / `--color-workshop-surface` | `#0B0D11` | `#F8FAFC` | Sidebar, navigation, list hover backgrounds |
| `--border-color` / `--color-workshop-border` | `#1E232E` | `#E2E8F0` | Structural dividers and borders |
| `--fg` / `--color-workshop-text` | `#F8FAFC` | `#0F172A` | Primary typography |
| `--muted-fg` / `--color-workshop-muted` | `#94A3B8` | `#64748B` | Secondary labels, captions, metadata |
| `--color-workshop-accent` | `#10B981` (Emerald) | `#10B981` | Primary CTA, active navigation, success |
| `--color-secondary` | `#3B82F6` (Blue) | `#3B82F6` | Vehicle registry accent, key badges |
| `--color-status-urgent` | `#F43F5E` (Rose) | `#F43F5E` | Pending jobs, delete buttons, alerts |
| `--color-status-pending` | `#FBBF24` (Amber) | `#FBBF24` | In-progress jobs, warnings, due today |
| `--color-status-success` | `#10B981` (Emerald) | `#10B981` | Completed jobs, completed checklist items |

- **Theme Switching**: Handled via `ThemeContext.tsx`. Toggles `data-theme="light"` on `document.documentElement` with a circular-reveal animation utilizing the native **View Transitions API** and updates native Capacitor system status bar styles dynamically.

### 5.2 Responsive Layout Structure (`App.tsx`, `Navigation.tsx`)
The app uses a dual layout structure:
- **Full-Screen Immersive Layout**: Used for `/settings` and `/intake`. Hides navigation sidebars/bars for a focused workflow.
- **Main App Layout**:
  - **Desktop (md+)**:
    - Sticky left sidebar (`Navigation.tsx`, width `w-64`, `bg-workshop-surface`).
    - Top branding header with dynamic Material Symbol icon that changes according to current page.
    - Context-aware desktop search bar (appears on `/vehicles`, `/inventory`, `/services`).
    - Navigation menu with motion spring indicator (`desktopActiveTabBackdrop`).
    - Active session footer with advisor avatar, name, and logout prompt.
  - **Mobile (<md)**:
    - **Top Bar**: Fixed header with `safe-top` padding, blur-on-scroll background, logo, search expand trigger, filter log toggle, theme toggle, and settings/logout icons.
    - **Expandable Sticky Search Bar**: Slides down from top bar when search icon is clicked; syncs search query with URL search param `qm`.
    - **Bottom Navigation Bar**: Fixed bottom bar with `safe-bottom` padding, pill indicators (`layoutId="mobileActivePill"`), and 4 main tabs:
      1. Dashboard (`/`) -> icon: `grid_view`
      2. Vehicle (`/vehicles`) -> icon: `directions_car`
      3. Inventory (`/inventory`) -> icon: `inventory_2`
      4. Services (`/services`) -> icon: `build`

### 5.3 Page-by-Page UI Component Catalog

#### A. Dashboard (`src/components/Dashboard.tsx`)
- **Header**: Large display typography with an accent-glowing "Vehicle Intake" button.
- **Watchlist Stat Tiles (`StatTile.tsx`)**:
  - 4 metrics: Total Services, Pending Works, Completed Jobs, Issues Attended.
  - Each tile features an icon, value, label, and an embedded SVG sparkline area chart (`recharts`) visualizing the 14-day activity trend.
  - Clicking any tile navigates directly to `/services` with matching status filter state.
- **Recent Activities Log**: List of the 5 most recent service records with vehicle make/model, plate number, customer name, status badge, and expected delivery date. Clicking opens the service record details directly.

#### B. Vehicle Intake Wizard (`src/components/ServiceIntake.tsx` & `src/components/intake/`)
- **Advisor PIN Verification (`AdvisorVerification.tsx`)**: Clean PIN pad modal with animated numbers, clear key, and auto-focus for fast entry.
- **Progress Header (`IntakeStepProgress.tsx`)**: Shows current step and advisor name, with animated `WavyProgress.tsx` sinusoidal wave progress bar.
- **Step 1 (`Step1CustomerDiscovery.tsx`)**: Unified search input with live result cards (shows customer name, phone, plate, make/model). "Create New Customer" button triggers inline form.
- **Step 2 (`Step2VehicleSelection.tsx`)**: Displays existing vehicles registered to customer, or opens "Register New Vehicle" form with plate number, color, make, model, and physical Key vs PIN passcode toggle.
- **Step 3 (`JobSpecification.tsx`)**:
  - Mileage input with "Dead Vehicle" and "Unknown Mileage" checkboxes.
  - Checklist textarea with live bullet formatting.
  - Personal items field.
  - Delivery date picker (`MaterialCalendar.tsx`).
- **Success Modal (`IntakeSuccessModal.tsx`)**: Confirmation card with animated checkmark and green WhatsApp button to dispatch the intake message.

#### C. Service History (`src/components/ServiceHistory.tsx`)
- **Header & Filter Controls**:
  - Filter dropdown / status tabs: All, Pending, In-Progress, Completed, Cancelled (with active badge counters).
  - Material Calendar modal for filtering by specific intake date.
  - Live search filtering by vehicle plate, make, model, color, or customer name.
- **Service Record Cards (`ServiceRecordCard`)**:
  - Gradient top-border indicator colored by job status.
  - Watermark background logo for OLA electric vehicles.
  - Date badge (`MMM dd`).
  - Vehicle plate, make/model, customer name, and odometer progression (`Start Mileage -> Completion Mileage`).
  - Screen PIN or KEY badge.
  - Markdown checklist summary with green bullets.
  - Personal items indicator.
  - Due date indicator with overdue badges (`"Due Today"`, `"X Days Overdue"`, `"X Days Left"`).
  - Advisor attribution badge.
  - Total job cost and quick action buttons: direct phone call (`tel:`), WhatsApp prompt, and record inspection.
- **Record Inspection & Edit Drawers**:
  - **Details Drawer**: Full-screen slide-over presenting all job metadata, parts used, cost breakdown, customer details, and contact export action.
  - **Edit Record Modal**: Allows editing mileage, expected delivery date, assigned advisor, internal remarks, interactive checklist items, and adding/removing spare parts from inventory.
  - **Mark Completed Modal**: Prompts for final odometer reading, final delivery remarks, and calculates grand total before triggering completion WhatsApp message.
  - **Delete Modal**: Safe confirmation dialog with two-step confirmation to prevent accidental loss.

#### D. Vehicle Registry (`src/components/VehicleHistory.tsx` & `src/components/vehicle/`)
- **Vehicle Cards (`VehicleCard.tsx`)**:
  - Shows make, model, plate number, color, owner name, owner phone, and screen PIN / Key indicator.
  - Quick action buttons: WhatsApp owner, edit vehicle details, delete vehicle.
  - Card click opens the **Vehicle Ledger Drawer**.
- **Vehicle Ledger Drawer (`VehicleLedgerDrawer.tsx`)**:
  - Full-screen drawer showing the vehicle's entire historical service ledger.
  - Displays lifetime spend on the vehicle, total jobs completed, and chronological service cards.
- **Add / Edit / Delete Vehicle Modals**: Dedicated forms for vehicle parameters.

#### E. Parts Inventory (`src/components/Inventory.tsx` & `src/components/inventory/`)
- **Inventory List (`InventoryList.tsx`)**:
  - Displays parts with name, SKU, category pill, shelf location, unit price, and stock levels.
  - Visual warning badge for parts at or below `minStockLevel`.
- **Part Form Modal (`PartFormModal.tsx`)**: Add and edit parts with real-time numeric validation for stock quantity and price.
- **Delete Part Modal (`DeletePartModal.tsx`)**: Confirmation modal.

#### F. Settings (`src/components/SettingsModal.tsx`)
- **Navigation Tabs**:
  - **Accounts**: Manage workshop users/advisors, set 4-digit PINs, toggle online/offline status, assign tags.
  - **WhatsApp Presets**: Custom template editor for Intake and Delivery messages with placeholder chip inserters (`{customer_name}`, `{vehicle_plate}`, etc.).
  - **Tags**: Manage custom technician specialty tags stored in `localStorage`.
  - **Performance**: Analytics dashboard powered by `recharts` showing jobs completed and total labor/parts revenue generated per advisor.
  - **System & General**: App version info, platform metadata, and session management.

#### G. System Modals & Utilities
- **WhatsApp Popup (`WhatsAppPopup.tsx`)**: Previews the recipient's phone number and rendered message text before opening `wa.me`.
- **System Bars Integration (`SystemBars.tsx`)**: Synchronizes native status bar and navigation bar colors with light/dark theme.
- **Back Button Handler (`BackButtonHandler.tsx`)**: Intercepts Android hardware back events to close active modals first; double-tap exits app with a toast message.
- **Portal (`Portal.tsx`)**: Teleports modals and drawers to `document.body` for proper stacking context above headers and navigation bars.

---

## 6. UI Modification Guidelines for Agents

When making UI adjustments or adding new views, follow these engineering standards:

1. **Avoid Hardcoded Colors**: Always use semantic classes (`bg-workshop-bg`, `bg-workshop-card`, `bg-workshop-surface`, `text-workshop-text`, `text-workshop-muted`, `border-workshop-border`, `text-workshop-accent`).
2. **Safe Areas**: Always include `pt-[calc(1rem+env(safe-area-inset-top,0px))]` or `safe-top` and `pb-safe` / `safe-bottom` on mobile overlays to prevent content clipping under the notch or navigation pill.
3. **Typography**: Pair headings with `font-google-sans` or `font-sans` with tight tracking (`tracking-tight` or `tracking-tighter`). Captions and labels should use uppercase with wide tracking (`text-[10px] font-bold uppercase tracking-widest`). Monospace elements (plates, PINs, odometers) must use `font-mono`.
4. **Modals & Drawers**:
   - Always wrap overlay modals in `<Portal>` to guarantee proper z-index layering above the fixed mobile navigation bars (`z-[100]` or `z-[200]`).
   - Register modals with `const unregister = useUI().registerModal()` to notify navigation bars and back-button handlers.
5. **Animation Standards**:
   - Use `motion/react` with Spring physics (`type: "spring", stiffness: 350, damping: 30`) for drawers sliding in from the right (`x: "100%" -> x: 0`).
   - Use M3 fade-slide transitions (`variants={m3Variants}`, duration `0.2s`) for route changes.
6. **Currency & Formatting**:
   - Always format currency using `formatCurrency(val)` from `src/lib/utils.ts` (renders Indian Rupee symbol `₹`).
   - Always format dates using `date-fns` (`format(date, 'dd MMM yyyy')`).

### 6.1 Seamless Dialog, Popup & Screen Design System

For pending approval screens, informational popups, status overlays, and upcoming modals, use the clean **Seamless Canvas Style**:

1. **Canvas Architecture (No Card Enclosures)**:
   - Avoid heavy enclosed card boxes (`bg-workshop-card rounded-2xl shadow-2xl border border-workshop-border`) or nested cards that box content into floating tiles.
   - Elements render cleanly directly on top of the canvas background (`bg-workshop-bg`), fully responsive with `safe-top` and `safe-bottom`.

2. **Left-Aligned Hierarchy**:
   - The hero icon, headings, and descriptions must be left-aligned (`items-start text-left w-full`).
   - **Title**: `font-logo font-bold text-2xl sm:text-3xl text-workshop-text tracking-tight`.
   - **Description**: `text-workshop-muted text-xs sm:text-sm leading-relaxed text-left`.

3. **Borderless Icons with Ambient Halo**:
   - Never enclose hero icons in border boxes or background pills (`no bg-*-10 border border-*-30 rounded-2xl`).
   - Render the icon freely (`w-12 h-12 stroke-[1.75]`) with an ambient backlight glow:
     ```tsx
     <div className="relative text-status-pending">
       <div className="absolute -inset-2 bg-status-pending/20 blur-2xl rounded-full pointer-events-none" />
       <ShieldAlert className="relative w-12 h-12 stroke-[1.75]" />
     </div>
     ```

4. **Screen-Wide Ambient Lighting**:
   - Add a soft 5% radial glow bloom behind the hero area:
     ```tsx
     <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
       <div className="w-[500px] h-[500px] bg-status-pending/5 rounded-full blur-3xl -translate-y-12" />
     </div>
     ```
   - Color reflects context: `bg-status-pending/5` (pending/warning), `bg-workshop-accent/5` (success/intake), `bg-status-urgent/5` (destructive), `bg-secondary/5` (info).

5. **Detail Rows (Divider-Based on Canvas)**:
   - Render metadata rows directly on the background using subtle horizontal dividers:
     ```tsx
     <div className="w-full divide-y divide-workshop-border/60 border-y border-workshop-border/60 text-left py-1">
       <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
         <span className="text-workshop-muted font-medium">Label</span>
         <span className="text-workshop-text font-semibold">Value</span>
       </div>
     </div>
     ```

6. **Action Buttons**:
   - Primary: `w-full bg-workshop-accent text-workshop-bg hover:bg-workshop-accent/90 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-[0.98]`.
   - Secondary / Ghost: `w-full bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border text-workshop-muted hover:text-workshop-text px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-[0.98]`.

---

## 7. Future Considerations & Roadmap

The following architectural rules and future additions must be respected during ongoing development:

- **Database Migration**: The application is slated to migrate from Firebase Firestore to a self-hosted relational database (PostgreSQL or MySQL) in the future. Keep data structures normalized and decouple database calls through service layers to facilitate a clean migration.
- **Security & RBAC (Role-Based Access Control)**:
  - Planned roles:
    - `admin`: Full access across all collections, pricing configuration, user management, and deletions.
    - `service manager`: Create and update job cards, customer records, and vehicle details; restricted from deleting records or altering historical base pricing.
    - `technician`: Update job status (`pending` -> `in-progress` -> `completed`), update completion mileage, checklist tasks, and allocate parts; restricted from customer contact manipulation and pricing.
  - Implementation will involve adding `role` to `/users`, client-side permission hooks, and Firestore security rule hardening.
- **Performance Optimization**:
  - The UI currently uses `backdrop-blur` in several navigation bars and overlays. On lower-end Android devices running native Capacitor builds, replace heavy `backdrop-blur-md` with solid or semi-opaque surfaces (`bg-workshop-bg/95`) to maintain a consistent 60fps frame rate.
- **GST Billing Integration**:
  - A Goods and Services Tax (GST) calculation engine is planned for service billing.
  - Service record schemas will be extended to track taxable components separately:
    - Labor subtotal and applicable service GST percentage (e.g., 18%).
    - Parts subtotal with individual part HSN codes and GST rates.
    - Automated split computation for CGST + SGST (intra-state) or IGST (inter-state).
  - UI additions will include invoice print preview, GST tax breakdown toggles, and formatted tax invoices.
