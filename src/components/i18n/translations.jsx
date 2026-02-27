// This file re-exports translations from the locale files via the index
// Import from the locales/index instead of a non-existent root translations.js
import en from './locales/en.js';

// The canonical translations object is keyed by language code
// Other locales are loaded lazily via locales/index.js
// For synchronous use (useTranslation hook), we pre-bundle all locales here

let _translations = null;

function getTranslations() {
  if (_translations) return _translations;
  
  // Start with English as the base
  _translations = { en };
  
  // Eagerly import all supported locales synchronously
  try { _translations['es'] = require('./locales/es.js').default; } catch {}
  try { _translations['fr'] = require('./locales/fr.js').default; } catch {}
  try { _translations['de'] = require('./locales/de.js').default; } catch {}
  try { _translations['it'] = require('./locales/it.js').default; } catch {}
  try { _translations['pt-BR'] = require('./locales/pt-BR.js').default; } catch {}
  try { _translations['nl'] = require('./locales/nl.js').default; } catch {}
  try { _translations['pl'] = require('./locales/pl.js').default; } catch {}
  try { _translations['ja'] = require('./locales/ja.js').default; } catch {}
  try { _translations['zh-Hans'] = require('./locales/zh-Hans.js').default; } catch {}
  
  return _translations;
}

export default getTranslations();