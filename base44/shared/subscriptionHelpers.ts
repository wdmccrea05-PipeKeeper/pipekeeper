/**
 * Shared subscription utility helpers.
 *
 * Extracted to prevent duplication across backend functions.
 * All subscription/billing backend functions should import from here.
 */

export const normEmail = (e: unknown): string => String(e || '').trim().toLowerCase();

export function isActiveStatus(status: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'trial';
}

export function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) <= new Date();
  } catch {
    return false;
  }
}

export function isContractCurrentlyActive(c: { status: string; period_end?: string | null }): boolean {
  return isActiveStatus(c.status) && !isExpired(c.period_end);
}