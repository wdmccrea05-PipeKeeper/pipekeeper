import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import {
  translateToEnglish,
  translateFromEnglish,
  getCurrentLocale,
} from "@/components/utils/aiTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  startCuratorSession,
  endCuratorSession,
  CuratorEvents,
} from "@/components/utils/curatorEventLogger";
import { validateOwnershipIntegrity } from "@/components/utils/curatorOwnershipGuard";
import {
  useTasteProfile,
  buildTasteProfileContext,
} from "@/components/curator/useTasteProfile";
import { BLEND_TYPES } from "@/components/tobacco/tobaccoConstants";
import CuratorActionPanel from "./CuratorActionPanel";
import CuratorActionResultCard from "./CuratorActionResultCard";
import normalizeCuratorActionResult from "./normalizeCuratorActionResult.jsx";
import curatorActionExecutor from "./curatorActionExecutor.jsx";
import { runCuratorAction } from "./curatorActionService.jsx";
import {
  buildCuratorChatSystemPrompt,
  buildCuratorActivitySummary,
} from "./chatAdvicePrompting.js";
import { applyCuratorRecommendation } from "./curatorApplyHandlers.js";
import SavedSessionsPanel from "./SavedSessionsPanel.jsx";
import FindSimilarPicker from "./FindSimilarPicker.jsx";
import { buildSafeCollectionContext, buildPromptBlock } from "./collectionContextBudget.jsx";
import extractActionableAdvice from "./extractActionableAdvice.js";

const AGENT_NAME = "expert_tobacconist";

function generateQuickPrompts({
  pipes = [],
  blends = [],
  logs = [],
  bottles = [],
  userProfile = null,
  t,
}) {
  const prompts = [];

  if (pipes.length > 10) {
    prompts.push(
      t("curator.quickPrompt.underused", {
        defaultValue: "Which pipes in my collection are the most underused right now?",
      })
    );
  }

  if (pipes.length === 0) {
    prompts.push(
      t("curator.quickPrompt.startBuilding", {
        defaultValue: "How should I start building my first pipe collection?",
      })
    );
  } else if (pipes.length < 5) {
    prompts.push(
      t("curator.quickPrompt.nextPipe", {
        defaultValue: "What type of pipe would best round out what I already own?",
      })
    );
  }

  const blendTypes = new Set(blends.map((b) => b?.blend_type).filter(Boolean));

  if (blends.length >= 5 && blendTypes.size < 3) {
    prompts.push(
      t("curator.quickPrompt.cellarDiversity", {
        defaultValue: "How balanced is my tobacco cellar right now?",
      })
    );
  }

  if (logs.length > 5) {
    prompts.push(
      t("curator.quickPrompt.tonightPipe", {
        defaultValue: "Based on my collection, what should I smoke tonight?",
      })
    );
  }

  if (pipes.length >= 3 && logs.length > 0) {
    prompts.push(
      t("curator.quickPrompt.rotation", {
        defaultValue: "Help me build a better rotation from my current pipes.",
      })
    );
  }

  if (pipes.length >= 5) {
    prompts.push(
      t("curator.quickPrompt.value", {
        defaultValue: "What stands out as most valuable or overlooked in my collection?",
      })
    );
  }

  if (bottles.length > 0 && blends.length > 0) {
    prompts.push(
      t("curator.quickPrompt.crossPairing", {
        defaultValue: "Which of my whiskey bottles pairs best with my tobacco collection?",
      })
    );
  }

  if (prompts.length === 0) {
    prompts.push(
      t("curator.quickPrompt.default1", {
        defaultValue: "What should I focus on first in my collection?",
      }),
      t("curator.quickPrompt.default2", {
        defaultValue: "What are the biggest strengths of my collection right now?",
      }),
      t("curator.quickPrompt.default3", {
        defaultValue: "What should I improve next?",
      })
    );
  }

  return prompts.slice(0, 4);
}

function resolveWorkspaceLaunchContext(launchContext, preFilledPrompt, routedContext) {
  const context = launchContext?.recommendationContext || routedContext || null;

  const initialPrompt =
    String(launchContext?.initialPrompt || "").trim() ||
    String(context?.originalPrompt || "").trim() ||
    String(context?.originalInsight || "").trim() ||
    String(context?.whatif_prompt || "").trim() ||
    String(context?.prompt || "").trim() ||
    String(preFilledPrompt || "").trim() ||
    "";

  return {
    source: launchContext?.source || "workspace_fallback",
    initialPrompt,
    recommendationContext: context,
    actionType: launchContext?.actionType || null,
    sourceAction: launchContext?.sourceAction || null,
    executionMode: launchContext?.executionMode || null,
    executionId: launchContext?.executionId || null,
    sourceExpert: launchContext?.sourceExpert || null,
    displayLabel: launchContext?.displayLabel || null,
    displayStatus: launchContext?.displayStatus || null,
  };
}

function humanizeFieldLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeFieldValue(value) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function MessageBubble({
  message,
  onAcceptAdvice,
  onRejectAdvice,
  onAskCuratorAboutAdvice,
}) {
  const isUser = message.role === "user";
  const actionItems = Array.isArray(message?.meta?.actionItems)
    ? message.meta.actionItems
    : [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-3 ${isUser ? "text-white" : "text-[#E0D8C8]"}`}
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
              skipHtml
              components={{
                p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-amber-300">{children}</strong>
                ),
                em: ({ children }) => <em className="italic text-[#E0D8C8]/90">{children}</em>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && actionItems.length > 0 ? (
          <div className="mt-3 space-y-3">
            {actionItems.map((item) => (
              <CuratorActionResultCard
                key={item.id}
                item={item}
                state={message?.meta?.itemStates?.[item.id] || { status: "idle", error: null }}
                onAccept={() => onAcceptAdvice(item, message.id)}
                onReject={() => onRejectAdvice(item, message.id)}
                onAskCurator={() => onAskCuratorAboutAdvice(item)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CuratorWorkspace({
  pipes = [],
  blends = [],
  bottles = [],
  smokingLogs = [],
  tastingLogs = [],
  userProfile = null,
  preFilledPrompt,
  routedContext,
  launchContext,
  onPromptConsumed,
}) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [threadId, setThreadId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState("");
  const [actionRun, setActionRun] = useState(null);
  const [itemStates, setItemStates] = useState({});
  const [lastActionRequest, setLastActionRequest] = useState(null); // { actionType, anchorOverrides }
  const [pendingFindSimilar, setPendingFindSimilar] = useState(null); // actionType needing anchor pick

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const threadInitPromiseRef = useRef(null);
  const sessionStartedRef = useRef(false);
  const startupConsumedRef = useRef(false);
  const handledActionRef = useRef(null);

  const { data: fetchedLogs = [] } = useQuery({
    queryKey: ["smokingLogs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const effectiveSmokingLogs = smokingLogs?.length ? smokingLogs : fetchedLogs;

  const tasteProfile = useTasteProfile({
    pipes,
    blends,
    bottles,
    smokingLogs: effectiveSmokingLogs,
    tastingLogs,
    profile: userProfile,
  });

  const buildCuratorContext = useCallback(
    () => ({
      pipes: pipes || [],
      blends: blends || [],
      bottles: bottles || [],
      smokingLogs: effectiveSmokingLogs || [],
      tastingLogs: tastingLogs || [],
      userProfile: userProfile || null,
      tasteProfile: tasteProfile || null,
      activeModule: "curator",
    }),
    [pipes, blends, bottles, effectiveSmokingLogs, tastingLogs, userProfile, tasteProfile]
  );

  const logCuratorAuditEvent = useCallback(async (payload) => {
    try {
      if (base44.entities.CuratorEvent?.create) {
        await base44.entities.CuratorEvent.create(payload);
      }
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.warn("[Curator] Audit log failed (non-blocking):", err?.message);
      }
    }
  }, []);

  const resolvedLaunchContext = useMemo(
    () => resolveWorkspaceLaunchContext(launchContext, preFilledPrompt, routedContext),
    [launchContext, preFilledPrompt, routedContext]
  );

  const resolvedContextRef = useRef(resolvedLaunchContext);
  useEffect(() => {
    resolvedContextRef.current = resolvedLaunchContext;
  }, [resolvedLaunchContext]);

  const quickPrompts = useMemo(
    () =>
      generateQuickPrompts({
        pipes,
        blends,
        logs: effectiveSmokingLogs,
        bottles,
        userProfile,
        t,
      }),
    [pipes, blends, effectiveSmokingLogs, bottles, userProfile, t]
  );

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior,
        block: "end",
      });
      return;
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, sending, actionRun, scrollToBottom]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      scrollToBottom("smooth");
    }, 80);

    return () => window.clearTimeout(id);
  }, [messages.length, actionRun?.status, scrollToBottom]);

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
          throw new Error(
            t("curator.threadCreateNoId", {
              defaultValue: "Thread created without an ID.",
            })
          );
        }

        setThreadId(id);

        if (!sessionStartedRef.current) {
          const sessionData = await startCuratorSession({
            agentConversationId: id,
            originatingRecommendation: resolvedContextRef.current?.recommendationContext || null,
            initialPrompt: resolvedContextRef.current?.initialPrompt || "",
            pipesCount: pipes.length,
            blendsCount: blends.length,
          });

          if (sessionData?.session_id) {
            setSessionId(sessionData.session_id);
            sessionStartedRef.current = true;
          }
        }

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
  }, [threadId, t, pipes.length, blends.length]);

  useEffect(() => {
    if (!user?.id || threadId) return;
    ensureThread().catch((e) => {
      console.error("Failed to initialize curator thread:", e);
    });
  }, [user?.id, threadId, ensureThread]);

  const sendMessage = useCallback(
    async (textOverride = null, contextOverride = null) => {
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

        const safeCtx = buildSafeCollectionContext({
          pipes,
          blends,
          bottles,
          smokingLogs: effectiveSmokingLogs,
          tastingLogs,
          userProfile,
        });

        const collectionBlock = buildPromptBlock(safeCtx);
        const tasteProfileContext = buildTasteProfileContext(tasteProfile);
        const blendTypesList = BLEND_TYPES.join(", ");

        const activitySummary = buildCuratorActivitySummary({
          pipes,
          blends,
          bottles,
          smokingLogs: effectiveSmokingLogs,
          tastingLogs,
        });

        const systemPrompt = buildCuratorChatSystemPrompt();

        let contextMessage = `TOBACCO BLEND TYPE VOCABULARY (always use these exact terms when referring to blend types):
${blendTypesList}

${collectionBlock}

${tasteProfileContext ? `${tasteProfileContext}\n\n` : ""}${activitySummary}

${systemPrompt}

USER QUESTION:
${englishText}`;

        const activeContext =
          contextOverride || resolvedContextRef.current?.recommendationContext;

        if (messages.length === 0 && activeContext) {
          const selectedPipeName = activeContext.pipeName || activeContext.pipe_name || "";
          const selectedBlendName = activeContext.blendName || activeContext.blend_name || "";
          const selectedBottleName = activeContext.bottleName || activeContext.bottle_name || "";

          if (selectedPipeName || selectedBlendName || selectedBottleName) {
            contextMessage += `

AUTHORITATIVE APP SELECTION:
${selectedPipeName ? `- Selected Pipe: "${selectedPipeName}"` : ""}
${selectedBlendName ? `- Selected Tobacco: "${selectedBlendName}"` : ""}
${selectedBottleName ? `- Selected Bottle: "${selectedBottleName}"` : ""}`;
          }
        }

        await base44.agents.addMessage(conversation, {
          role: "user",
          content: contextMessage,
        });

        const waitForResponse = async (maxWait = 90000) => {
          const startTime = Date.now();

          while (Date.now() - startTime < maxWait) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const updated = await base44.agents.getConversation(ensuredThreadId);
            const lastMsg = updated?.messages?.[updated.messages.length - 1];
            if (lastMsg?.role === "assistant" && lastMsg?.content) {
              return lastMsg.content;
            }
          }

          throw new Error("Response timeout");
        };

        const assistantResponse = await waitForResponse();
        const sanitizedResponse = validateOwnershipIntegrity(
          assistantResponse,
          pipes,
          blends,
          bottles
        );

        const { cleanedText, items: actionItems } =
          extractActionableAdvice(sanitizedResponse);

        const translatedResponse = await translateFromEnglish(cleanedText, locale);

        setMessages((prev) => {
          const withoutLocal = prev.filter((m) => m.id !== optimisticId);
          return [
            ...withoutLocal,
            { id: `user-${Date.now()}`, role: "user", content: text, meta: {} },
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: translatedResponse,
              meta: {
                actionItems,
              },
            },
          ];
        });

        if (sessionId) {
          try {
            await base44.functions.invoke("persistCuratorMessage", {
              session_id: sessionId,
              role: "user",
              content: text,
            });

            await base44.functions.invoke("persistCuratorMessage", {
              session_id: sessionId,
              role: "assistant",
              content: translatedResponse,
            });
          } catch (persistError) {
            console.error("Failed to persist curator messages:", persistError);
          }
        }

        await CuratorEvents.messageSent({
          sessionId,
          metadata: {
            message_length: text.length,
            is_initial: messages.length === 0,
            launch_source: resolvedContextRef.current?.source || "unknown",
          },
        });

        return true;
      } catch (e) {
        console.error("Curator send failed:", e);
        const msg = e?.message || String(e);
        setInitError(msg);
        toast.error(
          `${t("curator.sendError", {
            defaultValue: "Failed to start Curator",
          })}: ${msg.slice(0, 120)}`
        );
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        if (textOverride) setInput(text);
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      input,
      sending,
      ensureThread,
      t,
      pipes,
      blends,
      bottles,
      effectiveSmokingLogs,
      tastingLogs,
      userProfile,
      tasteProfile,
      messages.length,
      sessionId,
    ]
  );

  const FIND_SIMILAR_ACTIONS = ["find_similar_blends", "find_similar_pipes", "find_similar_bottles"];

  const handleExpertAction = useCallback(
    async (actionType, anchorOverrides) => {
      // For find-similar actions, show picker first unless anchors already provided
      if (FIND_SIMILAR_ACTIONS.includes(actionType) && !anchorOverrides) {
        setPendingFindSimilar(actionType);
        return;
      }

      console.log("[Curator] action start", { actionType, hasAnchors: !!anchorOverrides, anchorOverrides });
      setLastActionRequest({ actionType, anchorOverrides });
      setItemStates({});

      const requestId =
        globalThis.crypto?.randomUUID?.() || `${actionType}_${Date.now()}`;

      setActionRun({
        requestId,
        actionType,
        status: "running",
        summary: "",
        items: [],
        error: null,
        startedAt: Date.now(),
      });

      try {
        console.log("[Curator] runCuratorAction call", { actionType, hasAnchors: !!anchorOverrides });
        const result = await runCuratorAction({
          actionType,
          executor: curatorActionExecutor,
          normalizer: normalizeCuratorActionResult,
          context: buildCuratorContext(),
          onAudit: logCuratorAuditEvent,
          anchorOverrides,
        });

        setActionRun(result);
      } catch (err) {
        setActionRun({
          requestId,
          actionType,
          status: "error",
          summary: "",
          items: [],
          error: err?.message || "Curator failed",
        });
      } finally {
        if (onPromptConsumed) onPromptConsumed();
      }
    },
    [buildCuratorContext, logCuratorAuditEvent, onPromptConsumed]
  );

  useEffect(() => {
    const actionType =
      resolvedLaunchContext?.actionType ||
      resolvedLaunchContext?.sourceAction ||
      resolvedLaunchContext?.recommendationContext?.actionType ||
      null;

    const executionMode = resolvedLaunchContext?.executionMode || null;
    const launchKey = `${executionMode || "none"}:${actionType || "none"}:${resolvedLaunchContext?.source || "unknown"}`;

    if (!actionType) return;
    if (executionMode !== "silent_action") return;
    if (sending || initializing) return;
    if (handledActionRef.current === launchKey) return;

    handledActionRef.current = launchKey;
    handleExpertAction(actionType);
  }, [resolvedLaunchContext, sending, initializing, handleExpertAction]);

  useEffect(() => {
    const startupPrompt = String(resolvedLaunchContext?.initialPrompt || "").trim();
    const executionMode = resolvedLaunchContext?.executionMode || null;

    if (!startupPrompt) return;
    if (executionMode === "silent_action") return;
    if (!user?.id) return;
    if (sending || initializing) return;
    if (startupConsumedRef.current) return;
    if (messages.length > 0) return;

    let cancelled = false;

    (async () => {
      try {
        await ensureThread();
        if (cancelled || startupConsumedRef.current) return;

        startupConsumedRef.current = true;
        const ok = await sendMessage(
          startupPrompt,
          resolvedLaunchContext?.recommendationContext || null
        );

        if (ok && onPromptConsumed) {
          onPromptConsumed();
        }

        if (!ok) {
          startupConsumedRef.current = false;
        }
      } catch (e) {
        console.error("Curator routed prompt failed:", e);
        startupConsumedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    resolvedLaunchContext,
    user?.id,
    sending,
    initializing,
    ensureThread,
    sendMessage,
    onPromptConsumed,
    messages.length,
  ]);

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const handleRetryAction = () => {
    if (!lastActionRequest) return;
    console.log("[Curator] retry", lastActionRequest);
    handleExpertAction(lastActionRequest.actionType, lastActionRequest.anchorOverrides);
  };

  const handleFindSimilarConfirm = (anchorItems, isTop3) => {
    const actionType = pendingFindSimilar;
    setPendingFindSimilar(null);
    const anchorConfig = {
      anchors: anchorItems,
      mode: isTop3 ? "top3" : "single",
    };
    console.log("[FindSimilar] handleFindSimilarConfirm:", {
      mode: anchorConfig.mode,
      anchors: anchorItems.map(a => a?.name),
    });
    handleExpertAction(actionType, anchorConfig);
  };

  const handleFindSimilarCancel = () => {
    setPendingFindSimilar(null);
  };

  const handleAcceptRecommendation = async (item, messageId = null) => {
    setItemStates((prev) => ({
      ...prev,
      [item.id]: { status: "applying", error: null },
    }));

    if (messageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                meta: {
                  ...msg.meta,
                  itemStates: {
                    ...(msg.meta?.itemStates || {}),
                    [item.id]: { status: "applying", error: null },
                  },
                },
              }
            : msg
        )
      );
    }

    try {
      const isNonMutating =
        item.type === "pairing_recommendation" || item.type === "session_builder" || item.type === "similar_item";

      if (isNonMutating) {
        try {
          const sessions = JSON.parse(localStorage.getItem("pk_sessions") || "[]");
          const next = [
            { ...item, savedAt: new Date().toISOString() },
            ...sessions.filter((x) => x.id !== item.id),
          ];
          localStorage.setItem("pk_sessions", JSON.stringify(next));
        } catch (e) {
          console.warn("Failed to save session:", e);
        }

        toast.success("Session saved.");
      } else {
        await applyCuratorRecommendation(item);
        toast.success("Recommendation applied.");
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ["pipes"] }),
          queryClient.invalidateQueries({ queryKey: ["blends"] }),
          queryClient.invalidateQueries({ queryKey: ["bottles"] }),
        ]);
      }

      setItemStates((prev) => ({
        ...prev,
        [item.id]: { status: "accepted", error: null },
      }));

      if (messageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  meta: {
                    ...msg.meta,
                    itemStates: {
                      ...(msg.meta?.itemStates || {}),
                      [item.id]: { status: "accepted", error: null },
                    },
                  },
                }
              : msg
          )
        );
      }
    } catch (error) {
      const nextError = error?.message || "Failed to apply recommendation.";

      setItemStates((prev) => ({
        ...prev,
        [item.id]: { status: "error", error: nextError },
      }));

      if (messageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  meta: {
                    ...msg.meta,
                    itemStates: {
                      ...(msg.meta?.itemStates || {}),
                      [item.id]: { status: "error", error: nextError },
                    },
                  },
                }
              : msg
          )
        );
      }

      toast.error("Failed to apply recommendation.");
    }
  };

  const handleRejectRecommendation = (item, messageId = null) => {
    setItemStates((prev) => ({
      ...prev,
      [item.id]: { status: "rejected", error: null },
    }));

    if (messageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                meta: {
                  ...msg.meta,
                  itemStates: {
                    ...(msg.meta?.itemStates || {}),
                    [item.id]: { status: "rejected", error: null },
                  },
                },
              }
            : msg
        )
      );
    }
  };

  const handleAskCuratorAboutRecommendation = (item) => {
    const isSession = item.type === "session_builder" || item.type === "pairing_recommendation";

    let sessionContext = "";
    if (isSession) {
      const parts = [];
      if (item.recordName) parts.push(`Pipe: ${item.recordName}`);
      if (item.blendName) parts.push(`Blend: ${item.blendName}`);
      if (item.bottleName) parts.push(`Pour: ${item.bottleName}`);
      if (parts.length > 0) {
        sessionContext = `\n\nSession: ${parts.join(" | ")}`;
      }
      if (item.rationale) {
        sessionContext += `\nRationale: ${item.rationale}`;
      }
    }

    const proposedEntries = Object.entries(item.proposedChanges || {});
    const formattedChanges =
      proposedEntries.length > 0
        ? proposedEntries
            .map(
              ([key, value]) =>
                `- ${humanizeFieldLabel(key)}: ${humanizeFieldValue(value)}`
            )
            .join("\n")
        : "";

    const basePrompt = item.followUpPrompt ||
      (isSession
        ? `Tell me more about this session recommendation and why it suits my collection.${sessionContext}`
        : `Explain this recommendation in more detail and tell me what would change if I accept it: ${item.title}${formattedChanges ? `\n\nProposed changes:\n${formattedChanges}` : ""}`);

    const contextOverride = isSession ? {
      pipeName: item.recordName,
      blendName: item.blendName,
      bottleName: item.bottleName,
    } : null;

    sendMessage(basePrompt, contextOverride);
  };

  const handleDismissAction = () => {
    setActionRun(null);
    setItemStates({});
    handledActionRef.current = null;
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionId) {
        endCuratorSession({
          sessionId,
          resultedInAction: false,
        }).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sessionId) {
        endCuratorSession({
          sessionId,
          resultedInAction: false,
        });
      }
    };
  }, [sessionId]);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl flex flex-col"
      style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
        border: "1px solid rgba(140,105,65,0.35)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.6)",
        height: "clamp(360px, 90vh, 820px)",
      }}
    >
      <div
        className="px-4 sm:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(20,14,10,0.4)" }}
      >
        <div className="space-y-3">
          {initError ? (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "rgba(139,58,58,0.18)",
                border: "1px solid rgba(139,58,58,0.35)",
                color: "#F5D4D4",
              }}
            >
              <div className="font-semibold mb-1">
                {t("curator.initError", { defaultValue: "Failed to start Curator" })}
              </div>
              <div className="opacity-90 break-words text-xs">{initError}</div>
            </div>
          ) : null}

          {quickPrompts.length > 0 && messages.length === 0 && !actionRun ? (
            <div className="space-y-2">
              <p
                className="text-xs uppercase tracking-wider"
                style={{ color: "rgba(180,140,75,0.6)" }}
              >
                {t("curator.tryAsking", { defaultValue: "Try asking" })}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={sending || initializing}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: "rgba(180,140,75,1)",
                      borderColor: "rgba(140,105,65,0.3)",
                      background: "rgba(100,70,45,0.15)",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0"
        style={{
          background: "rgba(15,10,8,0.3)",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {pendingFindSimilar ? (
          <FindSimilarPicker
            actionType={pendingFindSimilar}
            pipes={pipes}
            blends={blends}
            bottles={bottles}
            smokingLogs={effectiveSmokingLogs}
            tastingLogs={tastingLogs}
            onConfirm={handleFindSimilarConfirm}
            onCancel={handleFindSimilarCancel}
          />
        ) : null}

        <CuratorActionPanel
          actionRun={actionRun}
          itemStates={itemStates}
          onRetry={handleRetryAction}
          onAccept={handleAcceptRecommendation}
          onReject={handleRejectRecommendation}
          onAskCurator={handleAskCuratorAboutRecommendation}
          onDismiss={handleDismissAction}
        />

        <SavedSessionsPanel />

        {messages.length === 0 && !actionRun ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <div className="text-center space-y-3 max-w-md px-4">
              <Sparkles
                className="w-10 h-10 mx-auto"
                style={{ color: "rgba(180,140,75,0.4)" }}
              />
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(224,216,200,0.5)" }}
              >
                {t("curator.emptyConversation", {
                  defaultValue: "Ask Curator a question about your collection to get started.",
                })}
              </p>
            </div>
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onAcceptAdvice={handleAcceptRecommendation}
                onRejectAdvice={handleRejectRecommendation}
                onAskCuratorAboutAdvice={handleAskCuratorAboutRecommendation}
              />
            ))}

            {sending ? (
              <div className="flex justify-start mb-4">
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.7))",
                    border: "1px solid rgba(140,105,65,0.3)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <div
                      className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </>
        ) : null}
      </div>

      <div
        className="px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0"
        style={{
          borderColor: "rgba(140,105,65,0.2)",
          background: "rgba(20,14,10,0.4)",
        }}
      >
        <div className="flex gap-2 sm:gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("curator.inputPlaceholder", {
              defaultValue: "Ask Curator about your collection…",
            })}
            disabled={sending || initializing}
            className="flex-1 bg-white/5 border-white/10 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40 text-sm"
          />
          <Button
            onClick={() => sendMessage(null)}
            disabled={!input.trim() || sending || initializing}
            style={{
              background: "linear-gradient(135deg, rgba(139,58,58,0.95), rgba(109,46,46,1))",
              border: "none",
              flexShrink: 0,
            }}
            className="hover:opacity-90 active:opacity-80 px-3 sm:px-4"
          >
            {sending ? (
              <span className="animate-pulse text-xs sm:text-sm whitespace-nowrap">
                {t("common.sending", { defaultValue: "Sending…" })}
              </span>
            ) : (
              <>
                <Send className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {t("common.send", { defaultValue: "Send" })}
                </span>
              </>
            )}
          </Button>
        </div>

        <p
          className="text-xs mt-1.5 hidden sm:block"
          style={{ color: "rgba(224,216,200,0.4)" }}
        >
          {t("curator.pressEnter", {
            defaultValue: "Press Enter to send. Cmd/Ctrl+Enter also works.",
          })}
        </p>
      </div>
    </div>
  );
}