// platform/agingReadiness.js
// Shared aging and readiness engine for the CollectionKeeper platform.
//
// Supports cigars today. Designed to be extended for wine (drink-window logic)
// and other aged products without needing module-specific forks.
//
// Readiness states:
//   ready_now       — optimal smoking/drinking window
//   aging           — still developing, not yet at peak
//   past_peak       — likely over the hill (use soon)
//   no_data         — no aging information available
//
// Confidence levels:
//   high   — strong signals, trust the output
//   medium — partial data or minor humidor concerns
//   low    — insufficient data or poor storage conditions
//
// Humidor health states:
//   stable        — target humidity within ideal range (65–72% RH)
//   dry_risk      — target humidity below 60% RH
//   humid_risk    — target humidity above 75% RH
//   unmonitored   — no humidor assigned or no target set

/**
 * @typedef {'ready_now'|'aging'|'past_peak'|'no_data'} ReadinessState
 * @typedef {'high'|'medium'|'low'} ConfidenceLevel
 * @typedef {'stable'|'dry_risk'|'humid_risk'|'unmonitored'} HumidorHealthState
 */

/**
 * Calculate months between a start date and today (or a reference date).
 *
 * @param {string|Date|null} startDate
 * @param {Date} [referenceDate]
 * @returns {number|null}
 */
export function getMonthsAged(startDate, referenceDate = new Date()) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const diffMs = referenceDate.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
}

/**
 * Calculate the readiness state for a cigar.
 *
 * Cigar readiness logic:
 * - If ready_to_smoke_date is set:
 *     - Before it → aging
 *     - After it → ready_now (within 2 years) or past_peak (more than 2 years past)
 * - If aging_start_date is set (no ready_to_smoke_date):
 *     - < 3 months aged → aging (too fresh)
 *     - 3–36 months → ready_now
 *     - > 36 months → may be past_peak depending on body
 * - If neither is set → no_data (ready_now by default for user convenience)
 *
 * @param {object} cigar - Raw Cigar record.
 * @param {Date} [now]
 * @returns {{ state: ReadinessState, monthsAged: number|null, label: string, detail: string }}
 */
export function getCigarReadiness(cigar, now = new Date()) {
  const { aging_start_date, ready_to_smoke_date, body } = cigar;

  if (!aging_start_date && !ready_to_smoke_date) {
    return {
      state: 'no_data',
      monthsAged: null,
      label: 'No aging data',
      detail: 'Add an aging start date to track readiness.',
    };
  }

  const monthsAged = getMonthsAged(aging_start_date, now);

  if (ready_to_smoke_date) {
    const readyDate = new Date(ready_to_smoke_date);
    if (Number.isNaN(readyDate.getTime())) {
      return { state: 'no_data', monthsAged, label: 'Invalid date', detail: '' };
    }

    const monthsPastReady = Math.floor(
      (now.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );

    if (monthsPastReady < 0) {
      const monthsRemaining = Math.abs(monthsPastReady);
      return {
        state: 'aging',
        monthsAged,
        label: `${monthsRemaining}mo to go`,
        detail: `Ready around ${readyDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
      };
    }

    // 2+ years past ready date — possibly past peak for most cigars
    if (monthsPastReady > 24 && body === 'full') {
      return {
        state: 'past_peak',
        monthsAged,
        label: 'Past peak window',
        detail: 'This cigar may benefit from being smoked soon.',
      };
    }

    return {
      state: 'ready_now',
      monthsAged,
      label: 'Ready now',
      detail: `Has been ready since ${readyDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    };
  }

  // Only aging_start_date available — use body-aware heuristics
  const aged = monthsAged ?? 0;
  const isFullBody = body === 'full' || body === 'medium_full';

  if (aged < 3) {
    return {
      state: 'aging',
      monthsAged,
      label: 'Too fresh',
      detail: 'Allow at least 3 months before smoking.',
    };
  }

  if (aged <= 36) {
    return {
      state: 'ready_now',
      monthsAged,
      label: 'Ready now',
      detail: `${aged} month${aged !== 1 ? 's' : ''} aged`,
    };
  }

  // > 36 months
  if (isFullBody && aged > 60) {
    return {
      state: 'past_peak',
      monthsAged,
      label: 'Smoke soon',
      detail: `${aged} months aged — consider smoking within the year.`,
    };
  }

  return {
    state: 'ready_now',
    monthsAged,
    label: 'Well aged',
    detail: `${aged} month${aged !== 1 ? 's' : ''} aged`,
  };
}

/**
 * Calculate the readiness state for a wine bottle.
 * Uses drink_window_start and drink_window_end fields.
 *
 * @param {object} wine - Raw Wine record.
 * @param {Date} [now]
 * @returns {{ state: ReadinessState, label: string, detail: string }}
 */
export function getWineReadiness(wine, now = new Date()) {
  const { drink_window_start, drink_window_end, peak_window_start, peak_window_end, vintage } = wine;

  if (!drink_window_start && !drink_window_end && !vintage) {
    return { state: 'no_data', label: 'No window data', detail: '' };
  }

  const startYear = drink_window_start ? parseInt(drink_window_start, 10) : null;
  const endYear = drink_window_end ? parseInt(drink_window_end, 10) : null;
  const peakStart = peak_window_start ? parseInt(peak_window_start, 10) : null;
  const peakEnd = peak_window_end ? parseInt(peak_window_end, 10) : null;
  const currentYear = now.getFullYear();

  if (startYear && currentYear < startYear) {
    const yearsRemaining = startYear - currentYear;
    return {
      state: 'aging',
      label: `${yearsRemaining}yr to go`,
      detail: `Drinking window opens ${startYear}`,
    };
  }

  if (endYear && currentYear > endYear) {
    return {
      state: 'past_peak',
      label: 'Past window',
      detail: `Drinking window closed ${endYear}`,
    };
  }

  if (peakStart && peakEnd && currentYear >= peakStart && currentYear <= peakEnd) {
    return {
      state: 'ready_now',
      label: 'Peak window',
      detail: `Peak: ${peakStart}–${peakEnd}`,
    };
  }

  return {
    state: 'ready_now',
    label: 'In window',
    detail: endYear ? `Drink by ${endYear}` : 'In drinking window',
  };
}

/**
 * Get all cigars that are currently in their ready-to-smoke state.
 *
 * @param {object[]} cigars - Array of raw Cigar records.
 * @returns {object[]}
 */
export function getReadyToSmokeCigars(cigars) {
  if (!Array.isArray(cigars)) return [];
  return cigars.filter((c) => {
    const { state } = getCigarReadiness(c);
    return state === 'ready_now' || state === 'no_data';
  });
}

/**
 * Get all cigars still in their aging phase.
 *
 * @param {object[]} cigars
 * @returns {object[]}
 */
export function getAgingCigars(cigars) {
  if (!Array.isArray(cigars)) return [];
  return cigars.filter((c) => getCigarReadiness(c).state === 'aging');
}

/**
 * Summarize readiness across a cigar collection.
 *
 * @param {object[]} cigars
 * @param {Date} [now]
 * @returns {{ readyNow: number, aging: number, pastPeak: number, noData: number }}
 */
export function summarizeCigarReadiness(cigars, now = new Date()) {
  if (!Array.isArray(cigars)) return { readyNow: 0, aging: 0, pastPeak: 0, noData: 0 };

  return cigars.reduce(
    (acc, c) => {
      const { state } = getCigarReadiness(c, now);
      if (state === 'ready_now') acc.readyNow++;
      else if (state === 'aging') acc.aging++;
      else if (state === 'past_peak') acc.pastPeak++;
      else acc.noData++;
      return acc;
    },
    { readyNow: 0, aging: 0, pastPeak: 0, noData: 0 }
  );
}

// ─── Phase 4: Humidor Impact Model ───────────────────────────────────────────

/**
 * Evaluate the health of a humidor based on its stored settings.
 * Returns a state, human-readable labels, and a confidence modifier applied
 * when this humidor's context is used in readiness calculations.
 *
 * @param {object|null|undefined} humidor - HumidorLocation record or null.
 * @returns {{ state: HumidorHealthState, label: string, detail: string, confidenceModifier: number }}
 */
export function getHumidorHealth(humidor) {
  if (!humidor) {
    return {
      state: 'unmonitored',
      label: 'No humidor assigned',
      detail: 'Assign a humidor to improve aging confidence.',
      confidenceModifier: -0.2,
    };
  }

  const rh = humidor.target_humidity_rh != null ? Number(humidor.target_humidity_rh) : null;

  if (rh === null || Number.isNaN(rh)) {
    return {
      state: 'unmonitored',
      label: 'Unmonitored',
      detail: 'No target humidity configured for this humidor.',
      confidenceModifier: -0.15,
    };
  }

  if (rh < 60) {
    return {
      state: 'dry_risk',
      label: 'Dry risk',
      detail: `Target ${rh}% RH is below 60% — risk of drying and cracking.`,
      confidenceModifier: -0.3,
    };
  }

  if (rh > 75) {
    return {
      state: 'humid_risk',
      label: 'Over-humid',
      detail: `Target ${rh}% RH exceeds 75% — elevated mold and wrapper damage risk.`,
      confidenceModifier: -0.3,
    };
  }

  if (rh >= 65 && rh <= 72) {
    return {
      state: 'stable',
      label: 'Well-maintained',
      detail: `${rh}% RH target — ideal aging conditions.`,
      confidenceModifier: 0.1,
    };
  }

  // 60–64 or 73–75: stable but not ideal
  return {
    state: 'stable',
    label: 'Stable',
    detail: `${rh}% RH target — adequate conditions.`,
    confidenceModifier: 0,
  };
}

/**
 * Identify risk flags for a cigar given its profile and storage context.
 *
 * @param {object} cigar
 * @param {object|null|undefined} humidor
 * @returns {Array<{ type: string, label: string, severity: 'warning'|'info' }>}
 */
export function getCigarRiskFlags(cigar, humidor) {
  const flags = [];
  const { state: humidorState } = getHumidorHealth(humidor);

  if (humidorState === 'dry_risk') {
    flags.push({ type: 'drying', label: 'Drying risk', severity: 'warning' });
  }
  if (humidorState === 'humid_risk') {
    flags.push({ type: 'mold', label: 'Mold/wrapper risk', severity: 'warning' });
  }
  if (humidorState === 'unmonitored' && !humidor) {
    flags.push({ type: 'unassigned', label: 'No humidor assigned', severity: 'info' });
  }

  // Over-aged heuristic for full-bodied cigars
  const monthsAged = getMonthsAged(cigar.aging_start_date);
  const isFullBody = cigar.body === 'full' || cigar.body === 'medium_full';
  if (monthsAged !== null && monthsAged > 60 && isFullBody) {
    flags.push({ type: 'over_aged', label: 'May be past peak', severity: 'warning' });
  }

  // Out of stock
  const qty = cigar.singles_equivalent ?? cigar.quantity ?? 0;
  if (qty === 0) {
    flags.push({ type: 'out_of_stock', label: 'None remaining', severity: 'info' });
  }

  return flags;
}

// ─── Phase 3 (enhanced): Humidor-aware readiness with confidence ──────────────

/**
 * Calculate a cigar's readiness state enriched with humidor context and
 * a confidence level. Extends getCigarReadiness without replacing it so
 * existing callers are unaffected.
 *
 * @param {object} cigar - Raw Cigar record.
 * @param {object|null|undefined} humidor - Associated HumidorLocation (or null).
 * @param {Date} [now]
 * @returns {{
 *   state: ReadinessState,
 *   confidence: ConfidenceLevel,
 *   confidenceScore: number,
 *   monthsAged: number|null,
 *   label: string,
 *   detail: string,
 *   humidorHealth: object,
 *   riskFlags: Array
 * }}
 */
export function getCigarReadinessWithContext(cigar, humidor, now = new Date()) {
  const base = getCigarReadiness(cigar, now);
  const humidorHealth = getHumidorHealth(humidor);

  // Build a confidence score (0–1) from available data signals
  let score = 0.5; // baseline

  if (cigar.aging_start_date && cigar.ready_to_smoke_date) {
    score = 0.85; // both dates set
  } else if (cigar.aging_start_date) {
    score = 0.60; // start date only
  } else {
    score = 0.25; // no aging data
  }

  // Additional profile signals increase precision
  if (cigar.body && cigar.strength) score += 0.05;
  if (cigar.wrapper) score += 0.03;

  // Apply humidor modifier (±0.1 to ±0.3)
  score = Math.max(0.1, Math.min(1.0, score + humidorHealth.confidenceModifier));

  const confidence =
    score >= 0.75 ? 'high' :
    score >= 0.45 ? 'medium' : 'low';

  const riskFlags = getCigarRiskFlags(cigar, humidor);

  return {
    ...base,
    confidence,
    confidenceScore: score,
    humidorHealth,
    riskFlags,
  };
}

// ─── Phase 5: Collection Insight Generation ───────────────────────────────────

/** @type {Record<string, string>} */
export const INSIGHT_TYPES = {
  SMOKE_NOW: 'smoke_now',
  REST_LONGER: 'rest_longer',
  MONITOR: 'monitor_closely',
  AT_RISK: 'at_risk',
  NEGLECTED: 'neglected',
  OVERSTOCKED: 'overstocked',
  FAST_DEPLETING: 'fast_depleting',
};

/**
 * Generate actionable per-cigar and collection-level insights.
 *
 * @param {object[]} cigars - All cigar records.
 * @param {object[]} [sessions] - All session records.
 * @param {object[]} [humidors] - All humidor records.
 * @param {Date} [now] - Reference date (defaults to today; injectable for tests).
 * @returns {Array<{
 *   cigarId: string,
 *   cigarName: string,
 *   type: string,
 *   label: string,
 *   detail: string,
 *   confidence: ConfidenceLevel,
 *   priority: number
 * }>}
 */
export function generateCollectionInsights(cigars, sessions = [], humidors = [], now = new Date()) {
  if (!Array.isArray(cigars) || cigars.length === 0) return [];

  // Build lookup maps
  const humidorMap = {};
  if (Array.isArray(humidors)) {
    humidors.forEach((h) => { humidorMap[h.id] = h; });
  }

  const sessionCounts = {};
  const lastSmokedMap = {};
  if (Array.isArray(sessions)) {
    sessions.forEach((s) => {
      if (!s.cigar_id) return;
      sessionCounts[s.cigar_id] = (sessionCounts[s.cigar_id] || 0) + 1;
      const d = s.date ? new Date(s.date) : null;
      if (d && !Number.isNaN(d.getTime())) {
        if (!lastSmokedMap[s.cigar_id] || d > lastSmokedMap[s.cigar_id]) {
          lastSmokedMap[s.cigar_id] = d;
        }
      }
    });
  }

  const insights = [];

  cigars.forEach((cigar) => {
    const humidor = cigar.humidor_id ? humidorMap[cigar.humidor_id] : null;
    const readiness = getCigarReadinessWithContext(cigar, humidor, now);
    const qty = (cigar.singles_equivalent ?? cigar.quantity ?? 0);
    const smokeCount = sessionCounts[cigar.id] || 0;
    const lastSmoked = lastSmokedMap[cigar.id] || null;
    const daysSinceSmoked = lastSmoked
      ? Math.floor((now.getTime() - lastSmoked.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const warningFlags = readiness.riskFlags.filter((f) => f.severity === 'warning');
    const name = [cigar.brand, cigar.name].filter(Boolean).join(' ');

    // AT_RISK — highest priority, surface storage/condition problems
    if (warningFlags.length > 0) {
      insights.push({
        cigarId: cigar.id,
        cigarName: name,
        type: INSIGHT_TYPES.AT_RISK,
        label: 'At risk',
        detail: warningFlags.map((f) => f.label).join(' · '),
        confidence: readiness.confidence,
        priority: 0,
      });
    }

    // SMOKE_NOW — ready, in stock, no active warnings
    if (readiness.state === 'ready_now' && qty > 0 && warningFlags.length === 0) {
      insights.push({
        cigarId: cigar.id,
        cigarName: name,
        type: INSIGHT_TYPES.SMOKE_NOW,
        label: 'Smoke now',
        detail: readiness.detail,
        confidence: readiness.confidence,
        priority: 1,
      });
    }

    // FAST_DEPLETING — heavy usage, critically low stock
    if (smokeCount >= 5 && qty > 0 && qty <= 3) {
      insights.push({
        cigarId: cigar.id,
        cigarName: name,
        type: INSIGHT_TYPES.FAST_DEPLETING,
        label: 'Almost gone',
        detail: `${qty} left · smoked ${smokeCount} times`,
        confidence: 'high',
        priority: 2,
      });
    }

    // REST_LONGER — still aging, don't rush it
    if (readiness.state === 'aging') {
      insights.push({
        cigarId: cigar.id,
        cigarName: name,
        type: INSIGHT_TYPES.REST_LONGER,
        label: 'Needs more rest',
        detail: readiness.detail,
        confidence: readiness.confidence,
        priority: 3,
      });
    }

    // NEGLECTED — has stock but untouched for 6+ months
    if (qty > 0 && (daysSinceSmoked === null || daysSinceSmoked > 180)) {
      insights.push({
        cigarId: cigar.id,
        cigarName: name,
        type: INSIGHT_TYPES.NEGLECTED,
        label: 'Neglected',
        detail: daysSinceSmoked === null
          ? 'Never smoked'
          : `Not smoked in ${Math.floor(daysSinceSmoked / 30)} months`,
        confidence: 'high',
        priority: 4,
      });
    }

    // OVERSTOCKED — large quantity, zero usage
    if (qty >= 20 && smokeCount === 0) {
      insights.push({
        cigarId: cigar.id,
        cigarName: name,
        type: INSIGHT_TYPES.OVERSTOCKED,
        label: 'Overstocked',
        detail: `${qty} remaining · never smoked`,
        confidence: 'high',
        priority: 5,
      });
    }
  });

  return insights.sort((a, b) => a.priority - b.priority);
}
