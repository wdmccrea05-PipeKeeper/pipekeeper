import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { translateToEnglish, translateFromEnglish, getCurrentLocale } from "@/components/utils/aiTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CURATOR_ICON =
  "https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png";
const AGENT_NAME = "expert_tobacconist";

function generateQuickPrompts({ pipes = [], blends = [], logs = [], t }) {
  const prompts = [];
  if (pipes.length > 10) prompts.push(t("curator.quickPrompt.underused", { defaultValue: "Which pipes in my collection are the most underused right now?" }));
  if (pipes.length === 0) prompts.push(t("curator.quickPrompt.startBuilding", { defaultValue: "How should I start building my first pipe collection?" }));
  else if (pipes.length < 5) prompts.push(t("curator.quickPrompt.nextPipe", { defaultValue: "What type of pipe would best round out what I already own?" }));
  const blendTypes = new Set(blends.map((b) => b?.blend_type).filter(Boolean));
  if (blends.length >= 5 && blendTypes.size < 3) {
    prompts.push(t("curator.quickPrompt.cellarDiversity", { defaultValue: "How balanced is my tobacco cellar right now?" }));
  }
  if (logs.length > 5) prompts.push(t("curator.quickPrompt.tonightPipe", { defaultValue: "Based on my collection, what should I smoke tonight?" }));
  if (pipes.length >= 3 && logs.length > 0) prompts.push(t("curator.quickPrompt.rotation", { defaultValue: "Help me build a better rotation from my current pipes." }));
  if (pipes.length >= 5) prompts.push(t("curator.quickPrompt.value", { defaultValue: "What stands out as most valuable or overlooked in my collection?" }));
  if (prompts.length === 0) {
    prompts.push(
      t("curator.quickPrompt.default1", { defaultValue: "What should I focus on first in my collection?" }),
      t("curator.quickPrompt.default2", { defaultValue: "What are the biggest strengths of my collection right now?" }),
      t("curator.quickPrompt.default3", { defaultValue: "What should I improve next?" })
    );
  }
  return prompts.slice(0, 4);
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "text-white" : "text-[#E0D8C8]"}`}
        style={{
          background: isUser
            ? "linear-gradient(135deg, rgba(139,58,58,0.95), rgba(109,46,46,1))"
            : "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.7))",
          border: isUser ? "none" : "1px solid rgba(140,105,65,0.3)",
          boxShadow: isUser
            ? "0 2px 8px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.1)",
        }}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-amber-300">{children}</strong>,
              em: ({ children }) => <em className="italic text-[#E0D8C8]/90">{children}</em>,
              code: ({ inline, children }) =>
                inline ? (
                  <code className="px-1.5 py-0.5 rounded text-amber-300 text-xs font-mono" style={{ background: "rgba(0,0,0,0.3)" }}>
                    {children}
                  </code>
                ) : (
                  <code className="block px-3 py-2 rounded text-amber-300 text-xs font-mono my-2" style={{ background: "rgba(0,0,0,0.4)" }}>
                    {children}
                  </code>
                ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function CuratorWorkspace({ pipes = [], blends = [], preFilledPrompt, routedContext, onPromptConsumed }) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState("");

  const messagesEndRef = useRef(null);
  const routedPromptConsumedRef = useRef(false);
  const threadInitPromiseRef = useRef(null);
  const routedContextRef = useRef(routedContext);

  const { data: logs = [] } = useQuery({
    queryKey: ["smokingLogs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const quickPrompts = useMemo(
    () => generateQuickPrompts({ pipes, blends, logs, t }),
    [pipes.length, blends.length, logs.length, t]
  );

  const ensureThread = useCallback(async () => {
    if (threadId) return threadId;
    if (threadInitPromiseRef.current) return threadInitPromiseRef.current;

    threadInitPromiseRef.current = (async () => {
      setInitializing(true);
      setInitError("");
      try {
        const conversation = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { source: "curator_workspace" },
        });

        const id = conversation?.id;
        if (!id) {
          throw new Error(t("curator.threadCreateNoId", { defaultValue: "Thread created without an ID." }));
        }

        setThreadId(id);
        return id;
      } catch (e) {
        const msg = e?.message || String(e);
        setInitError(msg);
        throw e;
      } finally {
        setInitializing(false);
        threadInitPromiseRef.current = null;
      }
    })();

    return threadInitPromiseRef.current;
  }, [threadId, t]);

  useEffect(() => {
    if (!user?.id || threadId) return;
    ensureThread().catch((e) => {
      console.error("Failed to initialize curator thread:", e);
    });
  }, [user?.id, threadId, ensureThread]);

  useEffect(() => {
    const load = async () => {
      if (!threadId) return;
      try {
        const conversation = await base44.agents.getConversation(threadId);
        const mapped = (conversation?.messages || []).map((m) => ({
          id: m.id || `${m.role}-${Math.random()}`,
          role: m.role,
          content: m.content || "",
          meta: m.meta || {},
        }));
        setMessages(mapped);
      } catch (e) {
        console.error("Failed to load curator messages:", e);
      }
    };
    load();
  }, [threadId]);

  // Update ref when routedContext changes
  useEffect(() => {
    routedContextRef.current = routedContext;
  }, [routedContext]);

  const sendMessage = useCallback(async (textOverride = null, contextOverride = null) => {
    const text = String(textOverride ?? input).trim();
    if (!text || sending) return false;

    setSending(true);
    setInitError("");
    const locale = getCurrentLocale();
    const optimisticId = `local-${Date.now()}`;
    const optimistic = { id: optimisticId, role: "user", content: text, meta: {} };
    setMessages((prev) => [...prev, optimistic]);
    if (!textOverride) setInput("");

    try {
      const ensuredThreadId = await ensureThread();
      const englishText = await translateToEnglish(text, locale);
      
      const conversation = await base44.agents.getConversation(ensuredThreadId);
      
      // Build detailed collection inventory
      const pipesList = pipes.map(p => `- ${p.name} (${p.maker || "unknown maker"}, ${p.shape || "unknown shape"}${p.focus?.length ? `, focus: ${p.focus.join(", ")}` : ""})`).join("\n");
      const blendsList = blends.map(b => `- ${b.name} (${b.manufacturer || "unknown"}, ${b.blend_type || "unknown type"}${b.strength ? `, ${b.strength}` : ""})`).join("\n");
      
      // Build context message with actual collection items
      let contextMessage = `USER COLLECTION:

PIPES (${pipes.length} total):
${pipesList || "None yet"}

TOBACCOS (${blends.length} total):
${blendsList || "None yet"}`;

      // Use context override if provided (for initial routed recommendation), otherwise check current state
      const activeContext = contextOverride || routedContextRef.current;
      
      // If this is the first message from a routed recommendation, include original context
      if (messages.length === 0 && activeContext?.originalTitle && activeContext?.originalInsight) {
        contextMessage += `

ORIGINAL RECOMMENDATION CONTEXT:
Title: ${activeContext.originalTitle}
Insight: ${activeContext.originalInsight}
Module: ${activeContext.module || "general"}
Category: ${activeContext.category || "general"}`;
      }

      contextMessage += `

USER QUESTION:
${englishText}`;

      await base44.agents.addMessage(conversation, {
        role: "user",
        content: contextMessage,
      });

      // Wait for assistant response
      const waitForResponse = async (maxWait = 90000) => {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const updated = await base44.agents.getConversation(ensuredThreadId);
          const lastMsg = updated?.messages?.[updated.messages.length - 1];
          if (lastMsg?.role === "assistant" && lastMsg?.content) {
            return lastMsg.content;
          }
        }
        throw new Error("Response timeout");
      };

      const assistantResponse = await waitForResponse();
      const translatedResponse = await translateFromEnglish(assistantResponse, locale);

      setMessages((prev) => {
        const withoutLocal = prev.filter((m) => m.id !== optimisticId);
        return [
          ...withoutLocal,
          { id: `user-${Date.now()}`, role: "user", content: text, meta: {} },
          { id: `assistant-${Date.now()}`, role: "assistant", content: translatedResponse, meta: {} },
        ];
      });
      return true;
    } catch (e) {
      console.error("Curator send failed:", e);
      const msg = e?.message || String(e);
      setInitError(msg);
      toast.error(`${t("curator.sendError", { defaultValue: "Failed to start Curator" })}: ${msg.slice(0, 120)}`);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      if (textOverride) setInput(text);
      return false;
    } finally {
      setSending(false);
    }
  }, [input, sending, ensureThread, t, pipes, blends, messages.length]);

  useEffect(() => {
    const nextPrompt = String(preFilledPrompt || "").trim();
    if (!nextPrompt) return;
    if (routedPromptConsumedRef.current) return;
    if (sending || initializing) return;
    if (!user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        await ensureThread();
        if (cancelled || routedPromptConsumedRef.current) return;
        
        // Mark as consumed BEFORE sending to prevent double-fire
        routedPromptConsumedRef.current = true;
        
        // Send with routed context to preserve recommendation payload
        const ok = await sendMessage(nextPrompt, routedContextRef.current);
        if (ok && onPromptConsumed) {
          onPromptConsumed();
        }
      } catch (e) {
        console.error("Curator routed prompt failed:", e);
        routedPromptConsumedRef.current = false; // Reset on failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preFilledPrompt, sending, initializing, user?.id, ensureThread, onPromptConsumed]);

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (input.trim() && !sending) sendMessage(null);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (input.trim() && !sending) sendMessage(null);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl"
      style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
        border: "1px solid rgba(140,105,65,0.35)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="px-6 py-5 border-b"
        style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(20,14,10,0.4)" }}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <img src={CURATOR_ICON} alt={t("curator.workspaceTitle", { defaultValue: "Curator" })} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1" style={{ color: "#F5F1E7", fontFamily: "Georgia, serif" }}>
                {t("curator.workspaceTitle", { defaultValue: "Curator" })}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.7)" }}>
                {t("curator.workspaceSubtitle", { defaultValue: "Ask questions, follow up on recommendations, and get collection-specific guidance." })}
              </p>
            </div>
          </div>

          {initError ? (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(139,58,58,0.18)", border: "1px solid rgba(139,58,58,0.35)", color: "#F5D4D4" }}>
              <div className="font-semibold mb-1">{t("curator.initError", { defaultValue: "Failed to start Curator" })}</div>
              <div className="opacity-90 break-words">{initError}</div>
            </div>
          ) : null}

          {quickPrompts.length > 0 && messages.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(180,140,75,0.6)" }}>
                {t("curator.tryAsking", { defaultValue: "Try asking" })}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={sending || initializing}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "rgba(180,140,75,1)", borderColor: "rgba(140,105,65,0.3)", background: "rgba(100,70,45,0.15)" }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-4" style={{ minHeight: "300px", maxHeight: "500px", overflowY: "auto", background: "rgba(15,10,8,0.3)" }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center space-y-3 max-w-md">
              <Sparkles className="w-10 h-10 mx-auto" style={{ color: "rgba(180,140,75,0.4)" }} />
              <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.5)" }}>
                {t("curator.emptyConversation", { defaultValue: "Ask Curator a question about your collection to get started." })}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
            {sending ? (
              <div className="flex justify-start mb-4">
                <div className="max-w-[85%] rounded-2xl px-4 py-3" style={{ background: "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.7))", border: "1px solid rgba(140,105,65,0.3)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(20,14,10,0.4)" }}>
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("curator.inputPlaceholder", { defaultValue: "Ask Curator about your collection…" })}
            disabled={sending || initializing}
            className="flex-1 bg-white/5 border-white/10 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40"
          />
          <Button
            onClick={() => sendMessage(null)}
            disabled={!input.trim() || sending || initializing}
            style={{ background: "linear-gradient(135deg, rgba(139,58,58,0.95), rgba(109,46,46,1))", border: "none" }}
            className="hover:opacity-90"
          >
            {sending ? (
              <span className="animate-pulse">{t("common.sending", { defaultValue: "Sending…" })}</span>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t("common.send", { defaultValue: "Send" })}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(224,216,200,0.4)" }}>
          {t("curator.pressEnter", { defaultValue: "Press Enter to send. Cmd/Ctrl+Enter also works." })}
        </p>
      </div>
    </div>
  );
}