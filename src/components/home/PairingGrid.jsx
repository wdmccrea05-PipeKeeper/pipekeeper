import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, Grid3X3, Printer, Trophy, RefreshCw, Share2 } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI } from "@/components/utils/aiGenerators";
import PairingCard from "@/components/home/PairingCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";

export default function PairingGrid({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPairing, setSelectedPairing] = useState(null);
  const gridRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  const { data: savedPairings, refetch: refetchPairings } = useQuery({
    queryKey: ['saved-pairings', user?.email],
    queryFn: async () => {
      // Load active first, fallback to latest
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

  // Don't auto-refresh on mount or navigation - only when user explicitly requests it
  // The staleness indicator is enough to prompt users when changes have been made

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Compute fingerprint and check staleness
  const currentFingerprint = React.useMemo(() => 
    buildArtifactFingerprint({ pipes, blends, profile: userProfile }),
    [pipes, blends, userProfile]
  );

  const isStale = React.useMemo(() => 
    !!savedPairings && (!savedPairings.input_fingerprint || savedPairings.input_fingerprint !== currentFingerprint),
    [savedPairings, currentFingerprint]
  );

  const regeneratePairingsMutation = useMutation({
    mutationFn: async () => {
      // Deactivate current
      if (savedPairings?.id) {
        await safeUpdate('PairingMatrix', savedPairings.id, { is_active: false }, user?.email);
      }

      // Generate fresh pairings using shared generator
      const { pairings: generatedPairings } = await generatePairingsAI({ 
        pipes, 
        blends, 
        profile: userProfile 
      });

      // Create clean new active record
      return await base44.entities.PairingMatrix.create({
        created_by: user?.email,
        is_active: true,
        previous_active_id: savedPairings?.id ?? null,
        input_fingerprint: currentFingerprint,
        pairings: generatedPairings,
        generated_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidateAIQueries(queryClient, user?.email);
    },
  });

  const generateGrid = () => {
    if (!savedPairings) {
      alert('Please generate pairings from the AI Pairing Recommendations section first');
      return;
    }
    setShowGrid(true);
  };

  // Calculate compatibility score following priority hierarchy
  const calculateScore = (pipe, blend) => {
    // Base score: 4.0 (any pipe-blend combo has basic usability)
    let score = 4.0;
    
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
    
    // PRIORITY 1: User Preferences (0-3 points)
    if (userProfile) {
      // Preferred blend types (0-1.5 points)
      if (userProfile.preferred_blend_types?.includes(blend.blend_type)) {
        score += 1.5;
      }
      
      // Strength preference (0-1 point)
      if (userProfile.strength_preference !== 'No Preference' && 
          blend.strength === userProfile.strength_preference) {
        score += 1;
      }
      
      // Pipe size preference (0-0.5 points)
      if (userProfile.pipe_size_preference !== 'No Preference' &&
          pipe.chamber_volume === userProfile.pipe_size_preference) {
        score += 0.5;
      }
    }
    
    // PRIORITY 2: Pipe Focus/Specialization (0-2.5 points)
    if (focusList.length > 0) {
      const focusLower = focusList.map(f => f.toLowerCase());
      const blendTypeLower = blend.blend_type?.toLowerCase() || '';
      const blendComponents = blend.tobacco_components || [];
      
      // Check for exact blend type match
      const exactMatch = focusLower.some(f => {
        // Direct type match
        if (f === blendTypeLower || blendTypeLower.includes(f) || f.includes(blendTypeLower)) {
          return true;
        }
        // Component match
        if (blendComponents.some(comp => {
          const compLower = comp.toLowerCase();
          return compLower === f || compLower.includes(f) || f.includes(compLower);
        })) {
          return true;
        }
        return false;
      });
      
      if (exactMatch) {
        // Exact match: inversely proportional to focus count
        // More specialized = higher bonus for matching
        if (focusList.length === 1) score += 2.5;
        else if (focusList.length === 2) score += 2;
        else if (focusList.length === 3) score += 1.5;
        else score += 1; // 4+ focuses = very versatile, smaller bonus
      } else {
        // No match on specialized pipe = penalty
        if (focusList.length <= 2) {
          score -= 1; // Specialized pipe, wrong blend type
        }
      }
    } else {
      // No focus = versatile pipe, works with anything
      score += 0.5;
    }
    
    // PRIORITY 3: Dimensions and Measurements (0-1.5 points)
    // Bowl capacity and shape matching blend characteristics
    
    // Chamber size vs blend strength (0-1 point)
    if (pipe.chamber_volume && blend.strength) {
      if ((pipe.chamber_volume === 'Small' && blend.strength === 'Mild') ||
          (pipe.chamber_volume === 'Medium' && blend.strength === 'Medium') ||
          (pipe.chamber_volume === 'Large' && (blend.strength === 'Full' || blend.strength === 'Medium-Full'))) {
        score += 1;
      } else if ((pipe.chamber_volume === 'Small' && blend.strength === 'Mild-Medium') ||
                 (pipe.chamber_volume === 'Medium' && (blend.strength === 'Mild-Medium' || blend.strength === 'Medium-Full')) ||
                 (pipe.chamber_volume === 'Large' && blend.strength === 'Medium')) {
        score += 0.5;
      }
    }
    
    // Bowl shape (0-0.5 points)
    if (pipe.shape === 'Churchwarden' && blend.cut === 'Flake') score += 0.5;
    else if (pipe.shape === 'Billiard' || pipe.shape === 'Apple' || pipe.shape === 'Bulldog') score += 0.25;
    
    // PRIORITY 4: Tobacco Components (0-1 point)
    // Material compatibility with blend characteristics
    if (pipe.bowl_material === 'Meerschaum' && blend.blend_type === 'Virginia') {
      score += 1; // Cool smoke ideal for Virginias
    } else if (pipe.bowl_material === 'Briar') {
      score += 0.5; // Briar works with everything
    } else if (pipe.bowl_material === 'Corn Cob' && blend.blend_type === 'Aromatic') {
      score += 0.75;
    }
    
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  };

  // Get the final score for display - always recalculates based on current pipe data
  // This ensures scores update when pipes are modified (e.g., focus changes from optimization)
  const getDisplayScore = (pipe, blend) => {
    // Always calculate fresh score based on current pipe data
    // This ensures the grid reflects any changes to pipe focus, profile preferences, etc.
    return calculateScore(pipe, blend);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write('<html><head><title>Pipe & Tobacco Pairing Grid</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 11px; }
      th { background-color: #f3f4f6; font-weight: bold; }
      .pipe-name { background-color: #fef3c7; font-weight: bold; text-align: left; }
      .blend-header { background-color: #dbeafe; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; }
      .score-high { background-color: #d1fae5; font-weight: bold; }
      .score-mid { background-color: #bfdbfe; }
      .score-low { background-color: #fef08a; }
      .score-poor { background-color: #fecaca; }
      .score-incompatible { background-color: #fecaca; font-weight: bold; }
      .trophy-icon { width: 12px; height: 12px; display: inline-block; }
      h1 { font-size: 24px; margin-bottom: 10px; }
      .legend { margin-top: 20px; font-size: 12px; }
      .legend-item { display: inline-block; margin-right: 15px; }
      .legend-box { display: inline-block; width: 20px; height: 15px; margin-right: 5px; vertical-align: middle; border: 1px solid #ccc; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(gridElement.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const getScoreClass = (score) => {
    if (score === 0) return 'bg-red-200 text-red-900'; // Incompatible (aromatic/non-aromatic mismatch)
    if (score >= 9) return 'bg-emerald-200 text-emerald-900'; // High ratings - green
    if (score >= 8) return 'bg-emerald-100 text-emerald-800';
    if (score >= 6) return 'bg-blue-200 text-blue-900'; // Mid-tier - blue
    if (score >= 5) return 'bg-blue-100 text-blue-800';
    if (score >= 3) return 'bg-yellow-200 text-yellow-900'; // Lower tier - yellow
    return 'bg-red-100 text-red-900'; // Very poor
  };

  if (!savedPairings || pipes.length === 0 || blends.length === 0) {
    return null;
  }

  return (
    <>
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Grid3X3 className="w-5 h-5" />
              Pairing Reference Grid
            </CardTitle>
            <p className="text-sm text-stone-600 mt-2">
              Quick reference chart showing all pipe and tobacco combinations
            </p>
          </div>
          {!showGrid ? (
            <Button
              onClick={generateGrid}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Show Grid
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  setRefreshing(true);
                  // Force recalculation by hiding and showing grid
                  setShowGrid(false);
                  await refetchPairings();
                  setTimeout(() => {
                    setShowGrid(true);
                    setRefreshing(false);
                  }, 100);
                }}
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="border-emerald-300 text-emerald-700"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700"
              >
                <Download className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700"
              >
                <Printer className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {showGrid && (
        <CardContent>
          <div ref={gridRef} className="overflow-x-auto print:overflow-visible">
            <h1 className="text-xl font-bold text-stone-800 mb-4 hidden print:block">
              Pipe & Tobacco Pairing Reference Grid
            </h1>
            <p className="text-sm text-stone-600 mb-4 hidden print:block">
              Generated: {new Date().toLocaleDateString()}
            </p>
            
            <table className="min-w-full border border-stone-300">
              <thead>
                <tr>
                  <th className="bg-stone-100 border border-stone-300 p-2 text-left sticky left-0 z-10">
                    Pipes ↓ / Blends →
                  </th>
                  {blends.map((blend, idx) => (
                    <th 
                      key={blend.id}
                      className="bg-blue-100 border border-stone-300 p-1 text-xs min-w-[60px] max-w-[80px]"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      <div className="py-2">
                        {idx + 1}. {blend.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipes.map((pipe, pipeIdx) => {
                  const pipePairing = savedPairings.pairings.find(p => p.pipe_id === pipe.id);
                  
                  return (
                    <tr key={pipe.id}>
                      <td className="bg-amber-100 border border-stone-300 p-2 font-semibold text-sm sticky left-0 z-10">
                        {pipeIdx + 1}. {pipe.name}
                        {pipe.focus && pipe.focus.length > 0 && (
                          <div className="text-xs font-normal text-amber-700 mt-0.5">
                            Focus: {pipe.focus.join(', ')}
                          </div>
                        )}
                      </td>
                      {blends.map(blend => {
                        // Always calculate score based on CURRENT pipe data
                        // This ensures the grid reflects optimization changes, focus updates, etc.
                        const displayScore = getDisplayScore(pipe, blend);
                        
                        // Find best score for this blend across all pipes (using current data)
                        const allScoresForBlend = pipes.map(p => getDisplayScore(p, blend));
                        const bestScore = Math.max(...allScoresForBlend);
                        const isBestPipe = displayScore === bestScore && displayScore >= 8.5;
                        
                        // Try to get AI reasoning if available
                        const match = pipePairing?.blend_matches?.find(m => m.blend_id === blend.id);

                        return (
                          <td 
                            key={blend.id}
                            className={`border border-stone-300 p-2 text-center font-semibold ${
                              getScoreClass(displayScore)
                            } cursor-pointer hover:opacity-80`}
                            title={match?.reasoning || 'Compatibility based on current pipe characteristics and focus'}
                            onClick={() => {
                              // Build reasoning that reflects current calculation
                              let reasoning = match?.reasoning || '';
                              if (!reasoning) {
                                reasoning = 'Score based on: ';
                                const reasons = [];
                                if (pipe.focus?.length > 0) {
                                  reasons.push(`pipe focus (${pipe.focus.join(', ')})`);
                                }
                                if (userProfile?.preferred_blend_types?.includes(blend.blend_type)) {
                                  reasons.push('user blend preference');
                                }
                                reasons.push('physical compatibility');
                                reasoning += reasons.join(', ');
                              }
                              setSelectedPairing({ pipe, blend, score: displayScore, reasoning });
                              setShareDialogOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {isBestPipe && <Trophy className="w-3 h-3 text-amber-600" />}
                              <span>{displayScore.toFixed(1)}</span>
                              <Share2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs">
              <p className="font-semibold mb-2">Legend:</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-emerald-200 border border-stone-300"></div>
                  <span>9-10 Excellent (Green)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-blue-200 border border-stone-300"></div>
                  <span>6-8 Good (Blue)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-yellow-200 border border-stone-300"></div>
                  <span>3-5 Average (Yellow)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-red-200 border border-stone-300"></div>
                  <span>0-2 Poor/Incompatible (Red)</span>
                </div>
              </div>
              <p className="mt-3 text-stone-600">
                Ratings based on chamber size, bowl characteristics, material compatibility, pipe focus, and traditional pairings.
                {userProfile && (
                  <span className="block mt-1 font-medium text-blue-700">
                    ✨ Scores adjusted based on your smoking profile preferences
                  </span>
                )}
              </p>
              <p className="mt-2 text-stone-500 italic">
                Hover over any score to see pairing reasoning
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              onClick={() => setShowGrid(false)}
              variant="outline"
              size="sm"
            >
              Hide Grid
            </Button>
          </div>
        </CardContent>
      )}

    </Card>

    {/* Share Pairing Dialog */}
    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Pairing
          </DialogTitle>
        </DialogHeader>
        {selectedPairing && (
          <PairingCard
            pipe={selectedPairing.pipe}
            blend={selectedPairing.blend}
            score={selectedPairing.score}
            reasoning={selectedPairing.reasoning}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}