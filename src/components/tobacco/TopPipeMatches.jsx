import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { scorePipeBlend } from "@/components/utils/pairingScoreCanonical";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { filterAiEligibleItems } from "@/components/platform/aiEligibility";

export default function TopPipeMatches({ blend, pipes }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const { user } = useCurrentUser();

  const { data: savedPairings } = useQuery({
    // Use the same cache key as PairingGrid / AI panel so refresh/regenerate stay in sync
    queryKey: ['activePairings', user?.email],
    queryFn: async () => {
      // Load active first, fallback to latest (same as PairingGrid)
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

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Track changes that should trigger auto-refresh
  const pipesFocusFingerprint = React.useMemo(() => 
    JSON.stringify(pipes.map(p => ({ id: p.id, focus: p.focus }))),
    [pipes]
  );

  // Auto-trigger matching when blend is first loaded or when data changes
  useEffect(() => {
    if (blend && pipes.length > 0) {
      updateMatchesFromData();
    }
  }, [blend?.id, pipes.length, savedPairings?.pairings, userProfile?.id]);



  const updateMatchesFromData = () => {
    if (!blend) return;

    // Filter to AI-eligible pipes only
    const eligiblePipes = filterAiEligibleItems(pipes);

    // ALWAYS calculate scores for ALL eligible pipes against THIS specific blend
    // Don't rely on pre-computed top-10 which might exclude this blend
    const scoredPipes = eligiblePipes.map((pipe) => {
      const { score, why, confidence } = scorePipeBlend(
        { ...pipe, pipe_id: pipe.id, pipe_name: pipe.name, bowl_variant_id: null, focus: pipe.focus || [] },
        { ...blend, tobacco_name: blend?.name, tobacco_id: blend?.id },
        userProfile
      );

      return { pipe, score, reasoning: why, confidence };
    });

    const filtered = scoredPipes.filter(m => m.score > 0).sort((a, b) => b.score - a.score);

    const topThree = filtered.slice(0, 3).map(m => ({
      pipe_id: m.pipe.id,
      pipe_name: m.pipe.name,
      match_score: m.score,
      reasoning: m.reasoning
    }));

    setMatches(topThree);
  };

  const findMatches = async () => {
    if (pipes.length === 0) return;

    // If we have pairing data, use it immediately
    if (savedPairings?.pairings) {
      updateMatchesFromData();
      return;
    }

    // No pairing data exists - trigger regeneration and use fallback scoring
    setLoading(true);
    updateMatchesFromData(); // Use fallback scoring while regenerating
    setLoading(false);
  };

  const getScoreStyle = (score) => {
    if (score >= 9) return { background: "rgba(60,100,60,0.4)", color: "rgba(140,220,140,0.9)", borderColor: "rgba(80,140,80,0.4)" };
    if (score >= 7) return { background: "rgba(140,105,65,0.3)", color: "rgba(220,180,100,0.9)", borderColor: "rgba(140,105,65,0.5)" };
    return { background: "rgba(100,70,40,0.3)", color: "rgba(200,160,100,0.85)", borderColor: "rgba(120,85,50,0.4)" };
  };

  if (pipes.length === 0) return null;

  return (
    <Card style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
    }}>
      <CardContent className="p-4">
        {!matches || matches.length === 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "rgba(180,140,75,0.9)" }} />
              <span className="text-sm font-bold" style={{ color: "#F5F1E7" }}>{t("topPipeMatches.findBestMatches", "Find Best Matches")}</span>
            </div>
            <Button
              size="sm"
              onClick={findMatches}
              disabled={loading}
              className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] hover:from-[#6d2e2e] hover:to-[#5a2525]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t("aiIdentifier.analyzing")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  {t("topPipeMatches.findMatches", "Find Matches")}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: "rgba(180,140,75,0.9)" }} />
                <span className="font-bold text-base" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>{t("topPipeMatches.topPipeMatches", "Top Pipe Matches")}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setCollapsed(!collapsed)}
                className="text-[#e8d5b7] hover:text-[#e8d5b7] hover:bg-[#8b3a3a]/20"
              >
                {collapsed ? t("breakInSchedule.show") : t("breakInSchedule.hide")}
              </Button>
            </div>

            {!collapsed && (
              <div className="space-y-2">
              {matches.map((match, displayIdx) => {
                const pipe = pipes.find(p =>
                  String(p.id) === String(match.pipe_id)
                );
                if (!pipe) return null;

                return (
                  <a key={match.pipe_id} href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                    <div className="flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer" style={{
                    background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                    border: "1px solid rgba(140,105,65,0.25)"
                  }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{
                        background: "linear-gradient(135deg, rgba(50,40,30,0.5), rgba(40,30,20,0.7))",
                        border: "1px solid rgba(140,105,65,0.2)"
                      }}>
                        {pipe.photos?.[0] ? (
                          <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PipeShapeIcon shape={pipe.shape} className="text-xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-lg" style={{ color: "rgba(180,140,75,0.9)" }}>#{displayIdx + 1}</span>
                          <span className="font-semibold" style={{ color: "#F5F1E7" }}>{match.pipe_name}</span>
                          <Badge style={getScoreStyle(match.match_score)}>
                            {match.match_score}/10
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(224,216,200,0.75)" }}>{match.reasoning}</p>
                      </div>
                    </div>
                  </a>
                );
              })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}