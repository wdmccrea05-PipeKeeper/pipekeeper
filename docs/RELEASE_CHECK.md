# PipeKeeper Release Gate

## Overview

Every release must pass the release gate before deployment.  
One command covers all critical stability checks:

```bash
npm run release:check
```

If the command exits with code 0, the release is clear to deploy.  
If it exits with a non-zero code, **do not deploy** — fix the failures first.

---

## What the gate checks

| Check | Command | What it validates |
|---|---|---|
| i18n integrity | `npm run i18n:check -- --fail-on-findings` | No newly hardcoded user-facing strings in `src/pages` or `src/components` |
| Critical-path unit tests | `npm test` | Auth/bootstrap, entitlement resolution, feature gating, collection limits, pairing logic |

### Test files included in `npm test`

| File | Area covered |
|---|---|
| `src/lib/__tests__/AuthContext.test.jsx` | Auth bootstrap, login/logout, error states, no-token behavior |
| `src/components/utils/__tests__/premiumAccess.test.jsx` | Tier resolution (free/premium/pro), legacy premium, feature gating, plan labels |
| `src/components/utils/__tests__/entitlements.test.jsx` | `buildEntitlements()` limits, feature flags per tier, legacy premium |
| `src/components/utils/__tests__/limitChecks.test.jsx` | `canCreatePipe()` / `canCreateTobacco()` limits for free vs. paid, trial restrictions |
| `src/components/utils/__tests__/pairingScore.test.jsx` | Aromatic filtering, keyword matching, deterministic scoring |

---

## When to run it

- **Before every production deployment**
- After any change to: auth logic, entitlement/subscription code, i18n keys, pairing logic, or limit checks
- After merging a PR that touches `src/lib/`, `src/components/utils/`, or `translations.js`

---

## Running the gate

```bash
# Full release gate (i18n + tests, fails fast)
npm run release:check

# Run only the i18n check
npm run i18n:check -- --fail-on-findings

# Run only the unit tests
npm test
```

---

## If the gate fails

### i18n failure

```
❌  i18n check FAILED — X finding(s) detected.
```

1. Look at the reported file and line number.
2. Replace the hardcoded string with a `t("some.key")` call.
3. Add the translation key to `translations.js` for all supported languages.
4. If the string is a proper noun or brand name, add it to `src/components/i18n/auditConfig.json.jsx` (the `.json.jsx` extension is intentional — it is a JSX module that exports a JSON-shaped object).
5. Re-run `npm run i18n:check -- --fail-on-findings` until it passes.

See [`docs/i18n-check.md`](./i18n-check.md) for full remediation steps.

### Test failure

```
FAIL  src/components/utils/__tests__/...
```

1. Read the assertion error to identify which behavior regressed.
2. Fix the source code (do **not** weaken the test unless the test itself is wrong).
3. Re-run `npm test` until all tests pass.
4. Re-run `npm run release:check` to confirm the full gate passes.

---

## Manual smoke checklist (pre-deploy)

Run these manually after the gate passes, before deploying to production:

- [ ] **App startup** — load the app cold; no white screen, no console errors
- [ ] **Login / auth state** — log in with a test account; dashboard renders; auth error on bad credentials
- [ ] **Free tier limits** — free user cannot create a 6th pipe or 11th tobacco; upgrade prompt appears
- [ ] **Premium / Pro gating** — free user sees locked state for premium features; premium user unlocks them; pro user unlocks AI features
- [ ] **Create pipe** — create a new pipe with all required fields; pipe appears in collection
- [ ] **Create tobacco blend** — create a new tobacco blend; blend appears in collection

---

## CI integration

The deploy workflow (`.github/workflows/deploy.yml`) runs the release gate automatically on every push to `main`.  
A failed gate blocks the deploy job.
