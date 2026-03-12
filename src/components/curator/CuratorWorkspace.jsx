/**
 * CuratorWorkspace.jsx
 * 
 * The complete Collection Curator AI workspace.
 * Handles all AI interactions: advice, scenario analysis, optimization, explanations.
 * 
 * This is the final, production-ready Curator interface.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { translateToEnglish, translateFromEnglish, getCurrentLocale } from "@/components/utils/aiTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Send, Sparkles, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

// Dynamic quick prompts based on collection state
function generateQuickPrompts({ pipes = [], blends = [], logs = [], t }) {
  const prompts = [];
  
  // Collection size-based
  if (pipes.length > 10) {
    prompts.push(t("curator.quickPrompt.underused"));
  }
  
  if (pipes.length === 0) {
    prompts.push(t("curator.quickPrompt.startBuilding"));
  } else if (pipes.length < 5) {
    prompts.push(t("curator.quickPrompt.nextPipe"));
  }
  
  // Cellar-based
  const blendTypes = new Set(blends.map(b => b.blend_type).filter(Boolean));
  if (blends.length >= 5 && blendTypes.size < 3) {
    prompts.push(t("curator.quickPrompt.cellarDiversity"));
  }
  
  // Usage-based
  if (logs.length > 5) {
    prompts.push(t("curator.quickPrompt.tonightPipe"));
  }
  
  // Rotation-based
  if (pipes.length >= 3 && logs.length > 0) {
    prompts.push(t("curator.quickPrompt.rotation"));
  }
  
  // Value-based
  if (pipes.length >= 5) {
    prompts.push(t("curator.quickPrompt.value"));
  }
  
  // Default prompts if collection is empty
  if (prompts.length === 0) {
    prompts.push(
      t("curator.quickPrompt.default1"),
      t("curator.quickPrompt.default2"),
      t("curator.quickPrompt.default3")
    );
  }
  
  return prompts.slice(0, 4);
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] text-white"
            : "bg-gradient-to-br from-white/10 to-white/5 text-[#E0D8C8] border border-white/10"
        }`}
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
                  <code className="px-1.5 py-0.5 rounded bg-black/30 text-amber-300 text-xs font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block px-3 py-2 rounded bg-black/40 text-amber-300 text-xs font-mono my-2">
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

export default function CuratorWorkspace({ pipes = [], blends = [], preFilledPrompt, onPromptConsumed }) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const onPromptConsumedRef = useRef(onPromptConsumed);
  
  // Fetch smoking logs for quick prompts
  const { data: logs = [] } = useQuery({
    queryKey: ["smokingLogs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });
  
  useEffect(() => {
    onPromptConsumedRef.current = onPromptConsumed;
  }, [onPromptConsumed]);
  
  // Apply pre-filled prompt from URL or insight
  useEffect(() => {
    if (preFilledPrompt?.trim()) {
      setInput(preFilledPrompt);
      onPromptConsumedRef.current?.();
    }
  }, [preFilledPrompt]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Generate context-aware quick prompts
  const quickPrompts = useMemo(
    () => generateQuickPrompts({ pipes, blends, logs, t }),
    [pipes.length, blends.length, logs.length, t]
  );
  
  // Initialize chat thread
  useEffect(() => {
    const init = async () => {
      if (!user?.id || threadId) return;
      
      try {
        setInitializing(true);
        const created = await base44.ai.createThread({
          agent: "expert_tobacconist",
        });
        
        if (created?.id) {
          setThreadId(created.id);
        }
      } catch (e) {
        console.error("Failed to initialize curator thread:", e);
      } finally {
        setInitializing(false);
      }
    };
    
    init();
  }, [user?.id, threadId]);
  
  // Load thread messages
  useEffect(() => {
    const load = async () => {
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
        console.error("Failed to load curator messages:", e);
      }
    };
    
    load();
  }, [threadId]);
  
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !threadId || sending) return;
    
    setSending(true);
    const locale = getCurrentLocale();
    
    const optimistic = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      meta: {},
    };
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
    } catch (e) {
      console.error(e);
      toast.error(t("curator.sendError"));
    } finally {
      setSending(false);
    }
  };
  
  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };
  
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (input.trim() && !sending) {
        sendMessage();
      }
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
      {/* Header */}
      <div
        className="px-6 py-5 border-b"
        style={{
          borderColor: "rgba(140,105,65,0.2)",
          background: "rgba(20,14,10,0.4)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(139,58,58,0.8), rgba(109,46,46,0.9))",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <Brain className="w-6 h-6 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold mb-1"
              style={{
                color: "#F5F1E7",
                fontFamily: "Georgia, serif",
              }}
            >
              {t("curator.workspaceTitle")}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.7)" }}>
              {t("curator.workspaceSubtitle")}
            </p>
          </div>
        </div>
        
        {/* Quick prompts */}
        {quickPrompts.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(180,140,75,0.6)" }}>
              {t("curator.tryAsking")}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:scale-[1.02]"
                  style={{
                    color: "rgba(180,140,75,1)",
                    borderColor: "rgba(140,105,65,0.3)",
                    background: "rgba(100,70,45,0.15)",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Conversation */}
      <div
        className="px-6 py-4"
        style={{
          minHeight: "300px",
          maxHeight: "500px",
          overflowY: "auto",
          background: "rgba(15,10,8,0.3)",
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center space-y-3 max-w-md">
              <Sparkles className="w-10 h-10 mx-auto" style={{ color: "rgba(180,140,75,0.4)" }} />
              <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.5)" }}>
                {t("curator.emptyConversation")}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input area */}
      <div
        className="px-6 py-4 border-t"
        style={{
          borderColor: "rgba(140,105,65,0.2)",
          background: "rgba(20,14,10,0.4)",
        }}
      >
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("curator.inputPlaceholder")}
            disabled={sending || initializing}
            className="flex-1 bg-white/5 border-white/10 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || sending || initializing}
            className="bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] hover:from-[#9b4a4a] hover:to-[#7d3e3e] border-0"
          >
            {sending ? (
              <span className="animate-pulse">{t("common.sending")}</span>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t("common.send")}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(224,216,200,0.4)" }}>
          {t("curator.pressCmdEnter")}
        </p>
      </div>
    </div>
  );
}