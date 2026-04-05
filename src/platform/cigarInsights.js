// platform/cigarInsights.js
//
// Actionable insight generation for CigarKeeper.
//
// Combines cigarInventory.js and agingReadiness.js to produce per-cigar,
// per-humidor, and collection-level insights that drive dashboard cards,
// detail page badges, and curator action context.
//
// All outputs are confidence-aware and explainable. No black-box magic.
// Designed to be reusable for future WineKeeper storage/aging intelligence.

import {
  getEnhancedCigarReadiness,
  getHumidorHealth,
  summarizeCigarReadiness,
} from './agingReadiness.js';

import {
  getCigarInventoryMetrics,
  getCollectionInventoryMetrics,
} from './cigarInventory.js';

// ── Insight type constants ─────────────────────────────────────────────────────

export const CIGAR_INSIGHT_TYPES = {
  SMOKE_NOW: 'smoke_now',
  REST_LONGER: 'rest_longer',
  READY_SOON: 'ready_soon',
  AT_RISK: 'at_risk',
  RUNNING_LOW: 'running_low',
  NEGLECTED: 'neglected',
  PAST_PEAK: 'past_peak',
  BUY_AGAIN: 'buy_again',
  MONITOR: 'monitor',
};

export const HUMIDOR_INSIGHT_TYPES = {
  HEALTHY: 'healthy',
  DUE_CHECK: 'due_check',
  OVERDUE: 'overdue',
  DRY_RISK: 'dry_risk',
  OVER_HUMID: 'over_humid',
  AFFECTING_CIGARS: 'affecting_cigars',
};

// ── Per-cigar insight ──────────────────────────────────────────────────────────

/**
 * Generate actionable insights for a single cigar.
 *
 * @param {object} cigar - Raw Cigar record.
 * @param {object|null} humidor - Matching HumidorLocation record.
 * @param {object[]} sessions - All sessions (will be filtered to this cigar).
 * @returns {{
 *   readiness: object,
 *   inventory: object,
 *   primaryInsight: object|null,
 *   allInsights: object[],
 * }}
 */
export function getCigarInsight(cigar, humidor, sessions) {
  const readiness = getEnhancedCigarReadiness(cigar, humidor);
  const inventory = getCigarInventoryMetrics(cigar, sessions);
  const insights = [];

  // ── Readiness insights ────────────────────────────────────────────────────
  if (readiness.state === 'at_risk') {
    insights.push({
      type: CIGAR_INSIGHT_TYPES.AT_RISK,
      label: 'At risk',
      detail: readiness.detail,
      severity: 'danger',
    });
  } else if (readiness.state === 'ready_now' && readiness.confidence !== 'low') {
    insights.push({
      type: CIGAR_INSIGHT_TYPES.SMOKE_NOW,
      label: 'Smoke now',
      detail: readiness.detail,
      severity: 'positive',
    });
  } else if (readiness.state === 'past_peak') {
    insights.push({
      type: CIGAR_INSIGHT_TYPES.PAST_PEAK,
      label: 'Past peak',
      detail: readiness.detail,
      severity: 'warning',
    });
  } else if (readiness.state === 'aging') {
    insights.push({
      type: CIGAR_INSIGHT_TYPES.REST_LONGER,
      label: 'Rest longer',
      detail: readiness.detail,
      severity: 'neutral',
    });
  }

  // ── Inventory insights ────────────────────────────────────────────────────
  const depStatus = inventory.depletionStatus;
  if (depStatus === 'critical' || depStatus === 'running_low') {
    const qtyStr = `${inventory.quantity} stick${inventory.quantity !== 1 ? 's' : ''} remaining`;
    insights.push({
      type: CIGAR_INSIGHT_TYPES.RUNNING_LOW,
      label: 'Running low',
      detail: qtyStr,
      severity: 'warning',
    });
  }

  // ── Buy again signal (high-rated + low inventory) ─────────────────────────
  if (
    (depStatus === 'critical' || depStatus === 'running_low') &&
    cigar.rating != null &&
    cigar.rating >= 80
  ) {
    insights.push({
      type: CIGAR_INSIGHT_TYPES.BUY_AGAIN,
      label: 'Consider restocking',
      detail: 'High-rated cigar is running low.',
      severity: 'info',
    });
  }

  // ── Neglected insight ─────────────────────────────────────────────────────
  if (inventory.neglected) {
    insights.push({
      type: CIGAR_INSIGHT_TYPES.NEGLECTED,
      label: 'Neglected',
      detail: inventory.lastSmokedDate
        ? `Last smoked ${formatDaysAgo(inventory.lastSmokedDate)}.`
        : 'Owned but rarely smoked.',
      severity: 'info',
    });
  }

  return {
    readiness,
    inventory,
    primaryInsight: insights[0] ?? null,
    allInsights: insights,
  };
}

// ── Per-humidor insight ────────────────────────────────────────────────────────

/**
 * Generate a humidor-level insight for display in HumidorManager.
 *
 * @param {object} humidor - Raw HumidorLocation record.
 * @param {object[]} assignedCigars - Cigars with humidor_id matching this humidor.
 * @returns {{
 *   health: object,
 *   type: string,
 *   label: string,
 *   detail: string,
 *   severity: string,
 *   affectedCount: number,
 * }}
 */
export function getHumidorInsight(humidor, assignedCigars = []) {
  const health = getHumidorHealth(humidor);
  const affectedCount = assignedCigars.length;

  const baseResult = { health, affectedCount };

  switch (health.state) {
    case 'stable':
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.HEALTHY,
        label: 'Healthy',
        detail: health.detail,
        severity: 'positive',
      };

    case 'acceptable':
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.DUE_CHECK,
        label: 'Acceptable',
        detail: health.detail,
        severity: 'neutral',
      };

    case 'monitor':
    case 'no_readings':
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.DUE_CHECK,
        label: 'Check recommended',
        detail: health.detail,
        severity: 'neutral',
      };

    case 'neglected':
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.OVERDUE,
        label: 'Overdue maintenance',
        detail: health.detail + (affectedCount > 0 ? ` (${affectedCount} cigar${affectedCount !== 1 ? 's' : ''} affected)` : ''),
        severity: 'warning',
      };

    case 'dry_risk':
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.DRY_RISK,
        label: 'Dry risk',
        detail: health.detail + (affectedCount > 0 ? ` ${affectedCount} cigar${affectedCount !== 1 ? 's' : ''} at risk.` : ''),
        severity: 'danger',
      };

    case 'over_humid_risk':
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.OVER_HUMID,
        label: 'Over-humid risk',
        detail: health.detail + (affectedCount > 0 ? ` ${affectedCount} cigar${affectedCount !== 1 ? 's' : ''} at risk.` : ''),
        severity: 'danger',
      };

    default:
      return {
        ...baseResult,
        type: HUMIDOR_INSIGHT_TYPES.DUE_CHECK,
        label: 'Unknown',
        detail: 'No environment data available.',
        severity: 'neutral',
      };
  }
}

// ── Collection-level insights ──────────────────────────────────────────────────

/**
 * @typedef {{
 *   readyNow: number,
 *   aging: number,
 *   pastPeak: number,
 *   noData: number,
 *   runningLow: object[],
 *   depleted: object[],
 *   neglected: object[],
 *   fastDepleting: object[],
 *   atRiskCigars: object[],
 *   humidorsNeedingAttention: object[],
 *   humidorHealthMap: Record<string, object>,
 * }} CollectionInsights
 */

/**
 * Generate collection-level insights across cigars, humidors, and sessions.
 *
 * This is the primary entry point for dashboard intelligence. It is designed
 * to be called once and memoized (useMemo / React Query staleTime).
 *
 * @param {object[]} cigars
 * @param {object[]} humidors
 * @param {object[]} sessions
 * @returns {CollectionInsights}
 */
export function getCollectionInsights(cigars, humidors, sessions) {
  const cigarList = Array.isArray(cigars) ? cigars : [];

  // ── Humidor health ──────────────────────────────────────────────────────────
  const humidorHealthMap = {};
  if (Array.isArray(humidors)) {
    humidors.forEach((h) => {
      humidorHealthMap[h.id] = getHumidorHealth(h);
    });
  }

  const humidorsNeedingAttention = Array.isArray(humidors)
    ? humidors.filter((h) => {
        const health = humidorHealthMap[h.id];
        return (
          health &&
          ['dry_risk', 'over_humid_risk', 'neglected', 'monitor'].includes(health.state)
        );
      })
    : [];

  if (cigarList.length === 0) {
    return {
      readyNow: 0,
      aging: 0,
      pastPeak: 0,
      noData: 0,
      runningLow: [],
      depleted: [],
      neglected: [],
      fastDepleting: [],
      atRiskCigars: [],
      humidorsNeedingAttention,
      humidorHealthMap,
    };
  }

  // ── Readiness summary ───────────────────────────────────────────────────────
  const readinessSummary = summarizeCigarReadiness(cigars);

  // ── Inventory summary (uses pre-built session index internally) ─────────────
  // We pass an array here because getCollectionInventoryMetrics builds its own index
  const inventoryMetrics = getCollectionInventoryMetrics(cigars, sessions);

  // ── Cigars in poor-condition humidors ───────────────────────────────────────
  const atRiskCigars = cigars.filter((c) => {
    if (!c.humidor_id || !humidorHealthMap[c.humidor_id]) return false;
    const health = humidorHealthMap[c.humidor_id];
    return ['dry_risk', 'over_humid_risk', 'neglected'].includes(health.state);
  });

  return {
    readyNow: readinessSummary.readyNow,
    aging: readinessSummary.aging,
    pastPeak: readinessSummary.pastPeak,
    noData: readinessSummary.noData,
    runningLow: inventoryMetrics.runningLow,
    depleted: inventoryMetrics.depleted,
    neglected: inventoryMetrics.neglected,
    fastDepleting: inventoryMetrics.fastDepleting,
    atRiskCigars,
    humidorsNeedingAttention,
    humidorHealthMap,
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function formatDaysAgo(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30.44);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}
