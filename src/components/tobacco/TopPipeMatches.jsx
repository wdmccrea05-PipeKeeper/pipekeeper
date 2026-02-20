import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { scorePipeBlend } from "@/components/utils/pairingScore";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TopPipeMatches({ blend, pipes }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

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

  const { data: collectionOptimization } = useQuery({
    queryKey: ['collection-optimization', user?.email],
    queryFn: async () => {
      const results = await base44.entities.CollectionOptimization.filter({ created_by: user?.email }, '-created_date', 1);
      return results[0];
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

    // ALWAYS calculate scores for ALL pipes against THIS specific blend
    // Don't rely on pre-computed top-10 which might exclude this blend
    const scoredPipes = pipes.map((pipe) => {
      const { score, why } = scorePipeBlend(
        { focus: pipe.focus || [], pipe_id: pipe.id, pipe_name: pipe.name, bowl_variant_id: null },
        {
          blend_type: blend?.blend_type,
          strength: blend?.strength,
          flavor_notes: blend?.flavor_notes,
          tobacco_components: blend?.tobacco_components,
          aromatic_intensity: blend?.aromatic_intensity,
          tobacco_name: blend?.name,
          tobacco_id: blend?.id,
        },
        userProfile
      );

      return { pipe, score, reasoning: why };
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

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 7) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  if (pipes.length === 0) return null;

  return (
    <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
      <CardContent className="p-4">
        {!matches || matches.length === 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8b3a3a]" />
              <span className="text-sm text-white font-bold">{t("topPipeMatches.findBestMatches")}</span>
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
                  {t("topPipeMatches.findMatches")}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8b3a3a]" />
                <span className="font-bold text-[#e8d5b7] text-base">{t("topPipeMatches.topPipeMatches")}</span>
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
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-[#8b3a3a]/30 hover:border-[#8b3a3a] hover:bg-[#8b3a3a]/15 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1a2c42] to-[#243548] border border-[#8b3a3a]/20 overflow-hidden flex items-center justify-center shrink-0">
                        {pipe.photos?.[0] ? (
                          <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PipeShapeIcon shape={pipe.shape} className="text-xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-white text-lg">#{displayIdx + 1}</span>
                          <span className="font-semibold text-white">{match.pipe_name}</span>
                          <Badge className={getScoreColor(match.match_score)}>
                            {match.match_score}/10
                          </Badge>
                        </div>
                        <p className="text-xs text-[#e8d5b7] leading-relaxed">{match.reasoning}</p>
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