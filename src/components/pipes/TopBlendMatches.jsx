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

      const existingBlends = blends.map(b => `${b.manufacturer} ${b.name}`).join(', ');

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
      
      const hasNonAromaticFocus = pipe.focus?.some(f => 
        f.toLowerCase().includes('non-aromatic') || f.toLowerCase().includes('non aromatic')
      );
      const hasAromaticFocus = pipe.focus?.some(f => 
        f.toLowerCase() === 'aromatic' && !f.toLowerCase().includes('non')
      );
      
      let matchingStrategy = '';
      if (hasNonAromaticFocus) {
        matchingStrategy = `CRITICAL: This pipe has NON-AROMATIC focus. COMPLETELY EXCLUDE all Aromatic blends from recommendations. Only recommend Virginia, English, Balkan, Latakia, Virginia/Perique, and other non-aromatic blend types.`;
      } else if (hasAromaticFocus) {
        matchingStrategy = `CRITICAL: This pipe has AROMATIC-ONLY focus. COMPLETELY EXCLUDE all non-aromatic blends (Virginia, English, Balkan, etc.). Only recommend Aromatic blend types.`;
      } else if (hasFocus) {
        matchingStrategy = `This pipe has a designated focus: ${pipe.focus.join(', ')}. Prioritize blends matching this focus, but also consider the pipe's physical characteristics.`;
      } else {
        matchingStrategy = `This pipe has NO designated focus. Base recommendations ENTIRELY on its physical characteristics: bowl size (${pipe.bowl_diameter_mm}mm × ${pipe.bowl_depth_mm}mm deep), chamber volume (${pipe.chamber_volume}), shape (${pipe.shape}), and material (${pipe.bowl_material}). Match these characteristics with blend types that smoke best in such pipes.`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco sommelier. Analyze this pipe and recommend the top 3 tobacco blends that the user should consider purchasing to pair with this pipe.

IMPORTANT: The user already owns these blends: ${existingBlends}
Do NOT recommend any blends they already own. Only suggest NEW blends they should buy.

Pipe:
${JSON.stringify(pipeData, null, 2)}${profileContext}

${matchingStrategy}

Recommend 3 specific real tobacco blends (include manufacturer and blend name) that:
1. Are NOT already in their collection
2. Match the pipe's characteristics and focus
3. Align with user preferences (if provided)
4. Are currently available for purchase

For each recommendation, provide:
- manufacturer (brand name)
- blend_name (specific product name)
- score (1-10, how well it matches)
- reasoning (why this blend pairs well with this pipe's characteristics and user preferences)`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  manufacturer: { type: "string" },
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
                Finding Recommendations...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Blend Recommendations
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-800">Recommended Blends to Try</span>
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
            {matches.map((match, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white border border-violet-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center shrink-0">
                      <span className="text-lg">🍂</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800">{match.manufacturer} - {match.blend_name}</p>
                      <p className="text-xs text-stone-600 mt-1">{match.reasoning}</p>
                    </div>
                  </div>
                  <Badge className={getScoreColor(match.score)}>
                    {match.score}/10
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}