/**
 * integrationErrorClassification.js
 *
 * Canonical error classification for Base44 integration calls.
 *
 * Distinguishes infrastructure failures from legitimate zero-result searches
 * so the UI never shows "No results" when the real problem is credit exhaustion,
 * rate limiting, or a provider outage.
 *
 * Shared by both the frontend telemetry wrapper and the search service.
 */

export const INTEGRATION_ERROR_CATEGORIES = {
  VALID_ZERO_RESULTS: 'VALID_ZERO_RESULTS',
  INTEGRATION_UNAVAILABLE: 'INTEGRATION_UNAVAILABLE',
  INTEGRATION_CREDIT_EXHAUSTED: 'INTEGRATION_CREDIT_EXHAUSTED',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
};

/**
 * Classify an integration error into a canonical category.
 *
 * Returns null when the error is null/undefined (no error occurred).
 * Returns VALID_ZERO_RESULTS when the integration succeeded but produced
 * no trusted results — this is NOT an error, it's a legitimate empty response.
 *
 * @param {Error|{message?:string}|null|undefined} error
 * @returns {string|null}
 */
export function classifyIntegrationError(error) {
  if (!error) return null;

  const message = String(error?.message || error || '').toLowerCase();

  // Credit exhaustion — Base44 monthly limit
  if (
    message.includes('limit of integrations') ||
    message.includes('upgrade your plan') ||
    message.includes('credit limit') ||
    message.includes('quota') ||
    message.includes('monthly limit')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.INTEGRATION_CREDIT_EXHAUSTED;
  }

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('throttle') ||
    message.includes('slow down')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.RATE_LIMITED;
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout') ||
    message.includes('deadline')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.TIMEOUT;
  }

  // Authentication / configuration
  if (
    message.includes('api key') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('403') ||
    message.includes('missing api')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.INTEGRATION_UNAVAILABLE;
  }

  // Provider-side errors
  if (
    message.includes('500') ||
    message.includes('internal server error') ||
    message.includes('service unavailable') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('bad gateway') ||
    message.includes('network error') ||
    message.includes('fetch failed') ||
    message.includes('econnrefused') ||
    message.includes('econnreset')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.PROVIDER_ERROR;
  }

  // Default: treat unknown errors as provider errors
  return INTEGRATION_ERROR_CATEGORIES.PROVIDER_ERROR;
}

/**
 * Check whether an error category represents an infrastructure failure
 * (as opposed to a legitimate zero-result search).
 *
 * @param {string|null} category
 * @returns {boolean}
 */
export function isInfrastructureFailure(category) {
  if (!category) return false;
  return category !== INTEGRATION_ERROR_CATEGORIES.VALID_ZERO_RESULTS;
}

/**
 * Get a safe, user-facing message for an error category.
 * Never exposes internal error details, credentials, or stack traces.
 *
 * @param {string|null} category
 * @returns {string|null}
 */
export function getUserFacingMessage(category) {
  switch (category) {
    case INTEGRATION_ERROR_CATEGORIES.INTEGRATION_CREDIT_EXHAUSTED:
    case INTEGRATION_ERROR_CATEGORIES.INTEGRATION_UNAVAILABLE:
    case INTEGRATION_ERROR_CATEGORIES.RATE_LIMITED:
    case INTEGRATION_ERROR_CATEGORIES.TIMEOUT:
    case INTEGRATION_ERROR_CATEGORIES.PROVIDER_ERROR:
      return 'Search is temporarily unavailable. You can try again later or add this item manually.';
    case INTEGRATION_ERROR_CATEGORIES.PARSE_ERROR:
      return 'Search results could not be processed. Please try again or add this item manually.';
    default:
      return null;
  }
}

/**
 * Normalize a search query for telemetry (privacy-safe).
 * Lowercases, trims, and truncates to 100 chars. Does NOT log the full prompt.
 *
 * @param {string} query
 * @returns {string|null}
 */
export function normalizeQueryForTelemetry(query) {
  if (!query) return null;
  return String(query).toLowerCase().trim().substring(0, 100);
}