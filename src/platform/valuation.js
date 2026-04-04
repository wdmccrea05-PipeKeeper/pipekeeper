// platform/valuation.js
// Shared valuation service for the CollectionKeeper platform.
//
// Centralizes purchase price, estimated value, and total collection value logic
// so that future modules (WhiskeyKeeper, CigarKeeper, etc.) can reuse the same
// framework without duplicating logic.
//
// Works with both raw module records and normalized platform items.
// All items — including ai_excluded ones — count toward collection value.

/**
 * Resolve the best available value for a single item.
 * Prefers estimated_value; falls back to purchase_price; defaults to 0.
 *
 * @param {object} item - Raw or normalized item record.
 * @returns {number}
 */
export function getItemValue(item) {
  if (!item) return 0;
  const v = item.estimated_value ?? item.purchase_price ?? 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

/**
 * Sum the value of every item in a collection using getItemValue.
 *
 * @param {object[]} items
 * @returns {number}
 */
export function calculateCollectionValue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + getItemValue(item), 0);
}

/**
 * Produce a full valuation summary for a collection.
 * Suitable for dashboard cards, reports, and future cross-module hub totals.
 *
 * @param {object[]} items
 * @returns {{
 *   itemCount: number,
 *   totalPurchasePrice: number,
 *   totalEstimatedValue: number,
 *   totalValue: number,
 *   averageValue: number,
 * }}
 */
export function getValueSummary(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      itemCount: 0,
      totalPurchasePrice: 0,
      totalEstimatedValue: 0,
      totalValue: 0,
      averageValue: 0,
    };
  }

  const totalPurchasePrice = items.reduce((sum, item) => {
    const v = item?.purchase_price ?? 0;
    return sum + (typeof v === "number" ? v : parseFloat(v) || 0);
  }, 0);

  const totalEstimatedValue = items.reduce((sum, item) => {
    const v = item?.estimated_value ?? 0;
    return sum + (typeof v === "number" ? v : parseFloat(v) || 0);
  }, 0);

  const totalValue = calculateCollectionValue(items);

  return {
    itemCount: items.length,
    totalPurchasePrice,
    totalEstimatedValue,
    totalValue,
    averageValue: totalValue / items.length,
  };
}

/**
 * Aggregate valuation summaries across multiple modules.
 * Keys are module type strings (e.g. "pipe", "tobacco").
 *
 * @param {Record<string, object[]>} itemsByModule
 * @returns {Record<string, ReturnType<getValueSummary>> & { combined: ReturnType<getValueSummary> }}
 */
export function getMultiModuleValueSummary(itemsByModule) {
  const result = {};
  const allItems = [];

  for (const [moduleType, items] of Object.entries(itemsByModule)) {
    result[moduleType] = getValueSummary(items);
    allItems.push(...items);
  }

  result.combined = getValueSummary(allItems);
  return result;
}

// ---------------------------------------------------------------------------
// Shared valuation action helpers
// ---------------------------------------------------------------------------

/**
 * Save a value checkpoint (ItemValueSnapshot) for any item.
 *
 * @param {object} entities - base44.entities (pass in to avoid circular import)
 * @param {object} item - Raw item record
 * @param {string} moduleKey - 'pipekeeper' | 'whiskeykeeper' | ...
 * @param {string} itemType - 'pipe' | 'tobacco' | 'bottle' | ...
 * @param {string} createdBy - User email
 * @param {object} [opts] - Optional: { valuationSnapshot, note }
 * @returns {Promise<object>} Created snapshot record
 */
export async function saveItemValueCheckpoint(entities, item, moduleKey, itemType, createdBy, opts = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const snap = opts.valuationSnapshot || {};
  return entities.ItemValueSnapshot.create({
    module_key: moduleKey,
    item_type: itemType,
    item_id: item.id,
    created_by: createdBy,
    snapshot_date: today,
    computed_current_value: snap.currentValue || null,
    value_confidence: snap.confidence || 'low',
    source: snap.source || null,
    rarity_score: snap.rarityScore ?? null,
    replacement_difficulty: snap.replacementDifficulty || null,
    recommendation: snap.holdRecommendation || null,
    notes: opts.note || null,
    is_auto_generated: false,
  });
}

/**
 * Add a price observation for any item.
 *
 * @param {object} entities - base44.entities
 * @param {string} moduleKey
 * @param {string} itemType - 'pipe' | 'tobacco' | 'bottle' | ...
 * @param {string} itemId
 * @param {string} createdBy
 * @param {object} observation - { observed_price, price_type, source_name, ... }
 * @returns {Promise<object>} Created observation record
 */
export async function addPriceObservation(entities, moduleKey, itemType, itemId, createdBy, observation) {
  const today = new Date().toISOString().slice(0, 10);
  return entities.PriceObservation.create({
    module_key: moduleKey,
    item_type: itemType,
    item_id: itemId,
    created_by: createdBy,
    observed_price: Number(observation.observed_price),
    price_type: observation.price_type || 'retail',
    source_name: observation.source_name || null,
    source_url: observation.source_url || null,
    observed_date: observation.observed_date || today,
    condition_note: observation.condition_note || null,
    fill_level: observation.fill_level || null,
    region: observation.region || null,
    currency: observation.currency || 'USD',
    is_manual: true,
  });
}

/**
 * Update manual valuation inputs on an item record.
 * Works for pipes, tobacco blends, and bottles via the appropriate entity.
 *
 * @param {object} entityHandle - base44.entities.Pipe / TobaccoBlend / Bottle etc.
 * @param {string} itemId
 * @param {object} fields - Key/value pairs of valuation-driving fields to update
 * @returns {Promise<void>}
 */
export async function updateManualValuationInputs(entityHandle, itemId, fields) {
  return entityHandle.update(itemId, fields);
}
