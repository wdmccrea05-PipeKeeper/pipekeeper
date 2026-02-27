
// This file re-exports translations from the locale files via the index
// Import from the locales/index instead of a non-existent root translations.js
// Translations bundle: all 10 supported locales imported statically for sync access
import en from './locales/en.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import it from './locales/it.js';
import ptBR from './locales/pt-BR.js';
import nl from './locales/nl.js';
import pl from './locales/pl.js';
import ja from './locales/ja.js';
import zhHans from './locales/zh-Hans.js';

const translations = {
  en,
  es,
  fr,
  de,
  it,
  'pt-BR': ptBR,
  nl,
  pl,
  ja,
  'zh-Hans': zhHans,
};

export default translations;
