/**
 * useTranslation.js — compatibility shim
 *
 * This file previously contained a legacy async hook that always defaulted
 * to English and never read from localStorage. It has been replaced with a
 * re-export of the canonical hook from index.jsx so that any component
 * importing from this path gets the correct, reactive hook automatically.
 *
 * DO NOT add logic here. Use index.jsx directly for new code.
 */
export { useTranslation, translate, SUPPORTED_LANGS, setLanguage } from './index.jsx';
export { useTranslation as default } from './index.jsx';
