export function normalizeBowlId(bowlId) {
  return (!bowlId || bowlId === "main" || bowlId === "null") ? null : bowlId;
}

export function findPairing(activePairings, pipeId, bowlVariantId, pipeNameFallback) {
  const list = activePairings?.pairings || activePairings?.data?.pairings || [];
  const pid = String(pipeId);
  const bid = normalizeBowlId(bowlVariantId);

  let found = list.find(p => String(p.pipe_id) === pid && normalizeBowlId(p.bowl_variant_id) === bid);
  if (!found && !bid) found = list.find(p => String(p.pipe_id) === pid && !normalizeBowlId(p.bowl_variant_id));
  if (!found && pipeNameFallback) found = list.find(p => p.pipe_name === pipeNameFallback);
  return found || null;
}

export function getBlendScore(pairing, blendId) {
  if (!pairing) return null;
  const recs = pairing.recommendations || pairing.blend_matches || [];
  const id = String(blendId);
  const hit = recs.find(r => String(r.tobacco_id ?? r.blend_id ?? r.id ?? "") === id);
  return hit?.score ?? null;
}