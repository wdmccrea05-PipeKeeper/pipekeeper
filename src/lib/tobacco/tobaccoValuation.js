export function getTobaccoReplacementDifficulty(blend = {}) {
  const status = String(blend.production_status || '').toLowerCase();
  const seasonal = !!blend.seasonal || status.includes('seasonal');
  const discontinued = !!blend.discontinued || status.includes('discontinue');
  const limited = !!blend.limited_batch || !!blend.is_limited_release;
  const scarce = !!blend.regional_exclusive || !!blend.secondary_market_only;

  let score = 1;
  if (seasonal) score += 1;
  if (limited) score += 1;
  if (scarce) score += 1;
  if (discontinued) score += 2;

  if (score <= 1) return { level: 1, label: 'Very Easy to Replace', reason: 'Regular production and broad availability keep this easy to replace.' };
  if (score === 2) return { level: 2, label: 'Easy to Replace', reason: 'Still widely available, though not quite as common as staple blends.' };
  if (score === 3) return { level: 3, label: 'Moderately Difficult', reason: 'Availability is narrower or less predictable than standard catalog blends.' };
  if (score === 4) return { level: 4, label: 'Hard to Replace', reason: 'This blend appears irregularly and may require planning to replace.' };
  return { level: 5, label: 'Very Hard / Rare', reason: 'Discontinuation, scarcity, or limited production make this hard to replace.' };
}

export function getTobaccoStrategy(blend = {}) {
  const difficulty = getTobaccoReplacementDifficulty(blend);
  if (difficulty.level <= 2) {
    return { state: 'Safe to Smoke', reason: 'Low replacement risk means this blend can be enjoyed freely.' };
  }
  if (difficulty.level === 3) {
    return { state: 'Your Call', reason: 'Replacement is possible but not effortless. Smoke it, but keep the supply in mind.' };
  }
  if (difficulty.level === 4) {
    return { state: 'Smoke Deliberately', reason: 'This is harder to replace, so it makes sense to smoke it with more intention.' };
  }
  return { state: 'Cellar Candidate', reason: 'Scarcity and replacement risk make this better suited to careful cellaring.' };
}
