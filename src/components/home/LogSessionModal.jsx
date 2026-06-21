import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Info, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInHours } from "date-fns";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries, invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { parseLocalCalendarDate, toLocalDateYmd } from "@/components/utils/schemaCompatibility";
import { saveSession } from "@/components/session/saveSession";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";
import { isAppleBuild } from "@/components/utils/appVariant";
import { sortByLabel } from "@/lib/sorting/alphabetical";
import { hasModuleProAccess } from "@/components/utils/moduleEntitlements";
import ExternalItemSearch from "@/components/session/ExternalItemSearch";
import ExternalItemManualEntry from "@/components/session/ExternalItemManualEntry";
import SessionContextTags from "@/components/session/SessionContextTags";
import PostSessionPrompt from "@/components/session/PostSessionPrompt";
import { QUERY_KEYS } from '@/lib/queryKeys';

const TOBACCO_DENSITY_GCM3 = 0.30;
const BOWL_GEOMETRY_FACTOR = 0.85;

function estimateTobaccoUsage(pipe, bowls) {
  if (!pipe) return 0;
  const numBowls = Number(bowls || 1);
  if (pipe.bowl_diameter_mm > 0 && pipe.bowl_depth_mm > 0) {
    const radiusMm = pipe.bowl_diameter_mm / 2;
    const depthMm = pipe.bowl_depth_mm;
    const volumeMm3 = Math.PI * radiusMm * radiusMm * depthMm;
    const volumeCm3 = (volumeMm3 / 1000) * BOWL_GEOMETRY_FACTOR;
    const gramsPerBowl = volumeCm3 * TOBACCO_DENSITY_GCM3;
    const totalGrams = gramsPerBowl * numBowls;
    return totalGrams * 0.035274;
  }
  const volumeMap = { Small: 0.5, Medium: 0.75, Large: 1.0, "Extra Large": 1.25 };
  const gramsPerBowl = volumeMap[pipe.chamber_volume || "Medium"] || 0.75;
  return gramsPerBowl * numBowls * 0.035274;
}

function ExternalItemChip({ label, onClear }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(180,140,75,0.15)] border border-[rgba(180,140,75,0.3)] text-xs text-[#D4A574] min-w-0">
      <span className="font-medium break-words min-w-0 flex-1">{label}</span>
      <button type="button" onClick={onClear} className="shrink-0 hover:text-white">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

const BLANK_FORM_DATA = {
  pipe_id: "",
  bowl_variant_id: "",
  blend_id: "",
  container_id: "",
  bowls_used: 1,
  is_break_in: false,
  notes: "",
};

export default function LogSessionModal({
  isOpen,
  onClose,
  pipes = [],
  blends = [],
  user: passedUser,
  initialPipeId = "",
  initialBlendId = "",
  isLoading = false,
}) {
  const { t } = useTranslation();
  const { user: currentUser } = useCurrentUser();
  const user = passedUser || currentUser;
  const hasPipekeeperPro = hasModuleProAccess(user, 'pipekeeper');
  const entitlements = useEntitlements();
  const queryClient = useQueryClient();

  const [autoReduceInventory, setAutoReduceInventory] = useState(true);
  const [contextTag, setContextTag] = useState("");
  const [saving, setSaving] = useState(false);

  const [pipeMode, setPipeMode] = useState("collection");
  const [externalPipe, setExternalPipe] = useState(null);
  const [showPipeManual, setShowPipeManual] = useState(false);

  const [blendMode, setBlendMode] = useState("collection");
  const [externalBlend, setExternalBlend] = useState(null);
  const [showBlendManual, setShowBlendManual] = useState(false);

  const [postPromptItems, setPostPromptItems] = useState(null);
  const postPromptPendingRef = useRef(false);

  const [formData, setFormData] = useState({
    ...BLANK_FORM_DATA,
    pipe_id: initialPipeId || "",
    blend_id: initialBlendId || "",
    date: toLocalDateYmd(),
  });

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        pipe_id: initialPipeId || prev.pipe_id,
        blend_id: initialBlendId || prev.blend_id,
      }));
    }
  }, [isOpen, initialPipeId, initialBlendId]);

  useEffect(() => {
    if (postPromptItems === null && postPromptPendingRef.current) {
      postPromptPendingRef.current = false;
      setFormData({ ...BLANK_FORM_DATA, date: toLocalDateYmd() });
      setPipeMode("collection");
      setExternalPipe(null);
      setShowPipeManual(false);
      setBlendMode("collection");
      setExternalBlend(null);
      setShowBlendManual(false);
      setContextTag("");
      setSaving(false);
      onClose?.();
    }
  }, [postPromptItems, onClose]);

  const selectedPipe = (pipes || []).find((p) => p?.id === formData.pipe_id);
  const hasMultipleBowls =
    Array.isArray(selectedPipe?.interchangeable_bowls) &&
    selectedPipe.interchangeable_bowls.length > 0;

  const sortedBlends = useMemo(() => {
    return sortByLabel(blends || [], (item) => item?.name || "");
  }, [blends]);
  const sortedPipes = useMemo(
    () => sortByLabel(pipes || [], (item) => item?.name || ""),
    [pipes]
  );
  const { data: containers = [] } = useQuery({
    queryKey: ["containers", user?.email, formData.blend_id],
    enabled: !!user?.email && !!formData.blend_id && blendMode === "collection",
    queryFn: async () => {
      try {
        return (
          (await base44.entities.TobaccoContainer.filter(
            { user_email: user.email, blend_id: formData.blend_id },
            "-updated_date",
            50
          )) || []
        );
      } catch {
        return [];
      }
    },
  });

  const sortedContainers = useMemo(
    () => sortByLabel(containers || [], (item) => item?.container_name || ""),
    [containers]
  );

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, "-date", 50),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const norm = (s) => (s || "").trim().toLowerCase();
  const scheduleMatches = (item, blendId, blendName) =>
    (item?.blend_id && blendId && item.blend_id === blendId) ||
    (item?.blend_name && blendName && norm(item.blend_name) === norm(blendName));

  const getPipeRestStatus = (pipeId) => {
    const pipeLogs = (recentLogs || [])
      .filter((l) => l && l.pipe_id === pipeId)
      .sort((a, b) => {
        try {
          return parseLocalCalendarDate(b.date).getTime() - parseLocalCalendarDate(a.date).getTime();
        } catch {
          return 0;
        }
      });

    if (pipeLogs.length === 0) return { ready: true, message: t("smokingLog.noUsageLogged") };

    try {
      const lastSmoked = parseLocalCalendarDate(pipeLogs[0].date);
      if (Number.isNaN(lastSmoked.getTime())) return { ready: true, message: t("smokingLog.noUsageLogged") };
      const hoursSince = differenceInHours(new Date(), lastSmoked);
      const daysRested = Math.floor(hoursSince / 24);
      if (hoursSince >= 24) return { ready: true, message: t("smokingLog.restedDays", { days: daysRested }) };
      const hoursLeft = Math.max(0, 24 - hoursSince);
      return { ready: false, message: t("smokingLog.needsHours", { hours: hoursLeft.toFixed(1) }) };
    } catch {
      return { ready: true, message: t("smokingLog.noUsageLogged") };
    }
  };

  const pipeRestStatusMap = useMemo(() => {
    const map = {};
    for (const p of pipes || []) {
      if (p?.id) map[p.id] = getPipeRestStatus(p.id);
    }
    return map;
  }, [pipes, recentLogs]);

  const updateBlendMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate("TobaccoBlend", id, data, user?.email),
    onSuccess: () => invalidateBlendQueries(queryClient, user?.email),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || postPromptItems || postPromptPendingRef.current) return;

    if (entitlements.tier === "free" && (recentLogs || []).length >= entitlements.limits.smokingLogs) {
      toast.error(t("smokingLog.freeLimitReached", { limit: entitlements.limits.smokingLogs }));
      return;
    }

    const pipe =
      pipeMode === "collection"
        ? (pipes || []).find((p) => p && p.id === formData.pipe_id)
        : null;

    const blend =
      blendMode === "collection"
        ? (blends || []).find((b) => b && b.id === formData.blend_id)
        : null;

    if (pipeMode === "collection" && !pipe) {
      toast.error(t("smokingLog.selectBoth"));
      return;
    }
    if (pipeMode === "external" && !externalPipe) {
      toast.error(t("auto.components_home_LogSessionModal.please_select_or_add_an_external_1nvqij"));
      return;
    }
    if (blendMode === "collection" && !blend) {
      toast.error(t("smokingLog.selectBoth"));
      return;
    }
    if (blendMode === "external" && !externalBlend) {
      toast.error(t("auto.components_home_LogSessionModal.please_select_or_add_an_external_1d8y8m"));
      return;
    }

    setSaving(true);

    try {
      const bowls = parseInt(formData.bowls_used, 10) || 1;
      const tobaccoUsed =
        blendMode === "collection"
          ? pipe
            ? estimateTobaccoUsage(pipe, bowls)
            : bowls * 0.75 * 0.035274
          : 0;

      let bowl_name = undefined;
      if (pipeMode === "collection" && formData.bowl_variant_id && hasMultipleBowls) {
        const bowl = selectedPipe?.interchangeable_bowls?.find(
          (b, idx) =>
            (b.bowl_variant_id || `bowl_${idx}`) === formData.bowl_variant_id
        );
        bowl_name = bowl?.name || undefined;
      }



      const savePayload = {
        pipe_id: pipeMode === "collection" ? formData.pipe_id : null,
        blend_id: blendMode === "collection" ? formData.blend_id : null,
        bowl_variant_id:
          pipeMode === "collection" &&
          formData.bowl_variant_id &&
          formData.bowl_variant_id !== "__none__"
            ? formData.bowl_variant_id
            : null,
        container_id:
          blendMode === "collection" &&
          formData.container_id &&
          formData.container_id !== "__none__"
            ? formData.container_id
            : null,
        pipe_name:
          pipeMode === "collection"
            ? pipe?.name || null
            : [externalPipe?.maker, externalPipe?.model || externalPipe?.name]
                .filter(Boolean)
                .join(" ") || "External Pipe",
        blend_name:
          blendMode === "collection"
            ? blend?.name || null
            : externalBlend?.name || "External Blend",
        bowl_name,
        date: toLocalDateYmd(formData.date),
        bowls_used: bowls,
        is_break_in: !!formData.is_break_in,
        notes: [formData.notes, contextTag ? `Context: ${contextTag}` : ""]
          .filter(Boolean)
          .join("\n") || null,

        ...(pipeMode === "external"
          ? {
              external_pipe_name:
                [externalPipe?.maker, externalPipe?.model || externalPipe?.name]
                  .filter(Boolean)
                  .join(" ") || "External Pipe",
              external_pipe_maker: externalPipe?.maker || "",
              external_pipe_shape: externalPipe?.shape || "",
            }
          : {}),

        ...(blendMode === "external"
          ? {
              external_blend_name: externalBlend?.name || "External Blend",
              external_blend_manufacturer: externalBlend?.manufacturer || "",
              external_blend_type: externalBlend?.blend_type || "",
            }
          : {}),
      };

      if (import.meta?.env?.DEV) {
        console.log("[LogSessionModal] save payload:", savePayload);
      }

      const result = await saveSession({
        user,
        session: savePayload,
      });

      if (import.meta?.env?.DEV) {
        console.log("[LogSessionModal] save success:", result);
      }

      if (savePayload.container_id && blendMode === "collection") {
        try {
          const containerRes = await base44.entities.TobaccoContainer.filter({ id: savePayload.container_id });
          const container = containerRes?.[0];
          if (container?.id) {
            const gramsUsed = tobaccoUsed * 28.35;
            await safeUpdate(
              "TobaccoContainer",
              container.id,
              {
                quantity_grams: Math.max(0, Number(container.quantity_grams || 0) - gramsUsed),
                updated_date: new Date().toISOString(),
              },
              user?.email
            );
            queryClient.invalidateQueries({
              queryKey: ["containers", user?.email, savePayload.blend_id],
            });
          }
        } catch (err) {
          console.error("[LogSessionModal] Failed to update container:", err);
        }
      }

      if (autoReduceInventory && tobaccoUsed > 0 && hasPipekeeperPro && blendMode === "collection") {
        const blendToReduce = (blends || []).find((b) => b.id === savePayload.blend_id);
        if (blendToReduce) {
          let remaining = Number(tobaccoUsed);
          const updateData = {};

          // Bulk: reduce from open first, fall back to cellared
          if ((blendToReduce.bulk_open || 0) > 0 && remaining > 0) {
            const toReduce = Math.min(blendToReduce.bulk_open, remaining);
            updateData.bulk_open = Math.max(0, (blendToReduce.bulk_open || 0) - toReduce);
            updateData.bulk_total_quantity_oz = Math.max(
              0,
              (blendToReduce.bulk_total_quantity_oz || 0) - toReduce
            );
            remaining -= toReduce;
          } else if ((blendToReduce.bulk_cellared || 0) > 0 && remaining > 0) {
            const toReduce = Math.min(blendToReduce.bulk_cellared, remaining);
            updateData.bulk_cellared = Math.max(0, (blendToReduce.bulk_cellared || 0) - toReduce);
            updateData.bulk_total_quantity_oz = Math.max(
              0,
              (blendToReduce.bulk_total_quantity_oz || 0) - toReduce
            );
            remaining -= toReduce;
          }

          // Tins: reduce oz from open tin first, fall back to cellared.
          // Only mark a tin as fully consumed when its oz are completely used up.
          // We deduct oz from tin_total_quantity_oz but do NOT remove the tin count
          // unless the entire tin's worth of oz has been consumed.
          if ((blendToReduce.tin_tins_open || 0) > 0 && remaining > 0 && blendToReduce.tin_size_oz) {
            const ozToDeduct = Math.min(remaining, (blendToReduce.tin_tins_open || 0) * (blendToReduce.tin_size_oz || 1));
            updateData.tin_total_quantity_oz = Math.max(
              0,
              (blendToReduce.tin_total_quantity_oz || 0) - ozToDeduct
            );
            // Only remove a tin if its full capacity has been consumed
            const tinsConsumed = Math.floor(ozToDeduct / blendToReduce.tin_size_oz);
            if (tinsConsumed > 0) {
              updateData.tin_tins_open = Math.max(0, (blendToReduce.tin_tins_open || 0) - tinsConsumed);
              updateData.tin_total_tins = Math.max(0, (blendToReduce.tin_total_tins || 0) - tinsConsumed);
            }
            remaining -= ozToDeduct;
          } else if ((blendToReduce.tin_tins_cellared || 0) > 0 && remaining > 0 && blendToReduce.tin_size_oz) {
            const ozToDeduct = Math.min(remaining, (blendToReduce.tin_tins_cellared || 0) * (blendToReduce.tin_size_oz || 1));
            updateData.tin_total_quantity_oz = Math.max(
              0,
              (blendToReduce.tin_total_quantity_oz || 0) - ozToDeduct
            );
            const tinsConsumed = Math.floor(ozToDeduct / blendToReduce.tin_size_oz);
            if (tinsConsumed > 0) {
              updateData.tin_tins_cellared = Math.max(0, (blendToReduce.tin_tins_cellared || 0) - tinsConsumed);
              updateData.tin_total_tins = Math.max(0, (blendToReduce.tin_total_tins || 0) - tinsConsumed);
            }
          }

          if (Object.keys(updateData).length > 0) {
            try {
              await updateBlendMutation.mutateAsync({ id: blendToReduce.id, data: updateData });
            } catch (err) {
              console.error("[LogSessionModal] Failed to update blend inventory:", err);
            }
          }
        }
      }

      if (savePayload.is_break_in && savePayload.pipe_id && savePayload.blend_id && pipeMode === "collection") {
        try {
          const freshPipes = await base44.entities.Pipe.filter({ id: savePayload.pipe_id });
          const freshPipe = freshPipes?.[0];
          if (freshPipe?.id) {
            const bowlsToAdd = Number(savePayload.bowls_used || 1);
            const schedule = Array.isArray(freshPipe.break_in_schedule) ? freshPipe.break_in_schedule : [];
            const resolvedBlendName =
              savePayload.blend_name ||
              (blends || []).find((b) => b.id === savePayload.blend_id)?.name ||
              "";

            const matchIndex = schedule.findIndex((item) =>
              scheduleMatches(item, savePayload.blend_id, resolvedBlendName)
            );

            let updatedSchedule;
            if (matchIndex >= 0) {
              updatedSchedule = schedule.map((item, idx) =>
                idx !== matchIndex
                  ? item
                  : { ...item, bowls_completed: (item.bowls_completed || 0) + bowlsToAdd }
              );
            } else {
              updatedSchedule = [
                ...schedule,
                {
                  blend_id: savePayload.blend_id,
                  blend_name: resolvedBlendName || t("common.unknownBlend"),
                  suggested_bowls: 5,
                  bowls_completed: bowlsToAdd,
                  reasoning: t("smokingLog.autoAddedReasoning"),
                },
              ];
            }

            await safeUpdate("Pipe", freshPipe.id, { break_in_schedule: updatedSchedule }, user?.email);
            invalidatePipeQueries(queryClient, user?.email);
            queryClient.invalidateQueries({ queryKey: ["pipe", savePayload.pipe_id] });
          }
        } catch (err) {
          console.error("[LogSessionModal] Failed to update break-in schedule:", err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["smoking-logs"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.smokingLogsSummary(user?.email) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipeSummary(user?.email) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blendSummary(user?.email) });
      invalidateBlendQueries(queryClient, user?.email);

      const externalItems = [];
      if (blendMode === "external" && externalBlend) {
        externalItems.push({
          label: externalBlend.name || "Unknown Blend",
          item_type: "blend",
          itemData: externalBlend,
        });
      }
      if (pipeMode === "external" && externalPipe) {
        externalItems.push({
          label:
            [externalPipe.maker, externalPipe.model || externalPipe.name]
              .filter(Boolean)
              .join(" ") || "Unknown Pipe",
          item_type: "pipe",
          itemData: externalPipe,
        });
      }

      if (import.meta?.env?.DEV) {
        console.log("[LogSessionModal] external items:", externalItems.length);
      }

      toast.success(t("smokingLog.logSession") + " " + t("common.saved"));

      if (externalItems.length > 0) {
        postPromptPendingRef.current = true;
        setTimeout(() => {
          setPostPromptItems(externalItems);
        }, 0);
        setSaving(false);
        return;
      }

      setFormData({ ...BLANK_FORM_DATA, date: toLocalDateYmd() });
      setPipeMode("collection");
      setExternalPipe(null);
      setShowPipeManual(false);
      setBlendMode("collection");
      setExternalBlend(null);
      setShowBlendManual(false);
      setContextTag("");
      setSaving(false);
      onClose?.();
    } catch (err) {
      console.error("[LogSessionModal] save failed:", err);
      toast.error(t("auto.components_home_LogSessionModal.failed_to_log_session_mcou4z"));
      setSaving(false);
    }
  };

  if (isAppleBuild) return null;

  return (
    <>
      {postPromptItems && (
        <PostSessionPrompt
          externalItems={postPromptItems}
          onDone={() => {
            setPostPromptItems(null);
          }}
        />
      )}

      <Sheet
        open={isOpen && !postPromptItems}
        onOpenChange={(open) => {
          if (!open && !saving && !postPromptPendingRef.current && !postPromptItems) {
            onClose?.();
          }
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t("auto.components_home_LogSessionModal.log_pipe_session_67r2ah")}</SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 gap-4">
              <div aria-hidden="true" className="w-8 h-8 border-2 border-[#A35C5C] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#E0D8C8]/60">{t("auto.components_home_LogSessionModal.loading_your_collection_9hxt7o")}</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <div>
                <Label className="text-[#E0D8C8] text-sm font-semibold block mb-2">{t("auto.components_home_LogSessionModal.pipe_source_1neva1")}</Label>
                <div className="flex rounded-xl overflow-hidden border border-[rgba(180,140,75,0.25)]">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setPipeMode("collection");
                      setExternalPipe(null);
                      setFormData((f) => ({ ...f, pipe_id: "", bowl_variant_id: "" }));
                    }}
                    className={`flex-1 py-2 text-sm font-medium transition-all ${
                      pipeMode === "collection"
                        ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                        : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                    } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {t("auto.components_home_LogSessionModal.from_collection_ffgfol")}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setPipeMode("external");
                      setFormData((f) => ({ ...f, pipe_id: "", bowl_variant_id: "" }));
                    }}
                    className={`flex-1 py-2 text-sm font-medium transition-all ${
                      pipeMode === "external"
                        ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                        : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                    } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {t("auto.components_home_LogSessionModal.other_pipe_199rls")}
                  </button>
                </div>
              </div>

              {pipeMode === "collection" ? (
                <>
                  <Select
                    value={formData.pipe_id}
                    onValueChange={(v) => setFormData({ ...formData, pipe_id: v, bowl_variant_id: "" })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("smokingLog.selectPipe")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedPipes.map((p) => {
                        const restStatus = pipeRestStatusMap[p.id] || { ready: true, message: "" };
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2 w-full">
                              <span>{p.name}</span>
                              {restStatus.ready ? (
                                <CheckCircle className="w-3 h-3 text-green-600 ml-auto" />
                              ) : (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  {t("smokingLog.resting")}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formData.pipe_id && (
                    <Alert className="mt-2">
                      <Info className="w-4 h-4" />
                      <AlertDescription className="text-xs">
                        {(pipeRestStatusMap[formData.pipe_id] || {}).message}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : externalPipe ? (
                <ExternalItemChip
                  label={
                    [externalPipe.maker, externalPipe.model || externalPipe.name]
                      .filter(Boolean)
                      .join(" ") || "External Pipe"
                  }
                  onClear={() => {
                    setExternalPipe(null);
                    setShowPipeManual(false);
                  }}
                />
              ) : showPipeManual ? (
                <ExternalItemManualEntry
                  itemType="pipe"
                  onCancel={() => setShowPipeManual(false)}
                  onSave={(item) => {
                    setExternalPipe(item);
                    setShowPipeManual(false);
                  }}
                />
              ) : (
                <>
                  <ExternalItemSearch
                    itemType="pipe"
                    onSelect={setExternalPipe}
                    onManualAdd={() => setShowPipeManual(true)}
                  />
                  <p className="text-xs text-amber-400/80 mt-1">
                    {t("auto.components_home_LogSessionModal.select_a_search_result_or_add_k1aoum")}
                  </p>
                </>
              )}
            </div>

            {pipeMode === "collection" && hasMultipleBowls && (
              <div className="space-y-2">
                <Label className="text-[#E0D8C8]">{t("smokingLog.bowlUsed")}</Label>
                <Select
                  value={formData.bowl_variant_id}
                  onValueChange={(v) => setFormData({ ...formData, bowl_variant_id: v })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("smokingLog.selectBowl")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("smokingLog.noSpecificBowl")}</SelectItem>
                    {(selectedPipe?.interchangeable_bowls || []).map((bowl, idx) => {
                      const bowlId = bowl.bowl_variant_id || `bowl_${idx}`;
                      return (
                        <SelectItem key={bowlId} value={bowlId}>
                          {bowl.name || t("smokingLog.bowlNumber", { number: idx + 1 })}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-[#E0D8C8] text-sm font-semibold block mb-2">{t("auto.components_home_LogSessionModal.blend_source_14qqei")}</Label>
                <div className="flex rounded-xl overflow-hidden border border-[rgba(180,140,75,0.25)]">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBlendMode("collection");
                      setExternalBlend(null);
                      setFormData((f) => ({ ...f, blend_id: "", container_id: "" }));
                    }}
                    className={`flex-1 py-2 text-sm font-medium transition-all ${
                      blendMode === "collection"
                        ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                        : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                    } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {t("auto.components_home_LogSessionModal.from_collection_ffgfol")}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBlendMode("external");
                      setFormData((f) => ({ ...f, blend_id: "", container_id: "" }));
                    }}
                    className={`flex-1 py-2 text-sm font-medium transition-all ${
                      blendMode === "external"
                        ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                        : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                    } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {t("auto.components_home_LogSessionModal.something_new_92ctod")}
                  </button>
                </div>
              </div>

              {blendMode === "collection" ? (
                <Select
                  value={formData.blend_id}
                  onValueChange={(v) => setFormData({ ...formData, blend_id: v, container_id: "" })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("smokingLog.selectBlend")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedBlends.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : externalBlend ? (
                <ExternalItemChip
                  label={externalBlend.name || "External Blend"}
                  onClear={() => {
                    setExternalBlend(null);
                    setShowBlendManual(false);
                  }}
                />
              ) : showBlendManual ? (
                <ExternalItemManualEntry
                  itemType="blend"
                  onCancel={() => setShowBlendManual(false)}
                  onSave={(item) => {
                    setExternalBlend(item);
                    setShowBlendManual(false);
                  }}
                />
              ) : (
                <>
                  <ExternalItemSearch
                    itemType="blend"
                    onSelect={setExternalBlend}
                    onManualAdd={() => setShowBlendManual(true)}
                  />
                  <p className="text-xs text-amber-400/80 mt-1">
                    {t("auto.components_home_LogSessionModal.select_a_search_result_or_add_k1aoum")}
                  </p>
                </>
              )}
            </div>

            {blendMode === "collection" && formData.blend_id && containers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[#E0D8C8]">{t("smokingLog.container")}</Label>
                <Select
                  value={formData.container_id || ""}
                  onValueChange={(v) => setFormData({ ...formData, container_id: v })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("smokingLog.autoNone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("smokingLog.autoNone")}</SelectItem>
                    {sortedContainers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.container_name} — {c.quantity_grams ?? 0}g
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">{t("smokingLog.numberOfBowls")}</Label>
              <Input
                type="number"
                min="1"
                value={formData.bowls_used}
                onChange={(e) => setFormData({ ...formData, bowls_used: e.target.value })}
                disabled={saving}
              />
              {pipeMode === "collection" && formData.pipe_id && formData.bowls_used && (
                <p className="text-xs text-[#A4B0C4]">
                  {t("smokingLog.estUsage")}: ~
                  {Number(
                    estimateTobaccoUsage(selectedPipe, parseInt(formData.bowls_used) || 1)
                  ).toFixed(2)}{" "}
                  {t("units.oz")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">{t("smokingLog.date")}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={saving}
              />
            </div>

            <SessionContextTags value={contextTag} onChange={setContextTag} />

            <div className="space-y-3">
              {pipeMode === "collection" && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.is_break_in}
                    onCheckedChange={(v) => setFormData({ ...formData, is_break_in: v })}
                    disabled={saving}
                  />
                  <Label className="text-[#E0D8C8]">{t("smokingLog.partOfBreakIn")}</Label>
                </div>
              )}

              {blendMode === "collection" && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={autoReduceInventory}
                    onCheckedChange={setAutoReduceInventory}
                    disabled={saving}
                  />
                  <Label className="flex items-center gap-2 text-[#E0D8C8]">
                    {t("smokingLog.autoReduce")}
                    <Badge className="bg-[#A35C5C] text-[#F3EBDD] text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      {t("subscription.premium")}
                    </Badge>
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">{t("smokingLog.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("smokingLog.notesPlaceholder")}
                rows={3}
                disabled={saving}
              />
            </div>

            {(() => {
              const msgs = [];
              if (pipeMode === "collection" && !formData.pipe_id) msgs.push("Select a pipe from your collection to continue.");
              if (pipeMode === "external" && !externalPipe) msgs.push("Select a search result or add the pipe manually to continue.");
              if (blendMode === "collection" && !formData.blend_id) msgs.push("Select a blend from your collection to continue.");
              if (blendMode === "external" && !externalBlend) msgs.push("Select a search result or add the blend manually to continue.");

              if (msgs.length === 0) return null;

              return (
                <div
                  className="rounded-xl px-3 py-2.5 space-y-1"
                  style={{
                    background: "rgba(180,140,75,0.10)",
                    border: "1px solid rgba(180,140,75,0.22)",
                  }}
                >
                  {msgs.map((m) => (
                    <p key={m} className="text-xs" style={{ color: "rgba(212,165,116,0.9)" }}>
                      ⚠ {m}
                    </p>
                  ))}
                </div>
              );
            })()}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  saving ||
                  (pipeMode === "collection" && !formData.pipe_id) ||
                  (pipeMode === "external" && !externalPipe) ||
                  (blendMode === "collection" && !formData.blend_id) ||
                  (blendMode === "external" && !externalBlend)
                }
              >
                {saving ? "Saving..." : t("smokingLog.logSession")}
              </Button>
            </div>
          </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}