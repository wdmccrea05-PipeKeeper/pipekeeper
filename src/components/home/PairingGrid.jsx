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
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { scorePipeBlend } from "@/components/utils/pairingScore";
import { isAppleBuild } from "@/components/utils/appVariant";

export default function PairingGrid({ user, pipes, blends, profile }) {
  if (isAppleBuild) return null;
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
    (list || []).forEach((p) => {
      const key = keyOf(p.pipe_id, p.bowl_variant_id);
      map.set(key, p);
    });
    return map;
  }, [activePairings]);

  // ✅ Expand pipes to bowl variants (each bowl becomes a row)
  const pipeVariants = useMemo(() => expandPipesToVariants(allPipes, { includeMainWhenBowls: false }), [allPipes]);

  const rows = useMemo(() => {
    const keyOf = (pipe_id, bowl_variant_id) =>
      `${String(pipe_id)}::${bowl_variant_id ? String(bowl_variant_id) : "main"}`;

    return pipeVariants.map((pv) => {
      const pipe = allPipes.find((p) => String(p.id) === String(pv.id));
      const variant = getVariantFromPipe(pipe, pv.bowl_variant_id || null);
      
      // Lookup using ONLY pipe_id + bowl_variant_id
      const tileKey = keyOf(pv.id, pv.bowl_variant_id || null);
      const pairing = pairingsByVariant.get(tileKey);

      return {
        key: tileKey,
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
  }, [pipeVariants, allPipes, pairingsByVariant]);

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      const currentFingerprint = buildArtifactFingerprint({ pipes: allPipes, blends: allBlends, profile });
      
      // Check if active pairings still match current fingerprint (no regeneration needed)
      if (activePairings && activePairings.input_fingerprint === currentFingerprint && activePairings.is_active) {
        toast.success("Pairings are already up to date");
        setRegenerating(false);
        return;
      }

      const { pairings } = await generatePairingsAI({ pipes: allPipes, blends: allBlends, profile });

      if (activePairings?.id) {
        await safeUpdate("PairingMatrix", activePairings.id, { is_active: false }, user?.email);
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
      console.error('Regeneration error:', error);
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
            <CardTitle className="text-white">Pairing Grid</CardTitle>
            <CardDescription className="text-white">Each bowl variant appears as an individual "pipe" in recommendations.</CardDescription>
            </div>
            <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-white hover:text-white hover:bg-[#A35C5C]/30"
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
    const match = row.recommendations?.find(r => 
      r.tobacco_id === selectedBlendId || r.blend_id === selectedBlendId || r.id === selectedBlendId
    );
    return match?.score ?? calculatedScore;
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
    return blend?.name || "Unknown";
  }, [selectedBlendId, allBlends]);

  return (
    <div className="border rounded-lg p-3 bg-[#E8E8E8]">
      <div className="font-semibold text-[#1a2c42]">{row.name}</div>
      <div className="text-xs text-black mt-1">
        Focus: {row.focus?.length ? row.focus.join(", ") : "—"}
      </div>
      <div className="text-xs text-black">
        Dim: {row.bowl_diameter_mm ?? "—"}mm × {row.bowl_depth_mm ?? "—"}mm (vol {row.chamber_volume ?? "—"})
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold text-[#1a2c42]">Top Matches:</div>
        {topMatches.length > 0 ? (
          <div className="text-sm text-black space-y-1">
            {topMatches.map((rec, idx) => (
              <div key={`${row.key}-top-${idx}`} className="flex justify-between gap-2">
                <span className="truncate text-black">{rec.tobacco_name || rec.name || "Tobacco"}</span>
                 <span className="text-black font-medium">{rec.score ?? "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-black">No recommendations yet.</span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs font-semibold text-[#1a2c42]">Check Any Blend:</div>
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
              <span className="truncate text-black">{selectedBlendName}</span>
              <span className="text-black font-medium">
                {selectedBlendScore !== null ? selectedBlendScore : "No score"}
              </span>
            </div>
            {selectedBlendScore === null && (
              <Button
                size="sm"
                variant="outline"
                onClick={calculateScore}
                className="w-full"
              >
                Get Score
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}