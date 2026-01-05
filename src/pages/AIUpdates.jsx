import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI, generateOptimizationAI } from "@/components/utils/aiGenerators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RefreshCw, Undo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";

export default function AIUpdates() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
  });

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => (await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => (await base44.entities.TobaccoBlend.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email,
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const res = await base44.entities.UserProfile.filter({ user_email: user.email });
      return res?.[0] || null;
    },
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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">AI Updates</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          Review what's out of date and regenerate with approval. You can undo changes.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              {pairingsStale ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              Pairing Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80 mb-4">
              Status: {pairingsStale ? (
                <span className="text-amber-500 font-semibold">Out of date - regeneration recommended</span>
              ) : (
                <span className="text-emerald-500 font-semibold">Up to date</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!activePairings?.previous_active_id || busy}
                onClick={() => undoPairings.mutate()}
                className="border-[#8b3a3a]/40 text-[#e8d5b7]"
              >
                <Undo className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button
                size="sm"
                disabled={!pairingsStale || busy}
                onClick={() => regenPairings.mutate()}
                className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              {optStale ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              Collection Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80 mb-4">
              Status: {optStale ? (
                <span className="text-amber-500 font-semibold">Out of date - regeneration recommended</span>
              ) : (
                <span className="text-emerald-500 font-semibold">Up to date</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!activeOpt?.previous_active_id || busy}
                onClick={() => undoOpt.mutate()}
                className="border-[#8b3a3a]/40 text-[#e8d5b7]"
              >
                <Undo className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button
                size="sm"
                disabled={!optStale || busy}
                onClick={() => regenOpt.mutate()}
                className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Break-In Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80">
              Regeneration is handled per pipe on the Pipe detail page (with undo/history).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}