import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SendHorizontal } from 'lucide-react';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner.js';

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

// ─── Intent classifier ─────────────────────────────────────────────────────────
/**
 * Returns one of:
 *   EVALUATE_OWNED_ITEM | EVALUATE_OUTSIDE_RECOMMENDATION
 *   EXPLAIN_PAIRING | SESSION_RECOMMENDATION | RESTOCK_ADVICE
 *   GAP_ANALYSIS | COLLECTION_ANALYSIS | USER_CORRECTION | FOLLOW_UP | UNKNOWN
 */
function classifyIntent(message, collectionContext = {}) {
  const t = message.toLowerCase().trim();

  // USER_CORRECTION — must check BEFORE follow-up pronouns to avoid mis-routing
  // Triggers on: explicit contradiction phrases, negation with "never/only/already/not",
  // correction openers like "but", "actually", "that's not"
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
  ];
  if (correctionPatterns.some((p) => p.test(t))) return 'USER_CORRECTION';

  // Follow-up pronouns — check after correction
  const followUpPattern = /\b(it|that|this one|this pipe|that pipe|this blend|that blend|this bottle|that bottle|the one|how does it|how does that|how does this|where does it|is it redundant|what would you do with it|how does it compare|why that one|what about the other)\b/i;
  const comparisonPattern = /\b(compare|redundant|overlap|where does it sit|how does it fit)\b/i;
  if (followUpPattern.test(t) || comparisonPattern.test(t)) return 'FOLLOW_UP';

// ─── String helpers ────────────────────────────────────────────────────────────
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

// ─── Owned-item evaluation helpers ────────────────────────────────────────────
function evaluateOwnedBottle(bottle, bottles = [], tastingLogs = []) {
  const type = norm(bottle.type || bottle.whiskey_type || 'unknown');
  const sameType = bottles.filter((b) => b.id !== bottle.id && norm(b.type || b.whiskey_type || '').split(' ').some((w) => type.includes(w) || type.split(' ').some((tw) => tw === w)));
  const adjacent = sameType.slice(0, 3);
  const tastings = tastingLogs.filter((l) => l?.bottle_id === bottle.id || l?.bottleId === bottle.id);
  const tastingCount = tastings.length;

  const role =
    sameType.length >= 3 ? 'overlapping — multiple similar bottles compete for the same lane' :
    sameType.length === 2 ? 'one of three in its style — moderate overlap' :
    sameType.length === 1 ? 'one of two in its lane — some overlap' :
    'sole representative of its type — no direct overlap';

  const overlapLevel = sameType.length >= 3 ? 'high' : sameType.length >= 1 ? 'moderate' : 'none';
  const uniquenessLevel = sameType.length === 0 ? 'high' : sameType.length <= 1 ? 'moderate' : 'low';
  const usageState =
    tastingCount === 0 ? 'untasted — no tasting sessions logged' :
    tastingCount >= 5 ? `actively used — ${tastingCount} tasting sessions logged` :
    `lightly used — ${tastingCount} tasting session${tastingCount > 1 ? 's' : ''} logged`;

  const recommendation =
    tastingCount === 0 ? 'open it and log your first tasting — you have context for it but no session data' :
    overlapLevel === 'high' ? 'consider whether this lane needs all its occupants — this is a candidate for focused evaluation' :
    'keep it in rotation and log tasting notes to anchor its position in the collection';

  return { role, adjacentComparables: adjacent, overlapLevel, uniquenessLevel, usageState, recommendation };
}

function evaluateOwnedBlend(blend, blends = [], smokingLogs = []) {
  const type = blend.blend_type || blend.blend_family || 'unknown';
  const sameType = blends.filter((b) => b.id !== blend.id && (b.blend_type || b.blend_family) === type);
  const adjacent = sameType.slice(0, 3);
  const usage = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
  const sessionCount = usage.length;
  const lastDate = usage.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
  const lastDays = daysSince(lastDate);

  const role =
    sameType.length >= 3 ? `one of many ${type} blends — significant overlap in this family` :
    sameType.length >= 1 ? `one of ${sameType.length + 1} in the ${type} family` :
    `the only ${type} blend in your cellar`;

  const overlapLevel = sameType.length >= 3 ? 'high' : sameType.length >= 1 ? 'moderate' : 'none';
  const uniquenessLevel = sameType.length === 0 ? 'high' : sameType.length <= 1 ? 'moderate' : 'low';
  const usageState =
    sessionCount === 0 ? 'never smoked — no sessions logged' :
    (lastDays !== null && lastDays > 60) ? `stale — ${sessionCount} sessions, last smoked ${lastDays} days ago` :
    `active — ${sessionCount} sessions logged`;

  const recommendation =
    sessionCount === 0 ? 'smoke it and log the session — it needs usage data before Curator can position it accurately' :
    overlapLevel === 'high' ? 'this family has coverage — decide if this blend is earning a distinct role or is redundant' :
    'continue rotating it — its position in the family is clear';

  return { role, adjacentComparables: adjacent, overlapLevel, uniquenessLevel, usageState, recommendation };
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

  const role =
    sameShape.length >= 2 ? `one of ${sameShape.length + 1} ${shape} pipes — crowded shape lane` :
    sameShape.length === 1 ? `one of two ${shape} pipes` :
    `the only ${shape} in your collection`;

  const overlapLevel = sameShape.length >= 2 ? 'high' : sameShape.length === 1 ? 'moderate' : 'none';
  const uniquenessLevel = sameShape.length === 0 ? 'high' : 'moderate';
  const usageState =
    sessionCount === 0 ? 'no sessions logged' :
    (lastDays !== null && lastDays > 45) ? `underused — ${sessionCount} sessions, last smoked ${lastDays} days ago` :
    `active — ${sessionCount} sessions`;

  const recommendation =
    sessionCount === 0 ? 'log a session to begin building its profile' :
    (overlapLevel === 'high' && sessionCount < 5) ? 'low usage in a crowded shape lane — evaluate whether it earns a distinct specialization' :
    focus ? `keep it assigned to ${focus} — usage data supports that focus` :
    'consider assigning a focus — its usage pattern suggests a natural specialization';

  return { role, adjacentComparables: adjacent, overlapLevel, uniquenessLevel, usageState, recommendation };
}

// ─── Collection analysis helpers ───────────────────────────────────────────────
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
    return { ...pipe, sessionCount: logs.length, lastSmokedDays: daysSince(last), allTypes, dominantFamily: allTypes[0]?.type || null, dominantCount: allTypes[0]?.count || 0 };
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

function biggestGap(blends = [], bottles = [], activeModules = {}) {
  const whiskeyOnly = activeModules.whiskeykeeper !== false && activeModules.pipekeeper === false;
  const bottleTypes = new Set(bottles.map((b) => norm(b.type || b.whiskey_type || '')).filter(Boolean));
  const blendFamilies = new Set(blends.map((b) => b.blend_type || b.blend_family || '').filter(Boolean));

  if (whiskeyOnly) {
    if (![...bottleTypes].some((t) => t.includes('rye'))) return 'A rye lane is absent. Rye adds pepper and grip that bourbon and Scotch do not replicate — it is one of the most practical gaps to close.';
    if (![...bottleTypes].some((t) => t.includes('scotch') || t.includes('single malt') || t.includes('islay') || t.includes('speyside') || t.includes('highland'))) return 'Scotch is missing. It brings smoke, fruit, and complexity that no American whiskey replicates.';
    if (![...bottleTypes].some((t) => t.includes('irish'))) return 'Irish whiskey is absent — the most approachable style for guests and a clean contrast to bourbon and Scotch.';
    if (![...bottleTypes].some((t) => t.includes('bourbon'))) return 'Bourbon is the American reference point — its absence leaves a real gap in the tasting range.';
    return 'Your next gap is depth: log tasting notes on every bottle and add pricing on your highest-value pours.';
  }

  if (!blendFamilies.has('Virginia/Burley')) return 'A Virginia/Burley lane is thin. It provides a reliable middle ground between brighter Virginia sweetness and drier Burley structure.';
  if (![...blendFamilies].some((f) => f.includes('English') || f.includes('Balkan'))) return 'Your cellar is light on English/Balkan territory — a real gap in smoky, savory session options.';
  if (![...bottleTypes].some((t) => t.includes('rye'))) return 'A rye lane is absent. Rye adds pepper and contrast that bourbon and Irish whiskey do not handle the same way.';
  return 'Your next gap is specialization: get each pipe and each blend family into a cleaner lane so the collection is easier to use, not just larger.';
}

// ─── Pairing explanation ───────────────────────────────────────────────────────
function pairingExplanationEngine(message, context = {}, entityContext = {}) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];

  let pipe = extractNamedEntity(message, pipes) || entityContext.pipe;
  let blend = extractNamedEntity(message, blends) || entityContext.blend;
  let bottle = extractNamedEntity(message, bottles) || entityContext.bottle;

  if (!pipe) pipe = bestTonightPipe(pipes, context?.smokingLogs || [], blends);
  if (!blend) blend = bestTonightBlend(blends, context?.smokingLogs || []);
  if (!bottle) bottle = bestOpenBottle(bottles, context?.tastingLogs || []);

  if (!pipe || !blend || !bottle) {
    return {
      reply: 'A pairing explanation needs a pipe, a blend, and a bottle. Name the three items or log more collection data so I can suggest a strong starting point.',
      updatedEntityContext: entityContext,
    };
  }

  const blendType = blend.blend_type || blend.blend_family || 'Unknown';
  const bottleType = bottle.type || bottle.whiskey_type || 'Unknown';

  let whyItWorks, whatToExpect;
  if ((blendType.includes('English') || blendType.includes('Balkan')) && norm(bottleType).includes('peated')) {
    whyItWorks = `${blendType} tobacco layers dark, phenolic smoke that reinforces ${bottleType}'s own peat rather than competing with it. Both elements push in the same direction — depth, not contrast.`;
    whatToExpect = `A dense, meditative session. Neither element asks you to switch gears. Take your time with both.`;
  } else if (blendType.includes('Aromatic') && norm(bottleType).includes('irish')) {
    whyItWorks = `${bottleType}'s clean grain cuts through ${blendType}'s topping sweetness before it becomes cloying. Each pour resets the palate cleanly.`;
    whatToExpect = `A lighter, social session. The whiskey acts as a bridge, not a statement.`;
  } else if ((blendType.includes('Burley') || blendType.includes('Virginia/Burley')) && norm(bottleType).includes('bourbon')) {
    whyItWorks = `${blendType} earth and ${bottleType} caramel occupy adjacent registers — warm, full, without direct competition. Neither overshadows the other.`;
    whatToExpect = `Comfort. A session where both elements settle into their best selves.`;
  } else if (blendType.includes('Virginia/Perique') && norm(bottleType).includes('rye')) {
    whyItWorks = `Perique's peppery snap finds its match in ${bottleType}'s grain bite. They open texture in each other rather than flattening.`;
    whatToExpect = `A session with real edges — not soft, but rewarding in proportion to attention.`;
  } else if (blendType.includes('Virginia') && (norm(bottleType).includes('highland') || norm(bottleType).includes('speyside'))) {
    whyItWorks = `${blendType}'s bright fruit pairs with ${bottleType}'s fruity middle palate — balance rather than boldness.`;
    whatToExpect = `A brighter session. Natural sweetness stays front-and-center.`;
  } else {
    whyItWorks = `${blendType} and ${bottleType} hold their character alongside each other — neither dominates.`;
    whatToExpect = `A balanced session where both keep their voice.`;
  }

  const reply = `**${pipe.name} · ${blend.name} · ${bottle.name}**\n\n**Why it works:**\n${whyItWorks}\n\n**${pipe.name}'s role:**\nThe bowl geometry determines whether the session stays focused or gets muddy. A well-rested pipe in this pairing keeps both tobacco character and whiskey finish clear.\n\n**What to expect:**\n${whatToExpect}`;

  return { reply, updatedEntityContext: { ...entityContext, pipe, blend, bottle, topicIntent: 'explain_pairing' } };
}

// ─── Main answer function ──────────────────────────────────────────────────────
function answerQuestion(message, context = {}, entityContext = {}, isSingleModuleMode = false, activeModules = {}) {
  const intent = classifyIntent(message, context);

  const pipeActive    = activeModules.pipekeeper    !== false;
  const tobaccoActive = activeModules.tobacco       !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;

  const pipes       = pipeActive    ? (context?.pipes       || []) : [];
  const blends      = tobaccoActive ? (context?.blends      || []) : [];
  const smokingLogs = pipeActive    ? (context?.smokingLogs || []) : [];
  const bottles     = whiskeyActive ? (context?.bottles     || []) : [];
  const tastingLogs = whiskeyActive ? (context?.tastingLogs || []) : [];
  const acquisitionItems = context?.acquisitionItems || context?.wantListItems || [];

  // ── USER_CORRECTION: revise prior claim ─────────────────────────────────────
  if (intent === 'USER_CORRECTION') {
    const subject = entityContext.subject;
    const topicIntent = entityContext.topicIntent;
    const priorClaim = entityContext.priorClaim; // what Curator last asserted
    const msg = message;

    // Identify which domain the correction targets
    const isSpecialization  = /specializ|reassign|assign|lane|vaper|virginia|aromatic|english|burley/i.test(msg) || topicIntent === 'collection_analysis';
    const isOwnership       = /already (have|own|in my)|already (owns?|have it)/i.test(msg) || topicIntent === 'evaluate_recommendation';
    const isRestock         = /already (on my (list|shopping|want)|tracked|listed)/i.test(msg) || topicIntent === 'restock_advice';
    const isUsage           = /never (smoked|used|had|seen)|only (used|smoked) for|i use it for/i.test(msg);
    const isPairing         = topicIntent === 'explain_pairing';

    const subjectName = subject?.name || 'that item';

    // Detect what the user says the item actually is/does
    const aromaticOnly   = /aromatic/i.test(msg);
    const englishOnly    = /english/i.test(msg);
    const virginiaOnly   = /virginia/i.test(msg);
    const alreadyUsed    = /already (one of my most used|heavily used|actively used)/i.test(msg);
    const alreadyTracked = /already (on my|tracked|on the list)/i.test(msg);
    const alreadyOwned   = /already (have|own)/i.test(msg);

    let reply;
    let updatedCtx = { ...entityContext };

    if (isSpecialization || isUsage) {
      const inferredFamily = aromaticOnly ? 'aromatic' : englishOnly ? 'English/Latakia' : virginiaOnly ? 'Virginia' : null;
      const correctionLine = inferredFamily
        ? `If ${subjectName} has only been used for ${inferredFamily}, then it is not a real reassignment candidate for a different family.`
        : `If that pipe has not been used in the inferred pattern, then my earlier recommendation is not supported by the evidence.`;

      reply = `Then I would revise that.

${correctionLine} My earlier read was too aggressive.

**Why I got it wrong:** The inference came from session logs — if those sessions are sparse, stale, or tagged to the wrong blend type, the signal will point in the wrong direction. That is a data-quality problem, not a confirmation that the pipe should change lanes.

**Revised conclusion:** I would treat ${subjectName} as low-confidence for reassignment. If it is genuinely aromatic-designated, keep it there. The next strongest reassignment candidate is the one with the clearest cross-family signal from a higher session count.

**Next step:** Want me to re-run on the next candidate — skipping ${subjectName}?`;
      updatedCtx = { ...entityContext, correctionApplied: true, excludedFromAnalysis: subject, priorClaim: null };
    } else if (isOwnership || alreadyOwned) {
      reply = `Understood — if you already own that, then evaluating it as a gap-fill or outside recommendation was incorrect.

**Revised:** That item should be evaluated as an owned piece, not as an acquisition target. If it is already active in your collection, the relevant question is whether it has a clear role or is overlapping with something else you own.

Want me to evaluate it in the context of your owned collection instead?`;
      updatedCtx = { ...entityContext, topicIntent: 'evaluate_owned_item', correctionApplied: true, priorClaim: null };
    } else if (isRestock || alreadyTracked) {
      reply = `Got it — if it is already tracked, then the recommendation was redundant.

**Revised:** Rather than adding it, the question is whether it should move up in priority on your existing list. If inventory is low and it is already on your shopping list, the next step is acting on that item, not re-adding it.

Want me to look at what else might need attention ahead of it?`;
      updatedCtx = { ...entityContext, correctionApplied: true, priorClaim: null };
    } else if (alreadyUsed) {
      reply = `Noted — if ${subjectName} is already one of your most active items, then any framing around it being idle or underused was wrong.

**Revised:** ${subjectName} has earned its place. The relevant question now is whether it has enough focus for its current usage level, or whether logging more structured notes would sharpen its role going forward.

If you want I can look at the rest of the collection for items that are genuinely underused instead.`;
      updatedCtx = { ...entityContext, correctionApplied: true, priorClaim: null };
    } else if (isPairing) {
      reply = `If my pairing logic assumed the wrong profile for that item, then the explanation was built on bad premises.

**Revised:** Give me the actual flavor profile or usage pattern you experience with it, and I will re-run the pairing reasoning from there.`;
      updatedCtx = { ...entityContext, correctionApplied: true, priorClaim: null };
    } else {
      // Generic correction acknowledgement
      reply = `Then I would revise that.

If my earlier conclusion does not match what you know about ${subjectName} from direct experience, then the inference was working from weak or incorrect data. First-hand knowledge overrides sparse session signals.

**What I would do:** Treat that recommendation as low-confidence and move on. What would you like to look at instead?`;
      updatedCtx = { ...entityContext, correctionApplied: true, priorClaim: null };
    }

    return { reply, updatedEntityContext: updatedCtx };
  }

  // ── FOLLOW_UP: keep prior subject ─────────────────────────────────────────
  if (intent === 'FOLLOW_UP') {
    const subjectEntity = entityContext.subject;
    if (!subjectEntity) {
      return { reply: 'Could you name the specific item you are asking about? I do not have a subject from our previous exchange.', updatedEntityContext: entityContext };
    }
    // Re-evaluate the subject in context
    const topicIntent = entityContext.topicIntent;
    const subject = subjectEntity;
    if (topicIntent === 'evaluate_owned_item') {
      let evalData;
      const ownedBottle = bottles.find((b) => b.id === subject.id || norm(b.name) === norm(subject.name));
      const ownedBlend  = blends.find((b) => b.id === subject.id || norm(b.name) === norm(subject.name));
      const ownedPipe   = pipes.find((p) => p.id === subject.id || norm(p.name) === norm(subject.name));
      if (ownedBottle) evalData = evaluateOwnedBottle(ownedBottle, bottles, tastingLogs);
      else if (ownedBlend) evalData = evaluateOwnedBlend(ownedBlend, blends, smokingLogs);
      else if (ownedPipe) evalData = evaluateOwnedPipe(ownedPipe, pipes, smokingLogs);

      if (evalData) {
        const nearby = evalData.adjacentComparables;
        const nearbyText = nearby.length > 0
          ? `The closest items in your collection are ${nearby.map((x) => x.name).join(', ')}. ${subject.name} is ${evalData.role}.`
          : `${subject.name} has no close neighbors in its lane — it stands alone.`;
        return {
          reply: `**${subject.name} — Comparison**\n\n${nearbyText}\n\n**Usage:** ${evalData.usageState}\n\n**What I would do:** ${evalData.recommendation}`,
          updatedEntityContext: entityContext,
        };
      }
    }
    return {
      reply: `I am still focused on **${subject.name}**. What specifically would you like to know — redundancy, specialization, tonight's use, or how it compares?`,
      updatedEntityContext: entityContext,
    };
  }

  // ── EVALUATE_OWNED_ITEM ────────────────────────────────────────────────────
  if (intent === 'EVALUATE_OWNED_ITEM') {
    // Try to extract item name from message
    const evalMatch = message.match(/evaluate\s+(.+?)(?:\s+(?:in|for)\s+my\s+collection|$)/i);
    const rawName = evalMatch ? evalMatch[1].trim() : null;

    let ownedBottle = rawName ? extractNamedEntity(rawName, bottles) : null;
    let ownedBlend  = !ownedBottle && rawName ? extractNamedEntity(rawName, blends) : null;
    let ownedPipe   = !ownedBottle && !ownedBlend && rawName ? extractNamedEntity(rawName, pipes) : null;
    const subject   = ownedBottle || ownedBlend || ownedPipe;

    // Also check initial entity context (from Ask Curator handoff) if message alone didn't match
    if (!subject && entityContext.subject) {
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
      const comparisonText = nearbyNames.length > 0
        ? `It sits alongside ${nearbyNames.join(' and ')} in your collection — ${evalData.role}.`
        : `It is the only ${itemLabel} of its kind in your collection — ${evalData.role}.`;

      const subjectForContext = { id: resolvedOwned.id, name: resolvedOwned.name, type: ownedBottle ? 'bottle' : ownedBlend ? 'blend' : 'pipe' };

      return {
        reply: `**${resolvedOwned.name}** already has a place in your collection.\n\n**What it does:**\n${evalData.role}.\n\n**How it compares:**\n${comparisonText}\n\n**Usage:** ${evalData.usageState}\n\n**What I would do next:**\n${resolvedOwned.name} — I would ${evalData.recommendation}.`,
        updatedEntityContext: { ...entityContext, subject: subjectForContext, topicIntent: 'evaluate_owned_item', comparisonSet: evalData.adjacentComparables },
      };
    }

    // Item not found in collection → outside recommendation mode
    const fallbackName = rawName || entityContext.subject?.name || 'that item';
    const dominantBottleType = bottles.length
      ? Object.entries(bottles.reduce((acc, b) => { const t = b.type || b.whiskey_type || 'Unknown'; acc[t] = (acc[t] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;
    const gapContext = dominantBottleType
      ? `Your shelf leans toward ${dominantBottleType}. ${fallbackName} would add contrast from a different lane.`
      : `Your collection does not yet have a strong reference point in this style.`;
    return {
      reply: `**${fallbackName}** — Not currently in your collection.\n\n${gapContext}\n\nIf this is something you are considering, add it to your Want List so Curator can factor it into future recommendations. Ask me to compare it to something you own if you want a side-by-side.`,
      updatedEntityContext: { ...entityContext, topicIntent: 'evaluate_recommendation' },
    };
  }

  // ── EVALUATE_OUTSIDE_RECOMMENDATION ────────────────────────────────────────
  if (intent === 'EVALUATE_OUTSIDE_RECOMMENDATION') {
    const evalMatch = message.match(/evaluate\s+(.+?)(?:\s+(?:for|to add to)\s+my\s+collection|$)/i);
    const rawName = evalMatch ? evalMatch[1].trim() : entityContext.subject?.name || 'that item';
    const dominantType = bottles.length
      ? Object.entries(bottles.reduce((acc, b) => { const t = b.type || b.whiskey_type || 'Unknown'; acc[t] = (acc[t] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;
    const gapLine = dominantType ? `Your shelf leans toward ${dominantType} — ${rawName} would expand beyond that lane.` : 'It would add territory your collection does not yet cover.';
    return {
      reply: `**${rawName}** — Outside Recommendation\n\n${gapLine}\n\nThis is not currently in your collection. Add it to your Want List to track it, or ask me to compare it to what you already own.`,
      updatedEntityContext: { ...entityContext, topicIntent: 'evaluate_recommendation' },
    };
  }

  // ── EXPLAIN_PAIRING ────────────────────────────────────────────────────────
  if (intent === 'EXPLAIN_PAIRING') {
    if (isSingleModuleMode) {
      return { reply: 'Pairings require at least two active modules. Ask me what to enjoy tonight instead.', updatedEntityContext: entityContext };
    }
    return pairingExplanationEngine(message, context, entityContext);
  }

  // ── SESSION_RECOMMENDATION ─────────────────────────────────────────────────
  if (intent === 'SESSION_RECOMMENDATION') {
    const whiskeyFocused = /\b(whiskey|bourbon|scotch|rye|irish|bottle|pour|dram)\b/i.test(message);
    const pipeFocused    = /\b(pipe|smoke|tobacco|blend)\b/i.test(message);
    const targetModule   = whiskeyFocused ? 'whiskey' : pipeFocused ? 'pipe' : 'any';
    const candidates = buildSessionPlan(context, activeModules, targetModule);
    if (!candidates.length) {
      return { reply: 'Not enough collection data yet to make a confident session suggestion. Log some sessions to help Curator learn your rotation.', updatedEntityContext: entityContext };
    }
    const top = candidates[0];
    const others = candidates.slice(1, 3).map((c) => c.title).filter(Boolean);
    const othersText = others.length ? ` Other strong options: ${others.join(', ')}.` : '';
    const entityKey = { bottle: 'bottle', pipe: 'pipe', blend: 'blend' }[top.itemType];
    const newCtx = entityKey ? { ...entityContext, subject: { id: top.item?.id, name: top.item?.name, type: entityKey }, topicIntent: 'recommend_session' } : entityContext;
    return { reply: `${top.reason}${othersText}`, updatedEntityContext: newCtx };
  }

  // ── RESTOCK_ADVICE ─────────────────────────────────────────────────────────
  if (intent === 'RESTOCK_ADVICE') {
    const tracked = acquisitionItems.find((i) => {
      const s = norm(i.status || i.category || '');
      return s === 'restock' || s === 'shopping_list' || s === 'wishlist';
    });
    if (tracked) {
      return { reply: `**${tracked.name}** is already tracked in your purchase workflow — I would start there.`, updatedEntityContext: entityContext };
    }
    const lowBlend = blends.find((b) => {
      const oz = typeof b.quantity_oz === 'number' ? b.quantity_oz : typeof b.total_oz === 'number' ? b.total_oz : null;
      return oz !== null && oz <= 2.0;
    });
    if (lowBlend) {
      return { reply: `**${lowBlend.name}** is the clearest restock candidate — stock looks thin and it is already part of your rotation.`, updatedEntityContext: entityContext };
    }
    return { reply: 'No critical restock signals right now. Check your Want List for items you have been tracking.', updatedEntityContext: entityContext };
  }

  // ── GAP_ANALYSIS ───────────────────────────────────────────────────────────
  if (intent === 'GAP_ANALYSIS') {
    return { reply: biggestGap(blends, bottles, activeModules), updatedEntityContext: { ...entityContext, topicIntent: 'gap_analysis' } };
  }

  // ── COLLECTION_ANALYSIS (redundancy, reassignment) ─────────────────────────
  if (intent === 'COLLECTION_ANALYSIS') {
    if (/redundant/i.test(message)) {
      const candidate = mostRedundantPipe(pipes, smokingLogs, blends);
      if (!candidate) return { reply: 'Not enough pipe and session data yet to identify redundancy. Log more sessions first.', updatedEntityContext: entityContext };
      return {
        reply: `**${candidate.name}** is the strongest redundancy candidate. It sits in a crowded ${candidate.shape || 'shape'} lane with only ${candidate.sessionCount || 0} logged sessions.`,
        updatedEntityContext: { ...entityContext, subject: { id: candidate.id, name: candidate.name, type: 'pipe' }, topicIntent: 'collection_analysis' },
      };
    }
    if (/reassign|specializ/i.test(message)) {
      const usage = buildPipeUsage(pipes, smokingLogs, blends).filter((p) => p.sessionCount >= 3);
      const candidate = usage.sort((a, b) => (b.dominantCount / (b.sessionCount || 1)) - (a.dominantCount / (a.sessionCount || 1)))[0];
      if (!candidate) return { reply: 'Not enough session history to recommend a confident reassignment.', updatedEntityContext: entityContext };
      const confidence = Math.round((candidate.dominantCount / candidate.sessionCount) * 100);
      return {
        reply: `**${candidate.name}** is the strongest reassignment candidate — ${confidence}% of its sessions point toward ${candidate.dominantFamily}.`,
        updatedEntityContext: { ...entityContext, subject: { id: candidate.id, name: candidate.name, type: 'pipe' }, topicIntent: 'collection_analysis' },
      };
    }
  }

  // ── UNKNOWN ────────────────────────────────────────────────────────────────
  return { reply: 'Could you be more specific? Ask about a particular item, a pairing, tonight\'s session, or a gap in your collection.', updatedEntityContext: entityContext };
}

// ─── Component ─────────────────────────────────────────────────────────────────
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

  // Seed entity context from Ask Curator handoff
  useEffect(() => {
    if (initialEntityContext) {
      const { id, name, type, ownershipHint, sourceSurface } = initialEntityContext;
      if (name) {
        setEntityContext((prev) => ({
          ...prev,
          subject: { id, name, type },
          topicIntent: ownershipHint === 'owned' ? 'evaluate_owned_item' : ownershipHint === 'external' ? 'evaluate_recommendation' : null,
        }));
      }
    }
  }, [initialEntityContext]);

  const starterPrompts = isSingleModuleMode ? STARTER_PROMPTS_SINGLE : STARTER_PROMPTS_MULTI;
  const canSend = useMemo(() => !!input.trim() && !isSending, [input, isSending]);

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
      const { reply, updatedEntityContext } = answerQuestion(
        text,
        collectionContext,
        entityContext,
        isSingleModuleMode,
        activeModules,
      );
      setEntityContext(updatedEntityContext);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply || 'I could not generate a response. Please try rephrasing.',
        },
      ]);
    } catch (err) {
      console.error('[Curator] answerQuestion error:', err);
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, collectionContext, entityContext, isSingleModuleMode, activeModules]);

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