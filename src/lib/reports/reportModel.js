/**
 * reportModel.js
 *
 * One normalized model for every collection record, so every report in the
 * Reporting Center counts the same thing the same way.
 *
 * Pure functions only: no SDK access, no writes, no React.
 */

export const MODULE_KEYS = Object.freeze(["pipe", "tobacco", "whiskey", "cigar", "wine"]);

export const MODULE_LABELS = Object.freeze({
  pipe: "Pipes",
  tobacco: "Tobacco",
  whiskey: "Whiskey",
  cigar: "Cigars",
  wine: "Wines",
});

export const MODULE_ROUTES = Object.freeze({
  pipe: "/PipeDetail",
  tobacco: "/TobaccoDetail",
  whiskey: "/BottleDetail",
  cigar: "/CigarDetail",
  wine: "/WineDetail",
});

/** A filter group key -> the item modules it covers. */
export const FILTER_MODULE_SCOPE = Object.freeze({
  pipe: ["pipe", "tobacco"],
  whiskey: ["whiskey"],
  cigar: ["cigar"],
  wine: ["wine"],
});

export const RANGE_OPTIONS = Object.freeze([
  { key: "all", label: "All time", months: null },
  { key: "12m", label: "Last 12 months", months: 12 },
  { key: "3y", label: "Last 3 years", months: 36 },
  { key: "5y", label: "Last 5 years", months: 60 },
  { key: "custom", label: "Custom dates", months: null },
]);

export const DEFAULT_FILTERS = Object.freeze({
  modules: { pipe: true, whiskey: true, cigar: true, wine: true },
  range: "all",
  startDate: "",
  endDate: "",
  storageIds: [],
  makers: [],
  categories: [],
  minRating: "",
});

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function firstNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function listOf(value) {
  return Array.isArray(value) ? value : [];
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function monthsBetween(fromValue, toValue = new Date()) {
  const from = parseDate(fromValue);
  const to = parseDate(toValue) || new Date();
  if (!from) return null;
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, months);
}

export function yearOf(value) {
  const date = parseDate(value);
  return date ? date.getFullYear() : null;
}

export function monthKeyOf(value) {
  const date = parseDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function itemDetailPath(item) {
  if (!item?.id) return null;
  const route = MODULE_ROUTES[item.module];
  return route ? `${route}?id=${encodeURIComponent(item.id)}` : null;
}

function docFlags(record) {
  return {
    photos: listOf(record?.photos).length > 0,
    notes: Boolean(String(record?.notes || record?.personal_notes || "").trim()),
    acquisition: Boolean(record?.purchase_date),
    cost: Number(record?.purchase_price || record?.cost_basis || 0) > 0,
    provenance: Boolean(String(record?.provenance_notes || record?.original_owner || "").trim()),
    tags: listOf(record?.tags).length > 0,
    documents: listOf(record?.documents).length > 0,
  };
}

function completenessOf(flags) {
  const values = Object.values(flags);
  return values.length === 0 ? 0 : Math.round((values.filter(Boolean).length / values.length) * 100);
}

function baseItem(module, record) {
  const flags = docFlags(record);
  return {
    id: record?.id,
    module,
    moduleLabel: MODULE_LABELS[module],
    name: String(record?.name || "Untitled"),
    maker: "",
    category: "",
    subCategory: "",
    region: "",
    storageId: record?.storage_location_id || record?.humidor_id || "",
    storageName: "",
    createdAt: record?.created_date || null,
    acquiredAt: record?.purchase_date || null,
    productionDate: record?.production_date || record?.box_date || null,
    quantity: 0,
    unit: "item",
    cost: 0,
    value: 0,
    rating: null,
    condition: String(record?.condition || ""),
    conditionNotes: String(record?.condition_notes || ""),
    lifecycleStatus: String(record?.lifecycle_status || (record?.is_archived ? "archived" : "active")),
    favorite: Boolean(record?.is_favorite || record?.favorite),
    tags: listOf(record?.tags),
    flavorNotes: [],
    photos: listOf(record?.photos),
    documents: listOf(record?.documents),
    provenance: Boolean(String(record?.provenance_notes || record?.original_owner || "").trim()),
    source: String(record?.purchase_source || ""),
    ageMonths: monthsBetween(record?.production_date || record?.box_date || record?.vintage),
    docFlags: flags,
    completeness: completenessOf(flags),
    detailPath: record?.id ? `${MODULE_ROUTES[module]}?id=${encodeURIComponent(record.id)}` : null,
  };
}

function tobaccoQuantity(record) {
  const tins = firstNumber(record?.tin_total_quantity_oz, toNumber(record?.tin_size_oz) * toNumber(record?.tin_total_tins));
  const bulk = toNumber(record?.bulk_total_quantity_oz);
  const pouches = firstNumber(record?.pouch_total_quantity_oz, toNumber(record?.pouch_size_oz) * toNumber(record?.pouch_total_pouches));
  const total = tins + bulk + pouches;
  return total > 0 ? total : 1;
}

function flavorList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Turn raw entity records into the shared report model.
 * Ratings for wine come from its tasting log, which is the only place a wine is rated.
 */
export function buildReportItems({
  pipes = [],
  blends = [],
  bottles = [],
  cigars = [],
  wines = [],
  wineTastings = [],
  locations = [],
  humidors = [],
} = {}) {
  const locationNames = new Map();
  [...listOf(locations), ...listOf(humidors)].forEach((location) => {
    if (location?.id) locationNames.set(location.id, String(location.name || "Unnamed location"));
  });

  const wineRating = new Map();
  listOf(wineTastings).forEach((tasting) => {
    const key = tasting?.wine_id;
    const score = Number(tasting?.rating);
    if (!key || !Number.isFinite(score)) return;
    const entry = wineRating.get(key) || { total: 0, count: 0 };
    entry.total += score;
    entry.count += 1;
    wineRating.set(key, entry);
  });

  const items = [];

  listOf(pipes).forEach((record) => {
    const item = baseItem("pipe", record);
    items.push({
      ...item,
      maker: String(record?.maker || ""),
      category: String(record?.shape || "Unknown"),
      subCategory: String(record?.bend || ""),
      region: String(record?.country_of_origin || ""),
      quantity: 1,
      unit: "pipe",
      cost: toNumber(record?.purchase_price),
      value: toNumber(record?.estimated_value),
      condition: String(record?.condition || "Unknown"),
      tags: listOf(record?.tags),
      specialization: listOf(record?.focus),
    });
  });

  listOf(blends).forEach((record) => {
    const item = baseItem("tobacco", record);
    const cellaredAt = record?.cellar_start_date || record?.tin_cellared_date || record?.bulk_cellared_date || record?.pouch_cellared_date;
    items.push({
      ...item,
      maker: String(record?.manufacturer || ""),
      category: String(record?.blend_type || "Unclassified"),
      subCategory: String(record?.cut || ""),
      quantity: tobaccoQuantity(record),
      unit: "oz",
      cost: toNumber(record?.cost_basis),
      value: firstNumber(record?.manual_market_value, record?.ai_estimated_value),
      rating: Number.isFinite(Number(record?.rating)) && Number(record?.rating) > 0 ? Number(record.rating) : null,
      flavorNotes: flavorList(record?.flavor_notes),
      agingStart: cellaredAt || null,
      ageMonths: monthsBetween(cellaredAt || record?.production_date),
      productionStatus: String(record?.production_status || ""),
      agingPotential: String(record?.aging_potential || ""),
      isCustomBlend: Boolean(record?.is_custom_blend),
    });
  });

  listOf(bottles).forEach((record) => {
    const item = baseItem("whiskey", record);
    items.push({
      ...item,
      maker: String(record?.distillery || ""),
      category: String(record?.type || "Other"),
      subCategory: String(record?.bottle_size || ""),
      region: String(record?.region || record?.country || ""),
      quantity: Math.max(0, toNumber(record?.bottle_count)),
      unit: "bottle",
      cost: toNumber(record?.purchase_price),
      value: firstNumber(record?.collector_value, record?.average_market_value, record?.aftermarket_price),
      rating: Number.isFinite(Number(record?.rating)) && Number(record?.rating) > 0 ? Number(record.rating) : null,
      flavorNotes: flavorList(record?.flavor_notes),
      ageMonths: monthsBetween(record?.production_date),
      fillLevel: String(record?.fill_level || ""),
      openedAt: record?.opened_date || null,
    });
  });

  listOf(cigars).forEach((record) => {
    const item = baseItem("cigar", record);
    const singles = firstNumber(record?.singles_equivalent, toNumber(record?.quantity) * toNumber(record?.cigars_per_package), record?.quantity);
    items.push({
      ...item,
      maker: String(record?.brand || ""),
      category: String(record?.vitola || "Unknown"),
      subCategory: String(record?.wrapper || ""),
      region: String(record?.country_of_origin || ""),
      quantity: singles,
      unit: "cigar",
      cost: toNumber(record?.purchase_price),
      value: toNumber(record?.estimated_value),
      rating: Number.isFinite(Number(record?.rating)) && Number(record?.rating) > 0 ? Number(record.rating) : null,
      flavorNotes: flavorList(record?.flavor_notes),
      agingStart: record?.aging_start_date || null,
      ageMonths: monthsBetween(record?.aging_start_date || record?.box_date),
      productionStatus: String(record?.production_status || ""),
      body: String(record?.body || ""),
      strength: String(record?.strength || ""),
    });
  });

  listOf(wines).forEach((record) => {
    const item = baseItem("wine", record);
    const ratingEntry = wineRating.get(record?.id);
    items.push({
      ...item,
      maker: String(record?.producer || ""),
      category: String(record?.style || "other"),
      subCategory: String(record?.varietal || ""),
      region: String(record?.region || record?.country_of_origin || ""),
      quantity: Math.max(0, toNumber(record?.quantity)),
      unit: "bottle",
      cost: toNumber(record?.purchase_price),
      value: toNumber(record?.estimated_value),
      rating: ratingEntry && ratingEntry.count > 0 ? Number((ratingEntry.total / ratingEntry.count).toFixed(2)) : null,
      vintage: Number(record?.vintage) || null,
      drinkWindowStart: record?.drink_window_start || null,
      drinkWindowEnd: record?.drink_window_end || null,
      ageMonths: monthsBetween(record?.vintage ? `${record.vintage}-01-01` : record?.production_date),
    });
  });

  return items.map((item) => ({
    ...item,
    storageName: item.storageId ? locationNames.get(item.storageId) || "Unnamed location" : "",
    detailPath: itemDetailPath(item),
  }));
}

function rangeBounds(filters) {
  const range = RANGE_OPTIONS.find((option) => option.key === filters?.range) || RANGE_OPTIONS[0];
  if (filters?.range === "custom") {
    return {
      start: parseDate(filters.startDate),
      end: parseDate(filters.endDate),
    };
  }
  if (!range.months) return { start: null, end: null };
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - range.months);
  return { start, end };
}

/** Apply the shared filter set. Every report sees the same filtered population. */
export function filterItems(items = [], filters = DEFAULT_FILTERS) {
  const modules = filters?.modules || DEFAULT_FILTERS.modules;
  const allowed = new Set();
  Object.entries(FILTER_MODULE_SCOPE).forEach(([group, keys]) => {
    if (modules[group]) keys.forEach((key) => allowed.add(key));
  });

  const storageIds = new Set(listOf(filters?.storageIds));
  const makers = new Set(listOf(filters?.makers).map((value) => String(value).toLowerCase()));
  const categories = new Set(listOf(filters?.categories).map((value) => String(value).toLowerCase()));
  const minRating = Number(filters?.minRating);
  const { start, end } = rangeBounds(filters);

  return listOf(items).filter((item) => {
    if (!allowed.has(item.module)) return false;
    if (storageIds.size > 0 && !storageIds.has(item.storageId)) return false;
    if (makers.size > 0 && !makers.has(String(item.maker || "").toLowerCase())) return false;
    if (categories.size > 0 && !categories.has(String(item.category || "").toLowerCase())) return false;
    if (Number.isFinite(minRating) && minRating > 0) {
      if (item.rating == null || item.rating < minRating) return false;
    }
    if (start || end) {
      const reference = parseDate(item.acquiredAt) || parseDate(item.createdAt);
      if (!reference) return false;
      if (start && reference < start) return false;
      if (end && reference > end) return false;
    }
    return true;
  });
}

export function buildFilterOptions(items = [], locations = []) {
  const makers = new Set();
  const categories = new Set();
  listOf(items).forEach((item) => {
    if (item.maker) makers.add(item.maker);
    if (item.category) categories.add(item.category);
  });
  return {
    makers: [...makers].sort((a, b) => a.localeCompare(b)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    storages: listOf(locations)
      .map((location) => ({ id: location?.id, name: String(location?.name || "Unnamed location") }))
      .filter((location) => location.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function describeFilters(filters = DEFAULT_FILTERS, options = {}) {
  const parts = [];
  const modules = filters.modules || DEFAULT_FILTERS.modules;
  const activeModules = Object.entries(FILTER_MODULE_SCOPE)
    .filter(([group]) => modules[group])
    .map(([, keys]) => keys.map((key) => MODULE_LABELS[key]).join(" + "));
  parts.push(activeModules.length > 0 ? activeModules.join(", ") : "No modules selected");

  const range = RANGE_OPTIONS.find((option) => option.key === filters.range);
  if (range && range.key !== "all") {
    parts.push(range.key === "custom" ? `${filters.startDate || "start"} to ${filters.endDate || "today"}` : range.label);
  }
  if (listOf(filters.storageIds).length > 0) {
    const names = listOf(filters.storageIds)
      .map((id) => options.storages?.find((storage) => storage.id === id)?.name)
      .filter(Boolean);
    parts.push(`Storage: ${names.join(", ") || `${filters.storageIds.length} selected`}`);
  }
  if (listOf(filters.makers).length > 0) parts.push(`Maker: ${filters.makers.join(", ")}`);
  if (listOf(filters.categories).length > 0) parts.push(`Category: ${filters.categories.join(", ")}`);
  if (Number(filters.minRating) > 0) parts.push(`Rated ${filters.minRating}+`);
  return parts.join(" · ");
}

/* ── aggregation helpers shared by the report definitions ───────────────── */

export function countBy(items = [], keyFn) {
  const map = new Map();
  listOf(items).forEach((item) => {
    const key = String(keyFn(item) || "Unspecified");
    const entry = map.get(key) || { name: key, value: 0, ids: [] };
    entry.value += 1;
    if (item?.id) entry.ids.push(item.id);
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => b.value - a.value);
}

export function sumBy(items = [], keyFn, valueFn = () => 1) {
  const map = new Map();
  listOf(items).forEach((item) => {
    const key = String(keyFn(item) || "Unspecified");
    const entry = map.get(key) || { name: key, value: 0, ids: [] };
    entry.value += toNumber(valueFn(item));
    if (item?.id) entry.ids.push(item.id);
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => b.value - a.value);
}

export function average(values = []) {
  const numbers = listOf(values).map(Number).filter((n) => Number.isFinite(n));
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

export function median(values = []) {
  const numbers = listOf(values).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const mid = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 0 ? (numbers[mid - 1] + numbers[mid]) / 2 : numbers[mid];
}

export function percent(part, total) {
  const whole = toNumber(total);
  if (whole <= 0) return 0;
  return Math.round((toNumber(part) / whole) * 1000) / 10;
}

export function total(items = [], valueFn) {
  return listOf(items).reduce((sum, item) => sum + toNumber(valueFn(item)), 0);
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(toNumber(value) * factor) / factor;
}

export function formatCurrency(value, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(toNumber(value));
  } catch {
    return `${currency} ${Math.round(toNumber(value))}`;
  }
}

/** Rows for a table, always carrying the record id and module so it can be opened. */
export function itemRow(item, extra = {}) {
  return {
    id: item.id,
    module: item.module,
    moduleLabel: item.moduleLabel,
    name: item.name,
    detailPath: item.detailPath,
    ...extra,
  };
}