import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { expandPipesToVariants, getPipeVariantKey, getVariantFromPipe } from "@/components/utils/pipeVariants";
import { generatePairingsAI } from "@/components/utils/aiGenerators";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { toast } from "sonner";

export default function PairingGrid({ user, pipes, blends, profile }) {
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

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

  const pairingsByVariant = useMemo(() => {
    const map = new Map();
    const list = activePairings?.pairings || activePairings?.data?.pairings || [];
    (list || []).forEach((p) => {
      const key = getPipeVariantKey(p.pipe_id, p.bowl_variant_id || null);
      map.set(key, p);
    });
    return map;
  }, [activePairings]);

  // ✅ Expand pipes to bowl variants (each bowl becomes a row)
  const pipeVariants = useMemo(() => expandPipesToVariants(allPipes, { includeMainWhenBowls: false }), [allPipes]);

  const rows = useMemo(() => {
    return pipeVariants.map((pv) => {
      const key = getPipeVariantKey(pv.id, pv.bowl_variant_id || null);
      const pipe = allPipes.find((p) => p.id === pv.id);
      const variant = getVariantFromPipe(pipe, pv.bowl_variant_id || null);
      const pairing = pairingsByVariant.get(key);

      return {
        key,
        pipe_id: pv.id,
        bowl_variant_id: pv.bowl_variant_id || null,
        name: variant?.variant_name || pv.variant_name || pv.name,
        focus: Array.isArray(variant?.focus) ? variant.focus : [],
        chamber_volume: variant?.chamber_volume,
        bowl_diameter_mm: variant?.bowl_diameter_mm,
        bowl_depth_mm: variant?.bowl_depth_mm,
        recommendations: pairing?.recommendations || [],
      };
    });
  }, [pipeVariants, allPipes, pairingsByVariant]);

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      const currentFingerprint = buildArtifactFingerprint({ pipes: allPipes, blends: allBlends, profile });
      const { pairings } = await generatePairingsAI({ pipes: allPipes, blends: allBlends, profile });

      if (activePairings?.id) {
        await safeUpdate('PairingMatrix', activePairings.id, { is_active: false }, user?.email);
      }

      await base44.entities.PairingMatrix.create({
        created_by: user.email,
        is_active: true,
        previous_active_id: activePairings?.id ?? null,
        input_fingerprint: currentFingerprint,
        pairings,
        generated_date: new Date().toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Pairings regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate pairings");
    } finally {
      setRegenerating(false);
    }
  };

  if (pipesLoading || pairingsLoading || blendsLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading pairing grid...
      </div>
    );
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pairing Grid</CardTitle>
            <CardDescription>Each bowl variant appears as an individual "pipe" in recommendations.</CardDescription>
          </div>
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
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-stone-600">No pipes found.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((r) => (
              <PipeCard key={r.key} row={r} allBlends={allBlends} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PipeCard({ row, allBlends }) {
  const [selectedBlendId, setSelectedBlendId] = useState("");

  const top3 = useMemo(() => {
    return (row.recommendations || [])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
  }, [row.recommendations]);

  const selectedBlendScore = useMemo(() => {
    if (!selectedBlendId) return null;
    const match = row.recommendations?.find(r => r.tobacco_id === selectedBlendId);
    return match?.score ?? null;
  }, [selectedBlendId, row.recommendations]);

  const selectedBlendName = useMemo(() => {
    if (!selectedBlendId) return null;
    const blend = allBlends.find(b => b.id === selectedBlendId);
    return blend?.name || "Unknown";
  }, [selectedBlendId, allBlends]);

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="font-semibold text-stone-800">{row.name}</div>
      <div className="text-xs text-stone-600 mt-1">
        Focus: {row.focus?.length ? row.focus.join(", ") : "—"}
      </div>
      <div className="text-xs text-stone-600">
        Dim: {row.bowl_diameter_mm ?? "—"}mm × {row.bowl_depth_mm ?? "—"}mm (vol {row.chamber_volume ?? "—"})
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold text-stone-700">Top 3 Matches:</div>
        {top3.length > 0 ? (
          <div className="text-sm text-stone-700 space-y-1">
            {top3.map((rec, idx) => (
              <div key={`${row.key}-top-${idx}`} className="flex justify-between gap-2">
                <span className="truncate">{rec.tobacco_name || rec.name || "Tobacco"}</span>
                <span className="text-stone-500 font-medium">{rec.score ?? "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-stone-500">No recommendations yet.</span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold text-stone-700">Check Any Blend:</div>
        <Select value={selectedBlendId} onValueChange={setSelectedBlendId}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select a blend..." />
          </SelectTrigger>
          <SelectContent>
            {allBlends.map(b => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBlendId && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate text-stone-700">{selectedBlendName}</span>
            <span className="text-stone-500 font-medium">
              {selectedBlendScore !== null ? selectedBlendScore : "No score"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}