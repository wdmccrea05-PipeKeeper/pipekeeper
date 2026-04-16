// platform/cigarInventory.js
//
// Centralized inventory depletion tracking and derived metrics for CigarKeeper.
//
// All calculations are pure functions that operate on raw entity data.
// No UI logic, no API calls. Safe to call from components via useMemo.
//
// Key concepts:
//   - "available quantity" is always in single-stick equivalents
//   - "linked sessions" are sessions where cigar_id matches and is_out_of_collection is false
//   - consumption rate uses a rolling window to avoid stale data skewing results

// ── Constants ──────────────────────────────────────────────────────────────────

/** Quantity thresholds for depletion status (in singles equivalents) */
const CRITICAL_THRESHOLD = 1;
const RUNNING_LOW_THRESHOLD = 3;

/** Rolling window for consumption rate calculation (months) */
const CONSUMPTION_RATE_WINDOW_MONTHS = 6;

/** Days without a smoke before a previously-enjoyed cigar is flagged as neglected */
const NEGLECT_THRESHOLD_DAYS = 90;

// ── Quantity helpers ───────────────────────────────────────────────────────────

/**
 * Get the canonical available quantity for a cigar in single-stick equivalents.
 * Prefers singles_equivalent, falls back to quantity, never returns negative.
 *
 * @param {object} cigar
 * @returns {number}
 */
export function getAvailableQuantity(cigar) {
  if (!cigar) return 0;
  const qty = cigar.singles_equivalent ?? cigar.quantity ?? 0;
  return Math.max(0, qty);
}

// ── Session helpers ────────────────────────────────────────────────────────────

/**
 * Build an index of sessions keyed by cigar_id for efficient lookup.
 * Only includes sessions linked to owned cigars (not out-of-collection logs).
 *
 * @param {object[]} allSessions
 * @returns {Record<string, object[]>}
 */
export function buildSessionsByCigarId(allSessions) {
  if (!Array.isArray(allSessions)) return {};
  const map = {};
  for (const s of allSessions) {
    if (s.cigar_id && !s.is_out_of_collection) {
      if (!map[s.cigar_id]) map[s.cigar_id] = [];
      map[s.cigar_id].push(s);
    }
  }
  return map;
}

/**
 * Get all sessions linked to a specific owned cigar record.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @returns {object[]}
 */
export function getLinkedSessions(cigar, allSessions) {
  if (!cigar?.id || !Array.isArray(allSessions)) return [];
  return allSessions.filter(
    (s) => s.cigar_id === cigar.id && !s.is_out_of_collection
  );
}

/**
 * Get the most recent session date for a cigar, derived from its linked sessions.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @returns {string|null} ISO date string or null
 */
export function getLastSmokedDate(cigar, allSessions) {
  const linked = getLinkedSessions(cigar, allSessions);
  if (linked.length === 0) return null;
  const sorted = [...linked]
    .filter((s) => !!s.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted[0]?.date ?? null;
}

/**
 * Get the total number of times a cigar has been smoked.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @returns {number}
 */
export function getTotalSmokedCount(cigar, allSessions) {
  return getLinkedSessions(cigar, allSessions).length;
}

// ── Consumption rate ───────────────────────────────────────────────────────────

/**
 * Calculate consumption rate in sessions per month for a cigar.
 *
 * Uses a rolling window (default: 6 months) to avoid stale history skewing the
 * rate. Falls back to a lifetime average when no recent sessions exist.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @param {number} [windowMonths]
 * @returns {number} sessions per month (0 if no history)
 */
export function getConsumptionRate(cigar, allSessions, windowMonths = CONSUMPTION_RATE_WINDOW_MONTHS) {
  const linked = getLinkedSessions(cigar, allSessions);
  if (linked.length === 0) return 0;

  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - windowMonths);

  const recentSessions = linked.filter(
    (s) => s.date && new Date(s.date) >= windowStart
  );

  if (recentSessions.length > 0) {
    return recentSessions.length / windowMonths;
  }

  // No sessions in recent window — use lifetime average
  const startDate = cigar.purchase_date || cigar.created_date;
  if (!startDate) return 0;

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;

  const monthsSinceAcquired = Math.max(
    1,
    Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );
  return linked.length / monthsSinceAcquired;
}

/**
 * Estimate months until a cigar's current inventory is depleted at the current rate.
 * Returns null when there is no consumption history to base the estimate on.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @returns {number|null}
 */
export function getEstimatedMonthsRemaining(cigar, allSessions) {
  const qty = getAvailableQuantity(cigar);
  if (qty <= 0) return 0;

  const rate = getConsumptionRate(cigar, allSessions);
  if (rate <= 0) return null;

  return Math.round(qty / rate);
}

// ── Depletion status ───────────────────────────────────────────────────────────

/**
 * Get depletion status for a cigar.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @returns {'no_inventory'|'depleted'|'critical'|'running_low'|'moderate'|'stocked'}
 */
export function getDepletionStatus(cigar, allSessions) {
  const qty = getAvailableQuantity(cigar);

  if (qty === 0 && !cigar.unit_type && cigar.quantity == null) return 'no_inventory';
  if (qty === 0) return 'depleted';
  if (qty <= CRITICAL_THRESHOLD) return 'critical';
  if (qty <= RUNNING_LOW_THRESHOLD) return 'running_low';

  // Check rate-based early warning
  const monthsRemaining = getEstimatedMonthsRemaining(cigar, allSessions);
  if (monthsRemaining !== null && monthsRemaining <= 1) return 'running_low';
  if (monthsRemaining !== null && monthsRemaining <= 2) return 'moderate';

  return qty > 10 ? 'stocked' : 'moderate';
}

// ── Neglect detection ──────────────────────────────────────────────────────────

/**
 * Check whether a cigar appears neglected.
 *
 * A cigar is considered neglected when it:
 *   - has available inventory
 *   - has been smoked at least once with a positive impression
 *   - has not been smoked in the last N days
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @param {number} [daysThreshold]
 * @returns {boolean}
 */
export function isNeglected(cigar, allSessions, daysThreshold = NEGLECT_THRESHOLD_DAYS) {
  if (getAvailableQuantity(cigar) <= 0) return false;

  const linked = getLinkedSessions(cigar, allSessions);
  if (linked.length === 0) return false;

  const lastDate = getLastSmokedDate(cigar, allSessions);
  if (!lastDate) return false;

  const daysSinceSmoked = Math.floor(
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceSmoked < daysThreshold) return false;

  // Only flag as neglected if previously enjoyed
  return linked.some(
    (s) => (s.overall_enjoyment ?? 0) >= 3 || s.would_buy_again === 'yes'
  );
}

// ── Per-cigar metrics ──────────────────────────────────────────────────────────

/**
 * Get a full derived inventory metrics snapshot for a single cigar.
 *
 * @param {object} cigar
 * @param {object[]} allSessions
 * @returns {{
 *   quantity: number,
 *   lastSmokedDate: string|null,
 *   totalSmoked: number,
 *   consumptionRatePerMonth: number,
 *   estimatedMonthsRemaining: number|null,
 *   depletionStatus: string,
 *   neglected: boolean,
 * }}
 */
export function getCigarInventoryMetrics(cigar, allSessions) {
  return {
    quantity: getAvailableQuantity(cigar),
    lastSmokedDate: getLastSmokedDate(cigar, allSessions),
    totalSmoked: getTotalSmokedCount(cigar, allSessions),
    consumptionRatePerMonth: getConsumptionRate(cigar, allSessions),
    estimatedMonthsRemaining: getEstimatedMonthsRemaining(cigar, allSessions),
    depletionStatus: getDepletionStatus(cigar, allSessions),
    neglected: isNeglected(cigar, allSessions),
  };
}

// ── Decrement helper ───────────────────────────────────────────────────────────

/**
 * Compute the field updates to apply to a cigar record when a session is logged.
 *
 * Returns the patch object to send to the API, or null if no update is needed.
 * Never produces negative values. Does NOT perform the API call itself.
 *
 * Rules:
 *   - If singles_equivalent is set, decrement it by 1 (primary field for single sticks)
 *   - If unit_type is 'single', also decrement quantity by 1
 *
 * @param {object} cigar
 * @returns {object|null}
 */
export function computeSessionDecrement(cigar) {
  if (!cigar) return null;

  const hasSinglesEquiv =
    typeof cigar.singles_equivalent === 'number' && cigar.singles_equivalent > 0;
  const hasQuantity =
    typeof cigar.quantity === 'number' && cigar.quantity > 0;
  const cigarsPerPackage =
    typeof cigar.cigars_per_package === 'number' && cigar.cigars_per_package > 0
      ? cigar.cigars_per_package
      : null;

  if (!hasSinglesEquiv && !hasQuantity) return null;

  const updates = {};

  if (hasSinglesEquiv) {
    updates.singles_equivalent = Math.max(0, cigar.singles_equivalent - 1);
  } else if (hasQuantity && cigarsPerPackage) {
    updates.singles_equivalent = Math.max(0, cigar.quantity * cigarsPerPackage - 1);
  }

  // For single-unit cigars, also decrement the base quantity
  if (cigar.unit_type === 'single' && hasQuantity) {
    updates.quantity = Math.max(0, cigar.quantity - 1);
  }

  if (['box', 'pack', '5pack', 'bundle', 'partial_box', 'partial_pack'].includes(cigar.unit_type || '')) {
    updates.package_open = true;
  }

  return updates;
}

// ── Collection-level metrics ───────────────────────────────────────────────────

/**
 * Get collection-level inventory metrics across all cigars.
 *
 * Builds an internal sessions-by-cigar-id index for O(n) lookup efficiency.
 *
 * @param {object[]} cigars
 * @param {object[]} allSessions
 * @returns {{
 *   runningLow: object[],
 *   depleted: object[],
 *   stocked: object[],
 *   neglected: object[],
 *   fastDepleting: object[],
 * }}
 */
export function getCollectionInventoryMetrics(cigars, allSessions) {
  if (!Array.isArray(cigars)) {
    return { runningLow: [], depleted: [], stocked: [], neglected: [], fastDepleting: [] };
  }

  const sessionsByCigar = buildSessionsByCigarId(allSessions);

  const runningLow = [];
  const depleted = [];
  const stocked = [];
  const neglected = [];
  const fastDepleting = [];

  for (const cigar of cigars) {
    const cigarSessions = sessionsByCigar[cigar.id] || [];

    const status = getDepletionStatus(cigar, cigarSessions);

    if (status === 'depleted' || status === 'no_inventory') {
      depleted.push(cigar);
    } else if (status === 'critical' || status === 'running_low') {
      runningLow.push(cigar);
    } else {
      stocked.push(cigar);
    }

    if (isNeglected(cigar, cigarSessions)) {
      neglected.push(cigar);
    }

    const rate = getConsumptionRate(cigar, cigarSessions);
    const monthsRemaining = getEstimatedMonthsRemaining(cigar, cigarSessions);
    if (rate >= 0.5 && monthsRemaining !== null && monthsRemaining <= 2) {
      fastDepleting.push(cigar);
    }
  }

  return { runningLow, depleted, stocked, neglected, fastDepleting };
}
