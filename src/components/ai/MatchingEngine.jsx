import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ExternalLink, Star, Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function MatchingEngine({ pipe, blends }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

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

      const userBlendsDescription = blends.length > 0 
        ? `\n\nUser's tobacco collection:\n${blends.map(b => 
            `- ${b.name} (${b.blend_type || 'Unknown type'}, ${b.strength || 'Unknown strength'})`
          ).join('\n')}`
        : '';

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
        prompt: `You are an expert pipe tobacco sommelier. Based on the following pipe characteristics, recommend the ideal types of tobacco blends that would smoke well in this pipe, and suggest specific real-world product examples.

${pipeDescription}
${userBlendsDescription}${focusContext}

Consider:
1. Bowl size affects burn rate and flavor development - smaller bowls suit mild tobaccos, larger bowls can handle fuller blends
2. Meerschaum pipes are excellent for Virginias and light blends, Briar works with everything
3. Churchwarden and long pipes cool smoke - good for stronger tobaccos
4. Wide shallow bowls suit flakes, deeper bowls work well with ribbon cuts
5. If pipe has a focus, prioritize matching blends but explain how the physical characteristics support that focus

Provide recommendations in JSON format with:
- ideal_blend_types: array of tobacco blend types that work best (e.g., "Virginia", "English", "Aromatic")
- reasoning: why these types work well with this pipe
- from_collection: array of blend names from the user's collection that would pair well (if any match)
- product_recommendations: array of 3-5 specific real products with name, manufacturer, blend_type, and brief description
- smoking_tips: specific tips for smoking these blend types in this pipe`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            ideal_blend_types: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
            from_collection: { type: "array", items: { type: "string" } },
            product_recommendations: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  name: { type: "string" },
                  manufacturer: { type: "string" },
                  blend_type: { type: "string" },
                  description: { type: "string" }
                }
              } 
            },
            smoking_tips: { type: "string" }
          }
        }
      });

      setRecommendations(result);
    } catch (err) {
      console.error('Error getting recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

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
            className="space-y-6"
          >
            {/* Ideal Blend Types */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  Ideal Blend Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {recommendations.ideal_blend_types?.map((type, idx) => (
                    <Badge key={idx} className="bg-amber-600 text-white border-0 px-3 py-1">
                      {type}
                    </Badge>
                  ))}
                </div>
                <p className="text-stone-600">{recommendations.reasoning}</p>
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
                  <div className="flex flex-wrap gap-2">
                    {recommendations.from_collection.map((name, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Recommendations */}
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recommended Products</CardTitle>
                <CardDescription>Real-world blends to try</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {recommendations.product_recommendations?.map((product, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 rounded-lg bg-stone-50 border border-stone-100 hover:border-amber-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-stone-800">{product.name}</h4>
                          <p className="text-sm text-stone-500">{product.manufacturer}</p>
                        </div>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 shrink-0">
                          {product.blend_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-stone-600 mt-2">{product.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Smoking Tips */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Smoking Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-600">{recommendations.smoking_tips}</p>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button variant="outline" onClick={() => setRecommendations(null)}>
                Get New Recommendations
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}