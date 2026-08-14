/**
 * integrationTelemetry.ts
 *
 * Canonical backend telemetry module for Base44 integration calls.
 *
 * Imported by backend functions (Deno/TypeScript) to log integration activity
 * to SubscriptionIntegrationEvent with structured feature attribution.
 *
 * Telemetry is best-effort: failures are logged to console but never throw,
 * so telemetry can never break the underlying user workflow.
 *
 * Feature attribution uses stable identifiers matching the frontend:
 *   curator.question, curator.signal_extraction,
 *   blend.enrichment, blend.reclassification, etc.
 */

export const INTEGRATION_ERROR_CATEGORIES = {
  VALID_ZERO_RESULTS: 'VALID_ZERO_RESULTS',
  INTEGRATION_UNAVAILABLE: 'INTEGRATION_UNAVAILABLE',
  INTEGRATION_CREDIT_EXHAUSTED: 'INTEGRATION_CREDIT_EXHAUSTED',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

/**
 * Classify an integration error into a canonical category.
 * Returns null when no error occurred.
 */
export function classifyIntegrationError(error: any): string | null {
  if (!error) return null;

  const message = String(error?.message || error || '').toLowerCase();

  if (
    message.includes('limit of integrations') ||
    message.includes('upgrade your plan') ||
    message.includes('credit limit') ||
    message.includes('quota') ||
    message.includes('monthly limit')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.INTEGRATION_CREDIT_EXHAUSTED;
  }

  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('throttle') ||
    message.includes('slow down')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.RATE_LIMITED;
  }

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout') ||
    message.includes('deadline')
  ) {
    return INTEGRATION_ERROR_CATEGORIES.TIMEOUT;
  }

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

  return INTEGRATION_ERROR_CATEGORIES.PROVIDER_ERROR;
}

/**
 * Check whether an error category is an infrastructure failure
 * (not a legitimate zero-result search).
 */
export function isInfrastructureFailure(category: string | null): boolean {
  if (!category) return false;
  return category !== INTEGRATION_ERROR_CATEGORIES.VALID_ZERO_RESULTS;
}

/**
 * Normalize a search query for telemetry (privacy-safe, max 100 chars).
 */
export function normalizeQueryForTelemetry(query: string | null | undefined): string | null {
  if (!query) return null;
  return String(query).toLowerCase().trim().substring(0, 100);
}

/**
 * Log an integration event to SubscriptionIntegrationEvent.
 * Best-effort: never throws, logs warning on failure.
 *
 * @param base44 - The base44 client (must support asServiceRole)
 * @param payload - Telemetry payload
 */
export async function trackIntegrationEvent(
  base44: any,
  payload: {
    feature: string;
    operation?: string;
    module?: string;
    model?: string | null;
    internetEnabled?: boolean;
    hasFileUrls?: boolean;
    success: boolean;
    errorCategory?: string | null;
    errorMessage?: string | null;
    durationMs?: number;
    retryCount?: number;
    fallbackCount?: number;
    batchSize?: number | null;
    cacheHit?: boolean | null;
    triggerContext?: string;
    invocationCount?: number;
    normalizedQuery?: string | null;
    backendFunction?: string;
    userId?: string | null;
    email?: string | null;
    eventSource?: string;
  }
): Promise<void> {
  try {
    const telemetryData = {
      feature: payload.feature,
      operation: payload.operation || null,
      module: payload.module || null,
      model: payload.model || null,
      internet_enabled: Boolean(payload.internetEnabled),
      has_file_urls: Boolean(payload.hasFileUrls),
      success: Boolean(payload.success),
      error_category: payload.errorCategory || null,
      error_message: payload.errorMessage || null,
      duration_ms: payload.durationMs || 0,
      retry_count: payload.retryCount || 0,
      fallback_count: payload.fallbackCount || 0,
      batch_size: payload.batchSize || null,
      cache_hit: payload.cacheHit ?? null,
      trigger_context: payload.triggerContext || 'user_action',
      invocation_count: payload.invocationCount || 1,
      normalized_query: payload.normalizedQuery || null,
      backend_function: payload.backendFunction || null,
    };

    await base44.asServiceRole.entities.SubscriptionIntegrationEvent.create({
      event_source: payload.eventSource || 'backend',
      event_type: payload.feature || payload.operation || 'integration',
      success: Boolean(payload.success),
      error: payload.errorMessage || null,
      user_id: payload.userId || null,
      email: payload.email || null,
      payload_json: JSON.stringify(telemetryData),
    });
  } catch (error) {
    console.warn('Integration telemetry logging failed:', error?.message || error);
  }
}