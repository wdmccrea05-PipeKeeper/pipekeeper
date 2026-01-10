import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";

export default function TopPipeMatches({ blend, pipes }) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  const { data: savedPairings } = useQuery({
    queryKey: ['saved-pairings', user?.email],
    queryFn: async () => {
      // Load active first, fallback to latest (same as PairingGrid)
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user?.email, is_active: true },
        '-created_date',
        1
      );
      if (active?.[0]) return active[0];

      const latest = await base44.entities.PairingMatrix.filter(
        { created_by: user?.email },
        '-created_date',
        1
      );
      return latest?.[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const { data: collectionOptimization } = useQuery({
    queryKey: ['collection-optimization', user?.email],
    queryFn: async () => {
      const results = await base44.entities.CollectionOptimization.filter({ created_by: user?.email }, '-created_date', 1);
      return results[0];
    },
    enabled: !!user?.email,
  });

  // Track changes that should trigger auto-refresh
  const pipesFocusFingerprint = React.useMemo(() => 
    JSON.stringify(pipes.map(p => ({ id: p.id, focus: p.focus }))),
    [pipes]
  );

  // Auto-update matches when pairings, optimizations, or pipe focus changes
  useEffect(() => {
    if (savedPairings && !loading) {
      updateMatchesFromData();
    }
  }, [savedPairings?.generated_date, collectionOptimization?.generated_date, pipesFocusFingerprint]);

  // EXACT SAME SCORING LOGIC AS PAIRING GRID
  // Calculate compatibility score with weighted formula
  // Formula: (Preference *.4) + (Focus *.25) + (Dimensions *.15) + (Tobacco *.2) = Grid Score
  const calculateScore = (pipe, blend) => {
    // CRITICAL: Aromatic/Non-Aromatic Exclusions
    const focusList = pipe.focus || [];
    const hasNonAromaticFocus = focusList.some(f => 
      f.toLowerCase().includes('non-aromatic') || f.toLowerCase().includes('non aromatic')
    );
    const hasOnlyAromaticFocus = 
      focusList.length === 1 && 
      focusList[0].toLowerCase() === 'aromatic';
    const isAromaticBlend = blend.blend_type?.toLowerCase() === 'aromatic';
    
    if (hasNonAromaticFocus && isAromaticBlend) return 0;
    if (hasOnlyAromaticFocus && !isAromaticBlend) return 0;
    
    // CATEGORY 1: User Preferences (0-10 scale, weight 0.4)
    let prefScore = 5.0; // Base compatibility
    if (userProfile) {
      if (userProfile.preferred_blend_types?.includes(blend.blend_type)) {
        prefScore += 4.0; // Strong preference match
      }
      if (userProfile.strength_preference !== 'No Preference' && 
          blend.strength === userProfile.strength_preference) {
        prefScore += 1.0;
      }
    }
    prefScore = Math.min(10, prefScore);
    
    // CATEGORY 2: Pipe Focus/Specialization (0-10 scale, weight 0.25, TROPHY FACTOR)
    let focusScore = 5.0; // Base versatility score
    let trophyBonus = 0; // Extra bonus to guarantee trophy status
    
    if (focusList.length > 0) {
      const focusLower = focusList.map(f => f.toLowerCase());
      const blendTypeLower = blend.blend_type?.toLowerCase() || '';
      const blendNameLower = blend.name?.toLowerCase() || '';
      const blendManufacturerLower = blend.manufacturer?.toLowerCase() || '';
      const blendComponents = blend.tobacco_components || [];
      
      // Check for exact blend name match (HIGHEST priority - specific blend assignment)
      const exactNameMatch = focusLower.some(f => {
        if (f === blendNameLower || blendNameLower.includes(f) || f.includes(blendNameLower)) {
          return true;
        }
        const fullName = `${blendManufacturerLower} ${blendNameLower}`.trim();
        if (f === fullName || fullName.includes(f) || f.includes(fullName)) {
          return true;
        }
        return false;
      });
      
      // Check for blend type match
      const exactTypeMatch = focusLower.some(f => 
        f === blendTypeLower || blendTypeLower.includes(f) || f.includes(blendTypeLower)
      );
      
      // Check for component match
      const componentMatch = focusList.some(f => {
        const focusLower = f.toLowerCase();
        return blendComponents.some(comp => {
          const compLower = comp.toLowerCase();
          return compLower === focusLower || compLower.includes(focusLower) || focusLower.includes(compLower);
        });
      });
      
      if (exactNameMatch) {
        // PERFECT TROPHY MATCH: Pipe specifically assigned to this exact blend
        focusScore = 10.0; // Maximum focus score
        trophyBonus = 2.0; // Guarantee trophy status with bonus points
      } else if (exactTypeMatch) {
        // Strong match on blend type
        if (focusList.length === 1) {
          focusScore = 10.0; // Single specialist = trophy
          trophyBonus = 1.5; // Strong trophy bonus
        } else if (focusList.length === 2) {
          focusScore = 9.0;
          trophyBonus = 1.0;
        } else {
          focusScore = 8.0;
          trophyBonus = 0.5;
        }
      } else if (componentMatch) {
        // Partial match on tobacco components
        focusScore = 6.0;
      } else {
        // NO MATCH on specialized pipe = significant penalty
        if (focusList.length === 1) focusScore = 0.0; // Wrong blend for specialist
        else if (focusList.length === 2) focusScore = 1.0;
        else focusScore = 3.0;
      }
    }
    
    // CATEGORY 3: Pipe Dimensions (0-10 scale, weight 0.15)
    let dimensionScore = 5.0; // Base dimension score
    
    // Chamber size vs blend strength
    if (pipe.chamber_volume && blend.strength) {
      if ((pipe.chamber_volume === 'Small' && blend.strength === 'Mild') ||
          (pipe.chamber_volume === 'Medium' && blend.strength === 'Medium') ||
          (pipe.chamber_volume === 'Large' && (blend.strength === 'Full' || blend.strength === 'Medium-Full'))) {
        dimensionScore += 5.0; // Perfect match
      } else if ((pipe.chamber_volume === 'Small' && blend.strength === 'Mild-Medium') ||
                 (pipe.chamber_volume === 'Medium' && (blend.strength === 'Mild-Medium' || blend.strength === 'Medium-Full')) ||
                 (pipe.chamber_volume === 'Large' && blend.strength === 'Medium')) {
        dimensionScore += 3.0; // Good match
      } else {
        dimensionScore += 1.0; // Acceptable
      }
    }
    
    // Bowl shape and cut compatibility
    if (pipe.shape === 'Churchwarden' && blend.cut === 'Flake') dimensionScore += 1.0;
    else if (pipe.shape === 'Billiard' || pipe.shape === 'Apple' || pipe.shape === 'Bulldog') dimensionScore += 0.5;
    
    dimensionScore = Math.min(10, dimensionScore);
    
    // CATEGORY 4: Tobacco Characteristics (0-10 scale, weight 0.2)
    let tobaccoScore = 5.0; // Base tobacco score
    const blendComponents = blend.tobacco_components || [];
    
    // Material-blend synergy based on burn characteristics
    if (pipe.bowl_material === 'Meerschaum') {
      if (blend.blend_type === 'Virginia' || blendComponents.includes('Virginia')) {
        tobaccoScore += 5.0; // Cool smoke ideal for delicate Virginias
      } else if (blend.blend_type === 'Aromatic') {
        tobaccoScore += 3.0; // Good for aromatics
      } else {
        tobaccoScore += 2.0; // Works with most blends
      }
    } else if (pipe.bowl_material === 'Briar') {
      // Briar is versatile - bonus depends on blend characteristics
      if (blend.blend_type === 'English' || blend.blend_type === 'Balkan' || 
          blendComponents.includes('Latakia')) {
        tobaccoScore += 4.0; // Excellent for Latakia blends
      } else {
        tobaccoScore += 2.0; // Good universal material
      }
    } else if (pipe.bowl_material === 'Corn Cob') {
      if (blend.blend_type === 'Aromatic') {
        tobaccoScore += 5.0; // Perfect pairing
      } else if (blend.blend_type === 'Burley') {
        tobaccoScore += 3.0; // Traditional combo
      } else {
        tobaccoScore += 1.0;
      }
    } else {
      tobaccoScore += 1.0;
    }
    
    // Cut compatibility affects burning
    if (blend.cut === 'Flake' && pipe.bowl_depth_mm && pipe.bowl_depth_mm > 35) {
      tobaccoScore += 1.0; // Deep bowls better for flakes
    }
    
    tobaccoScore = Math.min(10, tobaccoScore);
    
    // CALCULATE FINAL WEIGHTED SCORE
    const finalScore = (prefScore * 0.4) + (focusScore * 0.25) + (dimensionScore * 0.15) + (tobaccoScore * 0.2) + trophyBonus;
    
    return Math.max(0, Math.min(10, Math.round(finalScore * 2) / 2)); // Allow half points
  };

  const updateMatchesFromData = () => {
    if (!blend) return;

    // Use EXACT same scoring logic as PairingGrid for perfect consistency
    const pipeScores = pipes.map(pipe => {
      // Always calculate score using the same weighted formula as the grid
      const score = calculateScore(pipe, blend);
      
      // Try to get AI reasoning from saved pairings if available
      const pipePairing = savedPairings?.pairings?.find(p => p.pipe_id === pipe.id);
      const match = pipePairing?.blend_matches?.find(m => m.blend_id === blend.id);
      const reasoning = match?.reasoning || 'Compatibility based on pipe characteristics and focus';

      return {
        pipe,
        score,
        reasoning
      };
    }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);

    const topThree = pipeScores.slice(0, 3).map(m => ({
      pipe_id: m.pipe.id,
      pipe_name: m.pipe.name,
      match_score: m.score,
      reasoning: m.reasoning
    }));

    setMatches(topThree);
  };

  const findMatches = async () => {
    if (pipes.length === 0) return;

    // If we have pairing data, use it
    if (savedPairings) {
      updateMatchesFromData();
      return;
    }

    // Otherwise, generate fresh matches via AI
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
        focus: p.focus
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco consultant. Analyze which pipes from this collection would be the best matches for smoking this tobacco blend.

Tobacco Blend:
- Name: ${blend.name}
- Type: ${blend.blend_type}
- Strength: ${blend.strength}
- Cut: ${blend.cut}
- Flavor Notes: ${blend.flavor_notes?.join(', ')}

Available Pipes:
${JSON.stringify(pipesData, null, 2)}

Return the TOP 3 best matching pipes with reasoning. Consider:
- Chamber size for the cut type
- Pipe shape/bowl characteristics for the blend type
- Designated specializations/focus if any
- Traditional pairings and smoking experience`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pipe_id: { type: "string" },
                  pipe_name: { type: "string" },
                  match_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      setMatches(result.matches?.slice(0, 3) || []);
    } catch (err) {
      console.error('Error finding matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 7) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  if (pipes.length === 0) return null;

  return (
    <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
      <CardContent className="p-4">
        {!matches || matches.length === 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8b3a3a]" />
              <span className="text-sm text-[#e8d5b7]/90 font-medium">Find best pipe matches for this blend</span>
            </div>
            <Button
              size="sm"
              onClick={findMatches}
              disabled={loading}
              className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] hover:from-[#6d2e2e] hover:to-[#5a2525]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Find Matches
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8b3a3a]" />
                <span className="font-bold text-[#e8d5b7] text-base">Top Pipe Matches</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setCollapsed(!collapsed)}
                className="text-[#e8d5b7] hover:text-[#e8d5b7] hover:bg-[#8b3a3a]/20"
              >
                {collapsed ? 'Show' : 'Hide'}
              </Button>
            </div>

            {!collapsed && (
              <div className="space-y-2">
              {matches.map((match, idx) => {
                const pipe = pipes.find(p => p.id === match.pipe_id);
                if (!pipe) return null;

                return (
                  <a key={match.pipe_id} href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-[#8b3a3a]/30 hover:border-[#8b3a3a] hover:bg-[#8b3a3a]/15 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1a2c42] to-[#243548] border border-[#8b3a3a]/20 overflow-hidden flex items-center justify-center shrink-0">
                        {pipe.photos?.[0] ? (
                          <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PipeShapeIcon shape={pipe.shape} className="text-xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-[#e8d5b7] text-lg">#{idx + 1}</span>
                          <span className="font-semibold text-[#e8d5b7]">{match.pipe_name}</span>
                          <Badge className={getScoreColor(match.match_score)}>
                            {match.match_score}/10
                          </Badge>
                        </div>
                        <p className="text-xs text-[#e8d5b7]/80 leading-relaxed">{match.reasoning}</p>
                      </div>
                    </div>
                  </a>
                );
              })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}