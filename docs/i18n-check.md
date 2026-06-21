# i18n Regression Guard

## Overview

`scripts/i18n-check.js` is a lightweight static-analysis script that scans
production source files for newly introduced hardcoded user-facing strings.
Its goal is to prevent i18n backsliding — catching raw English text that
should use `t("some.key")` — without blocking development on day one.

It **reuses** the proper-noun allowlist and exclude patterns already defined in
`src/components/i18n/auditConfig.json.jsx`.

---

## Three layers of enforcement

The project enforces translation hygiene at three levels so issues are caught
as early as possible:

| Layer | Tool | When it runs | Blocks? |
|---|---|---|---|
| **Editor** | ESLint `i18n-guard` rules | While you type | Warning in IDE |
| **Pre-commit** | Git hook via `install-hooks.sh` | On every `git commit` | Yes — blocks if budget exceeded |
| **CI** | `release:check` in `deploy.yml` | On every push / PR | Yes — blocks deployment |

---

## 1. Editor (ESLint)

The custom `i18n-guard` plugin in `eslint.config.js` adds two rules:

| Rule | What it catches |
|---|---|
| `i18n-guard/no-hardcoded-text` | JSX text nodes with raw English (≥ 5 chars, ≥ 2 words) |
| `i18n-guard/no-hardcoded-attr-string` | `placeholder`, `aria-label`, `title`, `alt` with string literals |

Both are set to **`"warn"`** so the build never fails due to pre-existing
violations, but any new hardcoded string you write will show up as a yellow
squiggle immediately in VS Code, WebStorm, or any ESLint-aware editor.

**Translation locale files are excluded** from these rules — they intentionally
contain raw English strings as values.

---

## 2. Pre-commit hook

Install the hook once after cloning:

```bash
bash scripts/install-hooks.sh
```

It is also installed automatically when you run `npm install` (via the
`prepare` lifecycle script).

The hook runs `npm run i18n:check -- --max-findings=<budget>` before every
commit. If your staged changes push the total finding count above the budget,
the commit is blocked with a clear message:

```
❌  Commit blocked: new hardcoded strings detected.
   Fix the flagged strings with t("namespace.key") before committing.
   See docs/i18n-check.md for the full workflow.
```

Skip the hook only in genuine emergencies:

```bash
git commit --no-verify   # bypasses ALL hooks — use sparingly
```

---

## 3. CI gate (`release:check`)

The `deploy.yml` workflow runs `npm run release:check` which includes:

```bash
node scripts/i18n-check.js --max-findings=2567 && npm test
```

The budget (`--max-findings=2567`) represents the current number of findings.
**This number must never increase.** When you fix strings, lower the budget to
match the new count so future contributors cannot re-introduce the violations.

To lower the budget after a cleanup:

```bash
npm run i18n:check        # note the "Findings" count in the output
# Edit package.json → release:check → update --max-findings=<new count>
```

---

## Running the check

```bash
# Warn mode (default) — prints findings, exits 0
npm run i18n:check

# Fail mode — exits 1 when findings exist (use in CI enforcement)
npm run i18n:check:strict

# With budget gate
npm run i18n:check -- --max-findings=2567
```

---

## Workflow for adding new UI text

Every string visible to the user **must** go through the i18n system.
Follow these steps whenever you add new UI text:

### Step 1 — Add the key to `en.ui.jsx`

Open `src/components/i18n/locales/en.ui.jsx` and add the English value to the
appropriate namespace:

```js
// src/components/i18n/locales/en.ui.jsx
myFeature: {
  saveButton: "Save Changes",
  emptyState: "No items yet — add one to get started.",
  placeholder: "Search by name…",
},
```

### Step 2 — Use `useTranslation` in the component

```jsx
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function MyFeature() {
  const { t } = useTranslation();
  return (
    <>
      <Input placeholder={t("myFeature.placeholder")} />
      <Button>{t("myFeature.saveButton")}</Button>
      <p>{t("myFeature.emptyState")}</p>
    </>
  );
}
```

### Step 3 — The fallback system handles missing locale keys

The i18n system falls back to `translations.en` for any key missing in the
active locale. This means you **only need to add the key to `en.ui.jsx`** for
the app to work. Non-English locales will show English until a translator adds
the key to the relevant `<locale>.ui.jsx` file.

### Step 4 — Add translations for non-English locales (batch or on-demand)

When you have a batch of new keys, add them to each locale file:

```
src/components/i18n/locales/es.ui.jsx    Spanish
src/components/i18n/locales/fr.ui.jsx    French
src/components/i18n/locales/de.ui.jsx    German
src/components/i18n/locales/it.ui.jsx    Italian
src/components/i18n/locales/pt-BR.ui.jsx Portuguese (Brazil)
src/components/i18n/locales/nl.ui.jsx    Dutch
src/components/i18n/locales/pl.ui.jsx    Polish
src/components/i18n/locales/ja.ui.jsx    Japanese
src/components/i18n/locales/zh-Hans.ui.jsx  Simplified Chinese
```

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
| | `src/components/i18n/**` (locale files) |
| | `node_modules/`, `functions/` |

---

## What is detected

| Rule | What it catches | Example |
|---|---|---|
| `jsx-text-content` | Raw English text inside JSX elements | `<Button>Save</Button>` |
| `jsx-placeholder` | Hardcoded `placeholder` attributes | `placeholder="Enter name..."` |
| `jsx-aria-label` | Hardcoded `aria-label` attributes | `aria-label="Close dialog"` |
| `jsx-title-attr` | Hardcoded `title` attributes | `title="More info"` |
| `jsx-alt-text` | Hardcoded `alt` attributes | `alt="Profile image"` |
| `toast-hardcoded` | String literals passed to `toast.*()` | `toast.success("Saved!")` |

Strings shorter than 4 characters, all-caps constants, URLs, and values in
the **proper-noun allowlist** in `auditConfig.json.jsx` are automatically
ignored.

---

## Adding a proper noun or brand name exception

If a string should legitimately appear untranslated (brand name, technical
term), add it to the `properNounAllowlist` in
`src/components/i18n/auditConfig.json.jsx`:

```json
{
  "properNounAllowlist": [
    "PipeKeeper",
    "CollectionKeeper",
    "MyNewBrand"
  ]
}
```

Keep this list intentional — it is not a dumping ground for strings that are
hard to translate.

---

## Relationship to existing audit tools

| Tool | Location | Purpose |
|---|---|---|
| `eslint-plugin-i18n-guard.js` | `scripts/` | ESLint plugin — editor-time warnings |
| `install-hooks.sh` | `scripts/` | Installs the pre-commit hook |
| `i18n-check.js` | `scripts/` | Static CLI regression guard (CI + pre-commit) |
| `auditConfig.json.jsx` | `src/components/i18n/` | Shared allowlist & config |
| `i18nAuditReports.jsx` | `src/components/utils/` | Runtime DOM audit (browser) |
| `hardcoded_strings_user_facing.jsx` | `src/components/i18n/_audit/` | Manual audit output log |
| `functions/i18nAudit.ts` | `functions/` | Server-side admin audit (Deno) |

