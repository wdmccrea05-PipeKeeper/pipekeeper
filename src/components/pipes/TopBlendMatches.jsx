import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TopBlendMatches({ pipe, blends, userProfile }) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);

  const findMatches = async () => {
    if (blends.length === 0) return;

    setLoading(true);
    try {
      const pipeData = {
        name: pipe.name,
        maker: pipe.maker,
        shape: pipe.shape,
        bowl_material: pipe.bowl_material,
        chamber_volume: pipe.chamber_volume,
        bowl_diameter_mm: pipe.bowl_diameter_mm,
        bowl_depth_mm: pipe.bowl_depth_mm,
        focus: pipe.focus
      };

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
        profileContext = `\n\nUser Preferences:
- Clenching: ${userProfile.clenching_preference}
- Smoke Duration: ${userProfile.smoke_duration_preference}
- Preferred Blend Types: ${userProfile.preferred_blend_types?.join(', ') || 'None'}
- Pipe Size Preference: ${userProfile.pipe_size_preference}
- Strength Preference: ${userProfile.strength_preference}
- Additional Notes: ${userProfile.notes || 'None'}

Use these preferences to personalize recommendations. Prioritize blends that match their preferences.`;
      }

      const hasFocus = pipe.focus && pipe.focus.length > 0;
      const matchingStrategy = hasFocus 
        ? `This pipe has a designated focus: ${pipe.focus.join(', ')}. Prioritize blends matching this focus, but also consider the pipe's physical characteristics.`
        : `This pipe has NO designated focus. Base recommendations ENTIRELY on its physical characteristics: bowl size (${pipe.bowl_diameter_mm}mm × ${pipe.bowl_depth_mm}mm deep), chamber volume (${pipe.chamber_volume}), shape (${pipe.shape}), and material (${pipe.bowl_material}). Match these characteristics with blend types that smoke best in such pipes.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco sommelier. Analyze this pipe and recommend the top 3 tobacco blends from the user's collection that would pair best with it.

Pipe:
${JSON.stringify(pipeData, null, 2)}

Available Blends:
${JSON.stringify(blendsData, null, 2)}${profileContext}

${matchingStrategy}

Rate each blend and return ONLY the top 3 best matches. For each match, provide:
- blend_id
- blend_name
- score (1-10)
- reasoning (why this blend pairs well with this specific pipe's characteristics, considering user preferences if provided)`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
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
      });

      setMatches(result.matches || []);
    } catch (err) {
      console.error('Error finding matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 7) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  if (blends.length === 0) return null;

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardContent className="p-4">
        {!matches ? (
          <Button
            onClick={findMatches}
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Best Matches...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Best Tobacco Matches
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-800">Top Tobacco Matches</span>
              </div>
              <Button
                onClick={findMatches}
                disabled={loading}
                variant="ghost"
                size="sm"
                className="text-violet-700"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {matches.map((match, idx) => {
              const blend = blends.find(b => b.id === match.blend_id);
              return (
                <Link key={match.blend_id} to={createPageUrl(`TobaccoDetail?id=${match.blend_id}`)}>
                  <div className="p-3 rounded-lg bg-white border border-violet-200 hover:border-violet-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 overflow-hidden flex items-center justify-center shrink-0">
                          {blend?.photo ? (
                            <img 
                              src={blend.photo} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              onError={(e) => { 
                                e.target.style.display = 'none'; 
                                e.target.parentElement.innerHTML = '🍂'; 
                              }} 
                            />
                          ) : (
                            <span className="text-lg">🍂</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-800">{match.blend_name}</p>
                          <p className="text-xs text-stone-600 mt-1">{match.reasoning}</p>
                        </div>
                      </div>
                      <Badge className={getScoreColor(match.score)}>
                        {match.score}/10
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}