/**
 * activityNormalizer — shared utility for normalizing SmokingLog and TastingLog
 * entries into a single canonical activity model used across dashboard surfaces.
 */

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (typeof value === "object") {
    return value.label || value.name || value.title || value.value || fallback;
  }
  return fallback;
}

function formatActivityDate(dateString) {
  if (!dateString) return "";
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString();
}

function getTimeKey(dateString) {
  if (!dateString) return "0";
  const time = new Date(dateString).getTime();
  return Number.isFinite(time) ? String(time) : "0";
}

export function normalizeSmokingLog(log) {
  const date = log.date || log.created_date || log.created_at || "";
  const blendName = safeText(log.blend_name);
  const pipeName = safeText(log.pipe_name, "Pipe session");
  const title = blendName || pipeName || "Pipe Session";

  return {
    id: log.id || `smoking_${log.pipe_id || "none"}_${getTimeKey(date)}`,
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
  const bottleName = safeText(
    log.bottle_name,
    safeText(log.bottle_id, "Whiskey Tasting")
  );

  return {
    id: log.id || `tasting_${log.bottle_id || "none"}_${getTimeKey(date)}`,
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

export function normalizeCigarSession(log) {
  const date = log.date || log.created_date || log.created_at || "";
  const cigarName = safeText(log.cigar_name, safeText(log.cigar_id, "Cigar Session"));

  return {
    id: log.id || `cigar_session_${log.cigar_id || "none"}_${getTimeKey(date)}`,
    type: "cigar_session",
    date,
    title: cigarName || "Cigar Session",
    subtitle: `Cigar session${date ? ` · ${formatActivityDate(date)}` : ""}`,
    recordId: log.cigar_id || null,
    blendId: null,
    destination: log.cigar_id
      ? `/CigarDetail?id=${encodeURIComponent(log.cigar_id)}`
      : "/CigarKeeper",
    sessionGroupId: log.session_group_id || null,
  };
}

function getSemanticDedupKey(item) {
  return [
    item.type || "",
    item.recordId || "",
    item.blendId || "",
    item.sessionGroupId || "",
    getTimeKey(item.date),
    item.title || "",
  ].join("|");
}

/**
 * Merge and sort SmokingLogs + TastingLogs + CigarSessions into a unified
 * chronological feed.
 * Dedupe strategy:
 * 1. unique by explicit activity id
 * 2. unique by semantic key to suppress accidental duplicate save rows
 * while still allowing legitimate distinct logs with different ids/timestamps
 */
export function buildUnifiedActivityFeed(
  smokingLogs = [],
  tastingLogs = [],
  cigarSessionsOrOptions = [],
  optionsArg = {}
) {
  // Back-compat: old callers pass (smokingLogs, tastingLogs, { limit })
  let cigarSessions = cigarSessionsOrOptions;
  let options = optionsArg;
  if (
    cigarSessionsOrOptions &&
    !Array.isArray(cigarSessionsOrOptions) &&
    typeof cigarSessionsOrOptions === "object"
  ) {
    cigarSessions = [];
    options = cigarSessionsOrOptions;
  }
  const { limit = 20 } = options;

  const normalized = [
    ...(smokingLogs || []).map(normalizeSmokingLog),
    ...(tastingLogs || []).map(normalizeTastingLog),
    ...(cigarSessions || []).map(normalizeCigarSession),
  ].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime() || 0;
    const bTime = new Date(b.date || 0).getTime() || 0;
    return bTime - aTime;
  });

  const seenIds = new Set();
  const seenSemantic = new Set();
  const finalItems = [];

  for (const item of normalized) {
    const idKey = item.id || "";
    const semanticKey = getSemanticDedupKey(item);

    if (idKey && seenIds.has(idKey)) continue;
    if (seenSemantic.has(semanticKey)) continue;

    if (idKey) seenIds.add(idKey);
    seenSemantic.add(semanticKey);
    finalItems.push(item);

    if (finalItems.length >= limit) break;
  }

  return finalItems;
}