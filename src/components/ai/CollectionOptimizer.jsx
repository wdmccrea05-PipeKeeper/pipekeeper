// CollectionOptimizer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { safeGetItem, safeSetItem } from "@/components/utils/safeStorage";
import { safeStringify } from "@/components/utils/safeStringify";
import { waitForAssistantMessage } from "@/components/utils/agentWait";
import {
  Loader2,
  Target,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Trophy,
  HelpCircle,
  X,
  Lightbulb,
  CheckCheck,
  Star,
  AlertTriangle,
  Undo,
} from "lucide-react";
import { toast } from "sonner";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generateOptimizationAI } from "@/components/utils/aiGenerators";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries, invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import PhotoUploader from "@/components/PhotoUploader";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { safeToString } from "@/components/utils/SafeRender";
import { FormattedTobacconistResponse } from "@/components/utils/formatTobacconistResponse";
import { getPipeVariantKey, expandPipesToVariants } from "@/components/utils/pipeVariants";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useTranslation } from "@/components/i18n/safeTranslation";

/**
 * Drop-in replacement notes:
 * - Fixes iOS "white screen" by ensuring we NEVER render objects as React children.
 * - Removes remaining beige hex text usage.
 * - Fixes undefined variables (debugContext/startTime) + missing handlers.
 * - Improves follow-up behavior: reuse the SAME agent conversation + strip repeated prefix.
 * - Keeps existing optimization features + dialogs.
 */

const asText = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const stripRepeatedPrefix = (prevText, nextText) => {
  if (!prevText || !nextText) return nextText || "";
  const p = String(prevText).trim();
  const n = String(nextText).trim();
  if (p.length < 80 || n.length < 80) return nextText;

  // Hard prefix match
  if (n.startsWith(p)) {
    const trimmed = n.slice(p.length).trim();
    return trimmed.length ? trimmed : nextText;
  }

  // Soft match: compare first 300 chars
  const pHead = p.slice(0, 300);
  const nHead = n.slice(0, 300);
  if (nHead === pHead) {
    let i = 0;
    while (i < p.length && i < n.length && p[i] === n[i]) i++;
    const trimmed = n.slice(i).trim();
    return trimmed.length ? trimmed : nextText;
  }

  return nextText;
};

class PKErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("PKErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4">
            <div className="font-semibold text-rose-900">{t("errors.somethingWrong")}</div>
            <div className="mt-2 text-sm text-rose-800">
              {String(this.state.error?.message || this.state.error || t("errors.unknownError"))}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function CollectionOptimizerInner({
  pipes,
  blends,
  showWhatIf: initialShowWhatIf = false,
  improvedWhatIf = false, // kept for compatibility
}) {
  if (isAppleBuild) return null;

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(initialShowWhatIf);

  // iOS-safe: load collapse state in useEffect
  useEffect(() => {
    const saved = safeGetItem("collectionOptimizerCollapsed", null);
    if (saved !== null) setIsCollapsed(saved === "true");
  }, []);

  // Ask-the-expert chat state
  const [whatIfQuery, setWhatIfQuery] = useState("");
  const [whatIfFollowUp, setWhatIfFollowUp] = useState("");
  const [whatIfPhotos, setWhatIfPhotos] = useState([]);
  const [whatIfDescription, setWhatIfDescription] = useState("");
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);

  // Optimization apply state
  const [pipeFeedback, setPipeFeedback] = useState({});
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);
  const [userFeedbackHistory, setUserFeedbackHistory] = useState("");
  const [showAcceptAll, setShowAcceptAll] = useState(false);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState({});
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [showPipesList, setShowPipesList] = useState(true);

  // Sticky conversation reuse for agent follow-ups
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const currentConversationIdRef = useRef(null);
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // --- Data for context ---
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const { data: pairingMatrix, isLoading: pairingLoading } = useQuery({
    queryKey: ["pairing-matrix", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.PairingMatrix.filter({
        created_by: user.email,
        is_active: true,
      });
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: usageLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SmokingLog.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
  });

  const contextLoading = pairingLoading || logsLoading;

  // Load active optimization (scoped to current user)
  const { data: activeOpt, isLoading: optLoading } = useQuery({
    queryKey: ["activeOptimization", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.CollectionOptimization.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
  });

  useEffect(() => {
    if (activeOpt?.id) setOptimization(activeOpt);
  }, [activeOpt?.id]);

  // Compute fingerprint and staleness
  const currentFingerprint = useMemo(
    () => buildArtifactFingerprint({ pipes, blends, profile: userProfile }),
    [pipes, blends, userProfile]
  );

  const isStale = useMemo(() => {
    return !!optimization && (!!optimization.input_fingerprint && optimization.input_fingerprint !== currentFingerprint);
  }, [optimization, currentFingerprint]);

  const [lastShownOptId, setLastShownOptId] = useState(null);
  useEffect(() => {
    if (isStale && optimization?.id && lastShownOptId !== optimization.id) {
      setShowRegenDialog(true);
      setLastShownOptId(optimization.id);
    }
  }, [isStale, optimization?.id, lastShownOptId]);

  // --- Mutations ---
  const saveOptimizationMutation = useMutation({
    mutationFn: async (data) => {
      if (optimization?.id) {
        await safeUpdate("CollectionOptimization", optimization.id, { is_active: false }, user?.email);
      }
      return base44.entities.CollectionOptimization.create({
        created_by: user?.email,
        is_active: true,
        previous_active_id: optimization?.id || null,
        input_fingerprint: currentFingerprint,
        pipe_specializations: data.pipe_specializations,
        collection_gaps: data.collection_gaps,
        priority_focus_changes: data.priority_focus_changes,
        next_pipe_recommendations: data.next_pipe_recommendations,
        generated_date: data.generated_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeOptimization", user?.email] });
    },
  });

  const undoOptimizationMutation = useMutation({
    mutationFn: async () => {
      if (!optimization?.previous_active_id) throw new Error("No previous version to undo to");
      await safeUpdate("CollectionOptimization", optimization.id, { is_active: false }, user?.email);
      await safeUpdate("CollectionOptimization", optimization.previous_active_id, { is_active: true }, user?.email);
    },
    onSuccess: () => {
      invalidateAIQueries(queryClient, user?.email);
      setShowRegenDialog(false);
    },
  });

  const updatePipeMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate("Pipe", id, data, user?.email),
    onSuccess: () => invalidatePipeQueries(queryClient, user?.email),
  });

  // --- Helpers ---
  const getUsageStats = () => {
    const usageStats = {};
    usageLogs.forEach((log) => {
      if (!log.pipe_id) return;
      if (!usageStats[log.pipe_id]) usageStats[log.pipe_id] = { count: 0, lastUsed: null };
      usageStats[log.pipe_id].count += log.bowls_smoked || 1;
      if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
        usageStats[log.pipe_id].lastUsed = log.date;
      }
    });
    return usageStats;
  };

  const getVersatilityColor = (score) => {
    if (score >= 8) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (score >= 6) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 4) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-rose-100 text-rose-800 border-rose-300";
  };

  // --- Optimization analysis ---
  const analyzeCollection = async (withFeedback = false) => {
    if (!pipes?.length || !blends?.length) return;

    setLoading(true);
    try {
      const feedbackContext = withFeedback && userFeedbackHistory ? userFeedbackHistory : "";

      const result = await generateOptimizationAI({
        pipes,
        blends,
        profile: userProfile,
        whatIfText: feedbackContext,
      });

      // Transform to expected format
      const transformedResult = {
        pipe_specializations:
          result.applyable_changes?.map((change) => {
            const pipe = pipes.find((p) => p.id === change.pipe_id);
            let pipeName = pipe?.name || "Unknown";

            if (change.bowl_variant_id && pipe?.interchangeable_bowls) {
              const bowlIndex = parseInt(String(change.bowl_variant_id).replace("bowl_", ""), 10);
              const bowl = pipe.interchangeable_bowls?.[bowlIndex];
              if (bowl) pipeName = `${pipeName} - ${bowl.name || `Bowl ${bowlIndex + 1}`}`;
            }

            return {
              pipe_id: change.pipe_id,
              bowl_variant_id: change.bowl_variant_id || null,
              pipe_name: pipeName,
              recommended_blend_types: change.after_focus || [],
              reasoning: change.rationale || "",
              usage_pattern: `Specialized for: ${(change.after_focus || []).join(", ")}`,
              versatility_score: (change.after_focus || []).length === 1 ? 3 : 5,
              score_improvement: `Expected improvement for ${(change.after_focus || []).join(", ")}`,
              trophy_blends: [],
            };
          }) || [],
        collection_gaps: {
          missing_coverage: result.collection_gaps || [],
          redundancies: [],
          overall_assessment: result.summary || "",
        },
        priority_focus_changes: (result.applyable_changes || []).slice(0, 3).map((change, idx) => ({
          pipe_id: change.pipe_id,
          pipe_name: pipes.find((p) => p.id === change.pipe_id)?.name || "Unknown",
          current_focus: change.before_focus || [],
          recommended_focus: change.after_focus || [],
          score_improvement: `Priority #${idx + 1} change`,
          trophy_blends_gained: [],
          reasoning: change.rationale || "",
        })),
        next_pipe_recommendations: (result.next_additions || []).slice(0, 3).map((rec, idx) => ({
          priority_rank: idx + 1,
          shape: "Recommended",
          material: "Briar",
          chamber_specs: rec,
          gap_filled: rec,
          budget_range: "Varies",
          reasoning: rec,
          trophy_blends: [],
          score_improvement: "Expected improvement",
        })),
      };

      setOptimization(transformedResult);

      await saveOptimizationMutation.mutateAsync({
        ...transformedResult,
        generated_date: new Date().toISOString(),
      });

      if (withFeedback) {
        setPipeFeedback({});
        setShowFeedbackFor(null);
        setShowAcceptAll(true);

        const changes = {};
        transformedResult.pipe_specializations?.forEach((spec) => {
          if (spec.recommended_blend_types?.length > 0) {
            const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
            changes[k] = true;
          }
        });
        setSelectedChanges(changes);
        setShowConfirmation(true);
      }
    } catch (err) {
      console.error("Error analyzing collection:", err);
      toast.error(t("errors.failedToAnalyze"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (variantKey) => {
    const feedback = pipeFeedback[variantKey];
    if (!feedback || !feedback.trim()) return;

    const [pipeId, bowlVariantId] = variantKey.split("|");
    const pipe = pipes.find((p) => p.id === pipeId);
    const spec = optimization?.pipe_specializations?.find((s) => getPipeVariantKey(s.pipe_id, s.bowl_variant_id || null) === variantKey);

    const feedbackEntry = `
Pipe: ${pipe?.name || "Unknown"}
Recommended Focus: ${(spec?.recommended_blend_types || []).join(", ") || "N/A"}
User Feedback: ${feedback}
---`;

    setUserFeedbackHistory((prev) => prev + feedbackEntry);
    setShowFeedbackFor(null);
    await analyzeCollection(true);
  };

  const toggleSelectedChange = (pipeId, bowlVariantId = null) => {
    const k = getPipeVariantKey(pipeId, bowlVariantId);
    setSelectedChanges((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleAllChanges = (checked) => {
    const changes = {};
    optimization?.pipe_specializations?.forEach((spec) => {
      if (spec.recommended_blend_types?.length > 0) {
        const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
        changes[k] = !!checked;
      }
    });
    setSelectedChanges(changes);
  };

  const handleAcceptAll = () => {
    const changes = {};
    optimization?.pipe_specializations?.forEach((spec) => {
      if (spec.recommended_blend_types?.length > 0) {
        const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
        changes[k] = true;
      }
    });
    setSelectedChanges(changes);
    setShowConfirmation(true);
  };

  const handleConfirmChanges = async () => {
    if (!optimization?.pipe_specializations) return;

    setAcceptingAll(true);
    try {
      const updatePromises = optimization.pipe_specializations
        .filter((spec) => {
          const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
          return selectedChanges[k] && spec.recommended_blend_types?.length > 0;
        })
        .map((spec) => {
          const pipe = pipes.find((p) => p.id === spec.pipe_id);
          if (!pipe) return null;

          if (spec.bowl_variant_id) {
            const bowlIndex = parseInt(String(spec.bowl_variant_id).replace("bowl_", ""), 10);
            const bowl = pipe.interchangeable_bowls?.[bowlIndex];
            if (!bowl) return null;

            const currentBowlFocus = JSON.stringify((bowl.focus || []).slice().sort());
            const newFocus = JSON.stringify((spec.recommended_blend_types || []).slice().sort());
            if (currentBowlFocus === newFocus) return null;

            const updatedBowls = [...(pipe.interchangeable_bowls || [])];
            updatedBowls[bowlIndex] = { ...bowl, focus: spec.recommended_blend_types };

            return updatePipeMutation.mutateAsync({
              id: spec.pipe_id,
              data: { interchangeable_bowls: updatedBowls },
            });
          }

          const currentFocus = JSON.stringify((pipe.focus || []).slice().sort());
          const newFocus = JSON.stringify((spec.recommended_blend_types || []).slice().sort());
          if (currentFocus === newFocus) return null;

          return updatePipeMutation.mutateAsync({
            id: spec.pipe_id,
            data: { focus: spec.recommended_blend_types },
          });
        })
        .filter(Boolean);

      await Promise.all(updatePromises);

      invalidatePipeQueries(queryClient, user?.email);
      invalidateAIQueries(queryClient, user?.email);

      setShowConfirmation(false);
      setShowAcceptAll(false);
      setSelectedChanges({});
      setUserFeedbackHistory("");

      toast.success(t("tobacconist.optimizationApplied"), { description: t("tobacconist.regeneratePairingsNote") });
    } catch (err) {
      console.error("Error accepting recommendations:", err);
      toast.error(t("errors.failedToApply"));
    } finally {
      setAcceptingAll(false);
    }
  };

  const applySpecialization = async (pipeId, focus, bowlVariantId = null) => {
    const pipe = pipes.find((p) => p.id === pipeId);
    if (!pipe) return;

    try {
      if (bowlVariantId) {
        const bowlIndex = parseInt(String(bowlVariantId).replace("bowl_", ""), 10);
        const updatedBowls = [...(pipe.interchangeable_bowls || [])];
        if (updatedBowls[bowlIndex]) {
          updatedBowls[bowlIndex] = { ...updatedBowls[bowlIndex], focus };
          await updatePipeMutation.mutateAsync({ id: pipeId, data: { interchangeable_bowls: updatedBowls } });
        }
      } else {
        await updatePipeMutation.mutateAsync({ id: pipeId, data: { focus } });
      }

      invalidateAIQueries(queryClient, user?.email);
      toast.success(bowlVariantId ? t("tobacconist.bowlFocusUpdated") : t("tobacconist.pipeFocusUpdated"), {
        description: t("tobacconist.regeneratePairingsNote"),
      });
    } catch (err) {
      console.error("applySpecialization error:", err);
      toast.error(t("errors.failedToApplyFocus"));
    }
  };

  // --- AI Expert (agent) ---
  const ensureConversation = async (source) => {
    const existingId = currentConversationIdRef.current;
    if (existingId) {
      try {
        const convo = await base44.agents.getConversation(existingId);
        return convo;
      } catch (err) {
        console.warn("Conversation fetch failed; creating new:", err);
      }
    }

    const convo = await base44.agents.createConversation({
      agent_name: "expert_tobacconist",
      metadata: {
        source,
        selected_agent: "expert_tobacconist",
      },
    });
    setCurrentConversationId(convo.id);
    return convo;
  };

  const buildCompactContext = () => {
    const usageStats = getUsageStats();

    const pipesSummary = (pipes || []).map((p) => ({
      id: p.id,
      name: p.name,
      maker: p.maker,
      shape: p.shape,
      chamber_volume: p.chamber_volume,
      focus: p.focus,
      usage_count: usageStats[p.id]?.count || 0,
      last_used: usageStats[p.id]?.lastUsed || null,
    }));

    const tobaccosSummary = (blends || []).map((b) => ({
      id: b.id,
      name: b.name,
      manufacturer: b.manufacturer,
      blend_type: b.blend_type,
      strength: b.strength,
    }));

    const pairingsSummary =
      pairingMatrix?.pairings?.map((pair) => ({
        pipe: pair.pipe_name,
        tobacco: pair.tobacco_name,
        score: pair.score,
      })) || [];

    // keep payload sane (iOS stability)
    const MAX_PAIRINGS = 60;

    return {
      pipesSummary,
      tobaccosSummary,
      usageStats,
      pairingsSummary: pairingsSummary.slice(0, MAX_PAIRINGS),
      pairingCount: pairingsSummary.length,
    };
  };

  const sendToExpertAgent = async ({ userText, source }) => {
    if (!userText?.trim()) return;

    if (contextLoading) {
      toast.error(t("errors.loadingCollection"));
      return;
    }
    if (!pipes?.length) {
      toast.error(t("errors.noPipes"));
      return;
    }

    setWhatIfLoading(true);

    // Add user message immediately
    setConversationMessages((prev) => [
      ...prev,
      { role: "user", content: userText, photos: whatIfPhotos, timestamp: new Date().toISOString() },
    ]);

    try {
      const debugContext = source || "ASK_EXPERT";
      const startTime = Date.now();

      const convo = await ensureConversation(source || "ask_expert");
      const { pipesSummary, tobaccosSummary, usageStats, pairingsSummary, pairingCount } = buildCompactContext();

      const conversationContext = conversationMessages
        .slice(-10)
        .map((m) => {
          if (m.role === "user") return `User: ${asText(m.content)}`;
          // assistant
          const c = m.content || {};
          const txt = c.response || c.advice || c.detailed_reasoning || "";
          return `Assistant: ${asText(txt)}`;
        })
        .join("\n\n");

      const messageWithContext = `INSTRUCTIONS:
- Do NOT repeat your prior answer verbatim.
- For follow-ups, respond only with new information unless the user explicitly asks for a recap.

USER COLLECTION (compact):
Pipes: ${pipesSummary.length}
Tobaccos: ${tobaccosSummary.length}
Pairings available: ${pairingCount} (showing up to ${pairingsSummary.length})

PIPES:
${safeStringify(pipesSummary, 6000)}

TOBACCOS:
${safeStringify(tobaccosSummary, 6000)}

TOP PAIRINGS:
${safeStringify(pairingsSummary, 6000)}

USAGE:
${safeStringify(usageStats, 3000)}

RECENT CHAT:
${conversationContext || "(none)"}

USER QUESTION:
${userText}
`;

      const waitPromise = waitForAssistantMessage(convo.id, 90000, { debug: true, context: debugContext });

      await base44.agents.addMessage(convo, {
        role: "user",
        content: messageWithContext,
        file_urls: whatIfPhotos?.length ? whatIfPhotos : undefined,
      });

      let agentResponse = "";
      try {
        agentResponse = await waitPromise;
      } catch (err) {
        console.error(`[${debugContext}] wait failed:`, err);
        agentResponse = err?.message?.includes("Agent error:")
          ? `The expert agent encountered an error: ${err.message.replace("Agent error: ", "")}`
          : "I couldn't load a response from the expert agent. Please try again.";
      }

      const lastAssistantMsg = [...conversationMessages].reverse().find((m) => m.role === "assistant");
      const lastAssistantText =
        lastAssistantMsg?.content?.response || lastAssistantMsg?.content?.advice || lastAssistantMsg?.content?.detailed_reasoning || "";

      let finalResponse = stripRepeatedPrefix(lastAssistantText, agentResponse || "");
      if (!finalResponse || !finalResponse.trim()) finalResponse = "I couldn't load a response from the expert agent. Please try again.";

      const aiResponse = {
        is_general_advice: true,
        advice: finalResponse,
        key_points: [],
        tips: [],
        routed_to: "expert_tobacconist",
        conversation_id: convo.id,
        _debug: {
          total_time_ms: Date.now() - startTime,
          response_length: finalResponse.length,
        },
      };

      setWhatIfResult(aiResponse);
      setConversationMessages((prev) => [...prev, { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() }]);

      // Clear photos after send (optional; keeps UI sane)
      setWhatIfPhotos([]);
    } catch (err) {
      console.error("sendToExpertAgent error:", err);
      toast.error(t("errors.failedToProcess"));
      setConversationMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: {
            is_general_advice: true,
            advice: `Error: ${err?.message || "Failed to process question"}. Please try again.`,
            routed_to: "error",
          },
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setWhatIfLoading(false);
    }
  };

  // Impact analysis (kept) — safe rendering everywhere
  const normalizeImpactResult = (result) => {
    if (!result) return null;
    return {
      ...result,
      redundancy_analysis:
        typeof result.redundancy_analysis === "string"
          ? result.redundancy_analysis
          : result.redundancy_analysis?.summary || JSON.stringify(result.redundancy_analysis || ""),
      detailed_reasoning:
        typeof result.detailed_reasoning === "string"
          ? result.detailed_reasoning
          : result.detailed_reasoning?.summary || JSON.stringify(result.detailed_reasoning || ""),
      score_improvements:
        typeof result.score_improvements === "string" ? result.score_improvements : JSON.stringify(result.score_improvements || ""),
    };
  };

  const analyzeCollectionImpact = async () => {
    if (!conversationMessages.length) return;

    setWhatIfLoading(true);
    try {
      const userQuestions = conversationMessages
        .filter((m) => m.role === "user")
        .slice(-6)
        .map((m) => `User: ${asText(m.content)}`)
        .join("\n");

      const lastAssistant = [...conversationMessages].reverse().find((m) => m.role === "assistant" && !m.content?.is_impact_analysis);
      const assistantRecommendationText = lastAssistant
        ? asText(lastAssistant.content?.response || lastAssistant.content?.advice || "")
        : "";

      const whatIfText = [`USER QUESTIONS:\n${userQuestions}`, `ASSISTANT RECOMMENDATION:\n${assistantRecommendationText.slice(0, 1500)}`]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 3500);

      const result = await generateOptimizationAI({
        pipes,
        blends,
        profile: userProfile,
        whatIfText,
      });

      const impactAnalysis = normalizeImpactResult({
        is_impact_analysis: true,
        impact_score: result.applyable_changes?.length > 0 ? 8 : 6,
        trophy_pairings: (result.next_additions || []).slice(0, 5),
        redundancy_analysis: result.summary || "",
        recommendation_category: "STRONG ADDITION",
        detailed_reasoning: result.summary || "",
        gaps_filled: result.collection_gaps || [],
        score_improvements: `Changes may improve collection coverage: ${(result.next_additions || []).join(", ")}`,
        applyable_changes: result.applyable_changes || [],
      });

      setConversationMessages((prev) => [...prev, { role: "assistant", content: impactAnalysis, timestamp: new Date().toISOString() }]);
      setWhatIfResult(impactAnalysis);
    } catch (err) {
      console.error("analyzeCollectionImpact error:", err);
      toast.error(t("errors.failedToAnalyzeImpact"));
    } finally {
      setWhatIfLoading(false);
    }
  };

  const resetWhatIf = () => {
    setWhatIfQuery("");
    setWhatIfFollowUp("");
    setWhatIfPhotos([]);
    setWhatIfDescription("");
    setWhatIfResult(null);
    setConversationMessages([]);
    setCurrentConversationId(null);
  };

  const handlePhotoUpload = async (files) => {
    const uploadedUrls = [];
    for (const file of Array.from(files || [])) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (err) {
        console.error("Error uploading photo:", err);
      }
    }
    setWhatIfPhotos((prev) => [...prev, ...uploadedUrls]);
  };

  // Apply optimization changes with undo support (kept)
  const applyOptimizationChangesWithUndo = async (applyableChanges) => {
    if (!Array.isArray(applyableChanges) || applyableChanges.length === 0) return;

    const pipeMap = new Map((pipes || []).map((p) => [p.id, p]));

    const pipe_changes = applyableChanges
      .map((c) => {
        const p = pipeMap.get(c.pipe_id);
        if (!p) return null;

        const isBowl = !!c.bowl_variant_id;
        let beforeFocus = Array.isArray(p.focus) ? p.focus : [];

        if (isBowl && Array.isArray(p.interchangeable_bowls)) {
          const idx = parseInt(String(c.bowl_variant_id).replace("bowl_", ""), 10);
          const bowl = Number.isFinite(idx) ? p.interchangeable_bowls[idx] : null;
          if (bowl) beforeFocus = Array.isArray(bowl.focus) ? bowl.focus : [];
        }

        return {
          pipe_id: c.pipe_id,
          bowl_variant_id: c.bowl_variant_id || null,
          before: { focus: beforeFocus },
          after: { focus: Array.isArray(c.recommended_blend_types) ? c.recommended_blend_types : [] },
          rationale: c.reasoning || "",
        };
      })
      .filter(Boolean);

    if (!pipe_changes.length) return;

    const batch = await base44.entities.AIApplyBatch.create({
      created_by: user?.email,
      type: "optimization_focus_apply",
      created_at: new Date().toISOString(),
      pipe_changes,
    });

    for (const ch of pipe_changes) {
      const p = pipeMap.get(ch.pipe_id);
      if (!p) continue;

      if (ch.bowl_variant_id) {
        const idx = parseInt(String(ch.bowl_variant_id).replace("bowl_", ""), 10);
        const bowls = Array.isArray(p.interchangeable_bowls) ? [...p.interchangeable_bowls] : [];
        if (Number.isFinite(idx) && bowls[idx]) {
          bowls[idx] = { ...bowls[idx], focus: ch.after.focus };
          await safeUpdate("Pipe", ch.pipe_id, { interchangeable_bowls: bowls }, user?.email);
        }
      } else {
        await safeUpdate("Pipe", ch.pipe_id, { focus: ch.after.focus }, user?.email);
      }
    }

    invalidatePipeQueries(queryClient, user?.email);
    invalidateAIQueries(queryClient, user?.email);

    return batch;
  };

  // --- UI guards ---
  if (!pipes?.length || !blends?.length) return null;
  if (optLoading) return <div className="text-sm text-stone-600">{t("tobacconist.loadingOptimization")}</div>;
  if (!optimization) return <div className="text-sm text-stone-600">{t("tobacconist.noOptimizationYet")}</div>;

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    safeSetItem("collectionOptimizerCollapsed", String(newState));
  };

  // ---- Standalone “Ask the Expert” mode (home card) ----
  if (initialShowWhatIf || showWhatIf) {
    return (
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800 text-lg">
            <Lightbulb className="w-5 h-5" />
            {t("tobacconist.askTheExpert")}
          </CardTitle>
          <p className="text-sm text-stone-800">{t("tobacconist.askTheExpertDesc")}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Conversation */}
          {conversationMessages.length > 0 && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-stone-50">
              {conversationMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const c = msg.content;

                const isImpact = !!c?.is_impact_analysis;
                const isGeneralAdvice = !!c?.is_general_advice;

                return (
                  <div key={idx} className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
                    {isUser ? (
                      <div className="text-right">
                        <div className="inline-block bg-indigo-600 text-white rounded-lg px-4 py-2 max-w-[85%]">
                          <p className="text-sm break-words">{asText(c)}</p>
                          {msg.photos?.length > 0 && (
                            <div className="flex gap-2 mt-2 justify-end">
                              {msg.photos.map((url, i) => (
                                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-left">
                        <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
                          {isImpact ? (
                            <div className="text-sm space-y-3 text-stone-900">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-indigo-600 text-white">{t("tobacconist.impactScore")} {asText(c?.impact_score)}/10</Badge>
                                {!!c?.recommendation_category && (
                                  <Badge className="bg-blue-600 text-white">{asText(c?.recommendation_category)}</Badge>
                                )}
                              </div>

                              {!!c?.detailed_reasoning && (
                                <div className="space-y-2">
                                  <p className="text-stone-900 font-semibold text-sm">{t("tobacconist.analysis")}:</p>
                                  <div className="text-stone-900">
                                    <FormattedTobacconistResponse content={asText(c?.detailed_reasoning)} style="simple_paragraphs" />
                                  </div>
                                </div>
                              )}

                              {Array.isArray(c?.trophy_pairings) && c.trophy_pairings.length > 0 && (
                                <div>
                                  <p className="text-stone-900 font-semibold text-xs mb-1">{t("tobacconist.trophyPairings")}:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {c.trophy_pairings.map((blend, i) => (
                                      <Badge key={i} className="bg-amber-100 text-amber-800 text-xs">
                                        {asText(blend)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : isGeneralAdvice ? (
                            <div className="space-y-3 text-stone-900">
                              <FormattedTobacconistResponse content={asText(c?.advice)} style="light_structure" />

                              {c?.routed_to && (
                                <div className="mt-2 pt-2 border-t border-stone-400">
                                  <p className="text-xs font-mono text-stone-700 bg-stone-200 px-2 py-1 rounded break-all">
                                   {t("tobacconist.answeredBy")}: {asText(c.routed_to)}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3 text-stone-900">
                              <FormattedTobacconistResponse content={asText(c?.response || c?.advice || c)} style="light_structure" />
                              {c?.routed_to && (
                                <div className="mt-2 pt-2 border-t border-stone-400">
                                  <p className="text-xs font-mono text-stone-700 bg-stone-200 px-2 py-1 rounded break-all">
                                   {t("tobacconist.answeredBy")}: {asText(c.routed_to)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* “Analyze Impact” quick action */}
                        {!isImpact && (
                          <div className="mt-2">
                            <Button
                              onClick={analyzeCollectionImpact}
                              disabled={whatIfLoading}
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              {whatIfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                              {t("tobacconist.analyzeImpact")}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inputs */}
          <div>
            <label className="text-sm font-medium text-stone-800 mb-2 block">
              {conversationMessages.length > 0 ? t("tobacconist.continueConversation") : t("tobacconist.chatWithTobacconist")}
            </label>
            <Textarea
              placeholder={t("tobacconist.askExpertPlaceholder", {defaultValue: "Ask about pairings, recommendations, or your collection..."})}
              value={conversationMessages.length > 0 ? whatIfFollowUp : whatIfQuery}
              onChange={(e) => (conversationMessages.length > 0 ? setWhatIfFollowUp(e.target.value) : setWhatIfQuery(e.target.value))}
              className="min-h-[80px] bg-white text-stone-900 placeholder:text-stone-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  const text = conversationMessages.length > 0 ? whatIfFollowUp : whatIfQuery;
                  if (conversationMessages.length > 0) setWhatIfFollowUp("");
                  else setWhatIfQuery("");
                  sendToExpertAgent({ userText: text, source: "ask_expert" });
                }
              }}
            />
            <p className="text-xs text-stone-500 mt-1">{t("tobacconist.pressCmdEnter")}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-800 mb-2 block">{t("tobacconist.pipeDetailsOptional")}</label>
            <Textarea
              placeholder={t("tobacconist.describeCharacteristics")}
              value={whatIfDescription}
              onChange={(e) => setWhatIfDescription(e.target.value)}
              className="min-h-[60px] bg-white text-stone-900 placeholder:text-stone-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-800 mb-2 block">{t("tobacconist.uploadPhotosOptional")}</label>
            <div
              onDrop={(e) => {
                e.preventDefault();
                handlePhotoUpload(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <PhotoUploader
                onPhotosSelected={(files) => handlePhotoUpload(files)}
                existingPhotos={whatIfPhotos}
              />
            </div>

            {whatIfPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {whatIfPhotos.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                    <button
                      onClick={() => setWhatIfPhotos(whatIfPhotos.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {conversationMessages.length > 0 ? (
              <>
                <Button
                  onClick={() => {
                    const text = whatIfFollowUp;
                    setWhatIfFollowUp("");
                    sendToExpertAgent({ userText: text, source: "ask_expert_followup" });
                  }}
                  disabled={whatIfLoading || !whatIfFollowUp.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 w-full"
                >
                  {whatIfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HelpCircle className="w-4 h-4 mr-2" />}
                  {t("tobacconist.sendMessage")}
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={analyzeCollectionImpact}
                    disabled={whatIfLoading}
                    variant="outline"
                    className="border-blue-400 bg-blue-600 text-white hover:bg-blue-700 hover:text-white flex-1"
                  >
                    {whatIfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                    {t("tobacconist.analyzeImpact")}
                    </Button>

                  <Button variant="outline" onClick={resetWhatIf} className="flex-1 bg-stone-700 text-white hover:bg-stone-800 border-stone-600">
                    {t("tobacconist.reset")}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                onClick={() => {
                  const text = whatIfQuery;
                  setWhatIfQuery("");
                  setConversationMessages([]);
                  sendToExpertAgent({ userText: text, source: "ask_expert_start" });
                }}
                disabled={whatIfLoading || !whatIfQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 w-full"
              >
                {whatIfLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("tobacconist.starting")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("tobacconist.startConversation")}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Impact analysis “Apply changes” */}
          {whatIfResult?.is_impact_analysis && Array.isArray(whatIfResult?.applyable_changes) && whatIfResult.applyable_changes.length > 0 && (
            <div className="mt-4">
              <Button
                onClick={async () => {
                  await applyOptimizationChangesWithUndo(whatIfResult.applyable_changes);
                  toast.success(t("tobacconist.changesApplied"));
                  resetWhatIf();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 w-full"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                {t("tobacconist.confirmApplyChanges")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Full Optimization Card ----
  return (
    <>
      {/* Staleness Dialog */}
      <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent className="mx-4 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {t("tobacconist.outOfDate")}
            </DialogTitle>
            <DialogDescription>
              {t("tobacconist.outOfDateMessage")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRegenDialog(false)} className="w-full sm:w-auto">
              {t("tobacconist.notNow")}
            </Button>

            {optimization?.previous_active_id && (
              <Button
                variant="outline"
                onClick={() => undoOptimizationMutation.mutate()}
                disabled={undoOptimizationMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Undo className="w-4 h-4 mr-2" />
                {t("tobacconist.undoLastChange")}
              </Button>
            )}

            <Button
              onClick={() => {
                setShowRegenDialog(false);
                analyzeCollection();
              }}
              disabled={loading}
              className="bg-amber-700 hover:bg-amber-800 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("tobacconist.regenerating")}
                </>
              ) : (
                t("tobacconist.regenerate")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {t("tobacconist.reviewApply")}
            </DialogTitle>
            <DialogDescription>
              {t("tobacconist.reviewApplyDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 pb-4 border-b">
              <Checkbox
                id="select-all"
                checked={optimization?.pipe_specializations?.every((spec) => {
                  if (!spec.recommended_blend_types?.length) return true;
                  const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
                  return !!selectedChanges[k];
                })}
                onCheckedChange={toggleAllChanges}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                {t("tobacconist.selectAll")}
              </label>
            </div>

            {optimization?.pipe_specializations?.map((spec) => {
              const pipe = pipes.find((p) => p.id === spec.pipe_id);
              if (!spec.recommended_blend_types?.length || !pipe) return null;

              const variantKey = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);

              let currentFocus = [];
              if (spec.bowl_variant_id) {
                const bowlIndex = parseInt(String(spec.bowl_variant_id).replace("bowl_", ""), 10);
                const bowl = pipe?.interchangeable_bowls?.[bowlIndex];
                currentFocus = Array.isArray(bowl?.focus) ? bowl.focus : [];
              } else {
                currentFocus = Array.isArray(pipe.focus) ? pipe.focus : [];
              }

              const hasChanges = JSON.stringify(currentFocus.slice().sort()) !== JSON.stringify(spec.recommended_blend_types.slice().sort());

              return (
                <div key={variantKey} className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg border">
                  <Checkbox
                    id={`change-${variantKey}`}
                    checked={!!selectedChanges[variantKey]}
                    onCheckedChange={() => toggleSelectedChange(spec.pipe_id, spec.bowl_variant_id || null)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor={`change-${variantKey}`} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-stone-800">{asText(spec.pipe_name)}</h4>
                        {!hasChanges && <Badge variant="outline" className="text-xs">{t("tobacconist.noChange")}</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                        <div>
                          <p className="text-xs text-stone-500 mb-1">{t("tobacconist.current")}</p>
                          {currentFocus.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {currentFocus.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{asText(f)}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 italic">{t("tobacconist.noneSet")}</span>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-emerald-700 font-medium mb-1">{t("tobacconist.recommended")}</p>
                          <div className="flex flex-wrap gap-1">
                            {spec.recommended_blend_types.map((f, i) => (
                              <Badge key={i} className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                                {asText(f)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {!!spec.score_improvement && (
                        <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                          <p className="text-xs text-emerald-800">
                            <strong>{t("tobacconist.impact")}</strong> {asText(spec.score_improvement)}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}

            {optimization?.pipe_specializations?.filter((s) => s.recommended_blend_types?.length > 0).length === 0 && (
              <p className="text-center text-stone-500 py-8">{t("tobacconist.noChanges")}</p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={acceptingAll} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmChanges}
              disabled={acceptingAll || Object.values(selectedChanges).filter(Boolean).length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              {acceptingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("tobacconist.applyingChanges")}
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {t("tobacconist.apply")} {Object.values(selectedChanges).filter(Boolean).length} {t("tobacconist.applyChanges")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Optimization Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-blue-800 text-lg sm:text-base">
                    <Target className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{t("tobacconist.optimizationTitle")}</span>
                  </CardTitle>
                  <InfoTooltip text={t("tobacconist.optimizationTooltip")} />
                </div>
                <Button variant="ghost" size="sm" onClick={toggleCollapse} className="text-blue-600 hover:text-blue-800 flex-shrink-0">
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
              <p className="mt-2 text-stone-700 text-xs sm:text-sm">
                {t("tobacconist.strategicSpecializations")}
              </p>
            </div>

            {!isCollapsed && (
              <Button
                onClick={() => analyzeCollection(false)}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 w-full sm:w-auto flex-shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">{t("tobacconist.analyzing2")}</span>
                    <span className="sm:hidden">{t("tobacconist.analyzing")}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{t("tobacconist.updateAnalysis")}</span>
                    <span className="sm:hidden">{t("tobacconist.updateAnalysis")}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        {!isCollapsed && optimization && (
          <CardContent className="space-y-6">
            {/* Pipe Specializations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowPipesList(!showPipesList)}
                  className="flex-1 flex items-center justify-between hover:bg-stone-100 rounded-lg px-2 py-1 transition-colors"
                >
                  <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    {t("tobacconist.recommendedSpecializations")}
                  </h3>
                  <div className="text-blue-600">{showPipesList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                </button>

                {showAcceptAll && showPipesList && (
                  <Button onClick={handleAcceptAll} disabled={acceptingAll} className="bg-emerald-600 hover:bg-emerald-700 ml-2 flex-shrink-0">
                    {acceptingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("tobacconist.applyingChanges")}
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        {t("tobacconist.acceptAllRecommendations")}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {showPipesList && (
                <div className="space-y-3">
                  {expandPipesToVariants(pipes, { includeMainWhenBowls: false }).map((pv, idx) => {
                    const variantKey = getPipeVariantKey(pv.pipe_id, pv.bowl_variant_id || null);
                    const spec =
                      optimization.pipe_specializations?.find((s) => getPipeVariantKey(s.pipe_id, s.bowl_variant_id || null) === variantKey) ||
                      null;

                    const pipe = pipes.find((p) => p.id === pv.pipe_id);

                    const displaySpec = spec || {
                      pipe_id: pv.pipe_id,
                      bowl_variant_id: pv.bowl_variant_id || null,
                      pipe_name: pv.name,
                      recommended_blend_types: [],
                      reasoning: t("tobacconist.noRecommendation"),
                      versatility_score: 5,
                      usage_pattern: t("tobacconist.versatilePattern"),
                    };

                    return (
                      <motion.div
                        key={variantKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      >
                        <Card className="border-stone-200 hover:border-blue-300 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                                {pv?.photos?.[0] || pipe?.photos?.[0] ? (
                                  <img
                                    src={pv?.photos?.[0] || pipe?.photos?.[0]}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <PipeShapeIcon shape={pv?.shape || pipe?.shape} className="w-10 h-10" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {pipe?.id ? (
                                    <a href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pv.pipe_id)}&bowl=${encodeURIComponent(pv.bowl_variant_id || "")}`)}>
                                      <h4 className="font-semibold text-stone-800 hover:text-blue-700 transition-colors text-sm sm:text-base">
                                        {asText(pv.name || displaySpec.pipe_name)}
                                      </h4>
                                    </a>
                                  ) : (
                                    <h4 className="font-semibold text-stone-500 text-sm sm:text-base" title={t("tobacconist.pipeNotFound")}>
                                      {asText(displaySpec.pipe_name)}
                                    </h4>
                                  )}

                                  {(pv?.focus?.length > 0 || pipe?.focus?.length > 0) ? (
                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-xs gap-1 flex-shrink-0">
                                      <Star className="w-3 h-3" />
                                      <span className="hidden sm:inline">{t("tobacconist.specialized")}</span>
                                    </Badge>
                                  ) : displaySpec.recommended_blend_types?.length > 0 ? (
                                    <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-xs gap-1 flex-shrink-0">
                                      <Star className="w-3 h-3" />
                                      <span className="hidden sm:inline">{t("tobacconist.recommended")}</span>
                                    </Badge>
                                  ) : (
                                    <Badge className={`${getVersatilityColor(displaySpec.versatility_score)} text-xs flex-shrink-0`}>
                                      <span className="hidden sm:inline">{t("tobacconist.versatility")} {asText(displaySpec.versatility_score)}/10</span>
                                      <span className="sm:hidden">{asText(displaySpec.versatility_score)}/10</span>
                                    </Badge>
                                  )}
                                  </div>

                                  {pv.focus && pv.focus.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-stone-700 dark:text-white/90 mb-1">{t("tobacconist.currentFocus")}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {pv.focus.map((type, i) => (
                                        <Badge key={i} className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                          {asText(type)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {displaySpec.recommended_blend_types?.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-blue-900 mb-1">{t("tobacconist.specializeFor")}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {displaySpec.recommended_blend_types.map((type, i) => (
                                        <Badge key={i} className="bg-blue-100 text-blue-800 border-blue-200">
                                          {asText(type)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ✅ Removed beige hex; use readable theme-safe colors */}
                                <p className="text-sm text-stone-700 dark:text-white/90 mb-2">
                                  {asText(displaySpec.reasoning)}
                                </p>

                                {displaySpec.score_improvement && (
                                  <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 mb-2">
                                    <p className="text-xs font-medium text-emerald-700">📈 {t("tobacconist.scoreImpact")}:</p>
                                    <p className="text-xs text-emerald-800 font-semibold">{asText(displaySpec.score_improvement)}</p>
                                  </div>
                                )}

                                {displaySpec.trophy_blends && displaySpec.trophy_blends.length > 0 && (
                                  <div className="bg-amber-50 rounded-lg p-2 border border-amber-200 mb-2">
                                    <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                      <Trophy className="w-3 h-3" />
                                      {t("tobacconist.trophyMatches")}:
                                    </p>
                                    <p className="text-xs text-amber-800">{asText(displaySpec.trophy_blends.join(", "))}</p>
                                  </div>
                                )}

                                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                                  <p className="text-xs font-medium text-blue-900">{t("tobacconist.usagePattern")}</p>
                                  <p className="text-xs text-stone-800">{asText(displaySpec.usage_pattern)}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  {displaySpec.recommended_blend_types?.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                      onClick={() => applySpecialization(pv.pipe_id, displaySpec.recommended_blend_types, pv.bowl_variant_id)}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      {t("tobacconist.applySuggested")}
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                    onClick={() => setShowFeedbackFor(showFeedbackFor === variantKey ? null : variantKey)}
                                  >
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    {showFeedbackFor === variantKey ? t("common.cancel") : t("tobacconist.disputeAddInfo")}
                                  </Button>
                                </div>

                                {showFeedbackFor === variantKey && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                                  >
                                    <p className="text-xs font-medium text-amber-800 mb-2">{t("tobacconist.shareThoughts")}:</p>
                                    <Textarea
                                      placeholder={t("tobacconist.feedbackPlaceholder")}
                                      value={pipeFeedback[variantKey] || ""}
                                      onChange={(e) => setPipeFeedback({ ...pipeFeedback, [variantKey]: e.target.value })}
                                      className="min-h-[60px] text-sm mb-2 bg-white text-stone-900 placeholder:text-stone-500"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSubmitFeedback(variantKey)}
                                      disabled={!pipeFeedback[variantKey]?.trim() || loading}
                                      className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                      {loading ? (
                                        <>
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          {t("tobacconist.reanalyzing")}
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          {t("tobacconist.submitReanalyze")}
                                        </>
                                      )}
                                    </Button>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collection Analysis */}
            {optimization.collection_gaps && (
              <div>
                <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  {t("tobacconist.collectionAnalysis")}
                </h3>

                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-stone-700 mb-2">{t("tobacconist.overallAssessment")}</p>
                      <p className="text-sm text-stone-700">{asText(optimization.collection_gaps.overall_assessment)}</p>
                    </div>

                    {optimization.collection_gaps.missing_coverage?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-rose-700 mb-2">{t("tobacconist.coverageGaps")}</p>
                        <div className="flex flex-wrap gap-1">
                          {optimization.collection_gaps.missing_coverage.map((gap, i) => (
                            <Badge key={i} className="bg-rose-100 text-rose-800 border-rose-200">
                              {asText(gap)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {optimization.collection_gaps.redundancies?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-700 mb-2">{t("tobacconist.redundancies")}</p>
                        <div className="flex flex-wrap gap-1">
                          {optimization.collection_gaps.redundancies.map((red, i) => (
                            <Badge key={i} className="bg-amber-100 text-amber-800 border-amber-200">
                              {asText(red)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Discuss / Ask Expert (embedded) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  {t("tobacconist.askTheExpert")}
                </h3>
                <InfoTooltip text={t("tobacconist.askExpertTooltip")} />
              </div>

              <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-stone-900">
                    {t("tobacconist.askExpertInstructions", {defaultValue: "Ask questions about collection strategy, hypothetical purchases, or pairing advice."})}
                  </p>

                  <Textarea
                    placeholder={t("tobacconist.askPlaceholder", {defaultValue: "What if I added a larger billiard? Which tobacco should I try next?"})}
                    value={whatIfQuery}
                    onChange={(e) => setWhatIfQuery(e.target.value)}
                    className="min-h-[70px] bg-white text-stone-900 placeholder:text-stone-500"
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => {
                        const text = whatIfQuery;
                        setWhatIfQuery("");
                        sendToExpertAgent({ userText: text, source: "optimize_embedded" });
                      }}
                      disabled={!whatIfQuery.trim() || whatIfLoading || contextLoading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {whatIfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      {t("ai.ask")}
                    </Button>

                    <Button
                      onClick={analyzeCollectionImpact}
                      disabled={!conversationMessages.length || whatIfLoading}
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                      title={!conversationMessages.length ? t("tobacconist.askFirstToAnalyze") : t("tobacconist.analyzeImpact")}
                    >
                      {whatIfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                      {t("tobacconist.analyzeImpact")}
                    </Button>

                    <Button onClick={resetWhatIf} variant="outline" className="flex-1 bg-white text-stone-700 hover:bg-stone-50 border-stone-300">
                      {t("tobacconist.reset")}
                    </Button>
                  </div>

                  {conversationMessages.length > 0 && (
                    <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-white">
                      {conversationMessages.map((msg, idx) => {
                        const isUser = msg.role === "user";
                        const c = msg.content;
                        const isImpact = !!c?.is_impact_analysis;
                        const isGeneralAdvice = !!c?.is_general_advice;

                        return (
                          <div key={idx} className={`${isUser ? "text-right" : "text-left"}`}>
                            {isUser ? (
                              <div className="inline-block bg-indigo-600 text-white rounded-lg px-3 py-2 max-w-[85%]">
                                <p className="text-xs sm:text-sm break-words">{asText(c)}</p>
                              </div>
                            ) : (
                              <div className="inline-block bg-stone-100 rounded-lg px-3 py-2 max-w-[85%] text-left">
                                {isImpact ? (
                                  <div className="text-xs sm:text-sm text-stone-800 space-y-2">
                                    <p className="font-semibold">{t("tobacconist.impactScore")}: {asText(c?.impact_score)}/10</p>
                                    <p>{asText(c?.recommendation_category)}</p>
                                    <p className="text-stone-700">{asText(c?.detailed_reasoning)}</p>
                                  </div>
                                ) : isGeneralAdvice ? (
                                  <div className="text-xs sm:text-sm text-stone-800 space-y-2">
                                    <FormattedTobacconistResponse content={asText(c?.advice)} style="light_structure" />
                                    {c?.routed_to && (
                                      <p className="text-[11px] font-mono text-stone-600 border-t border-stone-300 pt-2">
                                        {t("tobacconist.answeredBy")}: {asText(c.routed_to)}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs sm:text-sm text-stone-800 space-y-2">
                                    <FormattedTobacconistResponse content={asText(c?.response || c?.advice || c)} style="light_structure" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-xs text-stone-500">
              {optimization?.generated_date && <p>{t("common.lastUpdated")}: {new Date(optimization.generated_date).toLocaleDateString()}</p>}
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
}

export default function CollectionOptimizer(props) {
  return (
    <PKErrorBoundary>
      <CollectionOptimizerInner {...props} />
    </PKErrorBoundary>
  );
}