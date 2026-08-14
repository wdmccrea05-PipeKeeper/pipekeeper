import React, { useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { trackedInvokeLLM } from '@/lib/integrationTelemetry';
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { filterAiEligibleItems } from "@/components/platform/aiEligibility";
import {
  scorePipeBlend,
  normalizePipeForPairing,
} from "@/components/utils/pairingScoreCanonical";
import { sanitizeAiDiscoveryMatches } from "@/components/utils/discoveryMatches";

// Simple string similarity heuristic used to de-duplicate AI suggestions
const stringSimilarity = (str1, str2) => {
  const s1 = String(str1 || '').toLowerCase().trim();
  const s2 = String(str2 || '').toLowerCase().trim();

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

/**
 * Structured, canonical description of the pipe used as LLM context.
 * The LLM receives the normalized pairing profile, never the raw record.
 */
export function buildPipeProfileContext(pipe) {
  const p = normalizePipeForPairing(pipe);
  const lines = [
    `Dedication: ${p.dedicationType} (${p.dedicationStrength})`,
    `Chamber diameter: ${p.chamberDiameterMm ? `${p.chamberDiameterMm}mm` : 'unknown'}`,
    `Chamber depth: ${p.chamberDepthMm ? `${p.chamberDepthMm}mm` : 'unknown'}`,
    `Chamber width category: ${p.chamberWidthCategory || 'unknown'}`,
    `Chamber depth category: ${p.chamberDepthCategory || 'unknown'}`,
    `Chamber volume: ${p.chamberVolume || 'unknown'}`,
    `Bowl material: ${p.bowlMaterial}`,
    `Smoking character: ${p.smokingCharacter || 'unknown'}`,
    `Draw: ${p.drawCharacter || 'unknown'}`,
    `Data confidence: ${p.confidence}`,
  ];
  if (p.exactBlendFocus.length) {
    lines.push(`Named blend focus: ${p.exactBlendFocus.join(', ')}`);
  }
  return lines.join('\n');
}

export default function TopBlendMatches({ pipe, blends, userProfile }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [aiMatches, setAiMatches] = useState(null);
  const [showAi, setShowAi] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ── Deterministic canonical scoring across the user's own collection ──
  const collectionMatches = useMemo(() => {
    const eligible = filterAiEligibleItems(blends || []);
    return eligible
      .map((blend) => {
        const { score, why, confidence } = scorePipeBlend(pipe, blend, userProfile);
        return {
          id: blend.id,
          manufacturer: blend.manufacturer,
          blend_name: blend.name,
          logo: blend.logo,
          score,
          canonicalScore: score,
          confidence,
          reasoning: why,
        };
      })
      .sort((a, b) =>
        (b.score || 0) - (a.score || 0) ||
        String(a.blend_name || '').localeCompare(String(b.blend_name || ''))
      )
      .slice(0, 3);
  }, [pipe, blends, userProfile]);

  const findAiSuggestions = async () => {
    setLoading(true);
    setShowAi(true);
    try {
      const existingBlends = (blends || []).map(b => ({
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

Use these preferences to personalize recommendations.`;
      }

      const existingBlendsText = existingBlends.map(b => `- ${b.fullName}`).join('\n');

      const result = await trackedInvokeLLM({
        prompt: `You are an expert pipe tobacco advisor helping an adult user manage their personal collection.

CRITICAL INSTRUCTION: The user ALREADY OWNS these blends - DO NOT RECOMMEND ANY OF THEM:
${existingBlendsText}

Your task: Recommend 3 OPTIONAL tobacco blends the user could consider as future collection additions (do NOT mention buying, pricing, retailers, or purchase steps).

Normalized pipe compatibility profile (derived by PipeKeeper's pairing model):
${buildPipeProfileContext(pipe)}${profileContext}

Pairing rules to respect:
1. Dedication drives ghosting risk: never recommend aromatic blends for an English/Latakia-dedicated pipe, and never recommend Latakia blends for an aromatic-dedicated pipe.
2. Narrow, deep chambers favour Virginia and Virginia/Perique flakes.
3. Medium-to-wide chambers favour complex English/Balkan mixtures and topped aromatics.
4. Heavily topped aromatics smoke wet in very small chambers.

Requirements for recommendations:
1. MUST NOT be any blend the user already owns (listed above)
2. MUST be real, commercially available tobacco blends
3. MUST match the pipe's dedication and chamber geometry
4. SHOULD align with user preferences if provided

CRITICAL: Do NOT include any URLs, links, sources, or citations in your response.

For each of the 3 recommendations, provide:
- manufacturer (the brand/company name)
- blend_name (the specific product name)
- estimated_suitability (one of: promising, possible, uncertain)
- metadata_confidence (one of: sufficient metadata, partial metadata, insufficient metadata)
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
                  estimated_suitability: { type: "string" },
                  metadata_confidence: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      }, { feature: 'pipe.top_blend_matches', module: 'pipekeeper' });

      // Filter out any recommendations that duplicate owned blends
      const filteredMatches = (result?.matches || []).filter(match => {
        const matchFullName = `${match.manufacturer || ''} ${match.blend_name || ''}`.toLowerCase().trim();
        const matchName = match.blend_name?.toLowerCase().trim() || '';
        const matchMfr = match.manufacturer?.toLowerCase().trim() || '';

        return !existingBlends.some(existing => {
          const existingName = existing.name.trim();
          const existingMfr = existing.manufacturer.trim();
          const existingFull = existing.fullName.trim();

          const fullNameSimilarity = stringSimilarity(matchFullName, existingFull);
          const nameSimilarity = stringSimilarity(matchName, existingName);

          return (
            matchFullName === existingFull ||
            (matchName === existingName && matchMfr === existingMfr) ||
            fullNameSimilarity > 0.8 ||
            nameSimilarity > 0.85
          );
        });
      });

      setAiMatches(sanitizeAiDiscoveryMatches(filteredMatches));
    } catch (err) {
      console.error('Error finding matches:', err);
      setAiMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 7) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const getDiscoveryBadge = (match) => {
    if (match.canonicalScore != null) {
      return {
        text: `${match.canonicalScore}/10`,
        className: getScoreColor(match.canonicalScore),
      };
    }

    const suitability = String(match.estimatedSuitability || 'promising').toLowerCase();
    if (suitability === 'possible') {
      return { text: 'Possible', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (suitability === 'uncertain') {
      return { text: 'Uncertain', className: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
    return { text: 'Promising', className: 'bg-green-100 text-green-800 border-green-300' };
  };

  const renderRow = (match, idx, logo) => {
    const badge = getDiscoveryBadge(match);
    return (
    <div key={`${match.manufacturer}-${match.blend_name}-${idx}`} className="p-3 rounded-lg bg-[#1A2B3A] border border-[#E0D8C8]/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-[#223447] flex items-center justify-center shrink-0 p-1 border border-[#E0D8C8]/10">
            {logo ? (
              <img src={logo} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-lg">🍂</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#E0D8C8]">{match.manufacturer} - {match.blend_name}</p>
            <p className="text-xs text-[#E0D8C8]/70 mt-1">{match.reasoning}</p>
            {match.canonicalScore == null ? (
              <p className="text-[11px] text-[#E0D8C8]/55 mt-1">
                AI discovery only — canonical score unavailable with current metadata.
              </p>
            ) : null}
          </div>
        </div>
        <Badge className={badge.className}>
          {badge.text}
        </Badge>
      </div>
    </div>
  )};

  return (
    <Card className="border-[#A35C5C]/30 bg-[#223447]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D1A75D]" />
            <span className="text-sm font-medium text-[#E0D8C8]">{t("topBlendMatches.top3Matches")}</span>
          </div>
          <Button
            onClick={() => setCollapsed(!collapsed)}
            variant="ghost"
            size="sm"
            className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
          >
            {collapsed ? t("topBlendMatches.show") : t("topBlendMatches.hide")}
          </Button>
        </div>

        {!collapsed && (
          <div className="space-y-3">
            {collectionMatches.length === 0 ? (
              <p className="text-xs text-[#E0D8C8]/70">
                {t("topBlendMatches.noCollectionMatches")}
              </p>
            ) : (
              collectionMatches.map((match, idx) => renderRow(match, idx, match.logo))
            )}

            <div className="pt-1">
              {!showAi ? (
                <Button
                  onClick={findAiSuggestions}
                  disabled={loading}
                  className="w-full bg-[#A35C5C] hover:bg-[#8B4A4A]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("topBlendMatches.findingMatches")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t("topBlendMatches.suggestNew")}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#E0D8C8]/70">
                      {t("topBlendMatches.outsideCollection")}
                    </span>
                    <Button
                      onClick={findAiSuggestions}
                      disabled={loading}
                      variant="ghost"
                      size="sm"
                      className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs text-[#E0D8C8]/70">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("topBlendMatches.findingMatches")}
                    </div>
                  ) : (
                    (aiMatches || []).map((match, idx) => renderRow(match, idx, null))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}