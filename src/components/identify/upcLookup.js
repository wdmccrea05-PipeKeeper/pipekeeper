/**
 * upcLookup.js
 *
 * Looks up an item by UPC/barcode code using the Base44 LLM with internet
 * context. Routes the result through the shared normalizeIdentifiedItem layer.
 *
 * Supports: pipe, blend (tobacco), bottle (whiskey)
 */

import { base44 } from '@/api/base44Client';
import { normalizeIdentifiedItem } from './normalizeIdentifiedItem';

// ── LLM prompts per item type ─────────────────────────────────────────────────

function buildUPCPrompt(code, itemType) {
  const typeHint = itemType
    ? `The item is expected to be a ${itemType === 'blend' ? 'tobacco blend' : itemType === 'bottle' ? 'whiskey/spirits bottle' : 'tobacco pipe'}.`
    : 'The item may be a tobacco pipe, tobacco blend, or whiskey/spirits bottle.';

  return `Look up this UPC/barcode code and identify the product: ${code}

${typeHint}

Search product databases, retailer listings, and any available sources to identify this exact product.

Return a JSON object with:
- name: exact product name
- maker: manufacturer / distillery / pipe maker
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
  },
};

// ── Detect item type from UPC result when no hint provided ────────────────────

function detectItemTypeFromResult(raw) {
  if (raw.distillery || raw.abv || raw.bottle_size) return 'bottle';
  if (raw.manufacturer || raw.blend_type || raw.cut || raw.packaging_size) return 'blend';
  if (raw.identified_maker || raw.bowl_material || raw.stem_material) return 'pipe';
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

  // Resolve final item type
  const resolvedType = itemTypeHint || detectItemTypeFromResult(raw) || 'blend';

  return normalizeIdentifiedItem(raw, resolvedType, 'upc');
}
