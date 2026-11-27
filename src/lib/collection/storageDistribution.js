/**
 * src/lib/collection/storageDistribution.js
 *
 * Shared storage distribution for the collection modules whose records point at a
 * StorageLocation (WhiskeyKeeper bottles, WineKeeper bottles).
 *
 * One implementation so "how much is in which cellar" means the same thing in
 * every module. Pure functions only — no SDK access, no writes.
 */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {object[]} records      collection records (Bottle, Wine)
 * @param {object[]} locations    StorageLocation records
 * @param {{ locationKey?: string, getUnits?: (record: object) => number, positionKeys?: string[] }} options
 */
function defaultUnits() {
  return 1;
}

export function buildStorageDistribution(records = [], locations = [], options = {}) {
  const locationKey = options.locationKey || 'storage_location_id';
  const getUnits = typeof options.getUnits === 'function' ? options.getUnits : defaultUnits;
  const positionKeys = options.positionKeys || [];
  const recordList = listOf(records);
  const locationList = listOf(locations);

  const byId = new Map(locationList.map((location) => [location?.id, location]));
  const buckets = new Map();

  let assignedRecords = 0;
  let positionedRecords = 0;
  let assignedUnits = 0;

  recordList.forEach((record) => {
    const units = Math.max(0, num(getUnits(record)));
    const locationId = record?.[locationKey];
    if (positionKeys.some((key) => String(record?.[key] || '').trim() !== '')) positionedRecords += 1;
    if (!locationId) return;

    assignedRecords += 1;
    assignedUnits += units;

    const location = byId.get(locationId);
    const bucket = buckets.get(locationId) || {
      locationId,
      name: location?.name || 'Unnamed location',
      type: location?.location_type || null,
      capacity: num(location?.capacity_count),
      records: 0,
      units: 0,
      missing: !location,
    };
    bucket.records += 1;
    bucket.units += units;
    buckets.set(locationId, bucket);
  });

  const byLocation = [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      utilization: bucket.capacity > 0 ? Math.min(1, bucket.units / bucket.capacity) : null,
    }))
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));

  // Locations that exist but hold nothing documented, so an empty cellar is visible.
  locationList
    .filter((location) => location?.id && !buckets.has(location.id))
    .forEach((location) => {
      byLocation.push({
        locationId: location.id,
        name: location.name || 'Unnamed location',
        type: location.location_type || null,
        capacity: num(location.capacity_count),
        records: 0,
        units: 0,
        utilization: 0,
        missing: false,
      });
    });

  return {
    locations: locationList.length,
    assignedRecords,
    assignedUnits,
    positionedRecords,
    byLocation,
    unassigned: {
      records: recordList.length - assignedRecords,
      units: recordList.reduce((sum, record) => sum + Math.max(0, num(getUnits(record))), 0) - assignedUnits,
    },
  };
}