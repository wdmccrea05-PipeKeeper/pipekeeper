export const CIGAR_STRENGTH_VALUES = ['mild', 'mild_medium', 'medium', 'medium_full', 'full'];

const LABELS = {
  mild: { full: 'Mild', short: 'Mild' },
  mild_medium: { full: 'Mild-Medium', short: 'Mild-Med' },
  medium: { full: 'Medium', short: 'Medium' },
  medium_full: { full: 'Medium-Full', short: 'Med-Full' },
  full: { full: 'Full', short: 'Full' },
};

export function isValidCigarStrength(value) {
  return CIGAR_STRENGTH_VALUES.includes(value);
}

export function formatCigarStrengthLabel(value, { short = false } = {}) {
  if (!value) return '—';
  const normalized = String(value).toLowerCase().trim();
  const known = LABELS[normalized];
  if (known) return short ? known.short : known.full;
  return normalized.replace(/_/g, '-').replace(/\b\w/g, (c) => c.toUpperCase());
}

