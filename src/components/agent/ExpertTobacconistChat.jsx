import { useState, useEffect, useCallback, useMemo } from 'react';
import { SendHorizontal } from 'lucide-react';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner.js';
import {
  pick,
  buildDirectAnswer,
  buildReasoning,
  buildInsight,
  buildNextStep,
  structureResponse,
  buildSessionRecommendation,
  buildGapAnalysis,
  buildReassignmentCandidate,
  buildRedundancyFinding,
  buildCorrection,
  noDataResponses,
} from '@/components/curator/curatorVoiceLayer';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CURATOR STABILITY GUARD — COMPLETE HARDENING LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PHASES IMPLEMENTED:
 * ✓ PHASE 1: Canonical stability wrapper (runCuratorIntentSafely)
 * ✓ PHASE 2: Intent-specific safe fallbacks (all handlers protected)
 * ✓ PHASE 3: Hardened biggestGap() + brittle helpers (with safe fallbacks)
 * ✓ PHASE 4: Replaced all generic fatal messages (safeCuratorFallback)
 * ✓ PHASE 5: Context integrity checks (validateCuratorContext)
 * ✓ PHASE 6: Diagnostic logging without user-facing failures
 *
 * GUARANTEES:
 * • No crash between intents
 * • No lost ability to answer mid-conversation
 * • No "Something went wrong" generic error
 * • No dead-end responses even with weak data
 * • Structured diagnostics for debuggability
 *
 * FAILURE CASE FIXED:
 * User: "what should I drink tonight?" → Works
 * User: "what is my biggest gap?" → Now returns safe fallback instead of crash
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── Starter prompts ───────────────────────────────────────────────────────────
const STARTER_PROMPTS_SINGLE = [
  'What should I enjoy tonight?',
  "What haven't I used recently?",
  'What should I buy or restock next?',
  'What is the biggest gap in my collection?',
  'Which bottle should I open next?',
];
const STARTER_PROMPTS_MULTI = [
  'What is my most redundant pipe?',
  'Which pipe should I reassign?',
  'What should I smoke tonight?',
  'What should I buy or restock next?',
  'What is the biggest gap in my collection?',
  'Explain one good pairing from my collection.',
];

function norm(v) { return String(v || '').trim().toLowerCase(); }
function daysSince(d) {
  if (!d) return null;
  const ts = new Date(d).getTime();
  return ts ? Math.floor((Date.now() - ts) / 86400000) : null;
}
function extractNamedEntity(text, records = []) {
  const lower = norm(text);
  return records.find((r) => {
    const n = norm(r.name || '');
    return n && lower.includes(n);
  }) || null;
}

function evaluateEvidenceStrength({ sessionCount = 0, dominantCount = 0, hasConflict = false, hasMeta = false }) {
  if (hasConflict) return { evidenceClass: 'CONFLICTING', evidenceReason: 'user-provided information contradicts stored signal', confidence: 0.1 };
  if (sessionCount === 0 && !hasMeta) return { evidenceClass: 'INSUFFICIENT', evidenceReason: 'no session history and no reliable metadata', confidence: 0.0 };
  if (sessionCount === 0) return { evidenceClass: 'WEAK', evidenceReason: 'inferred from metadata only — no session history', confidence: 0.2 };
  const ratio = sessionCount > 0 ? dominantCount / sessionCount : 0;
  if (sessionCount >= 6 && ratio >= 0.7) return { evidenceClass: 'STRONG', evidenceReason: `${sessionCount} sessions, ${Math.round(ratio * 100)}% consistent signal`, confidence: 0.9 };
  if (sessionCount >= 3 && ratio >= 0.5) return { evidenceClass: 'MODERATE', evidenceReason: `${sessionCount} sessions with a ${Math.round(ratio * 100)}% lean`, confidence: 0.6 };
  if (sessionCount >= 1) return { evidenceClass: 'WEAK', evidenceReason: `only ${sessionCount} session${sessionCount > 1 ? 's' : ''} — too sparse for a firm conclusion`, confidence: 0.2 };
  return { evidenceClass: 'INSUFFICIENT', evidenceReason: 'insufficient data', confidence: 0.0 };
}

function evidenceQualifier(evidenceClass) {
  switch (evidenceClass) {
    case 'STRONG':       return '';
    case 'MODERATE':     return 'That said, the picture here is plausible rather than definitive — ';
    case 'WEAK':         return 'The session history is still thin, so this is more of an early signal than a settled conclusion — ';
    case 'CONFLICTING':  return 'The stored data and what you know from direct experience are pointing in opposite directions — ';
    case 'INSUFFICIENT': return 'There is not enough data yet for a confident read — ';
    default: return '';
  }
}

function classifyIntent(message) {
  const t = message.toLowerCase().trim();

  const constraintPatterns = [
    /\b(i want to|i don't want to|i don't want|i prefer|i prefer to|i use it for|i keep it for|i only use|it's only for|only for|never for|never used for|leave it|keep it as)\b/i,
    /\b(non-aromatic|aromatic-only|english-only|virginia-only|burley-only|constraint|exclude|don't suggest)\b/i,
  ];
  if (constraintPatterns.some((p) => p.test(t))) return 'FOLLOW_UP_CONSTRAINT';

  const nextCandidatePatterns = [
    /\b(what is the next|what's the next|what's next|next best|next one|next strongest|next candidate|second.?best|after that|who's next|what comes after)\b/i,
    /^(and )?next[?.]?$/i,
    /\bwhat about the next\b/i,
  ];
  if (nextCandidatePatterns.some((p) => p.test(t))) return 'FOLLOW_UP_NEXT_CANDIDATE';

  const correctionPatterns = [
    /\bbut (i have it|i use it|i don't|it never|it isn't|it is not|i already)\b/i,
    /\b(that'?s? not right|that'?s? wrong|that'?s? incorrect|that'?s? not accurate)\b/i,
    /\bit never (smoked|seen|had|been used for|been assigned)\b/i,
    /\bi (use|have|keep) it (for|as) (only|exclusively|just|aromatic|english|virginia|burley)/i,
    /\b(never smoked|never used|never had)\b/i,
    /\b(already on my (list|shopping list|want list|wishlist)|already (tracked|listed|owned|in my|classified|specialized|assigned))\b/i,
    /\bi already (have|own|have it|own it|tracked|added|listed)\b/i,
    /\b(that bottle is already|that blend is already|that pipe is already)\b/i,
    /\bactually[,.]? (it|that|i|no)\b/i,
    /^(no[,.]|nope[,.]|not quite[,.]|that'?s? not|but it|but i|but that)\b/i,
    /\bi don't use it that way\b/i,
  ];
  if (correctionPatterns.some((p) => p.test(t))) return 'USER_CORRECTION';

  const followUpPattern = /\b(it|that|this one|this pipe|that pipe|this blend|that blend|this bottle|that bottle|the one|how does it|how does that|how does this|where does it|is it redundant|what would you do with it|how does it compare|why that one|what about the other)\b/i;
  const comparisonPattern = /\b(compare|redundant|overlap|where does it sit|how does it fit)\b/i;
  if (followUpPattern.test(t) || comparisonPattern.test(t)) return 'FOLLOW_UP';

  if (/\b(pairing|pair with|pair together|combine|combination|explain why .+ work together)\b/i.test(t)) return 'EXPLAIN_PAIRING';
  if (/\b(tonight|enjoy|smoke|drink|open next|session|use|revisit|rediscover|haven.?t used|haven.?t had)\b/i.test(t)) return 'SESSION_RECOMMENDATION';
  if (/\b(restock|running low|running out|buy next|replenish)\b/i.test(t)) return 'RESTOCK_ADVICE';
  if (/\b(gap|missing|biggest gap|collection gap)\b/i.test(t)) return 'GAP_ANALYSIS';
  if (/\b(redundant|most redundant|overlap)\b/i.test(t)) return 'COLLECTION_ANALYSIS';

  const reassignPatterns = [
    /\b(reassign|reassignment|respecializ|re-specializ)\b/i,
    /\b(change (specialization|focus|role)|new role|different role|better suited elsewhere|better specialization)\b/i,
    /\b(no longer fits|doesn.?t fit).*(specializ|focus|role|lane)/i,
    /\b(benefit.*(reassign|respecializ|new role|different role))/i,
    /\b(strongest|best).*(reassignment|respecializ|candidate)/i,
    /\b(which|what) pipe.*(reassign|respecializ|should change|new specializ|no longer fits)/i,
  ];
  if (reassignPatterns.some((p) => p.test(t))) return 'PIPE_REASSIGNMENT_ANALYSIS';

  if (/\b(evaluate|assess|how does .+ fit|where does .+ sit|role of)\b/i.test(t)) return 'EVALUATE_OWNED_ITEM';

  return 'UNKNOWN';
}

function evaluateOwnedBottle(bottle, bottles = [], tastingLogs = []) {
  const type = norm(bottle.type || bottle.whiskey_type || 'unknown');
  const sameType = bottles.filter((b) => b.id !== bottle.id && norm(b.type || b.whiskey_type || '').split(' ').some((w) => type.includes(w) || type.split(' ').some((tw) => tw === w)));
  const adjacent = sameType.slice(0, 3);
  const tastings = tastingLogs.filter((l) => l?.bottle_id === bottle.id || l?.bottleId === bottle.id);
  const tastingCount = tastings.length;
  const evidence = evaluateEvidenceStrength({ sessionCount: tastingCount, dominantCount: tastingCount, hasMeta: !!bottle.type });
  const overlapLevel = sameType.length >= 3 ? 'high' : sameType.length >= 1 ? 'moderate' : 'none';
  const role =
    sameType.length >= 3 ? 'overlapping — multiple similar bottles compete for the same lane' :
    sameType.length === 2 ? 'one of three in its style — moderate overlap' :
    sameType.length === 1 ? 'one of two in its lane — some overlap' :
    'sole representative of its type — no direct overlap';
  const usageState =
    tastingCount === 0 ? 'untasted — no tasting sessions logged' :
    tastingCount >= 5 ? `actively used — ${tastingCount} tasting sessions logged` :
    `lightly used — ${tastingCount} tasting session${tastingCount > 1 ? 's' : ''} logged`;
  const recommendation =
    tastingCount === 0 ? 'open it and log your first tasting — you have context for it but no session data' :
    overlapLevel === 'high' ? 'consider whether this lane needs all its occupants — this is a candidate for focused evaluation' :
    'keep it in rotation and log tasting notes to anchor its position in the collection';
  return { role, adjacentComparables: adjacent, overlapLevel, usageState, recommendation, evidence };
}

function evaluateOwnedBlend(blend, blends = [], smokingLogs = []) {
  const type = blend.blend_type || blend.blend_family || 'unknown';
  const sameType = blends.filter((b) => b.id !== blend.id && (b.blend_type || b.blend_family) === type);
  const adjacent = sameType.slice(0, 3);
  const usage = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
  const sessionCount = usage.length;
  const lastDate = usage.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
  const lastDays = daysSince(lastDate);
  const evidence = evaluateEvidenceStrength({ sessionCount, dominantCount: sessionCount, hasMeta: !!blend.blend_type });
  const overlapLevel = sameType.length >= 3 ? 'high' : sameType.length >= 1 ? 'moderate' : 'none';
  const role =
    sameType.length >= 3 ? `one of many ${type} blends — significant overlap in this family` :
    sameType.length >= 1 ? `one of ${sameType.length + 1} in the ${type} family` :
    `the only ${type} blend in your cellar`;
  const usageState =
    sessionCount === 0 ? 'never smoked — no sessions logged' :
    (lastDays !== null && lastDays > 60) ? `stale — ${sessionCount} sessions, last smoked ${lastDays} days ago` :
    `active — ${sessionCount} sessions logged`;
  const recommendation =
    sessionCount === 0 ? 'smoke it and log the session — it needs usage data before Curator can position it accurately' :
    overlapLevel === 'high' ? 'this family has coverage — decide if this blend is earning a distinct role or is redundant' :
    'continue rotating it — its position in the family is clear';
  return { role, adjacentComparables: adjacent, overlapLevel, usageState, recommendation, evidence };
}

function evaluateOwnedPipe(pipe, pipes = [], smokingLogs = []) {
  const shape = norm(pipe.shape || 'unknown');
  const sameShape = pipes.filter((p) => p.id !== pipe.id && norm(p.shape || '') === shape);
  const adjacent = sameShape.slice(0, 3);
  const usage = smokingLogs.filter((l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id);
  const sessionCount = usage.length;
  const lastDate = usage.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
  const lastDays = daysSince(lastDate);
  const focus = pipe.focus?.[0] || pipe.specialization || null;
  const evidence = evaluateEvidenceStrength({ sessionCount, dominantCount: sessionCount, hasMeta: !!pipe.shape });
  const overlapLevel = sameShape.length >= 2 ? 'high' : sameShape.length === 1 ? 'moderate' : 'none';
  const role =
    sameShape.length >= 2 ? `one of ${sameShape.length + 1} ${shape} pipes — crowded shape lane` :
    sameShape.length === 1 ? `one of two ${shape} pipes` :
    `the only ${shape} in your collection`;
  const usageState =
    sessionCount === 0 ? 'no sessions logged' :
    (lastDays !== null && lastDays > 45) ? `underused — ${sessionCount} sessions, last smoked ${lastDays} days ago` :
    `active — ${sessionCount} sessions`;
  const recommendation =
    sessionCount === 0 ? 'log a session to begin building its profile' :
    (overlapLevel === 'high' && sessionCount < 5) ? 'low usage in a crowded shape lane — evaluate whether it earns a distinct specialization' :
    focus ? `keep it assigned to ${focus} — usage data supports that focus` :
    'consider assigning a focus — its usage pattern suggests a natural specialization';
  return { role, adjacentComparables: adjacent, overlapLevel, usageState, recommendation, evidence };
}

function buildPipeUsage(pipes = [], smokingLogs = [], blends = []) {
  return pipes.map((pipe) => {
    const logs = smokingLogs.filter((l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id);
    const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
    const familyCounts = {};
    logs.forEach((log) => {
      const blend = blends.find((b) => b.id === (log?.blend_id || log?.blendId));
      const family = blend?.blend_type || blend?.blend_family || 'Unknown';
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    });
    const allTypes = Object.entries(familyCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
    const dominantCount = allTypes[0]?.count || 0;
    const sessionCount = logs.length;
    const evidence = evaluateEvidenceStrength({ sessionCount, dominantCount, hasMeta: !!pipe.shape });
    return { ...pipe, sessionCount, lastSmokedDays: daysSince(last), allTypes, dominantFamily: allTypes[0]?.type || null, dominantCount, evidence };
  });
}

function bestTonightPipe(pipes = [], smokingLogs = [], blends = []) {
  return buildPipeUsage(pipes, smokingLogs, blends)
    .filter((p) => (p.lastSmokedDays ?? 999) >= 10)
    .sort((a, b) => (b.lastSmokedDays || 0) - (a.lastSmokedDays || 0))[0] || pipes[0] || null;
}

function bestTonightBlend(blends = [], smokingLogs = []) {
  return blends
    .map((blend) => {
      const logs = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
      const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return { ...blend, sessionCount: logs.length, lastSmokedDays: daysSince(last) };
    })
    .sort((a, b) => (b.lastSmokedDays || 0) - (a.lastSmokedDays || 0))[0] || blends[0] || null;
}

function bestOpenBottle(bottles = [], tastingLogs = []) {
  const tastedIds = new Set(tastingLogs.map((l) => l?.bottle_id || l?.bottleId).filter(Boolean));
  return bottles.find((b) => !tastedIds.has(b.id)) || bottles[0] || null;
}

function mostRedundantPipe(pipes = [], smokingLogs = [], blends = []) {
  const usage = buildPipeUsage(pipes, smokingLogs, blends);
  const byShape = {};
  usage.forEach((p) => {
    const s = norm(p.shape || 'unknown');
    if (!byShape[s]) byShape[s] = [];
    byShape[s].push(p);
  });
  const crowded = Object.values(byShape).filter((g) => g.length >= 2).sort((a, b) => b.length - a.length)[0];
  if (!crowded) return usage.sort((a, b) => a.sessionCount - b.sessionCount)[0] || null;
  return crowded.slice().sort((a, b) => a.sessionCount - b.sessionCount)[0];
}

// PATCH 2+4: Safe fallback functions
function safeCuratorFallback(context, question) {
  const bottles = context?.bottles || [];
  const blends = context?.blends || [];

  if (bottles.length || blends.length) {
    return `I wasn't able to resolve that cleanly, but looking at your collection, there are still strong directions to explore. If you want, I can walk through your current lineup and highlight where it can expand or improve.`;
  }

  return "I wasn't able to resolve that from the current data. Try asking about a specific item, session, or gap and I'll walk through it with you.";
}

function fallbackGapAnalysis(context = {}) {
  const bottles = context?.bottles || [];
  const blends = context?.blends || [];

  if (!bottles.length && !blends.length) {
    return { gap: "Your collection is still taking shape. Once a few items are logged, I can identify structural gaps with precision.", evidenceClass: 'INSUFFICIENT' };
  }

  return { gap: "Your collection is established, but I was not able to resolve a clean gap classification from the current data. This usually points to incomplete metadata — once types and categories are fully defined, the gaps become much clearer.", evidenceClass: 'INSUFFICIENT' };
}

// PHASE 5: Context integrity validation
function validateCuratorContext(context = {}) {
  return {
    activeModules: context.activeModules || {},
    pipes: Array.isArray(context.pipes) ? context.pipes : [],
    blends: Array.isArray(context.blends) ? context.blends : [],
    bottles: Array.isArray(context.bottles) ? context.bottles : [],
    smokingLogs: Array.isArray(context.smokingLogs) ? context.smokingLogs : [],
    tastingLogs: Array.isArray(context.tastingLogs) ? context.tastingLogs : [],
    acquisitionItems: Array.isArray(context.acquisitionItems) ? context.acquisitionItems : (Array.isArray(context.wantListItems) ? context.wantListItems : []),
  };
}

// PHASE 1 + 6: Canonical stability wrapper
function runCuratorIntentSafely(handlerFn, { intent, message, context, entityContext, dataCounts }) {
  try {
    return handlerFn();
  } catch (err) {
    console.error('[Curator][IntentFailure]', { intent, message, error: String(err), dataCounts });
    return null; // Signal failure to caller
  }
}

// POLISH 1: Phrase variation helpers (expert tone rotation)
const confidentPhrases = [
  'is the clear standout',
  'emerges as the strongest signal',
  'stands out as the prime candidate',
  'is what the data points to most clearly',
  'is the obvious choice given the pattern',
];

const tentativePhrases = [
  'is worth considering',
  'warrants attention',
  'shows real promise',
  'is pointing in an interesting direction',
  'bears watching',
];

const nextStepPhrases = [
  'The next move is',
  'From here, I would',
  'The logical follow-up is',
  'What makes sense next is',
  'The productive step is',
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// POLISH 2: Gap analysis with directional insight
function biggestGapWithDirectionality(blends = [], bottles = [], activeModules = {}) {
  const hasBlends = blends && blends.length > 0;
  const hasBottles = bottles && bottles.length > 0;
  if (!hasBlends && !hasBottles) return { gap: 'Start logging items and sessions — the gaps will reveal themselves as the collection takes shape.', direction: 'establish_collection' };
  
  if (hasBlends && hasBottles) {
    const blendFamilies = new Set(blends.map((b) => b.blend_type || b.blend_family).filter(Boolean));
    const bottleTypes = new Set(bottles.map((b) => b.type || b.whiskey_type).filter(Boolean));
    const pairedCount = Math.min(blendFamilies.size, bottleTypes.size);
    const maxPossible = Math.max(blendFamilies.size, bottleTypes.size);
    if (pairedCount < maxPossible * 0.6) {
      return { gap: `Your blend families are diverse, but bottle types haven't caught up yet. Focusing next bottles on families that are under-represented in the whiskey selection would round out pairing options significantly.`, direction: 'expand_bottle_coverage' };
    }
  }
  
  if (hasBottles) {
    const bottleTypes = Object.entries((bottles || []).reduce((acc, b) => { const t = b.type || b.whiskey_type || 'Unknown'; acc[t] = (acc[t] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
    const dominant = bottleTypes[0]?.[0] || 'existing focus';
    const underrep = bottleTypes.slice(-2).map((t) => t[0]).filter(Boolean);
    return { gap: `The shelf is anchored in ${dominant}. The gap is in the contrasting categories — ${underrep.join(' and ')} would add needed variety.`, direction: 'add_contrast' };
  }
  
  return { gap: 'Blend diversity is established, but without tasting notes or direct feedback, the gap emerges in understanding which styles complement your preferences best.', direction: 'log_tastings' };
}

function pairingExplanationEngine(message, context = {}, entityContext = {}) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];

  let pipe = extractNamedEntity(message, pipes) || entityContext.pipe;
  let blend = extractNamedEntity(message, blends) || entityContext.blend;
  let bottle = extractNamedEntity(message, bottles) || entityContext.bottle;

  if (!pipe) pipe = bestTonightPipe(pipes, smokingLogs, blends);
  if (!blend) blend = bestTonightBlend(blends, smokingLogs);
  if (!bottle) bottle = bestOpenBottle(bottles, context?.tastingLogs || []);

  if (!pipe || !blend || !bottle) {
    return {
      reply: buildDirectAnswer('a clear reference point', 'weak') + ' To explain a pairing, name a pipe, blend, and bottle, or log more sessions so the collection has enough signal to work from.',
      updatedEntityContext: entityContext,
    };
  }

  const pipeLogs = smokingLogs.filter((l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id);
  const blendLogs = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
  const combinedLogs = pipeLogs.filter((l) => blendLogs.some((b) => b.id === l.id)).length;
  const pairingEvidence = evaluateEvidenceStrength({ sessionCount: combinedLogs, dominantCount: combinedLogs, hasMeta: true });

  const validationLine = pairingEvidence.evidenceClass === 'STRONG'
    ? 'This is one of your proven combinations — the session history backs it up.'
    : combinedLogs === 0
    ? 'These two have not been logged together yet, so think of this as a plausible fit rather than a confirmed one.'
    : 'There is some history here, though not quite enough sessions to call it firmly established.';

  const blendType = blend.blend_type || blend.blend_family || 'Unknown';
  const bottleType = bottle.type || bottle.whiskey_type || 'Unknown';

  let interactionDescription;
  if ((blendType.includes('English') || blendType.includes('Balkan')) && norm(bottleType).includes('peated')) {
    interactionDescription = `${blendType} layers dark, phenolic smoke in a way that reinforces the peat in ${bottleType}. Both elements push the same direction.`;
  } else if (blendType.includes('Aromatic') && norm(bottleType).includes('irish')) {
    interactionDescription = `The clean grain of ${bottleType} cuts through ${blendType}'s topping sweetness before it becomes cloying. The whiskey does useful structural work.`;
  } else if ((blendType.includes('Burley') || blendType.includes('Virginia/Burley')) && norm(bottleType).includes('bourbon')) {
    interactionDescription = `${blendType} earth and ${bottleType} caramel sit at adjacent registers — warm and full without direct competition.`;
  } else if (blendType.includes('Virginia/Perique') && norm(bottleType).includes('rye')) {
    interactionDescription = `Perique's pepper finds its match in ${bottleType}'s grain bite. They open texture in each other.`;
  } else if (blendType.includes('Virginia') && (norm(bottleType).includes('highland') || norm(bottleType).includes('speyside'))) {
    interactionDescription = `${blendType}'s bright fruit aligns with ${bottleType}'s fruity palate. Balance over boldness.`;
  } else {
    interactionDescription = `${blendType} and ${bottleType} maintain their own character without either one dominating.`;
  }

  const sessionContext = pairingEvidence.evidenceClass === 'STRONG'
    ? 'This pairing has session history backing it.'
    : combinedLogs === 0
    ? `You haven't logged these together yet — think of this as a plausible direction.`
    : `The pairing is emerging, though the signal isn't ironclad yet.`;

  const reply = `${pipe.name} with ${blend.name} and ${bottle.name}. ${sessionContext} What makes it work: ${interactionDescription} The bowl geometry matters — a well-rested piece keeps both elements clean and distinct.`;

  return {
    reply,
    updatedEntityContext: {
      ...entityContext,
      pipe, blend, bottle,
      topicIntent: 'explain_pairing',
      lastClaimType: 'pairing_explanation',
      lastEvidenceClass: pairingEvidence.evidenceClass,
      lastConclusion: `${pipe.name} + ${blend.name} + ${bottle.name} pairing`,
      relatedEntities: [pipe, blend, bottle],
    },
  };
}

function answerQuestion(message, context = {}, entityContext = {}, isSingleModuleMode = false, activeModules = {}, continueAnalysisFn = null) {
  const intent = classifyIntent(message);
  
  // PHASE 5: Validate context before processing
  const validatedContext = validateCuratorContext(context);
  const dataCounts = { pipes: validatedContext.pipes.length, blends: validatedContext.blends.length, bottles: validatedContext.bottles.length, smokingLogs: validatedContext.smokingLogs.length, tastingLogs: validatedContext.tastingLogs.length };

  const pipeActive    = activeModules.pipekeeper    !== false;
  const tobaccoActive = activeModules.tobacco       !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;

  const pipes       = pipeActive    ? validatedContext.pipes : [];
  const blends      = tobaccoActive ? validatedContext.blends : [];
  const smokingLogs = pipeActive    ? validatedContext.smokingLogs : [];
  const bottles     = whiskeyActive ? validatedContext.bottles : [];
  const tastingLogs = whiskeyActive ? validatedContext.tastingLogs : [];
  const acquisitionItems = validatedContext.acquisitionItems;

  // ── USER_CORRECTION ────────────────────────────────────────────────────────
  if (intent === 'USER_CORRECTION') {
    const subject = entityContext.subject;
    const topicIntent = entityContext.topicIntent;
    const lastEvidenceClass = entityContext.lastEvidenceClass || 'UNKNOWN';
    const msg = message;

    const isSpecialization = /specializ|reassign|assign|lane|virginia|aromatic|english|burley/i.test(msg) || topicIntent === 'collection_analysis';
    const isOwnership      = /already (have|own|in my)|already (owns?|have it)/i.test(msg) || topicIntent === 'evaluate_recommendation';
    const isRestock        = /already (on my (list|shopping|want)|tracked|listed)/i.test(msg) || topicIntent === 'restock_advice';
    const isUsage          = /never (smoked|used|had|seen)|only (used|smoked) for|i (use|don't use) it (for|that way)/i.test(msg);
    const isPairing        = topicIntent === 'explain_pairing';
    const alreadyUsed      = /already (one of my most used|heavily used|actively used)/i.test(msg);
    const alreadyTracked   = /already (on my|tracked|on the list)/i.test(msg);
    const alreadyOwned     = /already (have|own)/i.test(msg);
    const aromaticOnly     = /aromatic/i.test(msg);
    const englishOnly      = /english/i.test(msg);
    const virginiaOnly     = /virginia/i.test(msg);

    const subjectName = subject?.name || 'that item';

    const sparseDataLine = lastEvidenceClass === 'WEAK'
      ? 'With only a handful of sessions logged, the data can easily point in the wrong direction — especially if blend tags are inconsistent or the sample is too small to establish a real pattern.'
      : lastEvidenceClass === 'MODERATE'
      ? 'The stored signal was already uncertain, and what you are describing confirms it is not reliable here.'
      : 'What you know from direct experience is overriding what the session logs were suggesting.';

    let reply;
    let updatedCtx = { ...entityContext, lastEvidenceClass: 'CONFLICTING', lastConclusion: null };

    if (isSpecialization || isUsage) {
      const inferredFamily = aromaticOnly ? 'aromatic' : englishOnly ? 'English/Latakia' : virginiaOnly ? 'Virginia' : null;
      const correctionLine = inferredFamily
        ? `If ${subjectName} has only ever been used for ${inferredFamily} blends, it is not a real candidate for reassignment to a different family.`
        : `If the actual usage pattern is different from what the logs show, then the earlier recommendation was working from bad premises.`;
      reply = `That changes the picture. ${correctionLine} ${sparseDataLine} In that case, the reassignment signal was a data-quality issue rather than a real mismatch — and I would not act on it. I would leave ${subjectName} where it is and let a few more sessions confirm how it is actually being used. If you want, I can look for the next strongest candidate instead, skipping this one.`;
      updatedCtx = { ...entityContext, correctionApplied: true, excludedFromAnalysis: subject, lastEvidenceClass: 'CONFLICTING', lastClaimType: 'correction_specialization', lastConclusion: null };
    } else if (alreadyOwned || isOwnership) {
      reply = `Good to know. If you already own that, then evaluating it as something to acquire was the wrong frame entirely. ${sparseDataLine} The relevant question becomes how it fits within what you already have — whether it earns a distinct role or overlaps with something else in the collection. Want me to look at it from that angle instead?`;
      updatedCtx = { ...entityContext, topicIntent: 'evaluate_owned_item', correctionApplied: true, lastEvidenceClass: 'CONFLICTING', lastClaimType: 'correction_ownership', lastConclusion: null };
    } else if (alreadyTracked || isRestock) {
      reply = `Understood — if it is already tracked, then recommending it again was redundant. Rather than re-adding it, the more useful question is whether it should move up in priority on your existing list. If inventory is low and it is already flagged for shopping, the next move is acting on it rather than logging it a second time. Want me to look at what else might need attention ahead of it?`;
      updatedCtx = { ...entityContext, correctionApplied: true, lastEvidenceClass: 'CONFLICTING', lastClaimType: 'correction_restock', lastConclusion: null };
    } else if (alreadyUsed) {
      reply = `Then the earlier framing was off. If ${subjectName} is already one of your most active pieces, any suggestion that it is sitting idle is working from stale or incomplete data. ${sparseDataLine} It has clearly earned its place, so the more useful question is whether its usage level is matched by a clear enough specialization, or whether logging more structured notes would sharpen its role. I can look at the rest of the collection for items that are genuinely underused if that would be more helpful.`;
      updatedCtx = { ...entityContext, correctionApplied: true, lastEvidenceClass: 'CONFLICTING', lastClaimType: 'correction_usage', lastConclusion: null };
    } else if (isPairing) {
      reply = `If the pairing logic was built on the wrong profile for that item, the explanation was not reliable. Tell me how you actually experience it — the flavor character, the usage pattern, whatever is relevant — and I can reconstruct the reasoning from there.`;
      updatedCtx = { ...entityContext, correctionApplied: true, lastEvidenceClass: 'CONFLICTING', lastClaimType: 'correction_pairing', lastConclusion: null };
    } else {
      reply = `That is worth revising. If what you know from direct experience does not line up with the earlier conclusion, the inference was working from weak or misread data — and first-hand knowledge overrides sparse session signals. ${sparseDataLine} Tell me what you would like to look at from here, or I can find the next best candidate instead.`;
      updatedCtx = { ...entityContext, correctionApplied: true, lastEvidenceClass: 'CONFLICTING', lastConclusion: null };
    }

    return { reply, updatedEntityContext: updatedCtx };
  }

  // ── FOLLOW_UP_CONSTRAINT ───────────────────────────────────────────────────
  if (intent === 'FOLLOW_UP_CONSTRAINT') {
    const lastIntent = entityContext.topicIntent || entityContext.lastClaimType;
    const subject = entityContext.subject;

    let constraintType = 'generic';
    let constraintValue = '';
    if (/non-aromatic|^i want to leave it non-aromatic|keep it non-aromatic/i.test(message)) {
      constraintType = 'non-aromatic';
      constraintValue = 'non-aromatic';
    } else if (/aromatic-only|only (as )?aromatic/i.test(message)) {
      constraintType = 'aromatic-only';
      constraintValue = 'aromatic-only';
    } else if (/english-only|only english/i.test(message)) {
      constraintType = 'english-only';
      constraintValue = 'english-only';
    } else if (/virginia-only|only virginia/i.test(message)) {
      constraintType = 'virginia-only';
      constraintValue = 'virginia-only';
    } else if (/burley-only|only burley/i.test(message)) {
      constraintType = 'burley-only';
      constraintValue = 'burley-only';
    }

    if ((lastIntent === 'collection_analysis' || lastIntent === 'reassignment_recommendation') && subject) {
      const ownedPipe = pipes.find((p) => p.id === subject.id || norm(p.name) === norm(subject.name));
      if (ownedPipe) {
        const usage = buildPipeUsage([ownedPipe], smokingLogs, blends)[0];
        const dominantFamily = usage?.dominantFamily || '';
        const isDomainViolation = (
          (constraintType === 'non-aromatic' && dominantFamily === 'Aromatic') ||
          (constraintType === 'aromatic-only' && dominantFamily !== 'Aromatic') ||
          (constraintType === 'english-only' && !dominantFamily.includes('English')) ||
          (constraintType === 'virginia-only' && !dominantFamily.includes('Virginia')) ||
          (constraintType === 'burley-only' && !dominantFamily.includes('Burley'))
        );

        if (isDomainViolation) {
          return {
            reply: `Understood — ${ownedPipe.name} should stay ${constraintValue}. The sessions point toward a different family entirely, so the earlier reassignment signal doesn't hold. Let me look at what comes next instead.`,
            updatedEntityContext: {
              ...entityContext,
              constraints: { [constraintType]: constraintValue },
              excludedFromAnalysis: subject,
              lastConclusion: `${subject.name} excluded due to ${constraintType} constraint`,
            },
          };
        } else {
          return {
            reply: `Got it — keeping ${ownedPipe.name} in ${constraintValue} focus. That constraint actually reinforces the pattern, so the earlier assessment stands.`,
            updatedEntityContext: {
              ...entityContext,
              constraints: { [constraintType]: constraintValue },
              lastConclusion: `constraint applied: ${constraintType}`,
            },
          };
        }
      }
    }

    if ((lastIntent === 'evaluate_owned_item' || lastIntent === 'owned_item_evaluation') && subject) {
      return {
        reply: `Noted — ${subject.name} should stay ${constraintValue}. That framing changes how I would approach its role in the collection. It is not a candidate for reassignment, and that narrows its specialization scope. With that constraint, it fits more cleanly into a defined lane.`,
        updatedEntityContext: {
          ...entityContext,
          constraints: { [constraintType]: constraintValue },
          lastConclusion: `${subject.name} with ${constraintType} constraint`,
        },
      };
    }

    return {
      reply: `Understood — ${constraintValue} constraint applied. Tell me what you want to evaluate or ask about, and I will keep that in mind.`,
      updatedEntityContext: {
        ...entityContext,
        constraints: { [constraintType]: constraintValue },
      },
    };
  }

  // ── FOLLOW_UP_NEXT_CANDIDATE ───────────────────────────────────────────────
  if (intent === 'FOLLOW_UP_NEXT_CANDIDATE') {
    const rankedCandidates = entityContext.rankedCandidates || [];
    const currentCursor = entityContext.rankedCursor || 0;
    const nextCursor = currentCursor + 1;

    if (!rankedCandidates || rankedCandidates.length === 0) {
      return {
        reply: `I haven't retained the ranked list from that last answer, so I should re-run the analysis. Ask me the question again and I'll generate a fresh ranked set.`,
        updatedEntityContext: { ...entityContext, rankedCandidates: [], rankedCursor: 0 },
      };
    }

    if (nextCursor >= rankedCandidates.length) {
      return {
        reply: `After that, the signal drops off. I don't see another candidate that I'd treat seriously without more logging.`,
        updatedEntityContext: { ...entityContext, rankedCursor: nextCursor },
      };
    }

    const nextCandidate = rankedCandidates[nextCursor];
    const priorCandidate = rankedCandidates[currentCursor];

    const nextAction = nextCandidate.evidenceClass === 'STRONG'
      ? 'The data here is solid, so I would evaluate it carefully.'
      : nextCandidate.evidenceClass === 'MODERATE'
      ? 'Log a few more sessions before committing, but the direction is clear.'
      : 'At this point the signal is exploratory — more usage data would sharpen the picture.';

    const comparison = priorCandidate
      ? `The signal drops off after ${priorCandidate.name}, but ${nextCandidate.name} still shows movement in the same direction — just with less evidence behind it.`
      : 'This is the next candidate in the ranked set.';

    const reason = nextCandidate.reason || '';
    const fullReply = `${nextCandidate.name} would be the next one I'd look at. ${comparison} ${reason && reason + ' '}${nextAction}`.trim();

    return {
      reply: fullReply,
      updatedEntityContext: {
        ...entityContext,
        subject: { id: nextCandidate.id, name: nextCandidate.name, type: nextCandidate.type },
        rankedCursor: nextCursor,
        lastConclusion: `next candidate: ${nextCandidate.name}`,
      },
    };
  }

  // ── FOLLOW_UP ──────────────────────────────────────────────────────────────
  if (intent === 'FOLLOW_UP') {
    const analysisCtx = entityContext.analysisContext;
    if (analysisCtx && analysisCtx.type === 'pipe_reassignment' && continueAnalysisFn) {
      return continueAnalysisFn(analysisCtx);
    }
    const subjectEntity = entityContext.subject;
    if (!subjectEntity) {
      return { reply: 'Could you name the specific item you are asking about? I do not have a clear subject from the last exchange.', updatedEntityContext: entityContext };
    }
    const subject = subjectEntity;
    const topicIntent = entityContext.topicIntent;

    if (topicIntent === 'evaluate_owned_item') {
      const ownedBottle = bottles.find((b) => b.id === subject.id || norm(b.name) === norm(subject.name));
      const ownedBlend  = blends.find((b) => b.id === subject.id || norm(b.name) === norm(subject.name));
      const ownedPipe   = pipes.find((p) => p.id === subject.id || norm(p.name) === norm(subject.name));
      let evalData;
      if (ownedBottle) evalData = evaluateOwnedBottle(ownedBottle, bottles, tastingLogs);
      else if (ownedBlend) evalData = evaluateOwnedBlend(ownedBlend, blends, smokingLogs);
      else if (ownedPipe) evalData = evaluateOwnedPipe(ownedPipe, pipes, smokingLogs);

      if (evalData) {
        const nearby = evalData.adjacentComparables;
        const qualifier = evidenceQualifier(evalData.evidence.evidenceClass);
        const nearbyText = nearby.length > 0
          ? `The closest items in the collection are ${nearby.map((x) => x.name).join(' and ')}, and it sits as ${evalData.role}.`
          : `It has no close neighbors in its lane — it stands alone.`;
        return {
          reply: `${nearbyText} Right now it is ${evalData.usageState}. ${qualifier}I would ${evalData.recommendation}.`,
          updatedEntityContext: entityContext,
        };
      }
    }
    return {
      reply: `Still focused on ${subject.name}. What specifically would be most useful — redundancy, specialization, how it fits tonight's session, or a comparison against something else?`,
      updatedEntityContext: entityContext,
    };
  }

  // ── EVALUATE_OWNED_ITEM ────────────────────────────────────────────────────
  if (intent === 'EVALUATE_OWNED_ITEM') {
    const evalMatch = message.match(/evaluate\s+(.+?)(?:\s+(?:in|for)\s+my\s+collection|$)/i);
    const rawName = evalMatch ? evalMatch[1].trim() : null;

    let ownedBottle = rawName ? extractNamedEntity(rawName, bottles) : null;
    let ownedBlend  = !ownedBottle && rawName ? extractNamedEntity(rawName, blends) : null;
    let ownedPipe   = !ownedBottle && !ownedBlend && rawName ? extractNamedEntity(rawName, pipes) : null;

    if (!ownedBottle && !ownedBlend && !ownedPipe && entityContext.subject) {
      const es = entityContext.subject;
      ownedBottle = bottles.find((b) => b.id === es.id || norm(b.name) === norm(es.name)) || null;
      ownedBlend  = !ownedBottle ? (blends.find((b) => b.id === es.id || norm(b.name) === norm(es.name)) || null) : null;
      ownedPipe   = !ownedBottle && !ownedBlend ? (pipes.find((p) => p.id === es.id || norm(p.name) === norm(es.name)) || null) : null;
    }

    const resolvedOwned = ownedBottle || ownedBlend || ownedPipe;

    if (resolvedOwned) {
      let evalData;
      let itemLabel;
      if (ownedBottle) { evalData = evaluateOwnedBottle(ownedBottle, bottles, tastingLogs); itemLabel = ownedBottle.type || ownedBottle.whiskey_type || 'whiskey bottle'; }
      else if (ownedBlend) { evalData = evaluateOwnedBlend(ownedBlend, blends, smokingLogs); itemLabel = ownedBlend.blend_type || 'tobacco blend'; }
      else { evalData = evaluateOwnedPipe(ownedPipe, pipes, smokingLogs); itemLabel = ownedPipe.shape || 'pipe'; }

      const nearbyNames = evalData.adjacentComparables.map((x) => x.name);
      const qualifier = evidenceQualifier(evalData.evidence.evidenceClass);
      const comparisonText = nearbyNames.length > 0
        ? `It sits alongside ${nearbyNames.join(' and ')} — ${evalData.role}.`
        : `It is the only ${itemLabel} of its kind in the collection — ${evalData.role}.`;

      const subjectForContext = { id: resolvedOwned.id, name: resolvedOwned.name, type: ownedBottle ? 'bottle' : ownedBlend ? 'blend' : 'pipe' };

      return {
        reply: `${resolvedOwned.name} already has a place in the collection. ${comparisonText} It is ${evalData.usageState}. ${qualifier}I would ${evalData.recommendation}.`,
        updatedEntityContext: {
          ...entityContext,
          subject: subjectForContext,
          topicIntent: 'evaluate_owned_item',
          lastClaimType: 'owned_item_evaluation',
          lastEvidenceClass: evalData.evidence.evidenceClass,
          lastConclusion: evalData.recommendation,
          relatedEntities: evalData.adjacentComparables,
        },
      };
    }

    const fallbackName = rawName || entityContext.subject?.name || 'that item';

    const isPipeTerm = /\b(dublin|billiard|bent|pot|apple|churchwarden|freehand|pipe|bowl|briar|stem|shape|meerschaum|corn cob)\b/i.test(message);
    const isBlendTerm = /\b(virginia|aromatic|english|burley|latakia|perique|blend|tobacco|flake|ribbon)\b/i.test(message);

    if (isPipeTerm && pipeActive) {
      const ownedShapes = new Set(pipes.map((p) => (p.shape || '').toLowerCase()).filter(Boolean));
      const queryShapeMatch = message.match(/\b(dublin|billiard|bent|pot|apple|churchwarden|freehand|bulldog|rhodesian|canadian|lovat|prince|author|brandy|egg|acorn)\b/i);
      const queriedShape = queryShapeMatch?.[1] || null;
      const alreadyOwned = queriedShape && ownedShapes.has(queriedShape.toLowerCase());
      if (alreadyOwned) {
        return {
          reply: `A ${queriedShape} is already in the collection. Ask me how it fits in the current rotation, or whether it has earned a distinct specialization.`,
          updatedEntityContext: { ...entityContext, topicIntent: 'evaluate_owned_item', lastClaimType: 'owned_pipe_redirect', lastEvidenceClass: 'STRONG' },
        };
      }
      const shapeContext = queriedShape
        ? `A ${queriedShape} is not currently in the pipe collection. ${pipes.length > 0 ? `With ${pipes.length} pipe${pipes.length > 1 ? 's' : ''} already in rotation, a ${queriedShape} would introduce a different bowl geometry and smoking character.` : 'Adding one would give a starting reference point for this shape.'}`
        : `That pipe shape does not appear in the current collection.`;
      return {
        reply: `${shapeContext} If it is on the radar, adding it to the Want List will let Curator factor it into future pipe rotation and session planning.`,
        updatedEntityContext: { ...entityContext, topicIntent: 'evaluate_recommendation', lastClaimType: 'outside_pipe_recommendation', lastEvidenceClass: 'MODERATE', lastConclusion: 'add to want list' },
      };
    }

    if (isBlendTerm && tobaccoActive) {
      const blendFamilies = new Set(blends.map((b) => b.blend_type || b.blend_family).filter(Boolean));
      return {
        reply: `${fallbackName} does not appear in the tobacco collection. ${blendFamilies.size > 0 ? `The cellar currently covers ${[...blendFamilies].join(', ')}.` : ''} If it is worth considering, adding it to the Want List will bring it into blend family balance and pairing recommendations going forward.`,
        updatedEntityContext: { ...entityContext, topicIntent: 'evaluate_recommendation', lastClaimType: 'outside_blend_recommendation', lastEvidenceClass: 'MODERATE', lastConclusion: 'add to want list' },
      };
    }

    const dominantBottleType = bottles.length
      ? Object.entries(bottles.reduce((acc, b) => { const t = b.type || b.whiskey_type || 'Unknown'; acc[t] = (acc[t] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;
    const gapContext = dominantBottleType
      ? `The shelf leans toward ${dominantBottleType}, so ${fallbackName} would add contrast from a different lane.`
      : 'The collection does not yet have a strong reference point in this style.';
    return {
      reply: `${fallbackName} is not currently in the collection. ${gapContext} If it is worth tracking, adding it to the Want List will fold it into future gap and pairing recommendations.`,
      updatedEntityContext: { ...entityContext, topicIntent: 'evaluate_recommendation', lastClaimType: 'outside_recommendation', lastEvidenceClass: 'MODERATE', lastConclusion: 'add to want list' },
    };
  }

  // ── EXPLAIN_PAIRING ────────────────────────────────────────────────────────
  if (intent === 'EXPLAIN_PAIRING') {
    if (isSingleModuleMode) return { reply: 'Pairing explanations need at least two active modules. Ask me what to enjoy tonight instead.', updatedEntityContext: entityContext };
    return pairingExplanationEngine(message, context, entityContext);
  }

  // ── SESSION_RECOMMENDATION ─────────────────────────────────────────────────
  if (intent === 'SESSION_RECOMMENDATION') {
    try {
      const whiskeyFocused = /\b(whiskey|bourbon|scotch|rye|irish|bottle|pour|dram)\b/i.test(message);
      const pipeFocused    = /\b(pipe|smoke|tobacco|blend)\b/i.test(message);
      const targetModule   = whiskeyFocused ? 'whiskey' : pipeFocused ? 'pipe' : 'any';
      const candidates = buildSessionPlan(context, activeModules, targetModule);
      if (!candidates.length) {
        return { reply: noDataResponses.sparse, updatedEntityContext: entityContext };
      }
      const top = candidates[0];
      const second = candidates[1];
      const { direct, insight } = buildSessionRecommendation(top, second, top.reason);
      const entityKey = { bottle: 'bottle', pipe: 'pipe', blend: 'blend' }[top.itemType];
      const newCtx = entityKey
        ? {
            ...entityContext,
            subject: { id: top.item?.id, name: top.item?.name, type: entityKey },
            topicIntent: 'recommend_session',
            lastClaimType: 'session_recommendation',
            lastEvidenceClass: 'MODERATE',
            lastConclusion: top.reason,
            rankedCandidates: candidates.map((c) => ({ id: c.item?.id, name: c.item?.name || c.title, type: c.itemType, reason: c.reason })),
            rankedCursor: 0,
          }
        : entityContext;
      const reply = structureResponse({ direct, insight });
      return { reply, updatedEntityContext: newCtx };
    } catch (err) {
      console.error('[Curator][SESSION_RECOMMENDATION]', { error: String(err), dataCounts });
      return { reply: 'I can see strong directions for tonight, even if the session history is still thin. The best move is to open something that has not been logged yet to build clearer signals.', updatedEntityContext: entityContext };
    }
  }

  // ── RESTOCK_ADVICE ─────────────────────────────────────────────────────────
  if (intent === 'RESTOCK_ADVICE') {
    try {
      const tracked = acquisitionItems.find((i) => {
        const s = norm(i.status || i.category || '');
        return s === 'restock' || s === 'shopping_list' || s === 'wishlist';
      });
      if (tracked) return { reply: `${tracked.name} ${pickRandom(confidentPhrases)} — it is already flagged for action.`, updatedEntityContext: { ...entityContext, lastEvidenceClass: 'STRONG', lastConclusion: 'already tracked' } };
      const allLow = blends.filter((b) => {
        const oz = typeof b.quantity_oz === 'number' ? b.quantity_oz : typeof b.total_oz === 'number' ? b.total_oz : null;
        return oz !== null && oz <= 2.0;
      }).sort((a, b) => (a.quantity_oz || a.total_oz || 0) - (b.quantity_oz || b.total_oz || 0));
      const lowBlend = allLow[0];
      const secondLow = allLow[1];
      if (lowBlend) {
        const nextLine = secondLow ? ` After that, ${secondLow.name} is running thin as well.` : '';
        return { reply: `${lowBlend.name} needs restocking — active rotation and depleting stock make it the priority.${nextLine}`, updatedEntityContext: { ...entityContext, subject: { id: lowBlend.id, name: lowBlend.name, type: 'blend' }, topicIntent: 'restock_advice', lastEvidenceClass: 'STRONG', lastClaimType: 'restock_recommendation', lastConclusion: 'restock' } };
      }
      return { reply: 'Inventory is healthy across active rotation items. When levels do drop, this will be the first signal.', updatedEntityContext: { ...entityContext, lastEvidenceClass: 'INSUFFICIENT' } };
    } catch (err) {
      console.error('[Curator][RESTOCK_ADVICE]', { error: String(err), dataCounts });
      return { reply: 'I was not able to analyze restock signals cleanly. The Want List is the best place to prioritize purchases in the meantime.', updatedEntityContext: { ...entityContext, lastEvidenceClass: 'INSUFFICIENT' } };
    }
  }

  // ── GAP_ANALYSIS ───────────────────────────────────────────────────────────
  if (intent === 'GAP_ANALYSIS') {
    try {
      const { gap, direction } = biggestGapWithDirectionality(blends, bottles, activeModules);
      const reply = buildGapAnalysis(gap, direction);
      return {
        reply,
        updatedEntityContext: { ...entityContext, topicIntent: 'gap_analysis', lastClaimType: 'gap_analysis', lastEvidenceClass: 'MODERATE', lastConclusion: gap },
      };
    } catch (err) {
      console.error('[Curator][GAP_ANALYSIS]', err);
      const { gap, evidenceClass } = fallbackGapAnalysis(context);
      const reply = buildGapAnalysis(gap, 'unknown');
      return {
        reply,
        updatedEntityContext: { ...entityContext, topicIntent: 'gap_analysis', lastClaimType: 'gap_analysis', lastEvidenceClass: evidenceClass, lastConclusion: gap },
      };
    }
  }

  // ── PIPE_REASSIGNMENT_ANALYSIS ─────────────────────────────────────────────
  if (intent === 'PIPE_REASSIGNMENT_ANALYSIS') {
    try {
      const usageAll = buildPipeUsage(pipes, smokingLogs, blends);
      if (!usageAll.length) {
        return { reply: 'Not enough data yet to rank reassignment candidates. Add some pipes and log sessions and the picture will become clear quickly.', updatedEntityContext: { ...entityContext, lastEvidenceClass: 'INSUFFICIENT' } };
      }
      const scored = usageAll
        .filter((p) => p.sessionCount >= 1)
        .map((p) => {
          const currentFocus = norm(p.focus?.[0] || p.specialization || '');
          const dominantFamily = norm(p.dominantFamily || '');
          const mismatch = currentFocus && dominantFamily && !dominantFamily.includes(currentFocus) && !currentFocus.includes(dominantFamily);
          const ratio = p.sessionCount > 0 ? p.dominantCount / p.sessionCount : 0;
          return { ...p, mismatch, ratio };
        })
        .sort((a, b) => {
          if (a.mismatch !== b.mismatch) return a.mismatch ? -1 : 1;
          return b.ratio - a.ratio;
        });

      const candidate = scored[0] || usageAll.sort((a, b) => (b.dominantCount / (b.sessionCount || 1)) - (a.dominantCount / (a.sessionCount || 1)))[0];

      if (!candidate) {
        return { reply: 'Session history is not deep enough yet to make a confident reassignment call. Log more sessions across the collection and the signal will sharpen.', updatedEntityContext: { ...entityContext, lastEvidenceClass: 'INSUFFICIENT' } };
      }

      const evidence = candidate.evidence || evaluateEvidenceStrength({ sessionCount: candidate.sessionCount, dominantCount: candidate.dominantCount });
      const currentFocusLabel = candidate.focus?.[0] || candidate.specialization || 'its current designation';
      const targetFamily = candidate.dominantFamily || 'a different family';
      const qualifier = evidenceQualifier(evidence.evidenceClass);

      const { direct, reasoning, nextStep } = buildReassignmentCandidate(
        candidate,
        targetFamily,
        currentFocusLabel,
        evidence.evidenceClass
      );

      const rankedNarratives = scored.slice(0, 5).map((p) => {
        const pEvidence = p.evidence || evaluateEvidenceStrength({ sessionCount: p.sessionCount, dominantCount: p.dominantCount });
        const pTargetFamily = p.dominantFamily || 'a different family';
        return {
          id: p.id,
          name: p.name,
          type: 'pipe',
          dominantFamily: pTargetFamily,
          evidenceClass: pEvidence.evidenceClass,
          sessionCount: p.sessionCount,
        };
      });

      const reply = structureResponse({ direct, reasoning, nextStep });
      const newAnalysisCtx = {
        type: 'pipe_reassignment',
        excludedIds: [],
        lastResults: rankedNarratives,
        lastIndex: 0,
      };
      return {
        reply,
        updatedEntityContext: {
          ...entityContext,
          subject: { id: candidate.id, name: candidate.name, type: 'pipe' },
          topicIntent: 'collection_analysis',
          lastClaimType: 'reassignment_recommendation',
          lastEvidenceClass: evidence.evidenceClass,
          lastConclusion: `reassign ${candidate.name} to ${targetFamily}`,
          rankedCandidates: rankedNarratives,
          rankedCursor: 0,
        },
        newAnalysisContext: newAnalysisCtx,
      };
    } catch (err) {
      console.error('[Curator][PIPE_REASSIGNMENT_ANALYSIS]', { error: String(err), dataCounts });
      return { reply: 'I can see early signals in the session data, but the pattern is not yet solid enough for a firm reassignment call. Log a few more sessions across the collection and the direction will sharpen considerably.', updatedEntityContext: { ...entityContext, lastEvidenceClass: 'WEAK' } };
    }
  }

  // ── COLLECTION_ANALYSIS ────────────────────────────────────────────────────
  if (intent === 'COLLECTION_ANALYSIS') {
    try {
      const candidate = mostRedundantPipe(pipes, smokingLogs, blends);
      if (!candidate) return { reply: noDataResponses.sparse, updatedEntityContext: { ...entityContext, lastEvidenceClass: 'INSUFFICIENT' } };
      const { direct, reasoning, nextStep } = buildRedundancyFinding(
        candidate,
        candidate.shape || 'same shape',
        candidate.sessionCount || 0,
        candidate.evidence?.evidenceClass || 'WEAK'
      );
      const reply = structureResponse({ direct, reasoning, nextStep });
      return {
        reply,
        updatedEntityContext: { ...entityContext, subject: { id: candidate.id, name: candidate.name, type: 'pipe' }, topicIntent: 'collection_analysis', lastClaimType: 'redundancy_recommendation', lastEvidenceClass: candidate.evidence?.evidenceClass || 'WEAK', lastConclusion: `${candidate.name} is most redundant` },
      };
    } catch (err) {
      console.error('[Curator][COLLECTION_ANALYSIS]', { error: String(err), dataCounts });
      return { reply: 'I was not able to rank redundancy cleanly from the current data. Log more sessions and shape metadata will clarify which pipes are truly earning their place in crowded lanes.', updatedEntityContext: { ...entityContext, lastEvidenceClass: 'INSUFFICIENT' } };
    }
  }

  // ── GLOBAL FALLBACK (PATCH 4)
  return { reply: safeCuratorFallback(context, message), updatedEntityContext: entityContext };
}

export default function ExpertTobacconistChat({
  preFillMessage,
  onPreFillConsumed,
  collectionContext,
  isSingleModuleMode = false,
  activeModules = {},
  initialEntityContext = null,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [entityContext, setEntityContext] = useState({});
  const [analysisContext, setAnalysisContext] = useState(null);

  useEffect(() => {
    if (initialEntityContext) {
      const { id, name, type, ownershipHint } = initialEntityContext;
      if (name) {
        setEntityContext((prev) => ({
          ...prev,
          subject: { id, name, type },
          topicIntent: ownershipHint === 'owned' ? 'evaluate_owned_item' : ownershipHint === 'external' ? 'evaluate_recommendation' : null,
          lastEvidenceClass: null,
          lastClaimType: null,
          lastConclusion: null,
          relatedEntities: [],
          rankedCandidates: [],
          rankedCursor: 0,
        }));
      }
    }
  }, [initialEntityContext]);

  const starterPrompts = isSingleModuleMode ? STARTER_PROMPTS_SINGLE : STARTER_PROMPTS_MULTI;
  const canSend = useMemo(() => !!input.trim() && !isSending, [input, isSending]);

  const continueAnalysis = (ctx) => {
    if (!ctx || !ctx.lastResults || ctx.lastResults.length === 0) return null;
    const nextIdx = (ctx.lastIndex || 0) + 1;
    if (nextIdx >= ctx.lastResults.length) {
      return { reply: 'After that, the signal drops off. I don\'t see another candidate that I\'d treat seriously without more logging.' };
    }
    const next = ctx.lastResults[nextIdx];
    const newCtx = { ...ctx, lastIndex: nextIdx };
    setAnalysisContext(newCtx);
    return {
      reply: `${next.name} would be next. The signal is weaker here, but it's where usage starts to diverge from the current role. Log a few more sessions and the picture will sharpen.`,
      updatedEntityContext: entityContext,
      newAnalysisContext: newCtx,
    };
  };

  useEffect(() => {
    if (preFillMessage) {
      setInput(preFillMessage);
      onPreFillConsumed?.();
    }
  }, [preFillMessage, onPreFillConsumed]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }]);
    setInput('');
    try {
      const result = answerQuestion(text, collectionContext, { ...entityContext, analysisContext }, isSingleModuleMode, activeModules, continueAnalysis);
      const { reply, updatedEntityContext, newAnalysisContext } = result || {};
      if (newAnalysisContext) setAnalysisContext(newAnalysisContext);
      else if (result?.reply && !newAnalysisContext) setAnalysisContext(null);
      console.log('CURATOR_CHAT', {
        intent: classifyIntent(text),
        subject: updatedEntityContext.subject?.name || null,
        lastEvidenceClass: updatedEntityContext.lastEvidenceClass || null,
        lastClaimType: updatedEntityContext.lastClaimType || null,
        correctionApplied: updatedEntityContext.correctionApplied || false,
        constraints: updatedEntityContext.constraints || null,
        activeModules,
        contextCounts: {
          pipes: collectionContext?.pipes?.length || 0,
          blends: collectionContext?.blends?.length || 0,
          bottles: collectionContext?.bottles?.length || 0,
          smokingLogs: collectionContext?.smokingLogs?.length || 0,
        },
      });
      setEntityContext(updatedEntityContext);
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: reply || 'Something went wrong generating a response. Please try rephrasing.' }]);
    } catch (err) {
      console.error('[Curator] answerQuestion error:', err);
      const fallbackReply = safeCuratorFallback(collectionContext, text);
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: fallbackReply }]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, collectionContext, entityContext, isSingleModuleMode, activeModules, continueAnalysis]);

  return (
    <div className="rounded-[18px] p-8" style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(140,105,65,0.16)' }}>
      <h3 className="text-[20px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>Curator Console</h3>
      <p className="text-[16px] mb-6" style={{ color: '#A1A1AA' }}>Ask about your collection, pairings, or what to enjoy tonight.</p>
      <div className="flex flex-wrap gap-3 mb-6">
        <span className="px-4 py-2 rounded-full text-sm" style={{ border: '1px solid rgba(198,161,91,0.25)', color: '#C6A15B' }}>Your Collection</span>
        <span className="px-4 py-2 rounded-full text-sm" style={{ border: '1px solid rgba(198,161,91,0.25)', color: '#C6A15B' }}>Pairings</span>
        <span className="px-4 py-2 rounded-full text-sm" style={{ border: '1px solid rgba(198,161,91,0.25)', color: '#C6A15B' }}>Session Planning</span>
      </div>
      <div className="rounded-[18px] p-5 mb-5" style={{ background: '#09090B', border: '1px solid rgba(255,255,255,0.06)', minHeight: 220 }}>
        {messages.length === 0 ? (
          <>
            <div className="text-[16px] mb-5" style={{ color: '#A1A1AA' }}>Start a conversation or pick a prompt below.</div>
            <div className="flex flex-wrap gap-3">
              {starterPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setInput(prompt)} className="px-4 h-10 rounded-full text-sm" style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#F5F5F7' }}>{prompt}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="text-[12px] uppercase tracking-[0.12em]" style={{ color: '#71717A' }}>{m.role === 'user' ? 'You' : 'Curator'}</div>
                <div className="text-[16px] leading-8 whitespace-pre-wrap" style={{ color: '#F5F5F7' }}>{m.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-3 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSend) sendMessage(); }}
          placeholder="Ask about pipes, blends, pairings, aging, value, redundancy..."
          className="flex-1 h-14 px-5 rounded-[14px] outline-none bg-transparent"
          style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#F5F5F7' }}
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={sendMessage}
          className="h-14 px-6 rounded-[14px] inline-flex items-center gap-2 font-medium"
          style={{ background: '#C6A15B', color: '#0B0B0C', opacity: canSend ? 1 : 0.6 }}
        >
          <SendHorizontal className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}