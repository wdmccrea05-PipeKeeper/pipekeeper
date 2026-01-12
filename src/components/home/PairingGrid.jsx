import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { expandPipesToVariants, getPipeVariantKey, getVariantFromPipe } from "@/components/utils/pipeVariants";
import { regeneratePairings } from "@/components/utils/pairingRegeneration";
import { toast } from "sonner";

export default function PairingGrid({ user, pipes, blends, profile }) {
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
    staleTime: Infinity,
    gcTime: Infinity,
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
      // Normalize bowl_variant_id: treat null, undefined, "", "null", "main" all as null
      const rawBowlId = p.bowl_variant_id;
      const normalizedBowlId = (!rawBowlId || rawBowlId === "null" || rawBowlId === "main") ? null : rawBowlId;
      const key = getPipeVariantKey(p.pipe_id, normalizedBowlId);
      map.set(key, p);
      
      // Also store by pipe_id alone as fallback for pipes without bowls
      if (!normalizedBowlId) {
        map.set(`${p.pipe_id}::fallback`, p);
      }
    });
    return map;
  }, [activePairings]);

  // ✅ Expand pipes to bowl variants (each bowl becomes a row)
  const pipeVariants = useMemo(() => expandPipesToVariants(allPipes, { includeMainWhenBowls: false }), [allPipes]);

  const rows = useMemo(() => {
    return pipeVariants.map((pv) => {
      const key = getPipeVariantKey(pv.id, pv.bowl_variant_id || null);
      const pipe = allPipes.find((p) => String(p.id) === String(pv.id));
      const variant = getVariantFromPipe(pipe, pv.bowl_variant_id || null);
      
      // Try exact key first, then fallback for pipes without bowls
      let pairing = pairingsByVariant.get(key);
      if (!pairing && !pv.bowl_variant_id) {
        pairing = pairingsByVariant.get(`${pv.id}::fallback`);
      }
      // Also try matching by pipe name if ID-based lookup fails
      if (!pairing) {
        const variantName = variant?.variant_name || pv.variant_name || pv.name;
        const list = activePairings?.pairings || activePairings?.data?.pairings || [];
        pairing = list.find(p => p.pipe_name === variantName);
      }

      return {
        key,
        pipe_id: pv.id,
        bowl_variant_id: pv.bowl_variant_id || null,
        name: variant?.variant_name || pv.variant_name || pv.name,
        focus: Array.isArray(variant?.focus) ? variant.focus : [],
        chamber_volume: variant?.chamber_volume,
        bowl_diameter_mm: variant?.bowl_diameter_mm,
        bowl_depth_mm: variant?.bowl_depth_mm,
        recommendations: pairing?.recommendations || pairing?.blend_matches || [],
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [pipeVariants, allPipes, pairingsByVariant, activePairings]);

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      await regeneratePairings({
        pipes: allPipes,
        blends: allBlends,
        profile,
        user,
        queryClient,
        activePairings
      });
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
    <Card className="border-stone-200 bg-[#e8d5b7]/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pairing Grid</CardTitle>
            <CardDescription>Each bowl variant appears as an individual "pipe" in recommendations.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? 'Show' : 'Hide'}
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
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
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
      )}
    </Card>
  );
}

function PipeCard({ row, allBlends }) {
  const [selectedBlendId, setSelectedBlendId] = useState("");
  const [calculatedScore, setCalculatedScore] = useState(null);
  const [calculating, setCalculating] = useState(false);
  
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

  // Only show top matches that have scores (AI should respect focus)
  const topMatches = useMemo(() => {
    // Handle both 'recommendations' and 'blend_matches' field names for compatibility
    const recs = row.recommendations || [];
    const sorted = recs
      .filter(r => (r.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    
    // Show top 3 if available
    return sorted.slice(0, 3);
  }, [row.recommendations]);

  const selectedBlendScore = useMemo(() => {
    if (!selectedBlendId) return calculatedScore;
    // Try both possible field names for compatibility
    const match = row.recommendations?.find(r => 
      r.tobacco_id === selectedBlendId || r.blend_id === selectedBlendId || r.id === selectedBlendId
    );
    return match?.score ?? calculatedScore;
  }, [selectedBlendId, row.recommendations, calculatedScore]);

  const calculateScore = async () => {
    if (!selectedBlendId) return;
    
    setCalculating(true);
    const blend = allBlends.find(b => String(b.id) === String(selectedBlendId));
    if (!blend) {
      setCalculating(false);
      return;
    }

    try {
      // Simulate pipe object from row data
      const pipeData = {
        id: row.pipe_id,
        name: row.name,
        focus: row.focus || [],
        chamber_volume: row.chamber_volume,
        bowl_diameter_mm: row.bowl_diameter_mm,
        bowl_depth_mm: row.bowl_depth_mm,
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Score the compatibility between this pipe and tobacco blend on a scale of 0-10.

Pipe: ${JSON.stringify(pipeData, null, 2)}
User Profile: ${JSON.stringify(userProfile || {}, null, 2)}

Blend:
- Name: ${blend.name}
- Type: ${blend.blend_type}
- Strength: ${blend.strength}
- Cut: ${blend.cut}
- Components: ${blend.tobacco_components?.join(', ') || 'N/A'}

CRITICAL SCORING RULES:
1. If pipe focus contains this exact blend name "${blend.name}", score MUST be 9-10
2. If pipe has "Non-Aromatic" focus and blend is Aromatic: score = 0
3. If pipe has "Aromatic" focus and blend is non-aromatic: score = 0
4. If pipe focus matches blend type/category: 9-10
5. Otherwise base on physical compatibility and user preferences

Return only a number between 0 and 10 (decimals allowed).`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" }
          }
        }
      });

      setCalculatedScore(result.score || 0);
    } catch (error) {
      console.error('Score calculation failed:', error);
      toast.error('Failed to calculate score');
    } finally {
      setCalculating(false);
    }
  };

  // Reset calculated score when blend selection changes
  React.useEffect(() => {
    setCalculatedScore(null);
  }, [selectedBlendId]);

  const selectedBlendName = useMemo(() => {
    if (!selectedBlendId) return null;
    const blend = allBlends.find(b => String(b.id) === String(selectedBlendId));
    return blend?.name || "Unknown";
  }, [selectedBlendId, allBlends]);

  return (
    <div className="border rounded-lg p-3 bg-[#e8d5b7]/20">
      <div className="font-semibold text-stone-800">{row.name}</div>
      <div className="text-xs text-stone-600 mt-1">
        Focus: {row.focus?.length ? row.focus.join(", ") : "—"}
      </div>
      <div className="text-xs text-stone-600">
        Dim: {row.bowl_diameter_mm ?? "—"}mm × {row.bowl_depth_mm ?? "—"}mm (vol {row.chamber_volume ?? "—"})
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold text-stone-700">Top Matches:</div>
        {topMatches.length > 0 ? (
          <div className="text-sm text-stone-700 space-y-1">
            {topMatches.map((rec, idx) => (
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
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBlendId && (
          <div className="space-y-2">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate text-stone-700">{selectedBlendName}</span>
              <span className="text-stone-500 font-medium">
                {selectedBlendScore !== null ? selectedBlendScore : "No score"}
              </span>
            </div>
            {selectedBlendScore === null && (
              <Button
                size="sm"
                variant="outline"
                onClick={calculateScore}
                disabled={calculating}
                className="w-full"
              >
                {calculating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Get Score'
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}