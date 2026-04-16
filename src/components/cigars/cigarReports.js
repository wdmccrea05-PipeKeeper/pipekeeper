import { summarizeCigarReadiness, getCigarReadiness } from '@/platform/agingReadiness';

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getCigarQuantity(cigar) {
  // Prefer normalized singles_equivalent when available to preserve package-to-stick math;
  // fall back to quantity for legacy records that don't have singles_equivalent yet.
  return Math.max(0, toNumber(cigar?.singles_equivalent ?? cigar?.quantity ?? 0));
}

export function getCigarUnitValue(cigar) {
  const estimated = toNumber(cigar?.estimated_value, 0);
  if (estimated > 0) return estimated;
  return Math.max(0, toNumber(cigar?.purchase_price, 0));
}

export function getCigarRemainingValue(cigar) {
  return getCigarQuantity(cigar) * getCigarUnitValue(cigar);
}

export function getCigarDisplayName(cigar) {
  return [cigar?.brand, cigar?.name].filter(Boolean).join(' ') || 'Unknown cigar';
}

export function hasMeaningfulValuation(cigar) {
  return getCigarUnitValue(cigar) > 0;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(date, today) {
  if (!date) return null;
  return Math.floor((today.getTime() - date.getTime()) / DAY_MS);
}

export function buildSessionIndexByCigar(sessions = []) {
  return sessions.reduce((acc, session) => {
    if (!session?.cigar_id || session?.is_out_of_collection) return acc;
    if (!acc[session.cigar_id]) {
      acc[session.cigar_id] = { count: 0, ratings: [], latestDate: null, recentEnjoyment: [] };
    }
    acc[session.cigar_id].count += 1;

    const rating = toNumber(session.overall_enjoyment ?? session.rating, 0);
    if (rating > 0) acc[session.cigar_id].ratings.push(rating);

    const d = toDate(session.date);
    if (d && (!acc[session.cigar_id].latestDate || d > acc[session.cigar_id].latestDate)) {
      acc[session.cigar_id].latestDate = d;
    }

    if (rating >= 4) {
      acc[session.cigar_id].recentEnjoyment.push({
        date: session.date,
        cigar_name: session.cigar_name,
        overall_enjoyment: rating,
        notes: session.notes || '',
      });
    }

    return acc;
  }, {});
}

export function getPortfolioSummary(cigars = [], humidors = [], sessions = [], today = new Date()) {
  const safeToday = toDate(today) || new Date();
  const readiness = summarizeCigarReadiness(cigars, safeToday);
  const sessionIndex = buildSessionIndexByCigar(sessions);

  const totalCigars = cigars.reduce((sum, cigar) => sum + getCigarQuantity(cigar), 0);
  const totalEstimatedCollectionValue = cigars.reduce((sum, cigar) => sum + getCigarRemainingValue(cigar), 0);
  const totalUniqueCigars = cigars.length;

  const cigarsNeedingValuation = cigars.filter((c) => !hasMeaningfulValuation(c)).length;
  const lowStockFavorites = cigars.filter((c) => {
    if (!c?.is_favorite) return false;
    const qty = getCigarQuantity(c);
    const threshold = Math.max(1, toNumber(c?.restock_threshold, 3));
    return qty > 0 && qty <= threshold;
  }).length;

  const overdueToSmoke = cigars.filter((c) => {
    const qty = getCigarQuantity(c);
    if (qty <= 0) return false;

    const sessionData = sessionIndex[c.id];
    const lastSmokedDays = daysAgo(sessionData?.latestDate, safeToday);
    if (lastSmokedDays === null) {
      const addedDays = daysAgo(toDate(c.created_date), safeToday);
      return addedDays !== null && addedDays >= 180;
    }
    return lastSmokedDays >= 180;
  }).length;

  return {
    totalCigars,
    totalUniqueCigars,
    totalEstimatedCollectionValue,
    averageValuePerCigar: totalCigars > 0 ? totalEstimatedCollectionValue / totalCigars : 0,
    humidorCount: Array.isArray(humidors) ? humidors.length : 0,
    cigarsNeedingValuation,
    lowStockFavorites,
    readyNow: readiness.readyNow,
    resting: readiness.aging,
    overdueToSmoke,
  };
}

export function getValuationSections(cigars = [], humidors = [], today = new Date()) {
  const safeToday = toDate(today) || new Date();
  const humidorById = (humidors || []).reduce((acc, h) => {
    if (h?.id) acc[h.id] = h;
    return acc;
  }, {});

  const cigarsWithValue = cigars
    .map((cigar) => ({
      cigar,
      remainingValue: getCigarRemainingValue(cigar),
      quantity: getCigarQuantity(cigar),
    }))
    .filter((entry) => entry.remainingValue > 0);

  const highestValueCigars = cigarsWithValue
    .sort((a, b) => b.remainingValue - a.remainingValue)
    .slice(0, 10);

  const highestValueBrands = Object.values(
    cigarsWithValue.reduce((acc, entry) => {
      const brand = entry.cigar.brand || 'Unknown brand';
      if (!acc[brand]) acc[brand] = { name: brand, value: 0, quantity: 0, records: 0 };
      acc[brand].value += entry.remainingValue;
      acc[brand].quantity += entry.quantity;
      acc[brand].records += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value).slice(0, 8);

  const valueByHumidor = Object.values(
    cigarsWithValue.reduce((acc, entry) => {
      const humidorName = humidorById[entry.cigar.humidor_id]?.name || 'Unassigned';
      if (!acc[humidorName]) acc[humidorName] = { name: humidorName, value: 0, quantity: 0, records: 0 };
      acc[humidorName].value += entry.remainingValue;
      acc[humidorName].quantity += entry.quantity;
      acc[humidorName].records += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const missingValuation = cigars
    .filter((c) => !hasMeaningfulValuation(c))
    .map((c) => ({ cigar: c, quantity: getCigarQuantity(c) }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 12);

  const staleValuation = cigars
    .filter((c) => hasMeaningfulValuation(c))
    .map((c) => {
      const refDate = toDate(c.updated_date) || toDate(c.created_date);
      const staleDays = daysAgo(refDate, safeToday);
      return { cigar: c, staleDays: staleDays ?? 9999, quantity: getCigarQuantity(c), remainingValue: getCigarRemainingValue(c) };
    })
    .filter((entry) => entry.staleDays >= 120)
    .sort((a, b) => b.staleDays - a.staleDays)
    .slice(0, 12);

  const lowStockHighValue = cigarsWithValue
    .map((entry) => {
      const threshold = Math.max(1, toNumber(entry.cigar?.restock_threshold, 3));
      return { ...entry, threshold };
    })
    .filter((entry) => entry.quantity > 0 && entry.quantity <= entry.threshold)
    .sort((a, b) => b.remainingValue - a.remainingValue)
    .slice(0, 10);

  return {
    highestValueCigars,
    highestValueBrands,
    valueByHumidor,
    missingValuation,
    staleValuation,
    lowStockHighValue,
  };
}

function topCounts(items, key, limit = 8, fallback = 'Unknown') {
  const counts = items.reduce((acc, item) => {
    const name = item?.[key] || fallback;
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function getCollectorAnalytics(cigars = [], sessions = [], humidors = [], today = new Date()) {
  const safeToday = toDate(today) || new Date();
  const sessionIndex = buildSessionIndexByCigar(sessions);
  const humidorById = (humidors || []).reduce((acc, h) => {
    if (h?.id) acc[h.id] = h.name || 'Unnamed humidor';
    return acc;
  }, {});

  const inventoryByHumidor = cigars.reduce((acc, cigar) => {
    const name = humidorById[cigar.humidor_id] || 'Unassigned';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const mostSmoked = Object.entries(sessionIndex)
    .map(([cigarId, data]) => {
      const cigar = cigars.find((c) => c.id === cigarId);
      return {
        cigar,
        name: cigar ? getCigarDisplayName(cigar) : 'Unknown cigar',
        value: data.count,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const favorites = cigars
    .filter((c) => c?.is_favorite)
    .map((c) => {
      const sessionsForCigar = sessionIndex[c.id] || { count: 0, ratings: [] };
      const avgSession = sessionsForCigar.ratings.length
        ? sessionsForCigar.ratings.reduce((sum, r) => sum + r, 0) / sessionsForCigar.ratings.length
        : 0;
      return {
        cigar: c,
        name: getCigarDisplayName(c),
        quantity: getCigarQuantity(c),
        rating: toNumber(c.rating, 0),
        avgSessionRating: avgSession,
      };
    })
    .sort((a, b) => (b.avgSessionRating || b.rating) - (a.avgSessionRating || a.rating))
    .slice(0, 8);

  const ratingByBrandMap = {};
  sessions.forEach((session) => {
    if (session?.is_out_of_collection || !session?.cigar_id) return;
    const cigar = cigars.find((c) => c.id === session.cigar_id);
    if (!cigar?.brand) return;
    const rating = toNumber(session.overall_enjoyment ?? session.rating, 0);
    if (rating <= 0) return;
    if (!ratingByBrandMap[cigar.brand]) ratingByBrandMap[cigar.brand] = [];
    ratingByBrandMap[cigar.brand].push(rating);
  });

  const avgSessionRatingByBrand = Object.entries(ratingByBrandMap)
    .map(([brand, ratings]) => ({
      name: brand,
      value: Number((ratings.reduce((sum, n) => sum + n, 0) / ratings.length).toFixed(2)),
      samples: ratings.length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const recentlyEnjoyed = sessions
    .filter((s) => toNumber(s.overall_enjoyment ?? s.rating, 0) >= 4)
    .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0))
    .slice(0, 10)
    .map((s) => ({
      ...s,
      displayName: s.cigar_name || s.external_cigar_name || 'Unknown cigar',
      score: toNumber(s.overall_enjoyment ?? s.rating, 0),
    }));

  const readyNow = [];
  const readySoon = [];
  const longTermAging = [];
  const neglectedGems = [];

  cigars.forEach((cigar) => {
    const readiness = getCigarReadiness(cigar, safeToday);
    const qty = getCigarQuantity(cigar);
    if (qty <= 0) return;

    if (readiness.state === 'ready_now') readyNow.push(cigar);

    const readyDate = toDate(cigar.ready_to_smoke_date);
    const daysToReady = readyDate ? Math.floor((readyDate.getTime() - safeToday.getTime()) / DAY_MS) : null;
    if (daysToReady !== null && daysToReady >= 0 && daysToReady <= 60) readySoon.push(cigar);
    if (daysToReady !== null && daysToReady > 120) longTermAging.push(cigar);

    const latest = sessionIndex[cigar.id]?.latestDate || null;
    const lastDays = daysAgo(latest, safeToday);
    if ((cigar.is_favorite || toNumber(cigar.rating, 0) >= 4) && (lastDays === null || lastDays >= 180)) {
      neglectedGems.push({ cigar, lastDays });
    }
  });

  return {
    inventory: {
      byBrand: topCounts(cigars, 'brand'),
      byCountry: topCounts(cigars, 'country_of_origin'),
      byWrapper: topCounts(cigars, 'wrapper'),
      byBody: topCounts(cigars, 'body'),
      byStrength: topCounts(cigars, 'strength'),
      byHumidor: Object.entries(inventoryByHumidor).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    },
    smoking: {
      mostSmoked,
      favorites,
      avgSessionRatingByBrand,
      recentlyEnjoyed,
    },
    readiness: {
      readyNow,
      readySoon,
      longTermAging,
      neglectedGems: neglectedGems.sort((a, b) => (b.lastDays || 0) - (a.lastDays || 0)).slice(0, 10),
    },
    acquisition: {
      wishlist: cigars.filter((c) => c?.wishlist).length,
      shopping: cigars.filter((c) => c?.shopping_list).length,
      restock: cigars.filter((c) => c?.restock_flag).length,
      notForMe: cigars.filter((c) => c?.not_for_me).length,
    },
  };
}

function monthKey(date) {
  const d = toDate(date);
  if (!d) return null;
  return formatMonthKey(d);
}

function formatMonthKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function makeRollingMonths(today = new Date(), count = 12) {
  const out = [];
  const ref = new Date(today);
  ref.setUTCDate(1);
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
    const key = formatMonthKey(d);
    out.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
  }
  return out;
}

function getSnapshotValue(snapshot) {
  return toNumber(
    snapshot?.computed_current_value
      ?? snapshot?.computed_value
      ?? snapshot?.market_value
      ?? snapshot?.collector_value
      ?? snapshot?.retail_value,
    0
  );
}

export function getTrendFoundation(cigars = [], sessions = [], snapshots = [], today = new Date()) {
  const months = makeRollingMonths(today, 12);
  const monthKeys = new Set(months.map((m) => m.key));

  const purchaseByMonth = {};
  cigars.forEach((cigar) => {
    const key = monthKey(cigar.purchase_date || cigar.created_date);
    if (!key || !monthKeys.has(key)) return;
    purchaseByMonth[key] = (purchaseByMonth[key] || 0) + getCigarQuantity(cigar);
  });

  const smokeByMonth = {};
  sessions.forEach((session) => {
    if (session?.is_out_of_collection) return;
    const key = monthKey(session?.date);
    if (!key || !monthKeys.has(key)) return;
    smokeByMonth[key] = (smokeByMonth[key] || 0) + 1;
  });

  const valueSnapshotsByMonth = {};
  snapshots.forEach((snapshot) => {
    const key = monthKey(snapshot?.snapshot_date);
    if (!key || !monthKeys.has(key)) return;
    const value = getSnapshotValue(snapshot);
    valueSnapshotsByMonth[key] = (valueSnapshotsByMonth[key] || 0) + Math.max(0, value);
  });

  let runningCellarDelta = 0;
  const timeline = months.map(({ key, label }) => {
    const acquired = purchaseByMonth[key] || 0;
    const smoked = smokeByMonth[key] || 0;
    runningCellarDelta += (acquired - smoked);

    return {
      month: label,
      acquired,
      smoked,
      cellarDelta: runningCellarDelta,
      collectionValue: Number((valueSnapshotsByMonth[key] || 0).toFixed(2)),
    };
  });

  return {
    timeline,
    hasSnapshotValueTrend: timeline.some((row) => row.collectionValue > 0),
    hasActivity: timeline.some((row) => row.acquired > 0 || row.smoked > 0),
  };
}
