import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, Grid3X3, Printer, Trophy, RefreshCw, AlertTriangle, Undo } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";

export default function PairingGrid({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
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

  // Track pipes focus changes for auto-refresh
  const pipesFingerprint = React.useMemo(() => 
    JSON.stringify(pipes.map(p => ({ id: p.id, focus: p.focus }))),
    [pipes]
  );

  // Auto-refresh when pipes or blends change
  React.useEffect(() => {
    if (showGrid && user?.email) {
      refetchPairings();
    }
  }, [pipesFingerprint, blends.length, showGrid, user?.email, refetchPairings]);

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
    !!savedPairings?.input_fingerprint && 
    savedPairings.input_fingerprint !== currentFingerprint,
    [savedPairings, currentFingerprint]
  );

  // Show regen dialog when stale
  useEffect(() => {
    if (isStale && showGrid) {
      setShowRegenDialog(true);
    }
  }, [isStale, showGrid]);

  const regeneratePairingsMutation = useMutation({
    mutationFn: async () => {
      // Deactivate current
      if (savedPairings?.id) {
        await base44.entities.PairingMatrix.update(savedPairings.id, { is_active: false });
      }

      // Generate fresh pairings using same LLM logic
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

      const generatedPairings = result?.pairings || [];

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
      queryClient.invalidateQueries({ queryKey: ['saved-pairings'] });
      setShowRegenDialog(false);
    },
  });

  const undoPairingsMutation = useMutation({
    mutationFn: async () => {
      if (!savedPairings?.previous_active_id) {
        throw new Error('No previous version to undo to');
      }

      // Deactivate current
      await base44.entities.PairingMatrix.update(savedPairings.id, { is_active: false });

      // Reactivate previous
      await base44.entities.PairingMatrix.update(savedPairings.previous_active_id, { is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-pairings'] });
      setShowRegenDialog(false);
    },
  });

  const generateGrid = () => {
    if (!savedPairings) {
      alert('Please generate pairings from the AI Pairing Recommendations section first');
      return;
    }
    setShowGrid(true);
  };

  // Calculate adjusted scores with priority order:
  // 1. User profile preferences (highest weight)
  // 2. Pipe focus (with aromatic/non-aromatic exclusions)
  // 3. Pipe shape/characteristics
  // 4. Tobacco blend characteristics (already in base score)
  // Calculate basic compatibility score based on pipe and blend characteristics
  const calculateBasicScore = (pipe, blend) => {
    let score = 5; // Start with neutral score
    
    // Chamber size vs blend strength
    if (pipe.chamber_volume === 'Small' && blend.strength === 'Mild') score += 1;
    if (pipe.chamber_volume === 'Large' && (blend.strength === 'Full' || blend.strength === 'Medium-Full')) score += 1;
    if (pipe.chamber_volume === 'Medium' && blend.strength === 'Medium') score += 1;
    
    // Bowl material compatibility
    if (pipe.bowl_material === 'Meerschaum' && blend.blend_type === 'Virginia') score += 1;
    if (pipe.bowl_material === 'Briar') score += 0.5;
    
    // Shape considerations
    if (pipe.shape === 'Churchwarden' && blend.cut === 'Flake') score += 0.5;
    
    return Math.max(3, Math.min(7, score)); // Clamp between 3-7 for basic scores
  };

  const getAdjustedScore = (pipe, blend, baseScore) => {
    if (!baseScore) return calculateBasicScore(pipe, blend);
    
    // CRITICAL: Aromatic/Non-Aromatic Exclusions
    const hasNonAromaticFocus = pipe.focus?.some(f => 
      f.toLowerCase().includes('non-aromatic') || f.toLowerCase().includes('non aromatic')
    );
    const hasAromaticFocus = pipe.focus?.some(f => 
      f.toLowerCase() === 'aromatic' && !f.toLowerCase().includes('non')
    );
    
    const isAromaticBlend = blend.blend_type?.toLowerCase() === 'aromatic';
    
    // If pipe has non-aromatic focus and blend is aromatic, return 0
    if (hasNonAromaticFocus && isAromaticBlend) return 0;
    
    // If pipe has aromatic focus and blend is not aromatic, return 0
    if (hasAromaticFocus && !isAromaticBlend) return 0;
    
    let adjustment = 0;
    
    // PRIORITY 1: Pipe Focus/Specialization (HIGHEST weight: +5 points for exact match)
    if (pipe.focus && pipe.focus.length > 0) {
      const focusMatch = pipe.focus.some(f => {
        const focusLower = f.toLowerCase();
        const blendTypeLower = blend.blend_type?.toLowerCase() || '';
        const blendNameLower = blend.name?.toLowerCase() || '';
        const blendComponents = blend.tobacco_components || [];
        
        // Check blend type match
        if (blendTypeLower.includes(focusLower) || focusLower.includes(blendTypeLower)) {
          return true;
        }
        
        // Check blend name match
        if (blendNameLower.includes(focusLower) || focusLower.includes(blendNameLower)) {
          return true;
        }
        
        // Check tobacco components match
        if (blendComponents.some(comp => {
          const compLower = comp.toLowerCase();
          return compLower.includes(focusLower) || focusLower.includes(compLower);
        })) {
          return true;
        }
        
        return false;
      });
      if (focusMatch) {
        adjustment += 5; // Strong bonus for specialized pipes matching their focus
      } else {
        // Penalize non-matching blends for specialized pipes
        adjustment -= 2;
      }
    }
    
    // PRIORITY 2: User Profile Preferences (second highest: +2.5 points total)
    if (userProfile) {
      if (userProfile.preferred_blend_types?.includes(blend.blend_type)) {
        adjustment += 2;
      }
      if (userProfile.strength_preference !== 'No Preference' && 
          blend.strength === userProfile.strength_preference) {
        adjustment += 1.5; // Increased from 1
      }
      if (userProfile.pipe_size_preference !== 'No Preference' &&
          pipe.chamber_volume === userProfile.pipe_size_preference) {
        adjustment += 0.5;
      }
    }
    
    // PRIORITY 3: Pipe shape/characteristics already factored into baseScore
    // No additional adjustment needed here as AI analysis handles this
    
    const adjustedScore = Math.max(0, Math.min(10, baseScore + adjustment));
    return Math.round(adjustedScore * 10) / 10;
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
      {/* Staleness Dialog */}
      <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Pairing Grid Out of Date
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
              onClick={() => regeneratePairingsMutation.mutate()}
              disabled={regeneratePairingsMutation.isPending}
              className="bg-amber-700 hover:bg-amber-800"
            >
              {regeneratePairingsMutation.isPending ? (
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
                        const match = pipePairing?.blend_matches?.find(m => m.blend_id === blend.id);
                        let baseScore = match?.score || 0;
                        
                        // If no score exists, calculate a basic compatibility score
                        if (baseScore === 0) {
                          baseScore = calculateBasicScore(pipe, blend);
                        }
                        
                        const adjustedScore = getAdjustedScore(pipe, blend, baseScore);
                        const displayScore = userProfile ? adjustedScore : baseScore;
                        
                        // Find best score for this blend across all pipes
                        const allScoresForBlend = pipes.map(p => {
                          const pPairing = savedPairings.pairings.find(pp => pp.pipe_id === p.id);
                          const m = pPairing?.blend_matches?.find(mm => mm.blend_id === blend.id);
                          let bs = m?.score || 0;
                          if (bs === 0) bs = calculateBasicScore(p, blend);
                          const as = getAdjustedScore(p, blend, bs);
                          return userProfile ? as : bs;
                        });
                        const bestScore = Math.max(...allScoresForBlend);
                        const isBestPipe = displayScore === bestScore && displayScore >= 8.5;
                        
                        return (
                          <td 
                            key={blend.id}
                            className={`border border-stone-300 p-2 text-center font-semibold ${
                              getScoreClass(displayScore)
                            }`}
                            title={match?.reasoning || 'Basic compatibility score'}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {isBestPipe && <Trophy className="w-3 h-3 text-amber-600" />}
                              <span>{displayScore.toFixed(1)}</span>
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

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
          }
          table, table * {
            visibility: visible;
          }
          table {
            position: absolute;
            left: 0;
            top: 0;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </Card>
    </>
  );
}