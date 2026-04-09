import React, { useEffect, useMemo, useState } from 'react';
import { SendHorizontal } from 'lucide-react';

const STARTER_PROMPTS = [
  'Which pipe in my collection should be reassigned to a different specialty?',
  'What should I smoke tonight?',
  'What should I open next?',
  'What gap matters most in my collection?',
  'Why does this pairing work?',
  'What should I buy or restock next?',
];

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function getBlendType(blend) {
  return blend?.blend_type || blend?.blend_family || '';
}

function getPipeSpec(pipe) {
  return String(pipe?.specialization || '').trim();
}

function getBottleType(bottle) {
  return bottle?.type || bottle?.whiskey_type || bottle?.spirit_type || '';
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const t = new Date(dateValue).getTime();
  if (!t) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function buildBlendUsage(blends = [], smokingLogs = []) {
  return blends.map((blend) => {
    const logs = smokingLogs.filter(
      (l) => l?.blend_id === blend.id || l?.blendId === blend.id
    );

    const last = logs
      .map((l) => new Date(l?.date || l?.created_date || 0).getTime())
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    return {
      ...blend,
      sessionCount: logs.length,
      lastSmokedDays: last ? Math.floor((Date.now() - last) / 86400000) : null,
    };
  });
}

function buildPipeUsage(pipes = [], smokingLogs = []) {
  return pipes.map((pipe) => {
    const logs = smokingLogs.filter(
      (l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id
    );

    const last = logs
      .map((l) => new Date(l?.date || l?.created_date || 0).getTime())
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    const blendTypes = logs
      .map((l) => l?.blend_type || l?.blendType || l?.logged_blend_type || '')
      .filter(Boolean);

    return {
      ...pipe,
      sessionCount: logs.length,
      lastSmokedDays: last ? Math.floor((Date.now() - last) / 86400000) : null,
      loggedBlendTypes: blendTypes,
    };
  });
}

function dominantBlendFamily(blendTypes = []) {
  if (!blendTypes.length) return '';
  const counts = {};
  for (const type of blendTypes) {
    counts[type] = (counts[type] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function classifySpecFromBlendFamily(family) {
  const f = norm(family);
  if (!f) return '';
  if (f.includes('aromatic') || f.includes('danish')) return 'Aromatic';
  if (f.includes('english') || f.includes('balkan')) return 'English/Balkan';
  if (f.includes('virginia/perique') || f.includes('vap')) return 'Virginia/Perique';
  if (f.includes('virginia/burley')) return 'Virginia/Burley';
  if (f.includes('virginia')) return 'Virginia';
  if (f.includes('burley')) return 'Burley';
  if (f.includes('oriental')) return 'Oriental';
  return '';
}

function describeBottleProfile(type) {
  const t = norm(type);
  if (t.includes('bourbon')) return 'corn sweetness, vanilla oak, and rounded warmth';
  if (t.includes('rye')) return 'pepper, dry spice, and a firmer finish';
  if (t.includes('irish')) return 'lighter grain sweetness and a cleaner frame';
  if (t.includes('peated') || t.includes('islay')) return 'smoke, earth, and darker force';
  if (t.includes('scotch')) return 'malt depth, oak, and layered regional character';
  if (t.includes('flavored')) return 'sweetened flavoring that can either support or smother the bowl';
  return 'oak, sweetness, and overall structure';
}

function describeBlendProfile(type) {
  const t = String(type || '');
  switch (t) {
    case 'Aromatic':
      return 'cased sweetness, room note, and a soft fragrant delivery';
    case 'Burley':
      return 'dry cocoa bitterness, nuttiness, and a broad earthy core';
    case 'Virginia':
      return 'natural sweetness, hay, and brighter upper notes';
    case 'Virginia/Perique':
      return 'sweet grass, darker fruit, and peppery lift';
    case 'Virginia/Burley':
      return 'natural sweetness sitting over a nuttier, drier base';
    case 'Virginia/Oriental':
      return 'sweetness, floral spice, and fragrant middle notes';
    case 'English':
      return 'smoke, leather, and darker incense-like structure';
    case 'English/Balkan':
      return 'latakia smoke layered with oriental spice and depth';
    case 'Balkan':
      return 'oriental spice, incense, and smoky depth';
    case 'Oriental':
      return 'dry floral spice and savory fragrance';
    default:
      return `${t || 'tobacco'} character`;
  }
}

function bestReassignment(pipes = [], smokingLogs = []) {
  const enriched = buildPipeUsage(pipes, smokingLogs)
    .filter((p) => p.sessionCount >= 2 && p.loggedBlendTypes.length >= 2);

  const scored = enriched
    .map((pipe) => {
      const dominant = dominantBlendFamily(pipe.loggedBlendTypes);
      const suggested = classifySpecFromBlendFamily(dominant);
      const current = getPipeSpec(pipe);
      if (!suggested || norm(current) === norm(suggested)) return null;

      return {
        pipe,
        suggested,
        dominant,
        score: pipe.sessionCount,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

function bestTonightPipe(pipes = [], smokingLogs = []) {
  const enriched = buildPipeUsage(pipes, smokingLogs)
    .filter((p) => (p.lastSmokedDays ?? 999) >= 14)
    .sort((a, b) => {
      const aDays = a.lastSmokedDays ?? 999;
      const bDays = b.lastSmokedDays ?? 999;
      return bDays - aDays;
    });

  return enriched[0] || pipes[0] || null;
}

function bestTonightBlend(blends = [], smokingLogs = []) {
  const enriched = buildBlendUsage(blends, smokingLogs)
    .filter((b) => b.sessionCount > 0 || b.quantity_oz > 0 || b.stock_oz > 0)
    .sort((a, b) => {
      const aDays = a.lastSmokedDays ?? 999;
      const bDays = b.lastSmokedDays ?? 999;
      return bDays - aDays;
    });

  return enriched[0] || blends[0] || null;
}

function bestOpenBottle(bottles = [], tastingLogs = []) {
  const tastedIds = new Set(
    tastingLogs.map((l) => l?.bottle_id || l?.bottleId).filter(Boolean)
  );

  const candidates = bottles
    .filter((b) => !tastedIds.has(b.id))
    .sort((a, b) => {
      const aVal = Number(a?.estimated_value || a?.retail_price || a?.purchase_price || 0);
      const bVal = Number(b?.estimated_value || b?.retail_price || b?.purchase_price || 0);
      return aVal - bVal;
    });

  return candidates[0] || bottles[0] || null;
}

function biggestGap(blends = [], bottles = []) {
  const blendFamilies = new Set(
    blends.map((b) => getBlendType(b)).filter(Boolean)
  );
  const bottleTypes = new Set(
    bottles.map((b) => getBottleType(b)).filter(Boolean)
  );

  if (!blendFamilies.has('Virginia/Burley')) {
    return 'A practical Virginia/Burley lane looks thin or absent. That matters because it gives you a dependable middle ground between brighter Virginia sweetness and drier Burley structure.';
  }
  if (!blendFamilies.has('English/Balkan') && !blendFamilies.has('English') && !blendFamilies.has('Balkan')) {
    return 'Your cellar appears light on English/Balkan territory. That leaves a real gap in smoky, savory session options and limits deeper pairing opportunities with Scotch and peated pours.';
  }
  if (![...bottleTypes].some((t) => norm(t).includes('rye'))) {
    return 'A clear rye lane appears to be missing. Rye adds pepper, grip, and contrast pairings that bourbon and Irish whiskey do not handle the same way.';
  }
  if (![...bottleTypes].some((t) => norm(t).includes('irish'))) {
    return 'An Irish whiskey lane appears thin. Irish whiskey often gives your aromatic and gentler blends a cleaner, easier companion than bourbon does.';
  }

  return 'Your next important gap is probably not quantity but specialization: getting each pipe and each blend family into a cleaner lane so the collection becomes easier to use, not just larger.';
}

function pairingExplanation(context = {}) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];

  const pipe = bestTonightPipe(pipes, smokingLogs);
  const blend = bestTonightBlend(blends, smokingLogs);
  const bottle = bestOpenBottle(bottles, context?.tastingLogs || []);

  if (!pipe || !blend || !bottle) {
    return `A pairing explanation works best when I can point to one specific pipe, one specific blend, and one specific pour. Right now I do not have enough reliable candidates across all three, so the next step is to make sure at least one active pipe, one active blend, and one whiskey bottle are fully logged and usable.`;
  }

  const blendType = getBlendType(blend);
  const bottleType = getBottleType(bottle);

  return `${pipe.name}, ${blend.name}, and ${bottle.name} make sense together because each one solves a different part of the session. ${blend.name} brings ${describeBlendProfile(blendType)}, while ${bottle.name} contributes ${describeBottleProfile(bottleType)}. The pipe matters because its established smoking behavior determines whether that bowl stays focused or gets muddy, so the pipe is not just a container here — it is part of the flavor control.`;
}

function answerQuestion(message, context = {}) {
  const text = norm(message);
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];
  const tastingLogs = context?.tastingLogs || [];

  if (text.includes('clean') && text.includes('meerschaum')) {
    return `For a meerschaum, keep it gentle. Let the pipe cool completely, empty the bowl, wipe the chamber lightly with a dry folded pipe cleaner or soft paper, and run regular then bristle cleaners through the airway without forcing them. Avoid alcohol on the exterior, avoid aggressive reaming, and do not chase a perfectly white finish — meerschaum rewards patience more than scrubbing.`;
  }

  if (text.includes('reassign') || text.includes('different specialty') || text.includes('different speciality')) {
    const candidate = bestReassignment(pipes, smokingLogs);
    if (!candidate) {
      return `I do not yet have enough reliable session evidence to recommend a confident reassignment. For a real reassignment, I want to see repeated usage pointing toward one dominant family — for example Aromatic, Burley, Virginia, or English/Balkan — instead of just one or two scattered sessions.`;
    }

    return `${candidate.pipe.name} is the strongest reassignment candidate right now. Its logged usage leans most heavily toward ${candidate.dominant}, which suggests it would serve the collection better as a ${candidate.suggested} pipe than as ${getPipeSpec(candidate.pipe) || 'an unassigned pipe'}. The reason to reassign it is not aesthetics — it is to make future session planning cleaner and reduce crossover mistakes.`;
  }

  if (text.includes('what should i smoke tonight') || (text.includes('smoke tonight'))) {
    const pipe = bestTonightPipe(pipes, smokingLogs);
    const blend = bestTonightBlend(blends, smokingLogs);

    if (!pipe && !blend) {
      return `I do not have enough usable session history yet to make a meaningful tonight recommendation. The fastest way to improve this is to log a few sessions with your active pipes and cellar blends so I can see what is being neglected and what is actually smoking well.`;
    }

    if (pipe && blend) {
      return `Tonight I would start with ${pipe.name} and ${blend.name}. ${pipe.name} looks underused enough to deserve attention, and ${blend.name} appears due for a revisit without being a reckless choice. That gives you a session that is both practical and informative: you are not just smoking something at random, you are testing whether an underused part of the collection deserves a bigger role.`;
    }

    return `Tonight I would start with ${pipe?.name || blend?.name}. It stands out as one of the most useful “re-engage this item” candidates in the collection right now.`;
  }

  if (text.includes('what should i open next') || text.includes('open next')) {
    const bottle = bestOpenBottle(bottles, tastingLogs);
    if (!bottle) {
      return `I do not have enough bottle data to make a sound opening recommendation. The best next step is to make sure your owned bottles are in the collection with purchase and value data intact.`;
    }

    return `${bottle.name} is the safest “open next” candidate from a collection-management standpoint. It appears to be one of the lower-risk bottles to learn from first, which means you gain tasting data and real usage history without using up one of the more sensitive or harder-to-replace pours.`;
  }

  if ((text.includes('buy') || text.includes('restock')) && (text.includes('next') || text.includes('should'))) {
    const lowBlend = buildBlendUsage(blends, smokingLogs).find((b) => Number(b.quantity_oz || b.stock_oz || 0) <= 1);
    const unopened = bestOpenBottle(bottles, tastingLogs);
    if (lowBlend) {
      return `${lowBlend.name} is the clearest next purchase candidate because stock looks thin and it already has enough history to matter inside your rotation. Restocking proven favorites improves the collection faster than adding random new items.`;
    }
    if (unopened) {
      return `${unopened.name} is a reasonable next acquisition reference point because it would strengthen your bottle lane without adding noise. I would still prioritize obvious tobacco restocks before speculative bottle buying.`;
    }
    return `The best next purchase is the item that closes the largest active gap or restores a proven favorite. Right now I need either low-stock data or want-list data to rank that confidently.`;
  }

  if (text.includes('gap') && text.includes('collection')) {
    return biggestGap(blends, bottles);
  }

  if (text.includes('pairing')) {
    return pairingExplanation(context);
  }

  return `I can give better answers than generic advice, but I need to anchor the answer to actual collection evidence: a specific pipe, blend, bottle, usage pattern, or gap. Ask me which pipe should be reassigned, what to smoke tonight, what to open next, or what the biggest gap is, and I will answer from a collection-management perspective instead of just general hobby advice.`;
}

export default function ExpertTobacconistChat({
  preFillMessage,
  onPreFillConsumed,
  collectionContext,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(() => !!input.trim() && !isSending, [input, isSending]);

  useEffect(() => {
    if (preFillMessage) {
      setInput(preFillMessage);
      onPreFillConsumed?.();
    }
  }, [preFillMessage, onPreFillConsumed]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answerQuestion(text, collectionContext),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="rounded-[18px] p-8"
      style={{
        background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
        border: '1px solid rgba(140,105,65,0.16)',
      }}
    >
      <h3 className="text-[20px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>
        Curator Console
      </h3>
      <p className="text-[16px] mb-6" style={{ color: '#A1A1AA' }}>
        Ask about your collection, pairings, or what to smoke tonight.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <span className="px-4 py-2 rounded-full text-sm" style={{ border: '1px solid rgba(198,161,91,0.25)', color: '#C6A15B' }}>Your Collection</span>
        <span className="px-4 py-2 rounded-full text-sm" style={{ border: '1px solid rgba(198,161,91,0.25)', color: '#C6A15B' }}>Pairings</span>
        <span className="px-4 py-2 rounded-full text-sm" style={{ border: '1px solid rgba(198,161,91,0.25)', color: '#C6A15B' }}>Session Planning</span>
      </div>

      <div
        className="rounded-[18px] p-5 mb-5"
        style={{ background: '#09090B', border: '1px solid rgba(255,255,255,0.06)', minHeight: 220 }}
      >
        {messages.length === 0 ? (
          <>
            <div className="text-[16px] mb-5" style={{ color: '#A1A1AA' }}>
              Start a conversation or pick a prompt below.
            </div>
            <div className="flex flex-wrap gap-3">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="px-4 h-10 rounded-full text-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#F5F5F7' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="text-[12px] uppercase tracking-[0.12em]" style={{ color: '#71717A' }}>
                  {m.role === 'user' ? 'You' : 'Curator'}
                </div>
                <div className="text-[16px] leading-8" style={{ color: '#F5F5F7' }}>
                  {m.content}
                </div>
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