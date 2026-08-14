/**
 * imageLookup.js
 *
 * Photo-based item identification using the Base44 LLM vision capabilities.
 * Uploads provided image file(s) then invokes LLM with structured extraction.
 *
 * Supports: pipe, blend (tobacco), bottle (whiskey)
 */

import { base44 } from '@/api/base44Client';
import { normalizeIdentifiedItem, normalizeSingleCandidate } from './normalizeIdentifiedItem';
import { trackedInvokeLLM, trackedUploadFile } from '@/lib/integrationTelemetry';
import { classifyIntegrationError, INTEGRATION_ERROR_CATEGORIES } from '@/lib/integrationErrorClassification';

// ── LLM prompts per item type ─────────────────────────────────────────────────

const PIPE_PHOTO_PROMPT = `Analyze the provided image(s) of a tobacco pipe. Identify the pipe and extract all visible details.

Look for:
1. Maker stamps, hallmarks, or brand markings on the bowl, shank, or stem
2. Pipe shape classification (Billiard, Dublin, Bent, Churchwarden, etc.)
3. Bowl style (Cylindrical, Conical, Rounded, etc.)
4. Shank shape (Round, Diamond, Square, Oval, etc.)
5. Bend degree (Straight, 1/4 Bent, 1/2 Bent, 3/4 Bent, Full Bent, S-Bend)
6. Size class (Vest Pocket, Small, Standard, Large, Magnum/XL)
7. Bowl and stem materials
8. Finish type (smooth, sandblast, rusticated, carved)
9. Visible condition
10. Era/age indicators and country of origin clues
11. Any model or series numbers
12. Shape number / shape code
13. Line or series name
14. Stem logo/marking
15. Inferable dimensions (length, bowl/chamber)

Search for any stamps or hallmarks you identify.
Estimate whether this is a handmade artisan pipe or factory-made.
Provide an estimated market value range if you can identify the maker/model.

Return multiple possible matches when uncertain.`;

const BLEND_PHOTO_PROMPT = `Analyze the provided image(s) of a tobacco blend tin, pouch, or packaging. Identify the product and extract all visible details.

Look for:
1. Brand/manufacturer name
2. Blend name
3. Blend family or type (English, Virginia, Aromatic, Burley, etc.)
4. Cut type (Ribbon, Flake, Broken Flake, Plug, Loose Leaf, etc.)
5. Tin or pouch size/weight
6. Country or region of origin if shown
7. Any "Limited Edition", "Discontinued", or special release markings
8. Approximate retail price if visible or known from the brand

Search for this product if you can identify it to provide additional details.
Note if this appears to be a limited run or hard-to-find blend.`;

const BOTTLE_PHOTO_PROMPT = `Analyze the provided image(s) of a whiskey or spirits bottle label. Identify the product and extract all visible details.

Look for:
1. Exact product/expression name
2. Distillery name
3. Region and country of origin
4. Type (Bourbon, Scotch Single Malt, Blended Scotch, Rye, Irish, Japanese, etc.)
5. Age statement (if visible)
6. ABV / proof (if visible)
7. Bottle size (if visible)
8. Any special edition, batch number, or limited release information
9. Any cask type or finishing information

Search for this product to provide retail price and rarity context.
Note if this is a limited release, allocated expression, or easy-to-find standard release.`;

const CIGAR_PHOTO_PROMPT = `Analyze the provided image(s) of a premium cigar, cigar band, or cigar box. Identify the product and extract all visible details.

Look for:
1. Brand name on the band or box
2. Line / series name (e.g. "Serie V", "Anejo", "Hemingway")
3. Vitola / size format (e.g. Robusto, Toro, Churchill, Lancero, Gordo)
4. Wrapper leaf color and origin if visible or stated on band (Colorado Claro, Maduro, Habano, Connecticut, etc.)
5. Country of origin or factory name if shown
6. Any edition / release markings (Limited Edition, Annual Release, etc.)
7. Ring gauge and length if printed
8. Band design or logo details that help identify the maker

Search for this cigar to provide additional details such as binder, filler, body profile, and approximate retail price.
Note if this is a limited release, a regular production vitola, or a special collaboration.`;

function promptForType(itemType) {
  if (itemType === 'pipe') return PIPE_PHOTO_PROMPT;
  if (itemType === 'blend') return BLEND_PHOTO_PROMPT;
  if (itemType === 'cigar') return CIGAR_PHOTO_PROMPT;
  return BOTTLE_PHOTO_PROMPT;
}

// ── Response schemas per item type ───────────────────────────────────────────

const PIPE_SCHEMA = {
  type: 'object',
  properties: {
    candidates: { type: 'array', items: { type: 'object' } },
    identified_maker: { type: 'string' },
    line_or_series: { type: 'string' },
    model_or_series: { type: 'string' },
    shape_number: { type: 'string' },
    shape_code: { type: 'string' },
    country_of_origin: { type: 'string' },
    shape: { type: 'string' },
    bowlStyle: { type: 'string' },
    shankShape: { type: 'string' },
    bend: { type: 'string' },
    sizeClass: { type: 'string' },
    bowl_material: { type: 'string' },
    material: { type: 'string' },
    stem_material: { type: 'string' },
    stem_logo: { type: 'string' },
    finish: { type: 'string' },
    stamping_text: { type: 'string' },
    stampings: { type: 'array', items: { type: 'string' } },
    estimated_era: { type: 'string' },
    era_date_range: { type: 'string' },
    condition: { type: 'string' },
    condition_notes: { type: 'string' },
    dimensions: { type: 'string' },
    confidence: { type: 'string' },
    confidence_score: { type: 'number' },
    estimated_value: { type: 'number' },
    estimated_value_range: { type: 'string' },
    evidence_used: { type: 'array', items: { type: 'string' } },
    missing_fields: { type: 'array', items: { type: 'string' } },
    uncertain_fields: { type: 'array', items: { type: 'string' } },
    handmade_hint: { type: 'string' },
    identification_notes: { type: 'string' },
  },
};

const BLEND_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    manufacturer: { type: 'string' },
    blend_type: { type: 'string' },
    strength: { type: 'string' },
    cut: { type: 'string' },
    packaging_size: { type: 'string' },
    region: { type: 'string' },
    country: { type: 'string' },
    production_status: { type: 'string' },
    discontinued_hint: { type: 'boolean' },
    retail_price: { type: 'number' },
    flavor_notes: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string' },
    confidence_score: { type: 'number' },
  },
};

const BOTTLE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    distillery: { type: 'string' },
    region: { type: 'string' },
    country: { type: 'string' },
    type: { type: 'string' },
    age: { type: 'number' },
    abv: { type: 'number' },
    bottle_size: { type: 'string' },
    special_edition: { type: 'string' },
    batch: { type: 'string' },
    tasting_notes: { type: 'string' },
    estimated_price: { type: 'number' },
    rarity_hint: { type: 'string' },
    replacement_hint: { type: 'string' },
    confidence: { type: 'string' },
    confidence_score: { type: 'number' },
  },
};

const CIGAR_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    brand: { type: 'string' },
    line: { type: 'string' },
    vitola: { type: 'string' },
    wrapper: { type: 'string' },
    binder: { type: 'string' },
    filler: { type: 'string' },
    country_of_origin: { type: 'string' },
    factory: { type: 'string' },
    body: { type: 'string' },
    strength: { type: 'string' },
    flavor_notes: { type: 'array', items: { type: 'string' } },
    production_status: { type: 'string' },
    release_type: { type: 'string' },
    length_inches: { type: 'number' },
    ring_gauge: { type: 'number' },
    retail_price: { type: 'number' },
    rarity_hint: { type: 'string' },
    limited_hint: { type: 'string' },
    confidence: { type: 'string' },
    confidence_score: { type: 'number' },
  },
};

function schemaForType(itemType) {
  if (itemType === 'pipe') return PIPE_SCHEMA;
  if (itemType === 'blend') return BLEND_SCHEMA;
  if (itemType === 'cigar') return CIGAR_SCHEMA;
  return BOTTLE_SCHEMA;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IDENTIFY_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function logImageIdentify(event, payload = {}) {
  // eslint-disable-next-line no-console
  console.info('[ImageIdentify]', JSON.stringify({ event, ...payload }));
}

function createIdentifyError(code, userMessage, details = {}) {
  const error = new Error(userMessage);
  error.code = code;
  error.userMessage = userMessage;
  error.details = details;
  return error;
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateImageFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw createIdentifyError('NO_IMAGES', 'Please add at least one image to identify this pipe.');
  }

  for (const file of files) {
    const type = String(file?.type || '').toLowerCase();
    if (!type.startsWith('image/')) {
      throw createIdentifyError('UNSUPPORTED_FILE_TYPE', 'Unsupported file type. Please upload image files only.');
    }
    if (type && !SUPPORTED_IDENTIFY_TYPES.has(type)) {
      throw createIdentifyError('UNSUPPORTED_FILE_TYPE', 'Unsupported image type. Please use JPG, PNG, WEBP, or HEIC.');
    }
    if (typeof file?.size === 'number' && file.size > MAX_IMAGE_SIZE_BYTES) {
      throw createIdentifyError('IMAGE_TOO_LARGE', 'Image is too large. Please use images smaller than 10MB.');
    }
  }
}

function buildPipeFallbackSearchTerms(raw = {}, normalized = null) {
  const top = normalized?.candidates?.[0] || {};
  const details = top.details || {};
  const terms = [
    top.maker,
    details.line_series,
    details.shape_number,
    details.shape,
    details.stamping,
    raw.stamping_text,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  return terms || '';
}

function buildLowConfidenceFallback(itemType, raw = {}, reason = 'Low confidence image identification') {
  const partialRaw = itemType === 'pipe'
    ? {
        identified_maker: raw.identified_maker || raw.maker || '',
        model_or_series: raw.model_or_series || raw.name || 'Unidentified Pipe',
        shape: raw.shape || '',
        shape_number: raw.shape_number || raw.shape_code || '',
        stamping_text: raw.stamping_text || '',
        confidence: 'low',
        confidence_score: 20,
        identification_notes: reason,
      }
    : {
        ...raw,
        confidence: 'low',
        confidence_score: 20,
      };

  const fallbackCandidate = normalizeSingleCandidate(partialRaw, itemType, 'photo');
  return {
    itemType,
    confidence: 'low',
    confidenceScore: 20,
    candidates: fallbackCandidate ? [fallbackCandidate] : [],
    selected: fallbackCandidate || null,
    fallback: true,
    fallbackMessage: reason || 'We could not identify this confidently, but found possible matches.',
    fallbackSearchTerms: itemType === 'pipe' ? buildPipeFallbackSearchTerms(raw) : '',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload image files to Base44 and return their CDN URLs.
 *
 * @param {File[]} files
 * @returns {Promise<string[]>}
 */
export async function uploadIdentifyImages(files) {
  validateImageFiles(files);
  logImageIdentify('upload_request_sent', { fileCount: files.length });

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const response = await trackedUploadFile({ file }, {
          feature: 'photo.upload',
          triggerContext: 'user_action',
        });
        if (!response?.file_url) {
          throw createIdentifyError('MISSING_IMAGE_URL', 'Upload completed but no image URL was returned.');
        }
        return response;
      } catch (error) {
        if (error?.code) throw error;
        throw createIdentifyError('UPLOAD_FAILED', 'Failed to upload image. Please try again.', { message: error?.message });
      }
    })
  );

  const urls = results.map((r) => r.file_url).filter(Boolean);
  logImageIdentify('upload_success', { uploadedCount: urls.length });
  return urls;
}

/**
 * Identify an item from one or more image URLs (already uploaded).
 *
 * @param {string[]} imageUrls      - CDN URLs of uploaded images
 * @param {"pipe"|"blend"|"bottle"} itemType
 * @returns {Promise<IdentifyResult>}
 */
export async function identifyByImageUrls(imageUrls, itemType) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw createIdentifyError('NO_IMAGE_URLS', 'Missing image URL. Please re-upload and try again.');
  }
  if (imageUrls.some((url) => !isValidHttpUrl(url))) {
    throw createIdentifyError('INVALID_IMAGE_URL', 'One or more uploaded images are invalid. Please upload again.');
  }

  logImageIdentify('ai_request_sent', { itemType, imageCount: imageUrls.length });

  let raw;
  try {
    raw = await trackedInvokeLLM({
      prompt: promptForType(itemType),
      add_context_from_internet: true,
      file_urls: imageUrls,
      response_json_schema: schemaForType(itemType),
    }, {
      feature: `photo.${itemType}.identification`,
      module: itemType === 'pipe' ? 'pipekeeper' : itemType === 'blend' ? 'pipekeeper' : itemType === 'cigar' ? 'cigarkeeper' : itemType === 'wine' ? 'winekeeper' : 'whiskeykeeper',
      internetEnabled: true,
      hasFileUrls: true,
      triggerContext: 'user_action',
    });
  } catch (error) {
    const category = classifyIntegrationError(error);
    if (category === INTEGRATION_ERROR_CATEGORIES.TIMEOUT) {
      throw createIdentifyError('NETWORK_TIMEOUT', 'Identification timed out. Please try again.');
    }
    if (category === INTEGRATION_ERROR_CATEGORIES.INTEGRATION_UNAVAILABLE) {
      throw createIdentifyError('MISSING_API_CONFIG', 'Image identification is temporarily unavailable. Please try again later.');
    }
    if (category === INTEGRATION_ERROR_CATEGORIES.INTEGRATION_CREDIT_EXHAUSTED) {
      throw createIdentifyError('CREDIT_EXHAUSTED', 'AI identification is temporarily unavailable. You can still add this item manually with your photo.');
    }
    throw createIdentifyError('AI_REQUEST_FAILED', 'Photo identification failed. Please try again or add manually.', { message: error?.message });
  }

  if (!raw || typeof raw !== 'object') {
    logImageIdentify('ai_response_malformed', { itemType });
    return buildLowConfidenceFallback(itemType, {}, 'Malformed AI response');
  }

  logImageIdentify('ai_response_received', {
    itemType,
    hasCandidates: Array.isArray(raw.candidates),
    confidence: raw.confidence || null,
    confidenceScore: raw.confidence_score ?? null,
  });

  const normalized = normalizeIdentifiedItem(raw, itemType, 'photo');
  const fallbackSearchTerms = buildPipeFallbackSearchTerms(raw, normalized);

  if (!normalized.candidates.length) {
    logImageIdentify('ai_response_empty', { itemType });
    return buildLowConfidenceFallback(itemType, raw, 'Empty detection response');
  }

  logImageIdentify('ai_response_parsed', {
    itemType,
    candidateCount: normalized.candidates.length,
    confidence: normalized.confidence,
    confidenceScore: normalized.confidenceScore,
    fallbackSearchTerms,
  });

  return {
    ...normalized,
    fallbackSearchTerms,
  };
}

/**
 * Upload image files and identify the item in one step.
 *
 * @param {File|File[]} imageInput  - Single File or array of Files
 * @param {"pipe"|"blend"|"bottle"} itemType
 * @returns {Promise<IdentifyResult>}
 */
export async function identifyByImage(imageInput, itemType) {
  const files = Array.isArray(imageInput) ? imageInput : [imageInput];
  const urls = await uploadIdentifyImages(files);
  return identifyByImageUrls(urls, itemType);
}