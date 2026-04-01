/**
 * activityNormalizer — shared utility for normalizing SmokingLog and TastingLog
 * entries into a single canonical activity model used across all dashboard surfaces.
 *
 * Canonical activity shape:
 *   {
 *     id:       string
 *     type:     'session' | 'tasting'
 *     date:     string
 *     title:    string
 *     subtitle: string
 *     recordId: string | null
 *     blendId:  string | null
 *     destination: string
 *   }
 */

function toDisplayString(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map(toDisplayString).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return (
      value.label ||
      value.name ||
      value.title ||
      value.value ||
      value.display ||
      ""
    );
  }

  return "";
}

function normalizeDateValue(value) {
  if (!value) return "";
  try {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString();
  } catch {
    return "";
  }
}

function formatActivityDate(dateString) {
  if (!dateString) return "";
  try {
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString();
  } catch {
    return "";
  }
}

function semanticActivityKey(item) {
  const normalizedDate = item.date ? item.date.slice(0, 19) : "";
  return [
    item.type || "",
    item.title || "",
    item.subtitle || "",
    item.recordId || "",
    item.blendId || "",
    normalizedDate,
  ].join("::");
}

/**
 * Normalize a SmokingLog entry.
 * @param {object} log
 * @returns {object}
 */
export function normalizeSmokingLog(log) {
  const pipeName = toDisplayString(log.pipe_name);
  const blendName = toDisplayString(log.blend_name);
  const activityDate = log.date || log.created_date || log.created_at || "";

  const title = blendName || pipeName || "Pipe Session";
  const subtitle = `${pipeName || "Pipe session"}${
    activityDate ? " · " + formatActivityDate(activityDate) : ""
  }`;

  return {
    id: log.id || `smoking_${log.pipe_id || "none"}_${activityDate || "unknown"}`,
    type: "session",
    date: normalizeDateValue(activityDate),
    title,
    subtitle,
    recordId: log.pipe_id || null,
    blendId: log.blend_id || null,
    destination: log.pipe_id
      ? `/PipeDetail?id=${encodeURIComponent(log.pipe_id)}`
      : "/PipeKeeper",
  };
}

/**
 * Normalize a TastingLog entry.
 * @param {object} log
 * @returns {object}
 */
export function normalizeTastingLog(log) {
  const bottleName = toDisplayString(log.bottle_name) || toDisplayString(log.bottle);
  const activityDate = log.tasting_date || log.date || log.created_date || log.created_at || "";

  return {
    id: log.id || `tasting_${log.bottle_id || "none"}_${activityDate || "unknown"}`,
    type: "tasting",
    date: normalizeDateValue(activityDate),
    title: bottleName || "Whiskey Tasting",
    subtitle: `Whiskey tasting${
      activityDate ? " · " + formatActivityDate(activityDate) : ""
    }`,
    recordId: log.bottle_id || null,
    blendId: null,
    destination: log.bottle_id
      ? `/BottleDetail?id=${encodeURIComponent(log.bottle_id)}`
      : "/Tastings",
  };
}

/**
 * Merge and sort SmokingLogs + TastingLogs into a unified chronological feed.
 * Also removes exact id duplicates and semantic duplicates.
 *
 * @param {object[]} smokingLogs
 * @param {object[]} tastingLogs
 * @param {object} options
 * @param {number} [options.limit=20]
 * @returns {object[]}
 */
export function buildUnifiedActivityFeed(
  smokingLogs = [],
  tastingLogs = [],
  { limit = 20 } = {}
) {
  const dedupedSmokingById = [...new Map((smokingLogs || []).map((l) => [l.id || JSON.stringify(l), l])).values()];
  const dedupedTastingsById = [...new Map((tastingLogs || []).map((l) => [l.id || JSON.stringify(l), l])).values()];

  const normalized = [
    ...dedupedSmokingById.map(normalizeSmokingLog),
    ...dedupedTastingsById.map(normalizeTastingLog),
  ];

  const semanticMap = new Map();
  for (const item of normalized) {
    const key = semanticActivityKey(item);
    if (!semanticMap.has(key)) {
      semanticMap.set(key, item);
      continue;
    }

    const existing = semanticMap.get(key);
    const existingTime = existing?.date ? new Date(existing.date).getTime() : 0;
    const currentTime = item?.date ? new Date(item.date).getTime() : 0;

    if (currentTime > existingTime) {
      semanticMap.set(key, item);
    }
  }

  return [...semanticMap.values()]
    .sort((a, b) => {
      const aTime = a?.date ? new Date(a.date).getTime() : 0;
      const bTime = b?.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}