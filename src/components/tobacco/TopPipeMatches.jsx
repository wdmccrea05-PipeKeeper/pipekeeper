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
      const results = await base44.entities.PairingMatrix.filter({ created_by: user?.email }, '-created_date', 1);
      return results[0];
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

  const updateMatchesFromData = () => {
    if (!savedPairings || !blend) return;

    const pipeScores = pipes.map(pipe => {
      const pipePairing = savedPairings.pairings?.find(p => p.pipe_id === pipe.id);
      const match = pipePairing?.blend_matches?.find(m => m.blend_id === blend.id);
      let baseScore = match?.score || 5;

      // Apply adjustments similar to PairingGrid
      let adjustment = 0;

      // CRITICAL: Aromatic/Non-Aromatic Exclusions
      const hasNonAromaticFocus = pipe.focus?.some(f => 
        f.toLowerCase().includes('non-aromatic') || f.toLowerCase().includes('non aromatic')
      );
      const hasAromaticFocus = pipe.focus?.some(f => 
        f.toLowerCase() === 'aromatic' && !f.toLowerCase().includes('non')
      );
      const isAromaticBlend = blend.blend_type?.toLowerCase() === 'aromatic';

      if (hasNonAromaticFocus && isAromaticBlend) return { pipe, score: 0, reasoning: 'Pipe designated for non-aromatic blends' };
      if (hasAromaticFocus && !isAromaticBlend) return { pipe, score: 0, reasoning: 'Pipe designated for aromatic blends' };

      // Pipe Focus/Specialization
      if (pipe.focus && pipe.focus.length > 0) {
        const focusMatch = pipe.focus.some(f => {
          const focusLower = f.toLowerCase();
          const blendTypeLower = blend.blend_type?.toLowerCase() || '';
          const blendComponents = blend.tobacco_components || [];
          return blendTypeLower.includes(focusLower) || 
                 focusLower.includes(blendTypeLower) ||
                 blendComponents.some(comp => comp.toLowerCase().includes(focusLower));
        });
        adjustment += focusMatch ? 5 : -2;
      }

      // User Profile Preferences
      if (userProfile) {
        if (userProfile.preferred_blend_types?.includes(blend.blend_type)) adjustment += 2;
        if (userProfile.strength_preference !== 'No Preference' && blend.strength === userProfile.strength_preference) adjustment += 1.5;
        if (userProfile.pipe_size_preference !== 'No Preference' && pipe.chamber_volume === userProfile.pipe_size_preference) adjustment += 0.5;
      }

      const adjustedScore = Math.max(0, Math.min(10, baseScore + adjustment));
      return {
        pipe,
        score: Math.round(adjustedScore * 10) / 10,
        reasoning: match?.reasoning || 'Compatibility based on pipe characteristics'
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
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setCollapsed(!collapsed)}
                  className="text-[#e8d5b7] hover:text-[#e8d5b7] hover:bg-[#8b3a3a]/20"
                >
                  {collapsed ? 'Show' : 'Hide'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={findMatches}
                  disabled={loading}
                  className="text-[#e8d5b7] hover:text-[#e8d5b7] hover:bg-[#8b3a3a]/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
            </div>

            {!collapsed && (
              <div className="space-y-2">
              {matches.map((match, idx) => {
                const pipe = pipes.find(p => p.id === match.pipe_id);
                if (!pipe) return null;

                return (
                  <a key={match.pipe_id} href={createPageUrl(`PipeDetail?id=${pipe.id}`)}>
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