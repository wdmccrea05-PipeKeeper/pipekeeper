// src/components/agent/ExpertTobacconistChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { waitForAssistantMessage } from "@/components/utils/agentWait";
import {
  FormattedTobacconistResponse,
  formatTobacconistResponse,
} from "@/components/utils/formatTobacconistResponse";
import { classifyQuestion } from "@/components/utils/questionClassifier";
import { useTranslation } from "@/components/i18n/safeTranslation";

const TOBACCONIST_ICON =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png";

/**
 * Expert Tobacconist chat (stability + continuity fixed)
 * NOTE: All user-facing strings in this file are now i18n-safe with English defaults.
 */
export default function ExpertTobacconistChat() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const initializedRef = useRef(false);
  const contextSentRef = useRef(false);
  const messagesEndRef = useRef(null);

  // ---- Collection context queries ----
  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.Pipe.filter(
        { created_by: user.email },
        "-created_date",
        10000
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const { data: blends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ["tobacco-blends", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.TobaccoBlend.filter(
        { created_by: user.email },
        "-created_date",
        10000
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const { data: pairingMatrix = [], isLoading: pairingLoading } = useQuery({
    queryKey: ["pairing-matrix", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.PairingMatrix?.filter?.(
        { created_by: user.email },
        "-created_date",
        10000
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && !!base44.entities.PairingMatrix,
    initialData: [],
  });

  const { data: usageLogs = [], isLoading: usageLoading } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.SmokingLog?.filter?.(
        { created_by: user.email },
        "-created_date",
        2000
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && !!base44.entities.SmokingLog,
    initialData: [],
  });

  const contextLoading = pipesLoading || blendsLoading || pairingLoading || usageLoading;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const buildContextMessage = () => {
    const pipeNames = pipes.map((p) => p.name || p.brand || p.shape || p.id).slice(0, 200);
    const blendNames = blends.map((b) => b.name || b.blend_name || b.brand || b.id).slice(0, 400);

    // This is INTERNAL agent context; it is intentionally not translated.
    return [
      "USER COLLECTION SNAPSHOT (internal use; do not repeat back):",
      "",
      `PIPES (${pipes.length}): ${pipeNames.join(", ")}`,
      "",
      `TOBACCO BLENDS (${blends.length}): ${blendNames.join(", ")}`,
      "",
      `PAIRING MATRIX ROWS: ${Array.isArray(pairingMatrix) ? pairingMatrix.length : 0}`,
      `SMOKING LOG ENTRIES: ${Array.isArray(usageLogs) ? usageLogs.length : 0}`,
      "",
      "Behavior rules:",
      "- If collection-dependent: reference specific items and scores.",
      "- If general brand/topic: answer normally (don't force collection stats).",
      "- Keep paragraphs short. Use clean spacing (no walls of text).",
      "- Don't include 'Why this works' unless the user asks for reasoning.",
    ].join("\n");
  };

  // ---- Initialize conversation ONCE ----
  useEffect(() => {
    if (!user?.email) return;
    if (initializedRef.current) return;

    (async () => {
      try {
        initializedRef.current = true;

        const conversation = await base44.agents.createConversation({
          agent_name: "expert_tobacconist",
          metadata: {
            // Metadata is not displayed to users; keep as-is.
            name: "Expert Tobacconist Chat",
            description: "Personalized pipe and tobacco advice",
          },
        });

        setConversationId(conversation.id);
        setMessages(conversation.messages || []);

        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
          setMessages(data?.messages || []);
        });

        // Send context once (non-blocking)
        setTimeout(async () => {
          if (contextSentRef.current) return;
          contextSentRef.current = true;

          try {
            await base44.agents.addMessage(conversation.id, {
              role: "user",
              content: `[INITIAL CONTEXT — internal only]\n\n${buildContextMessage()}`,
            });
          } catch (e) {
            console.warn("[EXPERT_TOBACCONIST] Context send failed:", e);
          }
        }, 250);

        return () => unsubscribe?.();
      } catch (err) {
        console.error("[EXPERT_TOBACCONIST] Failed to initialize:", err);
        toast.error(
          t("agent.failedToInitializeChat", "Failed to initialize expert chat")
        );
        initializedRef.current = false;
      }
    })();
  }, [user?.email]); // intentionally minimal deps

  const renderMessageText = (msg) => {
    if (!msg) return "";
    const c = msg.content;

    if (typeof c === "string") return c;

    if (c && typeof c === "object") {
      const maybe =
        (typeof c.response === "string" && c.response) ||
        (typeof c.advice === "string" && c.advice) ||
        (typeof c.text === "string" && c.text) ||
        (typeof c.message === "string" && c.message) ||
        (typeof c.detailed_reasoning === "string" && c.detailed_reasoning);

      if (maybe) return maybe;

      try {
        return JSON.stringify(c, null, 2);
      } catch {
        return String(c);
      }
    }
    return "";
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMessage = input.trim();
    setInput("");
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

      const classification = classifyQuestion(userMessage);

      await base44.agents.addMessage(conversationId, {
        role: "user",
        content: userMessage,
        metadata: {
          ui_response_style: classification?.responseStyle || "simple_paragraphs",
          ui_question_type: classification?.questionType || "general",
        },
      });

      await waitForAssistantMessage(conversationId, 180000, {
        debug: false,
        context: "expert_tobacconist",
      });

      const snap = await base44.agents.getConversation(conversationId);
      setMessages(snap?.messages || []);
    } catch (err) {
      console.error("[EXPERT_TOBACCONIST] Send failed:", err);
      toast.error(
        t(
          "agent.couldntLoadResponse",
          "Couldn't load a response from the expert agent. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const headerTitle = t("tobacconist.askTheExpert", "Expert Tobacconist");
  const headerSubtitle = t(
    "tobacconist.askTheExpertDesc",
    "Personalized pipe and tobacco advice"
  );

  return (
    <Card className="p-4 space-y-4 bg-[#223447] border-white/10 text-white">
      <div className="flex items-center gap-3">
        <img
          src={TOBACCONIST_ICON}
          alt={t("agent.aiTobacconistAlt", "AI Tobacconist")}
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{headerTitle}</h3>
          <p className="text-sm text-white/70">{headerSubtitle}</p>
        </div>
        <Sparkles className="w-5 h-5 text-white/70" />
      </div>

      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
        {messages
          .filter((m) => m?.role !== "system")
          .map((msg, idx) => {
            const isUser = msg.role === "user";
            const text = renderMessageText(msg);

            return (
              <div key={idx} className={isUser ? "text-right" : "text-left"}>
                <div
                  className={
                    isUser
                      ? "inline-block max-w-[85%] bg-indigo-600 text-white rounded-lg px-4 py-2"
                      : "inline-block max-w-[85%] bg-white/5 border border-white/10 rounded-lg px-4 py-3"
                  }
                >
                  {isUser ? (
                    <p className="text-sm whitespace-pre-wrap text-white">{text}</p>
                  ) : (
                    <div className="text-white/90">
                      <FormattedTobacconistResponse
                        content={formatTobacconistResponse(text)}
                        style="light_structure"
                        className="text-white/90"
                      />
                    </div>
                  )}

                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-xs font-mono text-white/50">
                        {t("agent.answeredBy", "Answered by: {{agent}}", {
                          agent: "expert_tobacconist",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {loading && (
          <div className="text-left">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-white/70" />
              <p className="text-sm text-white/70">{t("ai.thinking", "Thinking…")}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(
            "agent.askExpertPlaceholder",
            "Ask about pipes, blends, pairing ideas, aging, value, redundancy..."
          )}
          className="min-h-[90px] bg-[#1E2F43] border-white/10 text-white placeholder:text-white/50"
          disabled={loading}
        />
        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={loading || !input.trim()} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t("tobacconist.sendMessage", "Send")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
