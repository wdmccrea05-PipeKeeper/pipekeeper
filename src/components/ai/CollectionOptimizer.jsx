import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Target, TrendingUp, ShoppingCart, Sparkles, CheckCircle2, RefreshCw, Check, ChevronDown, ChevronUp, Trophy, HelpCircle, Upload, X, Lightbulb, CheckCheck, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";

export default function CollectionOptimizer({ pipes, blends, showWhatIf: initialShowWhatIf = false }) {
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
  const [pipeFeedback, setPipeFeedback] = useState({});
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);
  const [userFeedbackHistory, setUserFeedbackHistory] = useState('');
  const [showAcceptAll, setShowAcceptAll] = useState(false);
  const [acceptingAll, setAcceptingAll] = useState(false);
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

  // Load saved optimization
  const { data: savedOptimization } = useQuery({
    queryKey: ['saved-optimization'],
    queryFn: async () => {
      const results = await base44.entities.CollectionOptimization.list('-created_date', 1);
      return results[0];
    },
  });

  useEffect(() => {
    if (savedOptimization && !optimization) {
      setOptimization(savedOptimization);
    }
  }, [savedOptimization]);

  const saveOptimizationMutation = useMutation({
    mutationFn: (data) => base44.entities.CollectionOptimization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-optimization'] });
    },
  });

  const updatePipeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pipe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipes', user?.email] });
    },
  });

  const analyzeCollection = async (withFeedback = false) => {
    if (pipes.length === 0 || blends.length === 0) return;

    setLoading(true);
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
        stem_material: p.stem_material,
        finish: p.finish,
        focus: p.focus
      }));

      const blendsData = blends.map(b => ({
        id: b.id,
        name: b.name,
        manufacturer: b.manufacturer,
        blend_type: b.blend_type,
        strength: b.strength,
        cut: b.cut,
        flavor_notes: b.flavor_notes
      }));

      let profileContext = "";
      if (userProfile) {
        profileContext = `\n\nUser Smoking Preferences:
- Clenching: ${userProfile.clenching_preference}
- Smoke Duration: ${userProfile.smoke_duration_preference}
- Preferred Blend Types: ${userProfile.preferred_blend_types?.join(', ') || 'None'}
- Pipe Size Preference: ${userProfile.pipe_size_preference}
- Preferred Shapes: ${userProfile.preferred_shapes?.join(', ') || 'None'}
- Strength Preference: ${userProfile.strength_preference}
- Additional Notes: ${userProfile.notes || 'None'}

Tailor all recommendations to match user preferences. Suggest specializations and future pipes that align with their smoking style.`;
      }

      let feedbackContext = "";
      if (withFeedback && userFeedbackHistory) {
        feedbackContext = `\n\n=== USER FEEDBACK ON PREVIOUS RECOMMENDATIONS ===
${userFeedbackHistory}

CRITICAL: Take this feedback seriously and adjust your analysis accordingly. If the user disagrees with a recommendation, explain why you're changing it or provide better reasoning for keeping it. Address each piece of feedback directly in your new recommendations.
===`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `SYSTEM: Use GPT-5 (or latest available GPT model) for this analysis.

You are an expert pipe tobacco consultant specializing in collection optimization for MAXIMUM PAIRING SCORES. Your goal is to help achieve 9-10 "trophy winning" pairings for every blend type the user enjoys.

Pipes Collection:
${JSON.stringify(pipesData, null, 2)}

Tobacco Blends in Cellar:
${JSON.stringify(blendsData, null, 2)}${profileContext}${feedbackContext}

OPTIMIZATION GOALS (IN PRIORITY ORDER):
1. **MAXIMIZE PAIRING SCORES** - Create trophy-winning (9-10 score) pairings for user's preferred blend types
2. **USER PREFERENCE ALIGNMENT** - Every recommendation must prioritize what the user actually enjoys smoking
3. **STRATEGIC SPECIALIZATION** - Dedicated pipes score MUCH higher than versatile pipes
4. **COLLECTION COMPLETENESS** - Ensure user's favorite blend types have optimal pipe representation

Analysis Requirements:

1. FOR EACH PIPE - SPECIALIZATION FOR MAXIMUM SCORES:
   - Identify which specific blend type(s) this pipe should be EXCLUSIVELY dedicated to for 9-10 scores
   - CRITICAL: Prioritize specializations matching USER PREFERRED BLEND TYPES first
   - AROMATIC vs NON-AROMATIC: Smaller bowls (<18mm) = Aromatic specialization, Larger bowls (>22mm) = Non-Aromatic
   - Calculate POTENTIAL SCORE IMPROVEMENT: If pipe currently has no focus, estimate score increase (e.g., "Will increase from 6/10 to 9/10 for English blends")
   - Explain how specialization will achieve trophy-level pairings
   - Rate versatility (1-10), but EMPHASIZE that lower versatility = higher peak performance
   - Show which specific user-owned blends will become 9-10 matches

2. COLLECTION GAPS - SCORE MAXIMIZATION ANALYSIS:
   - Which of USER'S PREFERRED blend types lack a 9-10 rated pipe?
   - Identify blend types where current best score is 7 or below - these need dedicated pipes
   - List redundancies: Multiple pipes scoring 6-7 for same blend vs one pipe scoring 9-10
   - Calculate: "You have X blend types in cellar, but only Y have trophy-winning pipes"
   - PRIORITIZE gaps in user's favorite blend types

3. PRIORITY FOCUS CHANGES - "QUICK WINS":
   - Identify TOP 3 existing pipes that should have their focus changed for maximum score gains
   - For each: current state, recommended new focus, expected score improvements
   - Show which specific user-owned blends will jump from low scores to 9-10
   - Prioritize changes that target user's preferred blend types
   - Calculate total trophy pairings gained from these 3 changes

4. NEXT PIPE ACQUISITIONS - "TROPHY PIPE" RECOMMENDATIONS:
   - Suggest TOP 3 pipes to buy next, ranked by impact
   - Each pipe should target different gaps in user's preferred blend types
   - Exact specifications optimized for specific blend types the user loves
   - State explicitly: "This will achieve 9-10 scores with [list specific user-owned blends]"
   - Expected score improvements: "Currently these blends score 6/10, this pipe will make them 9-10"
   - Budget range and priority ranking (1 = highest priority)
   - Show cumulative impact: how many new trophy pairings all 3 pipes would create

CRITICAL SUCCESS METRICS:
- Count potential 9-10 pairings before and after implementing recommendations
- Emphasize that specialized pipes >> versatile pipes for score optimization
- Every recommendation must reference user preferences explicitly
- Goal: Every preferred blend type should have at least one trophy-winning pipe match

Be aggressive in recommending specialization - versatile pipes are enemies of excellence.`,
        response_json_schema: {
          type: "object",
          properties: {
            pipe_specializations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pipe_id: { type: "string" },
                  pipe_name: { type: "string" },
                  recommended_blend_types: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  reasoning: { type: "string" },
                  usage_pattern: { type: "string" },
                  versatility_score: { type: "number" },
                  score_improvement: { type: "string" },
                  trophy_blends: { 
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            collection_gaps: {
              type: "object",
              properties: {
                missing_coverage: { 
                  type: "array",
                  items: { type: "string" }
                },
                redundancies: { 
                  type: "array",
                  items: { type: "string" }
                },
                overall_assessment: { type: "string" }
              }
            },
            priority_focus_changes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pipe_id: { type: "string" },
                  pipe_name: { type: "string" },
                  current_focus: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  recommended_focus: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  score_improvement: { type: "string" },
                  trophy_blends_gained: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  reasoning: { type: "string" }
                }
              }
            },
            next_pipe_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority_rank: { type: "number" },
                  shape: { type: "string" },
                  material: { type: "string" },
                  chamber_specs: { type: "string" },
                  gap_filled: { type: "string" },
                  budget_range: { type: "string" },
                  reasoning: { type: "string" },
                  trophy_blends: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  score_improvement: { type: "string" }
                }
              }
            }
          }
        }
      });

      setOptimization(result);
      
      // Save optimization to database
      await saveOptimizationMutation.mutateAsync({
        ...result,
        generated_date: new Date().toISOString()
      });

      // Clear feedback after successful re-analysis and show accept button
      if (withFeedback) {
        setPipeFeedback({});
        setShowFeedbackFor(null);
        setShowAcceptAll(true);
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
    
    setAcceptingAll(true);
    try {
      // Apply all recommendations to pipes
      const updatePromises = optimization.pipe_specializations
        .filter(spec => spec.recommended_blend_types?.length > 0)
        .map(spec => {
          const pipe = pipes.find(p => p.id === spec.pipe_id);
          if (!pipe) return null;
          
          // Only update if focus is different
          const currentFocus = JSON.stringify(pipe.focus?.sort() || []);
          const newFocus = JSON.stringify(spec.recommended_blend_types.sort());
          
          if (currentFocus !== newFocus) {
            return updatePipeMutation.mutateAsync({
              id: spec.pipe_id,
              data: { focus: spec.recommended_blend_types }
            });
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(updatePromises);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['pipes'] });
      await queryClient.invalidateQueries({ queryKey: ['saved-pairings'] });
      
      setShowAcceptAll(false);
      setUserFeedbackHistory('');
    } catch (err) {
      console.error('Error accepting recommendations:', err);
      alert('Failed to apply recommendations. Please try again.');
    } finally {
      setAcceptingAll(false);
    }
  };

  const applySpecialization = async (pipeId, focus) => {
    await updatePipeMutation.mutateAsync({
      id: pipeId,
      data: { focus }
    });
  };

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
        focus: p.focus
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
        // Update existing pipe's focus
        if (implementationPlan.pipe_data.pipe_id && implementationPlan.pipe_data.focus) {
          await updatePipeMutation.mutateAsync({
            id: implementationPlan.pipe_data.pipe_id,
            data: { focus: implementationPlan.pipe_data.focus }
          });
          
          const pipeName = pipes.find(p => p.id === implementationPlan.pipe_data.pipe_id)?.name || 'Pipe';
          alert(`Updated ${pipeName}'s focus to: ${implementationPlan.pipe_data.focus.join(', ')}`);
        }
      } else {
        alert(`Cannot implement automatically:\n\n${implementationPlan.explanation}`);
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
              placeholder="e.g., 'Should I buy a Peterson System pipe for English blends?' or 'What if I dedicate my Dublin pipe to Virginia/Perique only?'"
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
              {pipes.map((pipe, idx) => {
                const spec = optimization.pipe_specializations?.find(s => s.pipe_id === pipe.id);
                // Show all pipes, even if no recommendation exists
                const displaySpec = spec || {
                  pipe_id: pipe.id,
                  pipe_name: pipe.name,
                  recommended_blend_types: [],
                  reasoning: "No specific recommendation generated. Consider running the optimization again.",
                  versatility_score: 5,
                  usage_pattern: "Versatile - suitable for multiple blend types"
                };

                return (
                  <motion.div
                    key={pipe.id}
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
                              <Link to={createPageUrl(`PipeDetail?id=${pipe?.id}`)}>
                                <h4 className="font-semibold text-stone-800 hover:text-blue-700 transition-colors">
                                  {displaySpec.pipe_name}
                                </h4>
                              </Link>
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
                              {!pipe?.focus || pipe.focus.length === 0 ? (
                                <>
                                  {displaySpec.recommended_blend_types?.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                      onClick={() => applySpecialization(pipe.id, displaySpec.recommended_blend_types)}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Apply Suggested
                                    </Button>
                                  )}
                                  <Link to={createPageUrl(`PipeDetail?id=${pipe.id}`)}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-stone-300 text-stone-700 hover:bg-stone-50"
                                    >
                                      Create Custom
                                    </Button>
                                  </Link>
                                </>
                              ) : pipe.focus && displaySpec.recommended_blend_types?.length > 0 && 
                                 JSON.stringify(pipe.focus.sort()) !== JSON.stringify(displaySpec.recommended_blend_types.sort()) ? (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => applySpecialization(pipe.id, displaySpec.recommended_blend_types)}
                                >
                                  <CheckCheck className="w-4 h-4 mr-1" />
                                  Accept Current Optimization
                                </Button>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                  <Check className="w-3 h-3 mr-1" />
                                  Focus Applied
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => setShowFeedbackFor(showFeedbackFor === pipe.id ? null : pipe.id)}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                {showFeedbackFor === pipe.id ? 'Cancel' : 'Dispute / Add Info'}
                              </Button>
                            </div>

                            {showFeedbackFor === pipe.id && (
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
                                  value={pipeFeedback[pipe.id] || ''}
                                  onChange={(e) => setPipeFeedback({...pipeFeedback, [pipe.id]: e.target.value})}
                                  className="min-h-[60px] text-sm mb-2"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitFeedback(pipe.id)}
                                  disabled={!pipeFeedback[pipe.id]?.trim() || loading}
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
                              <Link to={createPageUrl(`PipeDetail?id=${pipe?.id}`)}>
                                <h4 className="font-semibold text-stone-800 hover:text-violet-700 transition-colors">
                                  {change.pipe_name}
                                </h4>
                              </Link>
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
                Top 3 Pipes to Buy Next
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
                      placeholder="e.g., 'Should I buy a Peterson System pipe for English blends?' or 'What if I dedicate my Dublin pipe to Virginia/Perique only?'"
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
            {savedOptimization?.generated_date && (
              <p>Last updated: {new Date(savedOptimization.generated_date).toLocaleDateString()}</p>
            )}
          </div>
          </CardContent>
          )}
          </Card>
  );
}