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

/**
 * @typedef {'ready_now'|'aging'|'past_peak'|'no_data'} ReadinessState
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
 * @returns {{ readyNow: number, aging: number, pastPeak: number, noData: number }}
 */
export function summarizeCigarReadiness(cigars) {
  if (!Array.isArray(cigars)) return { readyNow: 0, aging: 0, pastPeak: 0, noData: 0 };

  return cigars.reduce(
    (acc, c) => {
      const { state } = getCigarReadiness(c);
      if (state === 'ready_now') acc.readyNow++;
      else if (state === 'aging') acc.aging++;
      else if (state === 'past_peak') acc.pastPeak++;
      else acc.noData++;
      return acc;
    },
    { readyNow: 0, aging: 0, pastPeak: 0, noData: 0 }
  );
}

// ─── Humidor health ────────────────────────────────────────────────────────────

/**
 * @typedef {'stable'|'acceptable'|'monitor'|'dry_risk'|'over_humid_risk'|'neglected'|'no_readings'|'unmanaged'} HumidorState
 * @typedef {'high'|'medium'|'low'|'none'} ConfidenceLevel
 */

/**
 * Evaluate the health of a humidor based on available readings and maintenance data.
 *
 * Requires no external data — operates only on the humidor record itself.
 * Outputs are confidence-aware and explainable.
 *
 * Status hierarchy (worst first):
 *   dry_risk / over_humid_risk → neglected → monitor → no_readings → acceptable → stable
 *
 * @param {object} humidor - Raw HumidorLocation record.
 * @param {Date} [now]
 * @returns {{ state: HumidorState, label: string, detail: string, confidence: ConfidenceLevel }}
 */
export function getHumidorHealth(humidor, now = new Date()) {
  if (!humidor) {
    return { state: 'unmanaged', label: 'No humidor', detail: '', confidence: 'none' };
  }

  const {
    target_humidity_rh,
    last_humidity_reading: rh,
    last_temp_reading,
    last_reading_date,
    last_maintenance_date,
    maintenance_interval_days = 30,
  } = humidor;

  const daysSinceReading = last_reading_date
    ? Math.floor((now - new Date(last_reading_date)) / (1000 * 60 * 60 * 24))
    : null;

  const daysSinceMaintenance = last_maintenance_date
    ? Math.floor((now - new Date(last_maintenance_date)) / (1000 * 60 * 60 * 24))
    : null;

  const maintenanceOverdue =
    daysSinceMaintenance !== null &&
    daysSinceMaintenance > Math.floor(maintenance_interval_days * 1.5);

  const readingStale = daysSinceReading !== null && daysSinceReading > 21;

  // ── No data at all ──────────────────────────────────────────────────────────
  if (rh == null && daysSinceMaintenance == null) {
    if (target_humidity_rh) {
      return {
        state: 'no_readings',
        label: 'No readings logged',
        detail: 'Add humidity readings to enable health tracking.',
        confidence: 'low',
      };
    }
    return {
      state: 'unmanaged',
      label: 'Unmanaged',
      detail: 'No environment data available.',
      confidence: 'none',
    };
  }

  // ── Humidity reading available ──────────────────────────────────────────────
  if (rh != null) {
    // Critical humidity deviations take highest priority
    if (rh < 55) {
      return {
        state: 'dry_risk',
        label: 'Dry risk',
        detail: `Humidity at ${rh}% — below safe range. Cigars may be drying out.`,
        confidence: 'high',
      };
    }

    if (rh > 80) {
      return {
        state: 'over_humid_risk',
        label: 'Over-humid risk',
        detail: `Humidity at ${rh}% — too high. Risk of mold or flavor damage.`,
        confidence: 'high',
      };
    }

    if (maintenanceOverdue) {
      return {
        state: 'neglected',
        label: 'Overdue maintenance',
        detail: `Last maintained ${daysSinceMaintenance} days ago — check humidor.`,
        confidence: 'medium',
      };
    }

    const targetRh = target_humidity_rh ?? 70;
    const rhDeviation = Math.abs(rh - targetRh);

    if (rhDeviation > 8 || readingStale) {
      return {
        state: 'monitor',
        label: 'Monitor',
        detail: readingStale
          ? `Readings are ${daysSinceReading} days old — verify current conditions.`
          : `Humidity (${rh}%) deviating from target (${targetRh}%).`,
        confidence: 'medium',
      };
    }

    if (rhDeviation <= 3) {
      return {
        state: 'stable',
        label: 'Stable',
        detail: `Humidity at ${rh}% — on target.`,
        confidence: 'high',
      };
    }

    return {
      state: 'acceptable',
      label: 'Acceptable',
      detail: `Humidity at ${rh}% — within acceptable range.`,
      confidence: 'medium',
    };
  }

  // ── Maintenance data only (no readings) ────────────────────────────────────
  if (maintenanceOverdue) {
    return {
      state: 'neglected',
      label: 'Overdue',
      detail: `No maintenance in ${daysSinceMaintenance} days.`,
      confidence: 'medium',
    };
  }

  return {
    state: 'no_readings',
    label: 'No readings',
    detail: 'Log humidity readings to track humidor health.',
    confidence: 'low',
  };
}

/**
 * Convert a humidor health state into a confidence multiplier (0–1).
 *
 * Used by getEnhancedCigarReadiness to downgrade readiness confidence
 * when a cigar's humidor is in poor or unknown condition.
 *
 * @param {{ state: HumidorState }|null} humidorHealth
 * @returns {number}
 */
export function getHumidorConfidenceMultiplier(humidorHealth) {
  if (!humidorHealth) return 0.75;
  switch (humidorHealth.state) {
    case 'stable': return 1.0;
    case 'acceptable': return 0.85;
    case 'no_readings': return 0.70;
    case 'monitor': return 0.65;
    case 'unmanaged': return 0.55;
    case 'neglected': return 0.45;
    case 'dry_risk':
    case 'over_humid_risk': return 0.30;
    default: return 0.70;
  }
}

// ─── Confidence-aware cigar readiness ─────────────────────────────────────────

/**
 * Get enhanced readiness for a cigar, incorporating humidor health and
 * data-availability confidence scoring.
 *
 * Extends getCigarReadiness with:
 *   - confidence: 'high' | 'medium' | 'low'
 *   - humidorRisk: boolean — true when humidor conditions threaten quality
 *   - humidorLabel: human-readable humidor status (null when not relevant)
 *
 * Note: the base `state` may be upgraded to 'at_risk' when the cigar appears
 * ready but its humidor is in poor condition.
 *
 * @param {object} cigar - Raw Cigar record.
 * @param {object|null} [humidor] - Matching HumidorLocation record, or null.
 * @param {Date} [now]
 * @returns {{
 *   state: ReadinessState|'at_risk',
 *   confidence: ConfidenceLevel,
 *   label: string,
 *   detail: string,
 *   monthsAged: number|null,
 *   humidorRisk: boolean,
 *   humidorLabel: string|null,
 * }}
 */
export function getEnhancedCigarReadiness(cigar, humidor = null, now = new Date()) {
  const base = getCigarReadiness(cigar, now);

  const humidorHealth = humidor ? getHumidorHealth(humidor, now) : null;
  const multiplier = getHumidorConfidenceMultiplier(humidorHealth);

  // Determine base confidence from data quality
  let baseConfidence;
  if (cigar.aging_start_date && cigar.ready_to_smoke_date) {
    baseConfidence = 'high';
  } else if (cigar.aging_start_date || cigar.ready_to_smoke_date) {
    baseConfidence = 'medium';
  } else {
    baseConfidence = 'low';
  }

  // Apply humidor penalty to confidence
  let confidence = baseConfidence;
  if (multiplier < 0.40) {
    confidence = 'low';
  } else if (multiplier < 0.70 && baseConfidence === 'high') {
    confidence = 'medium';
  } else if (multiplier < 0.50 && baseConfidence === 'medium') {
    confidence = 'low';
  }

  const humidorRisk =
    humidorHealth != null &&
    ['dry_risk', 'over_humid_risk', 'neglected'].includes(humidorHealth.state);

  const humidorLabel =
    humidorHealth &&
    !['stable', 'unmanaged', 'no_data'].includes(humidorHealth.state)
      ? humidorHealth.label
      : null;

  // If humidor is at risk, downgrade a ready cigar to 'at_risk'
  if (humidorRisk && base.state === 'ready_now') {
    return {
      state: 'at_risk',
      confidence: 'medium',
      label: 'At risk',
      detail: `${base.detail} — but humidor conditions may be affecting quality.`,
      monthsAged: base.monthsAged,
      humidorRisk: true,
      humidorLabel,
    };
  }

  return {
    ...base,
    confidence,
    humidorRisk,
    humidorLabel,
  };
}
