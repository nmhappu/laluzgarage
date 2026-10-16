# LaluZ Garage

LaluZ Garage is an app for running a vehicle repair workshop. It keeps track of customers, their vehicles, repair jobs, spare parts and bills, and it lets staff send WhatsApp messages to customers.

All data is stored in Google Firebase, so every phone, tablet and computer that uses the app sees the same information at the same time.

---

## Contents

1. [The apps in this repository](#1-the-apps-in-this-repository)
2. [Screenshots](#2-screenshots)
3. [Features](#3-features)
4. [How it works](#4-how-it-works)
5. [Data model](#5-data-model)
6. [Sources](#6-sources)
7. [File structure](#7-file-structure)
8. [Development environment](#8-development-environment)
9. [Deployment](#9-deployment)
10. [Security](#10-security)
11. [License](#11-license)

---

## 1. The apps in this repository

This repository holds three versions of the same app. They all read and write the same Firebase data.

| App | Folder | Built with | Runs on |
| :--- | :--- | :--- | :--- |
| **Web app** | `src/` | React, TypeScript, Vite, Tailwind CSS | Any web browser (desktop and mobile) |
| **Android app (web wrapper)** | `android/` | Capacitor | Android 7.0 (API 24) and newer. It shows the web app inside an Android app. |
| **Native Android app** | `compose-app/` | Kotlin, Jetpack Compose, Material 3 | Android 8.0 (API 26) and newer |

> **Note:** Both Android apps use the same package name, `dev.appu.laluzgarage`. A phone can only have one of them installed at a time.

---

## 2. Screenshots

These screenshots of the native Android app were taken while testing the app on a device. They are stored in [`compose-app/design-qa/`](compose-app/design-qa/).

| Sign in | Sign in with email | Dashboard | Services | Job card |
| :---: | :---: | :---: | :---: | :---: |
| <img src="compose-app/design-qa/01-login-light.png" width="160" alt="Sign in, light"> | <img src="compose-app/design-qa/02-login-mail-light.png" width="160" alt="Sign in with email, light"> | <img src="compose-app/design-qa/03-dashboard-light-1.png" width="160" alt="Dashboard, light"> | <img src="compose-app/design-qa/04-services-light-1.png" width="160" alt="Services, light"> | <img src="compose-app/design-qa/05-jobcard-light-1.png" width="160" alt="Job card, light"> |
| <img src="compose-app/design-qa/01-login-dark.png" width="160" alt="Sign in, dark"> | <img src="compose-app/design-qa/02-login-mail-dark.png" width="160" alt="Sign in with email, dark"> | <img src="compose-app/design-qa/03-dashboard-dark-1.png" width="160" alt="Dashboard, dark"> | <img src="compose-app/design-qa/04-services-dark-1.png" width="160" alt="Services, dark"> | <img src="compose-app/design-qa/05-jobcard-dark-1.png" width="160" alt="Job card, dark"> |

---

## 3. Features

| Feature | What it does |
| :--- | :--- |
| **Sign in** | Sign in with a Google account or with an email and password. |
| **Dashboard** | Shows how many jobs there are, how many are open, how many are done, and which jobs need attention. |
| **Vehicle intake** | A short 3-step form to check in a vehicle: pick the customer, pick the vehicle, describe the job. |
| **Services (job cards)** | A list of all repair jobs. Each job has a status, a task checklist, parts used, labour charge and a total bill. |
| **Vehicles** | A list of all vehicles, with the service history and total spend for each one. |
| **Inventory** | A list of spare parts with price, stock count, category and shelf location. Parts with low stock are marked. |
| **WhatsApp messages** | Opens WhatsApp with a ready-made message for the customer when a vehicle is checked in or handed back. |
| **Analytics** (web app) | Charts for revenue, job flow, turnaround time, technicians, customers, fleet, inventory and workload. |
| **Settings** | Staff accounts, roles and PINs, WhatsApp message templates, tags, date-wise history, system info and app updates. |
| **Light and dark theme** | Both themes are available in every app. |
| **App updates** (Android) | The Android apps can download and install new versions from GitHub Releases. |

---

## 4. How it works

### 4.1 The big picture

The apps have **no server of their own**. Each app talks straight to Google Firebase:

```text
 Web browser ─┐
 Android app ─┼──►  Firebase Authentication  (who are you?)
 Native app  ─┘     Cloud Firestore          (all workshop data)
                    firestore.rules          (who may read or change what)
```

- **Firebase Authentication** checks who the user is.
- **Cloud Firestore** is the database. The apps listen to it live, so a change made on one device shows up on the others.
- **`firestore.rules`** decides what each user is allowed to do. Because there is no server, these rules are the only thing that protects the data.

### 4.2 Users and roles

Each user has a profile in the `users` collection. A user's **role** decides what they can do. The rules read the `role` field first. If it is missing, they fall back to the older `tags` list (`admin`, `tech` / `technician`, `assistant`).

| Role | Can read data | Can create customers, vehicles and jobs | Can edit customers, vehicles, jobs and parts | Can delete | Can change settings and staff |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `admin` | Yes | Yes | Yes | Yes | Yes |
| `technician` | Yes | Yes | Yes | No | No |
| `assistant` | Yes | Yes | No | No | No |
| No role yet | No | No | No | No | No |

**What happens when someone signs in:**

1. The app looks for the user's profile. If a manager already added a profile with the same email, that profile is moved to the new account.
2. If there is no profile, a new one is made with no role.
3. A user with no role sees a **"Pending approval"** screen until an admin gives them a role.
4. **First admin:** if no admin exists yet, the first person to sign in becomes the admin. The app then writes `settings/admin_lock` so this cannot happen again.

### 4.3 Vehicle intake

1. **Advisor PIN.** The service advisor types a 4-digit PIN. The app matches it against the `pin` saved on staff profiles. If the signed-in user has no PIN set, the default PIN `1234` is accepted.
2. **Step 1: Customer.** Search for an existing customer, or add a new one.
3. **Step 2: Vehicle.** Pick one of the customer's vehicles, or add a new one (make, model, colour, number plate, key or PIN).
4. **Step 3: Job.** Enter the odometer reading (or mark it unknown or a dead vehicle), the tasks, the customer's belongings left in the vehicle, remarks and the expected delivery date.
5. The job is saved with status `pending` and a bill of `0`. The app then offers to send the intake WhatsApp message.

The web app keeps an unfinished intake form in the browser's session storage, so it is not lost if the page is reloaded. It is cleared when the tab is closed or the job is saved.

### 4.4 Jobs, bills and stock

A job moves through these statuses: `pending` → `in-progress` → `completed` (or `cancelled`).

**The bill:**

```text
Parts cost = sum of (unit price × quantity) for every part used
Total cost = Labour charge + Parts cost
```

**Stock:** when a job is saved, the app updates the job and the part stock counts together in one Firestore transaction:

- It first gives back the parts the job used before.
- It then takes away the parts the job uses now.
- If there are not enough parts in stock, the save stops with an "Insufficient stock" message.
- When a job is deleted, its parts are put back into stock.

**Overdue:** a job is overdue when it is still `pending` or `in-progress` and its expected delivery date has passed. Job cards show "Due Today", "N Days Left" or "N Days Overdue".

**Low stock:** a part is marked low when its stock count is at or below its `minStockLevel` (default `5`).

Money is shown in Indian Rupees (₹). Phone numbers default to the `+91` country code.

### 4.5 WhatsApp messages

The app builds a `https://wa.me/<phone>?text=<message>` link, which opens WhatsApp with the message already typed. There are two templates: one for **intake** and one for **delivery**. Admins can edit them under **Settings → WhatsApp**. They are stored in Firestore at `settings/whatsapp`.

| Placeholder | Replaced with |
| :--- | :--- |
| `{customer_name}` | Customer name |
| `{vehicle_make}` | Vehicle make |
| `{vehicle_model}` | Vehicle model |
| `{vehicle_title}` | Make and model together |
| `{vehicle_plate}` | Number plate |
| `{job_description}` | Job tasks |
| `{parts_list}` | Parts used, with quantities (delivery only) |
| `{labor_cost}` | Labour charge (delivery only) |
| `{total_cost}` | Total bill (delivery only) |

### 4.6 App updates (Android)

1. The app reads the release list from `https://api.github.com/repos/nmhappu/laluzgarage/releases`.
2. It picks the newest release for the chosen channel:
   - **stable**: releases that are not pre-releases and whose tag has no `-dev`, `-alpha`, `-beta`, `-canary` or `-rc`.
   - **dev**: any release that is not a draft.
3. It compares version numbers (semantic versioning). If the release is newer and has an `.apk` file, the app offers to download and install it.
4. Installing needs the Android permission to install unknown apps (`REQUEST_INSTALL_PACKAGES`).

In the Capacitor app this is done by the native plugin `android/app/src/main/java/dev/appu/laluzgarage/OtaUpdaterPlugin.kt`. In the native app it is done by `compose-app/.../data/update/AppUpdater.kt`.

### 4.7 Configuration at runtime (web app)

The web app reads each setting (for example `VITE_FIREBASE_API_KEY`) in this order, using the first value it finds (see `src/lib/env.ts`):

1. `window.__ENV__["VITE_FIREBASE_API_KEY"]`, which the Docker container writes when it starts.
2. `window.__ENV__["FIREBASE_API_KEY"]`, the same name without `VITE_`.
3. `import.meta.env.VITE_FIREBASE_API_KEY`, which Vite takes from the `.env` file at build time.
4. A default value.

This means one Docker image can be pointed at any Firebase project without rebuilding it.

### 4.8 Working offline (native Android app)

The native app keeps a copy of the data on the device (Firestore persistent cache). It can open and show data with no network, and changes made offline are sent when the device is back online. A small indicator in the top bar shows the sync status.

---

## 5. Data model

All data lives in Cloud Firestore. The field names below come from `src/types.ts`. The rules in `firestore.rules` check the required fields and their limits.

| Collection | Main fields | Checks in `firestore.rules` |
| :--- | :--- | :--- |
| `customers/{id}` | `name`, `phone`, `technicianId`, `createdAt`, `updatedAt` | `name` 1–100 characters, `phone` 1–30 characters |
| `vehicles/{id}` | `customerId`, `make`, `model`, `color`, `plateNumber`, `passwordOrPin`, `technicianId`, `createdAt`, `updatedAt` | `make` 1–50 characters, `plateNumber` 1–30 characters |
| `parts/{id}` | `name`, `category`, `stockQuantity`, `price`, `minStockLevel`, `location`, `createdAt`, `updatedAt` | `stockQuantity` is a whole number ≥ 0, `price` ≥ 0 |
| `serviceRecords/{id}` | `vehicleId`, `customerId`, `technicianId`, `technicianName`, `date`, `expectedDeliveryDate`, `mileage`, `completionMileage`, `isDeadVehicle`, `isUnknownMileage`, `personalItems`, `description`, `remarks`, `finalRemarks`, `status`, `laborCost`, `partsCost`, `totalCost`, `partsUsed[]`, `createdAt`, `updatedAt` | `status` is one of the four statuses, costs ≥ 0, remarks ≤ 2000 characters |
| `users/{uid}` | `name`, `email`, `photoURL`, `status` (`online` / `offline`), `role`, `pin`, `tags[]`, `createdAt`, `updatedAt` | `role` is `admin`, `technician` or `assistant`; users cannot change their own role or tags |
| `settings/whatsapp` | `intakeTemplate`, `deliveryTemplate`, `updatedAt` | Only admins can write |
| `settings/admin_lock` | `adminUid`, `adminEmail`, `bootstrappedAt` | Can be written once, when no admin exists |

Each item in `partsUsed[]` has `partId`, `name`, `quantity` and `unitPrice`. Anything not listed in the rules is blocked by a "deny all" default.

---

## 6. Sources

### 6.1 Web app and Capacitor Android app (`package.json`)

| Purpose | Library | Version |
| :--- | :--- | :--- |
| User interface | [React](https://react.dev/) and React DOM | `^19.3.1` |
| Page routing | [React Router](https://reactrouter.com/) | `^7.18.4` |
| Language | [TypeScript](https://www.typescriptlang.org/) | `~5.8.2` |
| Build tool and dev server | [Vite](https://vitejs.dev/) | `^8.3.4` |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | `^4.3.3` |
| Animation | [Motion](https://motion.dev/) | `^13.5.1` |
| Charts | [Apache ECharts](https://echarts.apache.org/) | `^6.1.0` |
| Database and sign-in | [Firebase JS SDK](https://firebase.google.com/docs/web/setup) | `^12.19.0` |
| Android wrapper | [Capacitor](https://capacitorjs.com/) (`core`, `android`, `cli`) | `^8.5.3` |
| Native Google sign-in | [@capacitor-firebase/authentication](https://github.com/capawesome-team/capacitor-firebase) | `^8.5.2` |
| Android system bars, back button, splash | `@capacitor/status-bar`, `@capacitor/app`, `@capacitor/splash-screen` | `^8.0.4`, `^8.1.2`, `^8.0.2` |
| UI parts | [Radix UI](https://www.radix-ui.com/), [Material Web](https://github.com/material-components/material-web) | `^1.8.1`, `^2.5.0` |
| Icons | [Lucide](https://lucide.dev/), [Material Symbols](https://fonts.google.com/icons) | `^1.57.0`, Google Fonts |
| Animated numbers | [NumberFlow](https://number-flow.barvian.me/) | `^0.6.2` |
| Dates | [date-fns](https://date-fns.org/) | `^4.4.0` |
| Tests | [Vitest](https://vitest.dev/), [@firebase/rules-unit-testing](https://firebase.google.com/docs/rules/unit-tests) | `^5.0.4`, `^5.0.2` |
| Code checks | [ESLint](https://eslint.org/), typescript-eslint, Firebase security-rules plugin | `^10.12.0` |

Fonts (loaded from Google Fonts): Google Sans, Google Sans Text, Plus Jakarta Sans, JetBrains Mono.

### 6.2 Native Android app (`compose-app/gradle/libs.versions.toml`)

| Purpose | Library | Version |
| :--- | :--- | :--- |
| Language | Kotlin | `2.4.21` |
| Build | Android Gradle Plugin | `9.4.1` |
| User interface | Jetpack Compose BOM | `2026.09.00` |
| Design components | Material 3 (Expressive) | `1.5.0-beta01` |
| Screen navigation | Navigation Compose | `2.10.2` |
| Dependency injection | Hilt | `2.60.1` |
| Database and sign-in | Firebase BOM (Auth, Firestore) | `35.0.1` |
| Google sign-in | Credential Manager, Google ID | `1.5.0`, `1.1.1` |
| Images | Coil | `2.7.0` |
| Background work | Kotlin Coroutines | `1.11.0` |
| Faster start-up | Baseline Profiles, ProfileInstaller | `1.5.0`, `1.4.1` |

Fonts (bundled in `res/font/`): Google Sans Flex, Plus Jakarta Sans, JetBrains Mono (licence in `assets/licenses/JetBrainsMono-OFL.txt`).

### 6.3 Outside services

| Service | Used for |
| :--- | :--- |
| Firebase Authentication | Google and email/password sign-in |
| Cloud Firestore | All app data |
| GitHub Releases API | Checking for and downloading Android updates |
| WhatsApp (`wa.me` links) | Opening pre-filled customer messages |
| GitHub Container Registry | Hosting the Docker image `ghcr.io/nmhappu/laluzgarage` |

### 6.4 Other documents in this repository

| File | About |
| :--- | :--- |
| [`compose-app/DESIGN_SYSTEM.md`](compose-app/DESIGN_SYSTEM.md) | Colours, type, shapes and spacing of the native app |
| [`compose-app/MIGRATION_PLAN.md`](compose-app/MIGRATION_PLAN.md) | Plan for moving from the web wrapper to the native app |
| [`compose-app/SECURITY_REVIEW.md`](compose-app/SECURITY_REVIEW.md) | Security review of the native app and the Firestore rules |
| [`security_spec.md`](security_spec.md) | Data rules and the attack cases the Firestore rules must block |

---

## 7. File structure

```text
laluzgarage/
├── src/                          Web app (React)
│   ├── main.tsx                  Starts the app
│   ├── App.tsx                   Pages, layout, start-up update check
│   ├── index.css                 Theme colours, fonts, Tailwind setup
│   ├── types.ts                  Data types (Customer, Vehicle, Part, ServiceRecord, WorkshopUser)
│   ├── components/
│   │   ├── analytics/            Analytics page and chart cards
│   │   ├── auth/                 Sign-in, pending approval, loading screen
│   │   ├── dashboard/            Dashboard cards and recent activity
│   │   ├── intake/               PIN screen and the 3 intake steps
│   │   ├── inventory/            Parts list and part forms
│   │   ├── nav/                  Desktop side bar, mobile top and bottom bars
│   │   ├── services/             Job cards, edit sheet, delivery bill
│   │   ├── settings/             All settings pages
│   │   ├── shared/               Shared pieces (search bar, status badge, WhatsApp popup)
│   │   ├── ui/                   Small building blocks (buttons, selects, calendar, logo)
│   │   └── vehicle/              Vehicle cards, forms, history drawer
│   ├── contexts/                 Sign-in state, theme, UI state
│   ├── hooks/                    Data loading and page logic
│   ├── lib/                      Firebase setup, env reader, helpers, analytics maths
│   ├── services/                 WhatsApp templates, contacts, inventory, app updates
│   └── styles/colours.xml        Colour list copied into index.css at build time
├── public/                       Static files (env-config.js stub, logo)
├── index.html                    Web page shell
├── android/                      Capacitor Android project (wraps the web app)
├── compose-app/                  Native Android app
│   ├── app/src/main/java/dev/appu/laluzgarage/
│   │   ├── data/                 Models, repositories, sync, updater
│   │   ├── di/                   Hilt setup (Firebase, offline cache)
│   │   └── ui/                   Screens: auth, dashboard, intake, inventory,
│   │                             services, vehicles, settings, theme
│   ├── baselineprofile/          Start-up speed profile generator
│   ├── design-qa/                Screenshots from device testing
│   └── gradle/libs.versions.toml Library versions
├── docker/                       Container start-up script and Nginx template
├── .github/workflows/            CI: Docker image and Android release
├── firestore.rules               Database security rules
├── firestore.rules.test.ts       Tests for the security rules
├── capacitor.config.ts           Capacitor settings
├── vite.config.ts                Vite settings
├── Dockerfile                    Builds the web app and serves it with Nginx
├── compose.example.yml           Example Docker Compose file
├── deploy.ps1                    Windows script: install, build, sync Android
├── .env.example                  Example settings file
└── package.json                  Web app scripts and libraries
```

---

## 8. Development environment

### 8.1 What you need

| Tool | Version | Needed for |
| :--- | :--- | :--- |
| Node.js | 20 or newer (the Dockerfile uses 20, CI uses 22) | Web app, Capacitor app |
| npm | Comes with Node.js | Web app, Capacitor app |
| JDK | 21 | Both Android apps |
| Android Studio and Android SDK | SDK 37 (compile) | Both Android apps |
| Gradle | 9.8.1 (downloaded by the `gradlew` wrapper) | Both Android apps |
| Docker | Any recent version | Only for running the container |
| Firebase project | — | All apps |

The Gradle daemon is set to use JDK 21 in `android/` and JDK 25 in `compose-app/` (see `gradle/gradle-daemon-jvm.properties`). Gradle can download these for you.

### 8.2 Set up Firebase

1. Create a Firebase project.
2. Turn on **Authentication** with the **Google** and **Email/Password** providers.
3. Create a **Cloud Firestore** database. The apps use the database ID `ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e` (set in `compose.example.yml` and in `compose-app/.../di/AppModule.kt`). The web app uses `(default)` unless you set `VITE_FIREBASE_FIRESTORE_DATABASE_ID`.
4. Publish the rules from `firestore.rules` to that database.
5. Add a **Web app** in Firebase to get the web settings, and an **Android app** with package name `dev.appu.laluzgarage` to get `google-services.json`.

### 8.3 Web app

```bash
git clone https://github.com/nmhappu/laluzgarage.git
cd laluzgarage
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase web settings:

| Setting | What it is | Required |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Web API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | For example `your-project.firebaseapp.com` | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | For example `your-project.firebasestorage.app` | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Web app ID | Yes |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Firestore database ID | No (default `(default)`) |
| `DISABLE_HMR` | Set to `true` to turn off live reload in dev | No |
| `PORT` | Container port | No (default `2266`) |
| `SERVER_NAME` | Nginx server name in the container | No (default `localhost`) |

Start the dev server:

```bash
npm run dev
```

The app opens at `http://localhost:3000`.

**Scripts:**

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Starts the dev server on port 3000 |
| `npm run build` | Builds the app into `dist/` |
| `npm run preview` | Serves the built app to check it |
| `npm run test` | Runs the unit tests in `src/lib/` (Vitest) |
| `npm run lint` | Runs ESLint and the TypeScript type check |
| `npm run docker:build` | Builds the Docker image `laluzgarage` |
| `npm run docker:run` | Runs that image on port 2266 using `.env` |
| `npm run mobile:build` | Builds the web app and copies it into `android/` |
| `npm run mobile:sync` | Builds the web app and syncs Capacitor plugins into `android/` |
| `npm run mobile:open` | Opens `android/` in Android Studio |

**Colours:** when Vite builds, a small plugin in `vite.config.ts` copies the colours from `src/styles/colours.xml` into `src/index.css`. Change colours in the XML file, not in the CSS.

**Security rules tests:** `firestore.rules.test.ts` needs the Firestore emulator running on `localhost:8080`. It is not part of `npm run test`.

### 8.4 Android app (Capacitor)

1. Put your `google-services.json` in `android/app/`. (See `android/app/google-services.json.example` for the shape.)
2. Build the web app and copy it into the Android project:
   ```bash
   npm run mobile:sync
   ```
3. Open the project in Android Studio and run it:
   ```bash
   npm run mobile:open
   ```

On Windows, `deploy.ps1` runs `npm install`, `npm run build` and `npx cap sync android` in one go.

### 8.5 Native Android app (Compose)

1. Put your `google-services.json` in `compose-app/app/`. The build needs this file.
2. Open the `compose-app/` folder in Android Studio, or build from the command line:
   ```bash
   cd compose-app
   ./gradlew assembleDebug
   ```
   The APK is written to `compose-app/app/build/outputs/apk/debug/`.

Release builds turn on code shrinking (R8) and use the baseline profile in `app/src/release/generated/baselineProfiles/`.

### 8.6 Continuous integration

| Workflow | Runs when | What it does |
| :--- | :--- | :--- |
| `.github/workflows/docker-publish.yml` | Push or pull request to `main` / `master`, `v*.*.*` tags, manual | Builds the Docker image for `linux/amd64` and `linux/arm64` and pushes it to `ghcr.io` (not on pull requests) |
| `.github/workflows/release.yml` | `v*` tags, manual | Builds the web app, syncs Capacitor, builds a debug APK from `android/`, and publishes it as a GitHub Release. Tags with `-dev`, `-alpha`, `-beta`, `-canary` or `-rc` go to the **dev** channel as pre-releases; others go to **stable**. |
| `.github/dependabot.yml` | Monthly | Opens pull requests for npm production dependency updates |

---

## 9. Deployment

The web app can run as a Docker container. The image builds the app with Node.js and serves it with Nginx on port `2266`. When the container starts, `docker/40-generate-env.sh` writes every `VITE_*` and `FIREBASE_*` setting into `env-config.js`, so the same image works with any Firebase project.

**With Docker Compose:**

```bash
cp compose.example.yml compose.yml
```

Fill in your Firebase settings in `compose.yml` (or in a `.env` file), then start it:

```bash
docker compose up -d
```

Open `http://localhost:2266`.

**With the Docker command line:**

```bash
docker run -d --name laluzgarage -p 2266:2266 --env-file .env --restart unless-stopped ghcr.io/nmhappu/laluzgarage:latest
```

Each setting can be given as `VITE_FIREBASE_…` or as `FIREBASE_…`. The container also has a health check that loads the home page every 30 seconds.

---

## 10. Security

- There is no backend server. **The Firestore rules (`firestore.rules`) are the only thing that protects the data.** Always deploy them with the app.
- Never commit `.env` or `google-services.json`. Both are listed in `.gitignore`.
- A security review of the native app and the rules, with open findings, is in [`compose-app/SECURITY_REVIEW.md`](compose-app/SECURITY_REVIEW.md). Read it before putting the app into real use.

---

## 11. License

This project is licensed under the **GNU Affero General Public License v3.0**. See [`LICENSE`](LICENSE).

Copyright © 2026 Prince Santhosh.
