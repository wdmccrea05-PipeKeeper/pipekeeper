import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SendHorizontal } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner.js';
import {
  buildDirectAnswer,
  structureResponse,
  buildSessionRecommendation,
  buildGapAnalysis,
  buildReassignmentCandidate,
  buildRedundancyFinding,
  noDataResponses,
} from '@/components/curator/curatorVoiceLayer';
import { classifyDiagnosticIntent, DIAGNOSTIC_INTENT } from '@/lib/curator/curatorIntentClassifier.js';
import { analyzeWineOptimizationIssues } from '@/lib/curator/wineOptimization.js';

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
  'What Virginia flakes should I try next?',
  'Best smooth morning smoke with coffee?',
];
const STARTER_PROMPTS_MULTI = [
  'What is my most redundant pipe?',
  'Which pipe should I reassign?',
  'What should I smoke tonight?',
  'Best smooth morning smoke with coffee?',
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

/**
 * Classify the PRIMARY entity type the user is asking about.
 * Returns 'blend' | 'pipe' | 'bottle' | 'pairing' | 'unknown'
 * Used to validate that the answer actually addresses the question.
 */
function classifyTargetEntity(message) {
  const t = message.toLowerCase().trim();
  // Explicit tobacco/blend signals (check BEFORE generic pipe/smoke signals)
  if (/\b(tobacco|blend|tin|cellar|virginia|aromatic|english|burley|latakia|perique|flake|ribbon|mixture|what.*(smoke|enjoy|try)|which.*(smoke|blend|tobacco))\b/i.test(t)) {
    // Make sure it's not asking about a pipe specifically
    if (!/\b(which pipe|what pipe|which bowl|pipe should)\b/i.test(t)) return 'blend';
  }
  // Explicit bottle/whiskey signals
  if (/\b(bottle|whiskey|bourbon|scotch|rye|irish|dram|pour|open next|which bottle|what bottle)\b/i.test(t)) return 'bottle';
  // Explicit pipe signals
  if (/\b(which pipe|what pipe|pipe should|pipe (to use|for that)|which bowl)\b/i.test(t)) return 'pipe';
  // Pairing
  if (/\b(pair|pairing|pair with|combine|goes with)\b/i.test(t)) return 'pairing';
  // Generic session — could be anything, check context
  if (/\b(tonight|enjoy|smoke|session|use|open)\b/i.test(t)) return 'session';
  return 'unknown';
}

/**
 * Validate that an answer actually addresses the requested entity type.
 * Returns true if the answer is valid, false if it needs to be corrected.
 */
function validateAnswerEntityMatch(targetEntity, reply = '', updatedEntityContext = {}) {
  if (!targetEntity || targetEntity === 'unknown' || targetEntity === 'pairing' || targetEntity === 'session') return true;

  const replyLower = reply.toLowerCase();
  const subjectType = updatedEntityContext?.subject?.type || updatedEntityContext?.lastClaimType || '';

  if (targetEntity === 'blend') {
    // Answer must mention a blend/tobacco — not just pipe names
    const hasBlendContent = /\b(blend|tobacco|virginia|aromatic|english|burley|latakia|mixture|flake|ribbon|perique)\b/i.test(replyLower);
    const isOnlyPipes = /\b(billiard|dublin|apple|bulldog|pipe|bowl|briar|meerschaum)\b/i.test(replyLower) && !hasBlendContent;
    if (isOnlyPipes) return false;
    return true;
  }

  if (targetEntity === 'bottle') {
    const hasBottleContent = /\b(bottle|whiskey|bourbon|scotch|rye|irish|distillery|dram|single malt)\b/i.test(replyLower);
    if (!hasBottleContent && subjectType === 'pipe') return false;
    return true;
  }

  if (targetEntity === 'pipe') {
    const hasPipeContent = /\b(pipe|bowl|briar|billiard|dublin|meerschaum|shape|stem)\b/i.test(replyLower);
    return hasPipeContent;
  }

  return true;
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

  // DIRECT RECOMMENDATION — explicit ask for a suggestion/recommendation (must come before SESSION_RECOMMENDATION)
  const directRecPatterns = [
    /\b(what (is|would be|should i|do you recommend|would you recommend)|which (blend|tobacco|pipe|bottle)|recommend (a|an|some|the best)|good (blend|tobacco|pipe|bottle)|suggest (a|an)|what.*(good|smooth|mild|full|strong|light).*(blend|tobacco|smoke|pipe|bottle)|good.*to smoke|good.*with (coffee|tea|whiskey|beer|food|meal)|what.*go(es)? with|pair with coffee|pair with tea|what.*for (morning|evening|night|afternoon|after dinner|mid-morning|bedtime))\b/i,
    /\bwhat (blend|tobacco|pipe|bottle|whiskey|smoke) (should|would|do you|can you|could you)\b/i,
    /\b(is there a|are there any|any (good|recommended|suggestions for)) (blend|tobacco|pipe|bottle|whiskey)\b/i,
  ];
  if (directRecPatterns.some((p) => p.test(t))) return 'DIRECT_RECOMMENDATION';

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

  if (/\b(how much|what.*(worth|value|valued|valuable|price)|value of|most valuable|least valuable|insure|insurance)\b/i.test(t)) return 'VALUE_QUERY';
  if (/\b(what do i (own|have)|how many|list (my|all)|show me|inventory|do i have any|which (blends|pipes|bottles) do i)\b/i.test(t)) return 'INVENTORY_QUERY';
  if (/\b(budget|under \$|spend|afford|price range|best.*for \$|cheap|expensive|bang for|worth the money)\b/i.test(t)) return 'PURCHASE_BUDGET';
  if (/\b(weekend|week lineup|lineup|schedule|plan (for|my|a)|rotation plan|week.*smoke|smoke.*week)\b/i.test(t)) return 'LINEUP_PLANNING';
  if (/\b(sleeper|underrated|hidden gem|overlooked|not enough credit|underappreciated|undervalued)\b/i.test(t)) return 'SLEEPER_QUERY';
  if (/\b(haven.?t (touched|used|smoked|opened|had)|not used|sitting untouched|sitting idle|collecting dust|unopened)\b/i.test(t)) return 'UNUSED_QUERY';

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
    return `I wasn't able to resolve that from local data, but this looks like a question that needs domain knowledge. Try the same question again — it will be answered via AI now.`;
  }

  return "Try asking about a specific item, session, or what you should buy next and I'll answer directly.";
}

/**
 * Build a rich LLM prompt with full collection context.
 * This is the master intelligence layer — handles ALL query types with expert domain knowledge.
 */
// ─── Wine diagnostic response builder ────────────────────────────────────────

/**
 * Build a local (non-LLM) diagnostic response for a wine collection issue.
 * Queries the wine records from collection context and formats a structured reply.
 *
 * @param {{ intent: string, module: string }} diagnosticIntent
 * @param {object[]} wines — wine records from collectionContext
 * @returns {string} Formatted response text
 */
function buildWineDiagnosticResponse(diagnosticIntent, wines = []) {
  if (!diagnosticIntent) return null;

  const issues = analyzeWineOptimizationIssues(wines);
  const intentId = diagnosticIntent.intent;

  // Wine missing drinking window
  if (intentId === DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW) {
    const issue = issues.find((i) => i.type === 'missing_drinking_window');
    const affected = issue?.records || [];

    if (!wines.length) {
      return "Your WineKeeper collection is empty. Once you add wines, Curator will identify which ones need drinking-window data.";
    }

    if (!affected.length) {
      return "All wines in your collection already have drinking-window data. No action needed.";
    }

    const wineLines = affected.slice(0, 10).map((w) => {
      const label = [w.name || w.wine_name, w.producer, w.vintage, w.region].filter(Boolean).join(' · ');
      return `- ${label}`;
    });
    const moreCount = Math.max(0, affected.length - 10);
    const moreNote = moreCount > 0 ? `\n- …and ${moreCount} more` : '';

    const autoFixable = issue?.autoFixable
      ? '\n\nI can estimate drinking windows from vintage, producer, varietal, region, and style, then save suggested drink-from/drink-by dates for review.'
      : '';

    return `You have ${affected.length} wine${affected.length > 1 ? 's' : ''} missing drinking-window data:\n${wineLines.join('\n')}${moreNote}${autoFixable}\n\nOptions:\n- Auto-Fix Safe: estimate windows from vintage + style for wines with enough data\n- Review & Apply: see proposed dates before saving\n- Open Records: view the affected wines directly`;
  }

  // Wine missing valuation
  if (intentId === DIAGNOSTIC_INTENT.WINE_MISSING_VALUATION) {
    const issue = issues.find((i) => i.type === 'missing_valuation');
    const affected = issue?.records || [];

    if (!wines.length) {
      return "Your WineKeeper collection is empty. Once you add wines, Curator will flag which ones are missing valuation data.";
    }

    if (!affected.length) {
      return "All wines in your collection have valuation data. No action needed.";
    }

    const wineLines = affected.slice(0, 10).map((w) => {
      const label = [w.name || w.wine_name, w.producer, w.vintage].filter(Boolean).join(' · ');
      return `- ${label}`;
    });
    const moreCount = Math.max(0, affected.length - 10);
    const moreNote = moreCount > 0 ? `\n- …and ${moreCount} more` : '';

    return `You have ${affected.length} wine${affected.length > 1 ? 's' : ''} without valuation data:\n${wineLines.join('\n')}${moreNote}\n\nOptions:\n- Auto-Fix Safe: bootstrap from purchase price where available\n- Review & Apply: confirm proposed valuations before saving\n- Open Records: view and update the affected wines manually`;
  }

  // Wine stale valuation
  if (intentId === DIAGNOSTIC_INTENT.WINE_STALE_VALUATION) {
    const issue = issues.find((i) => i.type === 'stale_valuation');
    const affected = issue?.records || [];

    if (!affected.length) {
      return "All wines in your collection have current valuation data. No refresh needed.";
    }

    const wineLines = affected.slice(0, 8).map((w) => {
      const label = [w.name || w.wine_name, w.producer, w.vintage].filter(Boolean).join(' · ');
      return `- ${label}`;
    });
    const moreCount = Math.max(0, affected.length - 8);
    const moreNote = moreCount > 0 ? `\n- …and ${moreCount} more` : '';

    return `You have ${affected.length} wine${affected.length > 1 ? 's' : ''} with stale valuation data:\n${wineLines.join('\n')}${moreNote}\n\nOptions:\n- Auto-Fix Safe: refresh market estimates\n- Review & Apply: confirm updated values before saving`;
  }

  // Wine missing core metadata
  if (intentId === DIAGNOSTIC_INTENT.WINE_MISSING_METADATA || intentId === 'missing_core_metadata') {
    const issue = issues.find((i) => i.type === 'missing_core_metadata');
    const affected = issue?.records || [];

    if (!wines.length) {
      return "Your WineKeeper collection is empty. Once you add wines, Curator will identify records with incomplete metadata.";
    }

    if (!affected.length) {
      return "All wines in your collection have complete core metadata. No action needed.";
    }

    const wineLines = affected.slice(0, 10).map((w) => {
      const missing = ['producer', 'vintage', 'style', 'varietal', 'region', 'country'].filter((f) => !w[f]);
      const label = [w.name || w.wine_name || '(unnamed)'].filter(Boolean).join('');
      return `- ${label} [missing: ${missing.join(', ')}]`;
    });
    const moreCount = Math.max(0, affected.length - 10);
    const moreNote = moreCount > 0 ? `\n- …and ${moreCount} more` : '';

    return `You have ${affected.length} wine${affected.length > 1 ? 's' : ''} with incomplete metadata:\n${wineLines.join('\n')}${moreNote}\n\nCompleting producer, vintage, style, and region unlocks drinking-window estimation, rarity scoring, and more accurate Curator recommendations.`;
  }

  // General wine issues or collection evaluation
  if (intentId === DIAGNOSTIC_INTENT.WINE_EVALUATE_ISSUES || intentId === DIAGNOSTIC_INTENT.COLLECTION_EVALUATION) {
    if (!wines.length) {
      return "Your WineKeeper collection is empty. Once you add wines, Curator will analyze which records need attention.";
    }

    const summary = issues.map((issue) => `- ${issue.title}: ${issue.records.length} wine${issue.records.length > 1 ? 's' : ''}`);

    if (!summary.length) {
      return `Your ${wines.length} wines look complete — no missing data detected.`;
    }

    return `Here's a summary of your WineKeeper collection issues:\n${summary.join('\n')}\n\nAsk me about any of these to see the specific wines and options.`;
  }

  // Fallback for other diagnostic types (pipe photos, whiskey notes, etc.)
  return null;
}

/**
 * Build a rich LLM prompt with full collection context.
 * This is the master intelligence layer — handles ALL query types with expert domain knowledge.
 */
function buildLLMPrompt(userMessage, context = {}, history = [], entityContext = {}) {
  const pipes = context.pipes || [];
  const blends = context.blends || [];
  const bottles = context.bottles || [];
  const smokingLogs = context.smokingLogs || [];
  const tastingLogs = context.tastingLogs || [];
  const acquisitionItems = context.acquisitionItems || context.wantListItems || [];

  // ── Compute usage signals for richer context ─────────────────────────────
  const blendUsage = {};
  smokingLogs.forEach((l) => {
    const id = l?.blend_id || l?.blendId;
    if (id) blendUsage[id] = (blendUsage[id] || 0) + 1;
  });
  const bottleUsage = {};
  tastingLogs.forEach((l) => {
    const id = l?.bottle_id || l?.bottleId;
    if (id) bottleUsage[id] = (bottleUsage[id] || 0) + 1;
  });
  const pipeUsage = {};
  smokingLogs.forEach((l) => {
    const id = l?.pipe_id || l?.pipeId;
    if (id) pipeUsage[id] = (pipeUsage[id] || 0) + 1;
  });

  const lastSmokedByBlend = {};
  smokingLogs.forEach((l) => {
    const id = l?.blend_id || l?.blendId;
    const d = l?.date || l?.created_date;
    if (id && d && (!lastSmokedByBlend[id] || d > lastSmokedByBlend[id])) lastSmokedByBlend[id] = d;
  });
  const lastTastedByBottle = {};
  tastingLogs.forEach((l) => {
    const id = l?.bottle_id || l?.bottleId;
    const d = l?.tasting_date || l?.date || l?.created_date;
    if (id && d && (!lastTastedByBottle[id] || d > lastTastedByBottle[id])) lastTastedByBottle[id] = d;
  });

  const now = Date.now();
  const daysAgo = (d) => d ? Math.floor((now - new Date(d).getTime()) / 86400000) : null;

  // ── Build collection lines ───────────────────────────────────────────────
  const blendLines = blends.slice(0, 80).map((b) => {
    const sessions = blendUsage[b.id] || 0;
    const last = lastSmokedByBlend[b.id];
    const lastDays = daysAgo(last);
    const qty = b.tin_total_quantity_oz || b.bulk_total_quantity_oz || null;
    return `- ${b.name}${b.manufacturer ? ` by ${b.manufacturer}` : ''}${b.blend_type ? ` [${b.blend_type}]` : ''}${b.strength ? ` strength:${b.strength}` : ''}${b.flavor_notes?.length ? ` flavors:${b.flavor_notes.slice(0,3).join(',')}` : ''}${b.rating ? ` rated:${b.rating}/5` : ''}${b.is_favorite ? ' ★FAV' : ''}${sessions > 0 ? ` sessions:${sessions}` : ' NEW'}${lastDays !== null ? ` lastSmoked:${lastDays}d ago` : ''}${qty !== null ? ` qty:${qty}oz` : ''}${b.production_status === 'Discontinued' ? ' DISCONTINUED' : ''}`;
  });

  const pipeLines = pipes.slice(0, 60).map((p) => {
    const sessions = pipeUsage[p.id] || 0;
    return `- ${p.name}${p.maker ? ` by ${p.maker}` : ''}${p.shape ? ` [${p.shape}]` : ''}${p.bowl_material ? ` ${p.bowl_material}` : ''}${p.focus?.length ? ` focus:${p.focus.join(',')}` : ''}${p.is_favorite ? ' ★FAV' : ''}${sessions > 0 ? ` sessions:${sessions}` : ' UNSMOKED'}${p.estimated_value ? ` est.value:$${p.estimated_value}` : ''}`;
  });

  const bottleLines = bottles.slice(0, 60).map((b) => {
    const sessions = bottleUsage[b.id] || 0;
    const last = lastTastedByBottle[b.id];
    const lastDays = daysAgo(last);
    const type = b.type || b.whiskey_type || '';
    return `- ${b.name}${b.distillery ? ` by ${b.distillery}` : ''}${type ? ` [${type}]` : ''}${b.region ? ` ${b.region}` : ''}${b.age ? ` ${b.age}yr` : ''}${b.abv ? ` ${b.abv}%` : ''}${b.rating ? ` rated:${b.rating}/5` : ''}${b.is_favorite ? ' ★FAV' : ''}${sessions > 0 ? ` tastings:${sessions}` : ' UNTASTED'}${lastDays !== null ? ` lastOpened:${lastDays}d ago` : ''}${b.purchase_price ? ` paid:$${b.purchase_price}` : ''}${b.estimated_value ? ` est.value:$${b.estimated_value}` : ''}`;
  });

  const wantListLines = acquisitionItems.filter(i => i.status !== 'archived').slice(0, 20).map((i) =>
    `- ${i.name}${i.item_type ? ` [${i.item_type}]` : ''}${i.priority ? ` priority:${i.priority}` : ''}`
  );

  // ── Wine collection lines ────────────────────────────────────────────────
  const wines = context.wines || [];
  const wineLines = wines.slice(0, 60).map((w) => {
    const windowStatus = w.drink_window_status || '';
    const windowRange = w.drinking_window_start && w.drinking_window_end
      ? ` window:${w.drinking_window_start}-${w.drinking_window_end}`
      : ' MISSING_WINDOW';
    const val = w.estimated_unit_value || w.market_estimated_unit_value || w.purchase_price || null;
    return `- ${w.name}${w.producer ? ` by ${w.producer}` : ''}${w.vintage ? ` ${w.vintage}` : ''}${w.style ? ` [${w.style}]` : ''}${w.varietal ? ` ${w.varietal}` : ''}${w.region ? ` ${w.region}` : ''}${windowRange}${windowStatus ? ` status:${windowStatus}` : ''}${val ? ` est:$${val}` : ' UNVALUED'}`;
  });

  const collectionSummary = [
    blendLines.length > 0 ? `TOBACCO CELLAR (${blends.length} blends):\n${blendLines.join('\n')}` : 'TOBACCO CELLAR: empty',
    pipeLines.length > 0 ? `\nPIPE COLLECTION (${pipes.length} pipes):\n${pipeLines.join('\n')}` : '',
    bottleLines.length > 0 ? `\nWHISKEY SHELF (${bottles.length} bottles):\n${bottleLines.join('\n')}` : '',
    wineLines.length > 0 ? `\nWINE CELLAR (${wines.length} wines):\n${wineLines.join('\n')}` : '',
    wantListLines.length > 0 ? `\nWANT LIST / ACQUISITION QUEUE:\n${wantListLines.join('\n')}` : '',
    smokingLogs.length > 0 ? `\nTotal smoking sessions logged: ${smokingLogs.length}` : '',
    tastingLogs.length > 0 ? `\nTotal whiskey tastings logged: ${tastingLogs.length}` : '',
  ].filter(Boolean).join('');

  const recentHistory = history.slice(-8).map((m) => `${m.role === 'user' ? 'YOU' : 'CURATOR'}: ${m.content.slice(0, 400)}`).join('\n');

  const currentSubject = entityContext.subject?.name
    ? `ACTIVE SUBJECT: ${entityContext.subject.name} (${entityContext.subject.type})\n`
    : '';

  const constraints = entityContext.constraints
    ? `USER CONSTRAINTS: ${JSON.stringify(entityContext.constraints)}\n`
    : '';

  return `You are Curator — a world-class collector intelligence assistant specializing in pipe tobacco, whiskey, cigars, fine wines, and collectibles. You combine the knowledge of an expert tobacconist, master sommelier, and seasoned collector advisor.

═══ CRITICAL: DIAGNOSTIC ROUTING ═══
When the user references a collection issue label, report title, dashboard card, or phrase like "records without X" / "wines missing Y", treat it as a request to ANALYZE THE USER'S ACTUAL COLLECTION DATA — NOT as a product name.
Examples that must NEVER be treated as product names:
- "Wines Without a Drinking Window" → analyze WINE CELLAR records with MISSING_WINDOW
- "Cigars Without Valuation" → analyze cigar records missing valuation data
- "Pipes Missing Photos" → analyze PipeKeeper records without photos
- "Whiskeys Without Tasting Notes" → analyze WhiskeyKeeper records missing notes
Only treat a phrase as a product name if the user explicitly asks about a specific product (e.g., "Tell me about Laphroaig 10yr").

═══ USER COLLECTION ═══
${collectionSummary || 'No collection data yet.'}

${currentSubject}${constraints}${recentHistory ? `═══ CONVERSATION HISTORY ═══\n${recentHistory}\n` : ''}
═══ YOUR MISSION ═══
Answer the user's question with the precision of a trusted expert. You have two roles:
1. COLLECTION ANALYST: Use the actual collection data above to give personalized insights
2. DOMAIN EXPERT: Use your deep knowledge of tobacco/whiskey/wine to recommend products, explain styles, and guide purchases — even for items NOT in the collection

═══ ANSWER RULES ═══
SIMILARITY/RECOMMENDATIONS: Always give 4-7 specific named products with WHY each matches. Use flavor profile, strength, blend type, style. Never say "I need more information."
INVENTORY QUESTIONS: Count/list from the collection data above. Be specific — name items.
SESSION PLANNING: Pick from owned items. Explain why this item fits tonight (recency, rarity, mood, weather).
VALUE/RARITY: Reference purchase_price, estimated_value, production_status (DISCONTINUED = valuable). Factor scarcity.
GAP ANALYSIS: Compare what exists vs what's missing. Be specific about which families/styles are underrepresented.
PURCHASE GUIDANCE: Give specific product names with price context. Factor what they already own.
PAIRING: Explain the interaction — not just "goes well together." Why do these flavors complement or contrast?
REDUNDANCY: Name specific items that overlap. Explain what makes them redundant.
UNDERUSED: Look at sessions count and lastSmoked days. Items with 0 sessions or 60+ days = underused.
WINE DIAGNOSTICS: When user asks about wines missing drinking window, valuation, or metadata, list the specific wines from WINE CELLAR above marked MISSING_WINDOW or UNVALUED. Never reference external wine products or producers not in the collection.

═══ FORMAT RULES ═══
- Lead with the direct answer — no preamble or caveats
- Use numbered lists for ranked recommendations (1. Item — reason)
- Conversational but precise, like a trusted expert friend
- End with one concrete follow-up offer or next step
- Never use generic filler phrases ("strong directions", "couldn't resolve", "need more info")
- If collection data is thin, still give your best expert answer using domain knowledge

USER: ${userMessage}

CURATOR:`;
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

  // ── DIRECT_RECOMMENDATION ──────────────────────────────────────────────────
  // Handles explicit "what is a good X" / "recommend a X" / "what goes with coffee" style questions.
  // MUST produce a concrete answer even with sparse data. Never return meta-commentary as the main reply.
  if (intent === 'DIRECT_RECOMMENDATION') {
    const targetEntity = classifyTargetEntity(message);

    // Extract request context from message
    const wantsCoffee   = /\b(coffee|espresso|cappuccino)\b/i.test(message);
    const wantsTea      = /\b(tea)\b/i.test(message);
    const wantsSmooth   = /\b(smooth|mild|light|easy|gentle|soft)\b/i.test(message);
    const wantsFull     = /\b(full|strong|bold|heavy|robust|rich)\b/i.test(message);
    const wantsMorning  = /\b(morning|mid-morning|breakfast|early)\b/i.test(message);
    const wantsEvening  = /\b(evening|night|after dinner|nightcap|late)\b/i.test(message);

    // ── Blend/tobacco recommendation ──────────────────────────────────────
    if (targetEntity === 'blend' || targetEntity === 'session' || targetEntity === 'unknown') {
      if (blends.length > 0) {
        // Score blends by request context
        const scored = blends.map((b) => {
          let score = 0;
          const type = (b.blend_type || b.blend_family || '').toLowerCase();
          const strength = (b.strength || '').toLowerCase();
          const logs = smokingLogs.filter((l) => l?.blend_id === b.id || l?.blendId === b.id);
          const lastDate = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
          const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;

          // Session history bonus
          if (logs.length > 0) score += 10;
          if (b.rating >= 4) score += 15;
          if (b.is_favorite) score += 10;

          // Coffee/morning profile: Aromatics, Virginias, VaPers, Burley-based score highest
          if (wantsCoffee || wantsMorning) {
            if (type.includes('aromatic')) score += 20;
            if (type.includes('virginia/burley') || type.includes('burley')) score += 18;
            if (type.includes('virginia') && !type.includes('english')) score += 15;
            if (type.includes('virginia/perique')) score += 12;
            if (type.includes('english') || type.includes('balkan') || type.includes('latakia')) score -= 5; // too heavy for morning coffee
          }
          if (wantsTea) {
            if (type.includes('virginia')) score += 20;
            if (type.includes('virginia/perique')) score += 15;
            if (type.includes('aromatic')) score += 10;
          }
          if (wantsSmooth) {
            if (strength === 'mild' || strength === 'mild-medium') score += 20;
            if (type.includes('virginia') || type.includes('aromatic')) score += 10;
            if (strength === 'full') score -= 10;
          }
          if (wantsFull) {
            if (strength === 'full' || strength === 'medium-full') score += 20;
            if (type.includes('english') || type.includes('balkan')) score += 15;
          }
          if (wantsEvening) {
            if (type.includes('english') || type.includes('balkan') || type.includes('latakia')) score += 15;
            if (strength === 'full' || strength === 'medium-full') score += 10;
          }

          return { blend: b, score, logs, daysSinceLast };
        }).sort((a, b) => b.score - a.score);

        const top = scored[0]?.blend;
        const second = scored[1]?.blend;
        const topType = top?.blend_type || top?.blend_family || 'tobacco';
        const secondType = second?.blend_type || second?.blend_family || null;

        let contextLine = '';
        if (wantsCoffee && wantsSmooth) contextLine = 'For a smooth morning coffee smoke, ';
        else if (wantsCoffee) contextLine = 'For pairing with coffee, ';
        else if (wantsMorning) contextLine = 'For a morning session, ';
        else if (wantsSmooth) contextLine = 'For something smooth, ';
        else contextLine = 'Best current pick: ';

        const strengthNote = top?.strength ? ` It sits at ${top.strength.toLowerCase()} strength` : '';
        const typeNote = topType ? ` — a ${topType}` : '';
        const secondLine = second ? ` Second option: ${second.name}${secondType ? ` (${secondType})` : ''}, if you want a different angle.` : '';

        const reply = `${contextLine}${top.name}${typeNote}.${strengthNote}, which should work well without being heavy or demanding.${secondLine}`;
        return {
          reply,
          updatedEntityContext: {
            ...entityContext,
            subject: { id: top.id, name: top.name, type: 'blend' },
            topicIntent: 'recommend_session',
            lastClaimType: 'direct_blend_recommendation',
            lastEvidenceClass: scored[0]?.logs?.length > 2 ? 'MODERATE' : 'WEAK',
            lastConclusion: top.name,
          },
        };
      }

      // No blends at all — give category guidance, not meta-commentary
      const categoryAdvice = wantsCoffee || wantsSmooth || wantsMorning
        ? "For a smooth coffee pairing, a Virginia or Burley-forward blend is the right direction. Something like a mild Virginia flake or a clean Burley mix won't compete with the cup. If you add any blends to your collection, look for one of those families first."
        : "For a tobacco recommendation, a Virginia-based blend is a good all-around starting point — it's versatile, ages well, and suits most times of day. If you have a specific profile in mind, tell me and I can narrow it down.";
      return { reply: categoryAdvice, updatedEntityContext: entityContext };
    }

    // ── Pipe recommendation ────────────────────────────────────────────────
    if (targetEntity === 'pipe') {
      if (pipes.length > 0) {
        const scoredPipes = pipes.map((p) => {
          let score = 0;
          const logs = smokingLogs.filter((l) => l?.pipe_id === p.id || l?.pipeId === p.id);
          const lastDate = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
          const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;
          if (logs.length > 0) score += 10;
          if (daysSinceLast === null || daysSinceLast >= 14) score += 15; // rested
          if (p.is_favorite) score += 10;
          const shape = norm(p.shape || '');
          if (wantsSmooth || wantsMorning || wantsCoffee) {
            // Prefer smaller, shorter shapes for morning/coffee sessions
            if (['billiard', 'apple', 'pot', 'canadian', 'lovat'].includes(shape)) score += 15;
            if (['churchwarden', 'calabash', 'freehand'].includes(shape)) score -= 5;
          }
          return { pipe: p, score, logs, daysSinceLast };
        }).sort((a, b) => b.score - a.score);

        const top = scoredPipes[0]?.pipe;
        const second = scoredPipes[1]?.pipe;
        const shapeNote = top.shape ? ` (${top.shape})` : '';
        const restNote = scoredPipes[0]?.daysSinceLast === null ? ' — never logged, good time to start' : scoredPipes[0]?.daysSinceLast >= 14 ? ` — rested ${scoredPipes[0].daysSinceLast} days` : '';
        const secondLine = second ? ` Second option: ${second.name}${second.shape ? ` (${second.shape})` : ''} if you want a different feel.` : '';
        const reply = `Best current pick: ${top.name}${shapeNote}${restNote}.${secondLine}`;
        return {
          reply,
          updatedEntityContext: {
            ...entityContext,
            subject: { id: top.id, name: top.name, type: 'pipe' },
            topicIntent: 'recommend_session',
            lastClaimType: 'direct_pipe_recommendation',
            lastEvidenceClass: 'MODERATE',
            lastConclusion: top.name,
          },
        };
      }
      return { reply: "For a pipe recommendation — a billiard is the most versatile shape to start with, especially for morning sessions. Medium bowl size keeps things from getting heavy.", updatedEntityContext: entityContext };
    }

    // ── Bottle recommendation ──────────────────────────────────────────────
    if (targetEntity === 'bottle') {
      if (bottles.length > 0) {
        const top = bestOpenBottle(bottles, tastingLogs);
        const second = bottles.find((b) => b.id !== top?.id);
        const typeNote = top?.type || top?.whiskey_type ? ` (${top.type || top.whiskey_type})` : '';
        const secondLine = second ? ` Second option: ${second.name}${second.type || second.whiskey_type ? ` (${second.type || second.whiskey_type})` : ''}.` : '';
        const reply = `Best current pick: ${top.name}${typeNote}. It${tastingLogs.some(l => l.bottle_id === top.id) ? ' has some session history' : ' hasn\'t been logged yet — first tasting would add useful data'}.${secondLine}`;
        return {
          reply,
          updatedEntityContext: {
            ...entityContext,
            subject: { id: top.id, name: top.name, type: 'bottle' },
            topicIntent: 'recommend_session',
            lastClaimType: 'direct_bottle_recommendation',
            lastEvidenceClass: 'MODERATE',
            lastConclusion: top.name,
          },
        };
      }
      return { reply: "For whiskey to pair with a smoke, a lightly peated Scotch or a wheated Bourbon tends to complement tobacco well without dominating. Either makes a strong starting point for the shelf.", updatedEntityContext: entityContext };
    }

    // Generic fallback — should not reach here normally
    return { reply: safeCuratorFallback(context, message), updatedEntityContext: entityContext };
  }

  // ── SESSION_RECOMMENDATION ─────────────────────────────────────────────────
  if (intent === 'SESSION_RECOMMENDATION') {
    try {
      const whiskeyFocused = /\b(whiskey|bourbon|scotch|rye|irish|bottle|pour|dram)\b/i.test(message);
      // Blend/tobacco signals must be checked BEFORE generic pipe/smoke signals
      const blendFocused   = /\b(tobacco|blend|tin|virginia|aromatic|english|burley|latakia|mixture|flake|what.*(smoke|enjoy)|which.*(smoke|blend|tobacco))\b/i.test(message) && !/\b(which pipe|what pipe|pipe should)\b/i.test(message);
      const pipeFocused    = !blendFocused && /\b(pipe|bowl|briar)\b/i.test(message);
      const targetModule   = whiskeyFocused ? 'whiskey' : blendFocused ? 'blend' : pipeFocused ? 'pipe' : 'any';
      const candidates = buildSessionPlan(context, activeModules, targetModule);
      if (!candidates.length) {
        // Sparse data — still give a concrete answer using available collection items
        if (blendFocused && blends.length > 0) {
          const pick = bestTonightBlend(blends, smokingLogs);
          if (pick) return { reply: `Best current pick: ${pick.name}${pick.blend_type ? ` (${pick.blend_type})` : ''}. It is the strongest candidate from the current cellar. Log a session after to start building the pattern.`, updatedEntityContext: { ...entityContext, subject: { id: pick.id, name: pick.name, type: 'blend' }, lastClaimType: 'sparse_blend_recommendation' } };
        }
        if (whiskeyFocused && bottles.length > 0) {
          const pick = bestOpenBottle(bottles, tastingLogs);
          if (pick) return { reply: `Best current pick: ${pick.name}${pick.type ? ` (${pick.type})` : ''}. Open it and log the pour to build up your tasting record.`, updatedEntityContext: { ...entityContext, subject: { id: pick.id, name: pick.name, type: 'bottle' }, lastClaimType: 'sparse_bottle_recommendation' } };
        }
        if (pipes.length > 0) {
          const pick = bestTonightPipe(pipes, smokingLogs, blends);
          if (pick) return { reply: `Best current pick: ${pick.name}${pick.shape ? ` (${pick.shape})` : ''}. It is the most rested pipe in rotation right now.`, updatedEntityContext: { ...entityContext, subject: { id: pick.id, name: pick.name, type: 'pipe' }, lastClaimType: 'sparse_pipe_recommendation' } };
        }
        // Truly nothing — still give useful guidance, not meta-commentary
        return { reply: "Add a few items to your collection and I can make specific recommendations. For now: a mild Virginia or Burley blend is the best all-around starting point for daytime sessions, especially with coffee.", updatedEntityContext: entityContext };
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialEntityContext) {
      const { id, name, type, ownershipHint, structuredIssueContext } = initialEntityContext;
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
          // Preserve structured issue context so sendMessage can use it for diagnostic routing
          structuredIssueContext: structuredIssueContext || null,
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (preFillMessage) {
      setInput(preFillMessage);
      onPreFillConsumed?.();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [preFillMessage, onPreFillConsumed]);

  /**
   * Determines if this query should go to the LLM.
   * The LLM is the PRIMARY engine for all intelligence queries.
   * The local rule engine only handles simple structural operations (corrections, constraints, follow-ups).
   */
  function needsLLM(text, intent) {
    // Local rule engine handles these specific intents reliably
    const localIntents = new Set(['USER_CORRECTION', 'FOLLOW_UP_CONSTRAINT', 'FOLLOW_UP_NEXT_CANDIDATE']);
    if (localIntents.has(intent)) return false;

    // Everything else goes to LLM for premium-quality answers
    // This covers: similarity, purchase, value, inventory, session, gap, pairing, redundancy, ranking, lineup, etc.
    return true;
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setIsSending(true);
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: text }]);
    setInput('');
    try {
      // ── Diagnostic intent check (MUST run before LLM routing) ──────────────
      // Intercepts collection issue labels (e.g., "Wines Without a Drinking Window")
      // so they are never misrouted to the LLM as product/blend name lookups.
      const diagnosticIntent = classifyDiagnosticIntent(text, entityContext?.structuredIssueContext);
      if (diagnosticIntent) {
        const wines = Array.isArray(collectionContext?.wines) ? collectionContext.wines : [];
        const diagnosticReply = buildWineDiagnosticResponse(diagnosticIntent, wines);
        if (diagnosticReply) {
          setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: diagnosticReply }]);
          return;
        }
        // diagnosticReply is null for non-wine diagnostic types (pipes, whiskey, etc.)
        // Fall through to LLM which has diagnostic guardrails in its prompt.
      }

      const intent = classifyIntent(text);
      const useLLM = needsLLM(text, intent);

      if (useLLM) {
        // Use LLM for domain-knowledge queries (similarity, external products, comparison, etc.)
        const llmPrompt = buildLLMPrompt(text, collectionContext, messages, entityContext);
        const response = await base44.functions.invoke('invokeCuratorLLM', { prompt: llmPrompt });
        const llmReply = typeof response?.data === 'string'
          ? response.data
          : response?.data?.result || response?.data?.text || response?.data?.content || String(response?.data || '');
        const cleanReply = llmReply.trim() || 'I was not able to generate a response. Please try rephrasing.';
        // Update entity context with any named product mentioned (skip for diagnostic phrases)
        if (!diagnosticIntent) {
          const namedProductMatch = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z&][a-zA-Z']+){1,4})\b/g);
          if (namedProductMatch?.[0]) {
            setEntityContext((prev) => ({
              ...prev,
              subject: { name: namedProductMatch[0], type: 'external', id: null },
              topicIntent: 'similarity_query',
              lastClaimType: 'llm_recommendation',
              lastEvidenceClass: 'STRONG',
            }));
          }
        }
        setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: cleanReply }]);
        return;
      }

      // Rule-based engine for collection-specific queries
      const targetEntity = classifyTargetEntity(text);
      const result = answerQuestion(text, collectionContext, { ...entityContext, analysisContext }, isSingleModuleMode, activeModules, continueAnalysis);
      const { reply, updatedEntityContext, newAnalysisContext } = result || {};

      // Answer validation guard — if the reply doesn't match the requested entity, escalate to LLM
      let finalReply = reply;
      if (reply && !validateAnswerEntityMatch(targetEntity, reply, updatedEntityContext)) {
        // Escalate to LLM rather than producing filler text
        const llmPrompt = buildLLMPrompt(text, collectionContext, messages, entityContext);
        const response = await base44.functions.invoke('invokeCuratorLLM', { prompt: llmPrompt });
        const llmReply = typeof response?.data === 'string'
          ? response.data
          : response?.data?.result || response?.data?.text || response?.data?.content || String(response?.data || '');
        finalReply = llmReply.trim() || finalReply;
      }

      if (newAnalysisContext) setAnalysisContext(newAnalysisContext);
      else if (result?.reply && !newAnalysisContext) setAnalysisContext(null);
      if (updatedEntityContext) setEntityContext(updatedEntityContext);
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: finalReply || 'Something went wrong generating a response. Please try rephrasing.' }]);
    } catch (err) {
      console.error('[Curator] sendMessage error:', err);
      // Last-resort: still try to give useful guidance
      const fallback = 'I ran into an issue processing that. Try rephrasing, or ask about a specific item in your collection.';
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: fallback }]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, collectionContext, entityContext, isSingleModuleMode, activeModules, continueAnalysis, messages]);

  const hasCollection = (collectionContext?.blends?.length || 0) + (collectionContext?.bottles?.length || 0) + (collectionContext?.pipes?.length || 0) > 0;

  return (
    <div className="rounded-[18px] overflow-hidden flex flex-col" style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(140,105,65,0.16)', minHeight: 520 }}>
      {/* Header */}
      <div className="px-5 sm:px-7 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-[18px] sm:text-[20px] font-semibold" style={{ color: '#F5F5F7' }}>Curator Console</h3>
            <p className="text-[13px] sm:text-[14px] mt-0.5" style={{ color: '#6B6860' }}>
              {hasCollection ? 'Personalized intelligence from your collection' : 'Expert collector advisor — ask anything'}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => { setMessages([]); setEntityContext({}); setAnalysisContext(null); }}
              className="text-[12px] px-3 py-1.5 rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#71717A' }}
            >
              New chat
            </button>
          )}
        </div>

        {/* Topic tags */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {['Recommendations', 'Pairings', 'Session Planning', 'Collection Gaps', 'Value & Rarity', 'What to Buy'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-[11px] sm:text-[12px]" style={{ border: '1px solid rgba(198,161,91,0.22)', color: '#C6A15B' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5" style={{ maxHeight: 480, minHeight: 260 }}>
        {messages.length === 0 ? (
          <div>
            <p className="text-[14px] mb-4" style={{ color: '#6B6860' }}>Ask a question or pick a prompt to get started.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-left px-4 py-3 rounded-[12px] text-[13px] sm:text-[14px] transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#C8B898', background: 'rgba(255,255,255,0.02)' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[92%] sm:max-w-[85%] ${m.role === 'user' ? 'order-last' : ''}`}>
                  <div className="text-[11px] uppercase tracking-[0.10em] mb-1.5" style={{ color: '#4A4840' }}>
                    {m.role === 'user' ? 'You' : 'Curator'}
                  </div>
                  <div
                    className="rounded-[14px] px-4 py-3 text-[14px] sm:text-[15px] leading-7"
                    style={m.role === 'user'
                      ? { background: 'rgba(198,161,91,0.12)', color: '#F5F1E7', border: '1px solid rgba(198,161,91,0.18)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#E8E4DC', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                  >
                    {/* Render response with basic markdown-like formatting */}
                    {m.content.split('\n').map((line, i) => {
                      if (/^#{1,3}\s/.test(line)) {
                        return <div key={i} className="font-semibold text-[15px] sm:text-[16px] mt-3 mb-1" style={{ color: '#F5F5F7' }}>{line.replace(/^#{1,3}\s/, '')}</div>;
                      }
                      if (/^\d+\.\s/.test(line)) {
                        return <div key={i} className="ml-1 my-1" style={{ color: '#E8E4DC' }}>{line}</div>;
                      }
                      if (/^[-•]\s/.test(line)) {
                        return <div key={i} className="ml-2 my-0.5" style={{ color: '#C8C0B0' }}>{line}</div>;
                      }
                      if (line.trim() === '') return <div key={i} className="h-2" />;
                      return <div key={i}>{line}</div>;
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-[11px] uppercase tracking-[0.10em] mb-1.5" style={{ color: '#4A4840' }}>Curator</div>
                  <div className="rounded-[14px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="inline-flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C6A15B', animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C6A15B', animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C6A15B', animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-5 sm:px-7 pb-5 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex gap-2 sm:gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canSend) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about your collection, pairings, what to buy, or anything collector-related…"
            rows={1}
            className="flex-1 px-4 py-3 rounded-[14px] outline-none bg-transparent resize-none text-[14px] sm:text-[15px] leading-6"
            style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#F5F5F7', minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={sendMessage}
            className="shrink-0 h-12 w-12 rounded-[12px] inline-flex items-center justify-center transition-opacity"
            style={{ background: '#C6A15B', color: '#0B0B0C', opacity: canSend ? 1 : 0.45 }}
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] mt-2" style={{ color: '#3A3830' }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}