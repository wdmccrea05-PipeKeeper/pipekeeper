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
import { regeneratePairings } from "@/components/utils/pairingRegeneration";

export default function MatchingEngine({ pipe, blends = [], isPaidUser }) {
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
      name: b.name || `Bowl ${i + 1}`,
    }));
  }, [pipe]);

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
    return [...recs]
      .filter((r) => (r.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
  }, [pairingEntry]);

  const [selectedBlendId, setSelectedBlendId] = useState("");
  const selectedBlend = useMemo(() => blends.find((b) => String(b.id) === String(selectedBlendId)) || null, [blends, selectedBlendId]);

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
        featureName="AI Tobacco Matching"
        description="Get top blend recommendations for each pipe (and for each interchangeable bowl)."
      />
    );
  }

  if (pairingsLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-stone-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading recommendations...
      </div>
    );
  }

  if (!pipe?.id) {
    return <div className="text-sm text-stone-600">Pipe not available.</div>;
  }

  const normalizedBowlId = (!activeBowlVariantId || activeBowlVariantId === "main") ? null : activeBowlVariantId;
  const variantKey = getPipeVariantKey(pipe.id, normalizedBowlId);

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      await regeneratePairings({
        pipes: [pipe],
        blends,
        profile: userProfile,
        user,
        queryClient,
        activePairings,
        mode: "merge", // ✅ critical
      });
      toast.success("Pairings regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate pairings");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="border-stone-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b bg-stone-50">
          <div className="flex-1">
            <div className="text-sm font-semibold text-stone-800">Recommendations for</div>
            <div className="text-xs text-stone-600">{pipe.name}</div>
          </div>

          <div className="flex gap-2 items-start">
            <Button
              variant="outline"
              size="sm"
              onClick={regenPairings}
              disabled={regenerating}
              className="shrink-0"
            >
              {regenerating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Regenerate
            </Button>
          </div>

          <div className="w-full md:w-64">
            <div className="text-xs font-semibold text-stone-600 mb-1">Bowl Variant</div>
            <Select
             value={activeBowlVariantId || ""}
             onValueChange={setActiveBowlVariantId}
             disabled={!hasBowls}
            >
             <SelectTrigger>
               <SelectValue placeholder="Select bowl..." />
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
            <div className="text-xs font-semibold text-stone-700 mb-2">Top 3 matches (from Pairing Grid)</div>
            {top3.length ? (
              <div className="flex flex-col gap-2">
                {top3.map((r, idx) => (
                  <div key={`${variantKey}-top-${idx}`} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-stone-800 truncate">{r.tobacco_name}</span>
                    <Badge className="bg-stone-200 text-stone-800">{r.score ?? "—"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-stone-600">No pairing data yet. Regenerate Pairings.</div>
            )}
          </div>

          <div className="pt-3 border-t">
            <div className="text-xs font-semibold text-stone-700 mb-2">Check any blend</div>
            <Select value={selectedBlendId} onValueChange={setSelectedBlendId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a blend..." />
              </SelectTrigger>
              <SelectContent>
                {blends.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBlend ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-stone-800 truncate">{selectedBlend.name}</span>
                <span className="text-sm text-stone-600">{selectedBlendScore ?? "No score"}</span>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}