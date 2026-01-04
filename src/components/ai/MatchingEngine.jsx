import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Star, Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function MatchingEngine({ pipe, blends, isPaidUser }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const { data: customLogos = [] } = useQuery({
    queryKey: ['tobacco-logos'],
    queryFn: () => base44.entities.TobaccoLogoLibrary.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const confirmRecommendationMutation = useMutation({
    mutationFn: async () => {
      if (!recommendations?.ideal_blend_types?.length) return;
      
      // Update pipe focus
      await base44.entities.Pipe.update(pipe.id, {
        focus: recommendations.ideal_blend_types
      });
      
      // Mark existing pairing matrices as stale by clearing is_active
      const existingPairings = await base44.entities.PairingMatrix.filter(
        { created_by: user?.email, is_active: true }
      );
      for (const pairing of existingPairings) {
        await base44.entities.PairingMatrix.update(pairing.id, { is_active: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipe', pipe.id] });
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
      queryClient.invalidateQueries({ queryKey: ['saved-pairings'] });
      queryClient.invalidateQueries({ queryKey: ['saved-optimization'] });
    },
  });

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const pipeDescription = `
        Pipe: ${pipe.name}
        Maker: ${pipe.maker || 'Unknown'}
        Shape: ${pipe.shape || 'Unknown'}
        Bowl Material: ${pipe.bowl_material || 'Unknown'}
        Chamber Volume: ${pipe.chamber_volume || 'Unknown'}
        Bowl Diameter: ${pipe.bowl_diameter_mm ? pipe.bowl_diameter_mm + 'mm' : 'Unknown'}
        Bowl Depth: ${pipe.bowl_depth_mm ? pipe.bowl_depth_mm + 'mm' : 'Unknown'}
        Finish: ${pipe.finish || 'Unknown'}
        Smoking Characteristics: ${pipe.smoking_characteristics || 'Not specified'}
      `;

      const existingBlends = blends.map(b => ({
        manufacturer: b.manufacturer?.toLowerCase() || '',
        name: b.name?.toLowerCase() || '',
        fullName: `${b.manufacturer || ''} ${b.name || ''}`.toLowerCase()
      }));

      const existingBlendsText = existingBlends.map(b => `- ${b.fullName}`).join('\n');
      
      const blendsListText = blends.map(b => `${b.manufacturer || 'Unknown'} - ${b.name}`).join('\n');

      const hasFocus = pipe.focus && pipe.focus.length > 0;
      
      const hasNonAromaticFocus = pipe.focus?.some(f => 
        f.toLowerCase().includes('non-aromatic') || f.toLowerCase().includes('non aromatic')
      );
      const hasAromaticFocus = pipe.focus?.some(f => 
        f.toLowerCase() === 'aromatic' && !f.toLowerCase().includes('non')
      );
      
      let focusContext = '';
      if (hasNonAromaticFocus) {
        focusContext = `\n\nCRITICAL: This pipe has NON-AROMATIC focus. COMPLETELY EXCLUDE all Aromatic blends. Only recommend Virginia, English, Balkan, Latakia, Virginia/Perique, and other non-aromatic types.`;
      } else if (hasAromaticFocus) {
        focusContext = `\n\nCRITICAL: This pipe has AROMATIC-ONLY focus. COMPLETELY EXCLUDE all non-aromatic blends. Only recommend Aromatic blend types.`;
      } else if (hasFocus) {
        focusContext = `\n\nThis pipe has a DESIGNATED FOCUS: ${pipe.focus.join(', ')}. Prioritize these blend types but also consider the pipe's physical characteristics.`;
      } else {
        focusContext = `\n\nThis pipe has NO designated focus. Base ALL recommendations ENTIRELY on its physical characteristics.`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco sommelier. Based on the following pipe characteristics, provide TWO SETS of recommendations:
1. Blends from the user's collection that pair well
2. New blends the user should consider buying

${pipeDescription}

User's Tobacco Collection:
${blendsListText}
${focusContext}

Consider:
1. Bowl size affects burn rate and flavor development - smaller bowls suit mild tobaccos, larger bowls can handle fuller blends
2. Meerschaum pipes are excellent for Virginias and light blends, Briar works with everything
3. Churchwarden and long pipes cool smoke - good for stronger tobaccos
4. Wide shallow bowls suit flakes, deeper bowls work well with ribbon cuts
5. If pipe has a focus, prioritize matching blends but explain how the physical characteristics support that focus

CRITICAL: Do NOT include any URLs, links, sources, or citations in your response.

Provide recommendations in JSON format with:
- ideal_blend_types: array of tobacco blend types that work best (e.g., "Virginia", "English", "Aromatic")
- reasoning: why these types work well with this pipe
- from_collection: array of 3-5 objects with {name, manufacturer, score (1-10), reasoning} for blends from user's collection that match well
- to_buy: array of 3-5 objects with {name, manufacturer, blend_type, score (1-10), description} for NEW products to buy (NOT from user's collection)
- smoking_tips: specific tips for smoking these blend types in this pipe`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            ideal_blend_types: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
            from_collection: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  name: { type: "string" },
                  manufacturer: { type: "string" },
                  score: { type: "number" },
                  reasoning: { type: "string" }
                }
              } 
            },
            to_buy: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  name: { type: "string" },
                  manufacturer: { type: "string" },
                  blend_type: { type: "string" },
                  score: { type: "number" },
                  description: { type: "string" }
                }
              } 
            },
            smoking_tips: { type: "string" }
          }
        }
      });

      // Filter to_buy recommendations to exclude user's collection
      if (result.to_buy) {
        result.to_buy = result.to_buy.filter(product => {
          const productFullName = `${product.manufacturer || ''} ${product.name || ''}`.toLowerCase().trim();
          const productName = product.name?.toLowerCase().trim() || '';
          const productMfr = product.manufacturer?.toLowerCase().trim() || '';
          
          return !existingBlends.some(existing => {
            const existingName = existing.name.trim();
            const existingMfr = existing.manufacturer.trim();
            const existingFull = existing.fullName.trim();
            
            return (
              productFullName === existingFull ||
              (productName === existingName && productMfr === existingMfr)
            );
          });
        });
      }

      setRecommendations(result);
    } catch (err) {
      console.error('Error getting recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isPaidUser) {
    return (
      <UpgradePrompt 
        featureName="AI Tobacco Matching"
        description="Get AI-powered recommendations for blends from your collection and new blends to try based on your pipe's characteristics and smoking profile."
      />
    );
  }

  return (
    <div className="space-y-6">
      {!recommendations && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">AI Tobacco Matching</h3>
          <p className="text-stone-500 mb-6 max-w-md mx-auto">
            Get personalized tobacco blend recommendations based on this pipe's characteristics
          </p>
          <Button
            onClick={getRecommendations}
            disabled={loading}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Perfect Matches
              </>
            )}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {recommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Results</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? 'Show' : 'Hide'}
              </Button>
            </div>

            {!collapsed && (
              <div className="space-y-6">
            {/* Ideal Blend Types */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  Ideal Blend Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {recommendations.ideal_blend_types?.map((type, idx) => (
                    <Badge key={idx} className="bg-amber-600 text-white border-0 px-3 py-1">
                      {type}
                    </Badge>
                  ))}
                </div>
                <p className="text-stone-600">{recommendations.reasoning?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s)]+/g, '')}</p>
                <Button
                  onClick={() => confirmRecommendationMutation.mutate()}
                  disabled={confirmRecommendationMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {confirmRecommendationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Confirm & Apply to Pipe
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* From Your Collection */}
            {recommendations.from_collection?.length > 0 && (
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5 text-emerald-600" />
                    From Your Collection
                  </CardTitle>
                  <CardDescription>Blends you already own that pair well</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {recommendations.from_collection.map((blend, idx) => {
                     const userBlend = blends.find(b => 
                       b.manufacturer?.toLowerCase() === blend.manufacturer?.toLowerCase() &&
                       b.name?.toLowerCase() === blend.name?.toLowerCase()
                     );
                     const imageUrl = userBlend?.photo || userBlend?.logo || getTobaccoLogo(blend.manufacturer, customLogos);

                     return (
                       <div 
                         key={idx} 
                         className="p-4 rounded-lg bg-emerald-50 border border-emerald-200"
                       >
                         <div className="flex items-start gap-3">
                           <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                             <img 
                               src={imageUrl}
                               alt={blend.manufacturer}
                               className={userBlend?.photo ? "w-full h-full object-cover" : "w-full h-full object-contain p-1"}
                             />
                           </div>
                           <div className="flex-1 min-w-0">
                             <h4 className="font-semibold text-stone-800">{blend.manufacturer} - {blend.name}</h4>
                             <p className="text-sm text-stone-600 mt-1">{blend.reasoning?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s)]+/g, '')}</p>
                           </div>
                           <Badge className="bg-emerald-600 text-white shrink-0">
                             {blend.score}/10
                           </Badge>
                         </div>
                       </div>
                     );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended to Buy */}
            {recommendations.to_buy?.length > 0 && (
              <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    Recommended to Buy
                  </CardTitle>
                  <CardDescription>New blends to try that aren't in your collection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {recommendations.to_buy.map((product, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-lg bg-white border border-violet-200 hover:border-violet-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                         <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                           <img 
                             src={getTobaccoLogo(product.manufacturer, customLogos)} 
                             alt={product.manufacturer}
                             className="w-full h-full object-contain p-1"
                           />
                         </div>
                          <div className="flex-1 min-w-0">
                           <h4 className="font-semibold text-stone-800">{product.manufacturer} - {product.name}</h4>
                           <p className="text-xs text-stone-500 mt-0.5">{product.blend_type}</p>
                           <p className="text-sm text-stone-600 mt-2">{product.description?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s)]+/g, '')}</p>
                          </div>
                          <Badge className="bg-violet-600 text-white shrink-0">
                            {product.score}/10
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Smoking Tips */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Smoking Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-600">{recommendations.smoking_tips?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s)]+/g, '')}</p>
              </CardContent>
            </Card>

              <div className="text-center">
                <Button variant="outline" onClick={() => setRecommendations(null)}>
                  Get New Recommendations
                </Button>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}