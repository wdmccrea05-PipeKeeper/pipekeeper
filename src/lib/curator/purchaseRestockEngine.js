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
    const singleBlend = lowStock.length === 1 ? lowStock[0] : null;
    const criticalCount = lowStock.filter((b) => (totalOz(b) || 0) <= CRITICAL_STOCK_OZ).length;

    const summary = singleBlend
      ? `${singleBlend.name} is down to ${totalOz(singleBlend)?.toFixed(1)} oz${criticalCount > 0 ? ' — critical' : ' — running low'}.`
      : `${lowStock.length} of your favorite blends are running low${criticalCount > 0 ? `, ${criticalCount} critically so` : ''}.`;

    const whyItMatters = criticalCount > 0
      ? `${criticalCount > 1 ? `${criticalCount} of these blends are` : 'One of these blends is'} below ${CRITICAL_STOCK_OZ} oz — ` +
        `that's one or two sessions at most. Running out of a well-rated blend mid-rotation forces a substitution ` +
        `that breaks the session rhythm. Restock before it becomes a gap.`
      : `These are blends you rate highly enough to call favorites. Running them down to zero means ` +
        `a gap in your rotation while you wait for reorder delivery. A few ounces of lead time prevents that.`;

    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'low_stock_favorites',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Low Stock Favorites',
      summary,
      whyItMatters,
      moduleKey:        MODULE_KEY.TOBACCO,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         criticalCount > 0 ? PRIORITY.HIGH : PRIORITY.HIGH,
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

  const singleBlend = depleted.length === 1 ? depleted[0] : null;
  const summary = singleBlend
    ? `${singleBlend.name} is fully depleted — it's one of your favorites and the stock is gone.`
    : `${depleted.length} of your top-rated blends are fully depleted. Until restocked, they're holes in your rotation.`;

  const whyItMatters = depleted.length === 1
    ? `You've rated ${singleBlend.name} highly enough that running out matters. ` +
      `Add it to your shopping list and order before the gap creates a substitution habit.`
    : `These blends scored well enough to qualify as favorites. Running them to zero and leaving them there ` +
      `is a collection gap, not a preference. Add to your shopping list to close it.`;

  return [createRecommendation({
    category:         CATEGORY.PURCHASE,
    goal:             'depleted_favorites',
    actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:            'Depleted Favorites',
    summary,
    whyItMatters,
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
    const singleBottle = lowStock.length === 1 ? lowStock[0] : null;
    const summary = singleBottle
      ? `${singleBottle.name} is nearly empty — a few pours left at most.`
      : `${lowStock.length} bottle${lowStock.length > 1 ? 's are' : ' is'} down to the last few pours.`;

    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'low_stock_bottles',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Whiskey Running Low',
      summary,
      whyItMatters:     'Running a bottle dry without a replacement ready means a pairing gap. ' +
                        'If any of these are bottles you rely on for tobacco pairings, the timing matters more than it might seem.',
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
    const singleBottle = depleted.length === 1 ? depleted[0] : null;
    const summary = singleBottle
      ? `${singleBottle.name} is empty. If you want it back in your pairing rotation, it needs to be replaced.`
      : `${depleted.length} bottle${depleted.length > 1 ? 's are' : ' is'} fully depleted.`;

    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'depleted_bottles',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Depleted Bottles',
      summary,
      whyItMatters:     'Empty bottles drop out of all pairing recommendations — the Curator can\'t use them until restocked. ' +
                        'Add them to your shopping list so they stay visible as purchase targets.',
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

// ─── Status-Based Restock ────────────────────────────────────────────────────

function analyzeStatusBasedRestock(blends, bottles) {
  const results = [];

  const restockBlends = blends.filter((b) => {
    const s = (b.status || '').toLowerCase();
    return s === 'restock' || s === 'needs_restock';
  }).slice(0, MAX_ITEMS_PER_REC);

  if (restockBlends.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'status_restock_blends',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Blends Marked for Restock',
      summary:          `${restockBlends.length} blend${restockBlends.length > 1 ? 's are' : ' is'} flagged for restocking.`,
      whyItMatters:     'These blends have been explicitly marked for restock. Add them to your shopping list to take action.',
      moduleKey:        MODULE_KEY.TOBACCO,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.HIGH,
      confidence:       'high',
      items: restockBlends.map((b) => ({
        id:             b.id,
        recordId:       b.id,
        recordType:     'blend',
        recordName:     b.name,
        itemName:       b.name,
        name:           b.name,
        brand:          b.manufacturer || b.brand || '',
        manufacturer:   b.manufacturer || '',
        ownershipStatus:'in_collection',
        shoppingType:   'restock',
        itemType:       'blend',
      })),
      actionPayload: { shoppingType: 'restock', itemType: 'blend' },
    }));
  }

  const restockBottles = bottles.filter((b) => {
    const s = (b.status || '').toLowerCase();
    return s === 'restock' || s === 'needs_restock';
  }).slice(0, MAX_ITEMS_PER_REC);

  if (restockBottles.length > 0) {
    results.push(createRecommendation({
      category:         CATEGORY.PURCHASE,
      goal:             'status_restock_bottles',
      actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
      title:            'Bottles Marked for Restock',
      summary:          `${restockBottles.length} bottle${restockBottles.length > 1 ? 's are' : ' is'} flagged for restocking.`,
      whyItMatters:     'These bottles have been explicitly marked for restock. Add them to your shopping list.',
      moduleKey:        MODULE_KEY.WHISKEY,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:         PRIORITY.MEDIUM,
      confidence:       'high',
      items: restockBottles.map((b) => ({
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
      actionPayload: { shoppingType: 'restock', itemType: 'bottle' },
    }));
  }

  return results;
}

// ─── Wishlist Candidates ───────────────────────────────────────────────────────

function analyzeWishlistCandidates(wantListItems = []) {
  // Items on wish list (not yet on shopping list) that could move to shopping
  const wishlist = wantListItems.filter((item) =>
    item.category === 'wishlist' ||
    item.list_type === 'wishlist' ||
    item.status === 'wishlist'
  ).slice(0, MAX_ITEMS_PER_REC);

  if (!wishlist.length) return [];

  const singleItem = wishlist.length === 1 ? wishlist[0] : null;
  const summary = singleItem
    ? `${singleItem.name || singleItem.blend_name || singleItem.pipe_model || 'An item'} has been on your Want List — move it to your shopping list when you\'re ready to act.`
    : `${wishlist.length} items are on your Want List. If any are ready to purchase, moving them to the shopping list makes them easier to track.`;

  return [createRecommendation({
    category:         CATEGORY.PURCHASE,
    goal:             'wishlist_ready',
    actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:            'Want List Ready for Shopping',
    summary,
    whyItMatters:     'Want List items represent expressed interest that hasn\'t converted to action. ' +
                      'Moving them to the shopping list keeps them visible and commits you to the next step.',
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

  const singleBlend = discontinued.length === 1 ? discontinued[0] : null;
  const summary = singleBlend
    ? `${singleBlend.name} is discontinued and running low — once it's gone, that's it.`
    : `${discontinued.length} discontinued blend${discontinued.length > 1 ? 's are' : ' is'} running low. These can't be restocked once gone.`;

  return [createRecommendation({
    category:         CATEGORY.PURCHASE,
    goal:             'discontinued_low_stock',
    actionType:       ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:            'Discontinued Blends Running Low',
    summary,
    whyItMatters:     'Discontinued blends are a one-way door. When a tin runs out, you\'re done — the manufacturer has stopped production. ' +
                      'If any of these blends are meaningful to your rotation, source remaining stock now while independent retailers may still carry it.',
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
    ...analyzeLowStockBlends(blends).map((r)      => ({ ...r, queueType: 'restock_now' })),
    ...analyzeDepletedBlends(blends).map((r)      => ({ ...r, queueType: 'restock_now' })),
    ...analyzeDiscontinuedBlends(blends).map((r)  => ({ ...r, queueType: 'gap_fill' })),
    ...analyzeStatusBasedRestock(blends, bottles).map((r) => ({ ...r, queueType: 'restock_now' })),
    ...analyzeBottleRestock(bottles).map((r)      => ({ ...r, queueType: 'restock_now' })),
    ...analyzeWishlistCandidates(wantListItems).map((r) => ({ ...r, queueType: 'wishlist_ready' })),
    ...(cigarModuleActive ? analyzeCigarDiscovery(cigars).map((r) => ({ ...r, queueType: 'restock_now' })) : []),
  ];

  // Build explicit queue groups for consumers that want structured access
  const queueGroups = { restockNow: [], wishlistReady: [], gapFillBuys: [] };
  for (const r of recommendations) {
    if (r.queueType === 'restock_now')    queueGroups.restockNow.push(r);
    else if (r.queueType === 'wishlist_ready') queueGroups.wishlistReady.push(r);
    else if (r.queueType === 'gap_fill')  queueGroups.gapFillBuys.push(r);
  }
  recommendations._queueGroups = queueGroups;

  return recommendations;
}
