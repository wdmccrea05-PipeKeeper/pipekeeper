import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, Sparkles, Target, RefreshCw, AlertCircle, CheckCircle2, Undo } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { useTranslation } from "@/components/i18n/safeTranslation";

function MessageBubble({ message, t }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-lg bg-[#8b3a3a] flex items-center justify-center mt-0.5 flex-shrink-0 overflow-hidden">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/74ff3c767_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png"
            alt={t("agent.tobacconist", "Tobacconist")}
            className="w-full h-full object-cover scale-110"
          />
        </div>
      )}

      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser
                ? "bg-[#1a2c42] text-white"
                : "bg-white/5 border border-white/10 text-white"
            )}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
            ) : (
              <ReactMarkdown className="prose prose-invert max-w-none text-sm">
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TobacconistChat({ open, onOpenChange, pipes = [], blends = [] }) {
  const { t } = useTranslation();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const pipeNames = useMemo(() => (pipes || []).map((p) => p?.name).filter(Boolean), [pipes]);
  const blendNames = useMemo(() => (blends || []).map((b) => b?.name).filter(Boolean), [blends]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages, sending]);

  // Create conversation once when opened
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setBusy(true);
        const res = await base44.invoke("createAgentConversation", {
          agent_id: "pipe_expert",
          metadata: { name: "pipe_expert" }, // internal
        });
        if (!mounted) return;
        setConversationId(res?.conversation_id || null);
      } catch (e) {
        console.error("[TOBACCONIST] init failed:", e);
        toast.error(t("agent.failedToStartConversation", "Failed to start conversation"));
      } finally {
        if (mounted) setBusy(false);
      }
    };

    if (open && !conversationId) init();

    return () => {
      mounted = false;
    };
  }, [open, conversationId, t]);

  const regeneratePairings = useMutation({
    mutationFn: async () => base44.invoke("regeneratePairings"),
    onSuccess: () => {
      toast.success(t("agent.pairingsRegenerated", "Pairings regenerated successfully"));
      queryClient.invalidateQueries();
    },
    onError: () => toast.error(t("agent.failedToRegeneratePairings", "Failed to regenerate pairings")),
  });

  const undoPairings = useMutation({
    mutationFn: async () => base44.invoke("undoPairings"),
    onSuccess: () => {
      toast.success(t("agent.pairingsReverted", "Pairings reverted to previous version"));
      queryClient.invalidateQueries();
    },
    onError: () => toast.error(t("agent.failedToUndoPairings", "Failed to undo pairings")),
  });

  const regenerateOptimization = useMutation({
    mutationFn: async () => base44.invoke("regenerateOptimization"),
    onSuccess: () => {
      toast.success(t("agent.optimizationRegenerated", "Optimization regenerated successfully"));
      queryClient.invalidateQueries();
    },
    onError: () =>
      toast.error(t("agent.failedToRegenerateOptimization", "Failed to regenerate optimization")),
  });

  const undoOptimization = useMutation({
    mutationFn: async () => base44.invoke("undoOptimization"),
    onSuccess: () => {
      toast.success(t("agent.optimizationReverted", "Optimization reverted to previous version"));
      queryClient.invalidateQueries();
    },
    onError: () =>
      toast.error(t("agent.failedToUndoOptimization", "Failed to undo optimization")),
  });

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || sending) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // One-time context injection
      if (!contextSent) {
        const context = [
          `PIPES (${pipeNames.length}): ${pipeNames.join(", ")}`,
          `TOBACCO BLENDS (${blendNames.length}): ${blendNames.join(", ")}`,
        ].join("\n");

        await base44.invoke("sendAgentContext", {
          conversation_id: conversationId,
          agent_id: "pipe_expert",
          context,
        });

        setContextSent(true);
      }

      const res = await base44.invoke("sendAgentMessage", {
        conversation_id: conversationId,
        agent_id: "pipe_expert",
        message: userMessage,
      });

      const content =
        typeof res?.message?.content === "string"
          ? res.message.content
          : typeof res?.content === "string"
            ? res.content
            : "";

      if (content) {
        setMessages((prev) => [...prev, { role: "assistant", content }]);
      } else {
        toast.error(t("agent.failedToSendMessage", "Failed to send message"));
      }
    } catch (e) {
      console.error("[TOBACCONIST] send failed:", e);
      toast.error(t("agent.failedToSendMessage", "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#0b1420] border-white/10 text-white w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white/70" />
            {t("agent.title", "Tobacconist")}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="chat" className="mt-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="chat">{t("agent.tabChat", "Chat")}</TabsTrigger>
            <TabsTrigger value="actions">{t("agent.tabActions", "Actions")}</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {messages.map((m, idx) => (
                <MessageBubble key={idx} message={m} t={t} />
              ))}

              {(busy || sending) && (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  <span className="text-sm">{t("agent.sending", "Sending…")}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("agent.inputPlaceholder", "Ask a question…")}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Button onClick={sendMessage} disabled={!input.trim() || !conversationId || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => regeneratePairings.mutate()}
                disabled={regeneratePairings.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("agent.regeneratePairings", "Regenerate Pairings")}
              </Button>

              <Button
                variant="secondary"
                onClick={() => undoPairings.mutate()}
                disabled={undoPairings.isPending}
              >
                <Undo className="w-4 h-4 mr-2" />
                {t("agent.undoPairings", "Undo Pairings")}
              </Button>

              <Button
                variant="secondary"
                onClick={() => regenerateOptimization.mutate()}
                disabled={regenerateOptimization.isPending}
              >
                <Target className="w-4 h-4 mr-2" />
                {t("agent.regenerateOptimization", "Regenerate Optimization")}
              </Button>

              <Button
                variant="secondary"
                onClick={() => undoOptimization.mutate()}
                disabled={undoOptimization.isPending}
              >
                <Undo className="w-4 h-4 mr-2" />
                {t("agent.undoOptimization", "Undo Optimization")}
              </Button>
            </div>

            <div className="text-xs text-white/60">
              <AlertCircle className="inline-block w-4 h-4 mr-2" />
              {t("agent.actionsNote", "These actions update AI-generated recommendations.")}
            </div>

            <div className="text-xs text-white/40">
              {t("agent.fingerprint", "Fingerprint")}: {buildArtifactFingerprint({ pipes, blends })}
            </div>

            <div className="text-xs text-white/40">
              {t("agent.quickAccess", "Quick Access")}: {createPageUrl("Home")}
            </div>

            <div className="text-xs text-white/40">
              <CheckCircle2 className="inline-block w-4 h-4 mr-2" />
              {t("agent.actionsReady", "Ready")}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
