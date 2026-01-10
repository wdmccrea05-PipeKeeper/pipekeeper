import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, Sparkles, ChevronRight, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Undo } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import PairingExporter from "@/components/export/PairingExporter";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI } from "@/components/utils/aiGenerators";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";

export default function PairingMatrix({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [pairings, setPairings] = useState(null);
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('pairingMatrixCollapsed');
    return saved === 'true';
  });
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  // Load saved pairings - active first, then latest
  const { data: savedPairings } = useQuery({
    queryKey: ['saved-pairings', user?.email],
    queryFn: async () => {
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

  useEffect(() => {
    setPairings(savedPairings?.pairings || null);
  }, [savedPairings?.id]);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const currentFingerprint = React.useMemo(
    () => buildArtifactFingerprint({ pipes, blends, profile: userProfile }),
    [pipes, blends, userProfile]
  );

  const isStale = React.useMemo(() => 
    !!savedPairings && (!savedPairings.input_fingerprint || savedPairings.input_fingerprint !== currentFingerprint),
    [savedPairings, currentFingerprint]
  );

  // Show regen dialog when stale
  useEffect(() => {
    if (isStale && pairings) {
      setShowRegenDialog(true);
    }
  }, [isStale, pairings]);

  const savePairingsMutation = useMutation({
    mutationFn: async (data) => {
      // Deactivate current active (if any)
      if (savedPairings?.id) {
        await safeUpdate('PairingMatrix', savedPairings.id, { is_active: false }, user?.email);
      }

      // Create clean new active record
      return base44.entities.PairingMatrix.create({
        created_by: user?.email,
        is_active: true,
        previous_active_id: savedPairings?.id ?? null,
        input_fingerprint: currentFingerprint,
        pairings: data.pairings,
        generated_date: data.generated_date,
      });
    },
    onSuccess: () => {
      invalidateAIQueries(queryClient, user?.email);
      setShowRegenDialog(false);
    },
  });

  const undoPairingsMutation = useMutation({
    mutationFn: async () => {
      if (!savedPairings?.previous_active_id) {
        throw new Error('No previous version to undo to');
      }

      // Deactivate current
      await safeUpdate('PairingMatrix', savedPairings.id, { is_active: false }, user?.email);

      // Reactivate previous
      await safeUpdate('PairingMatrix', savedPairings.previous_active_id, { is_active: true }, user?.email);
    },
    onSuccess: () => {
      invalidateAIQueries(queryClient, user?.email);
      setShowRegenDialog(false);
    },
  });

  const { data: customLogos = [] } = useQuery({
    queryKey: ['custom-tobacco-logos'],
    queryFn: () => base44.entities.TobaccoLogoLibrary.list(),
  });

  const generatePairings = async () => {
    if (pipes.length === 0 || blends.length === 0) return;

    setLoading(true);
    try {
      // Use shared AI generator
      const { pairings: generatedPairings } = await generatePairingsAI({
        pipes,
        blends,
        profile: userProfile
      });

      // Filter pairings to only include blends that exist in user's collection
      const validBlendIds = new Set(blends.map(b => b.id));
      const filteredPairings = generatedPairings.map(pipePairing => ({
        ...pipePairing,
        blend_matches: (pipePairing.blend_matches || []).filter(match => 
          validBlendIds.has(match.blend_id)
        )
      }));

      setPairings(filteredPairings);
      
      // Save pairings to database
      await savePairingsMutation.mutateAsync({
        pairings: filteredPairings,
        generated_date: new Date().toISOString()
      });
      toast.success('Pairings generated successfully');
    } catch (err) {
      console.error('Error generating pairings:', err);
      toast.error('Failed to generate pairings. Please try again.');
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
    <>
    {/* Staleness Dialog */}
    <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Pairing Recommendations Out of Date
          </DialogTitle>
          <DialogDescription>
            Your pipes, blends, or preferences have changed. Regenerate pairings now for accurate recommendations? You can undo this action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRegenDialog(false)}>
            Not Now
          </Button>
          {savedPairings?.previous_active_id && (
            <Button
              variant="outline"
              onClick={() => undoPairingsMutation.mutate()}
              disabled={undoPairingsMutation.isPending}
            >
              <Undo className="w-4 h-4 mr-2" />
              Undo Last Change
            </Button>
          )}
          <Button
            onClick={() => {
              setShowRegenDialog(false);
              generatePairings();
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
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
                              {pipe?.id ? (
                                <a href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                                  <h4 className="font-semibold text-stone-800 hover:text-amber-700 transition-colors">
                                    {pipePairing.pipe_name}
                                  </h4>
                                </a>
                              ) : (
                                <h4
                                  className="font-semibold text-stone-500"
                                  title="This pipe is missing from your collection (deleted or not loaded yet)."
                                >
                                  {pipePairing.pipe_name}
                                </h4>
                              )}
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
                                            {blend?.id ? (
                                              <a href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                                                <p className="font-medium text-stone-800 hover:text-amber-700 transition-colors">
                                                  {match.blend_name}
                                                </p>
                                              </a>
                                            ) : (
                                              <p
                                                className="font-medium text-stone-500"
                                                title="This blend is missing from your collection (deleted or not loaded yet)."
                                              >
                                                {match.blend_name}
                                              </p>
                                            )}
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
    </>
  );
}