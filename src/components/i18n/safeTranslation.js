/**
 * Canonical safeTranslation entry point.
 *
 * IMPORTANT: most app imports use '@/components/i18n/safeTranslation' without
 * a file extension. Vite resolves .js before .jsx, so this file must re-export
 * the in-app i18n hook. The previous react-i18next fallback caused raw key
 * leakage like hub.title / nav.hub / search.trigger across the app.
 */
export { useTranslation, translate, SUPPORTED_LANGS } from './index.jsx';
export { useTranslation as default } from './index.jsx';
