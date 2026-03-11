import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { translateToEnglish, translateFromEnglish, getCurrentLocale } from "@/components/utils/aiTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function ExpertTobacconistChat({
  threadId,
  setThreadId,
  onAnsweredBy,
}) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const listRef = useRef(null);

  const canSend = useMemo(() => {
    return !!input.trim() && !sending && !initializing;
  }, [input, sending, initializing]);

  useEffect(() => {
    try {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    } catch {}
  }, [messages]);

  const initializeChat = async () => {
    try {
      setInitializing(true);

      // If user data still loading, avoid hard failures
      if (!user?.id) {
        toast.error(t("tobacconist.collectionLoadingRetry"));
        return;
      }

      // If no thread, create one
      if (!threadId) {
        const created = await base44.ai.createThread({
          agent: "expert_tobacconist",
        });

        if (!created?.id) {
          toast.error(t("tobacconist.failedToInitializeExpertChat"));
          return;
        }

        setThreadId(created.id);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("tobacconist.failedToInitializeExpertChat"));
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadThread = async () => {
    if (!threadId) return;

    try {
      const history = await base44.ai.getThreadMessages({
        thread_id: threadId,
      });

      const mapped =
        (history?.messages || []).map((m) => ({
          id: m.id || `${m.role}-${Math.random()}`,
          role: m.role,
          content: m.content || "",
          meta: m.meta || {},
        })) || [];

      setMessages(mapped);
    } catch (e) {
      console.error(e);
      // non-fatal
    }
  };

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !threadId || sending) return;

    setSending(true);
    const locale = getCurrentLocale();

    // optimistic add — show user's original text in the UI
    const optimistic = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      meta: {},
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      // Translate input to English before sending to AI
      const englishText = await translateToEnglish(text, locale);

      const res = await base44.ai.sendMessage({
        thread_id: threadId,
        agent: "expert_tobacconist",
        message: englishText,
      });

      // Translate responses back to user locale
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

      // Replace optimistic "local" with fresh server truth:
      setMessages((prev) => {
        const withoutLocal = prev.filter((m) => !String(m.id).startsWith("local-"));
        return [...withoutLocal, ...newMsgs];
      });

      // Capture answered-by label
      const assistant = newMsgs.find((m) => m.role === "assistant");
      const answeredBy = assistant?.meta?.answered_by || assistant?.meta?.agent || "";
      if (answeredBy && onAnsweredBy) onAnsweredBy(answeredBy);
    } catch (e) {
      console.error(e);
      toast.error(t("tobacconist.couldntLoadResponse"));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSend) sendMessage();
    }
  };

  return (
    <Card className="w-full p-4">
      <div className="flex items-center gap-3 mb-3">
        <img
          src="/icons/ai-tobacconist.png"
          alt={t("tobacconist.aiTobacconistAlt")}
          className="w-10 h-10 rounded-md"
        />
        <div className="flex-1">
          <div className="font-semibold">{t("tobacconist.title")}</div>
          <div className="text-sm opacity-70">{t("tobacconist.subtitle")}</div>
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-[420px] overflow-auto rounded-lg border border-white/10 p-3 mb-3 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-sm opacity-70">
            {t("tobacconist.welcomeMessage")}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                  m.role === "user" ? "bg-white/10" : "bg-black/20"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.role !== "user" && m?.meta?.answered_by ? (
                  <div className="mt-2 text-xs opacity-60">
                    {t("tobacconist.answeredBy")} {String(m.meta.answered_by)}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("tobacconist.askExpertPlaceholder")}
          disabled={sending || initializing}
        />
        <Button onClick={sendMessage} disabled={!canSend}>
          {sending ? t("common.sending", "Sending…") : t("common.send", "Send")}
        </Button>
      </div>

      <div className="mt-2 text-xs opacity-60">
        {t("tobacconist.pressCmdEnter")}
      </div>
    </Card>
  );
}
