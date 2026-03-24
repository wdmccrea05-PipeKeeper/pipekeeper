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
import { useTasteProfile, buildTasteProfileContext } from "@/components/curator/useTasteProfile";
import { BLEND_TYPES } from "@/components/tobacco/tobaccoConstants";
import CuratorActionPanel from "./CuratorActionPanel";
import normalizeCuratorActionResult from "./normalizeCuratorActionResult";
import { executeCuratorAction } from "./curatorActionExecutor";
import { runCuratorAction } from "./curatorActionService";
import { applyCuratorRecommendation } from "./curatorApplyHandlers";
import CuratorActionStatusBar from "@/components/curator/CuratorActionStatusBar";
import CuratorActionResultCard from "@/components/curator/CuratorActionResultCard";
import CuratorActionErrorCard from "@/components/curator/CuratorActionErrorCard";
import EmptyActionResultCard from "@/components/curator/EmptyActionResultCard";

const CURATOR_ICON =
  "https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png";
const AGENT_NAME = "expert_tobacconist";
const ACTION_EXECUTION_TIMEOUT = 8000; // 8 seconds hard timeout for expert actions

/**
 * Promise wrapper with timeout
 */
function promiseWithTimeout(promise, ms, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    ),
  ]);
}

function generateQuickPrompts({ pipes = [], blends = [], logs = [], bottles = [], userProfile = null, t }) {
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

  // Cross-collection prompts
  if (bottles.length > 0 && blends.length > 0) {
    prompts.push(
      t("curator.quickPrompt.crossPairing", {
        defaultValue: "Which of my whiskey bottles pairs best with my tobacco collection?",
      })
    );
  }

  if (bottles.length > 0) {
    prompts.push(
      t("curator.quickPrompt.tonightSession", {
        defaultValue: "What's the ideal pipe, tobacco, and whiskey combination for tonight?",
      })
    );
  }

  const whiskyPrefs = userProfile?.whiskey_preferences;
  if (whiskyPrefs?.types?.includes('Scotch') || whiskyPrefs?.flavors?.includes('Peated')) {
    prompts.push(
      t("curator.quickPrompt.peatPairing", {
        defaultValue: "Which Latakia or English blends pair well with my peated Scotch?",
      })
    );
  }

  if (whiskyPrefs?.types?.includes('Bourbon') || whiskyPrefs?.flavors?.includes('Sweet')) {
    prompts.push(
      t("curator.quickPrompt.bourbonPairing", {
        defaultValue: "Which Virginia blends complement my bourbon collection?",
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
              code: ({ inline, children }) =>
                inline ? (
                  <code
                    className="px-1.5 py-0.5 rounded text-amber-300 text-xs font-mono"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className="block px-3 py-2 rounded text-amber-300 text-xs font-mono my-2"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
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
  };
}

export default function CuratorWorkspace({
  pipes = [],
  blends = [],
  bottles = [],
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
  const [lastActionType, setLastActionType] = useState(null);
  const [followUpSeed, setFollowUpSeed] = useState(null);
  const [runningAction, setRunningAction] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [lastExecutionId, setLastExecutionId] = useState(null);

  const messagesEndRef = useRef(null);
  const threadInitPromiseRef = useRef(null);
  const sessionStartedRef = useRef(false);
  const startupConsumedRef = useRef(false);

  const buildCuratorContext = () => {
    return {
      pipes,
      blends,
      bottles,
      tasteProfile: userProfile,
      activeModule: "curator",
    };
  };

  const logCuratorAuditEvent = async (payload) => {
    try {
      await base44.entities.CuratorEvent?.create?.(payload);
    } catch {
      // non-blocking on purpose
    }
  };

  const resolvedLaunchContext = useMemo(
    () => resolveWorkspaceLaunchContext(launchContext, preFilledPrompt, routedContext),
    [launchContext, preFilledPrompt, routedContext]
  );

  const resolvedContextRef = useRef(resolvedLaunchContext);
  useEffect(() => {
    resolvedContextRef.current = resolvedLaunchContext;
  }, [resolvedLaunchContext]);

  const launchContextRef = useRef(launchContext);
  useEffect(() => {
    launchContextRef.current = launchContext;
  }, [launchContext]);

  const { data: logs = [] } = useQuery({
    queryKey: ["smokingLogs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const tasteProfile = useTasteProfile({
    pipes,
    blends,
    bottles,
    smokingLogs: logs,
    tastingLogs,
    profile: userProfile,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const quickPrompts = useMemo(
    () => generateQuickPrompts({ pipes, blends, logs, bottles, userProfile, t }),
    [pipes.length, blends.length, logs.length, bottles.length, userProfile, t]
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

        if (mapped.length > 0) {
          setMessages(mapped);
        }
      } catch (e) {
        console.error("Failed to load curator messages:", e);
      }
    };

    load();
  }, [threadId]);

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

      if (!textOverride) {
        setInput("");
      }

      try {
        const ensuredThreadId = await ensureThread();
        const englishText = await translateToEnglish(text, locale);
        const conversation = await base44.agents.getConversation(ensuredThreadId);

        const safeCtx = buildSafeCollectionContext({
          pipes,
          blends,
          bottles,
          smokingLogs: logs,
          tastingLogs,
          userProfile,
        });
        const collectionBlock = buildPromptBlock(safeCtx);

        const tasteProfileContext = buildTasteProfileContext(tasteProfile);

        const blendTypesList = BLEND_TYPES.join(", ");

        let contextMessage = `TOBACCO BLEND TYPE VOCABULARY (always use these exact terms when referring to blend types):
${blendTypesList}

${collectionBlock}`;

        const activeContext = contextOverride || resolvedContextRef.current?.recommendationContext;

        if (messages.length === 0 && activeContext) {
          const hasAuthoritative =
            activeContext.pipeId || activeContext.blendId || activeContext.bottleId ||
            activeContext.pipe_id || activeContext.blend_id || activeContext.bottle_id;

          if (hasAuthoritative) {
            const selectedPipeName = activeContext.pipeName || activeContext.pipe_name || '';
            const selectedBlendName = activeContext.blendName || activeContext.blend_name || '';
            const selectedBottleName = activeContext.bottleName || activeContext.bottle_name || '';

            contextMessage += `

AUTHORITATIVE APP SELECTION (treat these as confirmed, do NOT question their existence):
${selectedPipeName ? `- Selected Pipe: "${selectedPipeName}" (ID confirmed by app)` : ''}
${selectedBlendName ? `- Selected Tobacco: "${selectedBlendName}" (ID confirmed by app)` : ''}
${selectedBottleName ? `- Selected Bottle: "${selectedBottleName}" (ID confirmed by app)` : ''}

INSTRUCTION: These items were explicitly selected by the user in the app. Do NOT ask if they exist or challenge the selection. Treat them as the starting point and give direct, confident advice.`;
          } else if (
            activeContext.originalTitle ||
            activeContext.originalInsight ||
            activeContext.module ||
            activeContext.category
          ) {
            contextMessage += `

ORIGINAL RECOMMENDATION CONTEXT:
Title: ${activeContext.originalTitle || "N/A"}
Insight: ${activeContext.originalInsight || "N/A"}
Module: ${activeContext.module || "general"}
Category: ${activeContext.category || "general"}`;
          }
        }

        if (tasteProfileContext) {
          contextMessage += `\n\n${tasteProfileContext}`;
        }

        contextMessage += `

USER QUESTION:
${englishText}`;

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
        
        const sanitizedResponse = validateOwnershipIntegrity(assistantResponse, pipes, blends, bottles);
        
        const translatedResponse = await translateFromEnglish(sanitizedResponse, locale);

        const userMsgIndex = messages.filter((m) => m.role === "user").length;
        const assistantMsgIndex = messages.filter((m) => m.role === "assistant").length;

        setMessages((prev) => {
          const withoutLocal = prev.filter((m) => m.id !== optimisticId);
          
          return [
            ...withoutLocal,
            { id: `user-${Date.now()}`, role: "user", content: text, meta: {} },
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: translatedResponse,
              meta: {},
            },
          ];
        });

        // CRITICAL: Do NOT add raw response to chat thread for action execution
        // Actions use separate executeCuratorAction path with result cards

        if (sessionId) {
          try {
            await base44.functions.invoke('persistCuratorMessage', {
              session_id: sessionId,
              role: 'user',
              content: text,
              message_index: userMsgIndex,
            });

            await base44.functions.invoke('persistCuratorMessage', {
              session_id: sessionId,
              role: 'assistant',
              content: translatedResponse,
              message_index: assistantMsgIndex,
            });
          } catch (persistError) {
            console.error('Failed to persist curator messages:', persistError);
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

        if (textOverride) {
          setInput(text);
        }

        return false;
      } finally {
        setSending(false);
      }
    },
    [input, sending, ensureThread, t, pipes, blends, bottles, tastingLogs, userProfile, tasteProfile, messages.length, sessionId, messages, launchContext]
  );

  // STARTUP ROUTED PROMPTS (one-time only)
  useEffect(() => {
    const startupPrompt = String(resolvedLaunchContext?.initialPrompt || "").trim();

    if (!startupPrompt) return;
    if (!user?.id) return;
    if (sending || initializing) return;
    if (startupConsumedRef.current) return;
    if (messages.length > 0) return;
    if (resolvedLaunchContext?.executionMode === 'silent_action') {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await ensureThread();

        if (cancelled || startupConsumedRef.current) return;

        startupConsumedRef.current = true;
        console.log("[CuratorWorkspace] Sending startup routed prompt");
        const ok = await sendMessage(startupPrompt, resolvedLaunchContext?.recommendationContext || null);

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

  // EXPERT ACTION EXECUTION — independent path with timeout
  useEffect(() => {
    const execId = launchContext?.executionId;
    const actionId = launchContext?.sourceAction;

    if (!execId || !actionId) return;
    if (launchContext?.executionMode !== 'silent_action') return;
    if (!user?.id) return;
    if (lastExecutionId === execId) {
      console.log(`[CuratorWorkspace] Execution ${execId} already ran, skipping`);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        console.log(`[CuratorWorkspace] Starting action execution: ${execId}`);
        setRunningAction(launchContext?.displayLabel || 'Running expert analysis…');
        setLastExecutionId(execId);
        setActionResult(null);
        setActionError(null);

        // Wrap with timeout
        const result = await promiseWithTimeout(
          executeCuratorAction({
            actionId,
            executionId: execId,
            displayLabel: launchContext?.displayLabel,
            userPrompt: launchContext?._internalPrompt || "Analyze and recommend optimizations",
            collectionContext: {
              pipes,
              blends,
              bottles,
              smokingLogs: logs,
              tastingLogs,
            },
            user,
            launchContext,
          }),
          ACTION_EXECUTION_TIMEOUT,
          "This recommendation took too long to complete. Please try again."
        );

        if (!cancelled) {
          console.log(`[CuratorWorkspace] Action completed: ${execId}`);
          
          try {
            const parsed = typeof result.result === "string" 
              ? parseCuratorActionResponse(result.result)
              : result.result;
            
            const normalized = normalizeCuratorActionResult(parsed, {
              actionId: actionId,
              executionId: execId,
              title: launchContext?.displayLabel || "Curator Analysis"
            });
            
            setActionResult(normalized);
            setActionError(null);
            setRunningAction(null);
          } catch (normErr) {
            console.error(`[CuratorWorkspace] Result normalization failed: ${execId}`, normErr);
            setActionError({
              title: "Curator action could not be completed",
              message: normErr?.message || "The response could not be processed into actionable insights.",
              error: normErr?.message || "Normalization failed"
            });
            setActionResult(null);
            setRunningAction(null);
          }
          
          if (onPromptConsumed) {
            onPromptConsumed();
          }
        }
      } catch (err) {
        console.error(`[CuratorWorkspace] Action execution failed: ${execId}`, err);
        if (!cancelled) {
          setRunningAction(null);
          setActionError({
            title: "Curator action could not be completed",
            message: err?.message || "The action response could not be processed.",
            error: err?.message || "Unknown error"
          });
          setActionResult(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    launchContext?.executionId,
    launchContext?.sourceAction,
    launchContext?.executionMode,
    user?.id,
    pipes.length,
    blends.length,
    bottles.length,
    onPromptConsumed,
    lastExecutionId,
  ]);

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const handleExpertAction = async (actionType) => {
    setLastActionType(actionType);
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

    const result = await runCuratorAction({
      actionType,
      executor: executeCuratorAction,
      normalizer: normalizeCuratorActionResult,
      context: buildCuratorContext(),
      onAudit: logCuratorAuditEvent,
    });

    setActionRun(result);
  };

  const handleRetryAction = () => {
    if (!lastActionType) return;
    handleExpertAction(lastActionType);
  };

  const handleAcceptRecommendation = async (item) => {
    setItemStates((prev) => ({
      ...prev,
      [item.id]: { status: "applying", error: null },
    }));

    try {
      await applyCuratorRecommendation(item);

      setItemStates((prev) => ({
        ...prev,
        [item.id]: { status: "accepted", error: null },
      }));

      toast.success("Recommendation applied.");

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["pipes"] }),
        queryClient.invalidateQueries({ queryKey: ["blends"] }),
        queryClient.invalidateQueries({ queryKey: ["bottles"] }),
      ]);
    } catch (error) {
      setItemStates((prev) => ({
        ...prev,
        [item.id]: {
          status: "error",
          error: error?.message || "Failed to apply recommendation.",
        },
      }));

      toast.error("Failed to apply recommendation.");
    }
  };

  const handleRejectRecommendation = (item) => {
    setItemStates((prev) => ({
      ...prev,
      [item.id]: { status: "rejected", error: null },
    }));
  };

  const handleAskCuratorAboutRecommendation = (item) => {
    setFollowUpSeed({
      recommendationId: item.id,
      recordId: item.recordId,
      recordType: item.recordType,
      title: item.title,
      followUpPrompt: item.followUpPrompt,
      proposedChanges: item.proposedChanges,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `followup_${item.id}_${Date.now()}`,
        role: "user",
        content: item.followUpPrompt,
        metadata: {
          source: "curator_action_followup",
          recommendationId: item.id,
          recordId: item.recordId,
          recordType: item.recordType,
        },
      },
    ]);
  };

  const handleDismissAction = () => {
    setActionResult(null);
    setItemStates({});
  };

  const handleAskFollowUp = () => {
    setActionResult(null);
    setItemStates({});
    setTimeout(() => document.querySelector('input[placeholder*="Ask Curator"]')?.focus(), 100);
  };

  const handleRegenerateAction = (mode = 'standard') => {
    const currentActionId = launchContextRef.current?.sourceAction;
    if (!currentActionId) return;

    setActionResult(null);
    setActionError(null);
    setItemStates({});
    setLastExecutionId(null);

    const newExecutionId = `${currentActionId}_regen_${Date.now()}`;

    if (launchContextRef.current && typeof window !== 'undefined') {
      window.__curatorRegenContext = {
        ...launchContextRef.current,
        executionId: newExecutionId,
        regenerateMode: mode,
        displayLabel: mode === 'broaden'
          ? 'Broadening analysis…'
          : mode === 'narrow'
          ? 'Finding best matches…'
          : 'Regenerating analysis…',
      };
      window.dispatchEvent(new CustomEvent('curator_regen', { detail: { mode, executionId: newExecutionId } }));
    }
  };

  useEffect(() => {
    const handler = async (e) => {
      const regenCtx = window.__curatorRegenContext;
      if (!regenCtx || !user?.id) return;
      window.__curatorRegenContext = null;

      const { executionId: newExecId, sourceAction, regenerateMode, displayLabel } = regenCtx;

      try {
        setRunningAction(displayLabel || 'Regenerating…');
        setLastExecutionId(newExecId);
        setActionResult(null);
        setActionError(null);

        const result = await promiseWithTimeout(
         executeCuratorAction({
           actionId: sourceAction,
           executionId: newExecId,
           displayLabel,
           userPrompt: regenCtx._internalPrompt || "Analyze and recommend optimizations",
           collectionContext: {
             pipes,
             blends,
             bottles,
             smokingLogs: logs,
             tastingLogs,
           },
           user,
           launchContext: { ...regenCtx, regenerateMode },
         }),
         ACTION_EXECUTION_TIMEOUT,
         "This recommendation took too long to complete. Please try again."
        );

        try {
         const parsed = typeof result.result === "string"
           ? parseCuratorActionResponse(result.result)
           : result.result;
         const normalized = normalizeCuratorActionResult(parsed, {
           actionId: sourceAction,
           executionId: newExecId,
           title: displayLabel,
         });
         setActionResult(normalized);
         setActionError(null);
         setRunningAction(null);
        } catch (normErr) {
         console.error(`[CuratorWorkspace] Regeneration normalization failed: ${newExecId}`, normErr);
         setRunningAction(null);
         setActionError({
           title: "Analysis could not be completed",
           message: "No actionable results were generated. Try refining your request and try again.",
           error: normErr?.message || "Normalization failed"
         });
         setActionResult(null);
        }
        } catch (err) {
        setRunningAction(null);
        setActionError({
         title: "Analysis could not be completed",
         message: err?.message === "Response timeout"
           ? "This analysis took too long to complete. Try refining your request."
           : err?.message || "Could not complete the analysis.",
         error: err?.message,
        });
      }
    };

    window.addEventListener('curator_regen', handler);
    return () => window.removeEventListener('curator_regen', handler);
  }, [user?.id, pipes, blends, bottles, logs, tastingLogs]);

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
      if (document.visibilityState === 'hidden' && sessionId) {
        endCuratorSession({
          sessionId,
          resultedInAction: false,
        }).catch((e) => console.warn('Failed to close session on visibility change:', e));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
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
        height: "clamp(480px, 75vh, 820px)",
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

          {quickPrompts.length > 0 && messages.length === 0 ? (
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
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
        style={{ background: "rgba(15,10,8,0.3)", overscrollBehavior: "contain" }}
      >
        <CuratorActionPanel
          actionRun={actionRun}
          itemStates={itemStates}
          onRetry={handleRetryAction}
          onAccept={handleAcceptRecommendation}
          onReject={handleRejectRecommendation}
          onAskCurator={handleAskCuratorAboutRecommendation}
        />

        {runningAction && (
          <CuratorActionStatusBar actionLabel={runningAction} isRunning={true} />
        )}
        
        {actionError && !runningAction && (
          <CuratorActionErrorCard
            error={actionError}
            onRetry={() => {
              setActionError(null);
              setItemStates({});
              setLastExecutionId(null);
            }}
            onAskCurator={() => {
              setActionError(null);
              setInput("I need help understanding this. Can you explain in more detail?");
              document.querySelector('input[placeholder*="Ask Curator"]')?.focus();
            }}
          />
        )}
        
        {actionResult && !runningAction && !actionError && !actionRun && (
          <div className="mb-4 space-y-2">
            {actionResult.items && actionResult.items.length > 0 ? (
              <>
                <p style={{ color: "rgba(224,216,200,0.7)" }} className="text-sm mb-3">
                  {actionResult.summary}
                </p>
                {actionResult.items.map((item) => (
                  <CuratorActionResultCard
                    key={item.id}
                    item={item}
                    isApplying={itemStates[item.id]?.status === "applying"}
                    isAccepted={itemStates[item.id]?.status === "accepted"}
                    isRejected={itemStates[item.id]?.status === "rejected"}
                    onAccept={() => handleAcceptRecommendation(item)}
                    onReject={() => handleRejectRecommendation(item)}
                    onAskCurator={() => handleAskCuratorAboutItem(item)}
                  />
                ))}
              </>
            ) : (
              <EmptyActionResultCard
                summary={actionResult.summary}
                onAskCurator={handleAskFollowUp}
                onDismiss={handleDismissAction}
              />
            )}
          </div>
        )}
        
        {messages.length === 0 && !runningAction ? (
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
              <MessageBubble key={msg.id} message={msg} />
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
                <span className="hidden sm:inline">{t("common.send", { defaultValue: "Send" })}</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-xs mt-1.5 hidden sm:block" style={{ color: "rgba(224,216,200,0.4)" }}>
          {t("curator.pressEnter", {
            defaultValue: "Press Enter to send. Cmd/Ctrl+Enter also works.",
          })}
        </p>
      </div>
    </div>
  );
}