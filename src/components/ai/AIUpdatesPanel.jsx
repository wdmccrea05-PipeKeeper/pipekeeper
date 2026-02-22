import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI, generateOptimizationAI } from "@/components/utils/aiGenerators";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Undo,
  Loader2,
  Ruler,
  Tags,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateAIQueries, invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import { regeneratePairingsConsistent } from "@/components/utils/pairingRegeneration";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function AIUpdatesPanel({ pipes, blends, profile }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();
  const navigate = useNavigate();

  if (!entitlements.canUse("AI_UPDATES")) {
    return (
      <UpgradePrompt 
        featureName={t("aiUpdates.featureName","AI Updates & Regeneration")}
        description={t("aiUpdates.featureDesc","Automatically update and regenerate pairing matrices, collection optimization, blend classifications, and pipe measurements using AI. Available for legacy Premium users or Pro tier.")}
      />
    );
  }
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [reclassifyBusy, setReclassifyBusy] = useState(false);
  const [showVerifiedLookup, setShowVerifiedLookup] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
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
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
  });

  const { data: activeOpt, refetch: refetchOpt } = useQuery({
    queryKey: ["activeOptimization", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.CollectionOptimization.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
  });

  const pairingsStale =
    !!activePairings &&
    (!activePairings.input_fingerprint || activePairings.input_fingerprint !== currentFingerprint);

  const optStale =
    !!activeOpt && (!activeOpt.input_fingerprint || activeOpt.input_fingerprint !== currentFingerprint);

  const regenPairings = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const result = await regeneratePairingsConsistent({
        pipes,
        blends,
        profile,
        user,
        queryClient,
        activePairings,
        skipIfUpToDate: true,
      });
      setBusy(false);
      return result;
    },
    onSuccess: (result) => {
      refetchPairings();
      invalidateAIQueries(queryClient, user?.email);
      if (result?.skipped) {
        toast.success({t("aiUpdates.alreadyUpToDate","Pairings are already up to date")});
      } else {
        toast.success({t("aiUpdates.regenerateSuccess","Pairings regenerated successfully")});
      }
    },
    onError: () => {
      setBusy(false);
      toast.error({t("aiUpdates.regenerateFailed","Failed to regenerate pairings")});
    },
  });

  const undoPairings = useMutation({
    mutationFn: async () => {
      if (!activePairings?.previous_active_id) return;
      await safeUpdate("PairingMatrix", activePairings.id, { is_active: false }, user?.email);
      await safeUpdate("PairingMatrix", activePairings.previous_active_id, { is_active: true }, user?.email);
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

      const pipe_specializations = (result.applyable_changes || []).map((change) => {
        const p = pipes.find((x) => String(x.id) === String(change.pipe_id));
        let pipeName = p?.name || "Unknown";

        if (change.bowl_variant_id && p?.interchangeable_bowls?.length) {
          const idx = p.interchangeable_bowls.findIndex(
            (b, i) => (b.bowl_variant_id || `bowl_${i}`) === change.bowl_variant_id
          );
          if (idx >= 0 && p.interchangeable_bowls[idx]) {
            pipeName = `${pipeName} - ${p.interchangeable_bowls[idx].name || `Bowl ${idx + 1}`}`;
          }
        }

        return {
          pipe_id: change.pipe_id,
          bowl_variant_id: change.bowl_variant_id ?? null,
          pipe_name: pipeName,
          recommended_blend_types: change.after_focus || [],
          reasoning: change.rationale || "",
          usage_pattern: `Specialized for: ${(change.after_focus || []).join(", ")}`,
        };
      });

      const collection_gaps = {
        missing_coverage: result.collection_gaps || [],
        redundancies: [],
        overall_assessment: result.summary || "",
      };

      const priority_focus_changes = (result.applyable_changes || []).slice(0, 3).map((c, i) => ({
        pipe_id: c.pipe_id,
        pipe_name: pipes.find((p) => String(p.id) === String(c.pipe_id))?.name || "Unknown",
        current_focus: c.before_focus || [],
        recommended_focus: c.after_focus || [],
        score_improvement: `Priority #${i + 1} change`,
        reasoning: c.rationale || "",
      }));

      const next_pipe_recommendations = (result.next_additions || []).slice(0, 3).map((rec, i) => ({
        priority_rank: i + 1,
        reasoning: rec,
        gap_filled: rec,
        chamber_specs: rec,
        budget_range: "Varies",
        score_improvement: "Expected improvement",
      }));

      if (activeOpt?.id) {
        await safeUpdate("CollectionOptimization", activeOpt.id, { is_active: false }, user?.email);
      }

      await base44.entities.CollectionOptimization.create({
        created_by: user.email,
        is_active: true,
        previous_active_id: activeOpt?.id ?? null,
        input_fingerprint: currentFingerprint,
        pipe_specializations,
        collection_gaps,
        priority_focus_changes,
        next_pipe_recommendations,
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
      await safeUpdate("CollectionOptimization", activeOpt.id, { is_active: false }, user?.email);
      await safeUpdate("CollectionOptimization", activeOpt.previous_active_id, { is_active: true }, user?.email);
    },
    onSuccess: () => {
      refetchOpt();
      invalidateAIQueries(queryClient, user?.email);
      toast.success("Optimization reverted to previous version");
    },
    onError: () => toast.error("Failed to undo optimization"),
  });

  // ✅ FIX: Add the missing "Reclassify Blends" card + function to the AI Updates panel
  const reclassifyBlends = useMutation({
    mutationFn: async () => {
      if (!user?.email) return;

      setReclassifyBusy(true);

      const blendsToUpdate = (blends || []).filter(Boolean);
      if (blendsToUpdate.length === 0) {
        toast.info("No blends to reclassify");
        setReclassifyBusy(false);
        return;
      }

      // Keep prompt stable + explicit categories. Treat missing blend_type as Unknown.
      const categories = [
        "American",
        "Aromatic",
        "Balkan",
        "Burley",
        "Burley-based",
        "Cavendish",
        "Codger Blend",
        "Dark Fired Kentucky",
        "English",
        "English Aromatic",
        "English Balkan",
        "Full English/Oriental",
        "Kentucky",
        "Lakeland",
        "Latakia Blend",
        "Navy Flake",
        "Oriental/Turkish",
        "Other",
        "Perique",
        "Shag",
        "Virginia",
        "Virginia/Burley",
        "Virginia/Oriental",
        "Virginia/Perique",
      ];

      const prompt = `Given the expanded tobacco blend classification system, analyze and reclassify these tobacco blends to the most accurate category.

Available categories (alphabetical):
${categories.join(", ")}

Blends to reclassify:
${blendsToUpdate
  .map((b) => `- ${b.name} (current: ${b.blend_type || "Unknown"})`)
  .join("\n")}

Return JSON in the requested schema with updates ONLY for blends that should change categories.`;

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
                  reasoning: { type: "string" },
                },
                required: ["name", "old_type", "new_type"],
              },
            },
          },
        },
      });

      const updates = Array.isArray(result?.updates) ? result.updates : [];
      if (updates.length === 0) {
        toast.info("All blends are already correctly classified");
        setReclassifyBusy(false);
        return;
      }

      // Update by best match: prefer ID match via name, fallback to exact name.
      let changed = 0;

      for (const upd of updates) {
        const blend = blendsToUpdate.find((b) => String(b.name).trim() === String(upd.name).trim());
        if (!blend) continue;

        const current = blend.blend_type || "Unknown";
        const next = upd.new_type;

        if (!next || String(next).trim() === "" || String(next) === String(current)) continue;

        await safeUpdate("TobaccoBlend", blend.id, { blend_type: next }, user?.email);
        changed++;
      }

      // Refresh blends everywhere
      queryClient.invalidateQueries({ queryKey: ["blends", user?.email] });

      if (changed > 0) toast.success(`Reclassified ${changed} blend(s)`);
      else toast.info("No blend changes were applied");

      setReclassifyBusy(false);
    },
    onError: (error) => {
      setReclassifyBusy(false);
      toast.error("Failed to reclassify blends");
      console.error(error);
    },
  });

  const fillMeasurements = useMutation({
    mutationFn: async () => {
      setBusy(true);
      let updatedCount = 0;

      for (const pipe of pipes) {
        const hasMissingMeasurements =
          !pipe.length_mm || !pipe.weight_grams || !pipe.bowl_diameter_mm || !pipe.bowl_depth_mm;

        if (hasMissingMeasurements) {
          try {
            const prompt = `Find verified manufacturer specifications for this pipe to fill missing measurements.

Pipe: ${pipe.maker || "Unknown"} ${pipe.name || "Unknown"}
Shape: ${pipe.shape || "Unknown"}
Existing: ${pipe.length_mm ? `Length: ${pipe.length_mm}mm` : ""} ${
              pipe.weight_grams ? `Weight: ${pipe.weight_grams}g` : ""
            } ${pipe.bowl_diameter_mm ? `Chamber: ${pipe.bowl_diameter_mm}mm` : ""} ${
              pipe.bowl_depth_mm ? `Depth: ${pipe.bowl_depth_mm}mm` : ""
            }

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
                  dimensions_source: { type: ["string", "null"] },
                },
              },
            });

            const updates = {};
            let foundAny = false;

            Object.keys(result || {}).forEach((key) => {
              if (result[key] !== null && result[key] !== undefined && !pipe[key]) {
                updates[key] = result[key];
                if (key !== "dimensions_found" && key !== "dimensions_source") {
                  foundAny = true;
                }
              }
            });

            if (foundAny) {
              await safeUpdate("Pipe", pipe.id, updates, user?.email);
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
      if (count > 0) toast.success(`Updated ${count} pipe(s) with verified measurements`);
      else toast.info("No verified measurements found for your pipes");
    },
    onError: () => {
      setBusy(false);
      toast.error("Failed to fill measurements");
    },
  });

  const anyBusy = busy || reclassifyBusy;

  return (
    <div className="space-y-4">
      {/* ✅ NEW: Reclassify Blends card (this is what was missing) */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start gap-3 mb-3">
          <Tags className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-[#1a2c42]">{t("tobacconist.tobaccoBlendClassification")}</h3>
            <p className="text-sm text-[#1a2c42]/85 mt-1">
              {t("tobacconist.tobaccoBlendClassificationDesc")}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={anyBusy || (blends || []).length === 0}
          onClick={() => reclassifyBlends.mutate()}
          className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
        >
          {reclassifyBusy ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Tags className="w-3 h-3 mr-1" />
          )}
          {t("tobacconist.reclassifyBlends")} ({(blends || []).length} {t("tobacconist.total")})
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start gap-3 mb-3">
          {pairingsStale ? (
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#1a2c42]">Pairing Matrix</h3>
              <InfoTooltip text="Scored compatibility between each pipe and tobacco blend in your collection" className="text-[#1a2c42]/70" />
            </div>
            <p className="text-sm text-[#1a2c42]/85 mt-1">
              {pairingsStale ? (
                <span className="text-amber-700 font-semibold">Out of date - Regeneration recommended</span>
              ) : (
                <span className="text-emerald-700 font-semibold">Up to date</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!activePairings?.previous_active_id || anyBusy}
            onClick={() => undoPairings.mutate()}
            className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50"
          >
            <Undo className="w-3 h-3 mr-1" />
            {t("tobacconist.undo")}
          </Button>
          <Button
            size="sm"
            disabled={anyBusy}
            onClick={() => regenPairings.mutate()}
            className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] text-white"
          >
            {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            {t("tobacconist.regenerate")}
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start gap-3 mb-3">
          {optStale ? (
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#1a2c42]">Collection Optimization</h3>
              <InfoTooltip text="Recommendations for which pipes to focus on specific tobaccos" className="text-[#1a2c42]/70" />
            </div>
            <p className="text-sm text-[#1a2c42]/85 mt-1">
              {optStale ? (
                <span className="text-amber-700 font-semibold">Out of date - Regeneration recommended</span>
              ) : (
                <span className="text-emerald-700 font-semibold">Up to date</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!activeOpt?.previous_active_id || anyBusy}
            onClick={() => undoOpt.mutate()}
            className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50"
          >
            <Undo className="w-3 h-3 mr-1" />
            {t("tobacconist.undo")}
          </Button>
          <Button
            size="sm"
            disabled={anyBusy}
            onClick={() => regenOpt.mutate()}
            className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] text-white"
          >
            {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            {t("tobacconist.regenerate")}
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start gap-3 mb-3">
          <Ruler className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#1a2c42]">{t("tobacconist.analyzePipeGeometry", {defaultValue: "Analyze Pipe Geometry"})}</h3>
              <InfoTooltip text={t("tobacconist.analyzePipeGeometryTooltip", {defaultValue: "Use AI to identify shape, bowl style, and shank characteristics from photos"})} className="text-[#1a2c42]/70" />
            </div>
            <p className="text-sm text-[#1a2c42] mt-1">
              {t("tobacconist.classifyGeometryFromPhotos", {defaultValue: "Classify geometry from photos"})}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            disabled={anyBusy}
            onClick={() => navigate("/AIUpdates?focus=geometry")}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700"
          >
            <Ruler className="w-3 h-3 mr-1" />
            {t("tobacconist.analyzeGeometryFromPhotos")}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVerifiedLookup(!showVerifiedLookup)}
            className="border-gray-300 text-[#1a2c42]"
          >
            <Info className="w-3 h-3 mr-1" />
            {showVerifiedLookup ? t("tobacconist.hide") : t("tobacconist.findVerifiedSpecs")}
          </Button>

          {showVerifiedLookup && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-[#1a2c42]/70 mb-2">
                {t("tobacconist.findSpecsDesc")}
              </p>
              <Button
                size="sm"
                disabled={anyBusy}
                onClick={() => fillMeasurements.mutate()}
                variant="outline"
                className="border-gray-300 text-[#1a2c42] w-full"
              >
                {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Ruler className="w-3 h-3 mr-1" />}
                {t("tobacconist.findSpecs")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#1a2c42]">{t("tobacconist.breakInSchedules", {defaultValue: "Break-In Schedules"})}</h3>
              <InfoTooltip text={t("tobacconist.breakInSchedulesTooltip", {defaultValue: "Progressive tobacco recommendations to break in new pipes properly"})} className="text-[#1a2c42]/70" />
            </div>
            <p className="text-sm text-[#1a2c42] mt-1">
              {t("tobacconist.breakInSchedulesDesc", {defaultValue: "Personalized break-in recommendations generated per pipe"})}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}