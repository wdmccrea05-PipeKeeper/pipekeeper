import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generateOptimizationAI } from "@/components/utils/aiGenerators";
import { regeneratePairings } from "@/components/utils/pairingRegeneration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RefreshCw, Undo, Loader2, Tags } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";

export default function AIUpdates() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [reclassifyBusy, setReclassifyBusy] = useState(false);

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
      await regeneratePairings({
        pipes,
        blends,
        profile,
        user,
        queryClient,
        activePairings
      });
      setBusy(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
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

  const reclassifyBlends = useMutation({
    mutationFn: async () => {
      setReclassifyBusy(true);
      
      const blendsToUpdate = blends.filter(b => b.blend_type);
      
      if (blendsToUpdate.length === 0) {
        toast.info("No blends to reclassify");
        setReclassifyBusy(false);
        return;
      }

      const prompt = `Given the expanded tobacco blend classification system, analyze and reclassify these tobacco blends to the most accurate category:

Available categories (alphabetical):
American, Aromatic, Balkan, Burley, Burley-based, Cavendish, Codger Blend, Dark Fired Kentucky, English, English Aromatic, English Balkan, Full English/Oriental, Kentucky, Lakeland, Latakia Blend, Navy Flake, Oriental/Turkish, Other, Perique, Shag, Virginia, Virginia/Burley, Virginia/Oriental, Virginia/Perique

Blends to reclassify:
${blendsToUpdate.map(b => `- ${b.name} (current: ${b.blend_type})`).join('\n')}

Return a JSON array with updates only for blends that need reclassification to a more accurate category.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  old_type: { type: "string" },
                  new_type: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.updates && result.updates.length > 0) {
        for (const update of result.updates) {
          const blend = blendsToUpdate.find(b => b.name === update.name);
          if (blend) {
            await safeUpdate('TobaccoBlend', blend.id, { blend_type: update.new_type }, user?.email);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ["blends", user?.email] });
        toast.success(`Reclassified ${result.updates.length} blend(s)`);
      } else {
        toast.info("All blends are already correctly classified");
      }
      
      setReclassifyBusy(false);
    },
    onError: (error) => {
      setReclassifyBusy(false);
      toast.error("Failed to reclassify blends");
      console.error(error);
    },
  });

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">AI Updates</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          Review what's out of date and regenerate with approval. You can undo changes and reclassify blends.
        </p>
        <div className="mt-2 p-2 bg-yellow-500 text-black text-xs rounded">
          DEBUG: Page updated - {new Date().toISOString()}
        </div>
      </div>

      <div className="space-y-4">
        {/* TOBACCO BLEND CLASSIFICATION - FIRST CARD */}
        <div className="p-6 border-2 border-blue-500 bg-blue-900/50 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-4">🏷️ Tobacco Blend Classification</h2>
          <p className="text-white/80 mb-4">
            Reclassify your existing tobacco blends using the expanded category system with AI-powered analysis for improved accuracy.
          </p>
          <Button
            size="sm"
            disabled={reclassifyBusy || blends.length === 0}
            onClick={() => reclassifyBlends.mutate()}
            className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
          >
            {reclassifyBusy ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Tags className="w-4 h-4 mr-1" />
            )}
            Reclassify Blends ({blends.length} total)
          </Button>
        </div>

        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              <Tags className="w-5 h-5 text-blue-400" />
              Tobacco Blend Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80 mb-4">
              Reclassify your existing tobacco blends using the expanded category system with AI-powered analysis for improved accuracy.
            </p>
            <Button
              size="sm"
              disabled={reclassifyBusy || blends.length === 0}
              onClick={() => reclassifyBlends.mutate()}
              className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
            >
              {reclassifyBusy ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Tags className="w-4 h-4 mr-1" />
              )}
              Reclassify Blends
            </Button>
          </CardContent>
        </Card>

        {/* PAIRING MATRIX */}
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

        {/* COLLECTION OPTIMIZATION */}
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

        {/* PIPE MEASUREMENTS */}
        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              Pipe Measurements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80 mb-4">
              Fill missing dimensions with verified manufacturer specs
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-teal-600 to-teal-700"
              onClick={() => window.location.href = '/Pipes'}
            >
              Fill Measurements
            </Button>
          </CardContent>
        </Card>

        {/* BREAK-IN SCHEDULES */}
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