import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI, generateOptimizationAI } from "@/components/utils/aiGenerators";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RefreshCw, Undo, Loader2, Ruler } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries, invalidatePipeQueries } from "@/components/utils/cacheInvalidation";

export default function AIUpdatesPanel({ pipes, blends, profile }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
  });

  const currentFingerprint = useMemo(
    () => buildArtifactFingerprint({ pipes, blends, profile }),
    [pipes, blends, profile]
  );

  const { data: activePairings, refetch: refetchPairings } = useQuery({
    queryKey: ["activePairings", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter({ created_by: user.email, is_active: true }, "-created_date", 1);
      return active?.[0] || null;
    },
  });

  const { data: activeOpt, refetch: refetchOpt } = useQuery({
    queryKey: ["activeOptimization", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.CollectionOptimization.filter({ created_by: user.email, is_active: true }, "-created_date", 1);
      return active?.[0] || null;
    },
  });

  const pairingsStale = !!activePairings && (!activePairings.input_fingerprint || activePairings.input_fingerprint !== currentFingerprint);
  const optStale = !!activeOpt && (!activeOpt.input_fingerprint || activeOpt.input_fingerprint !== currentFingerprint);

  const regenPairings = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const { pairings } = await generatePairingsAI({ pipes, blends, profile });

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

      setBusy(false);
    },
    onSuccess: () => {
      refetchPairings();
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Pairings regenerated successfully");
    },
    onError: () => {
      setBusy(false);
      toast.error("Failed to regenerate pairings");
    },
  });

  const undoPairings = useMutation({
    mutationFn: async () => {
      if (!activePairings?.previous_active_id) return;
      await safeUpdate('PairingMatrix', activePairings.id, { is_active: false }, user?.email);
      await safeUpdate('PairingMatrix', activePairings.previous_active_id, { is_active: true }, user?.email);
    },
    onSuccess: () => {
      refetchPairings();
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Pairings reverted to previous version");
    },
    onError: () => toast.error("Failed to undo pairings"),
  });

  const regenOpt = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const result = await generateOptimizationAI({ pipes, blends, profile, whatIfText: "" });

      if (activeOpt?.id) {
        await safeUpdate('CollectionOptimization', activeOpt.id, { is_active: false }, user?.email);
      }

      await base44.entities.CollectionOptimization.create({
        created_by: user.email,
        is_active: true,
        previous_active_id: activeOpt?.id ?? null,
        input_fingerprint: currentFingerprint,
        pipe_specializations: result.applyable_changes || [],
        collection_gaps: result,
        generated_date: new Date().toISOString(),
      });

      setBusy(false);
    },
    onSuccess: () => {
      refetchOpt();
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Optimization regenerated successfully");
    },
    onError: () => {
      setBusy(false);
      toast.error("Failed to regenerate optimization");
    },
  });

  const undoOpt = useMutation({
    mutationFn: async () => {
      if (!activeOpt?.previous_active_id) return;
      await safeUpdate('CollectionOptimization', activeOpt.id, { is_active: false }, user?.email);
      await safeUpdate('CollectionOptimization', activeOpt.previous_active_id, { is_active: true }, user?.email);
    },
    onSuccess: () => {
      refetchOpt();
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Optimization reverted to previous version");
    },
    onError: () => toast.error("Failed to undo optimization"),
  });

  const fillMeasurements = useMutation({
    mutationFn: async () => {
      setBusy(true);
      let updatedCount = 0;

      // Process pipes with missing measurements
      for (const pipe of pipes) {
        const hasMissingMeasurements = !pipe.length_mm || !pipe.weight_grams || !pipe.bowl_diameter_mm || !pipe.bowl_depth_mm;
        
        if (hasMissingMeasurements) {
          try {
            const prompt = `Find verified manufacturer specifications for this pipe to fill missing measurements.

Pipe: ${pipe.maker || 'Unknown'} ${pipe.name || 'Unknown'}
Shape: ${pipe.shape || 'Unknown'}
Existing: ${pipe.length_mm ? `Length: ${pipe.length_mm}mm` : ''} ${pipe.weight_grams ? `Weight: ${pipe.weight_grams}g` : ''} ${pipe.bowl_diameter_mm ? `Chamber: ${pipe.bowl_diameter_mm}mm` : ''} ${pipe.bowl_depth_mm ? `Depth: ${pipe.bowl_depth_mm}mm` : ''}

CRITICAL: Only provide verified manufacturer/retailer specifications. Do NOT estimate or guess. Return null if no verified data exists.`;

            const result = await base44.integrations.Core.InvokeLLM({
              prompt,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  length_mm: { type: ["number", "null"] },
                  weight_grams: { type: ["number", "null"] },
                  bowl_height_mm: { type: ["number", "null"] },
                  bowl_width_mm: { type: ["number", "null"] },
                  bowl_diameter_mm: { type: ["number", "null"] },
                  bowl_depth_mm: { type: ["number", "null"] },
                  chamber_volume: { type: ["string", "null"] },
                  dimensions_found: { type: "boolean" },
                  dimensions_source: { type: ["string", "null"] }
                }
              }
            });

            const updates = {};
            let foundAny = false;
            
            Object.keys(result).forEach(key => {
              if (result[key] !== null && result[key] !== undefined && !pipe[key]) {
                updates[key] = result[key];
                if (key !== 'dimensions_found' && key !== 'dimensions_source') {
                  foundAny = true;
                }
              }
            });

            if (foundAny) {
              await safeUpdate('Pipe', pipe.id, updates, user?.email);
              updatedCount++;
            }
          } catch (error) {
            console.error(`Failed to update pipe ${pipe.id}:`, error);
          }
        }
      }

      setBusy(false);
      return updatedCount;
    },
    onSuccess: (count) => {
      invalidatePipeQueries(queryClient, user?.email);
      if (count > 0) {
        toast.success(`Updated ${count} pipe(s) with verified measurements`);
      } else {
        toast.info("No verified measurements found for your pipes");
      }
    },
    onError: () => {
      setBusy(false);
      toast.error("Failed to fill measurements");
    },
  });

  return (
    <div className="space-y-4">
      <div className="border border-[#e8d5b7]/30 rounded-lg p-4 bg-[#1a2c42]/60">
        <div className="flex items-start gap-3 mb-3">
          {pairingsStale ? (
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-[#e8d5b7]">Pairing Matrix</h3>
            <p className="text-sm text-[#e8d5b7]/70 mt-1">
              {pairingsStale ? (
                <span className="text-amber-400 font-medium">Out of date - regeneration recommended</span>
              ) : (
                <span className="text-emerald-400 font-medium">Up to date</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!activePairings?.previous_active_id || busy}
            onClick={() => undoPairings.mutate()}
            className="border-[#e8d5b7]/30 text-[#e8d5b7]"
          >
            <Undo className="w-3 h-3 mr-1" />
            Undo
          </Button>
          <Button
            size="sm"
            disabled={!pairingsStale || busy}
            onClick={() => regenPairings.mutate()}
            className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
          >
            {busy ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      <div className="border border-[#e8d5b7]/30 rounded-lg p-4 bg-[#1a2c42]/60">
        <div className="flex items-start gap-3 mb-3">
          {optStale ? (
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-[#e8d5b7]">Collection Optimization</h3>
            <p className="text-sm text-[#e8d5b7]/70 mt-1">
              {optStale ? (
                <span className="text-amber-400 font-medium">Out of date - regeneration recommended</span>
              ) : (
                <span className="text-emerald-400 font-medium">Up to date</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!activeOpt?.previous_active_id || busy}
            onClick={() => undoOpt.mutate()}
            className="border-[#e8d5b7]/30 text-[#e8d5b7]"
          >
            <Undo className="w-3 h-3 mr-1" />
            Undo
          </Button>
          <Button
            size="sm"
            disabled={!optStale || busy}
            onClick={() => regenOpt.mutate()}
            className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
          >
            {busy ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      <div className="border border-[#e8d5b7]/30 rounded-lg p-4 bg-[#1a2c42]/60">
        <div className="flex items-start gap-3 mb-3">
          <Ruler className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-[#e8d5b7]">Pipe Measurements</h3>
            <p className="text-sm text-[#e8d5b7]/70 mt-1">
              Fill missing dimensions with verified manufacturer specs
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => fillMeasurements.mutate()}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700"
        >
          {busy ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Ruler className="w-3 h-3 mr-1" />
          )}
          Fill Measurements
        </Button>
      </div>

      <div className="border border-[#e8d5b7]/30 rounded-lg p-4 bg-[#1a2c42]/60">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-[#e8d5b7]">Break-In Schedules</h3>
            <p className="text-sm text-[#e8d5b7]/70 mt-1">
              Regeneration is handled per pipe on the Pipe detail page (with undo/history).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}