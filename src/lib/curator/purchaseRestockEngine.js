/**
 * Purchase & Restock Engine
 *
 * Generates structured purchase/restock recommendations with real
 * shopping list actions — not advisory-only.
 *
 * Outputs SHOPPING_LIST_ACTION type recommendations for:
 *   - Low stock favorites (tobacco blends)
 *   - Depleted favorites (quantity = 0 but still active)
 *   - Wishlist items ready for shopping list
 *   - Bottles at low stock / last pour
 *   - Cigar discovery candidates (if cigars module present)
 */

import {
  createRecommendation,
  CATEGORY,
  ACTION_TYPE,
  MODULE_KEY,
  OWNERSHIP_CONTEXT,
  PRIORITY,
} from './recommendationSchema.js';

// ─── Thresholds ───────────────────────────────────────────────────────────────

const LOW_STOCK_OZ         = 2.0;   // below 2 oz = low stock
const CRITICAL_STOCK_OZ    = 0.5;   // below 0.5 oz = critical
const LOW_BOTTLE_POURS     = 3;     // fewer than 3 pours remaining
const MAX_ITEMS_PER_REC    = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalOz(blend) {
  if (typeof blend.quantity_oz === 'number') return blend.quantity_oz;
  if (typeof blend.total_oz === 'number') return blend.total_oz;
  // Try to compute from containers if present
  const containers = blend.containers || [];
  if (containers.length) {
    return containers.reduce((sum, c) => sum + (Number(c.quantity_oz) || 0), 0);
  }
  return null; // unknown
}

function isFavorite(blend) {
  return blend.is_favorite || blend.favorite || (blend.rating != null && blend.rating >= 4);
}

function isBottleLowStock(bottle) {
  const remaining = Number(bottle.remaining_pours ?? bottle.current_pours ?? bottle.pours_remaining);
  if (!isNaN(remaining)) return remaining <= LOW_BOTTLE_POURS && remaining > 0;
  const percent = Number(bottle.fill_level_percent ?? bottle.fill_percent);
  if (!isNaN(percent)) return percent <= 20 && percent > 0;
  return false;
}

function isBottleDepleted(bottle) {
  const remaining = Number(bottle.remaining_pours ?? bottle.current_pours ?? bottle.pours_remaining);
  if (!isNaN(remaining)) return remaining === 0;
  const percent = Number(bottle.fill_level_percent ?? bottle.fill_percent);
  if (!isNaN(percent)) return percent === 0;
  return false;
}

// ─── Tobacco: Low Stock Favorites ─────────────────────────────────────────────

function analyzeLowStockBlends(blends) {
  const results = [];

  const lowStock = blends.filter((b) => {
    const oz = totalOz(b);
    return oz !== null && oz > 0 && oz <= LOW_STOCK_OZ && isFavorite(b);
  }).slice(0, MAX_ITEMS_PER_REC);

  if (lowStock.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'low_stock_favorites',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Low Stock Favorites',
      summary:          `${lowStock.length} favorite blend${lowStock.length > 1 ? 's are' : ' is'} running low`,
      whyItMatters:     'These are blends you rate highly. Restocking before they run out prevents a gap in your rotation.',
      moduleKey:        MODULE_KEY.TOBACCO,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.HIGH,
      confidence:       'high',
      items: lowStock.map((b) => ({
        id:             b.id,
        recordId:       b.id,
        recordType:     'blend',
        recordName:     b.name,
        itemName:       b.name,
        name:           b.name,
        brand:          b.manufacturer || b.brand || '',
        manufacturer:   b.manufacturer || '',
        quantityOz:     totalOz(b),
        ownershipStatus:'in_collection',
        shoppingType:   'restock',
        itemType:       'blend',
      })),
      actionPayload: {
        shoppingType: 'restock',
        itemType:     'blend',
      },
    }));
  }

  return results;
}

// ─── Tobacco: Depleted Favorites ──────────────────────────────────────────────

function analyzeDepletedBlends(blends) {
  const depleted = blends.filter((b) => {
    const oz = totalOz(b);
    return (oz !== null && oz <= 0 && isFavorite(b)) ||
           (b.quantity === 0 && isFavorite(b));
  }).slice(0, MAX_ITEMS_PER_REC);

  if (!depleted.length) return [];

  return [createRecommendation({
    category:         CATEGORY.PURCHASE,
    goal:             'depleted_favorites',
    actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:            'Depleted Favorites',
    summary:          `${depleted.length} favorite blend${depleted.length > 1 ? 's' : ''} fully depleted`,
    whyItMatters:     'Your top-rated blends are out of stock. Add them to your shopping list to restock.',
    moduleKey:        MODULE_KEY.TOBACCO,
    ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority:         PRIORITY.HIGH,
    confidence:       'high',
    items: depleted.map((b) => ({
      id:             b.id,
      recordId:       b.id,
      recordType:     'blend',
      recordName:     b.name,
      itemName:       b.name,
      name:           b.name,
      brand:          b.manufacturer || b.brand || '',
      manufacturer:   b.manufacturer || '',
      quantityOz:     0,
      ownershipStatus:'in_collection',
      shoppingType:   'restock',
      itemType:       'blend',
    })),
    actionPayload: {
      shoppingType: 'restock',
      itemType:     'blend',
    },
  })];
}

// ─── Whiskey: Low Stock & Depleted ────────────────────────────────────────────

function analyzeBottleRestock(bottles) {
  const results = [];

  const lowStock = bottles.filter(isBottleLowStock).slice(0, MAX_ITEMS_PER_REC);
  if (lowStock.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'low_stock_bottles',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Whiskey Running Low',
      summary:          `${lowStock.length} bottle${lowStock.length > 1 ? 's are' : ' is'} nearly empty`,
      whyItMatters:     'These bottles have limited pours remaining. Add them to your shopping list if you want to restock.',
      moduleKey:        MODULE_KEY.WHISKEY,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.MEDIUM,
      confidence:       'high',
      items: lowStock.map((b) => ({
        id:             b.id,
        recordId:       b.id,
        recordType:     'bottle',
        recordName:     b.name,
        itemName:       b.name,
        name:           b.name,
        brand:          b.distillery || b.brand || '',
        ownershipStatus:'in_collection',
        shoppingType:   'restock',
        itemType:       'bottle',
      })),
      actionPayload: {
        shoppingType: 'restock',
        itemType:     'bottle',
      },
    }));
  }

  const depleted = bottles.filter(isBottleDepleted).slice(0, MAX_ITEMS_PER_REC);
  if (depleted.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'depleted_bottles',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Depleted Bottles',
      summary:          `${depleted.length} bottle${depleted.length > 1 ? 's' : ''} fully depleted`,
      whyItMatters:     'These bottles are empty. Add them to your shopping list to restock your favorites.',
      moduleKey:        MODULE_KEY.WHISKEY,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.MEDIUM,
      confidence:       'high',
      items: depleted.map((b) => ({
        id:             b.id,
        recordId:       b.id,
        recordType:     'bottle',
        recordName:     b.name,
        itemName:       b.name,
        name:           b.name,
        brand:          b.distillery || b.brand || '',
        ownershipStatus:'in_collection',
        shoppingType:   'restock',
        itemType:       'bottle',
      })),
      actionPayload: {
        shoppingType: 'restock',
        itemType:     'bottle',
      },
    }));
  }

  return results;
}

// ─── Wishlist Candidates ───────────────────────────────────────────────────────

function analyzeWishlistCandidates(wantListItems = []) {
  // Items on wish list (not yet on shopping list) that could move to shopping
  const wishlist = wantListItems.filter((item) =>
    item.category === 'wishlist' || item.list_type === 'wishlist'
  ).slice(0, MAX_ITEMS_PER_REC);

  if (!wishlist.length) return [];

  return [createRecommendation({
    category:         CATEGORY.PURCHASE,
    goal:             'wishlist_ready',
    actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:            'Wishlist Ready for Shopping',
    summary:          `${wishlist.length} wishlist item${wishlist.length > 1 ? 's' : ''} ready to move to shopping list`,
    whyItMatters:     'These items are on your wish list. Move them to your shopping list when you\'re ready to buy.',
    moduleKey:        MODULE_KEY.MULTI,
    ownershipContext: OWNERSHIP_CONTEXT.EXTERNAL,
    priority:         PRIORITY.LOW,
    confidence:       'medium',
    items: wishlist.map((w) => ({
      id:             w.id,
      recordId:       w.id,
      recordType:     w.item_type || 'blend',
      recordName:     w.name || w.blend_name || w.pipe_model || '—',
      itemName:       w.name || w.blend_name || w.pipe_model || '—',
      name:           w.name || w.blend_name || w.pipe_model || '—',
      brand:          w.brand || w.manufacturer || '',
      ownershipStatus:'wishlist',
      shoppingType:   'buy_new_item',
      itemType:       w.item_type || 'blend',
    })),
    actionPayload: {
      shoppingType: 'buy_new_item',
    },
  })];
}

// ─── Cigar Discovery ──────────────────────────────────────────────────────────

/**
 * Generate cigar discovery recommendations.
 * Only called when cigar module is active/internal.
 *
 * Uses existing cigar data to suggest:
 * - Cigars with low inventory that the user smokes regularly
 * - Cigars with aging potential that could use more stock
 */
function analyzeCigarDiscovery(cigars = []) {
  if (!cigars.length) return [];

  const results = [];

  // Low-quantity cigars (qty ≤ 3) that are in active collection
  const lowQtyCigars = cigars
    .filter((c) => {
      const qty = Number(c.quantity ?? c.available_quantity ?? c.initial_quantity);
      return !isNaN(qty) && qty > 0 && qty <= 3;
    })
    .slice(0, MAX_ITEMS_PER_REC);

  if (lowQtyCigars.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.CIGAR_DISCOVERY,
      goal:             'cigar_low_inventory',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Cigars Running Low',
      summary:          `${lowQtyCigars.length} cigar${lowQtyCigars.length > 1 ? 's are' : ' is'} low in your humidor`,
      whyItMatters:     'These cigars are nearly out of stock in your humidor. Consider restocking before they run out.',
      moduleKey:        MODULE_KEY.CIGAR,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.MEDIUM,
      confidence:       'high',
      items: lowQtyCigars.map((c) => ({
        id:             c.id,
        recordId:       c.id,
        recordType:     'cigar',
        recordName:     c.name || c.brand,
        itemName:       c.name || c.brand,
        name:           c.name || c.brand,
        brand:          c.brand || c.manufacturer || '',
        quantity:       Number(c.quantity ?? c.available_quantity ?? c.initial_quantity),
        ownershipStatus:'in_collection',
        shoppingType:   'restock',
        itemType:       'cigar',
      })),
      actionPayload: {
        shoppingType: 'restock',
        itemType:     'cigar',
      },
    }));
  }

  // Cigars with aging potential (have a recommended aging date or are premium)
  const agingCandidates = cigars
    .filter((c) => {
    const hasAging = (c.recommended_age_years != null && c.recommended_age_years > 0) || c.aging_potential === 'high' || c.aging_potential === 'excellent';
      const qty = Number(c.quantity ?? c.available_quantity ?? c.initial_quantity);
      return hasAging && qty <= 2;
    })
    .slice(0, MAX_ITEMS_PER_REC);

  if (agingCandidates.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.CIGAR_DISCOVERY,
      goal:             'cigar_aging_stock_up',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Age-Worthy Cigars to Stock Up',
      summary:          `${agingCandidates.length} age-worthy cigar${agingCandidates.length > 1 ? 's' : ''} running low`,
      whyItMatters:     'These cigars benefit from aging and you have few remaining. Stock up to build your aging inventory.',
      moduleKey:        MODULE_KEY.CIGAR,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.MEDIUM,
      confidence:       'medium',
      items: agingCandidates.map((c) => ({
        id:             c.id,
        recordId:       c.id,
        recordType:     'cigar',
        recordName:     c.name || c.brand,
        itemName:       c.name || c.brand,
        name:           c.name || c.brand,
        brand:          c.brand || c.manufacturer || '',
        ownershipStatus:'in_collection',
        shoppingType:   'restock',
        itemType:       'cigar',
      })),
      actionPayload: {
        shoppingType: 'restock',
        itemType:     'cigar',
      },
    }));
  }

  return results;
}

// ─── Tobacco: Discontinued Low Stock ─────────────────────────────────────────

function analyzeDiscontinuedBlends(blends) {
  const discontinued = blends.filter((b) => {
    const status = (b.production_status || '').toLowerCase();
    if (!status.includes('discontinu')) return false;
    const oz = totalOz(b);
    // Include if low stock (known) or if stock is untracked — for discontinued items,
    // untracked quantities are also worth surfacing since you can never reorder once gone.
    return oz === null || oz < LOW_STOCK_OZ;
  }).slice(0, MAX_ITEMS_PER_REC);

  if (!discontinued.length) return [];

  return [createRecommendation({
    category:         CATEGORY.PURCHASE,
    goal:             'discontinued_low_stock',
    actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:            'Discontinued Blends Running Low',
    summary:          `${discontinued.length} discontinued blend${discontinued.length > 1 ? 's are' : ' is'} low — these cannot be restocked once gone`,
    whyItMatters:     'Once a discontinued blend runs out, it cannot be purchased again. Add to your shopping list to source remaining stock.',
    moduleKey:        MODULE_KEY.TOBACCO,
    ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority:         PRIORITY.HIGH,
    confidence:       'high',
    items: discontinued.map((b) => ({
      id:             b.id,
      recordId:       b.id,
      recordType:     'blend',
      recordName:     b.name,
      itemName:       b.name,
      name:           b.name,
      brand:          b.manufacturer || b.brand || '',
      manufacturer:   b.manufacturer || '',
      quantityOz:     totalOz(b),
      ownershipStatus:'in_collection',
      shoppingType:   'restock',
      itemType:       'blend',
    })),
    actionPayload: {
      shoppingType: 'restock',
      itemType:     'blend',
    },
  })];
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

/**
 * Generate all purchase/restock recommendations.
 *
 * @param {object} context - { blends, bottles, cigars, wantListItems, cigarModuleActive }
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
export function generatePurchaseRestockRecommendations(context = {}) {
  const {
    blends        = [],
    bottles       = [],
    cigars        = [],
    wantListItems = [],
    cigarModuleActive = false,
  } = context;

  const recommendations = [
    ...analyzeLowStockBlends(blends),
    ...analyzeDepletedBlends(blends),
    ...analyzeDiscontinuedBlends(blends),
    ...analyzeBottleRestock(bottles),
    ...analyzeWishlistCandidates(wantListItems),
    ...(cigarModuleActive ? analyzeCigarDiscovery(cigars) : []),
  ];

  return recommendations;
}
