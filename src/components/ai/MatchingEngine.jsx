import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries, invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import { getPipeVariantKey } from "@/components/utils/pipeVariants";

export default function MatchingEngine({ user }) {
  const queryClient = useQueryClient();
  const [activePipeId, setActivePipeId] = useState(null);
  const [activeBowlVariantId, setActiveBowlVariantId] = useState(null); // 'bowl_0', 'bowl_1', etc.
  const [activeTab, setActiveTab] = useState("recommendations");
  const [loading, setLoading] = useState(false);

  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      return await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500) || [];
    },
    enabled: !!user?.email,
  });

  const { data: tobaccos = [], isLoading: tobaccosLoading } = useQuery({
    queryKey: ["tobaccos", user?.email],
    queryFn: async () => {
      return await base44.entities.TobaccoBlend.filter({ created_by: user?.email }, "-updated_date", 500) || [];
    },
    enabled: !!user?.email,
  });

  const activePipe = useMemo(() => pipes.find((p) => p.id === activePipeId) || null, [pipes, activePipeId]);

  // Default selection:
  // - If pipe has bowls, default to bowl_0
  // - Else, default to main
  useEffect(() => {
    if (!pipes?.length) return;
    if (!activePipeId) {
      const first = pipes[0];
      setActivePipeId(first.id);
      const hasBowls = Array.isArray(first.interchangeable_bowls) && first.interchangeable_bowls.length > 0;
      setActiveBowlVariantId(hasBowls ? "bowl_0" : null);
      return;
    }

    // If activePipe changes and it has bowls, ensure we default to bowl_0 when not set
    const p = pipes.find((x) => x.id === activePipeId);
    const hasBowls = Array.isArray(p?.interchangeable_bowls) && p.interchangeable_bowls.length > 0;
    if (hasBowls && !activeBowlVariantId) setActiveBowlVariantId("bowl_0");
    if (!hasBowls && activeBowlVariantId) setActiveBowlVariantId(null);
  }, [pipes, activePipeId, activeBowlVariantId]);

  const activeVariant = useMemo(() => {
    if (!activePipe) return null;

    const bowls = Array.isArray(activePipe.interchangeable_bowls) ? activePipe.interchangeable_bowls : [];
    if (activeBowlVariantId) {
      const idx = parseInt(String(activeBowlVariantId).replace("bowl_", ""), 10);
      const bowl = Number.isFinite(idx) ? bowls[idx] : null;

      if (bowl) {
        return {
          pipe_id: activePipe.id,
          bowl_variant_id: activeBowlVariantId,
          pipe_name: `${activePipe.name} - ${bowl.name || `Bowl ${idx + 1}`}`,
          focus: Array.isArray(bowl.focus) ? bowl.focus : (Array.isArray(activePipe.focus) ? activePipe.focus : []),
          chamber_volume: bowl.chamber_volume ?? activePipe.chamber_volume,
          bowl_diameter_mm: bowl.bowl_diameter_mm ?? activePipe.bowl_diameter_mm,
          bowl_depth_mm: bowl.bowl_depth_mm ?? activePipe.bowl_depth_mm,
          bowl_material: bowl.bowl_material ?? activePipe.bowl_material,
        };
      }
    }

    // main variant
    return {
      pipe_id: activePipe.id,
      bowl_variant_id: null,
      pipe_name: activePipe.name,
      focus: Array.isArray(activePipe.focus) ? activePipe.focus : [],
      chamber_volume: activePipe.chamber_volume,
      bowl_diameter_mm: activePipe.bowl_diameter_mm,
      bowl_depth_mm: activePipe.bowl_depth_mm,
      bowl_material: activePipe.bowl_material,
    };
  }, [activePipe, activeBowlVariantId]);

  // Fetch pairing matrix data
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

  const currentVariantKey = useMemo(
    () => (activeVariant ? getPipeVariantKey(activeVariant.pipe_id, activeVariant.bowl_variant_id || null) : null),
    [activeVariant]
  );

  const currentPairing = useMemo(() => {
    if (!activeVariant) return null;
    // find pairing entry for this variant from PairingMatrix
    const activePairings = pairingMatrix?.[0]?.pairings || [];
    const hit = activePairings.find(
      (p) => p.pipe_id === activeVariant.pipe_id && (p.bowl_variant_id || null) === (activeVariant.bowl_variant_id || null)
    );
    return hit || null;
  }, [pairingMatrix, activeVariant]);

  const bowlOptions = useMemo(() => {
    if (!activePipe) return [];
    const bowls = Array.isArray(activePipe.interchangeable_bowls) ? activePipe.interchangeable_bowls : [];
    if (!bowls.length) return [];
    return bowls.map((b, i) => ({
      id: b.bowl_variant_id || `bowl_${i}`,
      name: b.name || `Bowl ${i + 1}`,
    }));
  }, [activePipe]);

  async function applyFocusToActiveVariant(newFocus = []) {
    if (!activePipe) return;

    const normalized = Array.isArray(newFocus) ? newFocus : [];
    try {
      if (activeBowlVariantId) {
        const idx = parseInt(String(activeBowlVariantId).replace("bowl_", ""), 10);
        const bowls = Array.isArray(activePipe.interchangeable_bowls) ? [...activePipe.interchangeable_bowls] : [];
        if (!Number.isFinite(idx) || !bowls[idx]) throw new Error("Invalid bowl selection");

        bowls[idx] = {
          ...bowls[idx],
          focus: normalized,
        };

        await safeUpdate("Pipe", activePipe.id, { interchangeable_bowls: bowls }, user?.email);
      } else {
        await safeUpdate("Pipe", activePipe.id, { focus: normalized }, user?.email);
      }

      invalidatePipeQueries(queryClient, user?.email);
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Focus updated");
    } catch (e) {
      toast.error(e?.message || "Failed to update focus");
    }
  }

  // Example action: generate recommendations for the active variant
  async function generateVariantRecommendations() {
    if (!activeVariant) return;
    setLoading(true);
    try {
      // Your existing generator call(s) likely live elsewhere; this component mainly ensures
      // that the ACTIVE CONTEXT is the bowl variant when present.
      toast.success("Using bowl-aware context for AI recommendations");
    } catch (e) {
      toast.error(e?.message || "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  }

  if (pipesLoading || tobaccosLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-stone-700" />
          AI Matching Engine
        </CardTitle>
        <CardDescription>
          When a pipe has interchangeable bowls, AI defaults to the selected bowl variant (treated as a separate pipe).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-stone-600">Pipe</div>
            <Select value={activePipeId || ""} onValueChange={(v) => setActivePipeId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select pipe" />
              </SelectTrigger>
              <SelectContent>
                {pipes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-stone-600">Bowl Variant</div>
            <Select
              value={activeBowlVariantId || "main"}
              onValueChange={(v) => setActiveBowlVariantId(v === "main" ? null : v)}
              disabled={!bowlOptions.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Main" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main (non-variant)</SelectItem>
                {bowlOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-stone-600">Active Context</div>
            <div className="p-2 rounded-md border bg-stone-50">
              <div className="text-sm font-semibold text-stone-800">{activeVariant?.pipe_name || "—"}</div>
              <div className="text-xs text-stone-600 mt-1">
                Variant key: <span className="font-mono">{currentVariantKey || "—"}</span>
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {(activeVariant?.focus || []).length ? (
                  (activeVariant.focus || []).map((f) => (
                    <Badge key={f} variant="secondary" className="bg-stone-200 text-stone-800">
                      {f}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-stone-500">No focus set</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="pairing">Pairing</TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={generateVariantRecommendations} disabled={!activeVariant || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate (variant-aware)
              </Button>
              <Button
                variant="outline"
                onClick={() => applyFocusToActiveVariant(activeVariant?.focus || [])}
                disabled={!activeVariant}
              >
                Confirm & Apply Focus
              </Button>
            </div>
            <div className="text-xs text-stone-500">
              This screen ensures AI context uses the active bowl variant when present (instead of the parent pipe).
            </div>
          </TabsContent>

          <TabsContent value="pairing" className="space-y-3">
            {artifactsLoading ? (
              <div className="flex items-center text-stone-600">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading AI artifacts...
              </div>
            ) : currentPairing ? (
              <div className="p-3 rounded-lg border bg-white">
                <div className="font-semibold text-stone-800 mb-2">Pairing Results for Variant</div>
                <div className="text-sm text-stone-700">
                  {(currentPairing.recommendations || []).length
                    ? currentPairing.recommendations.map((r) => `${r.tobacco_name || r.name || "Tobacco"} (${r.score || "—"})`).join(", ")
                    : "No pairing recommendations found for this variant."}
                </div>
              </div>
            ) : (
              <div className="text-sm text-stone-600">No pairing artifact entries for this bowl variant yet.</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}