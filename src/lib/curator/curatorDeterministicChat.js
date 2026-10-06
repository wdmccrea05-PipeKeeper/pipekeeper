function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatList(items = [], limit = 8) {
  const visible = items.slice(0, limit);
  const suffix = items.length > limit ? `, and ${items.length - limit} more` : '';
  return visible.join(', ') + suffix;
}

function extractImages(record = {}) {
  return [
    record.photo,
    record.image,
    record.image_url,
    record.photo_url,
    record.primary_photo,
    ...(Array.isArray(record.photos) ? record.photos : []),
  ].filter(Boolean);
}

function getAllRecords(context = {}) {
  return [
    ...(context.pipes || []).map((record) => ({ ...record, _recordType: 'pipe' })),
    ...(context.blends || []).map((record) => ({ ...record, _recordType: 'blend' })),
    ...(context.bottles || []).map((record) => ({ ...record, _recordType: 'bottle' })),
    ...(context.cigars || []).map((record) => ({ ...record, _recordType: 'cigar' })),
    ...(context.wines || []).map((record) => ({ ...record, _recordType: 'wine' })),
  ];
}

function findRecordByName(name, context = {}) {
  const target = norm(name);
  if (!target) return null;
  return getAllRecords(context).find((record) => norm(record.name) === target) || null;
}

function summarizeActiveModules(activeModules = {}) {
  const labels = [
    activeModules.pipekeeper && 'PipeKeeper',
    activeModules.whiskeykeeper && 'WhiskeyKeeper',
    activeModules.cigarkeeper && 'CigarKeeper',
    activeModules.winekeeper && 'WineKeeper',
  ].filter(Boolean);
  return labels.length ? labels.join(', ') : 'none';
}

function isBottleOpen(record = {}, inventoryUnits = []) {
  const directState = [
    record.open_status,
    record.status,
    record.bottle_status,
    record.opened ? 'opened' : null,
    record.is_open === true ? 'opened' : record.is_open === false ? 'unopened' : null,
  ].filter(Boolean).map(norm);

  if (directState.some((value) => ['open', 'opened'].includes(value))) return true;
  if (directState.some((value) => ['closed', 'sealed', 'unopened', 'full'].includes(value))) return false;

  const linkedUnits = inventoryUnits.filter((unit) => (unit.bottle_id || unit.bottleId) === record.id);
  if (!linkedUnits.length) return false;
  return linkedUnits.some((unit) => {
    const raw = norm(unit.status || unit.state || unit.fill_state);
    return ['open', 'opened', 'partial'].includes(raw) || toNumber(unit.remaining_ml) < toNumber(unit.total_ml);
  });
}

function getLowStockValue(record = {}, recordType) {
  if (recordType === 'cigar') {
    return toNumber(record.quantity ?? record.quantity_on_hand ?? record.sticks_on_hand ?? record.count ?? record.inventory_count);
  }
  if (recordType === 'blend') {
    return toNumber(record.quantity_oz ?? record.total_oz ?? record.quantity ?? record.remaining_oz);
  }
  if (recordType === 'wine') {
    return toNumber(record.quantity ?? record.bottles_on_hand ?? record.inventory_count);
  }
  if (recordType === 'bottle') {
    return toNumber(record.quantity ?? record.inventory_count ?? record.bottles_on_hand);
  }
  return null;
}

function isLowStock(record = {}, recordType) {
  const value = getLowStockValue(record, recordType);
  if (value == null) return false;
  if (recordType === 'blend') return value <= 2;
  return value <= 2;
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const parsed = new Date(dateValue).getTime();
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor((Date.now() - parsed) / 86400000);
}

function buildUsageIndex(logs = [], idKeys = [], dateKeys = []) {
  const index = new Map();
  logs.forEach((log) => {
    const id = idKeys.map((key) => log?.[key]).find(Boolean);
    const date = dateKeys.map((key) => log?.[key]).find(Boolean);
    if (!id || !date) return;
    const current = index.get(id);
    if (!current || new Date(date).getTime() > new Date(current).getTime()) {
      index.set(id, date);
    }
  });
  return index;
}

function flattenPairingScores(pairingMatrixPairings = []) {
  return pairingMatrixPairings.flatMap((row) => {
    const pipeId = row?.pipe_id || row?.pipeId || row?.id || null;
    const pipeName = row?.pipe_name || row?.pipeName || row?.name || null;
    const pipeShape = row?.pipe_shape || row?.shape || null;
    return (Array.isArray(row?.recommendations) ? row.recommendations : [])
      .map((recommendation) => ({
        pipeId,
        pipeName,
        pipeShape,
        tobaccoName: recommendation?.tobacco_name || recommendation?.blend_name || recommendation?.name || null,
        score: toNumber(recommendation?.score),
      }))
      .filter((entry) => entry.tobaccoName);
  });
}

function parseScoreThreshold(message) {
  const thresholdMatch = message.match(/\b(?:under|below|at most|or lower|<=?)\s*(\d+(?:\.\d+)?)\b/i)
    || message.match(/\b(?:above|over|at least|or higher|>=?)\s*(\d+(?:\.\d+)?)\b/i)
    || message.match(/\b(\d+(?:\.\d+)?)\s*(?:or lower|or less)\b/i);
  if (!thresholdMatch) return null;
  return Number(thresholdMatch[1]);
}

function buildPairingScoreReply(message, context = {}, entityContext = {}) {
  const lowerMessage = norm(message);
  const isPairingQuery =
    /\bpair|pairing|pairs|paired|compatibility|compatible|score|scored|rating|rated|best with|worst with|poorly with\b/i.test(message);
  if (!isPairingQuery) return null;

  const rows = Array.isArray(context.pairingMatrixPairings) ? context.pairingMatrixPairings : [];
  if (!rows.length) {
    return {
      handled: true,
      reply: 'I don’t see a generated pairing matrix yet. Generate one from Pairings and I can analyze the scores.',
    };
  }

  const flattened = flattenPairingScores(rows);
  const scored = flattened.filter((entry) => entry.score != null);
  if (!scored.length && !(/\bmissing|unrated|without\b/.test(lowerMessage) && /\bpair/.test(lowerMessage))) {
    return {
      handled: true,
      reply: 'You have saved pairings, but I don’t see ratings on them yet.',
    };
  }

  const threshold = parseScoreThreshold(message);
  const namedRecord = getAllRecords(context).find((record) => lowerMessage.includes(norm(record.name)));
  const subjectName = namedRecord?.name || entityContext?.subject?.name || null;
  const subjectType = namedRecord?._recordType || entityContext?.subject?.type || null;

  if (threshold != null) {
    const wantsAbove = /\b(?:above|over|at least|or higher|>=?)\b/i.test(message);
    const matches = scored
      .filter((entry) => wantsAbove ? entry.score >= threshold : entry.score <= threshold)
      .sort((a, b) => wantsAbove ? (b.score - a.score || norm(a.pipeName).localeCompare(norm(b.pipeName))) : (a.score - b.score || norm(a.pipeName).localeCompare(norm(b.pipeName))));
    return {
      handled: true,
      reply: matches.length
        ? `${pluralize(matches.length, 'pairing')} scored ${threshold} or ${wantsAbove ? 'higher' : 'lower'}: ${formatList(matches.map((entry) => `${entry.pipeName} × ${entry.tobaccoName} (${entry.score})`))}.`
        : `I don’t see any pairings scored ${threshold} or ${wantsAbove ? 'higher' : 'lower'}.`,
    };
  }

  if (subjectName && subjectType === 'blend') {
    const matches = scored
      .filter((entry) => norm(entry.tobaccoName) === norm(subjectName))
      .sort((a, b) => b.score - a.score);
    return {
      handled: true,
      reply: matches.length
        ? `${matches[0].pipeName} pairs best with ${subjectName} at ${matches[0].score}. ${matches.length > 1 ? `Next best: ${formatList(matches.slice(1, 4).map((entry) => `${entry.pipeName} (${entry.score})`), 3)}.` : ''}`.trim()
        : `I don’t see any scored pairings for ${subjectName}.`,
    };
  }

  if (subjectName && subjectType === 'pipe') {
    const direction = /poor|worst|lowest|weakest/.test(lowerMessage) ? 'poorly' : 'best';
    const matches = scored
      .filter((entry) => norm(entry.pipeName) === norm(subjectName))
      .sort((a, b) => direction === 'poorly' ? a.score - b.score : b.score - a.score);
    return {
      handled: true,
      reply: matches.length
        ? `${direction === 'poorly' ? 'Lowest-scoring' : 'Best'} tobaccos for ${subjectName}: ${formatList(matches.slice(0, 5).map((entry) => `${entry.tobaccoName} (${entry.score})`), 5)}.`
        : `I don’t see any scored pairings for ${subjectName}.`,
    };
  }

  if (/best|highest|top/.test(lowerMessage) && /pair/.test(lowerMessage)) {
    const matches = [...scored].sort((a, b) => b.score - a.score);
    return {
      handled: true,
      reply: matches.length
        ? `Best pairing${matches.length === 1 ? '' : 's'}: ${formatList(matches.slice(0, 5).map((entry) => `${entry.pipeName} × ${entry.tobaccoName} (${entry.score})`), 5)}.`
        : 'I do not see any scored pairings yet.',
    };
  }

  if (/worst|lowest|poor|poorly|weakest/.test(lowerMessage) && /pair/.test(lowerMessage)) {
    const matches = [...scored].sort((a, b) => a.score - b.score);
    return {
      handled: true,
      reply: matches.length
        ? `Worst pairing${matches.length === 1 ? '' : 's'}: ${formatList(matches.slice(0, 5).map((entry) => `${entry.pipeName} × ${entry.tobaccoName} (${entry.score})`), 5)}.`
        : 'I do not see any scored pairings yet.',
    };
  }

  if (/\bmissing|unrated|without\b/.test(lowerMessage) && /\bpair/.test(lowerMessage)) {
    const unrated = flattened.filter((entry) => entry.score == null);
    return {
      handled: true,
      reply: unrated.length
        ? `${pluralize(unrated.length, 'pairing')} are missing ratings: ${formatList(unrated.map((entry) => `${entry.pipeName} × ${entry.tobaccoName}`))}.`
        : 'All current pairing rows have ratings.',
    };
  }

  return null;
}

function buildMissingFieldReply(message, context = {}) {
  const lowerMessage = norm(message);
  const fields = [
    { records: context.bottles || [], field: 'abv', label: 'whiskeys', pattern: /\bwhisk(?:e)?y|bottles?\b.*\bmissing\b.*\babv\b|\bmissing\b.*\babv\b/ },
    { records: context.bottles || [], field: 'region', label: 'whiskeys', pattern: /\bwhisk(?:e)?y|bottles?\b.*\bmissing\b.*\bregion\b/ },
    { records: context.bottles || [], field: 'country', label: 'whiskeys', pattern: /\bwhisk(?:e)?y|bottles?\b.*\bmissing\b.*\bcountry\b/ },
    { records: context.wines || [], field: 'vintage', label: 'wines', pattern: /\bwines?\b.*\bmissing\b.*\bvintage\b|\bmissing\b.*\bvintage\b/ },
    { records: context.wines || [], field: 'producer', label: 'wines', pattern: /\bwines?\b.*\bmissing\b.*\bproducer\b/ },
    { records: context.wines || [], field: 'region', label: 'wines', pattern: /\bwines?\b.*\bmissing\b.*\bregion\b/ },
    { records: context.wines || [], field: 'appellation', label: 'wines', pattern: /\bwines?\b.*\bmissing\b.*\bappellation\b/ },
    { records: context.cigars || [], field: 'wrapper', label: 'cigars', pattern: /\bcigars?\b.*\bmissing\b.*\bwrapper\b/ },
    { records: context.cigars || [], field: 'binder', label: 'cigars', pattern: /\bcigars?\b.*\bmissing\b.*\bbinder\b/ },
    { records: context.cigars || [], field: 'filler', label: 'cigars', pattern: /\bcigars?\b.*\bmissing\b.*\bfiller\b/ },
    { records: context.cigars || [], field: 'vitola', label: 'cigars', pattern: /\bcigars?\b.*\bmissing\b.*\bvitola\b/ },
    { records: context.blends || [], field: 'blend_type', label: 'blends', pattern: /\b(?:tobacco|blend)s?\b.*\bmissing\b.*\bblend type\b|\bmissing\b.*\bblend type\b/ },
    { records: context.blends || [], field: 'strength', label: 'blends', pattern: /\b(?:tobacco|blend)s?\b.*\bmissing\b.*\bstrength\b/ },
    { records: context.blends || [], field: 'cut', label: 'blends', pattern: /\b(?:tobacco|blend)s?\b.*\bmissing\b.*\bcut\b/ },
    { records: context.blends || [], field: 'tobacco_components', label: 'blends', pattern: /\b(?:tobacco|blend)s?\b.*\bmissing\b.*\bcomponents?\b/ },
    { records: context.pipes || [], field: 'maker', label: 'pipes', pattern: /\bpipes?\b.*\bmissing\b.*\bmaker\b/ },
    { records: context.pipes || [], field: 'shape', label: 'pipes', pattern: /\bpipes?\b.*\bmissing\b.*\bshape\b/ },
    { records: context.pipes || [], field: 'dimensions', label: 'pipes', pattern: /\bpipes?\b.*\bmissing\b.*\bdimensions?\b/ },
  ];

  const match = fields.find((entry) => entry.pattern.test(lowerMessage));
  if (!match) return null;

  const missing = match.records.filter((record) => record?.[match.field] == null || record?.[match.field] === '');
  return {
    handled: true,
    reply: missing.length
      ? `${pluralize(missing.length, match.label.slice(0, -1), match.label)} missing ${match.field}: ${formatList(missing.map((record) => record.name))}.`
      : `I do not see any ${match.label} missing ${match.field}.`,
  };
}

function buildImageGapReply(message, context = {}) {
  if (!/\b(image|images|photo|photos)\b/i.test(message)) return null;

  const lowerMessage = norm(message);
  const buckets = [
    { label: 'pipes', records: context.pipes || [], active: /\bpipes?\b|\bpipe\b/.test(lowerMessage) },
    { label: 'blends', records: context.blends || [], active: /\bblend|tobacco/.test(lowerMessage) },
    { label: 'bottles', records: context.bottles || [], active: /\bbottles?\b|\bwhiskey\b/.test(lowerMessage) },
    { label: 'cigars', records: context.cigars || [], active: /\bcigars?\b/.test(lowerMessage) },
    { label: 'wines', records: context.wines || [], active: /\bwines?\b/.test(lowerMessage) },
  ];

  const selected = buckets.filter((bucket) => bucket.active);
  const targetBuckets = selected.length ? selected : buckets;
  const missing = targetBuckets.flatMap((bucket) =>
    bucket.records.filter((record) => extractImages(record).length === 0).map((record) => `${record.name}${selected.length ? '' : ` (${bucket.label})`}`)
  );

  if (/\bplaceholder|generic\b/.test(lowerMessage)) {
    const placeholders = targetBuckets.flatMap((bucket) =>
      bucket.records
        .filter((record) => extractImages(record).some((url) => /placeholder|default|generic/i.test(String(url || ''))))
        .map((record) => `${record.name}${selected.length ? '' : ` (${bucket.label})`}`)
    );
    return {
      handled: true,
      reply: placeholders.length
        ? `${pluralize(placeholders.length, 'record')} use placeholder/generic images: ${formatList(placeholders)}.`
        : 'I do not see records using placeholder/generic images.',
    };
  }

  if (/\breviewed image candidates?|approved image candidates?\b/.test(lowerMessage)) {
    const reviewed = targetBuckets.flatMap((bucket) =>
      bucket.records
        .filter((record) => Array.isArray(record.image_candidates) && record.image_candidates.some((candidate) => candidate?.reviewed === true))
        .map((record) => `${record.name}${selected.length ? '' : ` (${bucket.label})`}`)
    );
    return {
      handled: true,
      reply: reviewed.length
        ? `${pluralize(reviewed.length, 'record')} have reviewed image candidates: ${formatList(reviewed)}.`
        : 'I do not see reviewed image candidates yet.',
    };
  }

  if (!/\bmissing|need|without\b/.test(lowerMessage)) return null;

  return {
    handled: true,
    reply: missing.length
      ? `${pluralize(missing.length, 'record')} need images: ${formatList(missing)}.`
      : 'I do not see any records missing images.',
  };
}

function buildInventoryReply(message, context = {}) {
  const lowerMessage = norm(message);

  if (/how many unopened bottles/.test(lowerMessage)) {
    const unopened = (context.bottles || []).filter((record) => !isBottleOpen(record, context.inventoryUnits || []));
    return {
      handled: true,
      reply: `You have ${pluralize(unopened.length, 'unopened bottle')}.`,
    };
  }

  if (/which bottles are open|open bottles/.test(lowerMessage)) {
    const open = (context.bottles || []).filter((record) => isBottleOpen(record, context.inventoryUnits || []));
    return {
      handled: true,
      reply: open.length ? `Open bottles: ${formatList(open.map((record) => record.name))}.` : 'I do not see any open bottles.',
    };
  }

  if (/which bottles are unopened|unopened bottles/.test(lowerMessage)) {
    const unopened = (context.bottles || []).filter((record) => !isBottleOpen(record, context.inventoryUnits || []));
    return {
      handled: true,
      reply: unopened.length ? `Unopened bottles: ${formatList(unopened.map((record) => record.name))}.` : 'I do not see any unopened bottles.',
    };
  }

  const lowStockType = /\bcigars?\b/.test(lowerMessage)
    ? 'cigar'
    : /\bwines?\b/.test(lowerMessage)
      ? 'wine'
      : /\bbottles?\b|\bwhiskey\b/.test(lowerMessage)
        ? 'bottle'
        : /\btobacco|blend/.test(lowerMessage)
          ? 'blend'
          : null;

  if (lowStockType && /\blow on|running low|restock|running out\b/.test(lowerMessage)) {
    const records = {
      cigar: context.cigars || [],
      wine: context.wines || [],
      bottle: context.bottles || [],
      blend: context.blends || [],
    }[lowStockType];
    const lowStock = records.filter((record) => isLowStock(record, lowStockType));
    const label = lowStockType === 'blend' ? 'blends' : `${lowStockType}s`;
    return {
      handled: true,
      reply: lowStock.length
        ? `Low-stock ${label}: ${formatList(lowStock.map((record) => `${record.name} (${getLowStockValue(record, lowStockType)})`))}.`
        : `I do not see any ${label} below the current restock threshold.`,
    };
  }

  const thresholdMatch = lowerMessage.match(/\bunder\s+(\d+(?:\.\d+)?)\s*(sticks?|oz|ounces?|bottles?)\b/);
  if (thresholdMatch) {
    const threshold = Number(thresholdMatch[1]);
    if (!Number.isFinite(threshold)) return null;

    if (/cigars?/.test(lowerMessage)) {
      const matches = (context.cigars || []).filter((record) => (getLowStockValue(record, 'cigar') ?? Infinity) < threshold);
      return {
        handled: true,
        reply: matches.length
          ? `Cigars under ${threshold} sticks: ${formatList(matches.map((record) => `${record.name} (${getLowStockValue(record, 'cigar')})`))}.`
          : `I do not see cigars under ${threshold} sticks.`,
      };
    }
    if (/wines?/.test(lowerMessage) && /\bquantity\s*0|zero\b/.test(lowerMessage)) {
      const matches = (context.wines || []).filter((record) => (getLowStockValue(record, 'wine') ?? null) === 0);
      return {
        handled: true,
        reply: matches.length
          ? `Wines with quantity 0: ${formatList(matches.map((record) => record.name))}.`
          : 'I do not see wines with quantity 0.',
      };
    }
    if (/(tobacco|blend)/.test(lowerMessage)) {
      const matches = (context.blends || []).filter((record) => (getLowStockValue(record, 'blend') ?? Infinity) < threshold);
      return {
        handled: true,
        reply: matches.length
          ? `Tobacco blends below ${threshold} oz: ${formatList(matches.map((record) => `${record.name} (${getLowStockValue(record, 'blend')})`))}.`
          : `I do not see tobacco blends below ${threshold} oz.`,
      };
    }
  }

  if (/\bwines?\b.*\bquantity\b.*\b0|zero\b/.test(lowerMessage)) {
    const matches = (context.wines || []).filter((record) => (getLowStockValue(record, 'wine') ?? null) === 0);
    return {
      handled: true,
      reply: matches.length
        ? `Wines with quantity 0: ${formatList(matches.map((record) => record.name))}.`
        : 'I do not see wines with quantity 0.',
    };
  }

  if (/\bdo i have any\b|\bdo i own\b/.test(lowerMessage)) {
    const target = message.replace(/.*\b(?:do i have any|do i own)\b/i, '').replace(/\?+$/, '').trim();
    if (!target) return null;
    const match = findRecordByName(target, context);
    return {
      handled: true,
      reply: match
        ? `Yes — ${match.name} is in your ${match._recordType === 'bottle' ? 'WhiskeyKeeper' : match._recordType === 'wine' ? 'WineKeeper' : match._recordType === 'cigar' ? 'CigarKeeper' : 'PipeKeeper'} collection.`
        : `I do not see ${target} in your collection.`,
    };
  }

  return null;
}

function formatSessionDate(value) {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSessionLine(log, { pipes = [], blends = [], includePipe = false, includeBlend = true, includeNotes = false } = {}) {
  const pipe = pipes.find((p) => String(p.id) === String(log?.pipe_id || log?.pipeId || ''));
  const blend = blends.find((b) => String(b.id) === String(log?.blend_id || log?.blendId || ''));
  const pipeName = pipe?.name || log?.pipe_name || log?.external_pipe_name || null;
  const blendName = blend?.name || log?.blend_name || log?.external_blend_name || null;
  const details = [includePipe ? pipeName : null, includeBlend ? blendName : null].filter(Boolean).join(' — ');
  const note = includeNotes && String(log?.notes || '').trim() ? ` — Notes: ${String(log.notes).trim()}` : '';
  return `- ${formatSessionDate(log?.date || log?.created_date)}${details ? ` — ${details}` : ''}${note}`;
}

function buildOtherModuleHistoryReply(message, context = {}) {
  const lower = norm(message);
  const historyIntent = /\b(tasted|tasting|smoked|session|sessions|logged|log|history|dates?|notes?|ratings?|pairings?)\b/i.test(message)
    && /\b(all|every|when|date|dates|notes|history|logged|sessions?|tastings?|compare|rating|ratings|pairing|pairings)\b/i.test(message);
  if (!historyIntent) return null;

  const modules = [
    {
      type: 'whiskey',
      records: context.bottles || [],
      logs: context.tastingLogs || [],
      idKeys: ['bottle_id', 'bottleId'],
      nameKeys: ['bottle_name', 'external_bottle_name'],
      dateKeys: ['tasting_date', 'date', 'created_date'],
      modulePattern: /\bwhisk(?:e)?y|bourbon|scotch|bottle|tasting\b/i,
      extra: (log) => [
        log?.rating != null ? `Rating: ${log.rating}/5` : null,
        log?.serving_method ? `Served: ${log.serving_method}` : null,
        log?.pairing ? `Pairing: ${log.pairing}` : null,
      ],
      notes: (log) => log?.notes,
    },
    {
      type: 'cigar',
      records: context.cigars || [],
      logs: context.cigarSessions || [],
      idKeys: ['cigar_id', 'cigarId'],
      nameKeys: ['cigar_name', 'external_cigar_name'],
      dateKeys: ['date', 'created_date'],
      modulePattern: /\bcigar|cigars|vitola\b/i,
      extra: (log) => [
        log?.rating != null ? `Rating: ${log.rating}/5` : null,
        log?.pairing ? `Pairing: ${log.pairing}` : null,
        log?.overall_enjoyment != null ? `Enjoyment: ${log.overall_enjoyment}/5` : null,
        log?.burn_quality ? `Burn: ${log.burn_quality}` : null,
        log?.draw_quality ? `Draw: ${log.draw_quality}` : null,
      ],
      notes: (log) => [
        log?.notes,
        log?.construction_notes && `Construction: ${log.construction_notes}`,
        log?.burn_notes && `Burn: ${log.burn_notes}`,
        log?.draw_notes && `Draw: ${log.draw_notes}`,
        log?.flavor_progression && `Progression: ${log.flavor_progression}`,
        log?.first_third_notes && `First third: ${log.first_third_notes}`,
        log?.second_third_notes && `Second third: ${log.second_third_notes}`,
        log?.final_third_notes && `Final third: ${log.final_third_notes}`,
      ].filter(Boolean).join(' | '),
    },
    {
      type: 'wine',
      records: context.wines || [],
      logs: context.wineTastingLogs || [],
      idKeys: ['wine_id', 'wineId'],
      nameKeys: ['wine_name', 'external_wine_name'],
      dateKeys: ['date', 'tasting_date', 'created_date'],
      modulePattern: /\bwine|wines|vintage|winery\b/i,
      extra: (log) => [
        log?.rating != null ? `Rating: ${log.rating}/5` : null,
        log?.serving_method ? `Served: ${log.serving_method}` : null,
        log?.food_pairing ? `Food pairing: ${log.food_pairing}` : null,
        log?.occasion ? `Occasion: ${log.occasion}` : null,
      ],
      notes: (log) => [
        log?.notes,
        log?.aroma_notes && `Aroma: ${log.aroma_notes}`,
        log?.palate_notes && `Palate: ${log.palate_notes}`,
        log?.finish_notes && `Finish: ${log.finish_notes}`,
      ].filter(Boolean).join(' | '),
    },
  ];

  const namedCandidates = modules.flatMap((m) => m.records.map((record) => ({ module: m, record })))
    .filter(({ record }) => norm(record?.name) && lower.includes(norm(record.name)))
    .sort((a, b) => norm(b.record.name).length - norm(a.record.name).length);
  let selected = namedCandidates[0] || null;

  if (!selected) {
    const module = modules.find((m) => m.modulePattern.test(message));
    if (!module) return null;
    // For a module-wide request, return every historical row.
    selected = { module, record: null };
  }

  const { module, record } = selected;
  if (!module.logs.length) return null;
  const recordIds = record ? new Set([String(record.id)]) : null;
  const recordName = record ? norm(record.name) : null;
  const matches = module.logs.filter((log) => {
    if (!record) return true;
    const id = module.idKeys.map((key) => log?.[key]).find(Boolean);
    const name = norm(module.nameKeys.map((key) => log?.[key]).find(Boolean));
    return (id && recordIds.has(String(id))) || (name && name === recordName);
  }).sort((a, b) => {
    const da = module.dateKeys.map((key) => a?.[key]).find(Boolean);
    const db = module.dateKeys.map((key) => b?.[key]).find(Boolean);
    return new Date(da || 0) - new Date(db || 0);
  });

  const label = record?.name || `all ${module.type} history`;
  if (!matches.length) return { handled: true, reply: `I don't see any logged ${module.type} history for ${label}.` };

  const wantsNotes = /\bnotes?|aroma|palate|finish|construction|burn|draw|flavor|progression\b/i.test(message);
  const wantsDetails = wantsNotes || /\brating|ratings|pairing|pairings|served|serving|occasion\b/i.test(message);
  const lines = matches.map((log) => {
    const dateValue = module.dateKeys.map((key) => log?.[key]).find(Boolean);
    const loggedName = module.nameKeys.map((key) => log?.[key]).find(Boolean);
    const recordFromId = module.records.find((r) => module.idKeys.some((key) => String(log?.[key] || '') === String(r.id)));
    const name = record?.name || recordFromId?.name || loggedName || `Unknown ${module.type}`;
    const extras = wantsDetails ? module.extra(log).filter(Boolean) : [];
    const notes = wantsNotes ? String(module.notes(log) || '').trim() : '';
    return `- ${formatSessionDate(dateValue)} — ${name}${extras.length ? ` — ${extras.join(' — ')}` : ''}${notes ? ` — Notes: ${notes}` : ''}`;
  });
  const noteCount = matches.filter((log) => String(module.notes(log) || '').trim()).length;
  return {
    handled: true,
    reply: `I found ${pluralize(matches.length, module.type === 'cigar' ? 'logged session' : 'logged tasting')} for ${label}.${wantsNotes ? ` ${noteCount} have saved notes.` : ''}\n${lines.join('\n')}`,
  };
}

function buildSessionHistoryReply(message, context = {}) {
  const lower = norm(message);
  const historyIntent = /\b(session|sessions|smoked|smoke|logged|log|history|dates?|notes?|used|use)\b/i.test(message)
    && /\b(all|every|when|date|dates|notes|history|logged|sessions?|compare|comparison)\b/i.test(message);
  if (!historyIntent) return null;

  const logs = context.smokingLogs || [];
  const pipes = context.pipes || [];
  const blends = context.blends || [];
  if (!logs.length) return null;

  const namedPipes = [...pipes]
    .filter((p) => norm(p.name) && lower.includes(norm(p.name)))
    .sort((a, b) => norm(b.name).length - norm(a.name).length);
  const namedBlends = [...blends]
    .filter((b) => norm(b.name) && lower.includes(norm(b.name)))
    .sort((a, b) => norm(b.name).length - norm(a.name).length);

  const materialMatchers = [
    { pattern: /\b(cob|cobs|corn cob|corncob)s?\b/i, value: 'corn cob', label: 'corn cob pipes' },
    { pattern: /\bmeerschaum(s)?\b/i, value: 'meerschaum', label: 'meerschaum pipes' },
    { pattern: /\bbriar(s)?\b/i, value: 'briar', label: 'briar pipes' },
    { pattern: /\bclay(s)?\b/i, value: 'clay', label: 'clay pipes' },
    { pattern: /\bmorta(s)?\b/i, value: 'morta', label: 'morta pipes' },
  ];
  const requestedMaterials = materialMatchers.filter((m) => m.pattern.test(message));

  const logMatchesPipes = (log, targetPipes) => {
    const ids = new Set(targetPipes.map((p) => String(p.id)));
    const names = new Set(targetPipes.map((p) => norm(p.name)).filter(Boolean));
    const id = log?.pipe_id || log?.pipeId;
    const name = norm(log?.pipe_name || log?.external_pipe_name);
    return (id && ids.has(String(id))) || (name && names.has(name));
  };
  const logMatchesBlends = (log, targetBlends) => {
    const ids = new Set(targetBlends.map((b) => String(b.id)));
    const names = new Set(targetBlends.map((b) => norm(b.name)).filter(Boolean));
    const id = log?.blend_id || log?.blendId;
    const name = norm(log?.blend_name || log?.external_blend_name);
    return (id && ids.has(String(id))) || (name && names.has(name));
  };
  const chronological = (rows) => [...rows].sort((a, b) => new Date(a.date || a.created_date || 0) - new Date(b.date || b.created_date || 0));

  // Compare two material categories (for example cobs vs briars), including saved notes.
  if (/\b(compare|comparison|versus|vs\.?|between)\b/i.test(message) && requestedMaterials.length >= 2) {
    const groups = requestedMaterials.slice(0, 2).map((material) => {
      const targetPipes = pipes.filter((p) => norm(p.bowl_material).replace(/[-_]/g, ' ') === material.value);
      const rows = chronological(logs.filter((log) => logMatchesPipes(log, targetPipes)));
      return { material, targetPipes, rows };
    });
    const sections = groups.map(({ material, targetPipes, rows }) => {
      if (!targetPipes.length) return `${material.label}: no matching pipes in the collection.`;
      if (!rows.length) return `${material.label}: no logged sessions.`;
      const notes = rows.filter((r) => String(r?.notes || '').trim()).length;
      return `${material.label}: ${pluralize(rows.length, 'session')}, ${pluralize(notes, 'session')} with notes.\n${rows.map((log) => formatSessionLine(log, { pipes, blends, includePipe: true, includeBlend: true, includeNotes: true })).join('\n')}`;
    });
    return { handled: true, reply: sections.join('\n\n') };
  }

  // A named tobacco/blend can be queried directly across every pipe it was smoked in.
  if (namedBlends.length) {
    const blend = namedBlends[0];
    const matches = chronological(logs.filter((log) => logMatchesBlends(log, [blend])));
    if (!matches.length) return { handled: true, reply: `I don't see any logged smoking sessions for ${blend.name}.` };
    const wantsNotes = /\bnotes?\b/i.test(message);
    const noteCount = matches.filter((log) => String(log?.notes || '').trim()).length;
    return {
      handled: true,
      reply: `I found ${pluralize(matches.length, 'logged session')} for ${blend.name}.${wantsNotes ? ` ${noteCount} of those sessions have saved notes.` : ''}\n${matches.map((log) => formatSessionLine(log, { pipes, blends, includePipe: true, includeBlend: false, includeNotes: wantsNotes })).join('\n')}`,
    };
  }

  let targetPipes = [];
  let targetLabel = '';
  if (namedPipes.length) {
    targetPipes = [namedPipes[0]];
    targetLabel = namedPipes[0].name;
  } else if (requestedMaterials.length) {
    const material = requestedMaterials[0];
    targetPipes = pipes.filter((p) => norm(p.bowl_material).replace(/[-_]/g, ' ') === material.value);
    targetLabel = material.label;
  } else if (/\b(all|every)\b/i.test(message) && /\bpipes?\b/i.test(message)) {
    targetPipes = pipes;
    targetLabel = 'all pipes';
  } else {
    return null;
  }

  if (!targetPipes.length) return { handled: true, reply: `I don't see any ${targetLabel} in your current PipeKeeper collection.` };
  const matches = chronological(logs.filter((log) => logMatchesPipes(log, targetPipes)));
  if (!matches.length) return { handled: true, reply: `I don't see any logged smoking sessions for ${targetLabel}.` };

  const wantsNotes = /\bnotes?\b/i.test(message);
  const noteCount = matches.filter((log) => String(log?.notes || '').trim()).length;
  return {
    handled: true,
    reply: `I found ${pluralize(matches.length, 'logged session')} for ${targetLabel}.${wantsNotes ? ` ${noteCount} of those sessions have saved notes.` : ''}\n${matches.map((log) => formatSessionLine(log, { pipes, blends, includePipe: targetPipes.length > 1, includeBlend: true, includeNotes: wantsNotes })).join('\n')}`,
  };
}

function buildUsageReply(message, context = {}) {
  const lowerMessage = norm(message);

  if (/\buntasted\b.*\bbottles?\b|\bbottles?\b.*\buntasted\b/.test(lowerMessage)) {
    const tastedBottleIds = new Set((context.tastingLogs || []).map((log) => log?.bottle_id || log?.bottleId).filter(Boolean));
    const untasted = (context.bottles || []).filter((record) => !tastedBottleIds.has(record.id));
    return { handled: true, reply: untasted.length ? `Untasted bottles: ${formatList(untasted.map((record) => record.name))}.` : 'All bottles have tasting history.' };
  }

  if (/\buntasted\b.*\bwines?\b|\bwines?\b.*\buntasted\b/.test(lowerMessage)) {
    const tastedWineIds = new Set((context.wineTastingLogs || []).map((log) => log?.wine_id || log?.wineId).filter(Boolean));
    const untasted = (context.wines || []).filter((record) => !tastedWineIds.has(record.id));
    return { handled: true, reply: untasted.length ? `Untasted wines: ${formatList(untasted.map((record) => record.name))}.` : 'All wines have tasting history.' };
  }

  if (/\bcigars?\b.*\bno session history|no session history.*\bcigars?\b/.test(lowerMessage)) {
    const cigarSessionIds = new Set((context.cigarSessions || []).map((log) => log?.cigar_id || log?.cigarId).filter(Boolean));
    const matches = (context.cigars || []).filter((record) => !cigarSessionIds.has(record.id));
    return { handled: true, reply: matches.length ? `Cigars without session history: ${formatList(matches.map((record) => record.name))}.` : 'All cigars have session history.' };
  }

  if (!/\bnot been used recently|haven.?t used recently|unused|not used recently\b/i.test(message)) return null;

  const wantsBlends = /\bblends?|tobacco\b/i.test(message);
  const idKeys = wantsBlends ? ['blend_id', 'blendId'] : ['pipe_id', 'pipeId'];
  const records = wantsBlends ? (context.blends || []) : (context.pipes || []);
  const usageIndex = buildUsageIndex(context.smokingLogs || [], idKeys, ['date', 'created_date']);
  const candidates = records
    .map((record) => ({
      name: record.name,
      days: daysSince(usageIndex.get(record.id)),
    }))
    .filter((entry) => entry.days == null || entry.days >= 30)
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
  const label = wantsBlends ? 'Blends' : 'Pipes';

  return {
    handled: true,
    reply: candidates.length
      ? `${label} not used recently: ${formatList(candidates.map((entry) => entry.days == null ? `${entry.name} (never logged)` : `${entry.name} (${entry.days} days)`))}.`
      : `I do not see any ${label.toLowerCase()} that have fallen out of recent use.`,
  };
}

function buildValuationReply(message, context = {}) {
  if (!/\bvalue|valuable|worth|valuation\b/i.test(message)) return null;

  const pickValue = (record = {}) => (
    toNumber(record.estimated_value)
    ?? toNumber(record.collector_value)
    ?? toNumber(record.average_market_value)
    ?? toNumber(record.current_market_value)
    ?? toNumber(record.retail_price)
    ?? toNumber(record.purchase_price)
    ?? null
  );

  const sums = {
    whiskey: (context.bottles || []).reduce((sum, bottle) => sum + (pickValue(bottle) ?? 0), 0),
    cigar: (context.cigars || []).reduce((sum, cigar) => sum + (pickValue(cigar) ?? 0), 0),
    wine: (context.wines || []).reduce((sum, wine) => sum + (pickValue(wine) ?? 0), 0),
  };
  const total = Object.values(sums).reduce((sum, value) => sum + value, 0);
  const allRecords = [
    ...(context.bottles || []).map((record) => ({ ...record, _module: 'whiskey' })),
    ...(context.cigars || []).map((record) => ({ ...record, _module: 'cigar' })),
    ...(context.wines || []).map((record) => ({ ...record, _module: 'wine' })),
  ];
  const valuedRecords = allRecords
    .map((record) => ({ ...record, _value: pickValue(record) }))
    .filter((record) => record._value != null);

  if (/\btotal\b|\bcollection\b/.test(message)) {
    return {
      handled: true,
      reply: `Current tracked value: ${total.toFixed(2)} total (${sums.whiskey.toFixed(2)} whiskey, ${sums.cigar.toFixed(2)} cigars, ${sums.wine.toFixed(2)} wine).`,
    };
  }

  if (/\baverage\b/.test(message)) {
    const avg = valuedRecords.length ? valuedRecords.reduce((sum, record) => sum + record._value, 0) / valuedRecords.length : 0;
    return {
      handled: true,
      reply: `Average tracked value is ${avg.toFixed(2)} across ${pluralize(valuedRecords.length, 'valued record')}.`,
    };
  }

  if (/\bmost valuable|highest value|top value\b/.test(message)) {
    const ranked = [...valuedRecords].sort((a, b) => b._value - a._value).slice(0, 5);
    return {
      handled: true,
      reply: ranked.length
        ? `Most valuable records: ${formatList(ranked.map((record) => `${record.name} (${record._value.toFixed(2)})`), 5)}.`
        : 'No records have valuation data yet.',
    };
  }

  if (/\bleast valuable|lowest value\b/.test(message)) {
    const ranked = [...valuedRecords].sort((a, b) => a._value - b._value).slice(0, 5);
    return {
      handled: true,
      reply: ranked.length
        ? `Least valuable records: ${formatList(ranked.map((record) => `${record.name} (${record._value.toFixed(2)})`), 5)}.`
        : 'No records have valuation data yet.',
    };
  }

  if (/\bno valuation|missing valuation|without valuation\b/.test(message)) {
    const missing = allRecords.filter((record) => pickValue(record) == null);
    return {
      handled: true,
      reply: missing.length
        ? `${pluralize(missing.length, 'record')} missing valuation: ${formatList(missing.map((record) => record.name))}.`
        : 'All records have valuation data.',
    };
  }

  if (/\bstale valuation|outdated valuation\b/.test(message)) {
    const stale = allRecords.filter((record) => {
      const days = daysSince(record.valuation_updated_at || record.valuation_updated_date || record.updated_date);
      return days != null && days >= 180;
    });
    return {
      handled: true,
      reply: stale.length
        ? `Stale valuation records (180+ days): ${formatList(stale.map((record) => record.name))}.`
        : 'I do not see stale valuation records right now.',
    };
  }

  return null;
}

function buildModuleReply(message, activeModules = {}) {
  const lowerMessage = norm(message);
  if (/\bwhich modules are active\b|\bwhat modules are active\b/.test(lowerMessage)) {
    return {
      handled: true,
      reply: `Active modules: ${summarizeActiveModules(activeModules)}.`,
    };
  }

  const moduleChecks = [
    { key: 'pipekeeper', label: 'PipeKeeper' },
    { key: 'whiskeykeeper', label: 'WhiskeyKeeper' },
    { key: 'cigarkeeper', label: 'CigarKeeper' },
    { key: 'winekeeper', label: 'WineKeeper' },
  ];
  const match = moduleChecks.find((entry) => lowerMessage.includes(entry.label.toLowerCase()));
  if (!match || !/\bactive|enabled|available\b/.test(lowerMessage)) return null;
  return {
    handled: true,
    reply: `${match.label} is ${activeModules?.[match.key] ? 'active' : 'not active'}.`,
  };
}

export function answerCuratorDeterministicQuery(message, context = {}, entityContext = {}, activeModules = {}) {
  const handlers = [
    () => buildModuleReply(message, activeModules),
    () => buildPairingScoreReply(message, context, entityContext),
    () => buildMissingFieldReply(message, context),
    () => buildImageGapReply(message, context),
    () => buildInventoryReply(message, context),
    () => buildOtherModuleHistoryReply(message, context),
    () => buildSessionHistoryReply(message, context),
    () => buildUsageReply(message, context),
    () => buildValuationReply(message, context),
  ];

  for (const handler of handlers) {
    const result = handler();
    if (result?.handled) return result;
  }

  return { handled: false };
}

export {
  flattenPairingScores,
  getLowStockValue,
  isBottleOpen,
  isLowStock,
};
