import {
  createRecommendation,
  CATEGORY,
  ACTION_TYPE,
  MODULE_KEY,
  OWNERSHIP_CONTEXT,
  PRIORITY,
} from './recommendationSchema.js';

const LOW_STOCK_OZ = 2.0;
const CRITICAL_STOCK_OZ = 0.5;
const LOW_BOTTLE_POURS = 3;
const MAX_ITEMS_PER_REC = 30;

function totalOz(blend) {
  if (typeof blend.quantity_oz === 'number') return blend.quantity_oz;
  if (typeof blend.total_oz === 'number') return blend.total_oz;
  const containers = Array.isArray(blend.containers) ? blend.containers : [];
  if (containers.length) {
    return containers.reduce((sum, c) => sum + (Number(c.quantity_oz) || 0), 0);
  }
  return null;
}

function isFavorite(blend, smokingLogs = []) {
  const rating = Number(blend?.rating || 0);
  const sessions = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id).length;
  return !!blend.is_favorite || !!blend.favorite || rating >= 4 || sessions >= 3;
}

function isBottleLowStock(bottle) {
  const remaining = Number(bottle.remaining_pours ?? bottle.current_pours ?? bottle.pours_remaining);
  if (!Number.isNaN(remaining)) return remaining <= LOW_BOTTLE_POURS && remaining > 0;
  const percent = Number(bottle.fill_level_percent ?? bottle.fill_percent ?? bottle.fill_level);
  if (!Number.isNaN(percent)) return percent <= 20 && percent > 0;
  return false;
}

function isBottleDepleted(bottle) {
  const remaining = Number(bottle.remaining_pours ?? bottle.current_pours ?? bottle.pours_remaining);
  if (!Number.isNaN(remaining)) return remaining === 0;
  const percent = Number(bottle.fill_level_percent ?? bottle.fill_percent ?? bottle.fill_level);
  if (!Number.isNaN(percent)) return percent === 0;
  return false;
}

function normalizeAcquisitionCategory(item = {}) {
  // Live data uses status:'active'|'archived' as an active/deleted discriminator,
  // and category:'wishlist'|'shopping_list'|'restock'|'tried_not_owned'|... as the semantic field.
  // New-schema records (created by Curator) may use status as the semantic field directly.
  const status   = String(item.status   || '').trim().toLowerCase();
  const category = String(item.category || item.list_type || '').trim().toLowerCase();

  // Hard archived — always respect regardless of category
  if (status === 'archived') return 'archived';

  // Legacy 'active' status: semantic meaning lives in category
  if (status === 'active') {
    if (!category) return 'wishlist';
    if (category === 'want_list') return 'wishlist';
    return category;
  }

  // New-schema: status IS the semantic field (wishlist, shopping_list, restock, …)
  if (status === 'want_list') return 'wishlist';
  if (status && status !== '') return status;

  // Fall back to category
  if (category === 'want_list') return 'wishlist';
  if (category) return category;

  return 'wishlist';
}

function isActiveAcquisitionItem(item = {}) {
  // An item is active unless it has been explicitly archived.
  // Items with no status at all are treated as active (default = wishlist).
  return normalizeAcquisitionCategory(item) !== 'archived';
}

function buildItem(source = {}, overrides = {}) {
  return {
    id: source.id || source.recordId || source.name,
    recordId: source.recordId || source.id || null,
    recordType: source.recordType || source.item_type || overrides.itemType || 'blend',
    recordName: source.recordName || source.name || source.itemName || '—',
    itemName: source.itemName || source.name || source.recordName || '—',
    name: source.name || source.recordName || source.itemName || '—',
    brand: source.brand || source.manufacturer || source.distillery || '',
    manufacturer: source.manufacturer || '',
    ownershipStatus: source.ownershipStatus || overrides.ownershipStatus || 'in_collection',
    shoppingType: source.shoppingType || overrides.shoppingType || 'buy_new_item',
    itemType: source.itemType || source.item_type || overrides.itemType || 'blend',
    ...overrides,
  };
}

function analyzeLowStockBlends(blends = [], smokingLogs = []) {
  const lowStock = blends.filter((b) => {
    const oz = totalOz(b);
    return oz !== null && oz > 0 && oz <= LOW_STOCK_OZ && isFavorite(b, smokingLogs);
  }).slice(0, MAX_ITEMS_PER_REC);

  if (!lowStock.length) return [];

  const criticalCount = lowStock.filter((b) => (totalOz(b) || 0) <= CRITICAL_STOCK_OZ).length;
  const summary = lowStock.length === 1
    ? `${lowStock[0].name} is down to ${(totalOz(lowStock[0]) || 0).toFixed(1)} oz.`
    : `${lowStock.length} favorite blends are running low${criticalCount ? `, ${criticalCount} critically so` : ''}.`;

  return [createRecommendation({
    category: CATEGORY.PURCHASE,
    goal: 'low_stock_favorites',
    actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
    title: 'Low Stock Favorites',
    summary,
    whyItMatters: 'These are proven blends in your rotation. Restocking favorites protects the rotation better than speculative buying.',
    moduleKey: MODULE_KEY.TOBACCO,
    ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority: PRIORITY.HIGH,
    confidence: 'high',
    items: lowStock.map((b) => buildItem(b, {
      recordType: 'blend',
      itemType: 'blend',
      quantityOz: totalOz(b),
      shoppingType: 'restock',
    })),
    actionPayload: { shoppingType: 'restock', itemType: 'blend' },
  })];
}

function analyzeDepletedBlends(blends = [], smokingLogs = []) {
  const depleted = blends.filter((b) => {
    const oz = totalOz(b);
    return ((oz !== null && oz <= 0) || b.quantity === 0) && isFavorite(b, smokingLogs);
  }).slice(0, MAX_ITEMS_PER_REC);

  if (!depleted.length) return [];

  return [createRecommendation({
    category: CATEGORY.PURCHASE,
    goal: 'depleted_favorites',
    actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
    title: 'Depleted Favorites',
    summary: depleted.length === 1 ? `${depleted[0].name} is fully depleted.` : `${depleted.length} favorite blends are fully depleted.`,
    whyItMatters: 'A depleted favorite is a real rotation hole, not just a low-stock warning.',
    moduleKey: MODULE_KEY.TOBACCO,
    ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority: PRIORITY.HIGH,
    confidence: 'high',
    items: depleted.map((b) => buildItem(b, { recordType: 'blend', itemType: 'blend', quantityOz: 0, shoppingType: 'restock' })),
    actionPayload: { shoppingType: 'restock', itemType: 'blend' },
  })];
}

function analyzeBottleRestock(bottles = []) {
  const results = [];
  const lowStock = bottles.filter(isBottleLowStock).slice(0, MAX_ITEMS_PER_REC);
  const depleted = bottles.filter(isBottleDepleted).slice(0, MAX_ITEMS_PER_REC);

  if (lowStock.length) {
    results.push(createRecommendation({
      category: CATEGORY.PURCHASE,
      goal: 'low_stock_bottles',
      actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
      title: 'Whiskey Running Low',
      summary: lowStock.length === 1 ? `${lowStock[0].name} is nearly empty.` : `${lowStock.length} bottles are down to the last few pours.`,
      whyItMatters: 'Pairing bottles should stay visible before they disappear from the shelf and from Curator pairing logic.',
      moduleKey: MODULE_KEY.WHISKEY,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority: PRIORITY.MEDIUM,
      confidence: 'high',
      items: lowStock.map((b) => buildItem(b, { recordType: 'bottle', itemType: 'bottle', shoppingType: 'restock' })),
      actionPayload: { shoppingType: 'restock', itemType: 'bottle' },
    }));
  }

  if (depleted.length) {
    results.push(createRecommendation({
      category: CATEGORY.PURCHASE,
      goal: 'depleted_bottles',
      actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
      title: 'Depleted Bottles',
      summary: depleted.length === 1 ? `${depleted[0].name} is empty.` : `${depleted.length} bottles are fully depleted.`,
      whyItMatters: 'Empty bottles fall out of your pairing lane until replaced.',
      moduleKey: MODULE_KEY.WHISKEY,
      ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority: PRIORITY.MEDIUM,
      confidence: 'high',
      items: depleted.map((b) => buildItem(b, { recordType: 'bottle', itemType: 'bottle', shoppingType: 'restock' })),
      actionPayload: { shoppingType: 'restock', itemType: 'bottle' },
    }));
  }

  return results;
}

function analyzeTrackedItems(acquisitionItems = []) {
  const active = acquisitionItems
    .filter(isActiveAcquisitionItem)
    .filter((item) => ['wishlist', 'shopping_list', 'restock'].includes(normalizeAcquisitionCategory(item)))
    .slice(0, MAX_ITEMS_PER_REC);

  if (!active.length) return [];

  const grouped = {
    wishlist: active.filter((i) => normalizeAcquisitionCategory(i) === 'wishlist'),
    shopping_list: active.filter((i) => normalizeAcquisitionCategory(i) === 'shopping_list'),
    restock: active.filter((i) => normalizeAcquisitionCategory(i) === 'restock'),
  };

  const recommendations = [];

  if (grouped.wishlist.length) {
    recommendations.push(createRecommendation({
      category: CATEGORY.PURCHASE,
      goal: 'wishlist_ready',
      actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
      title: 'Want List Ready for Shopping',
      summary: grouped.wishlist.length === 1 ? `${grouped.wishlist[0].name} is already on your Want List.` : `${grouped.wishlist.length} items are sitting on your Want List ready to act on.`,
      whyItMatters: 'Curator should reflect what you already told it you want, not just infer new purchases.',
      moduleKey: MODULE_KEY.MULTI,
      ownershipContext: OWNERSHIP_CONTEXT.EXTERNAL,
      priority: PRIORITY.MEDIUM,
      confidence: 'high',
      items: grouped.wishlist.map((i) => buildItem(i, { ownershipStatus: 'wishlist', shoppingType: 'buy_new_item', acquisitionId: i.id })),
      actionPayload: { shoppingType: 'buy_new_item' },
    }));
  }

  if (grouped.shopping_list.length) {
    recommendations.push(createRecommendation({
      category: CATEGORY.PURCHASE,
      goal: 'shopping_list_pending',
      actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
      title: 'Active Shopping List',
      summary: grouped.shopping_list.length === 1 ? `${grouped.shopping_list[0].name} is already marked for shopping.` : `${grouped.shopping_list.length} items are already in your shopping lane.`,
      whyItMatters: 'These are active targets and should remain visible inside Curator.',
      moduleKey: MODULE_KEY.MULTI,
      ownershipContext: OWNERSHIP_CONTEXT.EXTERNAL,
      priority: PRIORITY.MEDIUM,
      confidence: 'high',
      items: grouped.shopping_list.map((i) => buildItem(i, { ownershipStatus: 'shopping_list', shoppingType: 'buy_new_item' })),
      actionPayload: { shoppingType: 'buy_new_item' },
    }));
  }

  if (grouped.restock.length) {
    recommendations.push(createRecommendation({
      category: CATEGORY.PURCHASE,
      goal: 'tracked_restock',
      actionType: ACTION_TYPE.SHOPPING_LIST_ACTION,
      title: 'Tracked Restock Targets',
      summary: grouped.restock.length === 1 ? `${grouped.restock[0].name} is already flagged for restock.` : `${grouped.restock.length} items are already tracked as restocks.`,
      whyItMatters: 'These are user-confirmed restock priorities and should rank with live inventory warnings.',
      moduleKey: MODULE_KEY.MULTI,
      ownershipContext: OWNERSHIP_CONTEXT.EXTERNAL,
      priority: PRIORITY.HIGH,
      confidence: 'high',
      items: grouped.restock.map((i) => buildItem(i, { ownershipStatus: 'restock', shoppingType: 'restock' })),
      actionPayload: { shoppingType: 'restock' },
    }));
  }

  return recommendations;
}

export function generatePurchaseRestockRecommendations(context = {}) {
  const {
    blends = [],
    bottles = [],
    smokingLogs = [],
    wantListItems = [],
    acquisitionItems = [],
    activeModules = {},
  } = context;

  const pipeActive    = activeModules.pipekeeper    !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;

  const trackedItems = acquisitionItems.length ? acquisitionItems : wantListItems;

  return [
    ...(pipeActive    ? analyzeLowStockBlends(blends, smokingLogs) : []),
    ...(pipeActive    ? analyzeDepletedBlends(blends, smokingLogs) : []),
    ...(whiskeyActive ? analyzeBottleRestock(bottles)              : []),
    ...analyzeTrackedItems(trackedItems),
  ];
}