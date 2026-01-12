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
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries, invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function MatchingEngine({ pipe, blends, isPaidUser }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeBowl, setActiveBowl] = useState('main');
  const queryClient = useQueryClient();

  // Normalization and fuzzy matching helpers
  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripDupManufacturer(mfr) {
    const parts = (mfr || "").split(" - ").map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2 && norm(parts[0]) === norm(parts[1])) return parts[0];
    return mfr;
  }

  function extractManufacturerAndName(recManufacturer, recName) {
    let m = (recManufacturer || "").trim();
    let n = (recName || "").trim();

    const mParts = m.split(" - ").map(p => p.trim()).filter(Boolean);
    const nParts = n.split(" - ").map(p => p.trim()).filter(Boolean);

    if (!n && mParts.length >= 2) {
      m = mParts[0];
      n = mParts.slice(1).join(" - ");
    } else if (nParts.length >= 2 && !m) {
      m = nParts[0];
      n = nParts.slice(1).join(" - ");
    }

    m = stripDupManufacturer(m);

    const nm = norm(m);
    const nn = norm(n);
    if (nm && nn.startsWith(nm + " ")) {
      n = n.slice(n.toLowerCase().indexOf(m.toLowerCase()) + m.length).trim();
    }

    return { manufacturer: m, name: n };
  }

  function findBestUserBlend(blends, rec) {
    const { manufacturer: rm, name: rn } = extractManufacturerAndName(rec.manufacturer, rec.name);

    const rmN = norm(rm);
    const rnN = norm(rn);

    let hit = blends.find(b => norm(b.manufacturer) === rmN && norm(b.name) === rnN);
    if (hit) return hit;

    const targetFull = norm(`${rm} ${rn}`);
    hit = blends.find(b => {
      const full = norm(`${b.manufacturer} ${b.name}`);
      return full === targetFull || full.includes(targetFull) || targetFull.includes(full);
    });
    if (hit) return hit;

    const targetTokens = new Set(targetFull.split(" ").filter(Boolean));
    let best = null;
    let bestScore = 0;

    for (const b of blends) {
      const full = norm(`${b.manufacturer} ${b.name}`);
      const tokens = full.split(" ").filter(Boolean);
      if (!tokens.length) continue;

      let overlap = 0;
      for (const t of tokens) if (targetTokens.has(t)) overlap++;

      const score = overlap / Math.max(tokens.length, targetTokens.size);
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }

    return bestScore >= 0.45 ? best : null;
  }

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
      const mainRecommendations = recommendations?.main;
      if (!mainRecommendations?.ideal_blend_types?.length) return;
      
      await safeUpdate('Pipe', pipe.id, {
        focus: mainRecommendations.ideal_blend_types
      }, user?.email);
      
      const existingPairings = await base44.entities.PairingMatrix.filter(
        { created_by: user?.email, is_active: true }
      );
      for (const pairing of existingPairings) {
        await safeUpdate('PairingMatrix', pairing.id, { is_active: false }, user?.email);
      }
    },
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      invalidateAIQueries(queryClient, user?.email);
    },
  });

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const hasInterchangeableBowls = pipe.interchangeable_bowls?.length > 0;
      
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
      
      const bowlVariants = [
        {
          id: 'main',
          name: 'Main Bowl',
          description: `
        Pipe: ${pipe.name}
        Maker: ${pipe.maker || 'Unknown'}
        Shape: ${pipe.shape || 'Unknown'}
        Bowl Material: ${pipe.bowl_material || 'Unknown'}
        Chamber Volume: ${pipe.chamber_volume || 'Unknown'}
        Bowl Diameter: ${pipe.bowl_diameter_mm ? pipe.bowl_diameter_mm + 'mm' : 'Unknown'}
        Bowl Depth: ${pipe.bowl_depth_mm ? pipe.bowl_depth_mm + 'mm' : 'Unknown'}
        Finish: ${pipe.finish || 'Unknown'}
        Smoking Characteristics: ${pipe.smoking_characteristics || 'Not specified'}
      `
        },
        ...(pipe.interchangeable_bowls || []).map((bowl, idx) => ({
          id: `bowl_${idx}`,
          name: bowl.name || `Bowl ${idx + 1}`,
          description: `
        Pipe: ${pipe.name} - ${bowl.name || `Bowl ${idx + 1}`}
        Maker: ${pipe.maker || 'Unknown'}
        Shape: ${bowl.shape || pipe.shape || 'Unknown'}
        Bowl Material: ${bowl.bowl_material || 'Unknown'}
        Chamber Volume: ${bowl.chamber_volume || 'Unknown'}
        Bowl Height: ${bowl.bowl_height_mm ? bowl.bowl_height_mm + 'mm' : 'Unknown'}
        Bowl Width: ${bowl.bowl_width_mm ? bowl.bowl_width_mm + 'mm' : 'Unknown'}
        Bowl Diameter: ${bowl.bowl_diameter_mm ? bowl.bowl_diameter_mm + 'mm' : 'Unknown'}
        Bowl Depth: ${bowl.bowl_depth_mm ? bowl.bowl_depth_mm + 'mm' : 'Unknown'}
        Notes: ${bowl.notes || 'Not specified'}
      `
        }))
      ];

      const allResults = {};
      
      for (const bowlVariant of bowlVariants) {
        const pipeDescription = bowlVariant.description;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert pipe tobacco advisor helping an adult user manage their personal collection.

CRITICAL INSTRUCTION: The user ALREADY OWNS these blends - DO NOT RECOMMEND ANY OF THEM:
${existingBlendsText}

Your task: Provide blend recommendations for this pipe bowl including matches from their collection and optional future additions (do NOT mention buying, pricing, retailers, or purchase steps).

${pipeDescription}

User's Tobacco Collection:
${blendsListText}
${focusContext}

Consider:
1. Bowl size affects burn rate and flavor development - smaller bowls suit mild tobaccos, larger bowls can handle fuller blends
2. Meerschaum pipes are excellent for Virginias and light blends, Briar works with everything
3. Churchwarden and long pipes cool smoke - good for stronger tobaccos
4. Wide shallow bowls suit flakes, deeper bowls work well with ribbon cuts
5. Different bowl materials and sizes within the same pipe system should have different optimal pairings

CRITICAL: Do NOT include any URLs, links, sources, or citations in your response.

IMPORTANT FORMATTING RULES:
- manufacturer must be ONLY the brand/manufacturer name (e.g., "Cornell & Diehl", not "Cornell & Diehl - Cornell & Diehl")
- name must be ONLY the blend name (e.g., "Star of the East", not "Cornell & Diehl - Star of the East")
- Never combine manufacturer and name into a single field
- No dashes, no duplication, no combined strings

Provide recommendations in JSON format with:
- ideal_blend_types: array of tobacco blend types that work best for THIS SPECIFIC BOWL
- reasoning: why these types work well with THIS SPECIFIC BOWL VARIANT
- from_collection: array of 3-5 objects with {name, manufacturer, score (1-10), reasoning} for blends from user's collection that match well
- future_additions: array of 3-5 objects with {name, manufacturer, blend_type, score (1-10), description} for optional future collection additions (NOT from user's collection)
- smoking_tips: specific tips for smoking these blend types in THIS SPECIFIC BOWL`,
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
              future_additions: { 
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

        if (result.future_additions) {
          result.future_additions = result.future_additions.filter(product => {
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

        allResults[bowlVariant.id] = {
          ...result,
          bowl_name: bowlVariant.name
        };
      }

      setRecommendations(allResults);
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

  const hasMultipleBowls = pipe.interchangeable_bowls?.length > 0;
  const currentRecommendations = recommendations?.[activeBowl];

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
            {hasMultipleBowls && <span className="block mt-1 text-amber-600 font-medium">Includes separate analysis for each bowl variant</span>}
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
            {/* Bowl Selector */}
            {hasMultipleBowls && (
              <div className="flex flex-wrap gap-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-sm font-medium text-stone-700 mr-2">Bowl Variant:</span>
                <Button
                  size="sm"
                  variant={activeBowl === 'main' ? 'default' : 'outline'}
                  onClick={() => setActiveBowl('main')}
                  className={activeBowl === 'main' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  Main Bowl
                </Button>
                {pipe.interchangeable_bowls.map((bowl, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant={activeBowl === `bowl_${idx}` ? 'default' : 'outline'}
                    onClick={() => setActiveBowl(`bowl_${idx}`)}
                    className={activeBowl === `bowl_${idx}` ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  >
                    {bowl.name || `Bowl ${idx + 1}`}
                  </Button>
                ))}
              </div>
            )}

            {/* Ideal Blend Types */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  Ideal Blend Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasMultipleBowls && (
                  <div className="text-xs text-amber-700 font-medium mb-2">
                    For: {currentRecommendations?.bowl_name || 'Main Bowl'}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {currentRecommendations?.ideal_blend_types?.map((type, idx) => (
                    <Badge key={idx} className="bg-amber-600 text-white border-0 px-3 py-1">
                      {type}
                    </Badge>
                  ))}
                </div>
                <p className="text-stone-600">{currentRecommendations?.reasoning?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s)]+/g, '')}</p>
                {activeBowl === 'main' && (
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
                )}
              </CardContent>
            </Card>

            {/* From Your Collection */}
            {currentRecommendations?.from_collection?.length > 0 && (
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5 text-emerald-600" />
                    From Your Collection
                  </CardTitle>
                  <CardDescription>
                    Blends you already own that pair well
                    {hasMultipleBowls && <span className="block mt-1 text-amber-600"> • {currentRecommendations?.bowl_name}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {currentRecommendations.from_collection.map((blend, idx) => {
                     const userBlend = findBestUserBlend(blends, blend);
                     const imageUrl = userBlend?.photo || userBlend?.logo || (userBlend?.manufacturer ? getTobaccoLogo(userBlend.manufacturer, customLogos) : getTobaccoLogo(blend.manufacturer, customLogos));
                     const hasValidId = userBlend?.id;

                     const CardContent = (
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
                     );

                     return hasValidId ? (
                       <a 
                         key={idx}
                         href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(userBlend.id)}`)}
                         className="block p-4 rounded-lg bg-emerald-50 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                       >
                         {CardContent}
                       </a>
                     ) : (
                       <div 
                         key={idx} 
                         className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 opacity-70"
                         title="Blend not found in your collection"
                       >
                         {CardContent}
                       </div>
                     );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optional Future Additions */}
            {currentRecommendations?.future_additions?.length > 0 && (
              <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    Optional Future Collection Additions
                  </CardTitle>
                  <CardDescription>
                    Blends to consider that aren't in your collection
                    {hasMultipleBowls && <span className="block mt-1 text-amber-600"> • {currentRecommendations?.bowl_name}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {currentRecommendations.future_additions.map((product, idx) => (
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
                {hasMultipleBowls && (
                  <p className="text-xs text-amber-700 font-medium mt-1">For: {currentRecommendations?.bowl_name}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-stone-600">{currentRecommendations?.smoking_tips?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s)]+/g, '')}</p>
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