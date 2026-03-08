# i18n Regression Guard

## Overview

`scripts/i18n-check.js` is a lightweight static-analysis script that scans
production source files for newly introduced hardcoded user-facing strings.
Its goal is to prevent i18n backsliding — catching raw English text that
should use `t("some.key")` — without blocking development on day one.

It **reuses** the proper-noun allowlist and exclude patterns already defined in
`src/components/i18n/auditConfig.json.jsx`.

---

## Running the check

```bash
# Warn mode (default) — prints findings, exits 0
npm run i18n:check

# Fail mode — exits 1 when findings exist (use in CI enforcement)
npm run i18n:check -- --fail-on-findings
```

Both `i18n:check` and `i18n:audit` are available as npm script aliases.

---

## What is scanned

| Included | Excluded |
|---|---|
| `src/pages/*` | `src/components/admin/*` |
| `src/components/*` | `src/components/debug/*` |
| | `src/pages/Admin*.jsx` |
| | `src/pages/SubscriptionEventsLog*.jsx` |
| | `src/pages/SubscriptionE2ETest*.jsx` |
| | `*.test.jsx`, `*.spec.jsx` |
| | `node_modules/`, `functions/` |

---

## What is detected

The script looks for five categories of hardcoded user-facing strings:

| Rule | What it catches | Example |
|---|---|---|
| `jsx-text-content` | Raw English text inside JSX elements | `<Button>Save</Button>` |
| `jsx-placeholder` | Hardcoded `placeholder` attributes | `placeholder="Enter name..."` |
| `jsx-aria-label` | Hardcoded `aria-label` attributes | `aria-label="Close dialog"` |
| `jsx-title-attr` | Hardcoded `title` attributes | `title="More info"` |
| `jsx-alt-text` | Hardcoded `alt` attributes | `alt="Profile image"` |
| `toast-hardcoded` | String literals passed to `toast.*()` | `toast.success("Saved!")` |

Strings shorter than 4 characters, all-caps constants, URLs, and values
already in the **proper-noun allowlist** in `auditConfig.json.jsx` are
automatically ignored.

---

## Example output

```
⚠️   i18n Regression Guard — Hardcoded String Report
============================================================
   Files scanned : 321
   Findings      : 3 (0 errors, 3 warnings)

📄  src/components/pipes/ImageCropper.jsx
  ⚠️   line 610  [jsx-text-content]
      "Cancel"
  ⚠️   line 614  [jsx-text-content]
      "Apply Crop"

📄  src/components/community/ShareCard.jsx
  ⚠️   line 29  [toast-hardcoded]
      "Share card downloaded"

────────────────────────────────────────────────────────────
How to fix flagged strings:
  1. Add a translation key to translations.js (all languages).
  2. Import useTranslation in the component.
  3. Replace the raw string with a t() call.
  4. If a string is a proper noun, add it to auditConfig.json.jsx.
────────────────────────────────────────────────────────────
```

---

## How to fix a flagged string

### Step 1 — Add a key to `translations.js`

Open `translations.js` (project root) and add the string to the relevant
namespace for all supported languages:

```js
// translations.js  (simplified)
export default {
  en: {
    common: {
      cancel: "Cancel",
      apply:  "Apply",
    },
  },
  es: {
    common: {
      cancel: "Cancelar",
      apply:  "Aplicar",
    },
  },
  // … other languages …
};
```

### Step 2 — Use `useTranslation` in the component

```jsx
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function MyComponent() {
  const { t } = useTranslation();
  // …
}
```

### Step 3 — Replace the raw string

```jsx
// Before
<Button>Cancel</Button>

// After
<Button>{t("common.cancel")}</Button>
```

For `placeholder`, `aria-label`, `title`, and `alt` attributes:

```jsx
// Before
<Input placeholder="Enter name..." />

// After
<Input placeholder={t("forms.namePlaceholder")} />
```

For toast messages:

```jsx
// Before
toast.success("Share card downloaded");

// After
toast.success(t("shareCard.downloaded"));
```

### Step 4 — If the string is a proper noun or brand name

Add it to the `properNounAllowlist` array in
`src/components/i18n/auditConfig.json.jsx`:

```json
{
  "properNounAllowlist": [
    "PipeKeeper",
    "Base44",
    "YourBrandName"
  ]
}
```

---

## Adding to CI

To make the check run automatically on every pull request, add it to your
CI workflow **after** the build step:

```yaml
# .github/workflows/ci.yml  (example)
- name: i18n regression check
  run: npm run i18n:check
```

When you are ready to enforce the rule and block merges on new findings,
switch to:

```yaml
- name: i18n regression check (enforced)
  run: npm run i18n:check -- --fail-on-findings
```

---

## Relationship to existing audit tools

| Tool | Location | Purpose |
|---|---|---|
| `auditConfig.json.jsx` | `src/components/i18n/` | Shared allowlist & config |
| `i18nAuditReports.jsx` | `src/components/utils/` | Runtime DOM audit (browser) |
| `hardcoded_strings_user_facing.jsx` | `src/components/i18n/_audit/` | Manual audit output log |
| **`scripts/i18n-check.js`** | `scripts/` | **Static CLI regression guard** |
| `functions/i18nAudit.ts` | `functions/` | Server-side admin audit (Deno) |

The CLI script is the only tool that can be run locally and in CI without
a browser or server — making it the right fit for automated regression
prevention.
