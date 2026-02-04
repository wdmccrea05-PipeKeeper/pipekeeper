/**
 * Lightweight client error logging for production observability.
 * Captures route, language, and stack traces for post-release diagnostics.
 */

import { base44 } from '@/api/base44Client';

const MAX_ERROR_LENGTH = 5000; // Prevent oversized payloads

/**
 * Sanitize error message to prevent logging sensitive data
 */
function sanitizeError(error) {
  if (!error) return 'Unknown error';
  
  const message = error.message || error.toString();
  
  // Remove sensitive patterns (URLs, emails, tokens)
  return message
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]')
    .slice(0, MAX_ERROR_LENGTH);
}

/**
 * Log client error to backend for observability
 */
export async function logClientError(error, context = {}) {
  try {
    const user = await base44.auth.me?.();
    
    const payload = {
      timestamp: new Date().toISOString(),
      message: sanitizeError(error),
      stack: error?.stack?.slice(0, MAX_ERROR_LENGTH),
      route: window.location.pathname,
      language: localStorage.getItem('language') || 'unknown',
      userAgent: navigator.userAgent?.slice(0, 200),
      userEmail: user?.email || 'anonymous',
      context: JSON.stringify(context).slice(0, 500),
    };
    
    // Send to backend (non-blocking)
    try {
      await base44.functions.invoke?.('logClientError', payload);
    } catch (err) {
      // Silently fail - don't let logging break the app
      console.debug('[ErrorLogger] Backend log failed:', err?.message);
    }
  } catch (err) {
    // Even safer fallback
    console.debug('[ErrorLogger] Error logging failed:', err?.message);
  }
}

/**
 * Setup global error handlers for production
 */
export function setupErrorHandlers() {
  // Uncaught errors
  window.addEventListener('error', (event) => {
    console.error('[Global] Uncaught error:', event.error);
    logClientError(event.error, { type: 'uncaught', filename: event.filename });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] Unhandled rejection:', event.reason);
    logClientError(event.reason, { type: 'unhandledRejection' });
  });
}

/**
 * Log a handled error for diagnostics (call this in catch blocks)
 */
export function logError(error, context = {}) {
  console.warn('[LogError]', context.label || 'Error:', error?.message);
  logClientError(error, { ...context, isHandled: true });
}