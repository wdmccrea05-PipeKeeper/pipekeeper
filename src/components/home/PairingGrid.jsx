import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { expandPipesToVariants, getPipeVariantKey, getVariantFromPipe } from "@/components/utils/pipeVariants";
import { toast } from "sonner";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI } from "@/components/utils/aiGenerators";
import { regeneratePairingsConsistent } from "@/components/utils/pairingRegeneration";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { scorePipeBlend } from "@/components/utils/pairingScore";
import { isAppleBuild } from "@/components/utils/appVariant";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useTranslation } from "react-i18next";

export default function PairingGrid({ user, pipes, blends, profile }) {
  if (isAppleBuild) return null;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasAutoRegenerated, setHasAutoRegenerated] = useState(false);

  // Fallback to fetch pipes if not provided
  const { data: fetchedPipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => (await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email && !pipes,
  });

  const { data: fetchedBlends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ["tobaccos", user?.email],
    queryFn: async () => (await base44.entities.TobaccoBlend.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email && !blends,
  });

  const allPipes = pipes || fetchedPipes;
  const allBlends = blends || fetchedBlends;

  // ✅ Pairings in your app are stored in PairingMatrix (not AIArtifact)
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

  // Auto-regenerate on first load if no pairings exist and data is ready
  React.useEffect(() => {
    if (!hasAutoRegenerated && !regenerating && allPipes.length > 0 && allBlends.length > 0 && user?.email && 
        (!activePairings || (activePairings?.pairings?.length === 0))) {
      setHasAutoRegenerated(true);
      regenPairings();
    }
  }, [user?.email, allPipes.length, allBlends.length, activePairings, hasAutoRegenerated, regenerating]);

  const pairingsByVariant = useMemo(() => {
    const keyOf = (pipe_id, bowl_variant_id) =>
      `${String(pipe_id)}::${bowl_variant_id ? String(bowl_variant_id) : "main"}`;

    const map = new Map();
    const list = activePairings?.pairings || activePairings?.data?.pairings || [];
    (Array.isArray(list) ? list : []).forEach((p) => {
      if (!p) return;
      try {
        const key = keyOf(p.pipe_id, p.bowl_variant_id);
        map.set(key, p);
      } catch (e) {
        console.error('Failed to process pairing:', p, e);
      }
    });
    return map;
  }, [activePairings]);

  // ✅ Expand pipes to bowl variants (each bowl becomes a row)
  const pipeVariants = useMemo(() => {
    try {
      return expandPipesToVariants(allPipes || [], { includeMainWhenBowls: false });
    } catch (e) {
      console.error('expandPipesToVariants error:', e);
      return [];
    }
  }, [allPipes]);

  const rows = useMemo(() => {
    const keyOf = (pipe_id, bowl_variant_id) =>
      `${String(pipe_id)}::${bowl_variant_id ? String(bowl_variant_id) : "main"}`;

    return (pipeVariants || []).map((pv) => {
      try {
        const pipe = (allPipes || []).find((p) => p && String(p.id) === String(pv.id));
        const variant = pipe ? getVariantFromPipe(pipe, pv.bowl_variant_id || null) : null;
        
        // Lookup using ONLY pipe_id + bowl_variant_id
        const tileKey = keyOf(pv.id, pv.bowl_variant_id || null);
        const pairing = pairingsByVariant.get(tileKey);

        return {
          key: tileKey,
          pipe_id: pv.id,
          bowl_variant_id: pv.bowl_variant_id || null,
          name: variant?.variant_name || pv.variant_name || pv.name || 'Unknown',
          focus: Array.isArray(variant?.focus) ? variant.focus : [],
          chamber_volume: variant?.chamber_volume,
          bowl_diameter_mm: variant?.bowl_diameter_mm,
          bowl_depth_mm: variant?.bowl_depth_mm,
          recommendations: pairing?.recommendations || pairing?.blend_matches || [],
        };
      } catch (e) {
        console.error('Row mapping error for pipe variant:', pv, e);
        return {
          key: `error-${pv.id}`,
          pipe_id: pv.id,
          bowl_variant_id: null,
          name: 'Error loading variant',
          focus: [],
          recommendations: [],
        };
      }
    }).sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [pipeVariants, allPipes, pairingsByVariant]);

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      if (!allPipes?.length || !allBlends?.length) {
        toast.error(t("errors.noPipesOrBlends"));
        return;
      }
      const result = await regeneratePairingsConsistent({
        pipes: allPipes,
        blends: allBlends,
        profile,
        user,
        queryClient,
        activePairings,
        skipIfUpToDate: true,
      });

      if (result?.skipped) {
        toast.success(t("pairingGrid.alreadyUpToDate"));
      } else {
        toast.success(t("pairingGrid.regenerateSuccess"));
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error(t("errors.regenerateFailed"));
    } finally {
      setRegenerating(false);
    }
  };

  if (pipesLoading || pairingsLoading || blendsLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#E0D8C8]/60">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t("pairingGrid.loading")}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{t("pairingGrid.title")}</CardTitle>
              <InfoTooltip text={t("pairingGrid.tooltipText")} />
            </div>
            <CardDescription>{t("pairingGrid.subtitle")}</CardDescription>
            </div>
            <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-white hover:text-white hover:bg-[#A35C5C]/30"
            >
              {collapsed ? t("tobacconist.show") : t("tobacconist.hide")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={regenPairings}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {t("pairingGrid.refresh")}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <div className="text-sm text-[#E0D8C8]/60">{t("pairingGrid.noPipes")}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {rows.map((r) => (
                <PipeCard key={r.key} row={r} allBlends={allBlends} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function PipeCard({ row, allBlends }) {
  const { t } = useTranslation();
  const [selectedBlendId, setSelectedBlendId] = useState("");
  const [calculatedScore, setCalculatedScore] = useState(null);
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Top matches: use artifact recommendations when present, otherwise compute locally
  const topMatches = useMemo(() => {
    const recs = (row.recommendations || []).filter(r => (r.score ?? 0) > 0);
    if (recs.length) {
      return [...recs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3);
    }

    // Fallback: compute scores locally (fast, consistent)
    const scored = (allBlends || []).map((b) => {
      const { score } = scorePipeBlend(
        { 
          pipe_id: row.pipe_id, 
          pipe_name: row.name, 
          bowl_variant_id: row.bowl_variant_id,
          focus: row.focus || [] 
        },
        {
          tobacco_id: String(b.id),
          tobacco_name: b.name,
          blend_type: b.blend_type,
          strength: b.strength,
          flavor_notes: b.flavor_notes,
          tobacco_components: b.tobacco_components,
          aromatic_intensity: b.aromatic_intensity,
        },
        userProfile
      );
      return { tobacco_id: String(b.id), tobacco_name: b.name, score };
    });
    return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [row, allBlends, userProfile]);

  const selectedBlendScore = useMemo(() => {
    if (!selectedBlendId) return calculatedScore;

    const sid = String(selectedBlendId);

    // ✅ Normalize ids to strings to avoid "number vs string" misses
    const match = row.recommendations?.find((r) => {
      const rid = r?.tobacco_id ?? r?.blend_id ?? r?.id ?? null;
      return rid != null && String(rid) === sid;
    });

    // If we have a match but the score is 0, recompute locally.
    // This prevents stale/incorrect AI zeros from "sticking" in the UI.
    if (match && match.score != null) {
      const s = Number(match.score);
      if (!Number.isNaN(s) && s > 0) return s;
      // else fall through to local recompute
    }

    return calculatedScore;
  }, [selectedBlendId, row.recommendations, calculatedScore]);

  const calculateScore = () => {
    if (!selectedBlendId) {
      setCalculatedScore(null);
      return;
    }
    const selectedBlend = (allBlends || []).find((b) => String(b.id) === String(selectedBlendId));
    if (!selectedBlend) {
      setCalculatedScore(null);
      return;
    }

    // Deterministic scoring (same everywhere)
    const { score } = scorePipeBlend(
      { 
        pipe_id: row.pipe_id, 
        pipe_name: row.name, 
        bowl_variant_id: row.bowl_variant_id,
        focus: row.focus || [] 
      },
      {
        tobacco_id: String(selectedBlend.id),
        tobacco_name: selectedBlend.name,
        blend_type: selectedBlend.blend_type,
        strength: selectedBlend.strength,
        flavor_notes: selectedBlend.flavor_notes,
        tobacco_components: selectedBlend.tobacco_components,
        aromatic_intensity: selectedBlend.aromatic_intensity,
      },
      userProfile
    );
    setCalculatedScore(score);
  };

  // Reset calculated score when blend selection changes
  React.useEffect(() => {
    setCalculatedScore(null);
  }, [selectedBlendId]);

  const selectedBlendName = useMemo(() => {
    if (!selectedBlendId) return null;
    const blend = allBlends.find(b => String(b.id) === String(selectedBlendId));
    return blend?.name || t("common.unknown");
  }, [selectedBlendId, allBlends]);

  return (
    <div className="border rounded-lg p-3 bg-[#1A2B3A]/50">
      <div className="font-semibold">{row.name}</div>
      <div className="text-xs text-[#E0D8C8]/60 mt-1">
        {t("pairingGrid.focus")} {row.focus?.length ? row.focus.join(", ") : "—"}
      </div>
      <div className="text-xs text-[#E0D8C8]/60">
        {t("pairingGrid.dim")} {row.bowl_diameter_mm ?? "—"}mm × {row.bowl_depth_mm ?? "—"}mm (vol {row.chamber_volume ?? "—"})
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold">{t("pairingGrid.topMatches")}</div>
        {topMatches.length > 0 ? (
          <div className="text-sm space-y-1">
            {topMatches.map((rec, idx) => (
              <div key={`${row.key}-top-${idx}`} className="flex justify-between gap-2">
                <span className="truncate">{rec.tobacco_name || rec.name || t("common.tobacco")}</span>
                 <span className="font-medium">{rec.score ?? "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs">{t("pairingGrid.noRecommendations")}</span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold">{t("pairingGrid.checkAnyBlend")}</div>
        <Select value={selectedBlendId} onValueChange={setSelectedBlendId}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={t("pairingGrid.selectABlend")} />
          </SelectTrigger>
          <SelectContent>
            {allBlends.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBlendId && (
          <div className="space-y-2">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate">{selectedBlendName}</span>
              <span className="font-medium">
                {selectedBlendScore !== null ? selectedBlendScore : t("pairingGrid.noScore")}
              </span>
            </div>
            {selectedBlendScore === null && (
              <Button
                size="sm"
                variant="outline"
                onClick={calculateScore}
                className="w-full"
              >
                {t("pairingGrid.getScore")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}