/**
 * Collection Report Engine
 *
 * Builds the three printable reports from collection data:
 *   1. Pipe pairing chart   — every pipe, its specialization, and its best blends.
 *   2. Top matches          — top items per module, ranked from the collection itself.
 *   3. Complementary report — new ways to use what is already owned.
 *
 * Pipe ⇄ blend scoring is delegated to the canonical scorer so the report can
 * never disagree with the in-app pairing insights.
 */
import { scorePipeBlend, normalizePipeForPairing } from "@/components/utils/pairingScoreCanonical";
import { generatePairingRecommendations } from "@/lib/curator/pairingEngine";

const SPECIALIZATION_LABELS = {
  generalPurpose: "General purpose",
  aromatic: "Aromatic",
  english: "English / Balkan",
  virginia: "Virginia",
  vaper: "Virginia / Perique",
  burley: "Burley",
  lakeland: "Lakeland",
  specificBlend: "Dedicated blends",
  unknown: "No declared specialization",
};

// `bottle_count` is deliberately excluded: it is a legacy field that defaults
// to 0 even when a bottle is owned.
const STOCK_FIELDS = [
  "quantity",
  "inventory_count",
  "remaining_qty",
  "singles_equivalent",
];

const DAY_MS = 86400000;

const round1 = (value) => Math.round(Number(value || 0) * 10) / 10;

function cap(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function daysSince(dateValue) {
  if (!dateValue) return null;
  const ts = new Date(dateValue).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / DAY_MS));
}

export function hasStock(item) {
  for (const field of STOCK_FIELDS) {
    const value = item?.[field];
    if (value !== undefined && value !== null && value !== "") {
      return Number(value) > 0;
    }
  }
  if (String(item?.fill_level || "").toLowerCase() === "empty") return false;
  return true;
}

function isActive(item) {
  return Boolean(item) && item.is_archived !== true;
}

function describeSpecialization(normalized) {
  const type = normalized?.dedicationType || "unknown";
  let label = SPECIALIZATION_LABELS[type] || SPECIALIZATION_LABELS.unknown;
  if (type === "specificBlend" && normalized?.exactBlendFocus?.length) {
    label = `${label}: ${normalized.exactBlendFocus.slice(0, 3).join(", ")}`;
  }
  return label;
}

function chamberLabel(pipe, normalized) {
  const parts = [];
  if (normalized?.chamberDiameterMm) {
    parts.push(`${Math.round(normalized.chamberDiameterMm)}mm chamber`);
  } else if (normalized?.chamberWidthCategory) {
    parts.push(`${cap(normalized.chamberWidthCategory)} chamber`);
  }
  if (pipe?.chamber_volume) parts.push(`${pipe.chamber_volume} bowl`);
  return parts.join(" · ");
}

/**
 * Aggregate usage (session count, last date, average rating) per record id.
 */
export function buildUsageIndex(logs = [], { idFields = [], dateFields = [], weightField = null } = {}) {
  const map = new Map();
  for (const log of logs) {
    const id = idFields.map((field) => log?.[field]).find((value) => Boolean(value));
    if (!id) continue;
    const date = dateFields.map((field) => log?.[field]).find((value) => Boolean(value)) || null;
    const entry = map.get(id) || { sessions: 0, lastDate: null, ratings: [] };
    entry.sessions += weightField ? Math.max(1, Number(log?.[weightField]) || 1) : 1;
    if (date) {
      const ts = new Date(date).getTime();
      const current = entry.lastDate ? new Date(entry.lastDate).getTime() : 0;
      if (Number.isFinite(ts) && ts > current) entry.lastDate = date;
    }
    const rating = Number(log?.rating);
    if (Number.isFinite(rating) && rating > 0) entry.ratings.push(rating);
    map.set(id, entry);
  }
  for (const entry of map.values()) {
    entry.lastUsedDays = entry.lastDate ? daysSince(entry.lastDate) : null;
    entry.avgRating = entry.ratings.length
      ? entry.ratings.reduce((sum, value) => sum + value, 0) / entry.ratings.length
      : null;
  }
  return map;
}

/**
 * Transparent 0–10 "what to reach for next" score shared by the top-match
 * reports: quality, recorded experience, availability, rediscovery, plus
 * module-specific bonuses.
 */
export function scoreFocusItem({
  rating = null,
  sessions = 0,
  lastUsedDays = null,
  available = true,
  extraBonus = 0,
  extraReasons = [],
} = {}) {
  const reasons = [];
  const numericRating = Number(rating);
  const safeRating = Number.isFinite(numericRating) && numericRating > 0 ? numericRating : null;

  const ratingScore = safeRating ? (safeRating / 5) * 6 : 0;
  if (safeRating) reasons.push(`Rated ${safeRating.toFixed(1)}/5`);

  const usageScore = (Math.min(sessions, 6) / 6) * 2;
  if (sessions > 0) reasons.push(`${sessions} session${sessions === 1 ? "" : "s"} logged`);

  const availabilityScore = available ? 1 : 0;
  if (available) reasons.push("In stock and ready to open");

  let rediscoveryScore = 0;
  if (lastUsedDays === null) {
    rediscoveryScore = 1;
    reasons.push("Never logged — unexplored");
  } else if (lastUsedDays > 90) {
    rediscoveryScore = 1;
    reasons.push(`Not used in ${lastUsedDays} days — worth revisiting`);
  } else if (lastUsedDays > 30) {
    rediscoveryScore = 0.5;
    reasons.push(`Last used ${lastUsedDays} days ago`);
  }

  reasons.push(...extraReasons.filter(Boolean));

  const score = Math.min(10, ratingScore + usageScore + availabilityScore + rediscoveryScore + extraBonus);
  return { score: round1(score), reasons };
}

/**
 * One pass over the pipe × blend matrix, used by both the pairing chart and
 * the blend rankings.
 */
export function buildPairingInsights({
  pipes = [],
  blends = [],
  smokingLogs = [],
  userProfile = null,
  blendsPerPipe = 5,
} = {}) {
  const activePipes = (pipes || []).filter(isActive);
  const activeBlends = (blends || []).filter((blend) => isActive(blend) && blend.ai_excluded !== true);

  const pipeUsage = buildUsageIndex(smokingLogs, {
    idFields: ["pipe_id"],
    dateFields: ["date", "created_date"],
    weightField: "bowls_used",
  });
  const blendUsage = buildUsageIndex(smokingLogs, {
    idFields: ["blend_id"],
    dateFields: ["date", "created_date"],
    weightField: "bowls_used",
  });

  const matrix = activePipes.map((pipe) => ({
    pipe,
    normalized: normalizePipeForPairing(pipe),
    results: activeBlends.map((blend) => ({
      blend,
      result: scorePipeBlend(pipe, blend, userProfile),
    })),
  }));

  const pipeRows = matrix.map(({ pipe, normalized, results }) => {
    const scored = results
      .map(({ blend, result }) => ({
        blendId: blend.id,
        blendName: blend.name || blend.tobacco_name || "Unnamed blend",
        blendType: blend.blend_type || blend.blend_family || "",
        manufacturer: blend.manufacturer || "",
        score: round1(result?.score),
        confidence: result?.confidence ?? null,
        why: result?.why || "",
        sessions: blendUsage.get(blend.id)?.sessions || 0,
      }))
      .sort((a, b) => b.score - a.score || a.blendName.localeCompare(b.blendName));

    const usage = pipeUsage.get(pipe.id);
    return {
      pipeId: pipe.id,
      name: pipe.name || "Unnamed pipe",
      maker: pipe.maker || "",
      shape: pipe.shape || "",
      material: pipe.bowl_material || "",
      photo: pipe.photos?.[0] || null,
      specialization: describeSpecialization(normalized),
      focus: Array.isArray(pipe.focus) ? pipe.focus : [],
      chamber: chamberLabel(pipe, normalized),
      sessions: usage?.sessions || 0,
      lastUsedDays: usage?.lastUsedDays ?? null,
      topScore: scored[0]?.score || 0,
      matches: scored.slice(0, Math.max(1, blendsPerPipe)),
    };
  });

  pipeRows.sort((a, b) => b.topScore - a.topScore || a.name.localeCompare(b.name));

  // Best pipe for each blend, from the same matrix.
  const blendBest = new Map();
  for (const { pipe, results } of matrix) {
    for (const { blend, result } of results) {
      const score = round1(result?.score);
      const current = blendBest.get(blend.id);
      if (!current || score > current.score) {
        blendBest.set(blend.id, {
          blendId: blend.id,
          name: blend.name || blend.tobacco_name || "Unnamed blend",
          type: blend.blend_type || blend.blend_family || "",
          manufacturer: blend.manufacturer || "",
          photo: blend.photos?.[0] || blend.logo || null,
          bestPipeName: pipe.name || "Unnamed pipe",
          score,
          why: result?.why || "",
          sessions: blendUsage.get(blend.id)?.sessions || 0,
          lastUsedDays: blendUsage.get(blend.id)?.lastUsedDays ?? null,
        });
      }
    }
  }

  const blendRows = [...blendBest.values()].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );

  return { pipeRows, blendRows, activePipes, activeBlends };
}

function wineWindowState(wine) {
  const now = Date.now();
  const start = wine?.drink_window_start ? new Date(wine.drink_window_start).getTime() : null;
  const end = wine?.drink_window_end ? new Date(wine.drink_window_end).getTime() : null;
  if (Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end) {
    return { state: "in_window", bonus: 1, reason: "In its drinking window right now" };
  }
  if (Number.isFinite(end) && now > end) {
    return { state: "past", bonus: 0.5, reason: "Past its drinking window — open soon" };
  }
  if (Number.isFinite(start) && now < start) {
    return { state: "before", bonus: 0, reason: `Hold until ${new Date(start).getFullYear()}` };
  }
  return { state: "unknown", bonus: 0, reason: null };
}

function buildWhiskeyRanking({ bottles = [], tastingLogs = [], limit = 10 }) {
  const usage = buildUsageIndex(tastingLogs, {
    idFields: ["bottle_id"],
    dateFields: ["tasting_date", "created_date"],
  });
  return (bottles || [])
    .filter(isActive)
    .map((bottle) => {
      const entry = usage.get(bottle.id);
      const scored = scoreFocusItem({
        rating: bottle.rating ?? entry?.avgRating ?? null,
        sessions: entry?.sessions || 0,
        lastUsedDays: entry?.lastUsedDays ?? null,
        available: hasStock(bottle),
        extraReasons: [bottle.type, bottle.region].filter(Boolean),
      });
      return {
        name: bottle.name || "Unnamed bottle",
        detail: [bottle.distillery, bottle.type, bottle.region].filter(Boolean).join(" · "),
        photo: bottle.photos?.[0] || bottle.photo || null,
        score: scored.score,
        explanation: scored.reasons.join(". "),
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildWineRanking({ wines = [], wineTastings = [], limit = 10 }) {
  const usage = buildUsageIndex(wineTastings, {
    idFields: ["wine_id"],
    dateFields: ["date", "created_date"],
  });
  return (wines || [])
    .filter(isActive)
    .map((wine) => {
      const entry = usage.get(wine.id);
      const window = wineWindowState(wine);
      const scored = scoreFocusItem({
        rating: wine.rating ?? entry?.avgRating ?? null,
        sessions: entry?.sessions || 0,
        lastUsedDays: entry?.lastUsedDays ?? null,
        available: hasStock(wine),
        extraBonus: window.bonus,
        extraReasons: [
          [wine.varietal, wine.region].filter(Boolean).join(" · "),
          window.reason,
        ],
      });
      return {
        name: wine.name || "Unnamed wine",
        detail: [wine.producer, wine.vintage, wine.varietal].filter(Boolean).join(" · "),
        photo: wine.photos?.[0] || null,
        score: scored.score,
        explanation: scored.reasons.join(". "),
        windowState: window.state,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildCigarRanking({ cigars = [], cigarSessions = [], limit = 10 }) {
  const usage = buildUsageIndex(cigarSessions, {
    idFields: ["cigar_id"],
    dateFields: ["date", "created_date"],
  });
  return (cigars || [])
    .filter(isActive)
    .map((cigar) => {
      const entry = usage.get(cigar.id);
      const boxDate = cigar.box_date ? new Date(cigar.box_date).getTime() : null;
      const restedMonths = Number.isFinite(boxDate) ? (Date.now() - boxDate) / (DAY_MS * 30.4) : null;
      const rested = Number.isFinite(restedMonths) && restedMonths >= 12;
      const scored = scoreFocusItem({
        rating: cigar.rating ?? entry?.avgRating ?? null,
        sessions: entry?.sessions || 0,
        lastUsedDays: entry?.lastUsedDays ?? null,
        available: hasStock(cigar),
        extraBonus: rested ? 0.5 : 0,
        extraReasons: [
          [cigar.brand, cigar.vitola].filter(Boolean).join(" · "),
          rested ? `Well rested — box date ${cigar.box_date}` : null,
        ],
      });
      return {
        name: cigar.name || "Unnamed cigar",
        detail: [cigar.brand, cigar.vitola, cigar.wrapper].filter(Boolean).join(" · "),
        photo: cigar.photos?.[0] || null,
        score: scored.score,
        explanation: scored.reasons.join(". "),
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildTopMatches({ modules, pipeRows, blendRows, bottles, wines, cigars, tastingLogs, cigarSessions, wineTastings, limit = 10 }) {
  const groups = [];

  if (modules.pipe) {
    groups.push({
      key: "pipe",
      label: "Top pipes",
      description: "Ranked by their strongest blend match in your collection.",
      entries: pipeRows.slice(0, limit).map((row) => ({
        name: row.name,
        detail: row.matches[0]
          ? `Best blend: ${row.matches[0].blendName}`
          : "No blends in collection yet",
        score: row.topScore,
        explanation: row.matches[0]?.why || row.specialization,
        photo: row.photo,
      })),
    });
    groups.push({
      key: "blend",
      label: "Top blends",
      description: "Ranked by the best pipe in your collection for each blend.",
      entries: blendRows.slice(0, limit).map((row) => ({
        name: row.name,
        detail: `Best pipe: ${row.bestPipeName}${row.type ? ` · ${row.type}` : ""}`,
        score: row.score,
        explanation: row.why,
        photo: row.photo,
      })),
    });
  }

  if (modules.whiskey) {
    groups.push({
      key: "whiskey",
      label: "Top whiskeys",
      description: "What to pour next, balancing rating, history and stock.",
      entries: buildWhiskeyRanking({ bottles, tastingLogs, limit }),
    });
  }

  if (modules.wine) {
    groups.push({
      key: "wine",
      label: "Top wines",
      description: "What to open next, including drinking-window timing.",
      entries: buildWineRanking({ wines, wineTastings, limit }),
    });
  }

  if (modules.cigar) {
    groups.push({
      key: "cigar",
      label: "Top cigars",
      description: "What to smoke next, balancing rating, rest and stock.",
      entries: buildCigarRanking({ cigars, cigarSessions, limit }),
    });
  }

  return groups;
}

function collectStale(items, usage, { moduleKey, verb, take = 2 }) {
  return (items || [])
    .filter(isActive)
    .map((item) => {
      const entry = usage.get(item.id);
      const lastUsedDays = entry?.lastUsedDays ?? null;
      if (lastUsedDays !== null && lastUsedDays <= 90) return null;
      return {
        module: moduleKey,
        title: item.name || "Unnamed item",
        detail: lastUsedDays === null
          ? `Never ${verb} — a good place to start with what you already own.`
          : `Not ${verb} in ${lastUsedDays} days — bring it back into rotation.`,
        weight: lastUsedDays === null ? Number.MAX_SAFE_INTEGER : lastUsedDays,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, take);
}

function buildComplementaryReport({
  modules,
  pipeRows,
  blendRows,
  pipes,
  blends,
  bottles,
  wines,
  cigars,
  smokingLogs,
  tastingLogs,
  cigarSessions,
  wineTastings,
}) {
  const groups = [];

  // 1. Cross-module session ideas straight from the canonical pairing engine.
  const crossModulePairings = generatePairingRecommendations({
    activeModules: {
      pipekeeper: Boolean(modules.pipe),
      whiskeykeeper: Boolean(modules.whiskey),
      cigarkeeper: Boolean(modules.cigar),
      winekeeper: Boolean(modules.wine),
    },
    pipes: modules.pipe ? pipes : [],
    blends: modules.pipe ? blends : [],
    bottles: modules.whiskey ? bottles : [],
    wines: modules.wine ? wines : [],
    cigars: modules.cigar ? cigars : [],
    smokingLogs,
    tastingLogs,
    cigarSessions,
  });

  const sessionIdeas = crossModulePairings
    .filter((pairing, index, all) => all.findIndex((other) => [other.pipe?.id, other.blend?.id, other.cigar?.id, other.liquid?.id].join('|') === [pairing.pipe?.id, pairing.blend?.id, pairing.cigar?.id, pairing.liquid?.id].join('|')) === index)
    .slice(0, 10)
    .map((pairing) => ({
      title: [pairing.pipe?.name, pairing.blend?.name, pairing.cigar?.name, pairing.liquid?.name]
        .filter(Boolean)
        .join(" + "),
      detail: pairing.whyItWorks || pairing.narrative || "",
      meta: pairing.pairingFamilyLabel || "",
    }))
    .filter((entry) => entry.title);

  if (sessionIdeas.length) {
    groups.push({
      key: "sessions",
      title: "New session ideas from your collection",
      description: "Combinations drawn from what you already own.",
      entries: sessionIdeas,
    });
  }

  // 2. Rediscovery picks.
  const rediscover = [];
  if (modules.pipe) {
    rediscover.push(
      ...collectStale(pipes, buildUsageIndex(smokingLogs, { idFields: ["pipe_id"], dateFields: ["date", "created_date"], weightField: "bowls_used" }), { moduleKey: "pipe", verb: "smoked" }),
      ...collectStale(blends, buildUsageIndex(smokingLogs, { idFields: ["blend_id"], dateFields: ["date", "created_date"], weightField: "bowls_used" }), { moduleKey: "blend", verb: "smoked" }),
    );
  }
  if (modules.whiskey) {
    rediscover.push(
      ...collectStale(bottles, buildUsageIndex(tastingLogs, { idFields: ["bottle_id"], dateFields: ["tasting_date", "created_date"] }), { moduleKey: "whiskey", verb: "tasted" }),
    );
  }
  if (modules.wine) {
    rediscover.push(
      ...collectStale(wines, buildUsageIndex(wineTastings, { idFields: ["wine_id"], dateFields: ["date", "created_date"] }), { moduleKey: "wine", verb: "tasted" }),
    );
  }
  if (modules.cigar) {
    rediscover.push(
      ...collectStale(cigars, buildUsageIndex(cigarSessions, { idFields: ["cigar_id"], dateFields: ["date", "created_date"] }), { moduleKey: "cigar", verb: "smoked" }),
    );
  }

  if (rediscover.length) {
    groups.push({
      key: "rediscover",
      title: "Rediscover what you own",
      description: "Items that have been sitting quietly in your collection.",
      entries: rediscover.slice(0, 8).map((entry) => ({
        title: entry.title,
        detail: entry.detail,
        meta: entry.module,
      })),
    });
  }

  // 3. Collection gaps — specializations without a strong blend match.
  if (modules.pipe && pipeRows.length) {
    const bySpecialization = new Map();
    for (const row of pipeRows) {
      if (row.specialization === SPECIALIZATION_LABELS.unknown) continue;
      const current = bySpecialization.get(row.specialization) || { count: 0, best: 0 };
      current.count += 1;
      current.best = Math.max(current.best, row.topScore);
      bySpecialization.set(row.specialization, current);
    }
    const gaps = [...bySpecialization.entries()]
      .filter(([, value]) => value.best < 7)
      .map(([label, value]) => ({
        title: `${label} pipes are underserved`,
        detail: `${value.count} pipe${value.count === 1 ? "" : "s"} with this specialization have no blend scoring above 7. Try its highest-ranked owned blends in small trial sessions before considering a specialization change.`,
        meta: "pipe",
      }));

    const unmatchedBlends = blendRows
      .filter((row) => row.score < 7)
      .slice(0, 3)
      .map((row) => ({
        title: row.name,
        detail: `No pipe in your collection scores above 7 for this blend. Try its best available owned pipe match and log the result; the score alone does not establish that a specialization change is needed.`,
        meta: "blend",
      }));

    const entries = [...gaps.slice(0, 4), ...unmatchedBlends];
    if (entries.length) {
      groups.push({
        key: "gaps",
        title: "Specialization trials with owned blends",
        description: "Where your collection and your pairings do not yet line up.",
        entries,
      });
    }
  }

  // 4. Timing — wines that should be opened.
  if (modules.wine) {
    const drinkNow = (wines || [])
      .filter(isActive)
      .filter((wine) => wine.drink_window_end && new Date(wine.drink_window_end).getTime() < Date.now() && hasStock(wine))
      .slice(0, 4)
      .map((wine) => ({
        title: wine.name || "Unnamed wine",
        detail: `Its drinking window ended ${wine.drink_window_end}. Open it soon rather than holding it longer.`,
        meta: "wine",
      }));
    if (drinkNow.length) {
      groups.push({
        key: "timing",
        title: "Drink now",
        description: "Bottles past their estimated drinking window.",
        entries: drinkNow,
      });
    }
  }

  return groups;
}

/**
 * Assemble the complete report payload.
 */
export function buildCollectionReport({ data = {}, options = {} } = {}) {
  const modules = options.modules || {};
  const blendsPerPipe = Number(options.blendsPerPipe) || 5;

  const pipes = modules.pipe ? (data.pipes || []).filter((pipe) => (!options.pipeId || pipe.id === options.pipeId) && (!options.specialization || (pipe.focus || []).includes(options.specialization))) : [];
  const blends = modules.pipe ? data.blends || [] : [];
  const bottles = modules.whiskey ? data.bottles || [] : [];
  const wines = modules.wine ? data.wines || [] : [];
  const cigars = modules.cigar ? data.cigars || [] : [];
  const smokingLogs = modules.pipe ? data.smokingLogs || [] : [];
  const tastingLogs = modules.whiskey ? data.tastingLogs || [] : [];
  const cigarSessions = modules.cigar ? data.cigarSessions || [] : [];
  const wineTastings = modules.wine ? data.wineTastings || [] : [];

  const { pipeRows, blendRows } = buildPairingInsights({
    pipes,
    blends,
    smokingLogs,
    userProfile: data.userProfile || null,
    blendsPerPipe,
  });

  const topMatches = buildTopMatches({
    modules,
    pipeRows,
    blendRows,
    bottles,
    wines,
    cigars,
    tastingLogs,
    cigarSessions,
    wineTastings,
  });

  const complementary = buildComplementaryReport({
    modules,
    pipeRows,
    blendRows,
    pipes,
    blends,
    bottles,
    wines,
    cigars,
    smokingLogs,
    tastingLogs,
    cigarSessions,
    wineTastings,
  });

  const sessionGroup = complementary.find((group) => group.key === 'sessions');
  if (sessionGroup?.entries.length) {
    topMatches.unshift({
      key: 'combinations',
      label: 'Top 10 cross-module combinations',
      description: 'Ordered session suggestions from Curator. These are suggestions, not measured compatibility scores.',
      entries: sessionGroup.entries.map((entry) => ({
        name: entry.title, detail: entry.meta, explanation: entry.detail, score: null,
      })),
    });
  }

  const summary = {
    pipes: pipes.filter(isActive).length,
    blends: blends.filter(isActive).length,
    bottles: bottles.filter(isActive).length,
    wines: wines.filter(isActive).length,
    cigars: cigars.filter(isActive).length,
    sessions: smokingLogs.length + tastingLogs.length + cigarSessions.length + wineTastings.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    modules,
    blendsPerPipe,
    includePhotos: options.includePhotos !== false,
    includeExplanations: options.includeExplanations !== false,
    summary,
    pairingChart: pipeRows,
    topMatches,
    complementary,
  };
}