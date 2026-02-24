# Translation Audit Checklist

Use this checklist when adding i18n support to a component or verifying
translation coverage for a release.

---

## Phase 2 — Complete Translation Keys

### Per-component audit steps

- [ ] Open the component file
- [ ] Search for hardcoded English strings (see patterns below)
- [ ] Create a translation key for each string in `translations.js` (all 10 languages)
- [ ] Replace the hardcoded string with `t('namespace.key')`
- [ ] Verify the component renders correctly in English
- [ ] Spot-check at least one non-English language

### Common hardcoded patterns to find

```
- Button labels:       "Save", "Cancel", "Add", "Delete", "Edit"
- Form labels:         "Name", "Description", "Notes"
- Placeholders:        "Enter...", "Type here..."
- Headings / titles:   "My Pipes", "Tobacco Cellar"
- Status messages:     "Saved!", "Error saving", "Loading..."
- Toast messages:      "Pipe added", "Changes saved"
- Empty states:        "No pipes found", "Your collection is empty"
- Confirmations:       "Are you sure?", "This cannot be undone"
- Help text / tooltips
```

### Ripgrep command to find hardcoded strings

```bash
# Find JSX elements with literal English text content
rg -n '>([ \t]*[A-Z][a-z].*?)</' --type jsx

# Find hardcoded strings in JSX props
rg -n '(placeholder|title|label|aria-label)="[A-Z]' --type jsx
```

---

## Component Coverage Tracker

Mark each component as you complete its translation pass.

### Pages

- [ ] Home (`src/pages/Home.jsx`)
- [ ] Pipes (`src/pages/Pipes.jsx`)
- [ ] Tobacco (`src/pages/Tobacco.jsx`)
- [ ] Insights (`src/pages/Insights.jsx`)
- [ ] Settings (`src/pages/Settings.jsx`)

### Core Components

- [ ] Layout / NavBar (`src/Layout.jsx`)
- [ ] Search Dialog
- [ ] Age Gate
- [ ] Language Selector

### Feature Components

- [ ] AI Tobacconist (`src/components/agent/`)
- [ ] Collection Optimizer (`src/components/ai/`)
- [ ] AI Updates Panel
- [ ] Pipe Detail / Edit forms
- [ ] Tobacco Detail / Edit forms
- [ ] Smoking Log
- [ ] Help Center (`src/components/i18n/helpContent.jsx`)

---

## Phase 3 — Replace Hardcoded Strings

For each component above:

1. Add `import { useTranslation } from '../i18n/index.jsx';` if not present
2. Destructure: `const { t } = useTranslation();`
3. Replace every hardcoded string with `t('namespace.key')`
4. Test in at least 3 languages: EN, ES, JA

---

## Phase 4 — Validation

- [ ] Run app in every supported language and visually scan each page
- [ ] Confirm no raw translation keys appear (e.g. `"home.title"` showing verbatim)
- [ ] Confirm no English text appears in non-English languages
- [ ] Verify `localStorage.getItem('pk_lang')` persists across page reloads
- [ ] Verify AI Tobacconist responses are in the correct language
- [ ] Run `npm run build` — no errors
- [ ] Run `npm run lint` — no new errors introduced

---

## Adding a New Language

1. Add `{ code: 'xx', label: 'Language Name' }` to `SUPPORTED_LANGS` in `index.jsx`
2. Add the full `xx: { ... }` block to `translations.js` (copy English as template)
3. Add normalization rules to `normalizeLng.js` if needed
4. Translate every key value
5. Test all pages in the new language
