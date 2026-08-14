/**
 * integrationTelemetry.js
 *
 * Canonical frontend telemetry wrapper for Base44 integration calls.
 *
 * Every integration-consuming operation (InvokeLLM, UploadFile, vision
 * identification, internet-enabled search) should route through these
 * wrappers so that telemetry is recorded consistently to
 * SubscriptionIntegrationEvent.
 *
 * Telemetry is fire-and-forget: it never blocks or breaks the user workflow.
 *
 * Feature attribution uses stable identifiers:
 *   quick_add.pipe.search, quick_add.blend.search, quick_add.cigar.search,
 *   quick_add.whiskey.search, quick_add.wine.search,
 *   curator.question, curator.signal_extraction,
 *   blend.enrichment, blend.reclassification,
 *   photo.pipe.identification, photo.blend.identification,
 *   photo.cigar.identification, photo.whiskey.identification,
 *   photo.wine.identification,
 *   catalog.image_search, catalog.upc_lookup,
 *   recommendation.find_similar
 */

import { base44 } from '@/api/base44Client';
import {
  classifyIntegrationError,
  normalizeQueryForTelemetry,
} from './integrationErrorClassification';

/**
 * Fire-and-forget telemetry log to SubscriptionIntegrationEvent.
 * Never throws, never blocks, never returns a promise the caller must await.
 *
 * @param {Object} payload
 */
export function logIntegrationEvent(payload) {
  try {
    const telemetryPayload = {
      feature: payload.feature || null,
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

    // Fire-and-forget — catch silently
    base44.entities.SubscriptionIntegrationEvent.create({
      event_source: payload.eventSource || 'app',
      event_type: payload.feature || payload.operation || 'integration',
      success: Boolean(payload.success),
      error: payload.errorMessage || null,
      payload_json: JSON.stringify(telemetryPayload),
    }).catch(() => {
      // Silently ignore — telemetry must never break the workflow
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Tracked InvokeLLM — wraps base44.integrations.Core.InvokeLLM with telemetry.
 *
 * @param {Object} params - InvokeLLM parameters (prompt, response_json_schema, etc.)
 * @param {Object} attribution - Telemetry attribution { feature, module, ... }
 * @returns {Promise<any>} - The InvokeLLM result, or throws with classification
 */
export async function trackedInvokeLLM(params, attribution = {}) {
  const startTime = Date.now();
  const { add_context_from_internet, file_urls, model } = params;

  try {
    const result = await base44.integrations.Core.InvokeLLM(params);

    logIntegrationEvent({
      ...attribution,
      operation: 'InvokeLLM',
      success: true,
      durationMs: Date.now() - startTime,
      model: model || null,
      internetEnabled: Boolean(add_context_from_internet),
      hasFileUrls: Boolean(
        file_urls && (Array.isArray(file_urls) ? file_urls.length > 0 : Boolean(file_urls))
      ),
      normalizedQuery: attribution.normalizedQuery || null,
    });

    return result;
  } catch (error) {
    const category = classifyIntegrationError(error);

    logIntegrationEvent({
      ...attribution,
      operation: 'InvokeLLM',
      success: false,
      durationMs: Date.now() - startTime,
      model: model || null,
      internetEnabled: Boolean(add_context_from_internet),
      hasFileUrls: Boolean(
        file_urls && (Array.isArray(file_urls) ? file_urls.length > 0 : Boolean(file_urls))
      ),
      errorCategory: category,
      errorMessage: error?.message,
      normalizedQuery: attribution.normalizedQuery || null,
    });

    // Attach classification to the error for callers
    error._integrationErrorCategory = category;
    throw error;
  }
}

/**
 * Tracked UploadFile — wraps base44.integrations.Core.UploadFile with telemetry.
 *
 * @param {Object} params - UploadFile parameters { file }
 * @param {Object} attribution - Telemetry attribution { feature, module, ... }
 * @returns {Promise<{file_url: string}>}
 */
export async function trackedUploadFile(params, attribution = {}) {
  const startTime = Date.now();

  try {
    const result = await base44.integrations.Core.UploadFile(params);

    logIntegrationEvent({
      ...attribution,
      operation: 'UploadFile',
      success: true,
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    const category = classifyIntegrationError(error);

    logIntegrationEvent({
      ...attribution,
      operation: 'UploadFile',
      success: false,
      durationMs: Date.now() - startTime,
      errorCategory: category,
      errorMessage: error?.message,
    });

    error._integrationErrorCategory = category;
    throw error;
  }
}

export { classifyIntegrationError, normalizeQueryForTelemetry };