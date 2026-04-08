import React, { useEffect, useMemo, useRef, useState } from "react";
import { translateToEnglish, translateFromEnglish, getCurrentLocale } from "@/components/utils/aiTranslation";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Send } from "lucide-react";

const STARTER_PROMPTS = [
  "Why this pairing?",
  "Give me an alternative",
  "What should I smoke tonight?",
  "What should I open next?",
  "What gap matters most in my collection?",
];

const CONTEXT_CHIPS = ["Your Collection", "Pairings", "Session Planning"];

export default function ExpertTobacconistChat({
  threadId,
  setThreadId,
  onAnsweredBy,
  preFillMessage,
  onPreFillConsumed,
}) {
  const { user } = useCurrentUser();

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [initializing, setInitializing] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const onPreFillConsumedRef = useRef(onPreFillConsumed);
  useEffect(() => {
    onPreFillConsumedRef.current = onPreFillConsumed;
  }, [onPreFillConsumed]);

  useEffect(() => {
    if (preFillMessage) {
      setInput(preFillMessage);
      onPreFillConsumedRef.current?.();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [preFillMessage]);

  const canSend = useMemo(() => !!input.trim() && !sending && !initializing, [input, sending, initializing]);

  useEffect(() => {
    try {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    } catch {}
  }, [messages]);

  const initializeChat = async () => {
    try {
      setInitializing(true);
      if (!threadId) {
        const created = await base44.ai.createThread({ agent: "expert_tobacconist" });
        if (!created?.id) {
          toast.error("Failed to initialize Curator chat.");
          return;
        }
        setThreadId(created.id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to initialize Curator chat.");
    } finally {
      setInitializing(false);
    }
  };

  // Initialize chat thread when user becomes available.
  // Using user?.id as dependency ensures we retry if user loaded asynchronously after mount.
  useEffect(() => {
    if (user?.id) initializeChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadThread = async () => {
    if (!threadId) return;
    try {
      const history = await base44.ai.getThreadMessages({ thread_id: threadId });
      const mapped = (history?.messages || []).map((m) => ({
        id: m.id || `${m.role}-${Math.random()}`,
        role: m.role,
        content: m.content || "",
        meta: m.meta || {},
      }));
      setMessages(mapped);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadThread();
  }, [threadId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !threadId || sending) return;

    setSending(true);
    const locale = getCurrentLocale();

    const optimistic = { id: `local-${Date.now()}`, role: "user", content: text, meta: {} };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const englishText = await translateToEnglish(text, locale);
      const res = await base44.ai.sendMessage({
        thread_id: threadId,
        agent: "expert_tobacconist",
        message: englishText,
      });

      const newMsgs = await Promise.all(
        (res?.messages || []).map(async (m) => {
          const translatedContent =
            m.role === "assistant"
              ? await translateFromEnglish(m.content || "", locale)
              : m.content || "";
          return {
            id: m.id || `${m.role}-${Math.random()}`,
            role: m.role,
            content: translatedContent,
            meta: m.meta || {},
          };
        })
      );

      setMessages((prev) => {
        const withoutLocal = prev.filter((m) => !String(m.id).startsWith("local-"));
        return [...withoutLocal, ...newMsgs];
      });

      const assistant = newMsgs.find((m) => m.role === "assistant");
      const answeredBy = assistant?.meta?.answered_by || assistant?.meta?.agent || "";
      if (answeredBy && onAnsweredBy) onAnsweredBy(answeredBy);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load a response — please try again.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendMessage();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSend) sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      {/* Title + description */}
      <div>
        <h2 style={{ color: '#C6A15B', fontSize: '20px', fontWeight: 600, margin: 0 }}>
          Curator Console
        </h2>
        <p style={{ color: '#A1A1AA', fontSize: '14px', marginTop: '4px' }}>
          Ask anything about your collection, pairings, or what to smoke tonight.
        </p>
      </div>

      {/* Context chips */}
      <div className="flex gap-2 flex-wrap">
        {CONTEXT_CHIPS.map((chip) => (
          <span
            key={chip}
            style={{ background: 'rgba(198,161,91,0.08)', color: '#C6A15B', border: '1px solid rgba(198,161,91,0.2)', fontSize: '13px', fontWeight: 500, padding: '4px 12px', borderRadius: '999px' }}
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Message history */}
      <div
        ref={listRef}
        style={{
          background: '#0B0B0C',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px',
          padding: '16px',
          minHeight: '300px',
          maxHeight: '480px',
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p style={{ color: '#A1A1AA', fontSize: '14px' }}>
              {initializing ? 'Initializing…' : 'Start a conversation or pick a prompt below.'}
            </p>
            {/* Starter prompt chips */}
            {!initializing && (
              <div className="flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: '#F5F5F7',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '13px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      cursor: 'pointer',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    ...(m.role === 'user'
                      ? { background: '#C6A15B', color: '#0B0B0C' }
                      : {
                          background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: '#F5F5F7',
                        })
                  }}
                >
                  <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </p>
                  {m.role !== 'user' && m?.meta?.answered_by && (
                    <p style={{ color: 'rgba(161,161,170,0.6)', fontSize: '12px', marginTop: '6px' }}>
                      via {String(m.meta.answered_by)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '10px 14px' }}>
                  <span style={{ color: '#A1A1AA', fontSize: '14px' }}>…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask the Curator…"
          disabled={sending || initializing}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#F5F5F7',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!canSend}
          style={{
            background: canSend ? '#C6A15B' : 'rgba(198,161,91,0.3)',
            color: '#0B0B0C',
            height: '40px',
            padding: '0 16px',
            borderRadius: '12px',
            fontSize: '14px',
            border: 'none',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
          }}
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <p style={{ color: 'rgba(161,161,170,0.5)', fontSize: '12px' }}>
        Press Enter to send · Cmd+Enter also works
      </p>
    </div>
  );
}
