/**
 * imageSearchConfig.js
 *
 * Configuration for the hybrid product-image search pipeline.
 *
 * Provider A (Tier 1) — LLM with trusted-domain constraints
 *   Always available; uses base44 InvokeLLM with internet context.
 *
 * Provider B (Tier 2) — Structured image search fallback
 *   Activated when VITE_SERPAPI_KEY is set (SerpApi Google Images)
 *   OR when VITE_GOOGLE_API_KEY + VITE_GOOGLE_CSE_ID are both set
 *   (Google Programmable Search JSON API).
 *   Falls back to a second broader LLM call when neither key is present.
 */

export const IMAGE_SEARCH_CONFIG = {
  // Result count targets
  preferredResults: 6,
  minAcceptableResults: 3,
  maxResults: 6,

  // Per-provider timeout (ms).
  // Callers can wrap provider calls in Promise.race with this value to enforce
  // a hard deadline when integrating structured providers.
  providerTimeoutMs: 20_000,

  // SerpApi Google Images — https://serpapi.com/
  // Set VITE_SERPAPI_KEY in your .env to enable this provider.
  serpApiKey: import.meta.env.VITE_SERPAPI_KEY || null,
  serpApiEndpoint: 'https://serpapi.com/search.json',

  // Google Programmable Search Engine JSON API
  // Set both VITE_GOOGLE_API_KEY and VITE_GOOGLE_CSE_ID to enable.
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY || null,
  googleCseId:  import.meta.env.VITE_GOOGLE_CSE_ID  || null,
  googleSearchEndpoint: 'https://www.googleapis.com/customsearch/v1',

  // When true, always run the fallback provider even if Tier 1 returned
  // enough results — useful for broadening choice diversity.
  alwaysRunFallback: false,

  // Minimum confidence score (0–100) for a result to be included
  minConfidenceScore: 10,
};

/**
 * Returns true when the SerpApi provider is configured.
 * @returns {boolean}
 */
export function isSerpApiConfigured() {
  return !!IMAGE_SEARCH_CONFIG.serpApiKey;
}

/**
 * Returns true when the Google Programmable Search provider is configured.
 * @returns {boolean}
 */
export function isGoogleSearchConfigured() {
  return !!(IMAGE_SEARCH_CONFIG.googleApiKey && IMAGE_SEARCH_CONFIG.googleCseId);
}

/**
 * Returns true when any structured (non-LLM) fallback provider is available.
 * @returns {boolean}
 */
export function hasStructuredFallbackProvider() {
  return isSerpApiConfigured() || isGoogleSearchConfigured();
}
