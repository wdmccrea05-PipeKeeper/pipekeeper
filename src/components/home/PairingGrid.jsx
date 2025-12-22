import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, Grid3X3, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function PairingGrid({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const gridRef = useRef(null);

  const { data: savedPairings } = useQuery({
    queryKey: ['saved-pairings'],
    queryFn: async () => {
      const results = await base44.entities.PairingMatrix.list('-created_date', 1);
      return results[0];
    },
  });

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
    
    // PRIORITY 1: User Profile Preferences (highest weight: +2 points)
    if (userProfile) {
      if (userProfile.preferred_blend_types?.includes(blend.blend_type)) {
        adjustment += 2;
      }
      if (userProfile.strength_preference !== 'No Preference' && 
          blend.strength === userProfile.strength_preference) {
        adjustment += 1;
      }
      if (userProfile.pipe_size_preference !== 'No Preference' &&
          pipe.chamber_volume === userProfile.pipe_size_preference) {
        adjustment += 0.5;
      }
    }
    
    // PRIORITY 2: Pipe Focus (second highest: +1.5 points)
    if (pipe.focus && pipe.focus.length > 0) {
      const focusMatch = pipe.focus.some(f => 
        blend.blend_type?.toLowerCase().includes(f.toLowerCase()) ||
        f.toLowerCase().includes(blend.blend_type?.toLowerCase())
      );
      if (focusMatch) adjustment += 1.5;
    }
    
    // PRIORITY 3: Pipe shape/characteristics already factored into baseScore
    // No additional adjustment needed here as AI analysis handles this
    
    const adjustedScore = Math.min(10, baseScore + adjustment);
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
      .score-10 { background-color: #d1fae5; font-weight: bold; }
      .score-9 { background-color: #d1fae5; }
      .score-8 { background-color: #bbf7d0; }
      .score-7 { background-color: #bfdbfe; }
      .score-6 { background-color: #ddd6fe; }
      .score-5 { background-color: #fef08a; }
      .score-4 { background-color: #fed7aa; }
      .score-low { background-color: #fecaca; }
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
    if (score === 0) return 'bg-stone-200 text-stone-400'; // Incompatible
    if (score === 10) return 'bg-emerald-200 text-emerald-900';
    if (score === 9) return 'bg-emerald-100 text-emerald-900';
    if (score === 8) return 'bg-green-100 text-green-900';
    if (score === 7) return 'bg-blue-100 text-blue-900';
    if (score === 6) return 'bg-purple-100 text-purple-900';
    if (score === 5) return 'bg-yellow-100 text-yellow-900';
    if (score === 4) return 'bg-orange-100 text-orange-900';
    return 'bg-red-100 text-red-900'; // score < 4
  };

  if (!savedPairings || pipes.length === 0 || blends.length === 0) {
    return null;
  }

  return (
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
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
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
                        
                        return (
                          <td 
                            key={blend.id}
                            className={`border border-stone-300 p-2 text-center font-semibold ${
                              getScoreClass(displayScore)
                            }`}
                            title={match?.reasoning || 'Basic compatibility score'}
                          >
                            {displayScore.toFixed(1)}
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
                  <span>10-9 Perfect</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-green-200 border border-stone-300"></div>
                  <span>8 Excellent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-blue-200 border border-stone-300"></div>
                  <span>7 Very Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-purple-200 border border-stone-300"></div>
                  <span>6 Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-yellow-200 border border-stone-300"></div>
                  <span>5 Average</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-orange-200 border border-stone-300"></div>
                  <span>4 Fair</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 bg-red-200 border border-stone-300"></div>
                  <span>1-3 Poor</span>
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
  );
}