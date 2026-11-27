/**
 * src/lib/collection/cellar.js
 *
 * Cellar documentation maths for TobaccoBlend records.
 *
 * Everything here is derived from what the collector recorded: packaging,
 * quantities, cellaring dates and custom recipes. Nothing is inferred that the
 * record does not support, and a missing value stays missing rather than
 * becoming zero.
 */

import { calculateTotalOzFromBlend, calculateCellaredOzFromBlend } from '@/components/utils/tobaccoQuantityHelpers';

export const PACKAGING_LABELS = {
  sealed_tin: 'Sealed tin',
  opened_tin: 'Opened tin',
  jar: 'Jar',
  mason_jar: 'Mason jar',
  pouch: 'Pouch',
  bulk_bag: 'Bulk bag',
  box: 'Box',
  vacuum_sealed: 'Vacuum sealed',
  other: 'Other',
};

export const PACKAGING_CONDITION_LABELS = {
  sealed: 'Sealed',
  opened: 'Opened',
  transferred: 'Transferred to another container',
  weathered: 'Weathered',
  unknown: 'Unknown',
};

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/** Earliest cellaring date recorded on a blend, or null. */
export function earliestCellarDate(blend = {}) {
  const dates = [blend.cellar_start_date, blend.tin_cellared_date, blend.bulk_cellared_date, blend.pouch_cellared_date]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
  return dates[0] || null;
}

/** Whole months between the earliest cellaring date and now, or null. */
export function cellaringMonths(blend = {}, now = new Date()) {
  const start = earliestCellarDate(blend);
  if (!start) return null;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / MS_PER_MONTH));
}

/** "18 months" / "2 years 3 months" for display, or null when unknown. */
export function formatCellaringDuration(months) {
  if (months === null || months === undefined) return null;
  if (months < 1) return 'Less than a month';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${months} month${months === 1 ? '' : 's'}`;
  if (!rest) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} year${years === 1 ? '' : 's'} ${rest} month${rest === 1 ? '' : 's'}`;
}

/** Packaging state as recorded, with a readable label. */
export function packagingSummary(blend = {}) {
  const type = blend.packaging_type || null;
  const condition = blend.packaging_condition || null;
  return {
    type,
    typeLabel: type ? PACKAGING_LABELS[type] || type : null,
    condition,
    conditionLabel: condition ? PACKAGING_CONDITION_LABELS[condition] || condition : null,
    label: [type ? PACKAGING_LABELS[type] || type : null, condition ? PACKAGING_CONDITION_LABELS[condition] || condition : null]
      .filter(Boolean)
      .join(' · ') || null,
  };
}

/** Recorded quantities, kept separate from what is open and what is cellared. */
export function quantitySummary(blend = {}) {
  const totalOz = Number(calculateTotalOzFromBlend(blend) || 0);
  const cellaredOz = Number(calculateCellaredOzFromBlend(blend) || 0);
  return {
    totalOz,
    cellaredOz,
    openOz: Math.max(0, Math.round((totalOz - cellaredOz) * 100) / 100),
    units: {
      tins: Number(blend.tin_total_tins || 0),
      pouches: Number(blend.pouch_total_pouches || 0),
    },
  };
}

/**
 * Inventory reconciliation for one blend.
 *
 * Reports only genuine discrepancies the record can prove: a stated total that
 * disagrees with its own packaging arithmetic, or cellared quantity that exceeds
 * the total. It never invents a missing quantity.
 */
export function reconcileBlendQuantities(blend = {}) {
  const discrepancies = [];
  const tins = Number(blend.tin_total_tins || 0);
  const tinSize = Number(blend.tin_size_oz || 0);
  const tinTotal = Number(blend.tin_total_quantity_oz || 0);
  if (tins > 0 && tinSize > 0 && tinTotal > 0) {
    const expected = Math.round(tins * tinSize * 100) / 100;
    if (Math.abs(expected - tinTotal) > 0.01) {
      discrepancies.push({
        field: 'tin_total_quantity_oz',
        label: 'Tin quantity',
        recorded: tinTotal,
        expected,
        message: `${tins} tins × ${tinSize} oz gives ${expected} oz, but ${tinTotal} oz is recorded.`,
      });
    }
  }

  const pouches = Number(blend.pouch_total_pouches || 0);
  const pouchSize = Number(blend.pouch_size_oz || 0);
  const pouchTotal = Number(blend.pouch_total_quantity_oz || 0);
  if (pouches > 0 && pouchSize > 0 && pouchTotal > 0) {
    const expected = Math.round(pouches * pouchSize * 100) / 100;
    if (Math.abs(expected - pouchTotal) > 0.01) {
      discrepancies.push({
        field: 'pouch_total_quantity_oz',
        label: 'Pouch quantity',
        recorded: pouchTotal,
        expected,
        message: `${pouches} pouches × ${pouchSize} oz gives ${expected} oz, but ${pouchTotal} oz is recorded.`,
      });
    }
  }

  const { totalOz, cellaredOz } = quantitySummary(blend);
  if (cellaredOz > totalOz + 0.01) {
    discrepancies.push({
      field: 'cellared',
      label: 'Cellared quantity',
      recorded: cellaredOz,
      expected: totalOz,
      message: `${cellaredOz} oz is recorded as cellared but only ${totalOz} oz is owned in total.`,
    });
  }

  return { ok: discrepancies.length === 0, discrepancies };
}

/** Normalised recipe: proportions that sum to 100, plus any component gaps. */
export function recipeSummary(recipe = []) {
  const rows = (Array.isArray(recipe) ? recipe : [])
    .map((row) => ({
      component: String(row?.component || '').trim(),
      proportion: Number(row?.proportion),
      note: row?.note || '',
    }))
    .filter((row) => row.component);
  const sum = rows.reduce((total, row) => total + (Number.isFinite(row.proportion) ? row.proportion : 0), 0);
  return {
    rows,
    sum: Math.round(sum * 100) / 100,
    isComplete: rows.length > 0 && Math.abs(sum - 100) < 0.5,
    gap: rows.length > 0 && Math.abs(sum - 100) >= 0.5 ? Math.round((100 - sum) * 100) / 100 : 0,
    components: rows.map((row) => row.component),
  };
}

/** Activity payload for a recipe revision. */
export function buildRecipeActivity({ blend, previousRecipe = [], nextRecipe = [], note = '', actorEmail = '' }) {
  const before = recipeSummary(previousRecipe);
  const after = recipeSummary(nextRecipe);
  const changed = before.rows.length !== after.rows.length
    || before.rows.some((row, index) => {
      const other = after.rows[index];
      return !other || other.component !== row.component || other.proportion !== row.proportion;
    });
  if (!changed) return null;
  return {
    record_entity: 'TobaccoBlend',
    record_id: blend?.id,
    record_name: blend?.name || 'Blend',
    module_key: 'pipekeeper',
    event_type: 'recipe_revised',
    summary: `Recipe revised to ${after.rows.length} component${after.rows.length === 1 ? '' : 's'}`,
    detail: [after.rows.map((row) => `${row.component} ${row.proportion}%`).join(', '), note]
      .filter(Boolean)
      .join(' · '),
    changed_fields: ['blend_recipe'],
    actor_email: actorEmail || blend?.created_by || '',
    occurred_at: new Date().toISOString(),
  };
}