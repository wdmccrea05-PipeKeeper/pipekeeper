/**
 * src/lib/cigars/humidorInventory.js
 *
 * Humidor inventory, storage distribution, reconciliation and movement history.
 *
 * Quantities come from the cigar record itself (singles_equivalent, then
 * quantity x cigars_per_package). Nothing is inferred or invented: a record with
 * no documented quantity contributes zero and is reported as undocumented.
 *
 * Pure functions only — no SDK access, no writes.
 */

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Documented stick count for one cigar record. */
export function getCigarSticks(cigar = {}) {
  const singles = num(cigar?.singles_equivalent);
  if (singles !== null) return Math.max(0, singles);
  const quantity = num(cigar?.quantity);
  if (quantity === null) return 0;
  const perPackage = num(cigar?.cigars_per_package) ?? 1;
  return Math.max(0, quantity * perPackage);
}

export function hasDocumentedQuantity(cigar = {}) {
  return num(cigar?.singles_equivalent) !== null || num(cigar?.quantity) !== null;
}

function hasPosition(cigar = {}) {
  return Boolean(cigar?.humidor_tray || cigar?.humidor_shelf || cigar?.humidor_drawer || cigar?.humidor_section);
}

export function describePosition(cigar = {}) {
  return [
    cigar?.humidor_shelf && `Shelf ${cigar.humidor_shelf}`,
    cigar?.humidor_tray && `Tray ${cigar.humidor_tray}`,
    cigar?.humidor_drawer && `Drawer ${cigar.humidor_drawer}`,
    cigar?.humidor_section && `Section ${cigar.humidor_section}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function groupByHumidor(cigars = []) {
  const map = new Map();
  (Array.isArray(cigars) ? cigars : []).forEach((cigar) => {
    const key = cigar?.humidor_id || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(cigar);
  });
  return map;
}

/**
 * Per-humidor inventory summary.
 *
 * @returns {Array<{
 *   humidorId: string,
 *   name: string,
 *   records: number,
 *   sticks: number,
 *   capacity: number|null,
 *   utilization: number|null,
 *   documentedCount: number|null,
 *   difference: number|null,
 *   status: string,
 * }>}
 */
export function buildHumidorInventory(humidors = [], cigars = []) {
  const grouped = groupByHumidor(cigars);
  return (Array.isArray(humidors) ? humidors : []).map((humidor) => {
    const assigned = grouped.get(humidor?.id) || [];
    const sticks = assigned.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0);
    const capacity = num(humidor?.capacity_count);
    const documented = num(humidor?.current_count);
    return {
      humidorId: humidor?.id || null,
      name: humidor?.name || 'Humidor',
      records: assigned.length,
      sticks,
      capacity,
      utilization: capacity && capacity > 0 ? Math.round((sticks / capacity) * 100) / 100 : null,
      documentedCount: documented,
      difference: documented === null ? null : sticks - documented,
      status: capacity && capacity > 0 && sticks > capacity ? 'over_capacity' : 'documented',
    };
  });
}

/** Where the collection actually sits. */
export function buildStorageDistribution(cigars = [], humidors = []) {
  const list = Array.isArray(cigars) ? cigars : [];
  const inventory = buildHumidorInventory(humidors, list);
  const grouped = groupByHumidor(list);
  const unassigned = grouped.get(null) || [];
  const assigned = list.filter((cigar) => Boolean(cigar?.humidor_id));

  return {
    totalRecords: list.length,
    totalSticks: list.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0),
    assignedRecords: assigned.length,
    assignedSticks: assigned.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0),
    unassigned: {
      records: unassigned.length,
      sticks: unassigned.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0),
    },
    positionedRecords: assigned.filter(hasPosition).length,
    byHumidor: inventory,
  };
}

/**
 * Compare what the humidor says it holds with what its assigned records add up to.
 * Only a documented count can disagree — an undocumented one stays null.
 */
export function reconcileHumidor(humidor = {}, cigars = []) {
  const assigned = (Array.isArray(cigars) ? cigars : []).filter((c) => c?.humidor_id === humidor?.id);
  const computed = assigned.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0);
  const documented = num(humidor?.current_count);
  const capacity = num(humidor?.capacity_count);
  const difference = documented === null ? null : computed - documented;

  let status = 'undocumented';
  if (documented !== null) {
    if (difference === 0) status = 'match';
    else if (difference > 0) status = 'records_exceed_documented';
    else status = 'documented_exceeds_records';
  }

  return {
    humidorId: humidor?.id || null,
    documented,
    computed,
    difference,
    records: assigned.length,
    undocumentedRecords: assigned.filter((c) => !hasDocumentedQuantity(c)).length,
    status,
    capacityOverflow: capacity !== null && computed > capacity ? computed - capacity : null,
    capacity,
  };
}

export function buildReconciliationReport(humidors = [], cigars = []) {
  const rows = (Array.isArray(humidors) ? humidors : []).map((h) => reconcileHumidor(h, cigars));
  return {
    rows,
    discrepancies: rows.filter(
      (r) => r.status === 'records_exceed_documented' || r.status === 'documented_exceeds_records'
    ),
    undocumented: rows.filter((r) => r.status === 'undocumented'),
    overCapacity: rows.filter((r) => r.capacityOverflow !== null),
  };
}

/** Newest first movement entries for one humidor, from the record activity log. */
export function buildHumidorMovements(activities = [], { humidorId, cigarIds = [] } = {}) {
  const allowed = new Set(Array.isArray(cigarIds) ? cigarIds : []);
  return (Array.isArray(activities) ? activities : [])
    .filter((event) => event?.record_entity === 'Cigar')
    .filter((event) => event?.event_type === 'storage_change')
    .filter((event) => (allowed.size ? allowed.has(event?.record_id) : true))
    .filter((event) => {
      if (!humidorId) return true;
      return Boolean(event?.humidor_id === humidorId || String(event?.summary || '').includes(humidorId));
    })
    .sort((a, b) => toTime(b?.occurred_at) - toTime(a?.occurred_at))
    .map((event) => ({
      id: event.id,
      cigarId: event.record_id,
      cigarName: event.record_name || 'Cigar',
      occurredAt: event.occurred_at,
      summary: event.summary || 'Storage changed',
      detail: event.detail || '',
      actor: event.actor_email || null,
    }));
}

/** Months between a start date and now, or null when the date is unusable. */
export function monthsAged(startDate, now = new Date()) {
  const start = toTime(startDate);
  if (!start) return null;
  const reference = now instanceof Date ? now.getTime() : toTime(now);
  if (!reference || reference < start) return null;
  const days = (reference - start) / (24 * 60 * 60 * 1000);
  return Math.floor(days / 30.44);
}

export const AGING_BUCKETS = Object.freeze([
  { key: 'aging_0_6', label: '0–6 months', min: 0, max: 6 },
  { key: 'aging_6_12', label: '6–12 months', min: 6, max: 12 },
  { key: 'aging_12_24', label: '1–2 years', min: 12, max: 24 },
  { key: 'aging_24_plus', label: '2 years or more', min: 24, max: null },
]);

export function agingStartDate(cigar = {}) {
  return cigar?.aging_start_date || cigar?.box_date || cigar?.purchase_date || cigar?.created_date || null;
}

export function buildAgingBuckets(cigars = [], now = new Date()) {
  const buckets = AGING_BUCKETS.map((bucket) => ({ ...bucket, records: 0, sticks: 0 }));
  let undocumented = { records: 0, sticks: 0 };

  (Array.isArray(cigars) ? cigars : []).forEach((cigar) => {
    const months = monthsAged(agingStartDate(cigar), now);
    if (months === null) {
      undocumented = { records: undocumented.records + 1, sticks: undocumented.sticks + getCigarSticks(cigar) };
      return;
    }
    const bucket = buckets.find(
      (b) => months >= b.min && (b.max === null || months < b.max)
    );
    if (!bucket) return;
    bucket.records += 1;
    bucket.sticks += getCigarSticks(cigar);
  });

  return { buckets, undocumented };
}

export function reconciliationStatusLabel(status) {
  switch (status) {
    case 'match':
      return 'Documented count matches the assigned records';
    case 'records_exceed_documented':
      return 'Assigned records exceed the documented count';
    case 'documented_exceeds_records':
      return 'Documented count exceeds the assigned records';
    default:
      return 'No documented count recorded';
  }
}