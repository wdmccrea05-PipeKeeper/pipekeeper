import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { expandPipesToVariants, getPipeVariantKey, getVariantFromPipe } from "@/components/utils/pipeVariants";

export default function PairingGrid({ user }) {
  // ✅ Use .filter like the rest of your app (returns array)
  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => (await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email,
  });

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
  const pipeVariants = useMemo(() => expandPipesToVariants(pipes, { includeMainWhenBowls: false }), [pipes]);

  const rows = useMemo(() => {
    return pipeVariants.map((pv) => {
      const key = getPipeVariantKey(pv.id, pv.bowl_variant_id || null);
      const pipe = pipes.find((p) => p.id === pv.id);
      const variant = getVariantFromPipe(pipe, pv.bowl_variant_id || null);
      const pairing = pairingsByVariant.get(key);

      return {
        key,
        name: variant?.variant_name || pv.variant_name || pv.name,
        focus: Array.isArray(variant?.focus) ? variant.focus : [],
        chamber_volume: variant?.chamber_volume,
        bowl_diameter_mm: variant?.bowl_diameter_mm,
        bowl_depth_mm: variant?.bowl_depth_mm,
        recommendations: pairing?.recommendations || [],
      };
    });
  }, [pipeVariants, pipes, pairingsByVariant]);

  if (pipesLoading || pairingsLoading) {
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
        <CardTitle>Pairing Grid</CardTitle>
        <CardDescription>Each bowl variant appears as an individual “pipe” in recommendations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-stone-600">No pipes found.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.key} className="border rounded-lg p-3 bg-white">
                <div className="font-semibold text-stone-800">{r.name}</div>
                <div className="text-xs text-stone-600 mt-1">
                  Focus: {r.focus?.length ? r.focus.join(", ") : "—"}
                </div>
                <div className="text-xs text-stone-600">
                  Dim: {r.bowl_diameter_mm ?? "—"}mm × {r.bowl_depth_mm ?? "—"}mm (vol {r.chamber_volume ?? "—"})
                </div>

                <div className="mt-2 text-sm text-stone-700">
                  {r.recommendations?.length ? (
                    r.recommendations.slice(0, 6).map((rec, idx) => (
                      <div key={`${r.key}-${idx}`} className="flex justify-between gap-2">
                        <span className="truncate">{rec.tobacco_name || rec.name || "Tobacco"}</span>
                        <span className="text-stone-500">{rec.score ?? "—"}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-stone-500">No recommendations yet.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}