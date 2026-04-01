/**
 * activityNormalizer — shared utility for normalizing SmokingLog and TastingLog
 * entries into a single canonical activity model used across all dashboard surfaces.
 *
 * Canonical activity shape:
 *   {
 *     id:          string
 *     type:        'session' | 'tasting'
 *     date:        string
 *     title:       string
 *     subtitle:    string
 *     recordId:    string | null
 *     blendId:     string | null
 *     destination: string
 *     sessionGroupId: string | null
 *   }
 */

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    return (
      value.label ||
      value.name ||
      value.title ||
      value.value ||
      fallback
    );
  }
  return fallback;
}

function formatActivityDate(dateString) {
  if (!dateString) return "";
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString();
}

export function normalizeSmokingLog(log) {
  const date = log.date || log.created_date || log.created_at || "";
  const blendName = safeText(log.blend_name);
  const pipeName = safeText(log.pipe_name, "Pipe session");
  const title = blendName || pipeName || "Pipe Session";

  return {
    id: log.id || `smoking_${log.pipe_id || "none"}_${date}`,
    type: "session",
    date,
    title,
    subtitle: `${pipeName}${date ? ` · ${formatActivityDate(date)}` : ""}`,
    recordId: log.pipe_id || null,
    blendId: log.blend_id || null,
    destination: log.pipe_id
      ? `/PipeDetail?id=${encodeURIComponent(log.pipe_id)}`
      : "/PipeKeeper",
    sessionGroupId: log.session_group_id || null,
  };
}

export function normalizeTastingLog(log) {
  const date = log.tasting_date || log.date || log.created_date || log.created_at || "";
  const bottleName = safeText(log.bottle_name, safeText(log.bottle_id, "Whiskey Tasting"));

  return {
    id: log.id || `tasting_${log.bottle_id || "none"}_${date}`,
    type: "tasting",
    date,
    title: bottleName || "Whiskey Tasting",
    subtitle: `Whiskey tasting${date ? ` · ${formatActivityDate(date)}` : ""}`,
    recordId: log.bottle_id || null,
    blendId: null,
    destination: log.bottle_id
      ? `/BottleDetail?id=${encodeURIComponent(log.bottle_id)}`
      : "/Tastings",
    sessionGroupId: log.session_group_id || null,
  };
}

function getSemanticDedupKey(item) {
  // Real DB records have non-synthetic IDs — use them directly so two distinct
  // logs for the same bottle/date never collapse into one.
  if (
    item.id &&
    !item.id.startsWith("smoking_") &&
    !item.id.startsWith("tasting_")
  ) {
    return item.id;
  }
  // Synthetic/missing id: dedupe by content so accidental duplicate saves collapse.
  const dateKey = item.date ? formatActivityDate(item.date) : "";
  return [
    item.type || "",
    item.title || "",
    item.recordId || "",
    item.blendId || "",
    item.sessionGroupId || "",
    dateKey,
  ].join("|");
}

/**
 * Merge and sort SmokingLogs + TastingLogs into a unified chronological feed.
 * Includes semantic dedupe so the hub does not show obvious duplicate rows.
 */
export function buildUnifiedActivityFeed(
  smokingLogs = [],
  tastingLogs = [],
  { limit = 20 } = {}
) {
  const dedupedSmokingById = [...new Map((smokingLogs || []).map((l) => [l.id || JSON.stringify(l), l])).values()];
  const dedupedTastingsById = [...new Map((tastingLogs || []).map((l) => [l.id || JSON.stringify(l), l])).values()];

  const all = [
    ...dedupedSmokingById.map(normalizeSmokingLog),
    ...dedupedTastingsById.map(normalizeTastingLog),
  ].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime() || 0;
    const bTime = new Date(b.date || 0).getTime() || 0;
    return bTime - aTime;
  });

  const seenSemantic = new Set();
  const finalItems = [];

  for (const item of all) {
    const semanticKey = getSemanticDedupKey(item);
    if (seenSemantic.has(semanticKey)) continue;
    seenSemantic.add(semanticKey);
    finalItems.push(item);
    if (finalItems.length >= limit) break;
  }

  return finalItems;
}