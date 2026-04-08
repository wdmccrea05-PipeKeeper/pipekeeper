import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { SendHorizontal } from 'lucide-react';

const STARTER_PROMPTS = [
  'Why this pairing?',
  'Give me an alternative',
  'What should I smoke tonight?',
  'What should I open next?',
  'What gap matters most in my collection?',
];

export default function ExpertTobacconistChat({
  threadId,
  setThreadId,
  preFillMessage,
  onPreFillConsumed,
  onAnsweredBy,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const canSend = useMemo(() => !!input.trim() && !isSending, [input, isSending]);

  useEffect(() => {
    if (preFillMessage) {
      setInput(preFillMessage);
      onPreFillConsumed?.();
    }
  }, [preFillMessage, onPreFillConsumed]);

  useEffect(() => {
    let mounted = true;

    async function ensureThread() {
      if (threadId) return;
      try {
        const created = await base44.ai.createThread({ agent: 'expert_tobacconist' });
        if (mounted && created?.id) {
          setThreadId?.(created.id);
        }
      } catch (err) {
        if (mounted) setError('Could not initialize Curator chat.');
      }
    }

    ensureThread();
    return () => { mounted = false; };
  }, [threadId, setThreadId]);

  const appendStarterPrompt = (text) => setInput(text);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !threadId || isSending) return;

    setIsSending(true);
    setError('');

    const userMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const response = await base44.ai.sendMessage({
        thread_id: threadId,
        agent: 'expert_tobacconist',
        message: text,
      });

      const returned = Array.isArray(response?.messages) ? response.messages : [];
      const assistant = returned.find((m) => m.role === 'assistant');

      if (!assistant?.content) {
        throw new Error('No assistant response returned.');
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMessage.id),
        userMessage,
        {
          id: assistant.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistant.content,
          meta: assistant.meta || {},
        },
      ]);

      const answeredBy = assistant?.meta?.answered_by || assistant?.meta?.agent;
      if (answeredBy) onAnsweredBy?.(answeredBy);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(text);
      setError('Curator could not answer that just now. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="rounded-[18px] p-8"
      style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(140,105,65,0.16)' }}
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
                  onClick={() => appendStarterPrompt(prompt)}
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

      {error ? (
        <div className="mt-4 text-sm" style={{ color: '#EF4444' }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
