/**
 * reportUsage.js
 *
 * Normalizes the four usage logs into one event list, so "how often did I use
 * this" means the same thing in every report.
 *
 * A smoking log touches both a pipe and a blend, so it produces two events that
 * share one session key — session counts stay correct while both records get
 * credit for the use.
 */

import { listOf, parseDate, toNumber } from "./reportModel";

function event({ module, itemId, itemName, date, rating = null, sessionKey, kind }) {
  const parsed = parseDate(date);
  if (!itemId && !itemName) return null;
  return {
    module,
    itemId: itemId || "",
    itemName: String(itemName || "Unnamed"),
    date: parsed ? parsed.toISOString() : null,
    rating: Number.isFinite(Number(rating)) && Number(rating) > 0 ? Number(rating) : null,
    sessionKey: String(sessionKey || `${module}:${itemId || itemName}:${date}`),
    kind,
  };
}

export function buildUsageEvents({
  smokingLogs = [],
  tastingLogs = [],
  cigarSessions = [],
  wineTastings = [],
} = {}) {
  const events = [];

  listOf(smokingLogs).forEach((log) => {
    const sessionKey = log?.id || `smoke:${log?.date}:${log?.pipe_id || log?.blend_id}`;
    const pipe = event({
      module: "pipe",
      itemId: log?.pipe_id,
      itemName: log?.pipe_name || log?.external_pipe_name,
      date: log?.date,
      sessionKey,
      kind: "smoking",
    });
    if (pipe) events.push(pipe);
    const blend = event({
      module: "tobacco",
      itemId: log?.blend_id,
      itemName: log?.blend_name || log?.external_blend_name,
      date: log?.date,
      sessionKey,
      kind: "smoking",
    });
    if (blend) events.push(blend);
  });

  listOf(tastingLogs).forEach((log) => {
    const entry = event({
      module: "whiskey",
      itemId: log?.bottle_id,
      itemName: log?.bottle_name,
      date: log?.tasting_date,
      rating: log?.rating,
      sessionKey: log?.id,
      kind: "tasting",
    });
    if (entry) events.push(entry);
  });

  listOf(cigarSessions).forEach((log) => {
    if (log?.is_out_of_collection) return;
    const entry = event({
      module: "cigar",
      itemId: log?.cigar_id,
      itemName: log?.cigar_name,
      date: log?.date,
      rating: log?.rating,
      sessionKey: log?.id,
      kind: "session",
    });
    if (entry) events.push(entry);
  });

  listOf(wineTastings).forEach((log) => {
    const entry = event({
      module: "wine",
      itemId: log?.wine_id,
      itemName: log?.wine_name,
      date: log?.date,
      rating: log?.rating,
      sessionKey: log?.id,
      kind: "tasting",
    });
    if (entry) events.push(entry);
  });

  return events.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

export function usageByItem(events = []) {
  const map = new Map();
  listOf(events).forEach((entry) => {
    const key = `${entry.module}:${entry.itemId || entry.itemName}`;
    const row = map.get(key) || {
      module: entry.module,
      itemId: entry.itemId,
      itemName: entry.itemName,
      uses: 0,
      sessions: new Set(),
      lastUsed: null,
      ratings: [],
    };
    row.uses += 1;
    row.sessions.add(entry.sessionKey);
    if (entry.date && (!row.lastUsed || entry.date > row.lastUsed)) row.lastUsed = entry.date;
    if (entry.rating != null) row.ratings.push(entry.rating);
    map.set(key, row);
  });
  return [...map.values()].map((row) => ({
    ...row,
    sessionCount: row.sessions.size,
    avgRating: row.ratings.length > 0 ? row.ratings.reduce((a, b) => a + b, 0) / row.ratings.length : null,
  }));
}

export function sessionsByMonth(events = []) {
  const map = new Map();
  listOf(events).forEach((entry) => {
    if (!entry.date) return;
    const key = entry.date.slice(0, 7);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(entry.sessionKey);
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, sessions]) => ({ name, value: sessions.size }));
}

export function totalRecordedUnits(logs = []) {
  return listOf(logs).reduce((sum, log) => sum + toNumber(log?.amount_oz), 0);
}