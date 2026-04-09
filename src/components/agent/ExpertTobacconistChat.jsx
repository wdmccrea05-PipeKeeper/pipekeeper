import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SendHorizontal } from 'lucide-react';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner.js';

// --- Starter prompts vary by mode

const STARTER_PROMPTS_SINGLE = [
  'What should I enjoy tonight?',
  'What haven\'t I used recently?',
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

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function getBlendType(blend) {
  return blend?.blend_type || blend?.blend_family || 'Unknown';
}

function getBottleType(bottle) {
  return bottle?.type || bottle?.whiskey_type || bottle?.spirit_type || 'Unknown';
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const ts = new Date(dateValue).getTime();
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

// --- Entity resolution helpers

function detectEntityType(text) {
  if (text.includes('pipe') || text.includes('briar') || text.includes('corn cob') || text.includes('meerschaum')) return 'pipe';
  if (text.includes('blend') || text.includes('tobacco') || text.includes('mixture')) return 'blend';
  if (text.includes('bottle') || text.includes('whiskey') || text.includes('bourbon') || text.includes('scotch') || text.includes('rye') || text.includes('irish')) return 'bottle';
  if (text.includes('acquisition') || text.includes('want list') || text.includes('wishlist') || text.includes('shopping')) return 'acquisition';
  return null;
}

function isFollowUpReference(text) {
  const pronouns = /\b(it|that|this one|this pipe|that pipe|this blend|that blend|this bottle|that bottle|the one|the pipe|the blend|the bottle|how do i|how should i|what should i do with)\b/i;
  return pronouns.test(text);
}

function extractNamedEntity(text, records = []) {
  const lower = norm(text);
  for (const r of records) {
    const name = norm(r.name || '');
    if (name && lower.includes(name)) return r;
  }
  return null;
}

function emptyEntityContext() {
  return { pipe: null, blend: null, bottle: null, acquisition: null };
}

function updateEntityContext(currentContext, entityType, entityRecord) {
  if (!entityType || !entityRecord) return currentContext;
  return { ...currentContext, [entityType]: entityRecord };
}

// --- INTENT CLASSIFICATION (MANDATORY)

function classifyIntent(message) {
  const text = norm(message);

  // PAIRING_EXPLANATION: "why do these work", "explain why", "how do they work"
  if (/\b(why|explain why|why do|how do they|what makes|what's the connection)\b/i.test(text) &&
      (/\b(pair|pairing|work|together|combination)\b/i.test(text) ||
       /\b(pipe|blend|bottle|whiskey|tobacco)\b/i.test(text))) {
    return 'PAIRING_EXPLANATION';
  }

  // SESSION_RECOMMENDATION: "what should I", "build me", "tonight", "smoke", "drink"
  if (/\b(what should i|build me|tonight|enjoy|smoke|drink|open)\b/i.test(text)) {
    return 'SESSION_RECOMMENDATION';
  }

  // COLLECTION_ANALYSIS: "redundant", "overlap", "most", "crowded"
  if (/\b(redundant|overlap|most|crowded|duplicate)\b/i.test(text)) {
    return 'COLLECTION_ANALYSIS';
  }

  // RESTOCK_ADVICE: "buy", "restock", "purchase", "gap"
  if (/\b(buy|restock|purchase|next|gap)\b/i.test(text)) {
    return 'RESTOCK_ADVICE';
  }

  // FOLLOW_UP: pronoun references without action
  if (/\b(it|that|this|the one)\b/i.test(text) &&
      !/\b(why|explain|redundant|buy|restock|tonight|smoke|drink)\b/i.test(text)) {
    return 'FOLLOW_UP';
  }

  return 'UNKNOWN';
}

// --- Collection analysis helpers

function buildPipeUsage(pipes = [], smokingLogs = [], blends = []) {
  return pipes.map((pipe) => {
    const logs = smokingLogs.filter((l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id);
    const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
    const familyCounts = {};

    logs.forEach((log) => {
      const blend = blends.find((b) => b.id === (log?.blend_id || log?.blendId));
      const family = getBlendType(blend);
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    });

    const allTypes = Object.entries(familyCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      ...pipe,
      sessionCount: logs.length,
      lastSmokedDays: daysSince(last),
      allTypes,
      dominantFamily: allTypes[0]?.type || null,
      dominantCount: allTypes[0]?.count || 0,
    };
  });
}

function bestReassignment(pipes = [], smokingLogs = [], blends = []) {
  const usage = buildPipeUsage(pipes, smokingLogs, blends)
    .filter((pipe) => pipe.sessionCount >= 3 && pipe.allTypes.length >= 1)
    .map((pipe) => ({
      ...pipe,
      confidence: pipe.sessionCount ? Math.round((pipe.dominantCount / pipe.sessionCount) * 100) : 0,
      currentSpec: pipe.specialization || pipe.focus?.[0] || '',
    }))
    .filter((pipe) => pipe.confidence >= 60)
    .sort((a, b) => b.confidence - a.confidence || b.sessionCount - a.sessionCount);

  return usage[0] || null;
}

function mostRedundantPipe(pipes = [], smokingLogs = [], blends = []) {
  const usage = buildPipeUsage(pipes, smokingLogs, blends);
  if (!usage.length) return null;

  const byShape = {};
  usage.forEach((pipe) => {
    const shape = norm(pipe.shape || 'unknown');
    if (!byShape[shape]) byShape[shape] = [];
    byShape[shape].push(pipe);
  });

  const crowdedShape = Object.values(byShape)
    .filter((group) => group.length >= 2)
    .sort((a, b) => b.length - a.length)[0];

  if (!crowdedShape) return usage.sort((a, b) => (a.sessionCount - b.sessionCount))[0] || null;

  return crowdedShape
    .slice()
    .sort((a, b) => a.sessionCount - b.sessionCount || (a.lastSmokedDays || 0) - (b.lastSmokedDays || 0))[0];
}

function bestTonightPipe(pipes = [], smokingLogs = [], blends = []) {
  const usage = buildPipeUsage(pipes, smokingLogs, blends)
    .filter((p) => (p.lastSmokedDays ?? 999) >= 10)
    .sort((a, b) => (b.lastSmokedDays || 0) - (a.lastSmokedDays || 0));
  return usage[0] || pipes[0] || null;
}

function bestTonightBlend(blends = [], smokingLogs = []) {
  const enriched = blends
    .map((blend) => {
      const logs = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
      const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return {
        ...blend,
        sessionCount: logs.length,
        lastSmokedDays: daysSince(last),
      };
    })
    .sort((a, b) => (b.lastSmokedDays || 0) - (a.lastSmokedDays || 0));

  return enriched[0] || blends[0] || null;
}

function bestOpenBottle(bottles = [], tastingLogs = []) {
  const tastedIds = new Set(tastingLogs.map((l) => l?.bottle_id || l?.bottleId).filter(Boolean));
  const candidates = bottles
    .filter((b) => !tastedIds.has(b.id))
    .sort((a, b) => Number(a?.retail_price || a?.purchase_price || 0) - Number(b?.retail_price || b?.purchase_price || 0));
  return candidates[0] || bottles[0] || null;
}

function biggestGap(blends = [], bottles = [], activeModules = {}) {
  const whiskeyOnly = activeModules.whiskeykeeper !== false && activeModules.pipekeeper === false;
  const blendFamilies = new Set(blends.map((b) => getBlendType(b)).filter(Boolean));
  const bottleTypes = new Set(bottles.map((b) => getBottleType(b)).filter(Boolean));

  if (whiskeyOnly) {
    const types = [...bottleTypes].map((t) => t.toLowerCase());
    if (!types.some((t) => t.includes('rye'))) {
      return 'A rye lane looks absent from your collection. Rye whiskey adds pepper, grip, and spice that bourbon and Scotch handle differently — it is one of the most practical gaps to close.';
    }
    if (!types.some((t) => t.includes('scotch') || t.includes('single malt') || t.includes('islay') || t.includes('speyside') || t.includes('highland'))) {
      return 'Your collection looks light on Scotch. Scotch brings smoke, fruit, and complexity that no American whiskey replicates — adding even one Speyside or Islay expression opens entirely different territory.';
    }
    if (!types.some((t) => t.includes('irish'))) {
      return 'Irish whiskey is a gap worth noting. It is the most approachable style for guests and provides a light, clean pour that stands apart from bourbon, rye, and Scotch in a session context.';
    }
    if (!types.some((t) => t.includes('bourbon'))) {
      return 'A bourbon is missing from the collection. Bourbon is the reference point that most other American whiskey styles are compared against — it anchors the tasting range.';
    }
    if (bottles.length < 3) {
      return 'Your collection is still small enough that the most valuable gap to close is simply volume: three to five bottles across at least two different styles gives Curator enough to work with for session planning.';
    }
    return 'Your next gap is probably not style but depth: getting tasting notes on every bottle and pricing data on at least your highest-value pours. That turns a collection into an actual reference.';
  }

  if (!blendFamilies.has('Virginia/Burley')) {
    return 'A practical Virginia/Burley lane looks thin or absent. That matters because it gives you a dependable middle ground between brighter Virginia sweetness and drier Burley structure.';
  }
  if (!blendFamilies.has('English/Balkan') && !blendFamilies.has('English') && !blendFamilies.has('Balkan')) {
    return 'Your cellar appears light on English/Balkan territory. That leaves a real gap in smoky, savory session options and limits deeper pairing opportunities with Scotch and peated pours.';
  }
  if (![...bottleTypes].some((t) => norm(t).includes('rye'))) {
    return 'A clear rye lane appears to be missing. Rye adds pepper, grip, and contrast pairings that bourbon and Irish whiskey do not handle the same way.';
  }
  return 'Your next important gap is probably not quantity but specialization: getting each pipe and each blend family into a cleaner lane so the collection becomes easier to use, not just larger.';
}

// --- PAIRING EXPLANATION ENGINE (CRITICAL FIX)

function pairingExplanationEngine(message, context = {}, entityContext = {}) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];

  // Extract named items from message
  let pipe = extractNamedEntity(norm(message), pipes) || entityContext.pipe;
  let blend = extractNamedEntity(norm(message), blends) || entityContext.blend;
  let bottle = extractNamedEntity(norm(message), bottles) || entityContext.bottle;

  // If not named, use best candidates
  if (!pipe || !blend || !bottle) {
    pipe = pipe || bestTonightPipe(pipes, context?.smokingLogs || [], blends);
    blend = blend || bestTonightBlend(blends, context?.smokingLogs || []);
    bottle = bottle || bestOpenBottle(bottles, context?.tastingLogs || []);
  }

  if (!pipe || !blend || !bottle) {
    return {
      reply: 'A pairing explanation works best when I can point to one specific pipe, one specific blend, and one specific pour. Either name the three items you want me to explain, or log more collection data so I can suggest a strong pairing.',
      updatedEntityContext: entityContext,
    };
  }

  const blendType = getBlendType(blend);
  const bottleType = getBottleType(bottle);

  // Build structured explanation based on actual interaction
  let whyItWorks = '';
  let whatToExpect = '';

  if ((blendType.includes('English') || blendType.includes('Balkan')) && bottleType.toLowerCase().includes('peated')) {
    whyItWorks = `Smoke doubles down on smoke. ${blendType} tobacco's dark layers meet ${bottleType}'s phenolic depth -- they reinforce each other rather than compete.`;
    whatToExpect = 'A deep, meditative session. The smoke will linger across both bowl and dram. Do not rush this one.';
  } else if (blendType.includes('Aromatic') && bottleType.toLowerCase().includes('irish')) {
    whyItWorks = `${bottleType}'s clean grain cuts through ${blendType} topping sweetness right before it becomes cloying. Each pour resets the palate.`;
    whatToExpect = 'A lighter session. The whiskey becomes a palate bridge, not a statement. This is about subtlety.';
  } else if ((blendType.includes('Burley') || blendType.includes('Virginia/Burley')) && bottleType.toLowerCase().includes('bourbon')) {
    whyItWorks = `${blendType} earth and ${bottleType} caramel settle into each other without competition. Both finish warm without fighting for attention.`;
    whatToExpect = 'Comfort. The kind of session where both settle into their best selves without requiring your full concentration.';
  } else if (blendType.includes('Virginia/Perique') && bottleType.toLowerCase().includes('rye')) {
    whyItWorks = "Perique's peppery snap finds its match in rye's bite. Together they open new texture in each other -- neither one flattens.";
    whatToExpect = 'A session with real edges. The tobacco and whiskey keep each other sharp. Not soft, but rewarding.';
  } else if ((blendType.includes('Virginia') || blendType.includes('Virginia/Oriental')) && (bottleType.toLowerCase().includes('highland') || bottleType.toLowerCase().includes('speyside'))) {
    whyItWorks = `${blendType} bright fruit meets ${bottleType}'s middle palate without either fading. Balance rather than boldness.`;
    whatToExpect = 'A brighter session. Natural leaf sweetness stays front-and-center, with the whiskey providing subtle texture.';
  } else {
    whyItWorks = `${blendType} and ${bottleType} maintain their identity together. Neither dominates, neither retreats.`;
    whatToExpect = 'A balanced session where both elements keep their voice.';
  }

  const reply = `**${pipe.name}, ${blend.name}, and ${bottle.name}**\n\nWhy it works:\n${whyItWorks}\n\n${pipe.name} matters because the chamber geometry and heat control determine whether the bowl stays focused or gets muddy. A well-rested pipe in this context lets both the tobacco character and whiskey finish stay clear.\n\nWhat to expect:\n${whatToExpect}\n\nWhen to use it:\nThis pairing rewards sitting down with time. Both tobacco and spirit give back attention in proportion to the attention you give them.`;

  return {
    reply,
    updatedEntityContext: { ...entityContext, pipe, blend, bottle },
  };
}

// --- Answer generation

/**
 * RULE 6: Module gating enforced globally
 * RULE 7: Intent-based routing with switch statement
 * RULE 9: Debug logging on every response
 */
function answerQuestion(message, context = {}, entityContext = emptyEntityContext(), isSingleModuleMode = false, activeModules = {}) {
  const text = norm(message);
  const intent = classifyIntent(message);

  // RULE 6: Hard module gating — prevent cross-module leakage
  const pipeActive    = activeModules.pipekeeper    !== false;
  const tobaccoActive = activeModules.tobacco       !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;
  const whiskeyOnly   = whiskeyActive && !pipeActive && !tobaccoActive;

  const pipes       = pipeActive    ? (context?.pipes        || []) : [];
  const blends      = tobaccoActive ? (context?.blends       || []) : [];
  const smokingLogs = pipeActive    ? (context?.smokingLogs  || []) : [];
  const bottles     = whiskeyActive ? (context?.bottles      || []) : [];
  const tastingLogs = whiskeyActive ? (context?.tastingLogs  || []) : [];

  // RULE 6: Enforce whiskey-only mode data integrity
  if (whiskeyOnly && (pipes.length > 0 || blends.length > 0)) {
    console.error('INVALID_CONTEXT', { reason: 'non_whiskey_data_in_whiskey_only_mode', modules: activeModules });
    return {
      reply: 'Error: Invalid collection context for WhiskeyKeeper. Please contact support.',
      updatedEntityContext: entityContext,
    };
  }
  const acquisitionItems = context?.acquisitionItems || context?.wantListItems || [];

  // CRITICAL: Enforce intent matching
  if (intent === 'PAIRING_EXPLANATION') {
    if (isSingleModuleMode) {
      return {
        reply: 'Pairings require both PipeKeeper and WhiskeyKeeper. Right now Curator is running in single-module mode. To plan tonight\'s session instead, ask me what to enjoy tonight.',
        updatedEntityContext: entityContext,
      };
    }
    return pairingExplanationEngine(message, context, entityContext);
  }

  if (isPairingIntent(text)) {
    if (isSingleModuleMode) {
      return {
        reply: 'Pairings require multiple active modules. Right now Curator is running in single-module mode. To plan tonight\'s session instead, ask me what to enjoy tonight or what hasn\'t been used recently.',
        updatedEntityContext: entityContext,
      };
    }
    return pairingExplanationEngine(message, context, entityContext);
  }

  if (isSessionIntent(text) && !isPairingIntent(text)) {
    const whiskeyFocused = /\b(whiskey|bourbon|scotch|rye|irish|bottle|pour|dram)\b/i.test(text);
    const pipeFocused    = /\b(pipe|smoke|tobacco|blend)\b/i.test(text);
    const targetModule   = whiskeyFocused ? 'whiskey' : pipeFocused ? 'pipe' : 'any';

    const candidates = buildSessionPlan(context, activeModules, targetModule);
    if (!candidates.length) {
      return {
        reply: 'I do not have enough collection data yet to make a confident session suggestion. Log some sessions or add records to help Curator learn your rotation.',
        updatedEntityContext: entityContext,
      };
    }

    const top = candidates[0];
    const others = candidates.slice(1, 3).map((c) => c.title).filter(Boolean);
    const othersText = others.length ? ` Other strong options tonight: ${others.join(', ')}.` : '';

    const entityKey = { bottle: 'bottle', pipe: 'pipe', blend: 'blend' }[top.itemType];
    const updatedCtx = entityKey ? { ...entityContext, [entityKey]: top.item } : entityContext;

    return {
      reply: `${top.reason}${othersText}`,
      updatedEntityContext: updatedCtx,
    };
  }

  const followUp = isFollowUpReference(text);
  let resolvedPipe    = entityContext.pipe;
  let resolvedBlend   = entityContext.blend;
  let resolvedBottle  = entityContext.bottle;

  if (!followUp) {
    const namedPipe   = extractNamedEntity(text, pipes);
    const namedBlend  = extractNamedEntity(text, blends);
    const namedBottle = extractNamedEntity(text, bottles);
    if (namedPipe)   resolvedPipe   = namedPipe;
    if (namedBlend)  resolvedBlend  = namedBlend;
    if (namedBottle) resolvedBottle = namedBottle;
  }

  if (text.includes('reassign') || text.includes('specializ')) {
    if (followUp && resolvedPipe) {
      const usage = buildPipeUsage([resolvedPipe], smokingLogs, blends);
      const pipe = usage[0];
      if (!pipe) {
        return {
          reply: `I do not have enough session history for ${resolvedPipe.name} to recommend a confident reassignment yet.`,
          updatedEntityContext: { ...entityContext, pipe: resolvedPipe },
        };
      }
      const dominantFamily = pipe.dominantFamily || 'an undetermined family';
      const confidence = pipe.sessionCount ? Math.round((pipe.dominantCount / pipe.sessionCount) * 100) : 0;
      return {
        reply: `${pipe.name} shows the strongest lean toward ${dominantFamily} — about ${confidence}% of its sessions point that direction. Reassigning it as a ${dominantFamily} specialist would put that pattern to work intentionally.`,
        updatedEntityContext: { ...entityContext, pipe: resolvedPipe },
      };
    }

    const candidate = bestReassignment(pipes, smokingLogs, blends);
    if (!candidate) {
      return {
        reply: 'I do not yet have enough reliable session evidence to recommend a confident reassignment. For a real reassignment, I want to see repeated usage pointing toward one dominant family.',
        updatedEntityContext: entityContext,
      };
    }
    return {
      reply: `${candidate.name} is the strongest reassignment candidate right now. Its logged usage leans most heavily toward ${candidate.dominantFamily}, with about ${candidate.confidence}% of its sessions pointing that way.`,
      updatedEntityContext: { ...entityContext, pipe: candidate },
    };
  }

  if (text.includes('redundant')) {
    if (whiskeyOnly) {
      const typeCounts = {};
      for (const b of bottles) {
        const t = (b.type || b.whiskey_type || '').trim();
        if (t) typeCounts[t] = (typeCounts[t] || 0) + 1;
      }
      const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
      if (!sorted.length || bottles.length < 2) {
        return {
          reply: 'You need at least 2 bottles with spirit type filled in to analyze whiskey type redundancy.',
          updatedEntityContext: entityContext,
        };
      }
      const [topType, topCount] = sorted[0];
      const pct = Math.round((topCount / bottles.length) * 100);
      return {
        reply: `${topType} is your most concentrated style — ${topCount} of your ${bottles.length} bottles (${pct}%) fall in that lane. Adding a style outside that lane would give you more contrast.`,
        updatedEntityContext: entityContext,
      };
    }
    const candidate = mostRedundantPipe(pipes, smokingLogs, blends);
    if (!candidate) {
      return {
        reply: 'I do not have enough pipe and session evidence yet to call a pipe redundant. Once more sessions are logged I can rank which shapes or roles overlap the most.',
        updatedEntityContext: entityContext,
      };
    }
    const shape = candidate.shape || 'that shape lane';
    return {
      reply: `${candidate.name} is the strongest redundancy candidate right now. It sits in an already crowded ${shape} lane with only ${candidate.sessionCount || 0} logged sessions. It is the pipe I would scrutinize first for reassignment.`,
      updatedEntityContext: { ...entityContext, pipe: candidate },
    };
  }

  if (text.includes('smoke tonight') || text.includes('drink tonight')) {
    const whiskeyFocusedTonight = text.includes('drink tonight') || (activeModules.whiskeykeeper !== false && activeModules.pipekeeper === false);
    if (whiskeyFocusedTonight) {
      const bottle = bestOpenBottle(bottles, tastingLogs);
      if (!bottle) {
        return {
          reply: 'I do not have enough bottle data to make a confident pour recommendation tonight. Add a few bottles and log at least one tasting.',
          updatedEntityContext: entityContext,
        };
      }
      return {
        reply: `Tonight I would open ${bottle.name}. It is the strongest opening candidate — either it has not been tasted yet or it has been sitting long enough to be worth revisiting.`,
        updatedEntityContext: { ...entityContext, bottle },
      };
    }
    const pipe  = bestTonightPipe(pipes, smokingLogs, blends);
    const blend = bestTonightBlend(blends, smokingLogs);
    if (!pipe || !blend) {
      return {
        reply: 'I do not have enough usable session history yet to make a meaningful tonight recommendation. Log a few sessions to help.',
        updatedEntityContext: entityContext,
      };
    }
    return {
      reply: `Tonight I would start with ${pipe.name} and ${blend.name}. ${pipe.name} looks underused enough to deserve attention, and ${blend.name} appears due for a revisit.`,
      updatedEntityContext: { ...entityContext, pipe, blend },
    };
  }

  if (text.includes('open next')) {
    const bottle = bestOpenBottle(bottles, tastingLogs);
    if (!bottle) {
      return {
        reply: 'I do not have enough bottle data to make a sound opening recommendation.',
        updatedEntityContext: entityContext,
      };
    }
    return {
      reply: `${bottle.name} is the safest open-next candidate from a collection-management standpoint. It gives you more tasting data without using up one of the harder-to-replace pours first.`,
      updatedEntityContext: { ...entityContext, bottle },
    };
  }

  if ((text.includes('buy') || text.includes('restock')) && (text.includes('next') || text.includes('should'))) {
    const resolveItemCategory = (i) => {
      const s = norm(i.status || '');
      const c = norm(i.category || i.list_type || '');
      if (s === 'archived') return 'archived';
      if (s === 'active') return c === 'want_list' ? 'wishlist' : (c || 'wishlist');
      if (s === 'want_list') return 'wishlist';
      return s || (c === 'want_list' ? 'wishlist' : c) || 'wishlist';
    };
    const tracked = acquisitionItems.find((i) => ['restock', 'shopping_list', 'wishlist'].includes(resolveItemCategory(i)));
    if (tracked) {
      return {
        reply: `${tracked.name} is already explicitly tracked in your purchase workflow, so I would start there.`,
        updatedEntityContext: { ...entityContext, acquisition: tracked },
      };
    }
    const lowBlend = blends.find((b) => Number(b.quantity_oz || b.total_oz || 0) <= 1);
    if (lowBlend) {
      return {
        reply: `${lowBlend.name} is the clearest next purchase candidate because stock looks thin and it already matters in your rotation.`,
        updatedEntityContext: { ...entityContext, blend: lowBlend },
      };
    }
    return {
      reply: 'The best next purchase is the item that closes the largest active gap or restores a proven favorite. I need either low-stock data or tracked want-list data to rank that confidently.',
      updatedEntityContext: entityContext,
    };
  }

  if (text.includes('gap')) {
    return {
      reply: biggestGap(blends, bottles, activeModules),
      updatedEntityContext: entityContext,
    };
  }

  if (followUp) {
    const subject = resolvedPipe || resolvedBlend || resolvedBottle;
    if (!subject) {
      return {
        reply: 'I am not sure which item you are referring to. Could you name the specific pipe, blend, or bottle you have in mind?',
        updatedEntityContext: entityContext,
      };
    }
    const subjectType = resolvedPipe === subject ? 'pipe' : resolvedBlend === subject ? 'blend' : 'bottle';
    return {
      reply: `If you are asking about ${subject.name}: it is currently tracked in your ${subjectType} collection. What specifically would you like to know — redundancy, reassignment, tonight's use, or something else?`,
      updatedEntityContext: entityContext,
    };
  }

  // RULE 9: Log curator decision
  console.log('CURATOR_DECISION', {
    intent,
    modules: activeModules,
    dataCounts: { pipes: pipes.length, blends: blends.length, bottles: bottles.length },
    engineUsed: 'answerQuestion',
  });

  return {
    reply: 'I did not quite understand. Could you ask more specifically about your collection, pairings, sessions, or gaps?',
    updatedEntityContext: entityContext,
  };
}

function handleGapIntent(pipes, blends, bottles, whiskeyOnlyMode, entityContext, activeModules) {
  if (whiskeyOnlyMode && bottles.length === 0) {
    return {
      reply: 'Your whiskey collection is empty. Start by adding bottles to your collection, then I can help identify gaps.',
      updatedEntityContext: entityContext,
    };
  }

  // Identify collection gaps based on what's missing
  const ownedBlendTypes = new Set(blends.map(b => b.blend_type || b.blend_family).filter(Boolean));
  const ownedWhiskeyTypes = new Set(bottles.map(b => b.type || b.whiskey_type).filter(Boolean));
  const ownedPipeShapes = new Set(pipes.map(p => p.shape).filter(Boolean));

  const gaps = [];
  if (!whiskeyOnlyMode && ownedBlendTypes.size < 3) gaps.push('Your tobacco collection would benefit from exploring more blend families (Virginia, English, Aromatic, etc.).');
  if (!whiskeyOnlyMode && ownedWhiskeyTypes.size < 2) gaps.push('Your whiskey collection is narrow — consider adding different types (Bourbon, Rye, Scotch) for better pairing options.');
  if (!whiskeyOnlyMode && ownedPipeShapes.size < 2) gaps.push('Your pipe collection lacks shape diversity — different shapes smoke differently.');

  if (gaps.length === 0) {
    return { reply: 'Your collection appears well-balanced across categories.', updatedEntityContext: entityContext };
  }

  // RULE 9: Log gap analysis
  console.log('CURATOR_DECISION', {
    intent: 'gap_analysis',
    modules: activeModules,
    dataCounts: { pipes: pipes.length, blends: blends.length, bottles: bottles.length },
    engineUsed: 'gap_analyzer',
    gapsIdentified: gaps.length,
  });

  return { reply: gaps.join(' '), updatedEntityContext: entityContext };
}

function handleSessionIntent(bottles, blends, tastingLogs, whiskeyOnlyMode, entityContext) {
  if (bottles.length === 0 && !whiskeyOnlyMode) {
    return {
      reply: 'You don't have any bottles in your collection yet. Start by adding whiskey, and I can recommend pairings with your pipes and tobacco.',
      updatedEntityContext: entityContext,
    };
  }

  if (bottles.length > 0) {
    const bottle = bestOpenBottle(bottles, tastingLogs);
    if (bottle) {
      return {
        reply: `${bottle.name} is a strong candidate for tonight. Ask me to explain why it pairs with specific pipes or blends, or what to stock up on.`,
        updatedEntityContext: { ...entityContext, bottle },
      };
    }
  }

  return {
    reply: 'Ask me which bottle to open next, what to buy, or to explain a specific pairing.',
    updatedEntityContext: entityContext,
  };
}

function isPairingIntent(text) {
  return /\bpairing|pair with|pair together|combine|combination\b/i.test(text);
}

function isSessionIntent(text) {
  return /\b(tonight|enjoy|smoke|drink|use|open|revisit|rediscover|haven.?t used|haven.?t had)\b/i.test(text);
}

export default function ExpertTobacconistChat({ preFillMessage, onPreFillConsumed, collectionContext, isSingleModuleMode = false, activeModules = {} }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [entityContext, setEntityContext] = useState(emptyEntityContext);

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
      const { reply, updatedEntityContext } = answerQuestion(text, collectionContext, entityContext, isSingleModuleMode, activeModules);
      setEntityContext(updatedEntityContext);
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: reply }]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, collectionContext, entityContext, isSingleModuleMode, activeModules]);

  return (
    <div className="rounded-[18px] p-8" style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(140,105,65,0.16)' }}>
      <h3 className="text-[20px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>Curator Console</h3>
      <p className="text-[16px] mb-6" style={{ color: '#A1A1AA' }}>Ask about your collection, pairings, or what to smoke tonight.</p>
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
                <div className="text-[16px] leading-8" style={{ color: '#F5F5F7' }}>{m.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-3 items-center">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canSend) sendMessage(); }} placeholder="Ask about pipes, blends, pairings, aging, value, redundancy..." className="flex-1 h-14 px-5 rounded-[14px] outline-none bg-transparent" style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#F5F5F7' }} />
        <button type="button" disabled={!canSend} onClick={sendMessage} className="h-14 px-6 rounded-[14px] inline-flex items-center gap-2 font-medium" style={{ background: '#C6A15B', color: '#0B0B0C', opacity: canSend ? 1 : 0.6 }}>
          <SendHorizontal className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}