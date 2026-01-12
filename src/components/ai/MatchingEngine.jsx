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

  // Default selection when pipes load or change
  useEffect(() => {
    if (!pipes?.length) return;
    
    // Set first pipe if none selected
    if (!activePipeId) {
      const first = pipes[0];
      setActivePipeId(first.id);
      const hasBowls = Array.isArray(first.interchangeable_bowls) && first.interchangeable_bowls.length > 0;
      setActiveBowlVariantId(hasBowls ? "bowl_0" : null);
      return;
    }

    // When active pipe changes, adjust bowl variant selection accordingly
    const p = pipes.find((x) => x.id === activePipeId);
    if (!p) return;
    
    const hasBowls = Array.isArray(p.interchangeable_bowls) && p.interchangeable_bowls.length > 0;
    
    // If pipe has no bowls but we have a bowl selected, clear it
    if (!hasBowls && activeBowlVariantId !== null) {
      setActiveBowlVariantId(null);
    }
    // If pipe has bowls but no bowl selected, select first bowl
    else if (hasBowls && activeBowlVariantId === null) {
      setActiveBowlVariantId("bowl_0");
    }
  }, [pipes, activePipeId]);

  const activeVariant = useMemo(() => {
    if (!activePipe) return null;

    const bowls = Array.isArray(activePipe.interchangeable_bowls) ? activePipe.interchangeable_bowls : [];
    const hasBowls = bowls.length > 0;
    
    // Only process bowl variant if pipe actually has bowls AND a bowl is selected
    if (hasBowls && activeBowlVariantId) {
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

    // Main pipe variant (no bowls or bowl not found)
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
          Select a pipe to view AI recommendations. Pipes with interchangeable bowls will show each bowl as a separate variant.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-stone-600">Select Pipe / Bowl</div>
            <Select 
              value={currentVariantKey || ""} 
              onValueChange={(key) => {
                const [pipeId, bowlId] = key.split('::');
                setActivePipeId(pipeId);
                setActiveBowlVariantId(bowlId === 'main' ? null : bowlId);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pipe or bowl variant" />
              </SelectTrigger>
              <SelectContent>
                {pipes.map((p) => {
                  const bowls = Array.isArray(p.interchangeable_bowls) ? p.interchangeable_bowls : [];
                  // Only show bowl variants if bowls array has items
                  if (bowls.length > 0) {
                    return bowls.map((b, i) => {
                      const bowlId = b.bowl_variant_id || `bowl_${i}`;
                      const variantKey = getPipeVariantKey(p.id, bowlId);
                      return (
                        <SelectItem key={variantKey} value={variantKey}>
                          {p.name} - {b.name || `Bowl ${i + 1}`}
                        </SelectItem>
                      );
                    });
                  }
                  // Show regular pipe when no bowls exist
                  return (
                    <SelectItem key={getPipeVariantKey(p.id, null)} value={getPipeVariantKey(p.id, null)}>
                      {p.name}
                    </SelectItem>
                  );
                })}
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