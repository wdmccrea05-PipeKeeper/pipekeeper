function normalizeString(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "'")
    .replace(/[-–—]/g, ' ')
    .replace(/[.,!?;:()[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(str) {
  return normalizeString(str).split(' ').filter(Boolean);
}

function joinFields(...values) {
  return normalizeString(values.filter(Boolean).join(' '));
}

function scoreCandidate(query, candidateFields = []) {
  const normalizedQuery = normalizeString(query);
  const normalizedFields = candidateFields.map((field) => normalizeString(field)).filter(Boolean);
  const combined = joinFields(...candidateFields);
  const queryTokens = tokens(query);

  let bestScore = 0;
  let isExact = false;

  for (const field of normalizedFields) {
    if (field === normalizedQuery) {
      bestScore = Math.max(bestScore, 100);
      isExact = true;
    } else if (field.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 88);
    } else if (field.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 74);
    }
  }

  if (!isExact && combined === normalizedQuery) {
    bestScore = Math.max(bestScore, 96);
    isExact = true;
  } else if (!isExact && combined.startsWith(normalizedQuery)) {
    bestScore = Math.max(bestScore, 84);
  } else if (!isExact && combined.includes(normalizedQuery)) {
    bestScore = Math.max(bestScore, 70);
  }

  if (queryTokens.length > 0) {
    const combinedTokens = tokens(combined);
    const overlap = queryTokens.filter((token) =>
      combinedTokens.some((fieldToken) => fieldToken.includes(token) || token.includes(fieldToken))
    ).length;

    const overlapRatio = overlap / queryTokens.length;
    if (overlapRatio === 1) {
      bestScore = Math.max(bestScore, 68);
    } else if (overlapRatio >= 0.5) {
      bestScore = Math.max(bestScore, 54 + Math.round(overlapRatio * 10));
    }
  }

  return { score: bestScore, isExact };
}

function annotateAndSort(query, list, getFields) {
  return (list || [])
    .map((item) => {
      const { score, isExact } = scoreCandidate(query, getFields(item));
      return {
        ...item,
        _searchScore: score,
        _isExact: isExact,
      };
    })
    .filter((item) => item._searchScore > 0)
    .sort((a, b) => {
      if (a._isExact && !b._isExact) return -1;
      if (!a._isExact && b._isExact) return 1;
      return b._searchScore - a._searchScore;
    });
}

export function searchBlends(query, blends = []) {
  return annotateAndSort(query, blends, (blend) => [
    blend.name,
    blend.manufacturer,
    `${blend.manufacturer || ''} ${blend.name || ''}`,
  ]);
}

export function searchPipes(query, pipes = []) {
  return annotateAndSort(query, pipes, (pipe) => [
    pipe.name,
    pipe.model,
    pipe.maker,
    `${pipe.maker || ''} ${pipe.model || pipe.name || ''}`,
    `${pipe.maker || ''} ${pipe.name || ''}`,
  ]);
}

export function searchBottles(query, bottles = []) {
  return annotateAndSort(query, bottles, (bottle) => [
    bottle.name,
    bottle.expression,
    bottle.distillery,
    bottle.type,
    `${bottle.distillery || ''} ${bottle.expression || bottle.name || ''}`,
    `${bottle.distillery || ''} ${bottle.name || ''}`,
  ]);
}

export function rankSearchResults(query, results = [], type) {
  if (type === 'blend') return searchBlends(query, results);
  if (type === 'pipe') return searchPipes(query, results);
  if (type === 'bottle') return searchBottles(query, results);
  return results;
}
