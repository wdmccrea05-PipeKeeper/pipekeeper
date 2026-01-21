import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";

// Simple string similarity function (Levenshtein-based)
const stringSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.includes(shorter)) return 0.9;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
};

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
        prompt: `You are an expert pipe tobacco advisor helping an adult user manage their personal collection.

CRITICAL INSTRUCTION: The user ALREADY OWNS these blends - DO NOT RECOMMEND ANY OF THEM:
${existingBlendsText}

Your task: Recommend 3 OPTIONAL tobacco blends the user could consider as future collection additions (do NOT mention buying, pricing, retailers, or purchase steps).

Pipe Details:
${JSON.stringify(pipeData, null, 2)}${profileContext}

${matchingStrategy}

Requirements for recommendations:
1. MUST NOT be any blend the user already owns (listed above)
2. MUST be real, commercially available tobacco blends
3. MUST match the pipe's characteristics and focus
4. SHOULD align with user preferences if provided

CRITICAL: Do NOT include any URLs, links, sources, or citations in your response.

For each of the 3 recommendations, provide:
- manufacturer (the brand/company name)
- blend_name (the specific product name)
- score (1-10, compatibility with this pipe)
- reasoning (why this blend pairs well with this pipe; no sources or links)`,
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
          
          // Check for exact or very close matches
          const fullNameSimilarity = stringSimilarity(matchFullName, existingFull);
          const nameSimilarity = stringSimilarity(matchName, existingName);
          
          return (
            // Exact full name match
            matchFullName === existingFull ||
            // Exact blend name match with same manufacturer
            (matchName === existingName && matchMfr === existingMfr) ||
            // Very close match (>80% similarity) on full name
            fullNameSimilarity > 0.8 ||
            // Very close match (>85% similarity) on blend name alone
            nameSimilarity > 0.85
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
    <Card className="border-[#A35C5C]/30 bg-[#223447]">
      <CardContent className="p-4">
        {!matches ? (
          <Button
            onClick={findMatches}
            disabled={loading}
            className="w-full bg-[#A35C5C] hover:bg-[#8B4A4A]"
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
                <Sparkles className="w-4 h-4 text-[#D1A75D]" />
                <span className="text-sm font-medium text-[#E0D8C8]">Recommended Blends to Try</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCollapsed(!collapsed)}
                  variant="ghost"
                  size="sm"
                  className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
                >
                  {collapsed ? 'Show' : 'Hide'}
                </Button>
                <Button
                  onClick={findMatches}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                  className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {!collapsed && matches.map((match, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[#1A2B3A] border border-[#E0D8C8]/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                   <div className="w-10 h-10 rounded-lg bg-[#223447] flex items-center justify-center shrink-0 p-1 border border-[#E0D8C8]/10">
                      {(() => {
                        const blend = blends.find(b => 
                          b.manufacturer?.toLowerCase() === match.manufacturer?.toLowerCase() &&
                          b.name?.toLowerCase() === match.blend_name?.toLowerCase()
                        );
                        return blend?.logo ? (
                          <img src={blend.logo} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-lg">🍂</span>
                        );
                      })()}
                    </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-medium text-[#E0D8C8]">{match.manufacturer} - {match.blend_name}</p>
                       <p className="text-xs text-[#E0D8C8]/70 mt-1">{match.reasoning}</p>
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