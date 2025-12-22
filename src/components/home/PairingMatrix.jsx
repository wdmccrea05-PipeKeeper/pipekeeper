import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";

export default function PairingMatrix({ pipes, blends }) {
  const [loading, setLoading] = useState(false);
  const [pairings, setPairings] = useState(null);
  const [selectedPipe, setSelectedPipe] = useState(null);

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
        bowl_depth_mm: p.bowl_depth_mm
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

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco sommelier. Analyze these pipes and tobacco blends to create optimal pairings.

Pipes:
${JSON.stringify(pipesData, null, 2)}

Tobacco Blends:
${JSON.stringify(blendsData, null, 2)}

For each pipe, evaluate which tobacco blends would pair well based on:
1. Bowl size - smaller bowls suit lighter tobaccos, larger bowls handle fuller blends
2. Bowl depth - affects burn time and flavor development
3. Material - meerschaum is excellent for Virginias, briar for everything
4. Chamber volume - impacts how tobacco characteristics develop
5. Shape - affects smoke temperature and moisture

Rate each pairing on a scale of 1-10 where:
- 10 = Perfect pairing, optimal characteristics match
- 7-9 = Excellent pairing, very compatible
- 4-6 = Good pairing, will work well
- 1-3 = Poor pairing, not recommended

For each pipe, return ALL blend pairings with scores and brief reasoning.`,
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

      setPairings(result.pairings || []);
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

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-violet-800">
              <Sparkles className="w-5 h-5" />
              AI Pairing Recommendations
            </CardTitle>
            <CardDescription className="mt-2">
              Find the perfect tobacco blend for each pipe in your collection
            </CardDescription>
          </div>
          {!pairings && (
            <Button
              onClick={generatePairings}
              disabled={loading}
              className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Pairings
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {pairings && (
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
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center">
                            {pipe?.photos?.[0] ? (
                              <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <PipeShapeIcon shape={pipe?.shape} className="text-xl" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link to={createPageUrl(`PipeDetail?id=${pipe?.id}`)}>
                                <h4 className="font-semibold text-stone-800 hover:text-amber-700 transition-colors">
                                  {pipePairing.pipe_name}
                                </h4>
                              </Link>
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
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 overflow-hidden flex items-center justify-center shrink-0">
                                          {blend?.photo ? (
                                            <img src={blend.photo} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <span className="text-lg">🍂</span>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <Link to={createPageUrl(`TobaccoDetail?id=${blend?.id}`)}>
                                              <p className="font-medium text-stone-800 hover:text-amber-700 transition-colors">
                                                {match.blend_name}
                                              </p>
                                            </Link>
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

          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => { setPairings(null); setSelectedPipe(null); }}
              variant="outline"
              size="sm"
            >
              Regenerate Pairings
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}