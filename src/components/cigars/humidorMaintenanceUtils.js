/**
 * Shared utility functions for humidor maintenance status calculations.
 * Used by HumidorManager, HumidorMaintenanceLog, CigarHighlightCard, and CigarKeeper.
 */

export const HUMIDOR_DUE_SOON_DAYS = 3;

/**
 * Returns the number of whole days from now until the given date string (YYYY-MM-DD).
 * Negative values mean the date is in the past.
 */
export function daysBetween(dateStr, now = new Date()) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

/**
 * Computes the next humidity-check date based on the humidor's last reading date
 * and configured check interval. Returns a YYYY-MM-DD string or null.
 */
export function getNextCheckDate(humidor) {
  if (!humidor.last_reading_date || !humidor.check_interval_days) return null;
  const d = new Date(humidor.last_reading_date + 'T12:00:00');
  d.setDate(d.getDate() + Number(humidor.check_interval_days));
  return d.toISOString().split('T')[0];
}

/**
 * Computes the next humidity-aid replacement date based on the most recent
 * replacement (or installation) date and replacement interval. Returns YYYY-MM-DD or null.
 */
export function getNextReplacementDate(humidor) {
  const base = humidor.aid_date_last_replaced || humidor.aid_date_installed;
  if (!base || !humidor.aid_replacement_interval_days) return null;
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + Number(humidor.aid_replacement_interval_days));
  return d.toISOString().split('T')[0];
}

/**
 * Returns one of: 'disabled' | 'overdue' | 'due_soon' | 'on_track'
 * based on the humidor's current maintenance state.
 */
export function getHumidorMaintenanceStatus(humidor) {
  if (humidor.alerts_enabled === false) return 'disabled';
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const checkDays = daysBetween(getNextCheckDate(humidor), now);
  const replaceDays = daysBetween(getNextReplacementDate(humidor), now);

  const isOverdue =
    (checkDays !== null && checkDays < 0) ||
    (replaceDays !== null && replaceDays < 0);

  if (isOverdue) return 'overdue';

  const isDueSoon =
    (checkDays !== null && checkDays <= HUMIDOR_DUE_SOON_DAYS) ||
    (replaceDays !== null && replaceDays <= HUMIDOR_DUE_SOON_DAYS);

  return isDueSoon ? 'due_soon' : 'on_track';
}

/**
 * Returns true if the humidor has alerts enabled and is due soon or overdue.
 */
export function humidorNeedsAttention(humidor) {
  const s = getHumidorMaintenanceStatus(humidor);
  return s === 'overdue' || s === 'due_soon';
}
