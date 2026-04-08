import React, { useEffect, useMemo, useState } from 'react';
import { SendHorizontal } from 'lucide-react';

const STARTER_PROMPTS = [
  'Why this pairing?',
  'Give me an alternative',
  'What should I smoke tonight?',
  'What should I open next?',
  'What gap matters most in my collection?',
];

function buildLocalReply(message) {
  const text = String(message || '').toLowerCase();

  if (text.includes('clean') && text.includes('meerschaum')) {
    return `For a meerschaum, keep it gentle. Let the pipe cool completely, empty the bowl, wipe the chamber lightly with a dry folded pipe cleaner or soft paper, and run regular then bristle cleaners through the airway without forcing them. Avoid alcohol on the exterior and avoid aggressive reaming—meerschaum rewards patience more than scrubbing.`;
  }

  if (text.includes('what should i smoke tonight')) {
    return `Tonight, lean toward something dependable rather than experimental. Pick a pipe that has been smoking well lately, match it with a blend that fits that pipe’s specialization, and choose a pour that supports the tobacco instead of dominating it. If you want, use the Pairings tab first, then come back here and I’ll help you narrow the best option.`;
  }

  if (text.includes('what should i open next')) {
    return `Open something that is replaceable and aligned with your current preferences rather than the rarest bottle on the shelf. In practical terms, that usually means moderate rarity, easy replacement, and a flavor profile you already tend to rate well.`;
  }

  if (text.includes('gap') && text.includes('collection')) {
    return `The most important gap is usually not “more of everything,” but a missing usable lane: a blend family, pipe specialization, or whiskey style that would materially improve session planning and pairings. The Grow & Expand tab is the right place to spot that, then use this chat to sanity-check what matters most for your habits.`;
  }

  if (text.includes('pairing')) {
    return `A good pairing should answer three questions clearly: why this tobacco, why this pour, and why this pipe. If any one of those feels random, the pairing is weak. Use the Pipe, Blend, and Pour together as one session system, not as separate objects that happen to be nearby.`;
  }

  return `I can help with collection questions, pairing logic, rotation, opening strategy, and growth gaps. Ask me about a specific pipe, blend, bottle, or a session goal and I’ll give you a practical recommendation.`;
}

export default function ExpertTobacconistChat({
  preFillMessage,
  onPreFillConsumed,
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
        content: buildLocalReply(text),
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
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="text-[12px] uppercase tracking-[0.12em]" style={{ color: '#71717A' }}>
                  {m.role === 'user' ? 'You' : 'Curator'}
                </div>
                <div className="text-[16px] leading-7" style={{ color: '#F5F5F7' }}>
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