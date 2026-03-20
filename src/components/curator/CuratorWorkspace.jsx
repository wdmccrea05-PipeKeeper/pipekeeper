import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
const parseActionResult = () => null; // TODO: implement if needed
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
import { useQuery } from "@tanstack/react-query";
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
import { executeCuratorAction } from "@/components/curator/curatorActionExecutor";
import { applyAllRecommendations, buildClarificationPrompt } from "@/components/curator/curatorApplyHandlers";
import CuratorActionStatusBar from "@/components/curator/CuratorActionStatusBar";
import CuratorActionResultCard from "@/components/curator/CuratorActionResultCard";

const CURATOR_ICON =
  "https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png";
const AGENT_NAME = "expert_tobacconist";

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

  // CRITICAL FIX:
  // The clicked recommendation text must beat the generic mapped prompt.
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

  const [threadId, setThreadId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState("");
  const [runningAction, setRunningAction] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [lastExecutionId, setLastExecutionId] = useState(null);

  const messagesEndRef = useRef(null);
  const threadInitPromiseRef = useRef(null);
  const sessionStartedRef = useRef(false);
  const startupConsumedRef = useRef(false);
  const executedActionIdRef = useRef(null);

  const resolvedLaunchContext = useMemo(
    () => resolveWorkspaceLaunchContext(launchContext, preFilledPrompt, routedContext),
    [launchContext, preFilledPrompt, routedContext]
  );

  const resolvedContextRef = useRef(resolvedLaunchContext);
  useEffect(() => {
    resolvedContextRef.current = resolvedLaunchContext;
  }, [resolvedLaunchContext]);

  const { data: logs = [] } = useQuery({
    queryKey: ["smokingLogs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // Derive adaptive taste profile from all collection signals
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
    async (textOverride = null, contextOverride = null, isActionExecution = false, actionLaunchContext = null) => {
      const text = String(textOverride ?? input).trim();
      if (!text || sending) return false;

      setSending(true);
      setInitError("");

      const locale = getCurrentLocale();
      const optimisticId = `local-${Date.now()}`;
      
      // Only add optimistic user message if NOT a silent action
      const optimistic = { id: optimisticId, role: "user", content: text, meta: {} };

      if (!isActionExecution) {
        setMessages((prev) => [...prev, optimistic]);
      }

      if (!textOverride) {
        setInput("");
      }

      try {
        const ensuredThreadId = await ensureThread();
        const englishText = await translateToEnglish(text, locale);
        const conversation = await base44.agents.getConversation(ensuredThreadId);

        const pipesList = pipes
          .map(
            (p) =>
              `- ${p.name || "Unnamed Pipe"} (${p.maker || "unknown maker"}, ${p.shape || "unknown shape"}${
                p.focus?.length ? `, focus: ${p.focus.join(", ")}` : ""
              })`
          )
          .join("\n");

        const blendsList = blends
          .map(
            (b) =>
              `- ${b.name || "Unnamed Blend"} (${b.manufacturer || "unknown"}, ${
                b.blend_type || "unknown type"
              }${b.strength ? `, ${b.strength}` : ""})`
          )
          .join("\n");

        const bottlesList = bottles
          .slice(0, 20)
          .map(
            (b) =>
              `- ${b.name || "Unnamed Bottle"} (${b.distillery || "unknown"}, ${b.whiskey_type || b.type || "unknown type"}${b.age_years ? `, ${b.age_years}yr` : ""}${b.abv ? `, ${b.abv}% ABV` : ""}${b.rating ? `, rated ${b.rating}/5` : ""})`
          )
          .join("\n");

        const tastingsList = tastingLogs
          .slice(0, 10)
          .map((t) => `- ${t.bottle_name || "Unknown bottle"}: ${(t.flavor_notes || []).join(", ") || "no notes"}${t.rating ? `, ${t.rating}/5` : ""}`)
          .join("\n");

        const whiskyPrefs = userProfile?.whiskey_preferences;
        const prefContext = userProfile ? `
USER PREFERENCES:
Tobacco strength: ${userProfile.strength_preference || "any"}
Preferred blend types: ${(userProfile.preferred_blend_types || []).join(", ") || "any"}
Preferred pipe shapes: ${(userProfile.preferred_shapes || []).join(", ") || "any"}
Pipe size preference: ${userProfile.pipe_size_preference || "any"}
Whiskey types: ${(whiskyPrefs?.types || []).join(", ") || "any"}
Whiskey flavors: ${(whiskyPrefs?.flavors || []).join(", ") || "any"}
Drinking style: ${(whiskyPrefs?.drinking_style || []).join(", ") || "any"}
Cocktail preferences: ${(whiskyPrefs?.cocktails || []).join(", ") || "any"}` : "";

        // Build adaptive taste profile context
        const tasteProfileContext = buildTasteProfileContext(tasteProfile);

        const blendTypesList = BLEND_TYPES.join(", ");

        let contextMessage = `TOBACCO BLEND TYPE VOCABULARY (always use these exact terms when referring to blend types):
${blendTypesList}

USER COLLECTION:

PIPES (${pipes.length} total):
${pipesList || "None yet"}

TOBACCOS (${blends.length} total):
${blendsList || "None yet"}

WHISKEY BOTTLES (${bottles.length} total):
${bottlesList || "None yet"}

RECENT TASTINGS (${tastingLogs.length} total):
${tastingsList || "None yet"}
${prefContext}`;

        const activeContext = contextOverride || resolvedContextRef.current?.recommendationContext;

        if (messages.length === 0 && activeContext) {
          // Build authoritative app-provided selection context.
          // If specific record IDs were passed, treat them as canonical — do NOT
          // challenge whether they exist or ask the user to confirm them.
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
        
        // CRITICAL HARDENING: Ownership claim guard
        const sanitizedResponse = validateOwnershipIntegrity(assistantResponse, pipes, blends, bottles);
        
        const translatedResponse = await translateFromEnglish(sanitizedResponse, locale);

        const userMsgIndex = messages.filter((m) => m.role === "user").length;
        const assistantMsgIndex = messages.filter((m) => m.role === "assistant").length;

        setMessages((prev) => {
          const withoutLocal = isActionExecution ? prev : prev.filter((m) => m.id !== optimisticId);
          
          // For actions, do NOT add user message (silent execution)
          // Parse response and set as action result card
          if (isActionExecution) {
            return [
              ...withoutLocal,
              {
                id: `action-result-${Date.now()}`,
                role: "assistant",
                content: translatedResponse,
                meta: { source: 'action_execution', actionId: actionLaunchContext?.sourceAction },
              },
            ];
          } else {
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
          }
        });
        
        // Parse action result after message is added
        if (isActionExecution && actionLaunchContext) {
          const actionId = actionLaunchContext.sourceAction || 'unknown';
          const parsed = parseActionResult(actionId, translatedResponse, {
            pipes,
            blends,
            bottles,
          });
          setActionResult(parsed);
        }

        // CRITICAL HARDENING: Persist messages to CuratorMessage
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

  // STARTUP ROUTED PROMPTS (one-time only, messages.length === 0)
  useEffect(() => {
    const startupPrompt = String(resolvedLaunchContext?.initialPrompt || "").trim();

    if (!startupPrompt) return;
    if (!user?.id) return;
    if (sending || initializing) return;
    if (startupConsumedRef.current) return;
    if (messages.length > 0) return; // One-time startup only
    if (resolvedLaunchContext?.executionMode === 'silent_action') return; // Don't use startup path for actions

    let cancelled = false;

    (async () => {
      try {
        await ensureThread();

        if (cancelled || startupConsumedRef.current) return;

        startupConsumedRef.current = true;
        const ok = await sendMessage(startupPrompt, resolvedLaunchContext?.recommendationContext || null, false);

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

  // EXPERT ACTION EXECUTION (independent of chat, keyed by executionId)
  useEffect(() => {
    const execId = launchContext?.executionId;
    const actionId = launchContext?.sourceAction;

    if (!execId || !actionId) return;
    if (launchContext?.executionMode !== 'silent_action') return;
    if (!user?.id) return;
    if (lastExecutionId === execId) return; // Already ran this execution

    let cancelled = false;

    (async () => {
      try {
        setRunningAction(launchContext?.displayLabel || 'Running expert analysis…');
        setLastExecutionId(execId);
        setActionResult(null);

        const result = await executeCuratorAction({
          actionId,
          executionId: execId,
          displayLabel: launchContext?.displayLabel,
          userPrompt: launchContext?._internalPrompt || "Analyze and recommend optimizations",
          collectionContext: {
            pipes,
            blends,
            bottles,
          },
          user,
          launchContext,
        });

        if (!cancelled) {
          setActionResult(result.result);
          setActionError(null); // Clear any previous errors
          setRunningAction(null);
          if (onPromptConsumed) {
            onPromptConsumed();
          }
        }
      } catch (err) {
        console.error("Action execution failed:", err);
        if (!cancelled) {
          setRunningAction(null);
          // Show structured error panel instead of toast
          setActionError({
            title: "Curator action could not be completed",
            subtitle: "The action response could not be processed.",
            reason: err?.message || "Unknown error",
          });
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
  ]);

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const handleApplyActionItems = async (groups, selectedItemIds) => {
    if (!actionResult || !user?.email) return;
    
    setApplyLoading(true);
    try {
      const results = await applyAllRecommendations(groups, user);
      
      // Invalidate affected entity caches
      const queryClient = require("@tanstack/react-query").useQueryClient?.();
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ["pipes"] });
        queryClient.invalidateQueries({ queryKey: ["blends"] });
        queryClient.invalidateQueries({ queryKey: ["bottles"] });
      }
      
      const successCount = results.total.success;
      if (successCount > 0) {
        toast.success(`Applied ${successCount} change${successCount !== 1 ? 's' : ''} to your collection`);
        setActionResult(null);
      }
      
      if (results.total.failed > 0) {
        toast.error(`${results.total.failed} change${results.total.failed !== 1 ? 's' : ''} failed`);
      }
    } catch (err) {
      console.error('Apply failed:', err);
      toast.error("Failed to apply changes");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleClarifyAction = (clarificationContext) => {
    if (!actionResult) return;
    
    // Build clean clarification prompt (no system text)
    const clarifyPrompt = buildClarificationPrompt(clarificationContext);
    
    // Set input and close card
    setInput(clarifyPrompt);
    setActionResult(null);
    
    // Focus input
    setTimeout(() => {
      document.querySelector('input[placeholder*="Ask Curator"]')?.focus();
    }, 100);
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

  // CRITICAL HARDENING: Session lifecycle with visibility-based flush
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionId) {
        // Best-effort close on page hide
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
        /* On mobile fill available viewport height; on larger screens cap at 80vh */
        height: "clamp(480px, 75vh, 820px)",
      }}
    >
      {/* Header — only show errors and quick prompts */}
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

      {/* Messages — scrollable flex-1 area */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
        style={{ background: "rgba(15,10,8,0.3)", overscrollBehavior: "contain" }}
      >
        {/* Status bar during action execution */}
        {runningAction && (
          <CuratorActionStatusBar actionLabel={runningAction} isRunning={true} />
        )}
        
        {/* Action Error Panel */}
        {actionError && !runningAction && (
          <div
            className="mb-4 rounded-xl p-6 border"
            style={{
              background: "rgba(139,58,58,0.15)",
              borderColor: "rgba(139,58,58,0.35)",
            }}
          >
            <h3 className="text-base font-semibold mb-1" style={{ color: "#F5D4D4" }}>
              {actionError.title}
            </h3>
            <p className="text-sm mb-3" style={{ color: "rgba(245,212,212,0.8)" }}>
              {actionError.subtitle}
            </p>
            {actionError.reason && (
              <p className="text-xs mb-4" style={{ color: "rgba(245,212,212,0.7)" }}>
                {actionError.reason}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionError(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setActionError(null);
                  setLastExecutionId(null);
                }}
                style={{
                  background: "linear-gradient(135deg, rgba(139,58,58,0.95), rgba(109,46,46,1))",
                  border: "none",
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        
        {/* Action Result Card — shown instead of chat when action completes */}
        {actionResult && !runningAction && !actionError && (
          <div className="mb-4">
            <CuratorActionResultCard
              actionResult={actionResult}
              onApplyItems={handleApplyActionItems}
              onClarify={handleClarifyAction}
              loading={applyLoading}
            />
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

      {/* Input bar — always pinned to bottom, never clipped */}
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