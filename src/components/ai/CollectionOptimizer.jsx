import { getPipeVariantKey, expandPipesToVariants } from "@/components/utils/pipeVariants";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { waitForAssistantMessage } from "@/components/utils/agentWait";
import { Loader2, Target, TrendingUp, ShoppingCart, Sparkles, CheckCircle2, RefreshCw, Check, ChevronDown, ChevronUp, Trophy, HelpCircle, Upload, X, Lightbulb, CheckCheck, Star, AlertTriangle, Undo } from "lucide-react";
import { toast } from "sonner";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generateOptimizationAI } from "@/components/utils/aiGenerators";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries, invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import PhotoUploader from "@/components/PhotoUploader";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { SafeRender } from "@/components/utils/SafeRender";
import { FormattedTobacconistResponse } from "@/components/utils/formatTobacconistResponse";

export default function CollectionOptimizer({ pipes, blends, showWhatIf: initialShowWhatIf = false, improvedWhatIf = false }) {
  if (isAppleBuild) return null;

  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('collectionOptimizerCollapsed');
    return saved === 'true';
  });
  const [showWhatIf, setShowWhatIf] = useState(initialShowWhatIf);
  const [whatIfQuery, setWhatIfQuery] = useState('');
  const [whatIfPhotos, setWhatIfPhotos] = useState([]);
  const [whatIfDescription, setWhatIfDescription] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [suggestedProducts, setSuggestedProducts] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [whatIfFollowUp, setWhatIfFollowUp] = useState('');
  const [whatIfHistory, setWhatIfHistory] = useState([]);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [pipeFeedback, setPipeFeedback] = useState({});
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);
  const [userFeedbackHistory, setUserFeedbackHistory] = useState('');
  const [showAcceptAll, setShowAcceptAll] = useState(false);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState({});
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [showPipesList, setShowPipesList] = useState(true);
  const queryClient = useQueryClient();

  const { user } = useCurrentUser();
  const entitlements = useEntitlements();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Fetch pairing grid for expert_tobacconist context
  const { data: pairingMatrix, isLoading: pairingLoading } = useQuery({
    queryKey: ['pairing-matrix', user?.email],
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

  // Fetch usage logs for expert_tobacconist context
  const { data: usageLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['smoking-logs', user?.email],
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

  // Compute fingerprint and staleness
  const currentFingerprint = React.useMemo(() => 
    buildArtifactFingerprint({ pipes, blends, profile: userProfile }),
    [pipes, blends, userProfile]
  );

  const isStale = React.useMemo(() => 
    !!optimization && (!optimization.input_fingerprint || optimization.input_fingerprint !== currentFingerprint),
    [optimization, currentFingerprint]
  );

  // Show regen dialog when stale (only once until user interacts)
  const [staleDismissedId, setStaleDismissedId] = React.useState(null);
  const [lastShownOptId, setLastShownOptId] = React.useState(null);
  useEffect(() => {
    // Only show dialog if data has actually become stale AND we haven't shown it for this optimization yet
    if (isStale && optimization && lastShownOptId !== optimization.id) {
      setShowRegenDialog(true);
      setLastShownOptId(optimization.id);
    }
  }, [isStale]);

  useEffect(() => {
    if (activeOpt?.id) setOptimization(activeOpt);
  }, [activeOpt?.id]);

  const saveOptimizationMutation = useMutation({
    mutationFn: async (data) => {
      // Deactivate current active optimization
      if (optimization?.id) {
        await safeUpdate('CollectionOptimization', optimization.id, { is_active: false }, user?.email);
      }

      // Create clean payload with only intended fields
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
      if (!optimization?.previous_active_id) {
        throw new Error('No previous version to undo to');
      }

      // Deactivate current
      await safeUpdate('CollectionOptimization', optimization.id, { is_active: false }, user?.email);

      // Reactivate previous
      await safeUpdate('CollectionOptimization', optimization.previous_active_id, { is_active: true }, user?.email);
    },
    onSuccess: () => {
      invalidateAIQueries(queryClient, user?.email);
      setShowRegenDialog(false);
    },
  });

  const updatePipeMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('Pipe', id, data, user?.email),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
    },
  });

  const analyzeCollection = async (withFeedback = false) => {
    if (pipes.length === 0 || blends.length === 0) return;

    setLoading(true);
    try {
      let feedbackContext = "";
      if (withFeedback && userFeedbackHistory) {
        feedbackContext = userFeedbackHistory;
      }

      const result = await generateOptimizationAI({
        pipes,
        blends,
        profile: userProfile,
        whatIfText: feedbackContext
      });

      // Transform result to match existing format
      const transformedResult = {
        pipe_specializations: result.applyable_changes?.map(change => {
          const pipe = pipes.find(p => p.id === change.pipe_id);
          let pipeName = pipe?.name || 'Unknown';
          
          // If bowl variant, append bowl name
          if (change.bowl_variant_id && pipe?.interchangeable_bowls) {
            const bowlIndex = parseInt(change.bowl_variant_id.replace('bowl_', ''));
            const bowl = pipe.interchangeable_bowls[bowlIndex];
            if (bowl) {
              pipeName = `${pipeName} - ${bowl.name || `Bowl ${bowlIndex + 1}`}`;
            }
          }
          
          return {
            pipe_id: change.pipe_id,
            bowl_variant_id: change.bowl_variant_id,
            pipe_name: pipeName,
            recommended_blend_types: change.after_focus || [],
            reasoning: change.rationale || '',
            usage_pattern: `Specialized for: ${(change.after_focus || []).join(', ')}`,
            versatility_score: (change.after_focus || []).length === 1 ? 3 : 5,
            score_improvement: `Expected improvement for ${(change.after_focus || []).join(', ')}`,
            trophy_blends: []
          };
        }) || [],
        collection_gaps: {
          missing_coverage: result.collection_gaps || [],
          redundancies: [],
          overall_assessment: result.summary || ''
        },
        priority_focus_changes: (result.applyable_changes || []).slice(0, 3).map((change, idx) => ({
          pipe_id: change.pipe_id,
          pipe_name: pipes.find(p => p.id === change.pipe_id)?.name || 'Unknown',
          current_focus: change.before_focus || [],
          recommended_focus: change.after_focus || [],
          score_improvement: `Priority #${idx + 1} change`,
          trophy_blends_gained: [],
          reasoning: change.rationale || ''
        })),
        next_pipe_recommendations: (result.next_additions || []).slice(0, 3).map((rec, idx) => ({
          priority_rank: idx + 1,
          shape: 'Recommended',
          material: 'Briar',
          chamber_specs: rec,
          gap_filled: rec,
          budget_range: 'Varies',
          reasoning: rec,
          trophy_blends: [],
          score_improvement: 'Expected improvement'
        }))
      };



      setOptimization(transformedResult);

      // Save optimization to database (with fingerprint)
      await saveOptimizationMutation.mutateAsync({
        ...transformedResult,
        generated_date: new Date().toISOString(),
      });

      // Clear feedback after successful re-analysis and show confirmation
      if (withFeedback) {
        setPipeFeedback({});
        setShowFeedbackFor(null);
        setShowAcceptAll(true);

        // Pre-select all changes with recommendations
        const changes = {};
        result.pipe_specializations?.forEach(spec => {
          if (spec.recommended_blend_types?.length > 0) {
            changes[spec.pipe_id] = true;
          }
        });
        setSelectedChanges(changes);
        setShowConfirmation(true);
      }
    } catch (err) {
      console.error('Error analyzing collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (pipeId) => {
    const feedback = pipeFeedback[pipeId];
    if (!feedback || !feedback.trim()) return;

    const pipe = pipes.find(p => p.id === pipeId);
    const spec = optimization?.pipe_specializations?.find(s => s.pipe_id === pipeId);

    const feedbackEntry = `
Pipe: ${pipe?.name || 'Unknown'}
Recommended Focus: ${spec?.recommended_blend_types?.join(', ') || 'N/A'}
User Feedback: ${feedback}
---`;

    setUserFeedbackHistory(prev => prev + feedbackEntry);
    setShowFeedbackFor(null);
    
    // Re-run analysis with all accumulated feedback
    await analyzeCollection(true);
  };

  const handleAcceptAll = async () => {
    if (!optimization?.pipe_specializations) return;
    
    // Pre-select all changes and open confirmation dialog
    const changes = {};
    optimization.pipe_specializations?.forEach(spec => {
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
      // Apply only selected changes
      const updatePromises = optimization.pipe_specializations
        .filter(spec => {
          const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
          return selectedChanges[k] && spec.recommended_blend_types?.length > 0;
        })
        .map(spec => {
          const pipe = pipes.find(p => p.id === spec.pipe_id);
          if (!pipe) return null;
          
          if (spec.bowl_variant_id) {
            // Update bowl variant focus
            const bowlIndex = parseInt(spec.bowl_variant_id.replace('bowl_', ''));
            const bowl = pipe.interchangeable_bowls?.[bowlIndex];
            if (!bowl) return null;
            
            const currentBowlFocus = JSON.stringify(bowl.focus?.sort() || []);
            const newFocus = JSON.stringify(spec.recommended_blend_types.sort());
            
            if (currentBowlFocus !== newFocus) {
              const updatedBowls = [...(pipe.interchangeable_bowls || [])];
              updatedBowls[bowlIndex] = { ...bowl, focus: spec.recommended_blend_types };
              return updatePipeMutation.mutateAsync({
                id: spec.pipe_id,
                data: { interchangeable_bowls: updatedBowls }
              });
            }
          } else {
            // Update main pipe focus
            const currentFocus = JSON.stringify(pipe.focus?.sort() || []);
            const newFocus = JSON.stringify(spec.recommended_blend_types.sort());
            
            if (currentFocus !== newFocus) {
              return updatePipeMutation.mutateAsync({
                id: spec.pipe_id,
                data: { focus: spec.recommended_blend_types }
              });
            }
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(updatePromises);
      
      // Invalidate queries to refresh data
      invalidatePipeQueries(queryClient, user?.email);
      invalidateAIQueries(queryClient, user?.email);
      
      setShowConfirmation(false);
      setShowAcceptAll(false);
      setSelectedChanges({});
      setUserFeedbackHistory('');
      toast.success('Optimization applied', {
        description: 'Regenerate pairings to see updated recommendations'
      });
    } catch (err) {
      console.error('Error accepting recommendations:', err);
      toast.error('Failed to apply recommendations. Please try again.');
    } finally {
      setAcceptingAll(false);
    }
  };

const toggleSelectedChange = (pipeId, bowlVariantId = null) => {
  const k = getPipeVariantKey(pipeId, bowlVariantId);
  setSelectedChanges(prev => ({
    ...prev,
    [k]: !prev[k]
  }));
};

const toggleAllChanges = (checked) => {
  const changes = {};
  optimization.pipe_specializations?.forEach(spec => {
    if (spec.recommended_blend_types?.length > 0) {
      const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
      changes[k] = checked;
    }
  });
  setSelectedChanges(changes);
};

  const applySpecialization = async (pipeId, focus, bowlVariantId = null) => {
    const pipe = pipes.find(p => p.id === pipeId);
    if (!pipe) return;

    if (bowlVariantId) {
      // Apply focus to specific bowl variant
      const bowlIndex = parseInt(bowlVariantId.replace('bowl_', ''));
      const updatedBowls = [...(pipe.interchangeable_bowls || [])];
      if (updatedBowls[bowlIndex]) {
        updatedBowls[bowlIndex] = {
          ...updatedBowls[bowlIndex],
          focus
        };
        await updatePipeMutation.mutateAsync({
          id: pipeId,
          data: { interchangeable_bowls: updatedBowls }
        });
      }
    } else {
      // Apply focus to main pipe
      await updatePipeMutation.mutateAsync({
        id: pipeId,
        data: { focus }
      });
    }

    // Invalidate AI queries to refresh pairings
    invalidateAIQueries(queryClient, user?.email);
    toast.success(bowlVariantId ? 'Bowl focus updated' : 'Pipe focus updated', {
      description: 'Regenerate pairings to see updated recommendations'
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

  // Save a batch for undo
  const batch = await base44.entities.AIApplyBatch.create({
    created_by: user?.email,
    type: "optimization_focus_apply",
    created_at: new Date().toISOString(),
    pipe_changes,
  });

  // Apply changes to pipe or bowl
  for (const ch of pipe_changes) {
    const p = pipeMap.get(ch.pipe_id);
    if (!p) continue;

    if (ch.bowl_variant_id) {
      const idx = parseInt(String(ch.bowl_variant_id).replace("bowl_", ""), 10);
      const bowls = Array.isArray(p.interchangeable_bowls) ? [...p.interchangeable_bowls] : [];
      if (Number.isFinite(idx) && bowls[idx]) {
        bowls[idx] = {
          ...bowls[idx],
          focus: ch.after.focus,
        };
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
    const files = Array.from(e.target.files);
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (err) {
        console.error('Error uploading photo:', err);
      }
    }
    
    setWhatIfPhotos([...whatIfPhotos, ...uploadedUrls]);
  };

  // Router: Detect if question should go to expert_tobacconist agent
  const shouldRouteToAgent = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Intent triggers
    const intentTriggers = [
      'which pipe', 'which tobacco', 'which blend',
      'lowest scoring', 'worst', 'most redundant', 'redundant',
      'get rid of', 'remove', 'replace', 'upgrade', 'sell', 'trade',
      'best candidate', 'optimize', 'greatest impact',
      'what should i smoke', 'what should i age',
      'value', 'worth', 'pairing grid', 'pairings',
      'cellar strategy', 'aging plan', 'rotation',
      'gap', 'missing', 'need'
    ];
    
    return intentTriggers.some(trigger => lowerQuery.includes(trigger));
  };

  // Store conversation ID and agent for sticky routing
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [stickyAgent, setStickyAgent] = useState(null);

  const analyzeCollectionQuestion = async () => {
    if (!whatIfQuery.trim()) return;
    
    // Check if context data is still loading
    if (contextLoading) {
      toast.error('Loading your collection data...');
      return;
    }
    
    setWhatIfLoading(true);
    
    // Add user message to conversation
    setConversationMessages(prev => [...prev, {
      role: 'user',
      content: whatIfQuery,
      timestamp: new Date().toISOString()
    }]);
    
    const currentQuery = whatIfQuery;
    setWhatIfQuery(''); // Clear input immediately
    
    try {
      // ALWAYS route to expert_tobacconist for "Ask the Expert"
      const debugContext = 'ASK_EXPERT';
        const startTime = Date.now();
        
        console.log(`[${debugContext}] ▶️ Starting agent call`, {
          timestamp: new Date().toISOString(),
          query: currentQuery
        });
        
        // Validate required context
        if (pipes.length === 0) {
          const errorMsg = 'No pipes found in your collection. Add pipes first to get personalized advice.';
          toast.error(errorMsg);
          setConversationMessages(prev => [...prev, {
            role: 'assistant',
            content: {
              is_collection_question: true,
              response: errorMsg,
              specific_recommendations: [],
              collection_insights: [],
              routed_to: 'error'
            },
            timestamp: new Date().toISOString()
          }]);
          setWhatIfLoading(false);
          return;
        }
        
        // Prepare usage statistics
        const usageStats = {};
        usageLogs.forEach(log => {
          if (log.pipe_id) {
            if (!usageStats[log.pipe_id]) {
              usageStats[log.pipe_id] = { count: 0, lastUsed: null };
            }
            usageStats[log.pipe_id].count += log.bowls_smoked || 1;
            if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
              usageStats[log.pipe_id].lastUsed = log.date;
            }
          }
        });
        
        // Build COMPACT context summary (avoiding massive JSON payloads)
        const pipesSummary = pipes.map(p => ({
          id: p.id,
          name: p.name,
          maker: p.maker,
          shape: p.shape,
          chamber_volume: p.chamber_volume,
          focus: p.focus,
          usage_count: usageStats[p.id]?.count || 0
        }));
        
        const tobaccosSummary = blends.map(b => ({
          id: b.id,
          name: b.name,
          blend_type: b.blend_type
        }));
        
        // Extract only essential pairing data
        const pairingsSummary = pairingMatrix?.pairings?.map(pair => ({
          pipe: pair.pipe_name,
          tobacco: pair.tobacco_name,
          score: pair.score
        })) || [];
        
        const contextPayload = {
          pipes: pipesSummary,
          tobaccos: tobaccosSummary,
          pairings: pairingsSummary.slice(0, 100), // Limit to avoid huge payloads
          usage: usageStats
        };
        
        const payloadSize = JSON.stringify(contextPayload).length;
        
        console.log(`[${debugContext}] Context prepared:`, {
          pipes_count: pipesSummary.length,
          tobaccos_count: tobaccosSummary.length,
          pairings_count: pairingsSummary.length,
          pairings_included: Math.min(100, pairingsSummary.length),
          usage_stats_count: Object.keys(usageStats).length,
          payload_size_bytes: payloadSize,
          elapsed_ms: Date.now() - startTime
        });
        
        // Route to expert_tobacconist agent with sticky metadata
        const conversation = await base44.agents.createConversation({
          agent_name: 'expert_tobacconist',
          metadata: { 
            source: 'ask_expert',
            context_provided: true,
            selected_agent: 'expert_tobacconist' // Store for sticky routing
          }
        });
        
        // Store conversation ID and agent for follow-ups
        setCurrentConversationId(conversation.id);
        setStickyAgent('expert_tobacconist');
        
        console.log(`[${debugContext}] Conversation created:`, {
          conversation_id: conversation.id,
          elapsed_ms: Date.now() - startTime
        });
        
        // Build message with compact context
        const messageWithContext = `USER COLLECTION SUMMARY:
Pipes: ${pipesSummary.length} | Tobaccos: ${tobaccosSummary.length} | Pairings: ${pairingsSummary.length}

PIPES:
${JSON.stringify(pipesSummary, null, 2)}

TOBACCOS:
${JSON.stringify(tobaccosSummary, null, 2)}

TOP PAIRINGS (${Math.min(100, pairingsSummary.length)} shown):
${JSON.stringify(pairingsSummary.slice(0, 100), null, 2)}

USAGE STATISTICS:
${JSON.stringify(usageStats, null, 2)}

USER QUESTION:
${currentQuery}`;
        
        const messageSize = messageWithContext.length;
        console.log(`[${debugContext}] Message size:`, {
          characters: messageSize,
          kilobytes: (messageSize / 1024).toFixed(2)
        });
        
        // Start waiting BEFORE sending message to avoid race conditions
        const waitPromise = waitForAssistantMessage(conversation.id, 90000, { 
          debug: true, 
          context: debugContext 
        });
        
        const addMessageStart = Date.now();
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: messageWithContext
        });
        
        console.log(`[${debugContext}] ✅ addMessage complete:`, {
          elapsed_ms: Date.now() - addMessageStart,
          total_elapsed_ms: Date.now() - startTime
        });
        
        // Wait for assistant response
        let agentResponse = "";
        try {
          agentResponse = await waitPromise;
          
          console.log(`[${debugContext}] ✅ Agent response received:`, {
            response_length: agentResponse.length,
            preview: agentResponse.substring(0, 200),
            total_elapsed_ms: Date.now() - startTime
          });
        } catch (err) {
          console.error(`[${debugContext}] ❌ Agent wait failed:`, {
            error: err.message,
            total_elapsed_ms: Date.now() - startTime
          });
          
          // Surface agent errors to user
          if (err.message?.includes("Agent error:")) {
            agentResponse = `The expert agent encountered an error: ${err.message.replace("Agent error: ", "")}`;
          }
        }
        
        // Handle empty or missing response
        let finalResponse = agentResponse;
        if (!finalResponse || finalResponse.trim().length === 0) {
          finalResponse = "I couldn't load a response from the expert agent. Please try again.";
          console.error(`[${debugContext}] ❌ Empty response after ${Date.now() - startTime}ms`);
        }
        
        const aiResponse = {
          is_collection_question: true,
          response: finalResponse,
          specific_recommendations: [],
          collection_insights: [],
          routed_to: 'expert_tobacconist',
          _debug: {
            conversation_id: conversation.id,
            pipes_count: pipesSummary.length,
            tobaccos_count: tobaccosSummary.length,
            pairings_count: pairingsSummary.length,
            payload_size_bytes: payloadSize,
            response_length: finalResponse.length,
            total_time_ms: Date.now() - startTime
          }
        };
        
        console.log(`[${debugContext}] ✅ Complete:`, {
          total_time_ms: Date.now() - startTime,
          response_preview: finalResponse.substring(0, 100)
        });
        
        setWhatIfResult(aiResponse);
        
        // Add AI response to conversation
        setConversationMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }]);
    } catch (err) {
      console.error('[ROUTING] Error analyzing collection question:', err);
      console.error('[ROUTING] Error details:', {
        message: err?.message,
        stack: err?.stack,
        response: err?.response?.data
      });
      
      toast.error('Failed to analyze question. Please try again.');
      
      // Add error message to conversation instead of removing
      setConversationMessages(prev => [...prev, {
        role: 'assistant',
        content: {
          is_collection_question: true,
          response: `Error: ${err?.message || 'Failed to analyze question'}. Please try again.`,
          specific_recommendations: [],
          collection_insights: [],
          routed_to: 'error'
        },
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const analyzeGeneralQuestion = async () => {
    if (!whatIfQuery.trim()) return;
    
    setWhatIfLoading(true);
    
    // Add user message to conversation
    setConversationMessages(prev => [...prev, {
      role: 'user',
      content: whatIfQuery,
      photos: whatIfPhotos,
      timestamp: new Date().toISOString()
    }]);
    
    const currentQuery = whatIfQuery;
    setWhatIfQuery(''); // Clear input immediately
    
    try {
      // ALWAYS route to expert_tobacconist for "Ask the Expert"
      console.log('[ROUTING] Routing to expert_tobacconist agent');
      
      // Prepare usage statistics
      const usageStats = {};
        usageLogs.forEach(log => {
          if (log.pipe_id) {
            if (!usageStats[log.pipe_id]) {
              usageStats[log.pipe_id] = { count: 0, lastUsed: null };
            }
            usageStats[log.pipe_id].count += log.bowls_smoked || 1;
            if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
              usageStats[log.pipe_id].lastUsed = log.date;
            }
          }
        });
        
        // Prepare context payload with COMPLETE data
        const contextPayload = {
          pipes: pipes.map(p => ({
            id: p.id,
            name: p.name,
            maker: p.maker,
            shape: p.shape,
            chamber_volume: p.chamber_volume,
            bowl_diameter_mm: p.bowl_diameter_mm,
            focus: p.focus,
            usage_count: usageStats[p.id]?.count || 0,
            last_used: usageStats[p.id]?.lastUsed || null
          })),
          tobaccos: blends.map(b => ({
            id: b.id,
            name: b.name,
            manufacturer: b.manufacturer,
            blend_type: b.blend_type,
            strength: b.strength
          })),
          pairingGrid: pairingMatrix ? {
            pairings: pairingMatrix.pairings || [],
            generated_date: pairingMatrix.generated_date
          } : null,
          usageLogs: {
            total_sessions: usageLogs.length,
            pipe_usage: usageStats
          }
        };
        
        console.log('[ROUTING] Context payload:', {
          pipes_count: contextPayload.pipes.length,
          tobaccos_count: contextPayload.tobaccos.length,
          pairingGrid_present: !!contextPayload.pairingGrid,
          usageLogs_present: !!contextPayload.usageLogs
        });
        
        // Route to expert_tobacconist agent - reuse or create with sticky metadata
        let conversation;
        if (currentConversationId) {
          conversation = await base44.agents.getConversation(currentConversationId);
        } else {
          conversation = await base44.agents.createConversation({
            agent_name: 'expert_tobacconist',
            metadata: { 
              source: 'what_if_general',
              selected_agent: 'expert_tobacconist'
            }
          });
          setCurrentConversationId(conversation.id);
          setStickyAgent('expert_tobacconist');
        }
        
        const messageWithContext = `USER CONTEXT:
Pipes in collection: ${contextPayload.pipes.length}
Tobaccos in collection: ${contextPayload.tobaccos.length}

COLLECTION DATA:
${JSON.stringify(contextPayload, null, 2)}

USER QUESTION:
${currentQuery}`;
        
        // Start waiting BEFORE sending message
        const waitPromise = waitForAssistantMessage(conversation.id, 90000, { 
          debug: true, 
          context: 'ROUTING_GENERAL' 
        });
        
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: messageWithContext,
          file_urls: whatIfPhotos.length > 0 ? whatIfPhotos : undefined
        });
        
        console.log('[ROUTING] Waiting for expert_tobacconist response...');
        
        // Wait for assistant response asynchronously
        let agentResponse = "";
        try {
          agentResponse = await waitPromise;
          console.log('[ROUTING] Response received:', {
            length: agentResponse.length,
            preview: agentResponse.substring(0, 100)
          });
        } catch (err) {
          console.error('[ROUTING] Failed to receive response:', err);
        }
        
        let finalResponse = agentResponse;
        if (!finalResponse || finalResponse.trim().length === 0) {
          finalResponse = "I couldn't load a response from the expert agent. Please try again.";
          console.error('[ROUTING] Agent returned empty response or timed out');
        }
        
        const aiResponse = {
          is_general_advice: true,
          advice: finalResponse,
          key_points: [],
          tips: [],
          routed_to: 'expert_tobacconist'
        };
        
        setWhatIfResult(aiResponse);
        
        // Add AI response to conversation
        setConversationMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }]);
    } catch (err) {
      console.error('[ROUTING] Error analyzing general question:', err);
      console.error('[ROUTING] Error details:', {
        message: err?.message,
        response: err?.response?.data
      });
      
      toast.error('Failed to analyze question. Please try again.');
      
      // Add error message to conversation
      setConversationMessages(prev => [...prev, {
        role: 'assistant',
        content: {
          is_general_advice: true,
          advice: `Error: ${err?.message || 'Failed to analyze question'}. Please try again.`,
          key_points: [],
          tips: [],
          routed_to: 'error'
        },
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setWhatIfLoading(false);
    }
  };

  // Normalize impact result to ensure all string fields are strings (not objects)
  const normalizeImpactResult = (result) => {
    if (!result) return null;
    
    return {
      ...result,
      redundancy_analysis: typeof result.redundancy_analysis === 'string' 
        ? result.redundancy_analysis 
        : (result.redundancy_analysis?.summary || JSON.stringify(result.redundancy_analysis || '')),
      detailed_reasoning: typeof result.detailed_reasoning === 'string'
        ? result.detailed_reasoning
        : (result.detailed_reasoning?.summary || JSON.stringify(result.detailed_reasoning || '')),
      score_improvements: typeof result.score_improvements === 'string'
        ? result.score_improvements
        : JSON.stringify(result.score_improvements || '')
    };
  };

  const analyzeCollectionImpact = async () => {
    if (conversationMessages.length === 0) return;
    
    setWhatIfLoading(true);
    
    try {
      // Get user questions AND most recent assistant recommendation
      const userQuestions = conversationMessages
        .filter(m => m.role === 'user')
        .slice(-6)  // Last 6 user messages for context
        .map(m => `User: ${m.content}`)
        .join('\n');

      // Find the most recent assistant message (that's not an impact analysis)
      const lastAssistant = [...conversationMessages]
        .reverse()
        .find(m => m.role === 'assistant' && !m.content?.is_impact_analysis);
      
      const assistantRecommendationText = lastAssistant
        ? (typeof lastAssistant.content === 'string' 
            ? lastAssistant.content 
            : (lastAssistant.content?.response || lastAssistant.content?.advice || ''))
        : '';

      // Build compact conversation context with both user and assistant
      const whatIfContextParts = [];
      if (userQuestions) whatIfContextParts.push(`USER QUESTIONS:\n${userQuestions}`);
      if (assistantRecommendationText) whatIfContextParts.push(`ASSISTANT RECOMMENDATION:\n${assistantRecommendationText.substring(0, 1500)}`);
      
      const whatIfText = whatIfContextParts.join('\n\n').substring(0, 3500);
      
      // Run collection impact analysis
      try {
        const result = await generateOptimizationAI({
          pipes,
          blends,
          profile: userProfile,
          whatIfText
        });

        // Transform the result to match whatIfResult format
        const impactAnalysis = normalizeImpactResult({
          is_impact_analysis: true,
          impact_score: result.applyable_changes?.length > 0 ? 8 : 6,
          trophy_pairings: (result.next_additions || []).slice(0, 5),
          redundancy_analysis: result.summary || '',
          recommendation_category: 'STRONG ADDITION',
          detailed_reasoning: result.summary || '',
          gaps_filled: result.collection_gaps || [],
          score_improvements: `Changes may improve collection coverage: ${(result.next_additions || []).join(', ')}`,
          applyable_changes: result.applyable_changes || []
        });
        
        // Add impact analysis to conversation
        setConversationMessages(prev => [...prev, {
          role: 'assistant',
          content: impactAnalysis,
          timestamp: new Date().toISOString(),
          isImpactAnalysis: true
        }]);
        
        setWhatIfResult(impactAnalysis);
      } catch (err) {
        console.error('Error analyzing collection impact:', err);
        toast.error('Failed to analyze collection impact. Please try again.');
        // Log root error for debugging
        console.error('Root error:', err?.message || err);
      }
    } catch (err) {
      console.error('Error in impact analysis:', err);
      toast.error('Failed to analyze impact.');
    } finally {
      setWhatIfLoading(false);
    }
  };

  const resetWhatIf = () => {
    setWhatIfQuery('');
    setWhatIfPhotos([]);
    setWhatIfDescription('');
    setWhatIfResult(null);
    setSuggestedProducts(null);
    setWhatIfFollowUp('');
    setWhatIfHistory([]);
    setConversationMessages([]);
    setCurrentConversationId(null);
    setStickyAgent(null);
  };

  const handleCollectionFollowUp = async () => {
    const query = whatIfFollowUp.trim();
    if (!query) return;

    // Check if context data is still loading
    if (contextLoading) {
      toast.error('Loading your collection data...');
      return;
    }

    setWhatIfLoading(true);

    // Add user follow-up to conversation
    setConversationMessages(prev => [...prev, {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    }]);

    setWhatIfFollowUp('');

    try {
      // ALWAYS route to expert_tobacconist for "Ask the Expert"
      console.log('[EXPERT_TOBACCONIST] Follow-up routing to expert agent');
        
        // Validate required context
        if (pipes.length === 0) {
          const errorMsg = 'No pipes found in your collection.';
          toast.error(errorMsg);
          setConversationMessages(prev => [...prev, {
            role: 'assistant',
            content: {
              is_collection_question: true,
              response: errorMsg,
              specific_recommendations: [],
              collection_insights: [],
              routed_to: 'error'
            },
            timestamp: new Date().toISOString()
          }]);
          setWhatIfLoading(false);
          return;
        }
        
        // Prepare usage statistics
        const usageStats = {};
        usageLogs.forEach(log => {
          if (log.pipe_id) {
            if (!usageStats[log.pipe_id]) {
              usageStats[log.pipe_id] = { count: 0, lastUsed: null };
            }
            usageStats[log.pipe_id].count += log.bowls_smoked || 1;
            if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
              usageStats[log.pipe_id].lastUsed = log.date;
            }
          }
        });
        
        // Prepare comprehensive context payload
        const contextPayload = {
          pipes: pipes.map(p => ({
            id: p.id,
            name: p.name,
            maker: p.maker,
            shape: p.shape,
            bowlStyle: p.bowlStyle,
            chamber_volume: p.chamber_volume,
            bowl_diameter_mm: p.bowl_diameter_mm,
            focus: p.focus,
            usage_count: usageStats[p.id]?.count || 0,
            last_used: usageStats[p.id]?.lastUsed || null
          })),
          tobaccos: blends.map(b => ({
            id: b.id,
            name: b.name,
            manufacturer: b.manufacturer,
            blend_type: b.blend_type,
            strength: b.strength,
            flavor_notes: b.flavor_notes
          })),
          pairingGrid: pairingMatrix ? {
            pairings: pairingMatrix.pairings || [],
            generated_date: pairingMatrix.generated_date
          } : null,
          usageLogs: {
            total_sessions: usageLogs.length,
            pipe_usage: usageStats
          }
        };
        
        // Build COMPACT context
        const pipesSummary = pipes.map(p => ({
          id: p.id,
          name: p.name,
          maker: p.maker,
          shape: p.shape,
          chamber_volume: p.chamber_volume,
          focus: p.focus,
          usage_count: usageStats[p.id]?.count || 0
        }));
        
        const tobaccosSummary = blends.map(b => ({
          id: b.id,
          name: b.name,
          blend_type: b.blend_type
        }));
        
        const pairingsSummary = pairingMatrix?.pairings?.map(pair => ({
          pipe: pair.pipe_name,
          tobacco: pair.tobacco_name,
          score: pair.score
        })) || [];
        
        const payloadSize = JSON.stringify({ pipes: pipesSummary, tobaccos: tobaccosSummary, pairings: pairingsSummary.slice(0, 100) }).length;
        
        console.log(`[${debugContext}] Context prepared:`, {
          pipes: pipesSummary.length,
          tobaccos: tobaccosSummary.length,
          pairings: Math.min(100, pairingsSummary.length),
          payload_kb: (payloadSize / 1024).toFixed(2)
        });
        
        // Route to expert_tobacconist agent - reuse existing conversation or create new
        let conversation;
        if (currentConversationId) {
          // Reuse existing conversation
          conversation = await base44.agents.getConversation(currentConversationId);
        } else {
          // Create new conversation with sticky metadata
          conversation = await base44.agents.createConversation({
            agent_name: 'expert_tobacconist',
            metadata: { 
              source: 'followup_expert',
              selected_agent: 'expert_tobacconist'
            }
          });
          setCurrentConversationId(conversation.id);
          setStickyAgent('expert_tobacconist');
        }
        
        console.log(`[${debugContext}] Conversation ID:`, conversation.id);
        
        // Add conversation history as context
        const conversationContext = conversationMessages
          .map(m => m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content.response || m.content.advice || ''}`)
          .join('\n\n');
        
        const messageWithContext = `PREVIOUS DISCUSSION:
${conversationContext}

PIPES (${pipesSummary.length}):
${JSON.stringify(pipesSummary, null, 2)}

TOBACCOS (${tobaccosSummary.length}):
${JSON.stringify(tobaccosSummary, null, 2)}

TOP PAIRINGS (${Math.min(100, pairingsSummary.length)}):
${JSON.stringify(pairingsSummary.slice(0, 100), null, 2)}

USAGE:
${JSON.stringify(usageStats, null, 2)}

FOLLOW-UP:
${query}`;
        
        // Start waiting BEFORE sending message
        const waitPromise = waitForAssistantMessage(conversation.id, 90000, { 
          debug: true, 
          context: debugContext 
        });
        
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: messageWithContext
        });
        
        console.log(`[${debugContext}] Message sent, waiting...`);
        
        // Wait for assistant response
        let agentResponse = "";
        try {
          agentResponse = await waitPromise;
        } catch (err) {
          console.error(`[${debugContext}] Wait failed:`, err);
          if (err.message?.includes("Agent error:")) {
            agentResponse = `The expert agent encountered an error: ${err.message.replace("Agent error: ", "")}`;
          }
        }
        
        let finalResponse = agentResponse;
        if (!finalResponse || finalResponse.trim().length === 0) {
          finalResponse = "I couldn't load a response from the expert agent. Please try again.";
          console.error(`[${debugContext}] Empty response`);
        }
        
        const aiResponse = {
          is_collection_question: true,
          response: finalResponse,
          specific_recommendations: [],
          collection_insights: [],
          routed_to: 'expert_tobacconist',
          sticky_agent: stickyAgent,
          conversation_id: conversation.id,
          _debug: {
            conversation_id: conversation.id,
            pipes_count: pipesSummary.length,
            tobaccos_count: tobaccosSummary.length,
            pairings_count: pairingsSummary.length,
            payload_size_bytes: payloadSize,
            response_length: finalResponse.length,
            total_time_ms: Date.now() - startTime
          }
        };

        setConversationMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }]);

        setWhatIfResult(aiResponse);
    } catch (err) {
      console.error('Error with follow-up question:', err);
      toast.error('Failed to process follow-up question');

      // Remove the user message if analysis failed
      setConversationMessages(prev => prev.slice(0, -1));
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleGeneralFollowUp = async () => {
    const query = whatIfFollowUp.trim();
    if (!query) return;

    // Check if context data is still loading
    if (contextLoading) {
      toast.error('Loading your collection data...');
      return;
    }

    setWhatIfLoading(true);

    // Add user follow-up to conversation
    setConversationMessages(prev => [...prev, {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    }]);

    setWhatIfFollowUp('');

    try {
      // ALWAYS route to expert_tobacconist for "Ask the Expert"
      const debugContext = 'FOLLOWUP_EXPERT';
        const startTime = Date.now();
        
        console.log(`[${debugContext}] ▶️ Starting follow-up agent call`, {
          timestamp: new Date().toISOString(),
          query: query
        });
        
        // Validate and prepare context
        if (pipes.length === 0) {
          const errorMsg = 'No pipes found in your collection.';
          toast.error(errorMsg);
          setConversationMessages(prev => [...prev, {
            role: 'assistant',
            content: {
              is_general_advice: true,
              advice: errorMsg,
              key_points: [],
              tips: [],
              routed_to: 'error'
            },
            timestamp: new Date().toISOString()
          }]);
          setWhatIfLoading(false);
          return;
        }
        
        // Prepare usage statistics
        const usageStats = {};
        usageLogs.forEach(log => {
          if (log.pipe_id) {
            if (!usageStats[log.pipe_id]) {
              usageStats[log.pipe_id] = { count: 0, lastUsed: null };
            }
            usageStats[log.pipe_id].count += log.bowls_smoked || 1;
            if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
              usageStats[log.pipe_id].lastUsed = log.date;
            }
          }
        });
        
        const contextPayload = {
          pipes: pipes.map(p => ({
            id: p.id,
            name: p.name,
            maker: p.maker,
            shape: p.shape,
            chamber_volume: p.chamber_volume,
            bowl_diameter_mm: p.bowl_diameter_mm,
            focus: p.focus,
            usage_count: usageStats[p.id]?.count || 0,
            last_used: usageStats[p.id]?.lastUsed || null
          })),
          tobaccos: blends.map(b => ({
            id: b.id,
            name: b.name,
            manufacturer: b.manufacturer,
            blend_type: b.blend_type,
            strength: b.strength
          })),
          pairingGrid: pairingMatrix ? {
            pairings: pairingMatrix.pairings || [],
            generated_date: pairingMatrix.generated_date
          } : null,
          usageLogs: {
            total_sessions: usageLogs.length,
            pipe_usage: usageStats
          }
        };
        
        // Route to expert_tobacconist agent - reuse or create with sticky metadata
        let conversation;
        if (currentConversationId) {
          conversation = await base44.agents.getConversation(currentConversationId);
        } else {
          conversation = await base44.agents.createConversation({
            agent_name: 'expert_tobacconist',
            metadata: { 
              source: 'what_if_followup',
              selected_agent: 'expert_tobacconist'
            }
          });
          setCurrentConversationId(conversation.id);
          setStickyAgent('expert_tobacconist');
        }
        
        // Add conversation history as context
        const conversationContext = conversationMessages
          .map(m => m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content.advice || m.content.response || ''}`)
          .join('\n\n');
        
        const messageWithContext = `USER COLLECTION CONTEXT:
Pipes: ${contextPayload.pipes.length}
Tobaccos: ${contextPayload.tobaccos.length}
Pairing Grid: ${contextPayload.pairingGrid ? 'Available' : 'Not Generated'}
Usage Logs: ${contextPayload.usageLogs.total_sessions} sessions

PIPES DATA:
${JSON.stringify(contextPayload.pipes, null, 2)}

TOBACCOS DATA:
${JSON.stringify(contextPayload.tobaccos, null, 2)}

${contextPayload.pairingGrid ? `PAIRING GRID:
${JSON.stringify(contextPayload.pairingGrid, null, 2)}` : ''}

USAGE STATISTICS:
${JSON.stringify(contextPayload.usageLogs, null, 2)}

PREVIOUS DISCUSSION:
${conversationContext}

FOLLOW-UP QUESTION:
${query}`;
        
        // Start waiting BEFORE sending message
        const waitPromise = waitForAssistantMessage(conversation.id, 90000, { 
          debug: true, 
          context: 'FOLLOWUP_COLLECTION' 
        });
        
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: messageWithContext
        });
        
        console.log('[EXPERT_TOBACCONIST] Follow-up message sent, waiting for response...');
        
        // Wait for assistant response asynchronously
        let agentResponse = "";
        try {
          agentResponse = await waitPromise;
          console.log('[EXPERT_TOBACCONIST] Follow-up response received:', {
            response_length: agentResponse.length,
            preview: agentResponse.substring(0, 150)
          });
        } catch (err) {
          console.error('[EXPERT_TOBACCONIST] Follow-up wait failed:', err);
          if (err.message?.includes("Agent error:")) {
            agentResponse = `The expert agent encountered an error: ${err.message.replace("Agent error: ", "")}`;
          }
        }
        
        let finalResponse = agentResponse;
        if (!finalResponse || finalResponse.trim().length === 0) {
          finalResponse = "I couldn't load a response from the expert agent. Please try again.";
          console.error('[EXPERT_TOBACCONIST] Agent returned empty response on follow-up');
        }
        
        const aiResponse = {
          is_general_advice: true,
          advice: finalResponse,
          key_points: [],
          tips: [],
          routed_to: 'expert_tobacconist',
          sticky_agent: stickyAgent,
          conversation_id: conversation.id,
          _debug: {
            conversation_id: conversation.id,
            pipes_count: contextPayload.pipes.length,
            pairingGrid_present: !!contextPayload.pairingGrid,
            usageLogs_present: !!contextPayload.usageLogs,
            response_length: finalResponse.length
          }
        };

        setConversationMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }]);

        setWhatIfResult(aiResponse);
    } catch (err) {
      console.error('[ROUTING] Error with follow-up (analyzeCollectionQuestion path):', err);
      console.error('[ROUTING] Error details:', {
        message: err?.message,
        response: err?.response?.data
      });
      
      toast.error('Failed to process follow-up question');

      // Add error message to conversation
      setConversationMessages(prev => [...prev, {
        role: 'assistant',
        content: {
          is_collection_question: true,
          response: `Error: ${err?.message || 'Failed to process question'}. Please try again.`,
          specific_recommendations: [],
          collection_insights: [],
          routed_to: 'error'
        },
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const suggestProducts = async () => {
    if (!whatIfResult) return;

    setLoadingProducts(true);
    try {
      // Build full conversation context
      const conversationContext = conversationMessages
        .map(m => m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content.advice_response || ''}`)
        .join('\n\n');
      
      // Determine if conversation is about pipes or tobacco based on full context
      const fullContext = conversationContext || whatIfQuery;
      const isPipeQuery = /pipe|briar|meerschaum|shape|chamber|stem|bowl|calabash|billiard|dublin|bent|straight|rusticated|sandblast|smooth|finish/i.test(fullContext);
      const isTobaccoQuery = /tobacco|blend|tin|virginia|english|latakia|aromatic|flake|ribbon|perique|burley|oriental|navy/i.test(fullContext);
      
      let productType = 'both';
      if (isPipeQuery && !isTobaccoQuery) {
        productType = 'pipes';
      } else if (isTobaccoQuery && !isPipeQuery) {
        productType = 'tobacco';
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this analysis.

Based on this conversation and analysis, suggest 5 specific real-world ${productType === 'pipes' ? 'SMOKING PIPES ONLY' : productType === 'tobacco' ? 'PIPE TOBACCO BLENDS ONLY' : 'products (smoking pipes or pipe tobacco blends)'} that match the criteria.

Full Conversation Context:
${conversationContext || whatIfQuery}

Analysis Result: ${JSON.stringify(whatIfResult, null, 2)}

For each product, provide:
- Product name (actual product if known, or descriptive name)
- Brand/Manufacturer
${productType !== 'tobacco' ? '- For Pipes: Shape, material, chamber size, stem material, finish' : ''}
${productType !== 'pipes' ? '- For Blends: Blend type, strength, cut, flavor profile' : ''}
- Price range
- Why it fits the scenario

${productType === 'pipes' ? 'ONLY suggest smoking pipes (briar, meerschaum, corncob, etc.). Do NOT suggest tobacco blends, cigars, cigarettes, or vapes.' : ''}
${productType === 'tobacco' ? 'ONLY suggest pipe tobacco blends (tinned or bulk tobacco for smoking pipes). Do NOT suggest pipes, cigars, cigarettes, or vapes.' : ''}

CRITICAL RULES:
- This is for PIPE SMOKING only. Do NOT suggest cigars, cigarettes, vaping products, or any other tobacco products.
- Do NOT include any URLs, website links, retailer names, or purchasing information.
- Do NOT include source citations or references.
- Do NOT mention where to buy or find these products.
- Focus ONLY on product specifications and why they fit the scenario.

Be specific with real product names when possible (e.g., "Peterson System Standard 305", "Samuel Gawith Full Virginia Flake"). Focus on products that address the gaps and achieve the trophy pairings identified in the analysis.`,
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
                  why_it_fits: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestedProducts(result);
    } catch (err) {
      console.error('Error suggesting products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const implementWhatIf = async () => {
    if (!whatIfResult) return;
    
    setWhatIfLoading(true);
    try {
      // Use LLM to parse the scenario and determine implementation actions
      const implementationPlan = await base44.integrations.Core.InvokeLLM({
        prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this analysis.

You are analyzing a "what if" scenario to determine how to implement it in the user's pipe collection.

User's Question: ${whatIfQuery}
Pipe Description: ${whatIfDescription || 'N/A'}
Analysis Result: ${JSON.stringify(whatIfResult, null, 2)}

Current Pipes: ${JSON.stringify(pipes.map(p => ({ id: p.id, name: p.name, maker: p.maker, shape: p.shape, focus: p.focus })), null, 2)}
Current Blends: ${JSON.stringify(blends.map(b => ({ id: b.id, name: b.name, blend_type: b.blend_type })), null, 2)}

Determine the implementation action:
1. If this is about BUYING A NEW PIPE - extract pipe specifications to create
2. If this is about CHANGING AN EXISTING PIPE'S FOCUS - identify which pipe and what new focus
3. If no specific action can be taken - explain why

Provide concrete, actionable steps with specific field values.`,
        response_json_schema: {
          type: "object",
          properties: {
            action_type: { 
              type: "string",
              enum: ["create_new_pipe", "update_pipe_focus", "no_action"]
            },
            pipe_data: {
              type: "object",
              properties: {
                pipe_id: { type: "string" },
                bowl_variant_id: { type: "string" },
                name: { type: "string" },
                maker: { type: "string" },
                shape: { type: "string" },
                bowl_material: { type: "string" },
                chamber_volume: { type: "string" },
                stem_material: { type: "string" },
                finish: { type: "string" },
                focus: { 
                  type: "array",
                  items: { type: "string" }
                },
                notes: { type: "string" }
              }
            },
            explanation: { type: "string" }
          }
        }
      });

      if (implementationPlan.action_type === "create_new_pipe") {
        // Create new pipe with photos from what-if
        const newPipeData = {
          ...implementationPlan.pipe_data,
          photos: whatIfPhotos,
          notes: `${implementationPlan.pipe_data.notes || ''}\n\nAdded based on What-If analysis: ${whatIfResult.detailed_reasoning}`.trim()
        };
        
        await base44.entities.Pipe.create(newPipeData);
        queryClient.invalidateQueries({ queryKey: ['pipes', user?.email] });
        
        alert(`New pipe created: ${newPipeData.name || 'Untitled Pipe'}\n\nYou can edit the details from your Pipes page.`);
      } else if (implementationPlan.action_type === "update_pipe_focus") {
        // Update existing pipe's focus (either main pipe or bowl variant)
        if (implementationPlan.pipe_data.pipe_id && implementationPlan.pipe_data.focus) {
          const pipe = pipes.find(p => p.id === implementationPlan.pipe_data.pipe_id);
          if (!pipe) {
            toast.error('Pipe not found');
            return;
          }

          if (implementationPlan.pipe_data.bowl_variant_id) {
            // Update bowl variant focus
            const bowlIndex = parseInt(implementationPlan.pipe_data.bowl_variant_id.replace('bowl_', ''));
            const updatedBowls = [...(pipe.interchangeable_bowls || [])];
            if (updatedBowls[bowlIndex]) {
              updatedBowls[bowlIndex] = {
                ...updatedBowls[bowlIndex],
                focus: implementationPlan.pipe_data.focus
              };
              await updatePipeMutation.mutateAsync({
                id: implementationPlan.pipe_data.pipe_id,
                data: { interchangeable_bowls: updatedBowls }
              });
              
              const bowlName = updatedBowls[bowlIndex].name || `Bowl ${bowlIndex + 1}`;
              toast.success(`Updated ${pipe.name} - ${bowlName}'s focus to: ${implementationPlan.pipe_data.focus.join(', ')}`);
            } else {
              toast.error('Bowl variant not found');
            }
          } else {
            // Update main pipe focus
            await updatePipeMutation.mutateAsync({
              id: implementationPlan.pipe_data.pipe_id,
              data: { focus: implementationPlan.pipe_data.focus }
            });
            
            toast.success(`Updated ${pipe.name}'s focus to: ${implementationPlan.pipe_data.focus.join(', ')}`);
          }
        }
      } else {
        toast.error(`Cannot implement automatically: ${implementationPlan.explanation || 'undefined'}`);
      }
      
      // Reset what-if after implementation
      resetWhatIf();
    } catch (err) {
      console.error('Error implementing what-if:', err);
      alert('Failed to implement scenario. Please try again or add manually.');
    } finally {
      setWhatIfLoading(false);
    }
  };

  const getVersatilityColor = (score) => {
    if (score >= 8) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 6) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 4) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  if (pipes.length === 0 || blends.length === 0) {
    return null;
  }

  if (optLoading) {
    return <div className="text-sm text-stone-600">Loading optimization...</div>;
  }

  if (!optimization) {
    return <div className="text-sm text-stone-600">No optimization data yet. Regenerate to get suggestions.</div>;
  }

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('collectionOptimizerCollapsed', newState.toString());
  };

  // If initialized to show only What If, render that section standalone
  if (initialShowWhatIf) {
    return (
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800 text-lg">
            <Lightbulb className="w-5 h-5" />
            Ask the Expert
          </CardTitle>
          <p className="text-sm text-stone-600">
            Ask questions and discuss the hobby
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conversation History */}
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
                               {/* USER MESSAGE */}
                               {isUser && (
                                 <div className="text-right">
                                   <div className="inline-block bg-indigo-600 text-white rounded-lg px-4 py-2 max-w-[85%]">
                                     <p className="text-sm">{typeof content === "string" ? content : JSON.stringify(content)}</p>

                                     {msg.photos?.length > 0 && (
                                       <div className="flex gap-2 mt-2">
                                         {msg.photos.map((url, i) => (
                                           <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               )}

                               {/* ASSISTANT MESSAGE */}
                               {!isUser && (
                                 <div className="text-left">
                                   <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
                                     {isGeneralAdvice ? (
                                       <div className="space-y-3">
                                         <FormattedTobacconistResponse content={content.advice || ""} style="light_structure" />

                                         {content.key_points?.length > 0 && (
                                           <div className="pt-3 border-t border-stone-300">
                                             <p className="font-medium text-sm text-stone-900 mb-2">Key Points:</p>
                                             <ul className="space-y-1.5 text-sm">
                                               {content.key_points.map((pt, i) => (
                                                 <li key={i} className="flex gap-2 leading-relaxed text-stone-800">
                                                   <span className="text-blue-600">•</span>
                                                   <span>{pt}</span>
                                                 </li>
                                               ))}
                                             </ul>
                                           </div>
                                         )}

                                         {content.routed_to && (
                                           <div className="mt-2 pt-2 border-t border-stone-300">
                                             <p className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
                                               Answered by: {content.routed_to}
                                             </p>
                                           </div>
                                         )}
                                       </div>
                                     ) : isImpact ? (
                                       <div className="text-sm space-y-3">
                                         <div className="flex items-center gap-2 flex-wrap">
                                           <Badge className="bg-indigo-600 text-white">
                                             Impact Score: {content.impact_score}/10
                                           </Badge>
                                           {!!content.recommendation_category && (
                                             <Badge className="bg-blue-600 text-white">
                                               {content.recommendation_category}
                                             </Badge>
                                           )}
                                         </div>

                                         {!!content.detailed_reasoning && (
                                           <div className="space-y-2">
                                             <p className="text-stone-900 font-semibold text-sm">Analysis:</p>
                                             <FormattedTobacconistResponse content={content.detailed_reasoning} style="simple_paragraphs" />
                                           </div>
                                         )}

                                         {content.trophy_pairings?.length > 0 && (
                                           <div>
                                             <p className="text-stone-900 font-semibold text-xs mb-1">Trophy Pairings:</p>
                                             <div className="flex flex-wrap gap-1">
                                               {content.trophy_pairings.map((blend, i) => (
                                                 <Badge key={i} className="bg-amber-100 text-amber-800 text-xs">
                                                   {blend}
                                                 </Badge>
                                               ))}
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                     ) : isCollectionQuestion ? (
                                       <div className="space-y-2">
                                         <FormattedTobacconistResponse content={content.response || ""} style="light_structure" />

                                         {content.specific_recommendations?.length > 0 && (
                                           <div className="pt-2 border-t border-stone-300">
                                             <p className="font-semibold text-sm text-stone-900 mb-1">Recommendations:</p>
                                             <ul className="space-y-1">
                                               {content.specific_recommendations.map((rec, i) => (
                                                 <li key={i} className="text-sm text-stone-800">• {rec}</li>
                                               ))}
                                             </ul>
                                           </div>
                                         )}
                                       </div>
                                     ) : (
                                       // Ultimate fallback: safe render anything
                                       <SafeRender value={content} className="text-sm text-stone-800" />
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
              {conversationMessages.length > 0 ? 'Continue the conversation...' : 'Chat with the Tobacconist'}
            </label>
            <Textarea
              placeholder={conversationMessages.length > 0 
                ? "e.g., 'Can you explain more?' or 'What about for Virginia blends?'"
                : "e.g., 'How do I clean my pipe?' or 'Should I buy a bent pipe for English blends?'"}
              value={conversationMessages.length > 0 ? whatIfFollowUp : whatIfQuery}
              onChange={(e) => conversationMessages.length > 0 ? setWhatIfFollowUp(e.target.value) : setWhatIfQuery(e.target.value)}
              className="min-h-[80px] bg-white text-stone-900 placeholder:text-stone-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  if (conversationMessages.length > 0) {
                    handleWhatIfFollowUp();
                  } else {
                    analyzeWhatIf();
                  }
                }
              }}
            />
            <p className="text-xs text-stone-500 mt-1">Press Cmd+Enter to send</p>
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
            <div onDrop={(e) => { e.preventDefault(); handlePhotoUpload({ target: { files: e.dataTransfer.files } }); }} onDragOver={(e) => e.preventDefault()}>
              <PhotoUploader 
                onPhotosSelected={(files) => {
                  const uploadPromises = Array.from(files).map(async (file) => {
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      return file_url;
                    } catch (err) {
                      console.error('Error uploading photo:', err);
                      return null;
                    }
                  });
                  Promise.all(uploadPromises).then((urls) => {
                    const validUrls = urls.filter(Boolean);
                    setWhatIfPhotos([...whatIfPhotos, ...validUrls]);
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
                  <Button variant="outline" onClick={resetWhatIf} className="flex-1 bg-stone-700 text-white hover:bg-stone-800 border-stone-600">
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

          {whatIfResult?.is_impact_analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              <>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-100 to-indigo-50 rounded-lg border border-indigo-200">
                <div>
                  <p className="text-sm font-medium text-indigo-700">Collection Impact Score</p>
                  <p className="text-3xl font-bold text-indigo-900">{whatIfResult.impact_score}/10</p>
                </div>
                <Badge className={
                  whatIfResult.recommendation_category?.includes('ESSENTIAL') ? 'bg-emerald-600 text-white text-lg px-4 py-2' :
                  whatIfResult.recommendation_category?.includes('STRONG') ? 'bg-blue-600 text-white text-lg px-4 py-2' :
                  whatIfResult.recommendation_category?.includes('NICE') ? 'bg-amber-500 text-white text-lg px-4 py-2' :
                  'bg-rose-500 text-white text-lg px-4 py-2'
                }>
                  {whatIfResult.recommendation_category}
                </Badge>
              </div>

              {whatIfResult.trophy_pairings?.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Trophy Pairings (9-10 scores):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {whatIfResult.trophy_pairings.map((blend, idx) => (
                        <Badge key={idx} className="bg-amber-100 text-amber-800 border-amber-300">
                          {blend}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {whatIfResult.gaps_filled?.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-emerald-700 mb-2">Gaps Filled:</p>
                    <div className="flex flex-wrap gap-2">
                      {whatIfResult.gaps_filled.map((gap, idx) => (
                        <Badge key={idx} className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-stone-200">
              <CardContent className="p-4 space-y-3">
              <div>
              <p className="text-sm font-medium text-stone-700 mb-1">Redundancy Analysis:</p>
              <SafeRender value={whatIfResult.redundancy_analysis} className="text-sm text-stone-600" />
              </div>

              {whatIfResult.score_improvements && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-700 mb-1">Score Improvements:</p>
              <SafeRender value={whatIfResult.score_improvements} className="text-sm text-emerald-800" />
              </div>
              )}

              <div>
              <p className="text-sm font-medium text-stone-700 mb-1">Detailed Analysis:</p>
              <SafeRender value={whatIfResult.detailed_reasoning} className="text-sm text-stone-600" />
              </div>
              </CardContent>
              </Card>

              {whatIfResult.applyable_changes?.length > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      // Apply the changes from the impact analysis
                      applyOptimizationChangesWithUndo(whatIfResult.applyable_changes);
                      toast.success('Changes applied to your collection');
                      resetWhatIf();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 w-full"
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Confirm & Apply Changes
                  </Button>
                </div>
              )}

              {/* Product Suggestions */}
              <div className="mt-4">
                <Button
                  onClick={suggestProducts}
                  disabled={loadingProducts}
                  variant="outline"
                  className="w-full border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  {loadingProducts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finding Products...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Suggest Specific Products
                    </>
                  )}
                </Button>
              </div>
              </>

              {suggestedProducts?.suggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-3"
                >
                  <h4 className="font-semibold text-stone-800 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Recommended Products
                  </h4>
                  {suggestedProducts.suggestions.map((product, idx) => (
                    <Card key={idx} className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-semibold text-stone-800">{product.name}</h5>
                            <p className="text-sm text-stone-600">{product.brand}</p>
                            <Badge className="mt-1 bg-violet-100 text-violet-800 border-violet-200">
                              {product.type}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                            {product.price_range}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          {product.type === 'Pipe' ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {product.shape && <div><span className="text-stone-500">Shape:</span> {product.shape}</div>}
                              {product.material && <div><span className="text-stone-500">Material:</span> {product.material}</div>}
                              {product.chamber_size && <div><span className="text-stone-500">Chamber:</span> {product.chamber_size}</div>}
                              {product.stem_material && <div><span className="text-stone-500">Stem:</span> {product.stem_material}</div>}
                              {product.finish && <div><span className="text-stone-500">Finish:</span> {product.finish}</div>}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {product.blend_type && <div><span className="text-stone-500">Type:</span> {product.blend_type}</div>}
                              {product.strength && <div><span className="text-stone-500">Strength:</span> {product.strength}</div>}
                              {product.cut && <div><span className="text-stone-500">Cut:</span> {product.cut}</div>}
                              {product.flavor_profile && <div className="col-span-2"><span className="text-stone-500">Flavors:</span> {product.flavor_profile}</div>}
                            </div>
                          )}

                          <div className="bg-indigo-50 rounded p-2 mt-2">
                            <p className="text-xs text-indigo-800"><span className="font-medium">Why:</span> {product.why_it_fits}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    );
  }

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
            Your pipes, blends, or preferences have changed. Regenerate optimization now for accurate recommendations? You can undo this action.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => {
            setShowRegenDialog(false);
            setStaleDismissedId(optimization?.id);
          }} className="w-full sm:w-auto">
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
              'Regenerate'
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
              checked={optimization?.pipe_specializations?.every(spec => {
                if (!spec.recommended_blend_types?.length) return true;
                const k = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
                return selectedChanges[k];
              })}
              onCheckedChange={toggleAllChanges}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All
            </label>
          </div>

          {optimization?.pipe_specializations?.map(spec => {
            const pipe = pipes.find(p => p.id === spec.pipe_id);
            if (!spec.recommended_blend_types?.length || !pipe) return null;

            const variantKey = getPipeVariantKey(spec.pipe_id, spec.bowl_variant_id || null);
            // Handle both main pipe and bowl variant focus
            let currentFocus = [];
            if (spec.bowl_variant_id) {
              const bowlIndex = parseInt(spec.bowl_variant_id.replace('bowl_', ''));
              const bowl = pipe?.interchangeable_bowls?.[bowlIndex];
              currentFocus = Array.isArray(bowl?.focus) ? bowl.focus : [];
            } else {
              currentFocus = Array.isArray(pipe.focus) ? pipe.focus : [];
            }
            const hasChanges = JSON.stringify(currentFocus.sort()) !== JSON.stringify(spec.recommended_blend_types.sort());

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
                      <h4 className="font-semibold text-stone-800">{spec.pipe_name}</h4>
                      {!hasChanges && (
                        <Badge variant="outline" className="text-xs">No Change</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                      <div>
                        <p className="text-xs text-stone-500 mb-1">Current:</p>
                        {currentFocus.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {currentFocus.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">None set</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-emerald-700 font-medium mb-1">Recommended:</p>
                        <div className="flex flex-wrap gap-1">
                          {spec.recommended_blend_types.map((f, i) => (
                            <Badge key={i} className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {spec.score_improvement && (
                      <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                        <p className="text-xs text-emerald-800">
                          <strong>Impact:</strong> {spec.score_improvement}
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            );
          })}

          {optimization?.pipe_specializations?.filter(s => s.recommended_blend_types?.length > 0).length === 0 && (
            <p className="text-center text-stone-500 py-8">No changes to apply</p>
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
                Apply {Object.values(selectedChanges).filter(Boolean).length} Change{Object.values(selectedChanges).filter(Boolean).length !== 1 ? 's' : ''}
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
          {!isCollapsed && <Button
            onClick={analyzeCollection}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 w-full sm:w-auto flex-shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Analyzing...</span>
                <span className="sm:hidden">Analyzing</span>
              </>
            ) : optimization ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Update Analysis</span>
                <span className="sm:hidden">Update</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Optimize Collection</span>
                <span className="sm:hidden">Optimize</span>
              </>
            )}
          </Button>}
        </div>
      </CardHeader>

      {!isCollapsed && optimization && (
         <CardContent className="space-y-6">
           {/* Pipe Specializations - Collapsible */}
           <div>
             <div className="flex items-center justify-between mb-4">
               <button
                 onClick={() => setShowPipesList(!showPipesList)}
                 className="flex-1 flex items-center justify-between hover:bg-stone-100 rounded-lg px-2 py-1 transition-colors"
               >
                 <h3 className="font-semibold text-stone-800 flex items-center gap-2">
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
                   const spec = optimization.pipe_specializations?.find(s => {
                     const k = getPipeVariantKey(s.pipe_id, s.bowl_variant_id || null);
                     return k === variantKey;
                   });
                   const pipe = pipes.find(p => p.id === pv.pipe_id);
                   const displaySpec = spec || {
                     pipe_id: pv.pipe_id,
                     bowl_variant_id: pv.bowl_variant_id || null,
                     pipe_name: pv.name,
                     recommended_blend_types: [],
                     reasoning: "No specific recommendation generated. Consider running the optimization again.",
                     versatility_score: 5,
                     usage_pattern: "Versatile - suitable for multiple blend types"
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
                              <img src={pv?.photos?.[0] || pipe?.photos?.[0]} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <PipeShapeIcon shape={pv?.shape || pipe?.shape} className="w-10 h-10" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {pipe?.id ? (
                                   <a href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pv.pipe_id)}&bowl=${encodeURIComponent(pv.bowl_variant_id || "")}`)}>
                                     <h4 className="font-semibold text-stone-800 hover:text-blue-700 transition-colors text-sm sm:text-base">
                                       {pv.name || displaySpec.pipe_name}
                                     </h4>
                                   </a>
                                 ) : (
                                   <h4 className="font-semibold text-stone-500 text-sm sm:text-base" title="Pipe not found in collection.">
                                     {displaySpec.pipe_name}
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
                                  <span className="hidden sm:inline">Ver. {displaySpec.versatility_score}/10</span>
                                  <span className="sm:hidden">{displaySpec.versatility_score}/10</span>
                                </Badge>
                              )}
                            </div>
                            
                            {pv.focus && pv.focus.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-indigo-200 mb-1">Current Focus:</p>
                                <div className="flex flex-wrap gap-1">
                                  {pv.focus.map((type, i) => (
                                    <Badge key={i} className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                      {type}
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
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <p className="text-sm text-[#E0D8C8] mb-2">{displaySpec.reasoning}</p>
                            
                            {displaySpec.score_improvement && (
                              <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 mb-2">
                                <p className="text-xs font-medium text-emerald-700">📈 Score Impact:</p>
                                <p className="text-xs text-emerald-800 font-semibold">{displaySpec.score_improvement}</p>
                              </div>
                            )}

                            {displaySpec.trophy_blends && displaySpec.trophy_blends.length > 0 && (
                              <div className="bg-amber-50 rounded-lg p-2 border border-amber-200 mb-2">
                                <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  Trophy Matches (9-10 scores):
                                </p>
                                <p className="text-xs text-amber-800">{displaySpec.trophy_blends.join(', ')}</p>
                              </div>
                            )}
                            
                            <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                              <p className="text-xs font-medium text-blue-900">Usage Pattern:</p>
                              <p className="text-xs text-stone-800">{displaySpec.usage_pattern}</p>
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
                                   Apply Suggested
                                 </Button>
                               )}
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                 onClick={() => setShowFeedbackFor(showFeedbackFor === variantKey ? null : variantKey)}
                               >
                                 <RefreshCw className="w-4 h-4 mr-1" />
                                 {showFeedbackFor === variantKey ? 'Cancel' : 'Dispute / Add Info'}
                               </Button>
                              </div>

                              {showFeedbackFor === variantKey && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                              >
                                <p className="text-xs font-medium text-amber-800 mb-2">
                                  Share your thoughts on this recommendation:
                                </p>
                                <Textarea
                                  placeholder="e.g., 'I prefer using this pipe for Latakia blends, not Virginias' or 'This pipe actually smokes hot with strong blends'"
                                  value={pipeFeedback[variantKey] || ''}
                                  onChange={(e) => setPipeFeedback({...pipeFeedback, [variantKey]: e.target.value})}
                                  className="min-h-[60px] text-sm mb-2"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitFeedback(pv.pipe_id)}
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

              {/* Collection Gaps */}
          {optimization.collection_gaps && (
            <div>
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Collection Analysis
              </h3>
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-stone-700 mb-2">Overall Assessment</p>
                    <p className="text-sm text-stone-600">{optimization.collection_gaps.overall_assessment}</p>
                  </div>

                  {optimization.collection_gaps.missing_coverage?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-rose-700 mb-2">Coverage Gaps:</p>
                      <div className="flex flex-wrap gap-1">
                        {optimization.collection_gaps.missing_coverage.map((gap, i) => (
                          <Badge key={i} className="bg-rose-100 text-rose-800 border-rose-200">
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {optimization.collection_gaps.redundancies?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-2">Redundancies:</p>
                      <div className="flex flex-wrap gap-1">
                        {optimization.collection_gaps.redundancies.map((red, i) => (
                          <Badge key={i} className="bg-amber-100 text-amber-800 border-amber-200">
                            {red}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Priority Focus Changes */}
          {optimization.priority_focus_changes && optimization.priority_focus_changes.length > 0 && (
            <div>
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" />
                Quick Wins - Priority Focus Changes
              </h3>
              <div className="space-y-3">
                {optimization.priority_focus_changes.map((change, idx) => {
                  const pipe = pipes.find(p => p.id === change.pipe_id);
                  if (!pipe) return null;

                  const hasAppliedFocus = pipe.focus && 
                    JSON.stringify(pipe.focus.sort()) === JSON.stringify(change.recommended_focus.sort());

                  return (
                    <Card key={idx} className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                            {pipe?.photos?.[0] ? (
                              <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <PipeShapeIcon shape={pipe?.shape} className="w-10 h-10" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              {pipe?.id ? (
                                <a href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                                  <h4 className="font-semibold text-stone-800 hover:text-violet-700 transition-colors">
                                    {change.pipe_name}
                                  </h4>
                                </a>
                              ) : (
                                <h4 className="font-semibold text-stone-500" title="Pipe not found in collection.">
                                  {change.pipe_name}
                                </h4>
                              )}
                              <Badge className="bg-violet-600 text-white">
                                Quick Win #{idx + 1}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-xs font-medium text-stone-500 mb-1">Current Focus:</p>
                                <div className="flex flex-wrap gap-1">
                                  {change.current_focus && change.current_focus.length > 0 ? (
                                    change.current_focus.map((f, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {f}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-stone-400">None set</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-violet-700 mb-1">Recommended Focus:</p>
                                <div className="flex flex-wrap gap-1">
                                  {change.recommended_focus.map((f, i) => (
                                    <Badge key={i} className="bg-violet-100 text-violet-800 border-violet-200 text-xs">
                                      {f}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 mb-2">
                              <p className="text-xs font-medium text-emerald-700">📈 Score Impact:</p>
                              <p className="text-xs text-emerald-800 font-semibold">{change.score_improvement}</p>
                            </div>

                            {change.trophy_blends_gained && change.trophy_blends_gained.length > 0 && (
                              <div className="bg-amber-50 rounded-lg p-2 border border-amber-200 mb-2">
                                <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  Trophy Pairings Gained:
                                </p>
                                <p className="text-xs text-amber-800">{change.trophy_blends_gained.join(', ')}</p>
                              </div>
                            )}

                            <p className="text-xs text-stone-600 mb-3">{change.reasoning}</p>

                            {hasAppliedFocus ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                <Check className="w-3 h-3 mr-1" />
                                Applied!
                              </Badge>
                            ) : pipe?.focus && pipe.focus.length > 0 ? (
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={() => applySpecialization(pipe.id, change.recommended_focus)}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Update Focus
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-violet-600 hover:bg-violet-700 text-white"
                                onClick={() => applySpecialization(pipe.id, change.recommended_focus)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Apply This Focus
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Pipe Recommendations */}
          {optimization.next_pipe_recommendations && optimization.next_pipe_recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Top 3 Collection Changes To Do Next
              </h3>
              <div className="space-y-3">
                {optimization.next_pipe_recommendations.map((rec, idx) => (
                  <Card key={idx} className={`border-emerald-200 bg-gradient-to-br from-emerald-50 to-white ${idx === 0 ? 'ring-2 ring-emerald-400' : ''}`}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={idx === 0 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}>
                                Priority #{rec.priority_rank}
                              </Badge>
                              {idx === 0 && <Badge className="bg-amber-500 text-white">Highest Impact</Badge>}
                            </div>
                            <h4 className="font-semibold text-emerald-800 text-lg">
                              {rec.shape} in {rec.material}
                            </h4>
                            <p className="text-sm text-emerald-600 font-medium">
                              {rec.budget_range}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 space-y-2">
                          <div>
                            <p className="text-xs font-medium text-stone-700">Specifications:</p>
                            <p className="text-sm text-stone-600">{rec.chamber_specs}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-stone-700">Fills Gap:</p>
                            <p className="text-sm text-emerald-700 font-medium">{rec.gap_filled}</p>
                          </div>
                        </div>

                        {rec.score_improvement && (
                          <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                            <p className="text-xs font-medium text-emerald-700">📈 Score Impact:</p>
                            <p className="text-xs text-emerald-800 font-semibold">{rec.score_improvement}</p>
                          </div>
                        )}

                        {rec.trophy_blends && rec.trophy_blends.length > 0 && (
                          <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                            <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              Will Create Trophy Matches With:
                            </p>
                            <p className="text-xs text-amber-800">{rec.trophy_blends.join(', ')}</p>
                          </div>
                        )}

                        <p className="text-sm text-stone-600">{rec.reasoning}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Ask About Your Collection & Analyze Impact */}
          {optimization && (
            <div className="space-y-6">
              {/* Collection Questions */}
              <div>
                <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Discuss Your Collection Strategy
                </h3>
                <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm text-stone-600">Get personalized advice on gaps, specializations, blend coverage, size diversity, and optimization strategies specific to your pipes and blends.</p>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-stone-700 mb-3">Common Collection Questions:</p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start border-indigo-200 hover:bg-indigo-50 text-stone-700 h-auto py-2 text-[0.7rem] sm:text-xs"
                          onClick={() => {
                            setWhatIfQuery("Based on my collection gaps and current pipes, what blend types should I prioritize buying?");
                            setConversationMessages([]);
                            analyzeCollectionQuestion();
                          }}
                        >
                          <span className="leading-snug"><span className="sm:hidden">Fill gaps</span><span className="hidden sm:inline">What blend types would best fill my collection gaps?</span></span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start border-indigo-200 hover:bg-indigo-50 text-stone-700 h-auto py-2 text-[0.7rem] sm:text-xs"
                          onClick={() => {
                            setWhatIfQuery("Which of my pipes are most versatile and which are too specialized? How should I rebalance them?");
                            setConversationMessages([]);
                            analyzeCollectionQuestion();
                          }}
                        >
                          <span className="leading-snug"><span className="sm:hidden">Rebalance</span><span className="hidden sm:inline">How can I rebalance pipe versatility?</span></span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start border-indigo-200 hover:bg-indigo-50 text-stone-700 h-auto py-2 text-[0.7rem] sm:text-xs"
                          onClick={() => {
                            setWhatIfQuery("Do I have redundant pipe specializations? Which pipes could be safely reassigned?");
                            setConversationMessages([]);
                            analyzeCollectionQuestion();
                          }}
                        >
                          <span className="leading-snug"><span className="sm:hidden">Redundancy</span><span className="hidden sm:inline">Which pipes have redundant focuses?</span></span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start border-indigo-200 hover:bg-indigo-50 text-stone-700 h-auto py-2 text-[0.7rem] sm:text-xs"
                          onClick={() => {
                            setWhatIfQuery("Am I missing important pipe shapes, sizes, or materials? What would round out my collection?");
                            setConversationMessages([]);
                            analyzeCollectionQuestion();
                          }}
                        >
                          <span className="leading-snug"><span className="sm:hidden">Missing shapes</span><span className="hidden sm:inline">What shapes/sizes am I missing?</span></span>
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-100">
                      <label className="text-xs font-medium text-stone-700 mb-2 block">Or ask your own collection question:</label>
                      <Textarea
                        placeholder="e.g., 'Should I dedicate this pipe to Latakia blends?' or 'How do I improve my English blend coverage?'"
                        value={whatIfQuery}
                        onChange={(e) => setWhatIfQuery(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <Button
                          onClick={() => {
                            setConversationMessages([]);
                            analyzeCollectionQuestion();
                          }}
                          disabled={!whatIfQuery.trim() || whatIfLoading || contextLoading}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
                        >
                          {contextLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              <span className="hidden sm:inline">Loading data...</span>
                              <span className="sm:hidden">Loading</span>
                            </>
                          ) : whatIfLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              <span className="hidden sm:inline">Analyzing...</span>
                              <span className="sm:hidden">Analyzing</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Ask About My Collection</span>
                              <span className="sm:hidden">Ask Collection</span>
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={analyzeCollectionImpact}
                          disabled={!whatIfQuery.trim() || whatIfLoading}
                          variant="outline"
                          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 w-full sm:w-auto"
                        >
                          {whatIfLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Target className="w-4 h-4 mr-2" />
                          )}
                          <span className="hidden sm:inline">Analyze Impact</span>
                          <span className="sm:hidden">Impact</span>
                        </Button>
                      </div>
                      </div>

                    {conversationMessages.length > 0 && (
                      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 sm:p-4 bg-white">
                        {conversationMessages.map((msg, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                              {msg.role === 'user' ? (
                                <div className="inline-block bg-indigo-600 text-white rounded-lg px-3 sm:px-4 py-2 max-w-[85%] sm:max-w-[80%]">
                                  <p className="text-xs sm:text-sm break-words">{msg.content}</p>
                                </div>
                              ) : msg.content.is_general_advice ? (
                                <div className="inline-block bg-stone-100 rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[85%] sm:max-w-[80%] text-left">
                                  <div className="text-xs sm:text-sm text-stone-700 space-y-1.5 sm:space-y-2">
                                    <p className="leading-relaxed">{msg.content.advice}</p>
                                    {msg.content.key_points?.length > 0 && (
                                      <div className="pt-1.5 sm:pt-2 border-t border-stone-300">
                                        <p className="font-medium text-xs text-stone-600 mb-1">Key Points:</p>
                                        <ul className="space-y-0.5 sm:space-y-1">
                                          {msg.content.key_points.map((pt, i) => (
                                            <li key={i} className="text-xs text-stone-600">• {pt}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {msg.content.routed_to && (
                                     <div className="mt-2 pt-2 border-t border-stone-300">
                                       <p className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded break-all">
                                         Answered by: {msg.content.routed_to}
                                         {msg.content.sticky_agent && (
                                           <span> | stickyAgent: {msg.content.sticky_agent}</span>
                                         )}
                                         {msg.content.conversation_id && (
                                           <span> | convoId: {msg.content.conversation_id.substring(0, 8)}...</span>
                                         )}
                                         {msg.content._debug && (
                                           <span className="block mt-1">
                                             Pipes: {msg.content._debug.pipes_count}
                                             | Tobaccos: {msg.content._debug.tobaccos_count}
                                             | Pairings: {msg.content._debug.pairings_count}
                                             | Size: {(msg.content._debug.payload_size_bytes / 1024).toFixed(1)}KB
                                             | Time: {msg.content._debug.total_time_ms}ms
                                             | Len: {msg.content._debug.response_length}
                                           </span>
                                         )}
                                       </p>
                                     </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                               <div className="inline-block bg-stone-100 rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[85%] sm:max-w-[80%] text-left">
                                 <div className="text-xs sm:text-sm text-stone-700 space-y-1.5 sm:space-y-2">
                                   <p className="leading-relaxed">{msg.content.response}</p>
                                   {msg.content.specific_recommendations?.length > 0 && (
                                     <div className="pt-1.5 sm:pt-2 border-t border-stone-300">
                                       <p className="font-medium text-xs text-stone-600 mb-1">Recommendations:</p>
                                       <ul className="space-y-0.5 sm:space-y-1">
                                         {msg.content.specific_recommendations.map((rec, i) => (
                                           <li key={i} className="text-xs text-stone-600">• {rec}</li>
                                         ))}
                                       </ul>
                                     </div>
                                   )}
                                   {msg.content.routed_to && (
                                     <div className="mt-2 pt-2 border-t border-stone-300">
                                       <p className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded break-all">
                                         Answered by: {msg.content.routed_to}
                                         {msg.content.sticky_agent && (
                                           <span> | stickyAgent: {msg.content.sticky_agent}</span>
                                         )}
                                         {msg.content.conversation_id && (
                                           <span> | convoId: {msg.content.conversation_id.substring(0, 8)}...</span>
                                         )}
                                         {msg.content._debug && (
                                           <span className="block mt-1">
                                             Pipes: {msg.content._debug.pipes_count}
                                             | Pairings: {msg.content._debug.pairings_count}
                                             | Size: {(msg.content._debug.payload_size_bytes / 1024).toFixed(1)}KB
                                             | Time: {msg.content._debug.total_time_ms}ms
                                           </span>
                                         )}
                                       </p>
                                     </div>
                                   )}
                                 </div>
                               </div>
                              )}
                            </div>
                            {msg.role === 'assistant' && !msg.content.is_impact_analysis && (
                              <div className="text-left ml-0 sm:ml-0">
                                <Button
                                  size="sm"
                                  onClick={analyzeCollectionImpact}
                                  disabled={whatIfLoading}
                                  variant="outline"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm h-8 sm:h-9"
                                >
                                  {whatIfLoading ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      <span className="hidden sm:inline">Analyzing</span>
                                      <span className="sm:hidden">Analyzing</span>
                                    </>
                                  ) : (
                                    <>
                                      <Target className="w-3 h-3 mr-1" />
                                      <span className="hidden sm:inline">Analyze Impact</span>
                                      <span className="sm:hidden">Impact</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {conversationMessages.length > 0 && (
                      <div className="pt-3 border-t border-indigo-100 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-stone-700 mb-2 block">Ask a follow-up:</label>
                          <Textarea
                            placeholder="Continue the discussion..."
                            value={whatIfFollowUp}
                            onChange={(e) => setWhatIfFollowUp(e.target.value)}
                            className="min-h-[50px] text-sm"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={handleCollectionFollowUp}
                            disabled={!whatIfFollowUp.trim() || whatIfLoading || contextLoading}
                            variant="outline"
                            className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-sm"
                          >
                            {whatIfLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                <span className="hidden sm:inline">Thinking...</span>
                                <span className="sm:hidden">Thinking</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Continue Discussion</span>
                                <span className="sm:hidden">Continue</span>
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={analyzeCollectionImpact}
                            disabled={whatIfLoading}
                            variant="outline"
                            className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 text-sm"
                          >
                            {whatIfLoading ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Target className="w-3 h-3 mr-1" />
                            )}
                            <span className="hidden sm:inline">Analyze Impact</span>
                            <span className="sm:hidden">Impact</span>
                          </Button>
                          <Button
                            onClick={resetWhatIf}
                            variant="outline"
                            className="flex-1 text-sm"
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Impact Analysis Results in Optimize */}
                    {whatIfResult?.is_impact_analysis && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 space-y-3"
                      >
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-100 to-indigo-50 rounded-lg border border-indigo-200">
                          <div>
                            <p className="text-xs font-medium text-indigo-700">Impact Score</p>
                            <p className="text-2xl font-bold text-indigo-900">{whatIfResult.impact_score}/10</p>
                          </div>
                          <Badge className={
                            whatIfResult.recommendation_category?.includes('ESSENTIAL') ? 'bg-emerald-600 text-white' :
                            whatIfResult.recommendation_category?.includes('STRONG') ? 'bg-blue-600 text-white' :
                            'bg-amber-500 text-white'
                          }>
                            {whatIfResult.recommendation_category}
                          </Badge>
                        </div>
                        {whatIfResult.trophy_pairings?.length > 0 && (
                          <Card className="border-amber-200 bg-amber-50">
                            <CardContent className="p-4">
                              <p className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                                <Trophy className="w-4 h-4" />
                                Trophy Pairings (9-10 scores):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {whatIfResult.trophy_pairings.map((blend, idx) => (
                                  <Badge key={idx} className="bg-amber-100 text-amber-800 border-amber-300">
                                    {blend}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {whatIfResult.gaps_filled?.length > 0 && (
                          <Card className="border-emerald-200 bg-emerald-50">
                            <CardContent className="p-4">
                              <p className="text-sm font-medium text-emerald-700 mb-2">Gaps Filled:</p>
                              <div className="flex flex-wrap gap-2">
                                {whatIfResult.gaps_filled.map((gap, idx) => (
                                  <Badge key={idx} className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                    {gap}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        <Card className="border-stone-200">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="text-sm font-medium text-stone-700 mb-1">Redundancy Analysis:</p>
                              <p className="text-sm text-stone-600">{whatIfResult.redundancy_analysis}</p>
                            </div>
                            {whatIfResult.score_improvements && (
                              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                <p className="text-sm font-medium text-emerald-700 mb-1">Score Improvements:</p>
                                <p className="text-sm text-emerald-800">{whatIfResult.score_improvements}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-stone-700 mb-1">Detailed Analysis:</p>
                              <p className="text-sm text-stone-600">{whatIfResult.detailed_reasoning}</p>
                            </div>
                          </CardContent>
                        </Card>
                        {whatIfResult.applyable_changes?.length > 0 && (
                          <Button
                            onClick={() => {
                              applyOptimizationChangesWithUndo(whatIfResult.applyable_changes);
                              toast.success('Changes applied to your collection');
                              resetWhatIf();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 w-full"
                          >
                            <CheckCheck className="w-4 h-4 mr-2" />
                            Confirm & Apply Changes
                          </Button>
                        )}
                        <Button
                          onClick={suggestProducts}
                          disabled={loadingProducts}
                          variant="outline"
                          className="w-full border-violet-300 text-violet-700 hover:bg-violet-50"
                        >
                          {loadingProducts ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Finding Products...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Suggest Specific Products
                            </>
                          )}
                        </Button>
                        {suggestedProducts?.suggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 space-y-3"
                          >
                            <h4 className="font-semibold text-stone-800 flex items-center gap-2">
                              <ShoppingCart className="w-4 h-4" />
                              Recommended Products
                            </h4>
                            {suggestedProducts.suggestions.map((product, idx) => (
                              <Card key={idx} className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-semibold text-stone-800">{product.name}</h5>
                                      <p className="text-sm text-stone-600">{product.brand}</p>
                                      <Badge className="mt-1 bg-violet-100 text-violet-800 border-violet-200">
                                        {product.type}
                                      </Badge>
                                    </div>
                                    <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                                      {product.price_range}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    {product.type === 'Pipe' ? (
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {product.shape && <div><span className="text-stone-500">Shape:</span> {product.shape}</div>}
                                        {product.material && <div><span className="text-stone-500">Material:</span> {product.material}</div>}
                                        {product.chamber_size && <div><span className="text-stone-500">Chamber:</span> {product.chamber_size}</div>}
                                        {product.stem_material && <div><span className="text-stone-500">Stem:</span> {product.stem_material}</div>}
                                        {product.finish && <div><span className="text-stone-500">Finish:</span> {product.finish}</div>}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {product.blend_type && <div><span className="text-stone-500">Type:</span> {product.blend_type}</div>}
                                        {product.strength && <div><span className="text-stone-500">Strength:</span> {product.strength}</div>}
                                        {product.cut && <div><span className="text-stone-500">Cut:</span> {product.cut}</div>}
                                        {product.flavor_profile && <div className="col-span-2"><span className="text-stone-500">Flavors:</span> {product.flavor_profile}</div>}
                                      </div>
                                    )}
                                    <div className="bg-indigo-50 rounded p-2 mt-2">
                                      <p className="text-xs text-indigo-800"><span className="font-medium">Why:</span> {product.why_it_fits}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                    </CardContent>
                    </Card>
                    </div>


                    </div>
                    )}

          <div className="text-center pt-2 text-xs text-stone-500">
              {optimization?.generated_date && (
                <p>Last updated: {new Date(optimization.generated_date).toLocaleDateString()}</p>
              )}
            </div>
          </CardContent>
          )}
          </Card>
    </>
  );
}