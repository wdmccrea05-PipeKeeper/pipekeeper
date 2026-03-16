import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { getPipeVariantKey } from "@/components/utils/pipeVariants";
import { regeneratePairingsConsistent } from "@/components/utils/pairingRegeneration";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { filterAiEligibleItems } from "@/components/platform/aiEligibility";

export default function MatchingEngine({ pipe, blends = [], isPaidUser }) {
  const { t } = useTranslation();
  const [regenerating, setRegenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 10_000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  // Load active PairingMatrix (this is the single source of truth)
  const { data: activePairings, isLoading: pairingsLoading } = useQuery({
    queryKey: ["activePairings", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
  });

  const bowlOptions = useMemo(() => {
    const bowls = Array.isArray(pipe?.interchangeable_bowls) ? pipe.interchangeable_bowls : [];
    return bowls.map((b, i) => ({
      id: b.bowl_variant_id || `bowl_${i}`,
      name: b.name || `${t("matching.bowlVariant")} ${i + 1}`,
    }));
  }, [pipe, t]);

  const hasBowls = bowlOptions.length > 0;
  // If has bowls, default to first bowl. Otherwise default to main (null).
  const [activeBowlVariantId, setActiveBowlVariantId] = useState(() => 
    hasBowls && bowlOptions.length > 0 ? bowlOptions[0].id : null
  );

  const pairingEntry = useMemo(() => {
    const list = activePairings?.pairings || activePairings?.data?.pairings || [];
    const pid = String(pipe?.id ?? "");

    const normalizedBowlId =
      (!activeBowlVariantId || activeBowlVariantId === "main" || activeBowlVariantId === "null")
        ? null
        : activeBowlVariantId;

    // Try exact match
    let found =
      list.find((p) => String(p.pipe_id) === pid && ((p.bowl_variant_id || null) === normalizedBowlId)) || null;

    // Fallback for main pipe (some older records store bowl_variant_id weirdly)
    if (!found && !normalizedBowlId) {
      found = list.find((p) => String(p.pipe_id) === pid && (!p.bowl_variant_id || p.bowl_variant_id === "main" || p.bowl_variant_id === "null")) || null;
    }

    // Final fallback: match by name if needed
    if (!found) {
      const targetName = pipe?.name;
      found = list.find((p) => p.pipe_name === targetName) || null;
    }

    return found;
  }, [activePairings, pipe?.id, pipe?.name, activeBowlVariantId]);

  const top3 = useMemo(() => {
    const recs = pairingEntry?.recommendations || pairingEntry?.blend_matches || [];
    // CRITICAL: Always sort by score descending before slicing
    return [...recs]
      .filter((r) => (r.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
  }, [pairingEntry]);

  // Filter blends to AI-eligible only (exclude collection-only blends)
  const eligibleBlends = useMemo(() => {
    return filterAiEligibleItems(blends).filter(b => b.ai_excluded !== true);
  }, [blends]);

  const [selectedBlendId, setSelectedBlendId] = useState("");
  const selectedBlend = useMemo(() => eligibleBlends.find((b) => String(b.id) === String(selectedBlendId)) || null, [eligibleBlends, selectedBlendId]);

  const selectedBlendScore = useMemo(() => {
    if (!selectedBlend || !pairingEntry) return null;
    const recs = pairingEntry.recommendations || pairingEntry.blend_matches || [];

    const sid = String(selectedBlend.id);

    const hit = recs.find((r) =>
      String(r.tobacco_id ?? "") === sid ||
      String(r.blend_id ?? "") === sid ||
      String(r.id ?? "") === sid
    );

    return hit?.score ?? null;
  }, [pairingEntry, selectedBlend]);

  if (!isPaidUser) {
    return (
      <UpgradePrompt
        featureName={t("matching.aiTobaccoMatching")}
        description={t("matching.upgradeDesc")}
      />
    );
  }

  if (pairingsLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-stone-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  if (!pipe?.id) {
    return <div className="text-sm text-[#E0D8C8]/60">{t("errors.pipeNotAvailable")}</div>;
  }

  const normalizedBowlId = (!activeBowlVariantId || activeBowlVariantId === "main") ? null : activeBowlVariantId;
  const variantKey = getPipeVariantKey(pipe.id, normalizedBowlId);

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      const allPipes = queryClient.getQueryData(['pipes', user?.email]) || [];
      await regeneratePairingsConsistent({
        pipes: allPipes.length > 0 ? allPipes : [pipe],
        blends,
        profile: userProfile,
        user,
        queryClient,
        activePairings,
        skipIfUpToDate: true,
      });
      
      // FIX: After successful regeneration, invalidate and refetch pairings
      // so UI immediately reflects updated results without stale cache
      await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
      
      toast.success(t("matching.regenerateSuccess"));
    } catch (error) {
      toast.error(t("errors.regenerateFailed"));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="border-stone-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b" style={{ background: "rgba(40,28,20,0.6)", borderColor: "rgba(140,105,65,0.2)" }}>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{t("matching.recommendationsFor")}</div>
            <div className="text-xs text-[#E0D8C8]">{pipe.name}</div>
          </div>

          <div className="flex gap-2 items-start">
            <Button
              variant="outline"
              size="sm"
              onClick={regenPairings}
              disabled={regenerating}
              className="shrink-0 text-[#E0D8C8]"
            >
              {regenerating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {t("matching.regenerate")}
            </Button>
          </div>

          <div className="w-full md:w-64">
            <div className="text-xs font-semibold text-[#E0D8C8]/70 mb-1">{t("matching.bowlVariant")}</div>
            <Select
             value={activeBowlVariantId || ""}
             onValueChange={setActiveBowlVariantId}
             disabled={!hasBowls}
            >
             <SelectTrigger>
               <SelectValue placeholder={t("matching.selectBowl")} />
             </SelectTrigger>
             <SelectContent>
               {bowlOptions.map((b) => (
                 <SelectItem key={b.id} value={b.id}>
                   {b.name}
                 </SelectItem>
               ))}
             </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-bold text-white mb-2">{t("matching.top3Matches")}</div>
            {top3.length ? (
              <div className="flex flex-col gap-2">
                {top3.map((r, idx) => (
                  <div key={`${variantKey}-top-${idx}`} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#E0D8C8] truncate font-medium">{r.tobacco_name}</span>
                    <Badge className="bg-[#E0D8C8]/20 text-white font-semibold">{r.score ?? "—"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#E0D8C8]/60">{t("matching.noDataYet")}</div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E0D8C8]/20">
            <div className="text-xs font-semibold text-white mb-2">{t("matching.checkAnyBlend")}</div>
            <Select value={selectedBlendId} onValueChange={setSelectedBlendId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={t("matching.selectBlend")} />
              </SelectTrigger>
              <SelectContent>
                {eligibleBlends.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBlend ? (
               <div className="mt-2 flex items-center justify-between">
                 <span className="text-sm text-[#E0D8C8] truncate font-medium">{selectedBlend.name}</span>
                 <span className="text-sm text-white font-semibold">{selectedBlendScore ?? t("matching.noScore", {defaultValue: "—"})}</span>
               </div>
             ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}