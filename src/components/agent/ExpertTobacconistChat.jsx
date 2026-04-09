import React, { useState, useMemo, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';

const STARTER_PROMPTS = [
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

function answerQuestion(message, context = {}) {
  const text = norm(message);
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];
  const tastingLogs = context?.tastingLogs || [];
  const acquisitionItems = context?.acquisitionItems || context?.wantListItems || [];

  if (text.includes('redundant')) {
    const candidate = mostRedundantPipe(pipes, smokingLogs, blends);
    if (!candidate) {
      return 'I do not have enough pipe and session evidence yet to call a pipe redundant. Once more sessions are logged I can rank which shapes or roles overlap the most.';
    }

    const shape = candidate.shape || 'that shape lane';
    return `${candidate.name} is the strongest redundancy candidate right now. It sits in an already crowded ${shape} lane and has only ${candidate.sessionCount || 0} logged sessions${candidate.lastSmokedDays ? `, with about ${candidate.lastSmokedDays} days since it was last used` : ''}. That does not mean sell it, but it is the pipe I would scrutinize first for reassignment or reduced priority in the rotation.`;
  }

  if (text.includes('reassign') || text.includes('specializ')) {
    const candidate = bestReassignment(pipes, smokingLogs, blends);
    if (!candidate) {
      return 'I do not yet have enough reliable session evidence to recommend a confident reassignment. For a real reassignment, I want to see repeated usage pointing toward one dominant family instead of just one or two scattered sessions.';
    }

    return `${candidate.name} is the strongest reassignment candidate right now. Its logged usage leans most heavily toward ${candidate.dominantFamily}, with about ${candidate.confidence}% of its sessions pointing that way. That suggests it would serve the collection better as a ${candidate.dominantFamily} specialist than as ${candidate.currentSpec || 'an unassigned pipe'}.`;
  }

  if (text.includes('smoke tonight')) {
    const pipe = bestTonightPipe(pipes, smokingLogs, blends);
    const blend = bestTonightBlend(blends, smokingLogs);
    if (!pipe || !blend) {
      return 'I do not have enough usable session history yet to make a meaningful tonight recommendation. The fastest way to improve this is to log a few sessions with your active pipes and cellar blends.';
    }
    return `Tonight I would start with ${pipe.name} and ${blend.name}. ${pipe.name} looks underused enough to deserve attention, and ${blend.name} appears due for a revisit without being a reckless choice.`;
  }

  if (text.includes('open next')) {
    const bottle = bestOpenBottle(bottles, tastingLogs);
    if (!bottle) {
      return 'I do not have enough bottle data to make a sound opening recommendation.';
    }
    return `${bottle.name} is the safest open-next candidate from a collection-management standpoint. It gives you more tasting data without using up one of the harder-to-replace pours first.`;
  }

  if ((text.includes('buy') || text.includes('restock')) && (text.includes('next') || text.includes('should'))) {
    const tracked = acquisitionItems.find((i) => ['restock', 'shopping_list', 'wishlist'].includes(norm(i.status || i.category || i.list_type)));
    if (tracked) {
      return `${tracked.name} is already explicitly tracked in your purchase workflow, so I would start there. Curator should honor items you have already marked for shopping or restock before inventing a new target.`;
    }
    const lowBlend = blends.find((b) => Number(b.quantity_oz || b.total_oz || 0) <= 1);
    if (lowBlend) {
      return `${lowBlend.name} is the clearest next purchase candidate because stock looks thin and it already matters inside your rotation.`;
    }
    return 'The best next purchase is the item that closes the largest active gap or restores a proven favorite. Right now I need either low-stock data or tracked want-list data to rank that confidently.';
  }

  if (text.includes('gap')) {
    return biggestGap(blends, bottles);
  }

  if (text.includes('pairing')) {
    return pairingExplanation(context);
  }

  return 'Ask me which pipe is most redundant, which one should be reassigned, what to smoke tonight, what to buy or restock next, or what the biggest gap is. I will answer from the current collection rather than generic hobby advice.';
}

export default function ExpertTobacconistChat({ preFillMessage, onPreFillConsumed, collectionContext }) {
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
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }]);
    setInput('');
    try {
      const reply = answerQuestion(text, collectionContext);
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: reply }]);
    } finally {
      setIsSending(false);
    }
  };

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
              {STARTER_PROMPTS.map((prompt) => (
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
