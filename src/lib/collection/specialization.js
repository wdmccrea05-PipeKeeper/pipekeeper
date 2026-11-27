/**
 * src/lib/collection/specialization.js
 *
 * Pipe specialization as documented data, not just a badge.
 *
 * A specialization lives on the pipe (`focus`), and every change to it is
 * appended to CollectionActivity so the collector keeps a dated history of how
 * a pipe was classified over time. This module owns the pure diff/description
 * helpers plus the single write path used by the pipe detail screen and by
 * Curator, so both produce identical history entries.
 */

export const SPECIALIZATION_EVENT = 'specialization_changed';

/** Current specializations for a pipe, newest field first, de-duplicated. */
export function currentSpecializations(pipe = {}) {
  const raw = Array.isArray(pipe.focus)
    ? pipe.focus
    : pipe.specialization
      ? [pipe.specialization]
      : [];
  const seen = new Set();
  return raw
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** "virginia_perique" → "Virginia Perique" for display without a locale key. */
export function specializationLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What changed between two specialization lists. */
export function diffSpecializations(previous = [], next = []) {
  const before = new Set(previous.map((value) => specializationLabel(value).toLowerCase()));
  const after = new Set(next.map((value) => specializationLabel(value).toLowerCase()));
  return {
    added: next.filter((value) => !before.has(specializationLabel(value).toLowerCase())),
    removed: previous.filter((value) => !after.has(specializationLabel(value).toLowerCase())),
    unchanged: next.filter((value) => before.has(specializationLabel(value).toLowerCase())),
  };
}

/** One sentence describing a specialization change. */
export function describeSpecializationChange({ added = [], removed = [] } = {}) {
  const parts = [];
  if (added.length) parts.push(`added ${added.map(specializationLabel).join(', ')}`);
  if (removed.length) parts.push(`removed ${removed.map(specializationLabel).join(', ')}`);
  if (!parts.length) return 'Specialization unchanged';
  return `Specialization ${parts.join('; ')}`;
}

/** Activity payload for a specialization change (never written when nothing changed). */
export function buildSpecializationActivity({
  pipe,
  previous = [],
  next = [],
  note = '',
  actorEmail = '',
  source = 'pipe_detail',
} = {}) {
  const diff = diffSpecializations(previous, next);
  if (!diff.added.length && !diff.removed.length) return null;
  const from = previous.length ? previous.map(specializationLabel).join(', ') : 'none recorded';
  const to = next.length ? next.map(specializationLabel).join(', ') : 'none recorded';
  return {
    record_entity: 'Pipe',
    record_id: pipe?.id,
    record_name: pipe?.name || 'Pipe',
    module_key: 'pipekeeper',
    event_type: SPECIALIZATION_EVENT,
    summary: describeSpecializationChange(diff),
    detail: [`From: ${from}`, `To: ${to}`, note, source ? `Source: ${source}` : '']
      .filter(Boolean)
      .join(' · '),
    changed_fields: ['focus'],
    actor_email: actorEmail || pipe?.created_by || '',
    occurred_at: new Date().toISOString(),
  };
}

/**
 * Apply a specialization change and record it.
 *
 * Returns the saved pipe plus whether a history row was written, so callers can
 * confirm exactly what happened instead of assuming it did.
 */
export async function applySpecializationChange({
  pipe,
  next,
  note = '',
  actorEmail = '',
  source = 'pipe_detail',
}) {
  if (!pipe?.id) throw new Error('A pipe is required to change its specialization.');
  const { base44 } = await import('@/api/base44Client');
  const previous = currentSpecializations(pipe);
  const activity = buildSpecializationActivity({ pipe, previous, next, note, actorEmail, source });
  const updated = await base44.entities.Pipe.update(pipe.id, { focus: next });
  if (activity) {
    await base44.entities.CollectionActivity.create(activity);
  }
  return { pipe: updated, recorded: Boolean(activity) };
}