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
  const [collapsed, setCollapsed] = useState(false);

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

      const existingBlends = blends.map(b => ({
        manufacturer: b.manufacturer?.toLowerCase() || '',
        name: b.name?.toLowerCase() || '',
        fullName: `${b.manufacturer || ''} ${b.name || ''}`.toLowerCase()
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

      const existingBlendsText = existingBlends.map(b => `- ${b.fullName}`).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco sommelier recommending NEW tobacco blends for purchase.

CRITICAL INSTRUCTION: The user ALREADY OWNS these blends - DO NOT RECOMMEND ANY OF THEM:
${existingBlendsText}

Your task: Recommend 3 COMPLETELY DIFFERENT tobacco blends (NOT in the list above) that would pair well with this pipe and that the user should BUY.

Pipe Details:
${JSON.stringify(pipeData, null, 2)}${profileContext}

${matchingStrategy}

Requirements for recommendations:
1. MUST NOT be any blend the user already owns (listed above)
2. MUST be real, commercially available tobacco blends
3. MUST match the pipe's characteristics and focus
4. SHOULD align with user preferences if provided

CRITICAL: Do NOT include any URLs, links, sources, or citations in your response. Provide only product names and descriptions.

For each of the 3 NEW blend recommendations, provide:
- manufacturer (the brand/company name)
- blend_name (the specific product name)
- score (1-10, compatibility with this pipe)
- reasoning (why this NEW blend would pair well with this pipe, no sources or links)`,
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

      // Filter out any recommendations that match existing blends
      const filteredMatches = (result.matches || []).filter(match => {
        const matchFullName = `${match.manufacturer || ''} ${match.blend_name || ''}`.toLowerCase().trim();
        const matchName = match.blend_name?.toLowerCase().trim() || '';
        const matchMfr = match.manufacturer?.toLowerCase().trim() || '';
        
        return !existingBlends.some(existing => {
          const existingName = existing.name.trim();
          const existingMfr = existing.manufacturer.trim();
          const existingFull = existing.fullName.trim();
          
          // Check for exact or very close matches only
          return (
            // Exact full name match
            matchFullName === existingFull ||
            // Exact blend name match with same manufacturer
            (matchName === existingName && matchMfr === existingMfr) ||
            // Very close match (>80% similarity) on full name
            (matchFullName && existingFull && matchFullName === existingFull)
          );
        });
      });

      setMatches(filteredMatches);
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
              <div className="flex gap-2">
                <Button
                  onClick={() => setCollapsed(!collapsed)}
                  variant="ghost"
                  size="sm"
                  className="text-violet-700"
                >
                  {collapsed ? 'Show' : 'Hide'}
                </Button>
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
            </div>
            {!collapsed && matches.map((match, idx) => (
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