import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import ReactMarkdown from "react-markdown";

// NOTE: This file intentionally keeps “internal prompt” strings in English.
// Only *user-facing UI* text is translated.

const TOBACCONIST_ICON =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/74ff3c767_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png";

function extractAgentText(msg) {
  if (!msg) return "";
  if (typeof msg === "string") return msg;

  const c = msg.content;

  if (typeof c === "string") return c;

  // base44 agent payloads sometimes vary
  if (c && typeof c === "object") {
    const maybe =
      (typeof c.response === "string" && c.response) ||
      (typeof c.text === "string" && c.text) ||
      (typeof c.message === "string" && c.message) ||
      (typeof c.advice === "string" && c.advice) ||
      (typeof c.detailed_reasoning === "string" && c.detailed_reasoning);

    if (maybe) return maybe;

    try {
      return JSON.stringify(c, null, 2);
    } catch {
      return String(c);
    }
  }

  return "";
}

export default function ExpertTobacconistChat({ pipes = [], blends = [] }) {
  const { t } = useTranslation();

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // load minimal collection snapshot (kept as internal text)
  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ["expert-tobacconist-context"],
    queryFn: async () => {
      const pipeNames = (pipes || []).map((p) => p?.name).filter(Boolean);
      const blendNames = (blends || []).map((b) => b?.name).filter(Boolean);

      // Keep this English (internal use; never shown directly)
      const snapshot = [
        "USER COLLECTION SNAPSHOT (internal use; do not repeat back):",
        `PIPES (${pipeNames.length}): ${pipeNames.join(", ")}`,
        `TOBACCO BLENDS (${blendNames.length}): ${blendNames.join(", ")}`,
      ].join("\n");

      return { snapshot };
    },
    staleTime: 60_000,
  });

  // init conversation on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const res = await base44.invoke("createAgentConversation", {
          agent_id: "expert_tobacconist",
          metadata: {
            // metadata is internal; do not translate
            name: "Expert Tobacconist Chat",
          },
        });

        if (!mounted) return;

        setConversationId(res?.conversation_id || null);
      } catch (e) {
        console.error("[EXPERT_TOBACCONIST] Failed to initialize:", e);
        toast.error(
          t(
            "agent.failedToInitializeExpertChat",
            "Failed to initialize expert chat"
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, created_at: new Date().toISOString() },
    ]);

    setLoading(true);

    try {
      if (contextLoading) {
        toast.error(
          t(
            "agent.collectionLoadingRetry",
            "Loading your collection data… try again in a moment."
          )
        );
        return;
      }

      // Send internal context (English-only, not displayed as UI)
      const contextBlock = contextData?.snapshot
        ? `${contextData.snapshot}\n\n- Don't force collection stats).`
        : "";

      const res = await base44.invoke("sendAgentMessage", {
        conversation_id: conversationId,
        agent_id: "expert_tobacconist",
        message: userMessage,
        context: contextBlock,
      });

      const agentText = extractAgentText(res?.message || res);

      if (!agentText) {
        toast.error(
          t(
            "agent.couldntLoadExpertResponse",
            "Couldn't load a response from the expert agent. Please try again."
          )
        );
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: agentText, created_at: new Date().toISOString() },
      ]);
    } catch (e) {
      console.error("[EXPERT_TOBACCONIST] Send failed:", e);
      toast.error(
        t(
          "agent.couldntLoadExpertResponse",
          "Couldn't load a response from the expert agent. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-[#8b3a3a] overflow-hidden flex-shrink-0">
          <img
            src={TOBACCONIST_ICON}
            alt={t("tobacconist.aiTobacconistAlt", "AI Tobacconist")}
            className="w-full h-full object-cover scale-110"
          />
        </div>

        <div className="min-w-0">
          <div className="text-lg font-semibold text-white">
            {t("tobacconist.expertChatTitle", "Expert Tobacconist Chat")}
          </div>
          <div className="text-sm text-white/70">
            {t(
              "tobacconist.subtitle",
              "Personalized pipe and tobacco advice"
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-white/70">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Optional “Why this works” block (translated) */}
      <div className="text-xs text-white/70 mb-3">
        <span className="font-semibold">
          {t("tobacconist.whyThisWorks", "Why this works")}
        </span>
        <span className="ml-2">
          - Keep paragraphs short. Use clean spacing (no walls of text).
        </span>
      </div>

      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 mb-3">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={`${m.created_at || "msg"}-${idx}`}
              className={isUser ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  isUser
                    ? "inline-block max-w-[85%] bg-indigo-600 text-white rounded-lg px-4 py-2"
                    : "inline-block max-w-[85%] bg-white/5 border border-white/10 rounded-lg px-4 py-3"
                }
              >
                {isUser ? (
                  <div className="text-sm whitespace-pre-wrap">{String(m.content || "")}</div>
                ) : (
                  <ReactMarkdown className="prose prose-invert max-w-none text-sm">
                    {String(m.content || "")}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-white/70" />
              <div className="text-sm text-white/70">…</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="mt-2 pt-2 border-t border-white/10">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(
            "tobacconist.askExpertPlaceholder",
            "Ask about pipes, blends, pairing ideas, aging, value, redundancy..."
          )}
          className="min-h-[90px] bg-[#1E2F43] border-white/10 text-white placeholder:text-white/50"
        />

        <div className="flex justify-end mt-2">
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !conversationId || loading}
            className="bg-[#8b3a3a] hover:bg-[#7a3232] text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="ml-2">{/* keep icon-only */}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
