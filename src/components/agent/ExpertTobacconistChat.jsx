import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SendHorizontal } from 'lucide-react';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner.js';

// ─── Starter prompts vary by mode ─────────────────────────────────────────────

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

// ─── Entity resolution helpers ────────────────────────────────────────────────

/**
 * Extract the entity type referenced in the user's message.
 * Returns null if no clear entity type is mentioned.
 */
function detectEntityType(text) {
  if (text.includes('pipe') || text.includes('briar') || text.includes('corn cob') || text.includes('meerschaum')) return 'pipe';
  if (text.includes('blend') || text.includes('tobacco') || text.includes('mixture')) return 'blend';
  if (text.includes('bottle') || text.includes('whiskey') || text.includes('bourbon') || text.includes('scotch') || text.includes('rye') || text.includes('irish')) return 'bottle';
  if (text.includes('acquisition') || text.includes('want list') || text.includes('wishlist') || text.includes('shopping')) return 'acquisition';
  return null;
}

/**
 * Returns true when the message is a follow-up referencing a prior entity
 * (uses pronouns like "it", "that", "this", "the one", etc.) without naming a
 * new entity.
 */
function isFollowUpReference(text) {
  const pronouns = /\b(it|that|this one|this pipe|that pipe|this blend|that blend|this bottle|that bottle|the one|the pipe|the blend|the bottle|how do i|how should i|what should i do with)\b/i;
  return pronouns.test(text);
}

/**
 * Extract a named entity from the message against a list of known records.
 * Returns the first record whose name appears (case-insensitive) in the message.
 */
function extractNamedEntity(text, records = []) {
  const lower = norm(text);
  for (const r of records) {
    const name = norm(r.name || '');
    if (name && lower.includes(name)) return r;
  }
  return null;
}

/**
 * Build a fresh empty entity context for a new conversation session.
 */
function emptyEntityContext() {
  return { pipe: null, blend: null, bottle: null, acquisition: null };
}

/**
 * Update the entity tracking context after a message is processed.
 * Looks at which entity was discussed in the assistant's reply and returns updated context.
 */
function updateEntityContext(currentContext, entityType, entityRecord) {
  if (!entityType || !entityRecord) return currentContext;
  return { ...currentContext, [entityType]: entityRecord };
}

// ─── Intent detection ─────────────────────────────────────────────────────────

/**
 * Returns true when the message is explicitly asking for a PAIRING (cross-module).
 * Returns false for single-module session questions.
 */
function isPairingIntent(text) {
  return /\bpairing|pair with|pair together|combine|combination\b/i.test(text);
}

/**
 * Returns true when the message is a session planning question (what to enjoy/use).
 */
function isSessionIntent(text) {
  return /\b(tonight|enjoy|smoke|drink|use|open|revisit|rediscover|haven.?t used|haven.?t had)\b/i.test(text);
}

// ─── Collection analysis helpers ─────────────────────────────────────────────

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

function biggestGap(blends = [], bottles = []) {
  const blendFamilies = new Set(blends.map((b) => getBlendType(b)).filter(Boolean));
  const bottleTypes = new Set(bottles.map((b) => getBottleType(b)).filter(Boolean));

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

function pairingExplanation(context = {}) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];

  const pipe = bestTonightPipe(pipes, smokingLogs, blends);
  const blend = bestTonightBlend(blends, smokingLogs);
  const bottle = bestOpenBottle(bottles, context?.tastingLogs || []);

  if (!pipe || !blend || !bottle) {
    return 'A pairing explanation works best when I can point to one specific pipe, one specific blend, and one specific pour. Right now I do not have enough reliable candidates across all three.';
  }

  return `${pipe.name}, ${blend.name}, and ${bottle.name} make sense together because ${blend.name} brings ${getBlendType(blend)} character while ${bottle.name} contributes ${getBottleType(bottle)} structure. ${pipe.name} matters because the pipe itself controls whether that bowl stays focused or gets muddy.`;
}

// ─── Answer generation ────────────────────────────────────────────────────────

/**
 * Generate a reply to the user's message, grounded in the collection context
 * and the current session entity context (for follow-up resolution).
 *
 * @param {string} message            - The user's current message
 * @param {object} context            - Collection data: pipes, blends, bottles, logs, etc.
 * @param {object} entityContext      - Session entity tracking: { pipe, blend, bottle, acquisition }
 * @param {boolean} isSingleModuleMode - When true, prioritize session planning over pairings
 * @param {object} activeModules      - Enabled module map
 * @returns {{ reply: string, updatedEntityContext: object }}
 */
function answerQuestion(message, context = {}, entityContext = emptyEntityContext(), isSingleModuleMode = false, activeModules = {}) {
  const text = norm(message);
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];
  const tastingLogs = context?.tastingLogs || [];
  const acquisitionItems = context?.acquisitionItems || context?.wantListItems || [];

  // ── Detect intent first — pairing vs session ──────────────────────────────
  // In single-module mode, pairing questions are redirected to session planning.
  // In multi-module mode, explicit pairing intent uses pairing logic.
  if (isPairingIntent(text)) {
    if (isSingleModuleMode) {
      return {
        reply: 'Pairings require multiple active modules. Right now Curator is running in single-module mode. To plan tonight\'s session instead, ask me what to enjoy tonight or what hasn\'t been used recently.',
        updatedEntityContext: entityContext,
      };
    }
    // Multi-module pairing → fall through to pairing handler below
  }

  // ── Session planning: "enjoy tonight", "haven't used", "revisit", etc. ───
  if (isSessionIntent(text) && !isPairingIntent(text)) {
    // Determine target module from message
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

  // ── Resolve referenced entity from prior context if this is a follow-up ───
  const followUp = isFollowUpReference(text);
  const explicitEntityType = detectEntityType(text);

  // When the message refers to a previously discussed entity ("it", "that pipe", etc.)
  // and doesn't name a new one, resolve to the last known entity of that type.
  let resolvedPipe    = entityContext.pipe;
  let resolvedBlend   = entityContext.blend;
  let resolvedBottle  = entityContext.bottle;

  if (!followUp) {
    // Fresh question: try to identify a named entity in the message
    const namedPipe   = extractNamedEntity(text, pipes);
    const namedBlend  = extractNamedEntity(text, blends);
    const namedBottle = extractNamedEntity(text, bottles);
    if (namedPipe)   resolvedPipe   = namedPipe;
    if (namedBlend)  resolvedBlend  = namedBlend;
    if (namedBottle) resolvedBottle = namedBottle;
  }

  // ── Handle reassignment / specialization (pipe-focused) ──────────────────
  if (text.includes('reassign') || text.includes('specializ')) {
    // If follow-up referencing a recently discussed pipe, answer about that pipe
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
        reply: `${pipe.name} shows the strongest lean toward ${dominantFamily} — about ${confidence}% of its sessions point that direction. Reassigning it as a ${dominantFamily} specialist would put that pattern to work intentionally rather than letting it happen by accident.`,
        updatedEntityContext: { ...entityContext, pipe: resolvedPipe },
      };
    }

    const candidate = bestReassignment(pipes, smokingLogs, blends);
    if (!candidate) {
      return {
        reply: 'I do not yet have enough reliable session evidence to recommend a confident reassignment. For a real reassignment, I want to see repeated usage pointing toward one dominant family instead of just one or two scattered sessions.',
        updatedEntityContext: entityContext,
      };
    }
    return {
      reply: `${candidate.name} is the strongest reassignment candidate right now. Its logged usage leans most heavily toward ${candidate.dominantFamily}, with about ${candidate.confidence}% of its sessions pointing that way. That suggests it would serve the collection better as a ${candidate.dominantFamily} specialist than as ${candidate.currentSpec || 'an unassigned pipe'}.`,
      updatedEntityContext: { ...entityContext, pipe: candidate },
    };
  }

  // ── Handle redundancy question (pipe-focused) ─────────────────────────────
  if (text.includes('redundant')) {
    const candidate = mostRedundantPipe(pipes, smokingLogs, blends);
    if (!candidate) {
      return {
        reply: 'I do not have enough pipe and session evidence yet to call a pipe redundant. Once more sessions are logged I can rank which shapes or roles overlap the most.',
        updatedEntityContext: entityContext,
      };
    }
    const shape = candidate.shape || 'that shape lane';
    return {
      reply: `${candidate.name} is the strongest redundancy candidate right now. It sits in an already crowded ${shape} lane and has only ${candidate.sessionCount || 0} logged sessions${candidate.lastSmokedDays ? `, with about ${candidate.lastSmokedDays} days since it was last used` : ''}. That does not mean sell it, but it is the pipe I would scrutinize first for reassignment or reduced priority in the rotation.`,
      updatedEntityContext: { ...entityContext, pipe: candidate },
    };
  }

  // ── Tonight recommendation ────────────────────────────────────────────────
  if (text.includes('smoke tonight')) {
    const pipe  = bestTonightPipe(pipes, smokingLogs, blends);
    const blend = bestTonightBlend(blends, smokingLogs);
    if (!pipe || !blend) {
      return {
        reply: 'I do not have enough usable session history yet to make a meaningful tonight recommendation. The fastest way to improve this is to log a few sessions with your active pipes and cellar blends.',
        updatedEntityContext: entityContext,
      };
    }
    return {
      reply: `Tonight I would start with ${pipe.name} and ${blend.name}. ${pipe.name} looks underused enough to deserve attention, and ${blend.name} appears due for a revisit without being a reckless choice.`,
      updatedEntityContext: { ...entityContext, pipe, blend },
    };
  }

  // ── Open next bottle ──────────────────────────────────────────────────────
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

  // ── Purchase / restock ────────────────────────────────────────────────────
  if ((text.includes('buy') || text.includes('restock')) && (text.includes('next') || text.includes('should'))) {
    const tracked = acquisitionItems.find((i) => ['restock', 'shopping_list', 'wishlist'].includes(norm(i.status || i.category || i.list_type)));
    if (tracked) {
      return {
        reply: `${tracked.name} is already explicitly tracked in your purchase workflow, so I would start there. Curator should honor items you have already marked for shopping or restock before inventing a new target.`,
        updatedEntityContext: { ...entityContext, acquisition: tracked },
      };
    }
    const lowBlend = blends.find((b) => Number(b.quantity_oz || b.total_oz || 0) <= 1);
    if (lowBlend) {
      return {
        reply: `${lowBlend.name} is the clearest next purchase candidate because stock looks thin and it already matters inside your rotation.`,
        updatedEntityContext: { ...entityContext, blend: lowBlend },
      };
    }
    return {
      reply: 'The best next purchase is the item that closes the largest active gap or restores a proven favorite. Right now I need either low-stock data or tracked want-list data to rank that confidently.',
      updatedEntityContext: entityContext,
    };
  }

  // ── Gap analysis ──────────────────────────────────────────────────────────
  if (text.includes('gap')) {
    return {
      reply: biggestGap(blends, bottles),
      updatedEntityContext: entityContext,
    };
  }

  // ── Pairing explanation ───────────────────────────────────────────────────
  if (text.includes('pairing')) {
    return {
      reply: pairingExplanation(context),
      updatedEntityContext: entityContext,
    };
  }

  // ── Follow-up about a known entity without a specific action ─────────────
  if (followUp) {
    const subject = resolvedPipe || resolvedBlend || resolvedBottle;
    if (!subject) {
      return {
        reply: 'I am not sure which item you are referring to. Could you name the specific pipe, blend, or bottle you have in mind?',
        updatedEntityContext: entityContext,
      };
    }
    // Generic follow-up about the last discussed entity
    const subjectType = resolvedPipe === subject ? 'pipe' : resolvedBlend === subject ? 'blend' : 'bottle';
    return {
      reply: `If you are asking about ${subject.name}: it is currently tracked in your ${subjectType} collection. What specifically would you like to know — redundancy, reassignment, tonight's use, or something else?`,
      updatedEntityContext: entityContext,
    };
  }

  return {
    reply: 'Ask me which pipe is most redundant, which one should be reassigned, what to smoke tonight, what to buy or restock next, or what the biggest gap is. I will answer from the current collection rather than generic hobby advice.',
    updatedEntityContext: entityContext,
  };
}

export default function ExpertTobacconistChat({ preFillMessage, onPreFillConsumed, collectionContext, isSingleModuleMode = false, activeModules = {} }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  // Session-scoped entity context for follow-up resolution
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
