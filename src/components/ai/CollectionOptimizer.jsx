import { getPipeVariantKey, expandPipesToVariants } from "@/components/utils/pipeVariants";
import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
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
import {
  invalidatePipeQueries,
  invalidateAIQueries,
} from "@/components/utils/cacheInvalidation";
import PhotoUploader from "@/components/PhotoUploader";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { safeToString } from "@/components/utils/SafeRender";
import { FormattedTobacconistResponse } from "@/components/utils/formatTobacconistResponse";

export default function CollectionOptimizer({
  pipes,
  blends,
  showWhatIf: initialShowWhatIf = false,
  improvedWhatIf = false,
}) {
  if (isAppleBuild) return null;

  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const entitlements = useEntitlements();

  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("collectionOptimizerCollapsed");
    return saved === "true";
  });
  const [showWhatIf, setShowWhatIf] = useState(initialShowWhatIf);

  const [whatIfQuery, setWhatIfQuery] = useState("");
  const [whatIfPhotos, setWhatIfPhotos] = useState([]);
  const [whatIfDescription, setWhatIfDescription] = useState("");
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [suggestedProducts, setSuggestedProducts] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [whatIfFollowUp, setWhatIfFollowUp] = useState("");

  const [conversationMessages, setConversationMessages] = useState([]);

  const [pipeFeedback, setPipeFeedback] = useState({});
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);
  const [userFeedbackHistory, setUserFeedbackHistory] = useState("");

  const [showAcceptAll, setShowAcceptAll] = useState(false);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState({});
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [showPipesList, setShowPipesList] = useState(true);

  // Sticky routing
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [stickyAgent, setStickyAgent] = useState(null);

  // ---------- Helpers (stability + safety) ----------
  const getLastAssistantText = (msgs) => {
    const last = [...(msgs || [])]
      .reverse()
      .find((m) => m?.role === "assistant" && !m?.content?.is_impact_analysis);

    if (!last) return "";
    const c = last.content;
    if (typeof c === "string") return c;
    return safeToString(c?.response || c?.advice || c?.detailed_reasoning || "");
  };

  // Strip repeated prefix from follow-up responses to prevent recap
  const stripRepeatedPrefix = (prevText, nextText) => {
    if (!prevText || !nextText) return nextText || "";
    const p = String(prevText).trim();
    const n = String(nextText).trim();
    if (p.length < 80 || n.length < 80) return nextText;

    if (n.startsWith(p)) {
      const trimmed = n.slice(p.length).trim();
      return trimmed.length ? trimmed : nextText;
    }

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

  // Normalize impact result to ensure all string fields are strings (not objects)
  const normalizeImpactResult = (result) => {
    if (!result) return null;

    const toStr = (v) => {
      if (typeof v === "string") return v;
      if (v == null) return "";
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      if (typeof v === "object") return safeToString(v?.summary || v);
      return safeToString(v);
    };

    return {
      ...result,
      redundancy_analysis: toStr(result.redundancy_analysis),
      detailed_reasoning: toStr(result.detailed_reasoning),
      score_improvements: toStr(result.score_improvements),
      recommendation_category: toStr(result.recommendation_category),
    };
  };

  // Force readable text in assistant blocks (prevents beige output from formatter styles)
  const readableAssistantWrap =
    "text-stone-900 [&_p]:text-stone-900 [&_li]:text-stone-900 [&_span]:text-stone-900 [&_strong]:text-stone-900 [&_em]:text-stone-900 [&_a]:text-blue-700 [&_h1]:text-stone-900 [&_h2]:text-stone-900 [&_h3]:text-stone-900";

  // ---------- Data Fetching ----------
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({
        user_email: user?.email,
      });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Pairing grid for agent context
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

  // Usage logs for agent context
  const { data: usageLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SmokingLog.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
  });

  const contextLoading = pairingLoading || logsLoading;

  // Active optimization
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

  // Fingerprint
  const currentFingerprint = useMemo(
    () => buildArtifactFingerprint({ pipes, blends, profile: userProfile }),
    [pipes, blends, userProfile]
  );

  const isStale = useMemo(
    () =>
      !!optimization &&
      (!optimization.input_fingerprint ||
        optimization.input_fingerprint !== currentFingerprint),
    [optimization, currentFingerprint]
  );

  // Show regen dialog when stale (only once per optimization)
  const [lastShownOptId, setLastShownOptId] = useState(null);
  useEffect(() => {
    if (isStale && optimization && lastShownOptId !== optimization.id) {
      setShowRegenDialog(true);
      setLastShownOptId(optimization.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, optimization?.id]);

  useEffect(() => {
    if (activeOpt?.id) setOptimization(activeOpt);
  }, [activeOpt?.id]);

  // ---------- Mutations ----------
  const saveOptimizationMutation = useMutation({
    mutationFn: async (data) => {
      if (optimization?.id) {
        await safeUpdate(
          "CollectionOptimization",
          optimization.id,
          { is_active: false },
          user?.email
        );
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
      queryClient.invalidateQueries({
        queryKey: ["activeOptimization", user?.email],
      });
    },
  });

  const undoOptimizationMutation = useMutation({
    mutationFn: async () => {
      if (!optimization?.previous_active_id) {
        throw new Error("No previous version to undo to");
      }
      await safeUpdate(
        "CollectionOptimization",
        optimization.id,
        { is_active: false },
        user?.email
      );
      await safeUpdate(
        "CollectionOptimization",
        optimization.previous_active_id,
        { is_active: true },
        user?.email
      );
    },
    onSuccess: () => {
      invalidateAIQueries(queryClient, user?.email);
      setShowRegenDialog(false);
    },
  });

  const updatePipeMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate("Pipe", id, data, user?.email),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
    },
  });

  // ---------- Core Optimization ----------
  const analyzeCollection = async (withFeedback = false) => {
    if (!pipes?.length || !blends?.length) return;

    setLoading(true);
    try {
      let feedbackContext = "";
      if (withFeedback && userFeedbackHistory) feedbackContext = userFeedbackHistory;

      const result = await generateOptimizationAI({
        pipes,
        blends,
        profile: userProfile,
        whatIfText: feedbackContext,
      });

      const transformedResult = {
        pipe_specializations:
          result.applyable_changes?.map((change) => {
            const pipe = pipes.find((p) => p.id === change.pipe_id);
            let pipeName = pipe?.name || "Unknown";

            if (change.bowl_variant_id && pipe?.interchangeable_bowls) {
              const bowlIndex = parseInt(
                String(change.bowl_variant_id).replace("bowl_", ""),
                10
              );
              const bowl = pipe.interchangeable_bowls[bowlIndex];
              if (bowl) {
                pipeName = `${pipeName} - ${
                  bowl.name || `Bowl ${bowlIndex + 1}`
                }`;
              }
            }

            return {
              pipe_id: change.pipe_id,
              bowl_variant_id: change.bowl_variant_id,
              pipe_name: pipeName,
              recommended_blend_types: change.after_focus || [],
              reasoning: change.rationale || "",
              usage_pattern: `Specialized for: ${(change.after_focus || []).join(
                ", "
              )}`,
              versatility_score: (change.after_focus || []).length === 1 ? 3 : 5,
              score_improvement: `Expected improvement for ${(change.after_focus || []).join(
                ", "
              )}`,
              trophy_blends: [],
            };
          }) || [],
        collection_gaps: {
          missing_coverage: result.collection_gaps || [],
          redundancies: [],
          overall_assessment: result.summary || "",
        },
        priority_focus_changes: (result.applyable_changes || [])
          .slice(0, 3)
          .map((change, idx) => ({
            pipe_id: change.pipe_id,
            pipe_name:
              pipes.find((p) => p.id === change.pipe_id)?.name || "Unknown",
            current_focus: change.before_focus || [],
            recommended_focus: change.after_focus || [],
            score_improvement: `Priority #${idx + 1} change`,
            trophy_blends_gained: [],
            reasoning: change.rationale || "",
          })),
        next_pipe_recommendations: (result.next_additions || [])
          .slice(0, 3)
          .map((rec, idx) => ({
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
        (transformedResult.pipe_specializations || []).forEach((spec) => {
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
      toast.error("Failed to analyze collection.");
    } finally {
      setLoading(false);
    }
  };

  // Feedback should be keyed by variantKey, not pipeId
  const handleSubmitFeedback = async (variantKey, pipeId) => {
    const feedback = pipeFeedback[variantKey];
    if (!feedback || !feedback.trim()) return;

    const pipe = pipes.find((p) => p.id === pipeId);
    const spec = optimization?.pipe_specializations?.find((s) => {
      const k = getPipeVariantKey(s.pipe_id, s.bowl_variant_id || null);
      return k === variantKey;
    });

    const feedbackEntry = `
Pipe: ${pipe?.name || "Unknown"}
Recommended Focus: ${spec?.recommended_blend_types?.join(", ") || "N/A"}
User Feedback: ${feedback}
---`;

    setUserFeedbackHistory((prev) => prev + feedbackEntry);
    setShowFeedbackFor(null);

    await analyzeCollection(true);
  };

  const handleAcceptAll = async () => {
    if (!optimization?.pipe_specializations) return;

    const changes = {};
    optimization.pipe_specializations.forEach((spec) => {
      if (spec.recommended_blend_types?.length > 0) {
        const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
        changes[k] = true;
      }
    });
    setSelectedChanges(changes);
    setShowConfirmation(true);
  };

  const toggleSelectedChange = (pipeId, bowlVariantId = null) => {
    const k = getPipeVariantKey(pipeId, bowlVariantId);
    setSelectedChanges((prev) => ({
      ...prev,
      [k]: !prev[k],
    }));
  };

  const toggleAllChanges = (checked) => {
    const changes = {};
    optimization.pipe_specializations?.forEach((spec) => {
      if (spec.recommended_blend_types?.length > 0) {
        const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
        changes[k] = !!checked;
      }
    });
    setSelectedChanges(changes);
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
            const bowlIndex = parseInt(
              String(spec.bowl_variant_id).replace("bowl_", ""),
              10
            );
            const bowl = pipe.interchangeable_bowls?.[bowlIndex];
            if (!bowl) return null;

            const currentBowlFocus = JSON.stringify((bowl.focus || []).slice().sort());
            const newFocus = JSON.stringify((spec.recommended_blend_types || []).slice().sort());

            if (currentBowlFocus !== newFocus) {
              const updatedBowls = [...(pipe.interchangeable_bowls || [])];
              updatedBowls[bowlIndex] = {
                ...bowl,
                focus: spec.recommended_blend_types,
              };
              return updatePipeMutation.mutateAsync({
                id: spec.pipe_id,
                data: { interchangeable_bowls: updatedBowls },
              });
            }
          } else {
            const currentFocus = JSON.stringify((pipe.focus || []).slice().sort());
            const newFocus = JSON.stringify((spec.recommended_blend_types || []).slice().sort());

            if (currentFocus !== newFocus) {
              return updatePipeMutation.mutateAsync({
                id: spec.pipe_id,
                data: { focus: spec.recommended_blend_types },
              });
            }
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(updatePromises);

      invalidatePipeQueries(queryClient, user?.email);
      invalidateAIQueries(queryClient, user?.email);

      setShowConfirmation(false);
      setShowAcceptAll(false);
      setSelectedChanges({});
      setUserFeedbackHistory("");

      toast.success("Optimization applied", {
        description: "Regenerate pairings to see updated recommendations",
      });
    } catch (err) {
      console.error("Error accepting recommendations:", err);
      toast.error("Failed to apply recommendations. Please try again.");
    } finally {
      setAcceptingAll(false);
    }
  };

  const applySpecialization = async (pipeId, focus, bowlVariantId = null) => {
    const pipe = pipes.find((p) => p.id === pipeId);
    if (!pipe) return;

    if (bowlVariantId) {
      const bowlIndex = parseInt(String(bowlVariantId).replace("bowl_", ""), 10);
      const updatedBowls = [...(pipe.interchangeable_bowls || [])];
      if (updatedBowls[bowlIndex]) {
        updatedBowls[bowlIndex] = { ...updatedBowls[bowlIndex], focus };
        await updatePipeMutation.mutateAsync({
          id: pipeId,
          data: { interchangeable_bowls: updatedBowls },
        });
      }
    } else {
      await updatePipeMutation.mutateAsync({ id: pipeId, data: { focus } });
    }

    invalidateAIQueries(queryClient, user?.email);
    toast.success(bowlVariantId ? "Bowl focus updated" : "Pipe focus updated", {
      description: "Regenerate pairings to see updated recommendations",
    });
  };

  // Apply optimization changes with undo support
  async function applyOptimizationChangesWithUndo(applyableChanges) {
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

    if (pipe_changes.length === 0) return;

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
  }

  async function undoOptimizationApply(batchId) {
    if (!batchId) return;

    const batches = await base44.entities.AIApplyBatch.filter({ id: batchId });
    const batch = batches?.[0];
    if (!batch?.pipe_changes) return;

    const pipeMap = new Map((pipes || []).map((p) => [p.id, p]));

    for (const ch of batch.pipe_changes) {
      const p = pipeMap.get(ch.pipe_id);
      if (!p) continue;

      if (ch.bowl_variant_id) {
        const idx = parseInt(String(ch.bowl_variant_id).replace("bowl_", ""), 10);
        const bowls = Array.isArray(p.interchangeable_bowls) ? [...p.interchangeable_bowls] : [];
        if (Number.isFinite(idx) && bowls[idx]) {
          bowls[idx] = { ...bowls[idx], focus: ch.before.focus };
          await safeUpdate("Pipe", ch.pipe_id, { interchangeable_bowls: bowls }, user?.email);
        }
      } else {
        await safeUpdate("Pipe", ch.pipe_id, { focus: ch.before.focus }, user?.email);
      }
    }

    invalidatePipeQueries(queryClient, user?.email);
    invalidateAIQueries(queryClient, user?.email);
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (err) {
        console.error("Error uploading photo:", err);
      }
    }

    setWhatIfPhotos((prev) => [...prev, ...uploadedUrls]);
  };

  // ---------- Ask the Expert / Agent Calls ----------
  const buildUsageStats = () => {
    const usageStats = {};
    (usageLogs || []).forEach((log) => {
      if (!log?.pipe_id) return;
      if (!usageStats[log.pipe_id]) usageStats[log.pipe_id] = { count: 0, lastUsed: null };
      usageStats[log.pipe_id].count += log.bowls_smoked || 1;
      if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
        usageStats[log.pipe_id].lastUsed = log.date;
      }
    });
    return usageStats;
  };

  const createOrGetConversation = async (source) => {
    if (currentConversationId) {
      return await base44.agents.getConversation(currentConversationId);
    }
    const conversation = await base44.agents.createConversation({
      agent_name: "expert_tobacconist",
      metadata: {
        source,
        context_provided: true,
        selected_agent: "expert_tobacconist",
      },
    });
    setCurrentConversationId(conversation.id);
    setStickyAgent("expert_tobacconist");
    return conversation;
  };

  const sendToExpert = async ({
    userText,
    source,
    previousMsgs,
    includeFullDiscussion = true,
    maxPairings = 100,
  }) => {
    const debugContext = String(source || "ASK_EXPERT").toUpperCase();
    const startTime = Date.now();

    if (!pipes?.length) {
      const msg = "No pipes found in your collection. Add pipes first to get personalized advice.";
      toast.error(msg);
      return {
        ok: false,
        response: msg,
        debug: { debugContext },
      };
    }

    const usageStats = buildUsageStats();

    const pipesSummary = (pipes || []).map((p) => ({
      id: p.id,
      name: p.name,
      maker: p.maker,
      shape: p.shape,
      chamber_volume: p.chamber_volume,
      focus: p.focus,
      usage_count: usageStats[p.id]?.count || 0,
    }));

    const tobaccosSummary = (blends || []).map((b) => ({
      id: b.id,
      name: b.name,
      blend_type: b.blend_type,
    }));

    const pairingsSummary =
      pairingMatrix?.pairings?.map((pair) => ({
        pipe: pair.pipe_name,
        tobacco: pair.tobacco_name,
        score: pair.score,
      })) || [];

    const conversationContext = includeFullDiscussion
      ? (previousMsgs || [])
          .map((m) => {
            if (m.role === "user") return `User: ${safeToString(m.content)}`;
            const c = m.content;
            const t =
              typeof c === "string"
                ? c
                : safeToString(c?.response || c?.advice || c?.detailed_reasoning || "");
            return `Assistant: ${t}`;
          })
          .join("\n\n")
      : "";

    const messageWithContext = `PREVIOUS DISCUSSION:
${conversationContext}

PIPES (${pipesSummary.length}):
${JSON.stringify(pipesSummary, null, 2)}

TOBACCOS (${tobaccosSummary.length}):
${JSON.stringify(tobaccosSummary, null, 2)}

TOP PAIRINGS (${Math.min(maxPairings, pairingsSummary.length)}):
${JSON.stringify(pairingsSummary.slice(0, maxPairings), null, 2)}

USAGE:
${JSON.stringify(usageStats, null, 2)}

USER QUESTION:
${userText}`;

    const conversation = await createOrGetConversation(source);

    const waitPromise = waitForAssistantMessage(conversation.id, 90000, {
      debug: true,
      context: debugContext,
    });

    await base44.agents.addMessage(conversation, {
      role: "user",
      content: messageWithContext,
    });

    let agentResponse = "";
    try {
      agentResponse = await waitPromise;
    } catch (err) {
      console.error(`[${debugContext}] agent wait failed`, err);
      if (err?.message?.includes("Agent error:")) {
        agentResponse = `The expert agent encountered an error: ${err.message.replace("Agent error: ", "")}`;
      }
    }

    const final = (agentResponse || "").trim()
      ? agentResponse
      : "I couldn't load a response from the expert agent. Please try again.";

    return {
      ok: true,
      response: final,
      debug: {
        conversation_id: conversation.id,
        pipes_count: pipesSummary.length,
        tobaccos_count: tobaccosSummary.length,
        pairings_count: pairingsSummary.length,
        total_time_ms: Date.now() - startTime,
        response_length: final.length,
      },
    };
  };

  const analyzeGeneralQuestion = async () => {
    const q = whatIfQuery.trim();
    if (!q) return;

    if (contextLoading) {
      toast.error("Loading your collection data...");
      return;
    }

    const prevMsgs = conversationMessages;

    setWhatIfLoading(true);
    setConversationMessages((prev) => [
      ...prev,
      { role: "user", content: q, photos: whatIfPhotos, timestamp: new Date().toISOString() },
    ]);
    setWhatIfQuery("");

    try {
      const lastAssistantText = getLastAssistantText(prevMsgs);

      const res = await sendToExpert({
        userText: q,
        source: "ask_expert_general",
        previousMsgs: prevMsgs,
        includeFullDiscussion: true,
        maxPairings: 100,
      });

      let finalResponse = res.response;
      finalResponse = stripRepeatedPrefix(lastAssistantText, finalResponse);

      const aiResponse = {
        is_general_advice: true,
        advice: finalResponse,
        key_points: [],
        tips: [],
        routed_to: "expert_tobacconist",
        sticky_agent: stickyAgent,
        conversation_id: res?.debug?.conversation_id,
        _debug: res?.debug,
      };

      setWhatIfResult(aiResponse);
      setConversationMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      console.error("[ROUTING] Error analyzing general question:", err);
      toast.error("Failed to analyze question. Please try again.");
      setConversationMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: {
            is_general_advice: true,
            advice: `Error: ${err?.message || "Failed to analyze question"}. Please try again.`,
            key_points: [],
            tips: [],
            routed_to: "error",
          },
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleGeneralFollowUp = async () => {
    const q = whatIfFollowUp.trim();
    if (!q) return;

    if (contextLoading) {
      toast.error("Loading your collection data...");
      return;
    }

    const prevMsgs = conversationMessages;

    setWhatIfLoading(true);
    setConversationMessages((prev) => [
      ...prev,
      { role: "user", content: q, timestamp: new Date().toISOString() },
    ]);
    setWhatIfFollowUp("");

    try {
      const lastAssistantText = getLastAssistantText(prevMsgs);

      const res = await sendToExpert({
        userText: q,
        source: "ask_expert_followup",
        previousMsgs: prevMsgs,
        includeFullDiscussion: true,
        maxPairings: 100,
      });

      let finalResponse = res.response;
      finalResponse = stripRepeatedPrefix(lastAssistantText, finalResponse);

      const aiResponse = {
        is_general_advice: true,
        advice: finalResponse,
        key_points: [],
        tips: [],
        routed_to: "expert_tobacconist",
        sticky_agent: stickyAgent,
        conversation_id: res?.debug?.conversation_id,
        _debug: res?.debug,
      };

      setWhatIfResult(aiResponse);
      setConversationMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      console.error("[ROUTING] Error with follow-up:", err);
      toast.error("Failed to process follow-up question");
      setConversationMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: {
            is_general_advice: true,
            advice: `Error: ${err?.message || "Failed to process question"}. Please try again.`,
            key_points: [],
            tips: [],
            routed_to: "error",
          },
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const analyzeCollectionImpact = async () => {
    if (!conversationMessages.length) return;

    setWhatIfLoading(true);

    try {
      const userQuestions = conversationMessages
        .filter((m) => m.role === "user")
        .slice(-6)
        .map((m) => `User: ${safeToString(m.content)}`)
        .join("\n");

      const lastAssistant = [...conversationMessages]
        .reverse()
        .find((m) => m.role === "assistant" && !m.content?.is_impact_analysis);

      const assistantRecommendationText = lastAssistant
        ? safeToString(
            typeof lastAssistant.content === "string"
              ? lastAssistant.content
              : lastAssistant.content?.response || lastAssistant.content?.advice || ""
          )
        : "";

      const whatIfContextParts = [];
      if (userQuestions) whatIfContextParts.push(`USER QUESTIONS:\n${userQuestions}`);
      if (assistantRecommendationText)
        whatIfContextParts.push(
          `ASSISTANT RECOMMENDATION:\n${assistantRecommendationText.substring(0, 1500)}`
        );

      const whatIfText = whatIfContextParts.join("\n\n").substring(0, 3500);

      const result = await generateOptimizationAI({
        pipes,
        blends,
        profile: userProfile,
        whatIfText,
      });

      const impactAnalysis = normalizeImpactResult({
        is_impact_analysis: true,
        impact_score: (result.applyable_changes || []).length > 0 ? 8 : 6,
        trophy_pairings: (result.next_additions || []).slice(0, 5),
        redundancy_analysis: result.summary || "",
        recommendation_category: "STRONG ADDITION",
        detailed_reasoning: result.summary || "",
        gaps_filled: result.collection_gaps || [],
        score_improvements: `Changes may improve collection coverage: ${(result.next_additions || []).join(", ")}`,
        applyable_changes: result.applyable_changes || [],
      });

      setConversationMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: impactAnalysis,
          timestamp: new Date().toISOString(),
          isImpactAnalysis: true,
        },
      ]);

      setWhatIfResult(impactAnalysis);
    } catch (err) {
      console.error("Error analyzing collection impact:", err);
      toast.error("Failed to analyze collection impact. Please try again.");
    } finally {
      setWhatIfLoading(false);
    }
  };

  const resetWhatIf = () => {
    setWhatIfQuery("");
    setWhatIfPhotos([]);
    setWhatIfDescription("");
    setWhatIfResult(null);
    setSuggestedProducts(null);
    setWhatIfFollowUp("");
    setConversationMessages([]);
    setCurrentConversationId(null);
    setStickyAgent(null);
  };

  const suggestProducts = async () => {
    if (!whatIfResult) return;

    setLoadingProducts(true);
    try {
      const conversationContext = (conversationMessages || [])
        .map((m) =>
          m.role === "user"
            ? `User: ${safeToString(m.content)}`
            : `Assistant: ${safeToString(m.content?.advice || m.content?.response || "")}`
        )
        .join("\n\n");

      const fullContext = conversationContext || whatIfQuery;
      const isPipeQuery =
        /pipe|briar|meerschaum|shape|chamber|stem|bowl|calabash|billiard|dublin|bent|straight|rusticated|sandblast|smooth|finish/i.test(
          fullContext
        );
      const isTobaccoQuery =
        /tobacco|blend|tin|virginia|english|latakia|aromatic|flake|ribbon|perique|burley|oriental|navy/i.test(
          fullContext
        );

      let productType = "both";
      if (isPipeQuery && !isTobaccoQuery) productType = "pipes";
      else if (isTobaccoQuery && !isPipeQuery) productType = "tobacco";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this analysis.

Based on this conversation and analysis, suggest 5 specific real-world ${
          productType === "pipes"
            ? "SMOKING PIPES ONLY"
            : productType === "tobacco"
            ? "PIPE TOBACCO BLENDS ONLY"
            : "products (smoking pipes or pipe tobacco blends)"
        } that match the criteria.

Full Conversation Context:
${conversationContext || whatIfQuery}

Analysis Result: ${JSON.stringify(whatIfResult, null, 2)}

For each product, provide:
- Product name (actual product if known, or descriptive name)
- Brand/Manufacturer
${productType !== "tobacco" ? "- For Pipes: Shape, material, chamber size, stem material, finish" : ""}
${productType !== "pipes" ? "- For Blends: Blend type, strength, cut, flavor profile" : ""}
- Price range
- Why it fits the scenario

CRITICAL RULES:
- This is for PIPE SMOKING only. Do NOT suggest cigars, cigarettes, vaping products, or any other tobacco products.
- Do NOT include any URLs, website links, retailer names, or purchasing information.
- Do NOT include source citations or references.
- Do NOT mention where to buy or find these products.
- Focus ONLY on product specifications and why they fit the scenario.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  type: { type: "string" },
                  shape: { type: "string" },
                  material: { type: "string" },
                  chamber_size: { type: "string" },
                  stem_material: { type: "string" },
                  finish: { type: "string" },
                  blend_type: { type: "string" },
                  strength: { type: "string" },
                  cut: { type: "string" },
                  flavor_profile: { type: "string" },
                  price_range: { type: "string" },
                  why_it_fits: { type: "string" },
                },
              },
            },
          },
        },
      });

      setSuggestedProducts(result);
    } catch (err) {
      console.error("Error suggesting products:", err);
      toast.error("Failed to suggest products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const getVersatilityColor = (score) => {
    if (score >= 8) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (score >= 6) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 4) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-rose-100 text-rose-800 border-rose-300";
  };

  // ---------- Early returns ----------
  if (!pipes?.length || !blends?.length) return null;

  if (optLoading) {
    return <div className="text-sm text-stone-700">Loading optimization...</div>;
  }

  if (!optimization) {
    return (
      <div className="text-sm text-stone-700">
        No optimization data yet. Regenerate to get suggestions.
      </div>
    );
  }

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("collectionOptimizerCollapsed", newState.toString());
  };

  // ---------- Ask the Expert standalone card ----------
  if (initialShowWhatIf) {
    return (
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800 text-lg">
            <Lightbulb className="w-5 h-5" />
            Ask the Expert
          </CardTitle>
          <p className="text-sm text-stone-700">Ask questions and discuss the hobby</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {conversationMessages.length > 0 && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-stone-50">
              {conversationMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const content = msg.content;

                const isImpact = !!content?.is_impact_analysis;
                const isGeneralAdvice = !!content?.is_general_advice;
                const isCollectionQuestion = !!content?.is_collection_question;

                return (
                  <div key={idx} className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
                    {isUser ? (
                      <div className="text-right">
                        <div className="inline-block bg-indigo-600 text-white rounded-lg px-4 py-2 max-w-[85%]">
                          <p className="text-sm">
                            {typeof content === "string" ? content : safeToString(content)}
                          </p>

                          {msg.photos?.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {msg.photos.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-left">
                        <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
                          {isGeneralAdvice ? (
                            <div className={`space-y-3 ${readableAssistantWrap}`}>
                              <FormattedTobacconistResponse
                                content={safeToString(content?.advice || "")}
                                style="light_structure"
                              />
                              {content.routed_to && (
                                <div className="mt-2 pt-2 border-t border-stone-300">
                                  <p className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
                                    Answered by: {safeToString(content.routed_to)}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : isImpact ? (
                            <div className="text-sm space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-indigo-600 text-white">
                                  Impact Score: {safeToString(content.impact_score)}/10
                                </Badge>
                                {!!content.recommendation_category && (
                                  <Badge className="bg-blue-600 text-white">
                                    {safeToString(content.recommendation_category)}
                                  </Badge>
                                )}
                              </div>

                              {!!content.detailed_reasoning && (
                                <div className={`space-y-2 ${readableAssistantWrap}`}>
                                  <p className="text-stone-900 font-semibold text-sm">Analysis:</p>
                                  <FormattedTobacconistResponse
                                    content={safeToString(content.detailed_reasoning)}
                                    style="simple_paragraphs"
                                  />
                                </div>
                              )}

                              {Array.isArray(content.trophy_pairings) && content.trophy_pairings.length > 0 && (
                                <div>
                                  <p className="text-stone-900 font-semibold text-xs mb-1">
                                    Trophy Pairings:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {content.trophy_pairings.map((blend, i) => (
                                      <Badge key={i} className="bg-amber-100 text-amber-800 text-xs">
                                        {safeToString(blend)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : isCollectionQuestion ? (
                            <div className={`space-y-2 ${readableAssistantWrap}`}>
                              <FormattedTobacconistResponse
                                content={safeToString(content?.response || "")}
                                style="light_structure"
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-stone-800">{safeToString(content)}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-stone-800 mb-2 block">
              {conversationMessages.length > 0 ? "Continue the conversation..." : "Chat with the Tobacconist"}
            </label>

            <Textarea
              placeholder={
                conversationMessages.length > 0
                  ? "e.g., 'Can you explain more?' or 'What about for Virginia blends?'"
                  : "e.g., 'How do I clean my pipe?' or 'Should I buy a bent pipe for English blends?'"
              }
              value={conversationMessages.length > 0 ? whatIfFollowUp : whatIfQuery}
              onChange={(e) =>
                conversationMessages.length > 0
                  ? setWhatIfFollowUp(e.target.value)
                  : setWhatIfQuery(e.target.value)
              }
              className="min-h-[80px] bg-white text-stone-900 placeholder:text-stone-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  if (conversationMessages.length > 0) {
                    handleGeneralFollowUp();
                  } else {
                    analyzeGeneralQuestion();
                  }
                }
              }}
            />
            <p className="text-xs text-stone-600 mt-1">Press Cmd+Enter to send</p>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-800 mb-2 block">
              Pipe Details (Optional)
            </label>
            <Textarea
              placeholder="Describe characteristics: shape, bowl size, material, etc."
              value={whatIfDescription}
              onChange={(e) => setWhatIfDescription(e.target.value)}
              className="min-h-[60px] bg-white text-stone-900 placeholder:text-stone-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-800 mb-2 block">
              Upload Photos (Optional)
            </label>

            <div
              onDrop={(e) => {
                e.preventDefault();
                handlePhotoUpload({ target: { files: e.dataTransfer.files } });
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <PhotoUploader
                onPhotosSelected={(files) => {
                  const uploadPromises = Array.from(files).map(async (file) => {
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      return file_url;
                    } catch (err) {
                      console.error("Error uploading photo:", err);
                      return null;
                    }
                  });

                  Promise.all(uploadPromises).then((urls) => {
                    const validUrls = urls.filter(Boolean);
                    setWhatIfPhotos((prev) => [...prev, ...validUrls]);
                  });
                }}
                existingPhotos={whatIfPhotos}
              />
            </div>

            {whatIfPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {whatIfPhotos.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                    <button
                      onClick={() => setWhatIfPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {conversationMessages.length > 0 ? (
              <>
                <Button
                  onClick={handleGeneralFollowUp}
                  disabled={whatIfLoading || !whatIfFollowUp.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 w-full"
                >
                  {whatIfLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <HelpCircle className="w-4 h-4 mr-2" />
                  )}
                  Send Message
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={analyzeCollectionImpact}
                    disabled={whatIfLoading}
                    variant="outline"
                    className="border-blue-400 bg-blue-600 text-white hover:bg-blue-700 hover:text-white flex-1"
                  >
                    {whatIfLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="w-4 h-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">Analyze Impact</span>
                    <span className="sm:hidden">Impact</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetWhatIf}
                    className="flex-1 bg-stone-700 text-white hover:bg-stone-800 border-stone-600"
                  >
                    Reset
                  </Button>
                </div>
              </>
            ) : (
              <Button
                onClick={() => {
                  setConversationMessages([]);
                  analyzeGeneralQuestion();
                }}
                disabled={whatIfLoading || !whatIfQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 w-full"
              >
                {whatIfLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Conversation
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------- Main Optimizer UI (unchanged structure, fixes for beige text only) ----------
  return (
    <>
      {/* Staleness Dialog */}
      <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent className="mx-4 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Collection Optimization Out of Date
            </DialogTitle>
            <DialogDescription>
              Your pipes, blends, or preferences have changed. Regenerate optimization now for accurate recommendations?
              You can undo this action.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowRegenDialog(false)}
              className="w-full sm:w-auto"
            >
              Not Now
            </Button>

            {optimization?.previous_active_id && (
              <Button
                variant="outline"
                onClick={() => undoOptimizationMutation.mutate()}
                disabled={undoOptimizationMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Undo className="w-4 h-4 mr-2" />
                Undo Last Change
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
                  Regenerating...
                </>
              ) : (
                "Regenerate"
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
              Review & Apply Optimization Changes
            </DialogTitle>
            <DialogDescription>
              Select which pipe specializations you'd like to apply. Changes will update your collection and refresh the pairing grid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 pb-4 border-b">
              <Checkbox
                id="select-all"
                checked={optimization?.pipe_specializations?.every((spec) => {
                  if (!spec.recommended_blend_types?.length) return true;
                  const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
                  return selectedChanges[k];
                })}
                onCheckedChange={toggleAllChanges}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer text-stone-900">
                Select All
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

              const hasChanges =
                JSON.stringify((currentFocus || []).slice().sort()) !==
                JSON.stringify((spec.recommended_blend_types || []).slice().sort());

              return (
                <div key={variantKey} className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg border">
                  <Checkbox
                    id={`change-${variantKey}`}
                    checked={selectedChanges[variantKey] || false}
                    onCheckedChange={() => toggleSelectedChange(spec.pipe_id, spec.bowl_variant_id || null)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor={`change-${variantKey}`} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-stone-900">{safeToString(spec.pipe_name)}</h4>
                        {!hasChanges && (
                          <Badge variant="outline" className="text-xs">No Change</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                        <div>
                          <p className="text-xs text-stone-600 mb-1">Current:</p>
                          {currentFocus.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {currentFocus.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {safeToString(f)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-500 italic">None set</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-emerald-700 font-medium mb-1">Recommended:</p>
                          <div className="flex flex-wrap gap-1">
                            {(spec.recommended_blend_types || []).map((f, i) => (
                              <Badge key={i} className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                                {safeToString(f)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {spec.score_improvement && (
                        <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                          <p className="text-xs text-emerald-800">
                            <strong>Impact:</strong> {safeToString(spec.score_improvement)}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}

            {optimization?.pipe_specializations?.filter((s) => s.recommended_blend_types?.length > 0).length === 0 && (
              <p className="text-center text-stone-600 py-8">No changes to apply</p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={acceptingAll}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChanges}
              disabled={acceptingAll || Object.values(selectedChanges).filter(Boolean).length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              {acceptingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Apply {Object.values(selectedChanges).filter(Boolean).length} Change
                  {Object.values(selectedChanges).filter(Boolean).length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-blue-800 text-lg sm:text-base">
                  <Target className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">Collection Optimization</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
              <CardDescription className="mt-2 text-stone-700 text-xs sm:text-sm">
                Maximize your collection's potential with strategic pipe specializations
              </CardDescription>
            </div>

            {!isCollapsed && (
              <Button
                onClick={() => analyzeCollection()}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 w-full sm:w-auto flex-shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Analyzing...</span>
                    <span className="sm:hidden">Analyzing</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Update Analysis</span>
                    <span className="sm:hidden">Update</span>
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
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    Recommended Pipe Specializations
                  </h3>
                  <div className="text-blue-600">
                    {showPipesList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {showAcceptAll && showPipesList && (
                  <Button
                    onClick={handleAcceptAll}
                    disabled={acceptingAll}
                    className="bg-emerald-600 hover:bg-emerald-700 ml-2 flex-shrink-0"
                  >
                    {acceptingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Accept All Recommendations
                      </>
                    )}
                  </Button>
                )}
              </div>

              {showPipesList && (
                <div className="space-y-3">
                  {expandPipesToVariants(pipes, { includeMainWhenBowls: false }).map((pv, idx) => {
                    const variantKey = getPipeVariantKey(pv.pipe_id, pv.bowl_variant_id || null);
                    const spec = optimization.pipe_specializations?.find((s) => {
                      const k = getPipeVariantKey(s.pipe_id, s.bowl_variant_id || null);
                      return k === variantKey;
                    });
                    const pipe = pipes.find((p) => p.id === pv.pipe_id);

                    const displaySpec =
                      spec || {
                        pipe_id: pv.pipe_id,
                        bowl_variant_id: pv.bowl_variant_id || null,
                        pipe_name: pv.name,
                        recommended_blend_types: [],
                        reasoning: "No specific recommendation generated. Consider running the optimization again.",
                        versatility_score: 5,
                        usage_pattern: "Versatile - suitable for multiple blend types",
                      };

                    return (
                      <motion.div
                        key={variantKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
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
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                  />
                                ) : (
                                  <PipeShapeIcon shape={pv?.shape || pipe?.shape} className="w-10 h-10" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {pipe?.id ? (
                                    <a
                                      href={createPageUrl(
                                        `PipeDetail?id=${encodeURIComponent(pv.pipe_id)}&bowl=${encodeURIComponent(
                                          pv.bowl_variant_id || ""
                                        )}`
                                      )}
                                    >
                                      <h4 className="font-semibold text-stone-900 hover:text-blue-700 transition-colors text-sm sm:text-base">
                                        {safeToString(pv.name || displaySpec.pipe_name)}
                                      </h4>
                                    </a>
                                  ) : (
                                    <h4
                                      className="font-semibold text-stone-600 text-sm sm:text-base"
                                      title="Pipe not found in collection."
                                    >
                                      {safeToString(displaySpec.pipe_name)}
                                    </h4>
                                  )}

                                  {(pv?.focus?.length > 0 || pipe?.focus?.length > 0) ? (
                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-xs gap-1 flex-shrink-0">
                                      <Star className="w-3 h-3" />
                                      <span className="hidden sm:inline">Specialized</span>
                                    </Badge>
                                  ) : displaySpec.recommended_blend_types?.length > 0 ? (
                                    <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-xs gap-1 flex-shrink-0">
                                      <Star className="w-3 h-3" />
                                      <span className="hidden sm:inline">Recommended</span>
                                    </Badge>
                                  ) : (
                                    <Badge className={`${getVersatilityColor(displaySpec.versatility_score)} text-xs flex-shrink-0`}>
                                      <span className="hidden sm:inline">Ver. {safeToString(displaySpec.versatility_score)}/10</span>
                                      <span className="sm:hidden">{safeToString(displaySpec.versatility_score)}/10</span>
                                    </Badge>
                                  )}
                                </div>

                                {pv.focus && pv.focus.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-stone-700 mb-1">Current Focus:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {pv.focus.map((type, i) => (
                                        <Badge key={i} className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                          {safeToString(type)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {displaySpec.recommended_blend_types?.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-blue-900 mb-1">Specialize for:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {displaySpec.recommended_blend_types.map((type, i) => (
                                        <Badge key={i} className="bg-blue-100 text-blue-800 border-blue-200">
                                          {safeToString(type)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* FIX: remove beige */}
                                <p className="text-sm text-stone-800 mb-2">
                                  {safeToString(displaySpec.reasoning)}
                                </p>

                                {displaySpec.score_improvement && (
                                  <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 mb-2">
                                    <p className="text-xs font-medium text-emerald-700">📈 Score Impact:</p>
                                    <p className="text-xs text-emerald-800 font-semibold">
                                      {safeToString(displaySpec.score_improvement)}
                                    </p>
                                  </div>
                                )}

                                {displaySpec.trophy_blends && displaySpec.trophy_blends.length > 0 && (
                                  <div className="bg-amber-50 rounded-lg p-2 border border-amber-200 mb-2">
                                    <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                      <Trophy className="w-3 h-3" />
                                      Trophy Matches (9-10 scores):
                                    </p>
                                    <p className="text-xs text-amber-800">
                                      {safeToString(displaySpec.trophy_blends.join(", "))}
                                    </p>
                                  </div>
                                )}

                                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                                  <p className="text-xs font-medium text-blue-900">Usage Pattern:</p>
                                  <p className="text-xs text-stone-800">
                                    {safeToString(displaySpec.usage_pattern)}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  {displaySpec.recommended_blend_types?.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                      onClick={() =>
                                        applySpecialization(
                                          pv.pipe_id,
                                          displaySpec.recommended_blend_types,
                                          pv.bowl_variant_id
                                        )
                                      }
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Apply Suggested
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                    onClick={() =>
                                      setShowFeedbackFor(showFeedbackFor === variantKey ? null : variantKey)
                                    }
                                  >
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    {showFeedbackFor === variantKey ? "Cancel" : "Dispute / Add Info"}
                                  </Button>
                                </div>

                                {showFeedbackFor === variantKey && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                                  >
                                    <p className="text-xs font-medium text-amber-800 mb-2">
                                      Share your thoughts on this recommendation:
                                    </p>
                                    <Textarea
                                      placeholder="e.g., 'I prefer using this pipe for Latakia blends, not Virginias'..."
                                      value={pipeFeedback[variantKey] || ""}
                                      onChange={(e) =>
                                        setPipeFeedback((prev) => ({
                                          ...prev,
                                          [variantKey]: e.target.value,
                                        }))
                                      }
                                      className="min-h-[60px] text-sm mb-2 bg-white text-stone-900 placeholder:text-stone-500"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSubmitFeedback(variantKey, pv.pipe_id)}
                                      disabled={!pipeFeedback[variantKey]?.trim() || loading}
                                      className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                      {loading ? (
                                        <>
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          Re-analyzing...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          Submit & Re-analyze
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
                <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  Collection Analysis
                </h3>
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-stone-700 mb-2">Overall Assessment</p>
                      <p className="text-sm text-stone-800">
                        {safeToString(optimization.collection_gaps.overall_assessment)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="text-center pt-2 text-xs text-stone-600">
              {optimization?.generated_date && <p>Last updated: {new Date(optimization.generated_date).toLocaleDateString()}</p>}
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
}