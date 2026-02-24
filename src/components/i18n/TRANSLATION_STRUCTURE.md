# PipeKeeper Translation Structure

## Overview

All translations live in a **single source of truth**: `translations.js`.

The `index.jsx` file exports:
- `useTranslation()` — React hook for components
- `translate(key, vars, language)` — plain function (outside React)
- `SUPPORTED_LANGS` — array of `{ code, label }` for all 10 languages
- `translations` — the raw translation object

## Supported Languages

| Code     | Label           |
|----------|-----------------|
| `en`     | English         |
| `es`     | Español         |
| `fr`     | Français        |
| `de`     | Deutsch         |
| `it`     | Italiano        |
| `pt-BR`  | Português (BR)  |
| `nl`     | Nederlands      |
| `pl`     | Polski          |
| `ja`     | 日本語          |
| `zh-Hans`| 中文 (简体)     |

## Namespace Map

```
translations
├── common          — loading, error, success states
├── nav             — navigation labels (home, pipes, tobacco)
├── ageGate         — age verification screen
├── search          — global search dialog
├── home            — home page cards and stats
├── insights        — collection insights tabs
├── smokingLog      — smoking log widget
└── tobacconist     — AI tobacconist module
```

## Usage in Components

### React components (hook)

```jsx
import { useTranslation } from '../i18n/index.jsx';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('home.title')}</h1>;
}
```

### With interpolation

```jsx
// Translation key:  "welcome": "Hello, {name}!"
t('welcome', { name: 'Alice' }) // → "Hello, Alice!"
```

### Outside React (utility)

```js
import { translate } from '../i18n/index.jsx';

const label = translate('nav.home', {}, 'fr'); // → "Accueil"
```

## Adding a New Key

1. Add the English key to the `en` block in `translations.js`
2. Add the translated value to **every** other language block
3. Use `t('namespace.key')` in your component

## Key Naming Conventions

- Use **camelCase** for key names: `tobaccoCellarTitle`
- Group by **feature namespace**: `home.tobaccoCellarTitle`
- Keep keys **descriptive but concise**
- Avoid nesting deeper than **2 levels**: `namespace.key`

## Language Detection

Language is stored in `localStorage` under the key `pk_lang`.

`normalizeLng.js` maps browser locale strings (e.g. `"en-US"`, `"pt_BR"`)
to the supported codes above. When no match is found it falls back to `"en"`.

## Fallback Behaviour

If a key is missing for the selected language, `useTranslation` and
`translate` automatically fall back to the English value. If the English
value is also missing, the raw key string is returned so that missing
translations are visible during development.
