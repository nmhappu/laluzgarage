# LaluZ Garage design system (Compose)

The native app's implementation of the **LaluZ Garage App Design** canvas
(Material 3 Expressive, dark + light). Source of truth, in order:

1. Screen artboards: Login, Login with mail, Pending approval, Dashboard, Services, Job card,
   Vehicles, Vehicle detail, Inventory, Part detail and the Intake flow (PIN to Job card issued).
2. `tokens.json` from the canvas design system (`project/ds/laluz-garage`).
3. The "Material 3 design spec" board, only where 1 and 2 are silent.

Screens read tokens only. A raw `Color(0x…)`, `sp` or ad-hoc `dp` radius in a screen is a bug.

---

## Tokens

| Category | Code | Notes |
|---|---|---|
| Colour roles | `ui/theme/Color.kt` → `Theme.kt` (`MaterialTheme.colorScheme`) | Full M3 scheme incl. all five `surfaceContainer*` tiers |
| Extended colours | `ui/theme/ExtendedColors.kt` → `LaluzTheme.extendedColors` | `warning*`, hero card (`heroTop/heroBottom/onHero/heroLine`), `whatsapp/onWhatsapp`, `logoInk/logoBolt` |
| Type | `ui/theme/Type.kt` → `MaterialTheme.typography`, `LaluzType` | Plus Jakarta Sans + JetBrains Mono; CSS-style centred line height |
| Shape | `ui/theme/Shape.kt` → `MaterialTheme.shapes`, `LaluzShape`, `Radius` | 4 / 8 / 12 / 16 / 20 / 28 / full |
| Spacing | `ui/theme/Spacing.kt` → `Spacing` | 4 / 8 / 12 / 16 / 20 / 24 / 32, 48dp touch target |
| Elevation | `Elevation.level3` (6dp) | Shadows only on the floating toolbar and FAB; everything else is tonal |
| Motion | `MotionScheme.expressive()` on the theme | Shape morphs and toolbar expand/collapse come from the scheme |
| Theme mode | `ThemeMode` + `ThemePreferences` | System / Light / Dark, persisted; picked from the avatar menu |

### Colour roles

| Role | Light | Dark | Used for |
|---|---|---|---|
| surface | `#F1F5F9` | `#07080A` | Page, top bar at rest (the 60%) |
| surfaceContainerLow | `#FFFFFF` | `#0C0E12` | Cards, tiles, list groups |
| surfaceContainer | `#F8FAFC` | `#111318` | Floating toolbar, scrolled top bar, job status bar, menus |
| surfaceContainerHigh | `#E7ECF1` | `#171A20` | Search pill, filled fields, tonal row buttons, icon tiles |
| surfaceContainerHighest | `#E2E8F0` | `#1E222A` | Progress tracks, neutral chips |
| onSurface / onSurfaceVariant | `#0F172A` / `#475569` | `#F8FAFC` / `#94A3B8` | Text |
| outline / outlineVariant | `#64748B` / `#E2E8F0` | `#64748B` / `#1E232E` | Field + outlined-button borders / dividers only |
| primary / onPrimary | `#087A3C` / `#FFFFFF` | `#33E07D` / `#00230E` | FAB, Update, focus rings, links (the 10%) |
| primaryContainer | `#CFF7DC` | `#0E7A43` | Completed chip and tile |
| secondaryContainer | `#D2EEDB` | `#1E5A36` | Selected filter chip, nav indicator, PIN badge |
| tertiary / tertiaryContainer | `#1D4ED8` / `#DBEAFE` | `#5CB4FF` / `#1E4FD6` | In-progress bar / chip, Call button, avatar |
| error / errorContainer | `#C4122F` / `#FFDCE0` | `#FF5A67` / `#C81E35` | Overdue chip, field errors |
| warning / warningContainer (ext) | `#8A6A00` / `#FFE14D` | `#FFD60A` / `#FFD60A` | Pending chip, low stock |
| whatsapp / onWhatsapp (ext) | `#25D366` / `#0B141A` | same | WhatsApp and Send bill buttons (9.4:1) |

### Type scale

| Slot | Spec | Used for |
|---|---|---|
| displayLarge | 57/64 · 800 · −1.5 | Total services number |
| displaySmall | 36/44 · 800 · −0.5 | "Services" title, KPI tiles |
| headlineLarge | 32/40 · 800 · −0.5 | Bill total |
| headlineMedium | 28/36 · 700 | Greeting, auth titles |
| headlineSmall | 24/32 · 700 | Login welcome (36 line height on the artboard) |
| titleLarge | 20/28 · 700 | Section titles, top bar, customer name |
| titleMedium | 16/24 · 600 | List headlines, values |
| titleSmall | 14/20 · 700 | Card section headings (onSurfaceVariant) |
| bodyLarge / bodyMedium / bodySmall | 16/24, 14/20, 12/16 · 400 | Body, supporting text, captions |
| labelLarge / labelMedium | 14/20, 12/16 · 600 | Buttons / chips |
| LaluzType.plateLarge / plate / plateSmall | Mono 28/36, 18/24, 14/20 · 700 | Number plates |
| LaluzType.pin, monoValue, phone | Mono 16/24 | PIN, odometer, phone |

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
| Avatar action + menu | `OperatorAvatarButton` | `DropdownMenu` | theme (System/Light/Dark), Switch operator, Sign out |
| Status chip | `StatusChip(text, ChipTone)` | Box | Pending, In progress, Completed, Overdue, Delivered, Neutral |
| PIN badge | `PinBadge` | Row | reads digits one by one to TalkBack |
| Section card | `SectionCard` | Column | heading semantics |
| Buttons | `TonalRowButton`, `PillButton`, `OutlinedPillButton`, `LaluzTextButton` | M3 `Button` / `OutlinedButton` / `TextButton` | enabled, disabled (12% / 38%), loading |
| Text fields | `LaluzFilledField`, `LaluzOutlinedField`, `LaluzSearchField` | `BasicTextField` | rest, focused ring, emphasised, error + supporting text |
| Cookie shape | `CookieShape` | Artboard polygon | used by the Pending and Open-jobs badges |
| Icons | `LaluzIcons` | Artboard stroke paths | 2dp round stroke, tinted by `Icon` |
| Logo | `LaluzLogo` | Artboard vector | ink follows theme, bolt stays green |
| Filter chip | `LaluzScreenParts.kt` `LaluzFilterChip` | Surface | selected (secondary / error / warning tone), optional count |
| Screen header, detail top bar | `ScreenHeader`, `DetailTopBar` | Column / `LaluzTopBar` | transparent bar over the PIN glow |
| Bottom action bar | `BottomActionBar`, `DeleteEditBar` | Column | surfaceContainer, 12/16/20 padding |
| Connected rows | `connectedRowShape` | Shape | 20dp ends, 4dp inner, 2dp gaps |
| Wavy divider | `WavyDivider` | Canvas | service history separator |
| Dialog | `LaluzConfirmDialog` | Dialog | 28dp, surfaceContainerHigh, 50% scrim |
| Date picker | `intake/IntakeDatePicker.kt` | Dialog | disabled past / future days, today ring |

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
- **Switch operator** opens the advisor PIN dialog; the verified advisor becomes the avatar and the
  intake advisor until sign-out.
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

- **Settings** opens from the avatar menu (first item). Sub-pages: Team Management, Edit member,
  Statistics (placeholder), WhatsApp, Tags, General Settings, App Updates. Settings dialogs use the
  larger artboard style (`SettingsDialog`: 24/32 title, 16/24 body, Cancel in primary).
- **Team** reads and writes `users` like the web app: saving a role also mirrors it into the legacy
  tags (admin / tech / assistant). Admins can't delete their own account (Firestore rules).
- **Tags** = the workshop's custom list (stored on the device, as on the web) plus every skill tag
  members carry. Deleting a tag removes it from every member.
- **WhatsApp** edits `settings/whatsapp` (intake and delivery templates); the preview fills the
  artboard's sample data and renders `*bold*`.
- **App Updates** checks GitHub releases (`nmhappu/laluzgarage`) on the Stable or Development
  channel, downloads the APK to `cache/updates` and opens the system installer (FileProvider +
  REQUEST_INSTALL_PACKAGES). "Check for updates on launch" runs a silent check after sign-in; an
  available update shows a "New" chip on the App Updates row.
- **Services** cards: Detailed (View tasks / Edit / Delete row) or Compact (divider toggle). The
  status chips take their status colour when selected. Delete needs an admin account.
- **Edit job card** edits odometer (or Dead / Locked), problems (done states kept by line),
  belongings and estimated delivery; the intake date is locked.
