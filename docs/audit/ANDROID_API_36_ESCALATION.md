# CollectionKeeper — Android 16 / API 36 Compliance: Escalation Request

**Date:** 2026-07-22
**Prepared by:** Base44 build agent
**Status:** BLOCKED — requires platform-side action by Base44

---

## 1. Summary

Google Play Console has warned that **CollectionKeeper must target Android 16 (API level 36) or higher**, with a required completion date of **August 30, 2026**.

After a full audit of the supplied repository, the Android App Bundle currently distributed on Google Play is **not produced from any source contained in this repository**. The native Android wrapper, signing, and AAB generation are all managed by the **Base44 platform publishing service**. The `targetSdk` / `compileSdk` / Android Gradle Plugin version are **not user-configurable** and are not present in any file in this repository.

**No web-code or repository changes can resolve this policy warning.** The fix must be applied to the Base44-generated Android wrapper template.

---

## 2. Android Build Source Identification (Phase 1)

### 2.1 What is in this repository

The repository is a **pure React 18 / Vite / Base44 web application**. Verified contents:

| Check | Result |
|---|---|
| Android Studio project (`android/` dir) | **Not present** |
| Gradle files (`build.gradle`, `settings.gradle`, `gradlew`, `gradle.properties`) | **Not present** |
| `AndroidManifest.xml` | **Not present** |
| Capacitor config (`capacitor.config.json` / `.ts`) | **Not present** |
| Cordova config (`config.xml`, `cordova-config.xml`) | **Not present** |
| Bubblewrap / TWA manifest (`twa-manifest.json`, `bubblewrap.config.json`) | **Not present** |
| Signing keystore (`.jks`, `.keystore`) | **Not present** |
| Capacitor / Cordova / `@capacitor/*` npm dependencies | **Not present** |
| Android build script (`android:build`, `android:assembleRelease`) in `package.json` | **Not present** |
| CI/CD Android build job (`.github/workflows/deploy.yml`) | **Web-only** — runs `npm run build` and deploys to GitHub Pages. No AAB step. |

A recursive filesystem scan for `android`, `gradle`, `capacitor`, `cordova`, `bubblewrap`, `twa-manifest`, `AndroidManifest`, `keystore`, `.aab`, `build.gradle` returned **zero matches** (excluding `node_modules`).

### 2.2 How the Android AAB is actually produced

Per Base44's own documentation (*Submitting your app to app stores*):

> *"Your Base44 mobile app focuses on running your web experience inside a secure web view rather than as a fully native app."*

The AAB is generated through the **Base44 app editor → Publish → Mobile app tab → "Create Google Play files"**. Base44's platform:

1. Builds the web app from the Vite `dist/` output.
2. Wraps it in a **lightweight native Android WebView shell** (the source of which is owned and maintained by Base44).
3. Generates a signed Android App Bundle.
4. The user downloads the AAB and uploads it to Google Play Console.

### 2.3 Key platform limitation (confirmed)

From Base44 docs:

> The documentation **does not expose** `targetSdk`, `minSdk`, `compileSdk`, Android Gradle Plugin version, Gradle wrapper version, or Kotlin version as configurable settings. **Permissions are determined by an AI scan and are not editable in the Base44 interface.**

These values are baked into the Base44-managed native wrapper template and are not controllable from any file in this repository.

---

## 3. Current Android Build Properties

The values below are **not present in this repository** and must be read from the Base44 app editor (Publish → Mobile app) or from the existing Google Play Console listing. They are listed here as **fields to confirm**, not as values I can set:

| Property | Current value (to confirm) | Required value |
|---|---|---|
| Android application ID | **Confirm in Base44 Mobile app tab / Play Console** | Unchanged |
| versionName | Confirm in Base44 Mobile app tab | Increment per release convention |
| versionCode | Confirm in Base44 Mobile app tab | Increment (+1 minimum) |
| **targetSdk** | Currently < 36 (this triggered the warning) | **36** |
| **compileSdk** | Currently < 36 | **36** |
| minSdk | Confirm in Base44 Mobile app tab | Preserve unless a dependency forces a change |
| Android Gradle Plugin | Base44-managed | Update as needed for API 36 |
| Gradle wrapper | Base44-managed | Update as needed for API 36 |
| Kotlin version | Base44-managed | Update as needed for API 36 |
| Native framework | Base44 WebView wrapper (lightweight native shell) | Unchanged |
| Build & signing process | Base44 platform (Publish → Mobile app → Create Google Play files) | Unchanged |
| Play App Signing | Google Play App Signing (enabled at first upload) | Unchanged |
| Entity responsible for production AAB | **Base44 platform** | Base44 platform |

---

## 4. Required Provider-Side Action (Base44)

**Owner:** Base44 platform / Base44 engineering team
**Action:** Update the native Android wrapper template used by the "Create Google Play files" feature so that generated App Bundles target Android 16 / API level 36.

Specifically, Base44 must:

1. Update the wrapper's `compileSdk` to **36**.
2. Update the wrapper's `targetSdk` to **36**.
3. Ensure the Android 16 SDK and current 36.x Android build tools are installed in the build environment.
4. Update the Android Gradle Plugin and Gradle wrapper to versions compatible with API 36.
5. Update Kotlin / native plugin versions only as required for API 36 compatibility.
6. Preserve the existing `minSdk` unless a documented dependency change makes it unavoidable.
7. Regenerate the AAB for the **CollectionKeeper** app via the Publish → Mobile app → "Create Google Play files" flow.
8. Provide the updated signed AAB for upload to Google Play Internal Testing.

### What Base44 must NOT do
- Change the application ID / package name.
- Replace the production Play App Signing key.
- Alter deep links, subscription product IDs, authentication behavior, or production URLs.
- Introduce new permissions without a documented need.
- Replace the existing app with a generic WebView wrapper (it is already a WebView wrapper).

---

## 5. Escalation Request (copy to Base44 support)

> **Subject:** Android 16 / API 36 compliance — CollectionKeeper Google Play warning (deadline Aug 30 2026)
>
> **Application:** CollectionKeeper (Base44 app)
> **Application ID / package name:** [confirm from Base44 Publish → Mobile app tab]
> **Google Play warning:** "App must target Android 16 (API level 36) or higher."
> **Required completion date:** August 30, 2026
>
> Hello Base44 team,
>
> Google Play Console has warned that CollectionKeeper must target Android 16 (API level 36) or higher by August 30, 2026.
>
> We have confirmed that the Android App Bundle for CollectionKeeper is generated entirely by the Base44 platform (Publish → Mobile app → "Create Google Play files") and that `targetSdk`, `compileSdk`, and the Android Gradle Plugin / Gradle wrapper versions are not configurable from within our repository or the Base44 app editor.
>
> We request that Base44 update the native Android wrapper template to target API level 36 and regenerate a signed AAB for CollectionKeeper so we can upload it to Google Play Internal Testing ahead of the August 30, 2026 deadline.
>
> Please confirm:
> 1. When the API 36 wrapper update will be available.
> 2. Whether the `minSdk` will change.
> 3. Whether any Android 16 behavior changes (edge-to-edge, predictive back, 16 KB page size for native libs) require action on our web app.
> 4. The steps for us to regenerate and download the updated AAB.
>
> Thank you.

---

## 6. Why No Repository Changes Were Made

Per the task brief: *"Do not claim this has been fixed by modifying only the React/Vite application."*

There is no file in this repository that controls `targetSdk` or `compileSdk`. Making edits to the React/Vite source would not change the Android target API level and would not resolve the Google Play warning. Therefore no code changes were made.

The only repository-side preparations that **would** be appropriate once Base44 ships an API 36 wrapper are Android 16 web-view behavior audits (Phase 3 of the brief). These are queued below as future tasks but are **not** blocking the core compliance fix, which is platform-side.

---

## 7. Queued Repository-Side Work (after Base44 ships API 36 wrapper)

These items can be validated in this repository once the updated AAB is available, to ensure the web app behaves correctly under Android 16 inside the Base44 WebView wrapper:

### 7.1 Edge-to-edge / system-bar insets
- Verify the app's fixed header (`src/Layout.jsx`, `sticky top-0` + `pt-[env(safe-area-inset-top)]`) still renders correctly with edge-to-edge enabled.
- Verify `100dvh` usage in `src/globals.css` and `src/index.css` still avoids status-bar overlap.
- Verify `env(safe-area-inset-*)` usage in Layout and modals.

### 7.2 Predictive back navigation
- Verify in-app back navigation (`src/components/navigation/BackButton.jsx`, React Router) does not conflict with Android predictive back gestures.
- Verify modal/sheet dismiss behavior (`@radix-ui/react-dialog`, `vaul` drawer) responds correctly to back gestures.

### 7.3 Photo picker, camera, file upload
- Verify `src/components/PhotoUploader.jsx`, `src/components/pipes/ImageCropper.jsx`, `src/components/identify/BarcodeScannerModal.jsx` still trigger the Android photo picker / camera intents correctly under API 36.
- Verify file `<input type="file" accept="image/*" capture>` behavior.

### 7.4 Downloads / exported files
- Verify PDF/CSV export (`jspdf`, html2canvas, export components under `src/components/export/`) still downloads correctly under Android 16 storage restrictions.

### 7.5 Deep links / app links
- Verify share links (`/share/:moduleType/:shareToken`) still resolve.
- Verify subscription success redirects.

### 7.6 Storage / auth persistence
- Verify localStorage / session persistence survives app lifecycle changes on Android 16.
- Verify `src/lib/AuthContext.jsx` token persistence.

### 7.7 16 KB memory-page compatibility
- If Base44's wrapper bundles native libraries, confirm 16 KB page size compatibility (this is a Base44-side check, but the web app should be tested on a 16 KB-page emulator).

### 7.8 Localization
- Run `npm run i18n:check` and confirm no new findings.
- Test longer translated strings (e.g., German, Portuguese) for clipping on Android 16 viewports.

---

## 8. Validation Commands (web side — current status)

These can be run now to confirm the web build is healthy, but they do **not** affect the Android target API level:

| Command | Status |
|---|---|
| `npm ci` | Runnable — clean install |
| `npm run lint` | Runnable — `eslint . --quiet` |
| `npm run typecheck` | Runnable — `tsc -p ./jsconfig.json` |
| `npm test` | Runnable — `vitest run` |
| `npm run build` | Runnable — `vite build` → `dist/` |
| `npm run i18n:check` | Runnable — `node scripts/i18n-check.js` |
| Android clean build | **N/A — no Android project in this repo** |
| Android release AAB build | **N/A — generated by Base44 platform** |
| Android Lint | **N/A — no Android project in this repo** |

---

## 9. Rollback Plan

1. **Before uploading the new API 36 AAB:** archive the currently-published production AAB from Google Play Console (Production → App bundle explorer → download the active AAB) as a rollback artifact.
2. **If the API 36 build fails pre-launch or production testing:** revert the production release to the previous versionCode via Play Console → Production → Roll back.
3. **If the issue is with the Base44 wrapper itself (not the web app):** request Base44 to regenerate the AAB from the previous wrapper template while the API 36 wrapper issue is investigated.
4. **Web app rollback:** the web app is deployed via GitHub Actions to GitHub Pages / Vercel. If a web-side change causes issues, revert the commit on `main` — the CI/CD pipeline will redeploy the previous build.

---

## 10. Deliverables Checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | Location/ownership of Android source | **Base44 platform** (not in this repo) — see §2 |
| 2 | Native packaging technology | **Base44 WebView wrapper** (lightweight native shell) — see §2.2 |
| 3 | Before/after compileSdk, targetSdk, minSdk, AGP, Gradle, Kotlin, versionCode, versionName | **Before:** < 36 (current). **After:** 36 — to be set by Base44. See §3 |
| 4 | Complete list of modified files | **None** in this repository (no Android source exists here). See §6 |
| 5 | Concise explanation of every material change | Platform-side only — see §4 |
| 6 | Results of web and Android validation commands | Web commands runnable (§8). Android commands N/A (no Android project). |
| 7 | Android 16 device/emulator testing | **Blocked** — awaiting Base44 API 36 AAB |
| 8 | Google Play Internal Testing + pre-launch results | **Blocked** — awaiting Base44 API 36 AAB |
| 9 | Remaining warnings/risks/provider limitations | `targetSdk` is provider-controlled and not user-configurable — see §2.3 |
| 10 | Exact path to signed production AAB | **Provider-side** — generated via Base44 Publish → Mobile app tab |
| 11 | Confirmation Google Play identifies bundle as API 36+ | **Blocked** — pending AAB upload |
| 12 | Rollback plan | See §9 |

---

## 11. Definition of Done — Status

| Criterion | Status |
|---|---|
| Real Android package targets API 36+ | ⏳ Blocked on Base44 |
| Release-signed AAB generated | ⏳ Blocked on Base44 |
| AAB uploaded to Google Play Internal Testing | ⏳ Blocked |
| Google Play no longer rejects for target API | ⏳ Blocked |
| CollectionKeeper core workflows pass Android regression | ⏳ Queued (§7) after AAB available |
| Existing subscriptions and admin access intact | Will verify after AAB |
| No critical pre-launch crashes/ANRs | ⏳ Blocked |
| Changes and test evidence documented | ✅ This document |

---

## 12. Immediate Next Step

**Contact Base44 support** with the escalation request in §5. This is the only action that can move the Android API 36 compliance fix forward. No further repository changes should be made until Base44 confirms an API 36-capable wrapper is available.