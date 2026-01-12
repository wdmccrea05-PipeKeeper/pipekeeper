import { getPipeVariantKey, expandPipesToVariants } from "@/components/utils/pipeVariants";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
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

export default function CollectionOptimizer({ pipes, blends, showWhatIf: initialShowWhatIf = false, improvedWhatIf = false }) {
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
  const [pipeFeedback, setPipeFeedback] = useState({});
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);
  const [userFeedbackHistory, setUserFeedbackHistory] = useState('');
  const [showAcceptAll, setShowAcceptAll] = useState(false);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState({});
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user has paid access (subscription or 7-day trial)
  const isWithinTrial = user?.created_date && 
    new Date().getTime() - new Date(user.created_date).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isPaidUser = user?.subscription_level === 'paid' || isWithinTrial;

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

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

  // Show regen dialog when stale
  useEffect(() => {
    if (isStale && optimization) {
      setShowRegenDialog(true);
    }
  }, [isStale, optimization]);

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

  const analyzeWhatIf = async () => {
    if (!whatIfQuery.trim()) return;
    
    setWhatIfLoading(true);
    setWhatIfResult(null);
    setSuggestedProducts(null);
    
    try {
      const pipesData = pipes.map(p => ({
        id: p.id,
        name: p.name,
        maker: p.maker,
        shape: p.shape,
        bowl_material: p.bowl_material,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,
        focus: p.focus,
        interchangeable_bowls: p.interchangeable_bowls || []
      }));

      const blendsData = blends.map(b => ({
        id: b.id,
        name: b.name,
        manufacturer: b.manufacturer,
        blend_type: b.blend_type,
        strength: b.strength
      }));

      let profileContext = "";
      if (userProfile) {
        profileContext = `\n\nUser Smoking Preferences:
      - Preferred Blend Types: ${userProfile.preferred_blend_types?.join(', ') || 'None'}
      - Strength Preference: ${userProfile.strength_preference}`;
      }

      // Detect question type first (improved detection)
      const isAdviceQuestion = /how do i|how to|how can i|what's the best way|tips for|guide to|help with|advice on|teach me|explain|tell me about|clean|maintain|store|break.?in|season|pack|tamp|light|prevent|fix|avoid/i.test(whatIfQuery);
      const isCollectionQuestion = /what collection changes|collection change|rebalance|speciali[sz]e|add a pipe|add pipe type|gap|improve trophies|improve match|which.*pipes|should.*change/i.test(whatIfQuery);
      
      // Treat "buy/purchase" as collection-change intent, not shopping intent
      const mentionsBuying = /should i buy|buy|purchase|acquire|next pipe/i.test(whatIfQuery);
      
      const treatAsCollectionChanges = isCollectionQuestion || mentionsBuying;

      if (improvedWhatIf && isAdviceQuestion && !treatAsCollectionChanges) {
        // General advice question - no collection impact
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this response.

You are an expert pipe smoking advisor. The user has asked for general advice that doesn't involve purchasing or modifying their collection.

User's Question: ${whatIfQuery}

Provide clear, expert advice covering:
1. Step-by-step guidance if applicable
2. Common mistakes to avoid
3. Best practices from experienced pipe smokers
4. Any tools or techniques that might help

Be conversational, helpful, and concise. This is NOT about buying new pipes or changing collection focus - just practical smoking advice.`,
          response_json_schema: {
            type: "object",
            properties: {
              advice_response: { type: "string" },
              key_points: {
                type: "array",
                items: { type: "string" }
              },
              common_mistakes: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        setWhatIfResult({
          is_advice_only: true,
          advice_response: result.advice_response,
          key_points: result.key_points,
          common_mistakes: result.common_mistakes
        });
      } else {
        // Collection impact question - full analysis using generateOptimizationAI function
        try {
          const result = await generateOptimizationAI({
            pipes,
            blends,
            profile: userProfile,
            whatIfText: whatIfQuery
          });

          // Transform the result to match whatIfResult format
          setWhatIfResult({
            impact_score: whatIfQuery.toLowerCase().includes('essential') || whatIfQuery.toLowerCase().includes('critical') ? 9 : 
                         whatIfQuery.toLowerCase().includes('important') ? 7 : 6,
            trophy_pairings: (result.next_additions || []).slice(0, 5),
            redundancy_analysis: result.summary || '',
            recommendation_category: 'STRONG ADDITION',
            detailed_reasoning: result.summary || '',
            gaps_filled: result.collection_gaps || [],
            score_improvements: `Changes may improve collection coverage: ${(result.next_additions || []).join(', ')}`
          });
        } catch (err) {
          // Fallback to direct LLM call if generateOptimizationAI fails
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this analysis.

      You are an expert pipe collection analyst. Analyze this hypothetical scenario for the user's collection.

      Current Collection:
      Pipes: ${JSON.stringify(pipesData, null, 2)}
      Tobacco Blends: ${JSON.stringify(blendsData, null, 2)}${profileContext}

      User Question/Scenario:
      ${whatIfQuery}

      ${whatIfDescription ? `Potential Pipe Details: ${whatIfDescription}` : ''}

      Provide a detailed "What If" analysis covering:

      1. **COLLECTION IMPACT SCORE** (1-10): Rate the overall value this change would add
      2. **TROPHY PAIRINGS**: Which specific blends would achieve 9-10 scores with this change
      3. **REDUNDANCY CHECK**: Does this duplicate existing coverage or fill a gap?
      4. **RECOMMENDATION CATEGORY**:
      - "ESSENTIAL UPGRADE" - Fills critical gap, creates multiple trophies
      - "STRONG ADDITION" - Adds meaningful coverage, some new trophies
      - "NICE TO HAVE" - Minor improvement, mostly redundant
      - "SKIP IT" - No meaningful improvement, purely redundant

      5. **DETAILED REASONING**: Explain the impact on collection performance and pairing scores

      Be specific about which user-owned blends benefit and by how much.`,
            file_urls: whatIfPhotos.length > 0 ? whatIfPhotos : undefined,
            response_json_schema: {
              type: "object",
              properties: {
                impact_score: { type: "number" },
                trophy_pairings: {
                  type: "array",
                  items: { type: "string" }
                },
                redundancy_analysis: { type: "string" },
                recommendation_category: { type: "string" },
                detailed_reasoning: { type: "string" },
                gaps_filled: {
                  type: "array",
                  items: { type: "string" }
                },
                score_improvements: { type: "string" }
              }
            }
          });

          setWhatIfResult(result);
        }
      }
    } catch (err) {
      console.error('Error analyzing what-if:', err);
      alert('Failed to analyze scenario. Please try again.');
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
  };

  const handleWhatIfFollowUp = async () => {
    if (!whatIfFollowUp.trim() || !whatIfResult) return;

    setWhatIfLoading(true);
    try {
      // Combine original query with follow-up questions
      const combinedContext = [whatIfQuery, ...whatIfHistory.map(h => h.question), whatIfFollowUp].filter(Boolean).join('\n\n');

      // Call optimization with the full context
      const result = await generateOptimizationAI({
        pipes,
        blends,
        profile: userProfile,
        whatIfText: combinedContext
      });

      // Store the follow-up in history
      setWhatIfHistory(prev => [...prev, { question: whatIfFollowUp, result }]);

      // Update the result with new analysis
      setWhatIfResult({
        impact_score: result.applyable_changes?.length > 0 ? 8 : 6,
        trophy_pairings: (result.next_additions || []).slice(0, 5),
        redundancy_analysis: result.summary || '',
        recommendation_category: 'STRONG ADDITION',
        detailed_reasoning: result.summary || '',
        gaps_filled: result.collection_gaps || [],
        score_improvements: `Revised analysis: ${(result.next_additions || []).join(', ')}`
      });

      setWhatIfFollowUp('');
    } catch (err) {
      console.error('Error with follow-up question:', err);
      toast.error('Failed to process follow-up question');
    } finally {
      setWhatIfLoading(false);
    }
  };

  const suggestProducts = async () => {
    if (!whatIfResult) return;

    setLoadingProducts(true);
    try {
      // Determine if question is about pipes or tobacco
      const isPipeQuery = /pipe|briar|meerschaum|shape|chamber|stem|bowl/i.test(whatIfQuery);
      const isTobaccoQuery = /tobacco|blend|tin|virginia|english|latakia|aromatic|flake|ribbon/i.test(whatIfQuery);
      
      let productType = 'both';
      if (isPipeQuery && !isTobaccoQuery) {
        productType = 'pipes';
      } else if (isTobaccoQuery && !isPipeQuery) {
        productType = 'tobacco';
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this analysis.

Based on this "What If" analysis, suggest 5 specific real-world ${productType === 'pipes' ? 'SMOKING PIPES ONLY' : productType === 'tobacco' ? 'PIPE TOBACCO BLENDS ONLY' : 'products (smoking pipes or pipe tobacco blends)'} that match the criteria.

User's Question: ${whatIfQuery}
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

  if (!optLoading && !optimization) {
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
            What If Scenario Analysis
          </CardTitle>
          <p className="text-sm text-stone-600">
            Analyze potential changes to your collection before making them
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Your Question or Scenario
            </label>
            <Textarea
              placeholder={improvedWhatIf 
                ? "e.g., 'How do I clean my pipe?' or 'What pipe should I add for English blends?'" 
                : "e.g., 'What collection changes should I do next if I want better English blend matches?' or 'What if I dedicate my Dublin pipe to Virginia/Perique only?'"}
              value={whatIfQuery}
              onChange={(e) => setWhatIfQuery(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Pipe Details (Optional)
            </label>
            <Textarea
              placeholder="Describe characteristics: shape, bowl size, material, etc."
              value={whatIfDescription}
              onChange={(e) => setWhatIfDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Upload Photos (Optional)
            </label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="mb-2"
            />
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

          <div className="flex gap-2">
            <Button
              onClick={analyzeWhatIf}
              disabled={whatIfLoading || !whatIfQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {whatIfLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Scenario
                </>
              )}
            </Button>
            {(whatIfResult || whatIfQuery || whatIfPhotos.length > 0) && (
              <Button variant="outline" onClick={resetWhatIf}>
                Reset
              </Button>
            )}
          </div>

          {whatIfResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              {whatIfResult.is_advice_only ? (
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {whatIfResult.advice_response}
                      </p>
                    </div>

                    {whatIfResult.key_points?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-blue-800 mb-2">Key Points:</p>
                        <ul className="space-y-1">
                          {whatIfResult.key_points.map((point, idx) => (
                            <li key={idx} className="text-sm text-stone-600 flex gap-2">
                              <span className="text-blue-600">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {whatIfResult.common_mistakes?.length > 0 && (
                      <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                        <p className="text-sm font-semibold text-rose-800 mb-2">Common Mistakes to Avoid:</p>
                        <ul className="space-y-1">
                          {whatIfResult.common_mistakes.map((mistake, idx) => (
                            <li key={idx} className="text-sm text-rose-700 flex gap-2">
                              <span>⚠️</span>
                              <span>{mistake}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
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

              {whatIfResult.recommendation_category && 
               !whatIfResult.recommendation_category.includes('SKIP') && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={implementWhatIf}
                    disabled={whatIfLoading}
                    className={
                      whatIfResult.recommendation_category?.includes('ESSENTIAL') 
                        ? 'bg-emerald-600 hover:bg-emerald-700 flex-1'
                        : 'bg-indigo-600 hover:bg-indigo-700 flex-1'
                    }
                  >
                    {whatIfLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Implementing...
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Implement This Scenario
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetWhatIf}
                    disabled={whatIfLoading}
                  >
                    Cancel
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
              )}

              {suggestedProducts?.suggestions && !whatIfResult.is_advice_only && (
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Collection Optimization Out of Date
          </DialogTitle>
          <DialogDescription>
            Your pipes, blends, or preferences have changed. Regenerate optimization now for accurate recommendations? You can undo this action.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setShowRegenDialog(false)}>
            Not Now
          </Button>
          {optimization?.previous_active_id && (
            <Button
              variant="outline"
              onClick={() => undoOptimizationMutation.mutate()}
              disabled={undoOptimizationMutation.isPending}
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
            className="bg-amber-700 hover:bg-amber-800"
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
            const currentFocus = pipe.focus || [];
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowConfirmation(false)}
            disabled={acceptingAll}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmChanges}
            disabled={acceptingAll || Object.values(selectedChanges).filter(Boolean).length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
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
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Target className="w-5 h-5" />
                Collection Optimization
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="text-blue-600 hover:text-blue-800"
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
            <CardDescription className="mt-2">
              Maximize your collection's potential with strategic pipe specializations
            </CardDescription>
          </div>
          {!isCollapsed && <Button
            onClick={analyzeCollection}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : optimization ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Analysis
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Optimize Collection
              </>
            )}
          </Button>}
        </div>
      </CardHeader>

      {!isCollapsed && optimization && (
        <CardContent className="space-y-6">
          {/* Pipe Specializations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Recommended Pipe Specializations
              </h3>
              {showAcceptAll && (
                <Button
                  onClick={handleAcceptAll}
                  disabled={acceptingAll}
                  className="bg-emerald-600 hover:bg-emerald-700"
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
            <div className="space-y-3">
               {expandPipesToVariants(pipes).map((pv, idx) => {
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
                            {pipe?.photos?.[0] ? (
                              <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <PipeShapeIcon shape={pipe?.shape} className="w-10 h-10" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {pipe?.id ? (
                                   <a href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pv.pipe_id)}&bowl=${encodeURIComponent(pv.bowl_variant_id || "")}`)}>
                                     <h4 className="font-semibold text-stone-800 hover:text-blue-700 transition-colors">
                                       {displaySpec.pipe_name}
                                     </h4>
                                   </a>
                                 ) : (
                                   <h4 className="font-semibold text-stone-500" title="Pipe not found in collection.">
                                     {displaySpec.pipe_name}
                                   </h4>
                                 )}
                              {pipe?.focus && pipe.focus.length > 0 ? (
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                                  <Star className="w-3 h-3 mr-1" />
                                  Specialized
                                </Badge>
                              ) : displaySpec.versatility_score <= 4 ? (
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                                  <Star className="w-3 h-3 mr-1" />
                                  Recommended: Specialized
                                </Badge>
                              ) : (
                                <Badge className={getVersatilityColor(displaySpec.versatility_score)}>
                                  Versatility {displaySpec.versatility_score}/10
                                </Badge>
                              )}
                            </div>
                            
                            {pv.focus && pv.focus.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-indigo-800 mb-1">Current Focus:</p>
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
                                <p className="text-sm font-medium text-blue-800 mb-1">Specialize for:</p>
                                <div className="flex flex-wrap gap-1">
                                  {displaySpec.recommended_blend_types.map((type, i) => (
                                    <Badge key={i} className="bg-blue-100 text-blue-800 border-blue-200">
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <p className="text-sm text-stone-600 mb-2">{displaySpec.reasoning}</p>
                            
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
                              <p className="text-xs font-medium text-blue-700">Usage Pattern:</p>
                              <p className="text-xs text-stone-600">{displaySpec.usage_pattern}</p>
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

          {/* What If Analysis */}
          <div>
            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => setShowWhatIf(!showWhatIf)}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {showWhatIf ? 'Hide' : 'Show'} "What If" Analysis
            </Button>

            {showWhatIf && (
              <Card className="mt-4 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-800 text-lg">
                    <Lightbulb className="w-5 h-5" />
                    What If Scenario Analysis
                  </CardTitle>
                  <p className="text-sm text-stone-600">
                    Analyze potential changes to your collection before making them
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-stone-700 mb-2 block">
                      Your Question or Scenario
                    </label>
                    <Textarea
                      placeholder="e.g., 'What collection changes should I do next if I want better English blend matches?' or 'What if I dedicate my Dublin pipe to Virginia/Perique only?'"
                      value={whatIfQuery}
                      onChange={(e) => setWhatIfQuery(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-stone-700 mb-2 block">
                      Pipe Details (Optional)
                    </label>
                    <Textarea
                      placeholder="Describe characteristics: shape, bowl size, material, etc."
                      value={whatIfDescription}
                      onChange={(e) => setWhatIfDescription(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-stone-700 mb-2 block">
                      Upload Photos (Optional)
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="mb-2"
                    />
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

                  <div className="flex gap-2">
                    <Button
                      onClick={analyzeWhatIf}
                      disabled={whatIfLoading || !whatIfQuery.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {whatIfLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze Scenario
                        </>
                      )}
                    </Button>
                    {(whatIfResult || whatIfQuery || whatIfPhotos.length > 0) && (
                      <Button variant="outline" onClick={resetWhatIf}>
                        Reset
                      </Button>
                    )}
                  </div>

                  {whatIfResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 space-y-4"
                    >
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

                      {/* Follow-Up Questions */}
                      <div className="border-t pt-4 mt-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-stone-700 mb-2 block">
                            Ask a Follow-Up Question
                          </label>
                          <Textarea
                            placeholder="e.g., 'Which of my pipes would best be converted to fill this gap?' or 'What specific focus should I apply to my Dunhill Shell 498?'"
                            value={whatIfFollowUp}
                            onChange={(e) => setWhatIfFollowUp(e.target.value)}
                            className="min-h-[60px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleWhatIfFollowUp}
                            disabled={whatIfLoading || !whatIfFollowUp.trim()}
                            variant="outline"
                            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                          >
                            {whatIfLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-2" />
                                Continue Analysis
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Implement Button */}
                      {whatIfResult.recommendation_category && 
                       !whatIfResult.recommendation_category.includes('SKIP') && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={implementWhatIf}
                            disabled={whatIfLoading}
                            className={
                              whatIfResult.recommendation_category?.includes('ESSENTIAL') 
                                ? 'bg-emerald-600 hover:bg-emerald-700 flex-1'
                                : 'bg-indigo-600 hover:bg-indigo-700 flex-1'
                            }
                          >
                            {whatIfLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Implementing...
                              </>
                            ) : (
                              <>
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Implement This Scenario
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={resetWhatIf}
                            disabled={whatIfLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      </motion.div>
                      )}
                      </CardContent>
                      </Card>
                      )}
                      </div>

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