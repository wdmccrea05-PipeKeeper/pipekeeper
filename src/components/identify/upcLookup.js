/**
 * upcLookup.js
 *
 * Looks up an item by UPC/barcode code using the Base44 LLM with internet
 * context. Routes the result through the shared normalizeIdentifiedItem layer.
 *
 * Supports: pipe, blend (tobacco), bottle (whiskey), cigar
 */

import { base44 } from '@/api/base44Client';
import { normalizeIdentifiedItem } from './normalizeIdentifiedItem';

// ── LLM prompts per item type ─────────────────────────────────────────────────

function buildUPCPrompt(code, itemType) {
  let typeHint;
  if (itemType === 'blend') typeHint = 'The item is expected to be a tobacco blend.';
  else if (itemType === 'bottle') typeHint = 'The item is expected to be a whiskey/spirits bottle.';
  else if (itemType === 'cigar') typeHint = 'The item is expected to be a premium cigar.';
  else if (itemType === 'pipe') typeHint = 'The item is expected to be a tobacco pipe.';
  else typeHint = 'The item may be a tobacco pipe, tobacco blend, whiskey/spirits bottle, or premium cigar.';

  return `Look up this UPC/barcode code and identify the product: ${code}

${typeHint}

Search product databases, retailer listings, and any available sources to identify this exact product.

Return a JSON object with:
- name: exact product name
- maker: manufacturer / distillery / pipe maker / cigar brand
- category: product category or type
- confidence: "high" | "medium" | "low" (how certain the identification is)
- confidence_score: number 0-100

For tobacco blends also include:
- manufacturer
- blend_type
- strength
- cut
- packaging_size (e.g. "1.75 oz tin", "50g pouch")
- region / country
- production_status (e.g. "active", "discontinued")
- retail_price (approximate MSRP in USD if known)
- discontinued_hint (true/false or null)

For whiskey / spirits bottles also include:
- distillery
- type (Bourbon, Scotch, Rye, Irish, etc.)
- age (numeric years, or null)
- abv (percent, numeric, or null)
- bottle_size (e.g. "750ml")
- region
- country
- special_edition
- estimated_price (approximate MSRP in USD if known)
- rarity_hint (e.g. "limited release", "standard", or null)

For pipes also include:
- identified_maker
- model_or_series
- shape
- bowl_material
- stem_material
- finish
- country_of_origin
- estimated_value (approximate market value in USD if known)
- handmade_hint ("handmade", "factory", or null)

For premium cigars also include:
- brand
- line (series within the brand)
- vitola (size/format e.g. Robusto, Toro, Churchill)
- wrapper (e.g. Connecticut Shade, Maduro, Habano)
- binder
- filler
- country_of_origin
- factory
- body (mild / mild_medium / medium / medium_full / full)
- strength (mild / mild_medium / medium / medium_full / full)
- production_status (regular_production / limited / discontinued / seasonal / unknown)
- release_type (regular / limited_edition / annual_release / special_release)
- retail_price (approximate MSRP in USD if known)
- rarity_hint (e.g. "limited release", "standard", or null)

If the UPC cannot be identified, return confidence "low" and leave fields empty.`;
}

// JSON schema for UPC lookup response
const UPC_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    maker: { type: 'string' },
    category: { type: 'string' },
    confidence: { type: 'string' },
    confidence_score: { type: 'number' },

    // Blend fields
    manufacturer: { type: 'string' },
    blend_type: { type: 'string' },
    strength: { type: 'string' },
    cut: { type: 'string' },
    packaging_size: { type: 'string' },
    region: { type: 'string' },
    country: { type: 'string' },
    production_status: { type: 'string' },
    retail_price: { type: 'number' },
    discontinued_hint: { type: 'boolean' },

    // Bottle fields
    distillery: { type: 'string' },
    type: { type: 'string' },
    age: { type: 'number' },
    abv: { type: 'number' },
    bottle_size: { type: 'string' },
    special_edition: { type: 'string' },
    estimated_price: { type: 'number' },
    rarity_hint: { type: 'string' },

    // Pipe fields
    identified_maker: { type: 'string' },
    model_or_series: { type: 'string' },
    shape: { type: 'string' },
    bowl_material: { type: 'string' },
    stem_material: { type: 'string' },
    finish: { type: 'string' },
    country_of_origin: { type: 'string' },
    estimated_value: { type: 'number' },
    handmade_hint: { type: 'string' },

    // Cigar fields
    brand: { type: 'string' },
    line: { type: 'string' },
    vitola: { type: 'string' },
    wrapper: { type: 'string' },
    binder: { type: 'string' },
    filler: { type: 'string' },
    factory: { type: 'string' },
    body: { type: 'string' },
    release_type: { type: 'string' },
    limited_hint: { type: 'string' },
  },
};

// ── Detect item type from UPC result when no hint provided ────────────────────

function detectItemTypeFromResult(raw) {
  if (raw.distillery || raw.abv || raw.bottle_size) return 'bottle';
  if (raw.manufacturer || raw.blend_type || raw.cut || raw.packaging_size) return 'blend';
  if (raw.identified_maker || raw.bowl_material || raw.stem_material) return 'pipe';
  if (raw.brand || raw.vitola || raw.wrapper || raw.binder) return 'cigar';
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up an item by UPC/barcode code.
 *
 * @param {string} code             - Scanned or typed UPC/barcode
 * @param {"pipe"|"blend"|"bottle"|null} itemTypeHint - Optional item type hint
 * @returns {Promise<IdentifyResult>}
 */
export async function identifyByUPC(code, itemTypeHint = null) {
  const trimmedCode = String(code || '').trim();
  if (!trimmedCode) {
    return {
      itemType: itemTypeHint || 'blend',
      confidence: 'low',
      confidenceScore: 0,
      candidates: [],
      selected: null,
    };
  }

  const raw = await base44.integrations.Core.InvokeLLM({
    prompt: buildUPCPrompt(trimmedCode, itemTypeHint),
    add_context_from_internet: true,
    response_json_schema: UPC_RESPONSE_SCHEMA,
  });

  // Inject the original scanned/typed code so normalizers can preserve it
  const rawWithCode = { ...raw, _inputBarcode: trimmedCode };

  // Resolve final item type — cigar falls back to 'blend' only when no hint and can't detect
  const resolvedType = itemTypeHint || detectItemTypeFromResult(raw) || 'blend';

  return normalizeIdentifiedItem(rawWithCode, resolvedType, 'upc');
}
