import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Target, TrendingUp, ShoppingCart, Sparkles, CheckCircle2, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";

export default function CollectionOptimizer({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0];
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
    },
  });

  const analyzeCollection = async () => {
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

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco consultant. Analyze this pipe collection and provide strategic recommendations to optimize it for maximum versatility and smoking experience.

Pipes Collection:
${JSON.stringify(pipesData, null, 2)}

Tobacco Blends in Cellar:
${JSON.stringify(blendsData, null, 2)}${profileContext}

Analysis Requirements:

1. FOR EACH PIPE: Recommend a specialization strategy:
   - Assign specific blend types it should be dedicated to (e.g., "English/Latakia blends only", "Virginias", "Aromatics")
   - AROMATIC vs NON-AROMATIC: Smaller bowls (<18mm diameter) work better for Aromatics (cooler smoke, less ghosting). Larger bowls (>22mm) are better for Non-Aromatic blends. Recommend "Aromatic" or "Non-Aromatic" specialization accordingly.
   - Explain WHY this pipe is ideal for those blends based on its characteristics AND user preferences
   - Suggest ideal rotation/usage pattern
   - Rate the pipe's versatility (1-10)

2. COLLECTION GAPS: Identify what's missing:
   - Which blend types lack optimal pipe representation?
   - What smoking experiences can't be fully achieved with current pipes?
   - Any redundancy or overlap in the collection?
   - Consider user preferences

3. ACQUISITION RECOMMENDATION: Suggest ONE specific pipe to buy next:
   - Exact shape and specifications
   - Material recommendations
   - Which gap it would fill
   - Estimated budget range
   - Why it would maximize the collection's coverage
   - MUST align with user preferences (shape, size, smoking style)

Be specific, practical, and focused on achieving the best smoking experience across all blend types while heavily considering user preferences.`,
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
                  versatility_score: { type: "number" }
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
            next_pipe_recommendation: {
              type: "object",
              properties: {
                shape: { type: "string" },
                material: { type: "string" },
                chamber_specs: { type: "string" },
                gap_filled: { type: "string" },
                budget_range: { type: "string" },
                reasoning: { type: "string" }
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
    } catch (err) {
      console.error('Error analyzing collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const applySpecialization = async (pipeId, focus) => {
    await updatePipeMutation.mutateAsync({
      id: pipeId,
      data: { focus }
    });
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

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Target className="w-5 h-5" />
              Collection Optimization
            </CardTitle>
            <CardDescription className="mt-2">
              Maximize your collection's potential with strategic pipe specializations
            </CardDescription>
          </div>
          <Button
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
          </Button>
        </div>
      </CardHeader>

      {optimization && (
        <CardContent className="space-y-6">
          {/* Pipe Specializations */}
          <div>
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Recommended Pipe Specializations
            </h3>
            <div className="space-y-3">
              {optimization.pipe_specializations?.map((spec, idx) => {
                const pipe = pipes.find(p => p.id === spec.pipe_id);
                
                return (
                  <motion.div
                    key={spec.pipe_id}
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
                                  {spec.pipe_name}
                                </h4>
                              </Link>
                              <Badge className={getVersatilityColor(spec.versatility_score)}>
                                Versatility {spec.versatility_score}/10
                              </Badge>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-sm font-medium text-blue-800 mb-1">Specialize for:</p>
                              <div className="flex flex-wrap gap-1">
                                {spec.recommended_blend_types?.map((type, i) => (
                                  <Badge key={i} className="bg-blue-100 text-blue-800 border-blue-200">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <p className="text-sm text-stone-600 mb-2">{spec.reasoning}</p>
                            
                            <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                              <p className="text-xs font-medium text-blue-700">Usage Pattern:</p>
                              <p className="text-xs text-stone-600">{spec.usage_pattern}</p>
                            </div>

                            <div className="flex gap-2 mt-2">
                              {!pipe?.focus || pipe.focus.length === 0 ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                    onClick={() => applySpecialization(pipe.id, spec.recommended_blend_types)}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Apply Suggested
                                  </Button>
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
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                  <Check className="w-3 h-3 mr-1" />
                                  Focus Applied
                                </Badge>
                              )}
                            </div>
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

          {/* Next Pipe Recommendation */}
          {optimization.next_pipe_recommendation && (
            <div>
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                What to Buy Next
              </h3>
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-emerald-800 text-lg">
                          {optimization.next_pipe_recommendation.shape} in {optimization.next_pipe_recommendation.material}
                        </h4>
                        <p className="text-sm text-emerald-600 font-medium">
                          {optimization.next_pipe_recommendation.budget_range}
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white border-emerald-700">
                        Recommended
                      </Badge>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-emerald-200 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-stone-700">Specifications:</p>
                        <p className="text-sm text-stone-600">{optimization.next_pipe_recommendation.chamber_specs}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-700">Fills Gap:</p>
                        <p className="text-sm text-emerald-700 font-medium">{optimization.next_pipe_recommendation.gap_filled}</p>
                      </div>
                    </div>

                    <p className="text-sm text-stone-600">{optimization.next_pipe_recommendation.reasoning}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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