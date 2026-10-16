# LaluZ Garage (Compose app): Security Review

**Date:** 15 Oct 2026  
**Scope:** `compose-app/` (Android, Jetpack Compose) and the Firestore security rules it relies on (`/firestore.rules`, shared with the React web app).  
**Method:** Static review of source, manifest, Gradle config and rules. No live traffic capture or penetration testing was done.  
**Deployed rules:** Confirmed on 15 Oct 2026 that `/firestore.rules` is what's deployed to the database the app uses (`ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e`), so the rules findings below apply to the live system.

---

## 1. Summary

The app itself is small and its network side is clean. It only talks to Google and Firebase over TLS, has no custom HTTP code, no WebViews, no exported components besides the launcher, and no secrets committed to git.

**This app has no backend of its own, so the Firestore rules are the entire security boundary.** Anyone can pull the Firebase config out of the APK and call Firestore directly, without going through the app's UI. The serious problems are in those rules and in the sign-in and role flow that depends on them.

| # | Finding | Severity |
|---|---|---|
| C1 | Any Google account can give itself the `technician` or `assistant` role | **Critical** |
| C2 | Every signed-in account, approved or not, can read all staff names, emails, roles and PINs | **Critical** |
| C3 | "Zero-admin bootstrap" turns any sign-in into an admin if `settings/admin_lock` is missing | **Critical** (if the lock doc is missing), otherwise Medium |
| H1 | Role is claimed by matching an email that may not be verified, and users can change their own `email` field | High |
| H2 | No App Check, so the backend accepts calls from any client | High |
| M1 | Job and stock data aren't bound to who wrote them (`technicianId` can be forged, and any tech can rewrite any job) | Medium |
| M2 | The advisor PIN doesn't record who did intake (`1234` always works, the PIN is stored in plain text, and "Switch operator" can't switch) | Medium |
| M3 | Customer data cache and auth session go into Android backups, and nothing is cleared on sign-out | Medium |
| M4 | `/test` collection is open to any signed-in account (quota abuse on the Spark plan) | Medium |
| L1–L7 | Logging, error messages, nonce, FLAG_SECURE, unused deps, target SDK, client/rules drift | Low |

---

## 2. Internet traffic

### What the app talks to

| Destination | Why | Transport |
|---|---|---|
| Firebase Auth (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`) | Email and Google sign-in, refreshing the ID token | HTTPS |
| Cloud Firestore (`firestore.googleapis.com`) | All app data: users, customers, vehicles, serviceRecords, parts, settings | gRPC over TLS |
| Google Identity via Credential Manager / Play services | Google account picker, ID token | Handled by Play services (IPC + TLS) |
| `https://wa.me/<phone>?text=…` | "Share on WhatsApp" for intake and delivery messages | Hands off to WhatsApp, or to the browser if WhatsApp isn't installed |
| License URL (login footer) | Opens in the browser | HTTPS |

No Analytics, Crashlytics, ads or other third-party SDKs are in the dependency list, so there's no tracking traffic.

### Observations

- **Cleartext is blocked.** `targetSdk 35` means cleartext HTTP is off by default, and there's no `network_security_config` turning it back on. ✅
- **No custom TLS handling.** There's no `TrustManager`, `HostnameVerifier` or WebView anywhere in the source. ✅
- **No certificate pinning.** That's correct for Google APIs, because Google rotates its certificates and pinning would break the app. Rely on system trust plus App Check (H2).
- **WhatsApp links put customer data in a URL.** The text includes the customer name, vehicle, plate and job description. On a phone without WhatsApp the link opens in the browser and lands in browser history. That's acceptable for this use, but worth knowing.
- **What's inside the APK.** `google-services.json` values (API key, project ID, app ID, web client ID) and the Firestore database ID are compiled in. **These are public by design and aren't secrets.** Restrict the Android API key in Google Cloud Console to package `dev.appu.laluzgarage` plus your release SHA‑1, and treat the rules (and App Check) as the real protection.
- **Confirming this list.** Capture a session with Android Studio → App Inspection → Network Inspector, or run mitmproxy against a debug build. That gives you the exact hostnames, including any Firebase housekeeping endpoints the SDK adds that aren't listed here.

---

## 3. Critical findings

### C1. Anyone can grant themselves a working role
**Where:** `firestore.rules` lines 130–134 (`users` create rule)

```
(isAdmin() || isBootstrapAllowed() ||
  ((!('role' in incoming().keys()) || incoming().role != 'admin') && ...))
```

When a non-admin creates their own user doc, the rule only blocks `role == 'admin'`. **`role: 'technician'` and `role: 'assistant'` are allowed.** Google sign-in creates an account for *any* Google user, so the attack is:

1. Sign in with any Google account, in the app or straight against the Auth REST API using the API key from the APK.
2. Before the app writes the profile, create `/users/{uid}` with `role: "technician"`. This is one REST call with the ID token.
3. You now have `hasActiveRole()` and `isTechnician()`. You can read every customer (names, phone numbers), vehicle and service record, and create or edit records and parts.

The "Pending approval" screen gives no protection here, because it's only UI.

**Fix:** A self-created user doc must not be able to carry `role`, `tags` or `pin`. Only an admin, or a verified invite (see H1), can set a role. Sketch:

```
allow create: if isSignedIn() && request.auth.uid == userId
              && isValidWorkshopUser(incoming())
              && !incoming().keys().hasAny(['role', 'tags', 'pin']);
```

A stronger long-term option is to put roles in **custom claims** (`request.auth.token.role`). The rules already check `request.auth.token.admin`. Setting claims needs the Admin SDK (a Cloud Function or a script you run).

### C2. All staff profiles, including PINs, are readable by any signed-in account
**Where:** `firestore.rules` line 129: `allow read: if isSignedIn();`

Any Google account that signs in, even one that's never approved, can list `/users` and get every staff member's **name, email, role, tags and advisor PIN**. Combined with C1, that's everything an attacker needs.

**Fix:**
```
allow get:  if isSignedIn() && (request.auth.uid == userId || hasActiveRole());
allow list: if hasActiveRole();
```
Move PINs out of `/users` entirely (see M2).

> This breaks the app's current "find my pre-registered doc by email" query for unapproved users (`AuthRepository.checkPreRegisteredEmail`, `doSyncUserProfile`, `refreshProfile`), because they could no longer list `/users`. Replace that flow with the invite approach in H1.

### C3. Zero-admin bootstrap
**Where:** `firestore.rules` lines 41–43, 132, 138 and 176; `AuthRepository.doSyncUserProfile` lines 253–296; also the web app's `AuthContext.tsx`.

While `settings/admin_lock` does **not** exist:
- any signed-in user can create or update their own doc with `role: "admin"` (lines 132 and 138, where the update branch allows *any* self-edit), and
- anyone can create `settings/admin_lock` themselves (line 176).

The app does this automatically: if a query finds no admin, it promotes the current user. It then writes the lock inside `runCatching`, so a failed lock write goes unnoticed. Two people signing in at once can both become admin.

Even with the lock in place, the protection is fragile. An admin can delete `admin_lock` (admins can write all of `settings`), which silently reopens the bootstrap.

**Fix:**
1. **Check right now that `settings/admin_lock` exists** in the `ai-studio-…` database. If it doesn't, this is the most urgent item.
2. Remove the bootstrap path from the rules and the clients. Create the first admin once, by hand in the Console or with a custom claim.
3. Until then, add `allow delete: if false;` for `settings/admin_lock`.

---

## 4. High findings

### H1. Role claimed by email match, with no verification
**Where:** `AuthRepository.kt` lines 97–149, 167–251 and 339–387; `firestore.rules` lines 135–139.

The app finds a "pre-registered" user doc whose `email` equals the signed-in account's email, then copies that doc's `role`, `tags` and **`pin`** onto the new uid. Problems:

- **Unverified email/password accounts.** Unless email sign-up is switched off in Firebase Auth, anyone can create an email/password account through the REST API with a *staff member's* email address. It isn't verified, but the app still matches on it and the rules still accept the copied role (C1). Google accounts are always verified, so this is specifically about the email/password provider.
- **`email` is editable by the owner.** The self-update rule doesn't protect `email`, so a user can set their doc's email to someone else's. That confuses the matching for the real owner.
- **The client trusts another user's doc.** `checkPreRegisteredEmail` sets `_userProfile` to the *matched* doc even when the migration write fails, so the UI can show "authenticated" with a role the rules don't grant.
- **Clean-up always fails.** Deleting the pre-registered doc is admin-only, so `runCatching { delete }` silently leaves duplicate docs that still hold a role and PIN.

**Fix (works on the Spark plan with no Cloud Functions):** Admins create `invites/{email}` docs (`{ role }`). The new user's own create is allowed only when it matches:

```
allow create: if request.auth.uid == userId && isValidWorkshopUser(incoming())
  && !incoming().keys().hasAny(['tags', 'pin'])
  && (!('role' in incoming().keys())
      || (request.auth.token.email_verified == true
          && incoming().email == request.auth.token.email
          && incoming().role == get(/databases/$(database)/documents/invites/$(request.auth.token.email)).data.role));
```

Also make `email` immutable on self-update (or tie it to `request.auth.token.email`), and in **Firebase Console → Authentication → Settings → User actions**, untick *Enable create (sign-up)*. That matches how you described the app: accounts are created through Google only, and email/password is sign-in only.

### H2. No App Check
Nothing in the app or the backend checks that requests come from your genuine app. With App Check (Play Integrity) enforced on Firestore and Auth, the curl and REST attacks above get much harder. App Check is **defence in depth, not a replacement** for fixing C1–C3.

**Fix:** Add `firebase-appcheck-playintegrity`, register the app in the Firebase Console, watch the metrics for a few days, then enforce. Use the debug provider for debug builds.

---

## 5. Medium findings

### M1. Business data isn't bound to its author
**Where:** the rules for `customers`, `vehicles`, `serviceRecords` and `parts`.

- `technicianId` is required but never compared with `request.auth.uid`, so a record can be attributed to anyone. Items 1 and 2 of `security_spec.md` aren't enforced.
- Any technician can update **any** field of **any** job (costs, status, `technicianId`), and the only thing protected is `createdAt`.
- `updatedAt` isn't checked against `request.time`, so timestamps can be backdated. This contradicts item 7 of the spec.
- Any technician can set `stockQuantity` to any value (spec item 12).
- There's no check that the referenced customer or vehicle exists (spec items 5 and 6).

**Fix:** On create, require `incoming().technicianId == request.auth.uid` and `incoming().updatedAt == request.time`. On update, limit what can change with `incoming().diff(existing()).affectedKeys().hasOnly([...])` and keep `technicianId` immutable. If a full change history matters, consider an append-only `auditLog`.

### M2. The advisor PIN doesn't do its job
You said the PIN is there to **record who did each intake**. Right now it can't do that:

- `IntakeViewModel.kt:28–33`: `pin == DEFAULT_ADVISOR_PIN` is accepted **even after an advisor has set their own PIN**, so `1234` always works.
- `LaluzApp.kt:217–225`: "Switch operator" checks the PIN against the **current** operator and returns that same operator, so it can't actually switch to another person.
- The job's `technicianId` is always the signed-in account's id. And because of M1, the rules accept any value anyway.
- PINs are stored in plain text in `/users` and readable by everyone (C2). The check runs only on the device, with no attempt limit.

**Fix (pick the model that suits how the device is used):**
- *One account per person:* drop the PIN. The signed-in uid already identifies who did the intake, once M1 binds `technicianId` to `request.auth.uid`.
- *Shared shop tablet:* let the operator pick a staff member, then verify that person's PIN. Store only a salted hash, in an admin-readable collection (not `/users`). Remove the `1234` fallback, or allow it only while `pin` is unset. Record `operatorId` on the job next to the signed-in `technicianId`. This is still an honesty-based record and not strong authentication, since it's enforced on the device.

### M3. Local data and backups
- `AndroidManifest.xml`: `android:allowBackup="true"` with no `dataExtractionRules`. The Firestore offline cache (up to **100 MB** of customer names, phone numbers, vehicles and job history, set in `AppModule.kt`) and the Firebase Auth session in shared preferences are included in Google Drive backup and device-to-device transfer. Restoring a backup on another phone can bring a signed-in session with it.
- Signing out (`AuthRepository.signOut`) doesn't clear the Firestore cache, so the data stays on disk for the next person who uses the device.

**Fix:** Set `allowBackup="false"`, or add `dataExtractionRules` and `fullBackupContent` that exclude `database/` and the Firebase shared preferences. On sign-out, call `firestore.terminate()` and then `clearPersistence()`. Because Firestore is a Hilt singleton, this needs the instance to be recreatable, or an app restart.

### M4. Open `/test` collection
`firestore.rules` lines 170–172 let any signed-in account read and write `/test/{docId}`. On the Spark plan's daily free quota, one script writing junk there can use up the workshop's reads and writes for the day, which is effectively a denial of service. **Remove the block.**

---

## 6. Low findings

| # | Finding | Fix |
|---|---|---|
| L1 | `Log.d`/`Log.i` in `AuthRepository` print emails, uids and roles in **release** builds. R8 doesn't strip them. | Add `-assumenosideeffects class android.util.Log { public static *** d(...); public static *** v(...); public static *** i(...); }` to `proguard-rules.pro`, or gate the calls on `BuildConfig.DEBUG`. |
| L2 | Raw `localizedMessage` from Firebase is shown on the login screen. | Map errors to fixed messages. Turn on **Email Enumeration Protection** in Firebase Auth settings. |
| L3 | Google sign-in sends no nonce (`GetSignInWithGoogleOption` without `setNonce`). | Generate a random nonce, pass its SHA‑256 to `setNonce`, and pass the raw nonce to Firebase with `OAuthProvider` or `GoogleAuthProvider`. This protects against token replay. |
| L4 | No `FLAG_SECURE`. Customer details show in the Recents thumbnail and in screenshots. | Optional. Add it if the devices are shared or customer-facing. |
| L5 | `coil-compose` and `play-services-auth` don't seem to be used. There's no image loading and no legacy `GoogleSignIn` API in the code. | Confirm, then remove them. That means less code and fewer dependencies to keep patched. |
| L6 | `targetSdk = 35`. Google Play now requires **API 36** for new apps and updates. | Raise it to 36 before your next Play upload. Newer targets also bring platform security defaults. |
| L7 | Client role logic doesn't match the rules. The app accepts `owner`, `manager`, `tech`, `mechanic`, `helper`, `trainee` and the fields `userRole` and `roleName`, but the rules only accept `admin`, `technician` and `assistant` in `role`, plus some tags. | Keep one definition. When the client and rules disagree, the app shows screens that then fail with permission errors. |

**Already done well:** `google-services.json`, `local.properties` and `.env` are git-ignored and not in history. Release builds use R8 with resource shrinking. Only `INTERNET` and `ACCESS_NETWORK_STATE` permissions are requested. The only exported component is the launcher activity. Settings use private `SharedPreferences`. Repository resolution is locked down with `FAIL_ON_PROJECT_REPOS`.

**Coming up:** The planned job-card photos in Firebase Storage will need their own `storage.rules`, with the same role checks plus content-type and size limits. No storage rules file exists in the repo yet.

---

## 7. Verify in the Firebase Console

These couldn't be checked from the code:

1. ~~Firestore rules match `/firestore.rules`~~ Confirmed 15 Oct 2026.
2. **Firestore → Data → `settings/admin_lock`.** Does it exist (C3)?
3. **Firestore → Data → `users`.** Look for docs with roles you don't recognise, or `test` docs. They may show C1 or M4 has already been used.
4. **Authentication → Settings → User actions.** Is *Enable create (sign-up)* off? Is *Email enumeration protection* on?
5. **App Check.** Is it registered or enforced for Firestore and Auth?
6. **Google Cloud Console → APIs & Services → Credentials.** Is the Android API key restricted to your package name and SHA‑1?

---

## 8. Suggested order of work

1. Checklist items 2–3 (minutes).
2. Rules: C1, C2 and C3, then remove `/test` (M4). Test them with the existing `firestore.rules.test.ts` and the emulator. **Remember the React web app uses the same rules.**
3. Console: disable email sign-up, enable enumeration protection, restrict the API key.
4. App: replace the email-matching migration with invites (H1), fix the PIN model (M2), set the backup rules and clear the cache on sign-out (M3).
5. App Check (H2), then M1 and the low items.

---

*Sources:* [Google Play target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)
