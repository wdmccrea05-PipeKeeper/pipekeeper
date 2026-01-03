import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, Sparkles, ChevronRight, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import PairingExporter from "@/components/export/PairingExporter";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";

export default function PairingMatrix({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [pairings, setPairings] = useState(null);
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('pairingMatrixCollapsed');
    return saved === 'true';
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  // Load saved pairings
  const { data: savedPairings } = useQuery({
    queryKey: ['saved-pairings', user?.email],
    queryFn: async () => {
      const results = await base44.entities.PairingMatrix.filter({ created_by: user?.email }, '-created_date', 1);
      return results[0];
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (savedPairings && !pairings) {
      setPairings(savedPairings.pairings);
    }
  }, [savedPairings]);

  const savePairingsMutation = useMutation({
    mutationFn: (data) => base44.entities.PairingMatrix.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-pairings', user?.email] });
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const { data: customLogos = [] } = useQuery({
    queryKey: ['custom-tobacco-logos'],
    queryFn: () => base44.entities.TobaccoLogoLibrary.list(),
  });

  const generatePairings = async () => {
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
- Strength Preference: ${userProfile.strength_preference}
- Additional Notes: ${userProfile.notes || 'None'}

Weight these preferences heavily when scoring pairings. Prioritize blends that match their preferred types and strength.`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco sommelier. Analyze these pipes and tobacco blends to create optimal pairings.

Pipes:
${JSON.stringify(pipesData, null, 2)}

Tobacco Blends:
${JSON.stringify(blendsData, null, 2)}${profileContext}

For each pipe, evaluate which tobacco blends would pair well.

CRITICAL SCORING PRIORITY ORDER (HIGHEST TO LOWEST):

1. **PIPE SPECIALIZATION/FOCUS** (HIGHEST PRIORITY - Weight: 40%):
   - If a pipe has "Non-Aromatic" or "Non Aromatic" in focus: COMPLETELY EXCLUDE all Aromatic blends (score = 0)
   - If a pipe has "Aromatic" in focus: COMPLETELY EXCLUDE all non-aromatic blends (score = 0)
   - If a pipe HAS ANY focus field set (non-empty array): Give 9-10 scores ONLY to blends matching that focus
   - Blends NOT matching the pipe's focus should receive maximum 5/10 score
   - A dedicated pipe should excel at its specialization - reward this heavily

2. **USER SMOKING PREFERENCES** (SECOND PRIORITY - Weight: 30%):
   - User's preferred blend types should receive +2 bonus points
   - User's preferred strength should receive +1 bonus point
   - User's pipe size preference should influence recommendations
   - If user prefers certain shapes, highlight how those pipes work with their preferred blends
   - Tailor ALL recommendations to align with stated preferences

3. **PHYSICAL PIPE CHARACTERISTICS** (THIRD PRIORITY - Weight: 30%):
   - Bowl diameter: <18mm for milder tobaccos, 18-22mm versatile, >22mm for fuller blends
   - Chamber volume: Small for aromatics/milds, Large for full/English blends
   - Material: Meerschaum excellent for Virginias, Briar versatile
   - Shape: Affects smoke temperature and moisture retention

RATING SCALE:
- 10 = Perfect match (specialization + user preference aligned)
- 9 = Excellent (strong specialization or preference match)
- 7-8 = Very good (partial matches)
- 5-6 = Acceptable (no conflicts but not optimal)
- 3-4 = Suboptimal (conflicts with focus or preferences)
- 0-2 = Poor/Incompatible (violates focus rules or strong conflicts)

CRITICAL: Prioritize pipe specialization above all else. A pipe designated for English blends should score 9-10 for English blends and much lower for others, regardless of physical characteristics.`,
        response_json_schema: {
          type: "object",
          properties: {
            pairings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pipe_id: { type: "string" },
                  pipe_name: { type: "string" },
                  blend_matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        blend_id: { type: "string" },
                        blend_name: { type: "string" },
                        score: { type: "number" },
                        reasoning: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const generatedPairings = result.pairings || [];
      setPairings(generatedPairings);
      
      // Save pairings to database
      await savePairingsMutation.mutateAsync({
        pairings: generatedPairings,
        generated_date: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error generating pairings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 7) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 5) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-stone-100 text-stone-700 border-stone-300';
  };

  const getBestMatch = (pipeMatches) => {
    if (!pipeMatches || pipeMatches.length === 0) return null;
    return pipeMatches.reduce((best, current) => 
      current.score > best.score ? current : best
    , pipeMatches[0]);
  };

  if (pipes.length === 0 || blends.length === 0) {
    return null;
  }

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('pairingMatrixCollapsed', newState.toString());
  };

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-violet-800">
                <Sparkles className="w-5 h-5" />
                AI Pairing Recommendations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="text-violet-600 hover:text-violet-800"
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
            <CardDescription className="mt-2">
              Find the perfect tobacco blend for each pipe in your collection
            </CardDescription>
          </div>
          {!isCollapsed && (
            <div className="flex gap-2">
              <PairingExporter pipes={pipes} blends={blends} />
              <Button
            onClick={() => {
              if (pairings) {
                if (confirm('Update pairing analysis? This will regenerate all recommendations based on your current collection and profile.')) {
                  generatePairings();
                }
              } else {
                generatePairings();
              }
            }}
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : pairings ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Pairings
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Pairings
                </>
                )}
                </Button>
                </div>
                )}
        </div>
      </CardHeader>
      
      {!isCollapsed && pairings && (
        <CardContent>
          <div className="space-y-4">
            {pairings.map((pipePairing, idx) => {
              const pipe = pipes.find(p => p.id === pipePairing.pipe_id);
              const bestMatch = getBestMatch(pipePairing.blend_matches);
              const isExpanded = selectedPipe === pipePairing.pipe_id;

              return (
                <motion.div
                  key={pipePairing.pipe_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border-stone-200 hover:border-violet-300 transition-colors">
                    <CardContent className="p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => isExpanded ? setSelectedPipe(null) : setSelectedPipe(pipePairing.pipe_id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                            {pipe?.photos?.[0] ? (
                              <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <PipeShapeIcon shape={pipe?.shape} className="w-8 h-8" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <a href={createPageUrl(`PipeDetail?id=${pipe?.id}`)}>
                                <h4 className="font-semibold text-stone-800 hover:text-amber-700 transition-colors">
                                  {pipePairing.pipe_name}
                                </h4>
                              </a>
                            </div>
                            {bestMatch && (
                              <div className="flex items-center gap-2 mt-1">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-sm text-stone-600">
                                  Best match: <span className="font-medium">{bestMatch.blend_name}</span>
                                </span>
                                <Badge className={`${getScoreColor(bestMatch.score)} text-xs`}>
                                  {bestMatch.score}/10
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {pipePairing.blend_matches?.length || 0} matches
                          </Badge>
                          <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-stone-200 space-y-3"
                          >
                            {pipePairing.blend_matches
                              ?.sort((a, b) => b.score - a.score)
                              .map((match) => {
                                const blend = blends.find(b => b.id === match.blend_id);
                                const isBest = match.blend_id === bestMatch?.blend_id;

                                return (
                                  <div 
                                    key={match.blend_id}
                                    className={`p-3 rounded-lg ${isBest ? 'bg-amber-50 border border-amber-200' : 'bg-stone-50'}`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1">
                                        {isBest && (
                                          <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                                        )}
                                        <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0">
                                         {(() => {
                                           const logoUrl = blend?.logo || getTobaccoLogo(blend?.manufacturer, customLogos);
                                           return logoUrl ? (
                                             <img 
                                               src={logoUrl} 
                                               alt="" 
                                               className="w-full h-full object-contain p-1"
                                               onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '🍂'; }} 
                                             />
                                           ) : blend?.photo ? (
                                             <img 
                                               src={blend.photo} 
                                               alt="" 
                                               className="w-full h-full object-cover"
                                               onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '🍂'; }} 
                                             />
                                           ) : (
                                             <span className="text-lg">🍂</span>
                                           );
                                         })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <a href={createPageUrl(`TobaccoDetail?id=${blend?.id}`)}>
                                              <p className="font-medium text-stone-800 hover:text-amber-700 transition-colors">
                                                {match.blend_name}
                                              </p>
                                            </a>
                                          </div>
                                          <p className="text-xs text-stone-600 mt-1">{match.reasoning}</p>
                                        </div>
                                      </div>
                                      <Badge className={`${getScoreColor(match.score)} shrink-0`}>
                                        {match.score}/10
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 text-center text-xs text-stone-500">
            {savedPairings?.generated_date && (
              <p>Last updated: {new Date(savedPairings.generated_date).toLocaleDateString()}</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}