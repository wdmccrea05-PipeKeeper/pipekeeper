/**
 * safeTranslation — wraps the app's own i18n system (components/i18n/index.jsx).
 * Previously delegated to react-i18next which was never initialized, causing raw key leakage.
 */
export { useTranslation } from './index.jsx';
export default { useTranslation: null }; // named export is the canonical entry point