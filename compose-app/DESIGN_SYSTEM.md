# LaluZ Garage design system (Compose)

The native app's implementation of the **LaluZ Garage App Design** canvas
(Material 3 Expressive, dark + light). Source of truth, in order:

1. Screen artboards: Login, Login with mail, Logo draw-on, Pending approval, Choose theme, Dashboard,
   Services, Job card, Vehicles, Vehicle detail, Inventory, Part detail, Settings (Team, Statistics,
   WhatsApp, App Updates) and the Intake flow (PIN to Job card issued).
2. `tokens.json` from the LaluZ Garage design system (installed on the canvas at `project/ds/laluz-garage`).
3. The "Material 3 design spec" board, only where 1 and 2 are silent.

Screens read tokens only. A raw `Color(0x…)`, `sp` or ad-hoc `dp` radius in a screen is a bug. The one
exception is `SettingsTone` (fixed per-row hues on Settings home, see below).

---

## Tokens

| Category | Code | Notes |
|---|---|---|
| Colour roles | `ui/theme/Color.kt` → `Theme.kt` (`MaterialTheme.colorScheme`) | Full M3 scheme incl. all five `surfaceContainer*` tiers |
| Extended colours | `ui/theme/ExtendedColors.kt` → `LaluzTheme.extendedColors` | `warning*`, hero card (`heroTop/heroBottom/onHero/heroLine`), `whatsapp/onWhatsapp`, `logoInk/logoBolt` |
| Type | `ui/theme/Type.kt` → `MaterialTheme.typography`, `LaluzType` | Plus Jakarta Sans, Google Sans Flex (plates), JetBrains Mono; CSS-style centred line height |
| Shape | `ui/theme/Shape.kt` → `MaterialTheme.shapes`, `LaluzShape`, `Radius` | 4 / 8 / 12 / 16 / 20 / 28 / full |
| Spacing | `ui/theme/Spacing.kt` → `Spacing` | 4 / 8 / 12 / 16 / 20 / 24 / 32, 48dp touch target |
| Elevation | `Elevation.level3` (6dp) | Shadows only on the floating toolbar, FAB and date-range popup; everything else is tonal |
| Motion | `MotionScheme.expressive()` on the theme + `Motion` | Emphasized easing (0.2, 0, 0, 1), shape morph 250ms, colour 150ms |
| Theme mode | `ThemeMode` + `ThemePreferences` | System / Light / Dark + Material You, persisted; picked on first sign-in (Choose theme) and in Settings > Theme |
| Settings tones | `settings/SettingsParts.kt` `SettingsTone` | Per-row icon tile hues on Settings home; fixed, not Material You |

### Colour roles

| Role | Light | Dark | Used for |
|---|---|---|---|
| surface | `#F1F5F9` | `#07080A` | Page, top bar at rest (the 60%) |
| surfaceContainerLow | `#FFFFFF` | `#0C0E12` | Cards, tiles, list groups |
| surfaceContainer | `#F8FAFC` | `#111318` | Floating toolbar, scrolled top bar, job status bar, menus |
| surfaceContainerHigh | `#E7ECF1` | `#171A20` | Search pill, filled fields, tonal row buttons, icon tiles |
| surfaceContainerHighest | `#E2E8F0` | `#1E222A` | Progress tracks, neutral chips, Call button |
| onSurface / onSurfaceVariant | `#0F172A` / `#475569` | `#F8FAFC` / `#94A3B8` | Text |
| outline / outlineVariant | `#64748B` / `#E2E8F0` | `#64748B` / `#1E232E` | Field, outlined-button and unselected filter-chip borders / dividers, chart grid |
| primary / onPrimary | `#087A3C` / `#FFFFFF` | `#33E07D` / `#00230E` | FAB, Update, focus rings, links (the 10%) |
| primaryContainer | `#CFF7DC` | `#0E7A43` | Completed chip and tile |
| secondaryContainer | `#D2EEDB` | `#1E5A36` | Selected filter chip, nav indicator, PIN badge |
| tertiary / tertiaryContainer | `#1D4ED8` / `#DBEAFE` | `#5CB4FF` / `#1E4FD6` | In-progress bar / chip, avatar, advisor PIN badge, dialog text buttons |
| error / errorContainer | `#C4122F` / `#FFDCE0` | `#FF5A67` / `#C81E35` | Overdue chip, field errors |
| warning / warningContainer (ext) | `#8A6A00` / `#FFE14D` | `#FFD60A` / `#FFD60A` | Pending chip, low stock |
| whatsapp / onWhatsapp (ext) | `#25D366` / `#0B141A` | same | WhatsApp and Send bill buttons (9.4:1) |
| logoBolt (ext) | `#78DF22` | same | Logo bolt; the lettering is `logoInk` (`#0F172A` / `#FFFFFF`) |

### Settings tones (`SettingsTone`)

Dark: deep tinted tile, bright icon. Light: pale tile, deep icon. All pairs are 4.5:1 or better.

| Row | Dark tile / icon | Light tile / icon |
|---|---|---|
| Theme | `#2A1F45` / `#C4B5FD` | `#EDE9FE` / `#6D28D9` |
| Team Management | `#172A4D` / `#8AB4FF` | `#DBEAFE` / `#1D4ED8` |
| Statistics | `#123A24` / `#33E07D` | `#D2F5DF` / `#087A3C` |
| WhatsApp | `#0F3A35` / `#5EEAD4` | `#CCFBF1` / `#0F766E` |
| App Updates | `#3D2A12` / `#FDBA74` | `#FFEDD5` / `#C2410C` |
| Log out | `#3D161B` / `#FF5A67` | `#FFDCE0` / `#C4122F` |

### Type scale

| Slot | Spec | Used for |
|---|---|---|
| displayLarge | 57/64 · 800 · −1.5 | Total services number, Statistics total |
| displayMedium | 45/52 · 800 · −1 | Statistics total longer than 9 characters |
| displaySmall | 36/44 · 800 · −0.5 | "Services" title, KPI tiles |
| headlineLarge | 32/40 · 800 · −0.5 | Bill total |
| headlineMedium | 28/36 · 700 | Greeting, auth and Choose theme titles, date-range headline |
| headlineSmall | 24/32 · 700 | Login welcome (36 line height on the artboard) |
| titleLarge | 20/28 · 700 | Section titles, top bar, customer name |
| titleMedium | 16/24 · 600 | List headlines, values |
| titleSmall | 14/20 · 700 | Card section headings, Mode label (onSurfaceVariant) |
| bodyLarge / bodyMedium / bodySmall | 16/24, 14/20, 12/16 · 400 | Body, supporting text, captions |
| labelLarge / labelMedium | 14/20, 12/16 · 600 | Buttons / chips |
| LaluzType.plateLarge / plateCard / plateValue | Google Sans Flex 36/44, 24/32, 16/24 · 700 | Job card and vehicle headers / Services cards / detail grids |
| LaluzType.plate / plateSmall | Mono 18/24, 14/20 · 700 | Intake results and Vehicles list / dashboard rows |
| LaluzType.pin, monoValue, phone | Mono 16/24 | PIN, odometer, phone |
| LaluzType.pinDigit | Mono 28/36 · 700 | Advisor PIN boxes |
| LaluzType.labelStrong / labelTiny | 14/20 · 700, 12/16 · 700 | Emphasised buttons and segments / initials, counts, overlines |

Services cards: plate in `plateCard`, vehicle line in `bodyLarge` / onSurfaceVariant.

---

## Components

M3 Expressive components come from `androidx.compose.material3:1.5.0-beta01`, pinned above the
BOM in `gradle/libs.versions.toml`. Remove the pin once a stable BOM ships 1.5.

| Component | File | Built on | States |
|---|---|---|---|
| Floating toolbar + FAB | `components/AppChrome.kt` `FloatingNavToolbar` | **M3 Expressive `HorizontalFloatingToolbar`** + `FloatingActionButton` | expanded / collapsed (scroll), selected item, tooltip |
| Connected selector | `components/LaluzComponents.kt` `ConnectedSegments` | **M3 Expressive `ToggleButton`** + `ButtonGroupDefaults.connected*ButtonShapes()` | checked morph to full pill, pressed shape, ripple |
| Loading | `LaluzApp.kt` | **M3 Expressive `LoadingIndicator`** | indeterminate |
| Top app bar | `LaluzTopBar` | Row, 64dp | surface at rest → surfaceContainer when scrolled |
| Avatar action | `OperatorAvatarButton` | Box, 48dp | 40dp avatar, 2dp role ring (error = admin, tertiary = others); opens Settings directly |
| Status chip | `StatusChip(text, ChipTone)` | Box | Pending, In progress, Completed, Overdue, Delivered, Neutral |
| PIN badge | `PinBadge` | Row | reads digits one by one to TalkBack |
| Section card | `SectionCard` | Column | heading semantics |
| Buttons | `TonalRowButton`, `PillButton`, `OutlinedPillButton`, `LaluzTextButton` | M3 `Button` / `OutlinedButton` / `TextButton` | enabled, disabled (12% / 38%), loading |
| Text fields | `LaluzFilledField`, `LaluzOutlinedField`, `LaluzSearchField` | `BasicTextField` | rest, focused ring, emphasised, error + supporting text |
| Cookie shape | `CookieShape` | Artboard polygon | used by the Open-jobs badge and `SpinningCookieBadge` |
| Spinning cookie badge | `SpinningCookieBadge` | `CookieShape` + `graphicsLayer` | one turn per 20s behind an upright icon (40% of size); Pending approval 120dp warning, advisor PIN 96dp tertiary |
| Icons | `LaluzIcons` | Artboard stroke paths | 2dp round stroke, tinted by `Icon` |
| Logo | `LaluzLogo` | Artboard vector | ink follows theme, bolt stays green; `drawProgress` writes it stroke by stroke (login draw-on, 200ms delay + 1400ms) |
| Filter chip | `LaluzScreenParts.kt` `LaluzFilterChip` | Surface | selected (secondary / error / warning tone), optional count |
| Screen header, detail top bar | `ScreenHeader`, `DetailTopBar` | Column / `LaluzTopBar` | transparent bar over the PIN glow |
| Bottom action bar | `BottomActionBar`, `DeleteEditBar` | Column | surfaceContainer, 12/16/20 padding |
| Connected rows | `connectedRowShape` | Shape | 20dp ends, 4dp inner, 2dp gaps |
| Wavy divider | `WavyDivider` | Canvas | service history separator |
| Dialog | `LaluzConfirmDialog` | Dialog | 28dp, surfaceContainerHigh, 50% scrim |
| Date picker | `intake/IntakeDatePicker.kt` | Dialog | disabled past / future days, today ring |
| Date-range calendar | `services/ServicesDateFilter.kt` `DateRangePopup` | Popup / Dialog | 358dp card, 48dp cells, 40dp circles; primary ends, secondaryContainer band, job dots; Clear / Done in tertiary; popup under the bar on Services, centred dialog in Statistics |
| Settings row | `settings/SettingsParts.kt` `SettingsNavRow` | Surface | 40dp tile (tone or surfaceContainerHigh), title, supporting, optional New chip |
| Theme picker | `auth/ThemePickerScreen.kt` | Column | live preview card, System / Light / Dark radio tiles, Material You switch (Android 12+), 56dp Continue |
| Statistics chart | `settings/StatisticsScreens.kt` `StatChart` | Canvas | tap to select, swipe between periods, camera morph between ranges, dashed average |
| Pull to refresh | `dashboard/DashboardScreen.kt` | `PullToRefreshBox` | pull smoothed by `slowEffectsSpec`, clipped to the content so the loader slides from under the bar |

### StatusChip

| Tone | Container / content | Use when |
|---|---|---|
| PENDING | warningContainer / onWarningContainer | Job not started, Pending approval |
| IN_PROGRESS | tertiaryContainer / onTertiaryContainer | Job in bay |
| COMPLETED | primaryContainer / onPrimaryContainer | Finished job in lists |
| DELIVERED | primary / onPrimary | Job card header once delivered |
| OVERDUE | errorContainer / onErrorContainer | "Nd overdue", "N overdue" |
| NEUTRAL | surfaceContainerHighest / onSurface | "Due today" on the job card, Cancelled |

24dp tall, 8dp horizontal padding, Small (8dp) shape, labelMedium. Never use a hue alone: every
tone is a container/on-container pair that passes 4.5:1 in both themes.

### Do / don't

| ✅ Do | ❌ Don't |
|---|---|
| Use `ConnectedSegments` for single-choice groups (range, job status) | Build your own pill row with animated corners |
| Put depth on surfaceContainer tiers | Add 1dp borders or shadows to cards |
| Keep one filled (primary) button per screen | Make secondary actions primary-green |
| Use `LaluzTheme.extendedColors.warning*` for pending / low stock | Use amber or orange hexes |
| Give icon-only controls a content description and a tooltip | Ship icon buttons without labels |

---

## Behaviour decisions

- **Delivered = completed.** The job card says Delivered; Firestore stores `completed`, so the web
  app is unaffected. Delivering requires Odometer out ≥ odometer in, unless the vehicle was dead or
  the mileage was unknown at intake.
- **Checklist format** matches the web app: one task per line, `[x] text` / `[ ] text`. Edit mode
  rewrites the lines and keeps done states by position.
- **Customer remarks** are `finalRemarks` (same field as the web app's "Final Remarks & Advice").
- **Send bill on WhatsApp** uses the web app's delivery template (`settings/whatsapp.deliveryTemplate`,
  falling back to the built-in default) and appends the customer remarks.
- **Hero delta** is the percent change against the previous period of the same length.
- **Delivered date** on Services cards uses the record's `updatedAt`, because there is no separate
  delivery timestamp yet.
- **Avatar** opens Settings directly; there is no avatar menu. Switch operator is no longer offered in
  Settings; the advisor is verified at the start of each intake (the PIN step now leads with a
  spinning tertiary cookie badge).
- **Choose theme** appears once per account per device, after approval and before the dashboard
  (`AuthScreenState.CHOOSE_THEME`, `ThemePreferences.themeChosenBy`). Choices apply live.
- **Logo draw-on** plays once per login screen visit; returning from the mail view or rotating
  doesn't replay it, and with animations off the logo is solid at once. The welcome and mail views
  each paint their own surface and glow, so the incoming view covers the outgoing one.
- **Tablets** use the same floating toolbar; content and toolbar are capped at 640dp and centred.

## Intake and catalogue decisions

- **Advisor PIN** is the intake's first full-screen step (and the Switch operator screen): content
  centred between the bars on a tertiary glow (12% dark / 10% light). Intake buttons use
  tertiaryContainer, as drawn.
- **Search results** pick an existing vehicle straight into Job specification; a customer with no
  vehicle goes to Vehicle specification; "Register new customer" starts at New customer.
- **Vehicle locked** stores `isUnknownMileage`; **U/R** stores the plate `U/R`. Problems are saved
  as `[ ] line` checklist items. Mobile numbers need 10 digits and are stored as `+91…`.
- **Discard intake?** appears when leaving the flow (from Find customer or the advisor step) with
  anything entered; the back arrow on later steps goes to the previous step.
- **Inventory FAB** adds a part (as on the artboard); on every other tab it starts an intake.
- **Edit / Add** for vehicles and parts use bottom sheets in the filled-field style (not drawn on
  the canvas). Deletes need an admin account (Firestore rules) and report failures in a snackbar.

## Settings, Services and Edit job card decisions

- **Settings** opens from the avatar. Home: one group of Team Management, Theme, Statistics (admins
  only), WhatsApp and App Updates, each with its `SettingsTone`, then Log out on its own. Tags and
  General Settings were removed. Settings dialogs use the larger artboard style (`SettingsDialog`:
  24/32 title, 16/24 body, Cancel in primary).
- **Statistics** (admins only; a restored route falls back to home for others): Revenue, Jobs
  completed and Arrivals, each row showing the 7-day daily average, then a detail screen with Week /
  Month / Custom / All, a bar chart and a list. Arrivals count non-cancelled jobs by intake date; Jobs
  completed and Revenue count delivered jobs by `updatedAt` (intake date as fallback).
- **Team** reads and writes `users` like the web app: saving a role also mirrors it into the legacy
  tags (admin / tech / assistant). Admins can't delete their own account (Firestore rules).
- **WhatsApp** edits `settings/whatsapp` (intake and delivery templates); the preview fills the
  artboard's sample data and renders `*bold*`.
- **App Updates** checks GitHub releases (`nmhappu/laluzgarage-releases`, the public APK-only repo) on the Stable or Development
  channel, downloads the APK to `cache/updates` and opens the system installer (FileProvider +
  REQUEST_INSTALL_PACKAGES). "Check for updates on launch" runs a silent check after sign-in; an
  available update shows a "New" chip on the App Updates row.
- **Services** cards: Detailed (View tasks / Edit / Delete row) or Compact (divider toggle). The
  status chips take their status colour when selected. Delete needs an admin account. The date filter
  is the custom range calendar; days with arrivals carry a dot.
- **Edit job card** edits odometer (or Dead / Locked), problems (done states kept by line),
  belongings and estimated delivery; the intake date is locked.
