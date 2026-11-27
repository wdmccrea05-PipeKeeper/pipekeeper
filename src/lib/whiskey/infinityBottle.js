/**
 * src/lib/whiskey/infinityBottle.js
 *
 * Infinity bottle documentation: the component history, how much of the vessel
 * is accounted for, and each component's share of the blend.
 *
 * The components array is the record. Nothing is recalculated destructively and
 * no component is ever removed by these helpers. Pure functions only.
 */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Components in the order they were added (oldest first). */
export function normalizeComponents(components = []) {
  return (Array.isArray(components) ? components : [])
    .map((component, index) => ({
      id: component?.id || `component-${index}`,
      componentName: component?.component_name || 'Unnamed component',
      bottleId: component?.bottle_id || null,
      distillery: component?.distillery || '',
      volumeMl: Math.max(0, num(component?.volume_ml)),
      addedAt: component?.added_at || null,
      characteristics: component?.characteristics || '',
      note: component?.note || '',
    }))
    .sort((a, b) => (toDate(a.addedAt)?.getTime() || 0) - (toDate(b.addedAt)?.getTime() || 0));
}

/**
 * @param {object} infinity   InfinityBottle record
 * @param {{ capacityMl?: number, now?: Date }} options
 */
export function summarizeInfinityBottle(infinity = {}, options = {}) {
  const components = normalizeComponents(infinity?.components);
  const capacityMl = Math.max(0, num(options.capacityMl ?? infinity?.capacity_ml));
  const totalVolumeMl = components.reduce((sum, component) => sum + component.volumeMl, 0);
  const counted = components.filter((component) => component.volumeMl > 0);

  const shares = counted.map((component) => ({
    ...component,
    sharePercent: totalVolumeMl > 0 ? round((component.volumeMl / totalVolumeMl) * 100, 1) : 0,
  }));

  const byDistillery = shares.reduce((acc, component) => {
    const key = component.distillery || 'Not recorded';
    acc[key] = round((acc[key] || 0) + component.sharePercent, 1);
    return acc;
  }, {});

  const dates = components.map((component) => toDate(component.addedAt)).filter(Boolean);
  const lastAddedAt = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString() : null;

  return {
    name: infinity?.name || 'Infinity bottle',
    startedDate: infinity?.started_date || null,
    capacityMl,
    componentCount: components.length,
    countedComponents: counted.length,
    totalVolumeMl: round(totalVolumeMl, 0),
    remainingMl: capacityMl > 0 ? round(Math.max(0, capacityMl - totalVolumeMl), 0) : null,
    fillPercent: capacityMl > 0 ? round(Math.min(100, (totalVolumeMl / capacityMl) * 100), 1) : null,
    overCapacity: capacityMl > 0 && totalVolumeMl > capacityMl,
    averageAddVolumeMl: counted.length ? round(totalVolumeMl / counted.length, 0) : null,
    distinctDistilleries: Object.keys(byDistillery).filter((key) => key !== 'Not recorded').length,
    byDistillery,
    shares,
    lastAddedAt,
    components,
  };
}

/**
 * Append one component to the history.
 *
 * Returns the new components array; the caller saves it on the record. A
 * component with no positive volume is still recorded, it simply contributes
 * nothing to the blend maths.
 */
export function appendComponent(components = [], component = {}, options = {}) {
  const list = Array.isArray(components) ? components : [];
  const volume = num(component.volumeMl ?? component.volume_ml);
  const entry = {
    id: component.id || `component-${Date.now()}-${list.length + 1}`,
    component_name: String(component.componentName || component.component_name || '').trim() || 'Unnamed component',
    bottle_id: component.bottleId || component.bottle_id || undefined,
    distillery: component.distillery || undefined,
    volume_ml: volume > 0 ? round(volume, 0) : 0,
    added_at: component.addedAt || component.added_at || options.today || new Date().toISOString().slice(0, 10),
    characteristics: component.characteristics || undefined,
    note: component.note || undefined,
  };
  return [...list, entry];
}

/** Share of the blend for one component, as a percentage of recorded volume. */
export function componentSharePercent(components = [], componentId = '') {
  const summary = summarizeInfinityBottle({ components });
  const match = summary.shares.find((component) => component.id === componentId);
  return match ? match.sharePercent : 0;
}