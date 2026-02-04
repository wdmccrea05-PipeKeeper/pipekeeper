/**
 * Translation Completeness Validator
 * Ensures all translation keys exist in all supported languages
 * Run with: node components/i18n/translationValidator.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

// Recursively get all keys from an object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// Load translation file
function loadTranslations(lang) {
  try {
    const filePath = path.join(__dirname, `translations-${lang}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Translation file not found: ${filePath}`);
      return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error loading ${lang} translations:`, error.message);
    return {};
  }
}

// Main validation
console.log('🔍 Validating translation completeness...\n');

// Load English as reference
const enTranslations = loadTranslations('en');
const enKeys = new Set(getAllKeys(enTranslations));

console.log(`📊 Base language (EN): ${enKeys.size} keys\n`);

let allValid = true;
const summary = [];

SUPPORTED_LANGUAGES.forEach(lang => {
  if (lang === 'en') return;
  
  const translations = loadTranslations(lang);
  const langKeys = new Set(getAllKeys(translations));
  
  const missing = [...enKeys].filter(key => !langKeys.has(key));
  const extra = [...langKeys].filter(key => !enKeys.has(key));
  
  const coverage = ((langKeys.size / enKeys.size) * 100).toFixed(1);
  
  console.log(`\n🌍 Language: ${lang.toUpperCase()}`);
  console.log(`   Coverage: ${coverage}% (${langKeys.size}/${enKeys.size} keys)`);
  
  if (missing.length > 0) {
    allValid = false;
    console.log(`   ❌ Missing ${missing.length} keys:`);
    missing.slice(0, 10).forEach(key => console.log(`      - ${key}`));
    if (missing.length > 10) {
      console.log(`      ... and ${missing.length - 10} more`);
    }
  }
  
  if (extra.length > 0) {
    console.log(`   ⚠️  Extra ${extra.length} keys (not in EN):`);
    extra.slice(0, 5).forEach(key => console.log(`      - ${key}`));
    if (extra.length > 5) {
      console.log(`      ... and ${extra.length - 5} more`);
    }
  }
  
  if (missing.length === 0 && extra.length === 0) {
    console.log(`   ✅ Complete!`);
  }
  
  summary.push({
    lang,
    coverage: parseFloat(coverage),
    missing: missing.length,
    extra: extra.length,
  });
});

console.log('\n\n📊 SUMMARY\n');
console.log('Language | Coverage | Missing | Extra');
console.log('---------|----------|---------|------');
summary.forEach(s => {
  const status = s.missing === 0 ? '✅' : '❌';
  console.log(`${s.lang.padEnd(8)} | ${s.coverage.toFixed(1).padStart(6)}% | ${String(s.missing).padStart(7)} | ${String(s.extra).padStart(5)} ${status}`);
});

if (allValid) {
  console.log('\n✅ All translations are complete!\n');
  process.exit(0);
} else {
  console.log('\n❌ Some translations are incomplete. Please add missing keys.\n');
  process.exit(1);
}