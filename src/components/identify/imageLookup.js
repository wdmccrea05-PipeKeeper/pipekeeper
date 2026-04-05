/**
 * imageLookup.js
 *
 * Photo-based item identification using the Base44 LLM vision capabilities.
 * Uploads provided image file(s) then invokes LLM with structured extraction.
 *
 * Supports: pipe, blend (tobacco), bottle (whiskey)
 */

import { base44 } from '@/api/base44Client';
import { normalizeIdentifiedItem } from './normalizeIdentifiedItem';

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

Search for any stamps or hallmarks you identify.
Estimate whether this is a handmade artisan pipe or factory-made.
Provide an estimated market value range if you can identify the maker/model.`;

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
    identified_maker: { type: 'string' },
    model_or_series: { type: 'string' },
    country_of_origin: { type: 'string' },
    shape: { type: 'string' },
    bowlStyle: { type: 'string' },
    shankShape: { type: 'string' },
    bend: { type: 'string' },
    sizeClass: { type: 'string' },
    bowl_material: { type: 'string' },
    stem_material: { type: 'string' },
    finish: { type: 'string' },
    stamping_text: { type: 'string' },
    stampings: { type: 'array', items: { type: 'string' } },
    estimated_era: { type: 'string' },
    condition: { type: 'string' },
    confidence: { type: 'string' },
    confidence_score: { type: 'number' },
    estimated_value: { type: 'number' },
    estimated_value_range: { type: 'string' },
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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload image files to Base44 and return their CDN URLs.
 *
 * @param {File[]} files
 * @returns {Promise<string[]>}
 */
export async function uploadIdentifyImages(files) {
  const results = await Promise.all(
    files.map((file) => base44.integrations.Core.UploadFile({ file }))
  );
  return results.map((r) => r.file_url).filter(Boolean);
}

/**
 * Identify an item from one or more image URLs (already uploaded).
 *
 * @param {string[]} imageUrls      - CDN URLs of uploaded images
 * @param {"pipe"|"blend"|"bottle"} itemType
 * @returns {Promise<IdentifyResult>}
 */
export async function identifyByImageUrls(imageUrls, itemType) {
  const raw = await base44.integrations.Core.InvokeLLM({
    prompt: promptForType(itemType),
    add_context_from_internet: true,
    file_urls: imageUrls,
    response_json_schema: schemaForType(itemType),
  });

  return normalizeIdentifiedItem(raw, itemType, 'photo');
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
