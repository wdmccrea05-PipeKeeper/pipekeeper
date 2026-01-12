import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { getPipeVariantKey } from "@/components/utils/pipeVariants";

export default function PairingMatrix({ user }) {
  const [expanded, setExpanded] = useState({});

  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      return await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500) || [];
    },
    enabled: !!user?.email,
  });

  const { data: pairingMatrix = [], isLoading: artifactsLoading } = useQuery({
    queryKey: ["saved-pairings", user?.email],
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user?.email, is_active: true },
        "-created_date",
        1
      );
      return active || [];
    },
    enabled: !!user?.email,
  });

  const pairings = useMemo(() => {
    const activePairings = pairingMatrix?.[0]?.pairings || [];
    return activePairings.map((p) => ({
      ...p,
      __variant_key: getPipeVariantKey(p.pipe_id, p.bowl_variant_id || null),
    }));
  }, [pairingMatrix]);

  const pipeNameById = useMemo(() => {
    const map = new Map();
    (pipes || []).forEach((p) => map.set(String(p.id), p.name));
    return map;
  }, [pipes]);

  const variantLabel = (pair) => {
    const base = pipeNameById.get(String(pair.pipe_id)) || pair.pipe_name || "Unknown Pipe";
    if (pair.bowl_variant_id) {
      // Try to find bowl name from pipe record
      const pipe = pipes.find((p) => String(p.id) === String(pair.pipe_id));
      if (pipe?.interchangeable_bowls) {
        const idx = parseInt(String(pair.bowl_variant_id).replace("bowl_", ""), 10);
        const bowl = pipe.interchangeable_bowls?.[idx];
        if (bowl) return `${base} - ${bowl.name || `Bowl ${idx + 1}`}`;
      }
      return `${base} - ${pair.bowl_variant_id}`;
    }
    return base;
  };

  const toggleExpanded = (variantKey) => {
    setExpanded((prev) => ({ ...prev, [variantKey]: !prev[variantKey] }));
  };

  if (pipesLoading || artifactsLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading pairing matrix...
      </div>
    );
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle>Pairing Matrix</CardTitle>
        <CardDescription>Interchangeable bowls are shown as distinct pipe variants.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pairings.length === 0 ? (
          <div className="text-sm text-stone-600">No pairing grid data yet.</div>
        ) : (
          pairings.map((p) => {
            const key = p.__variant_key;
            const isOpen = !!expanded[key];
            const recs = p.recommendations || [];

            return (
              <div key={key} className="border rounded-lg bg-white">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => toggleExpanded(key)}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div className="font-semibold text-stone-800">{variantLabel(p)}</div>
                  </div>
                  <div className="text-xs text-stone-500">
                    {(recs?.length || 0)} recommendation{(recs?.length || 0) === 1 ? "" : "s"}
                  </div>
                </button>

                {isOpen ? (
                  <div className="px-3 pb-3">
                    {recs.length ? (
                      <div className="flex flex-wrap gap-2">
                        {recs.map((r, idx) => (
                          <Badge key={`${key}-${idx}`} variant="secondary" className="bg-stone-100 text-stone-800">
                            {r.tobacco_name || r.name || "Tobacco"} {r.score != null ? `(${r.score})` : ""}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-stone-600">No recommendations for this variant.</div>
                    )}
                    {p.reasoning ? (
                      <div className="mt-3 text-xs text-stone-600 whitespace-pre-wrap">{p.reasoning}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}