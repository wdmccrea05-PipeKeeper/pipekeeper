/**
 * imageSearchProviders.js
 *
 * Provider adapters for the hybrid product-image search pipeline.
 *
 * Provider A — LLM trusted-source search (always available)
 *   Uses base44 InvokeLLM with internet context, constrained to trusted
 *   domains via explicit source hints in the prompt.
 *
 * Provider B — Structured fallback (key-configured)
 *   Tries SerpApi Google Images first, then Google Programmable Search,
 *   then falls back to a second broader LLM call if no keys are present.
 *
 * Both providers return arrays of raw result objects that imageResultNormalizer
 * will convert into the standard NormalizedImageResult shape.
 *
 * IMPORTANT: Do not call React hooks here — this is a plain service module.
 */

import { base44 } from '@/api/base44Client';
import { trackedInvokeLLM } from '@/lib/integrationTelemetry';
import {
  IMAGE_SEARCH_CONFIG,
  isSerpApiConfigured,
  isGoogleSearchConfigured,
} from './imageSearchConfig.js';
import { buildImageQueries } from './imageQueryBuilder.js';
import { BOTTLE_TIER2_DOMAINS, BLEND_TIER2_DOMAINS, PIPE_TIER2_DOMAINS } from './trustedImageSources.js';

// ── JSON schema for LLM image responses ──────────────────────────────────────

const LLM_IMAGE_SCHEMA = {
  type: 'object',
  properties: {
    images: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:         { type: 'string' },
          image_url:     { type: 'string' },
          source_url:    { type: 'string' },
          source_domain: { type: 'string' },
          alt_text:      { type: 'string' },
          confidence:    { type: 'string' },
        },
      },
    },
  },
};

// ── LLM prompt builders ───────────────────────────────────────────────────────

function buildTier1LLMPrompt(entityType, fields, { seed, broad } = {}) {
  const { name, distillery, maker, manufacturer, region, country, shape } = fields;

  const subject =
    entityType === 'bottle'
      ? [distillery, name].filter(Boolean).join(' ')
      : entityType === 'blend'
        ? [manufacturer, name].filter(Boolean).join(' ')
        : [maker, name || shape].filter(Boolean).join(' ');

  const regionHint = region || country
    ? ` (${[region, country].filter(Boolean).join(', ')})`
    : '';

  const trustedDomains =
    entityType === 'bottle' ? BOTTLE_TIER2_DOMAINS.join(', ')
    : entityType === 'blend' ? BLEND_TIER2_DOMAINS.join(', ')
    : PIPE_TIER2_DOMAINS.join(', ');

  const entityNotes =
    entityType === 'bottle'
      ? 'Bottle images should show the label clearly. Prefer masterofmalt.com, thewhiskyexchange.com, and official distillery pages.'
      : entityType === 'blend'
        ? 'Blend images should show the tin or pouch label clearly. Prefer smokingpipes.com and official manufacturer pages.'
        : 'Pipe images should show the pipe clearly from the side or front. Label results from pipedia.org as reference images.';

  const variationNote = seed
    ? '\n- This is a re-search. Return DIFFERENT images from a previous attempt — use alternative sources or angles.'
    : '';

  const broadNote = broad
    ? '\n- Broaden the search: include related or similar products if an exact match is not found.'
    : '';

  return `You are a product image research assistant. Search the web for product images of the ${entityType} named "${subject}"${regionHint}.

Use internet search to find real product pages for this item. Return 6 to 8 results.

TRUSTED SOURCES to prioritize: ${trustedDomains}

${entityNotes}

For each result, provide:
- "title": the product name from the page
- "source_domain": the website domain (e.g. "smokingpipes.com")
- "source_url": the full product page URL
- "image_url": a direct URL ending in .jpg, .png, or .webp from a CDN if available; otherwise ""
- "alt_text": image alt text if available
${variationNote}${broadNote}

IMPORTANT RULES:
- Search for real product pages that exist right now.
- For smokingpipes.com, image URLs follow: https://www.smokingpipes.com/products/images/[product-id]/main/[filename].jpg
- For masterofmalt.com, image URLs follow: https://www.masterofmalt.com/whiskies/[path]/[filename].jpg
- Provide source_url even if image_url is not available.
- Return at least 4 results.

Return JSON with an "images" array of 6–8 entries.`;
}

// ── Provider A: LLM with trusted-domain constraints ───────────────────────────

/**
 * Run the Tier 1 LLM search targeting trusted domains.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields
 * @param {{ seed?: number, broad?: boolean }} [options]
 * @returns {Promise<Object[]>} Raw image result objects
 */
export async function runTier1LLMSearch(entityType, fields, options = {}) {
  const prompt = buildTier1LLMPrompt(entityType, fields, options);

  try {
    const result = await trackedInvokeLLM({
      prompt,
      response_json_schema: LLM_IMAGE_SCHEMA,
      add_context_from_internet: true,
    }, { feature: 'catalog.image_search', module: 'shared' });

    if (!result || !Array.isArray(result.images)) return [];
    return result.images.filter(Boolean);
  } catch {
    return [];
  }
}

// ── Provider B: SerpApi Google Images ────────────────────────────────────────

/**
 * Run a SerpApi Google Images search.
 * Returns raw items in a normalizer-compatible shape.
 *
 * @param {string} query
 * @returns {Promise<Object[]>}
 */
async function runSerpApiSearch(query) {
  const { serpApiKey, serpApiEndpoint } = IMAGE_SEARCH_CONFIG;
  if (!serpApiKey) return [];

  try {
    const url = new URL(serpApiEndpoint);
    url.searchParams.set('api_key', serpApiKey);
    url.searchParams.set('engine', 'google_images');
    url.searchParams.set('q', query);
    url.searchParams.set('num', '10');
    url.searchParams.set('safe', 'active');

    const resp = await fetch(url.toString());
    if (!resp.ok) return [];

    const data = await resp.json();
    const imagesRaw = data.images_results || [];

    return imagesRaw.map((img) => ({
      title:         img.title || '',
      image_url:     img.original || img.thumbnail || '',
      source_url:    img.link || img.source || '',
      source_domain: img.source || extractDomain(img.link),
      alt_text:      img.title || '',
      _provider:     'serpapi',
    }));
  } catch {
    return [];
  }
}

// ── Provider B: Google Programmable Search ────────────────────────────────────

/**
 * Run a Google Programmable Search (CSE) image query.
 *
 * @param {string} query
 * @returns {Promise<Object[]>}
 */
async function runGoogleCSESearch(query) {
  const { googleApiKey, googleCseId, googleSearchEndpoint } = IMAGE_SEARCH_CONFIG;
  if (!googleApiKey || !googleCseId) return [];

  try {
    const url = new URL(googleSearchEndpoint);
    url.searchParams.set('key', googleApiKey);
    url.searchParams.set('cx', googleCseId);
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', '10');
    url.searchParams.set('safe', 'active');

    const resp = await fetch(url.toString());
    if (!resp.ok) return [];

    const data = await resp.json();
    const items = data.items || [];

    return items.map((item) => ({
      title:         item.title || '',
      image_url:     item.link || '',
      source_url:    item.image?.contextLink || item.link || '',
      source_domain: extractDomain(item.image?.contextLink || item.link),
      alt_text:      item.title || '',
      thumbnail:     item.image?.thumbnailLink || '',
      _provider:     'google_cse',
    }));
  } catch {
    return [];
  }
}

// ── Provider B: Fallback broader LLM search ───────────────────────────────────

/**
 * Fallback LLM search with broadened parameters.
 * Used when no structured provider keys are configured.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields
 * @param {number} seed
 * @returns {Promise<Object[]>}
 */
async function runFallbackLLMSearch(entityType, fields, seed) {
  return runTier1LLMSearch(entityType, fields, { seed, broad: true });
}

// ── Provider B orchestrator ───────────────────────────────────────────────────

/**
 * Run the Tier 2 fallback search using the best available provider.
 * Priority: SerpApi → Google CSE → Broader LLM.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields
 * @param {number} [seed]
 * @returns {Promise<Object[]>}
 */
export async function runTier2FallbackSearch(entityType, fields, seed = Date.now()) {
  const { primary } = buildImageQueries(entityType, fields);
  const query = primary[0] || [fields.name, fields.distillery || fields.maker || fields.manufacturer].filter(Boolean).join(' ');

  if (isSerpApiConfigured()) {
    const results = await runSerpApiSearch(query);
    if (results.length > 0) return results;
  }

  if (isGoogleSearchConfigured()) {
    const results = await runGoogleCSESearch(query);
    if (results.length > 0) return results;
  }

  // No structured provider — use a second LLM call with broader scope
  return runFallbackLLMSearch(entityType, fields, seed);
}

// ── Utility ───────────────────────────────────────────────────────────────────

function extractDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
