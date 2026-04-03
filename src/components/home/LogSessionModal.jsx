import React, { useEffect, useMemo, useState } from "react";
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
import { prepareLogData, parseLocalCalendarDate, toLocalDateYmd } from "@/components/utils/schemaCompatibility";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";
import { isAppleBuild } from "@/components/utils/appVariant";
import ExternalItemSearch from "@/components/session/ExternalItemSearch";
import ExternalItemManualEntry from "@/components/session/ExternalItemManualEntry";
import SessionContextTags from "@/components/session/SessionContextTags";
import PostSessionPrompt from "@/components/session/PostSessionPrompt";

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
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(180,140,75,0.15)] border border-[rgba(180,140,75,0.3)] text-xs text-[#D4A574]">
      <span className="font-medium truncate max-w-[160px]">{label}</span>
      <button type="button" onClick={onClear} className="shrink-0 hover:text-white">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function LogSessionModal({ isOpen, onClose, pipes = [], blends = [], user, initialPipeId = "", initialBlendId = "" }) {
  const { t } = useTranslation();
  const { hasPaid } = useCurrentUser();
  const entitlements = useEntitlements();
  const queryClient = useQueryClient();

  const [autoReduceInventory, setAutoReduceInventory] = useState(true);
  const [contextTag, setContextTag] = useState("");
  const [saving, setSaving] = useState(false);
  const postPromptPendingRef = React.useRef(false);

  const [pipeMode, setPipeMode] = useState("collection");
  const [externalPipe, setExternalPipe] = useState(null);
  const [showPipeManual, setShowPipeManual] = useState(false);

  const [blendMode, setBlendMode] = useState("collection");
  const [externalBlend, setExternalBlend] = useState(null);
  const [showBlendManual, setShowBlendManual] = useState(false);

  const [postPromptItems, setPostPromptItems] = useState(null);

  const [formData, setFormData] = useState({
    pipe_id: initialPipeId || "",
    bowl_variant_id: "",
    blend_id: initialBlendId || "",
    container_id: "",
    bowls_used: 1,
    is_break_in: false,
    date: toLocalDateYmd(),
    notes: "",
  });

  React.useEffect(() => {
    if (isOpen && (initialPipeId || initialBlendId)) {
      setFormData((prev) => ({
        ...prev,
        pipe_id: initialPipeId || prev.pipe_id,
        blend_id: initialBlendId || prev.blend_id,
      }));
    }
  }, [isOpen, initialPipeId, initialBlendId]);

  const selectedPipe = (pipes || []).find((p) => p && p.id === formData.pipe_id);
  const hasMultipleBowls = Array.isArray(selectedPipe?.interchangeable_bowls) && selectedPipe.interchangeable_bowls.length > 0;

  const sortedBlends = useMemo(() => {
    return [...(blends || [])].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base", numeric: true })
    );
  }, [blends]);

  const { data: containers = [] } = useQuery({
    queryKey: ["containers", user?.email, formData.blend_id],
    enabled: !!user?.email && !!formData.blend_id && blendMode === "collection",
    queryFn: async () => {
      try {
        return (await base44.entities.TobaccoContainer.filter({ user_email: user.email, blend_id: formData.blend_id }, "-updated_date", 50)) || [];
      } catch { return []; }
    },
  });

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
    const pipeLogs = (recentLogs || []).filter((l) => l && l.pipe_id === pipeId).sort((a, b) => {
      try { return parseLocalCalendarDate(b.date).getTime() - parseLocalCalendarDate(a.date).getTime(); } catch { return 0; }
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
    } catch { return { ready: true, message: t("smokingLog.noUsageLogged") }; }
  };

  const pipeRestStatusMap = useMemo(() => {
    const map = {};
    for (const p of pipes || []) { if (p?.id) map[p.id] = getPipeRestStatus(p.id); }
    return map;
  }, [pipes, recentLogs]);

  const updateBlendMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate("TobaccoBlend", id, data, user?.email),
    onSuccess: () => invalidateBlendQueries(queryClient, user?.email),
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.SmokingLog.create(data),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // prevent duplicate saves on repeated quick clicks

    // ── STEP 1: Validate form (before setting saving=true) ───────────────
    if (entitlements.tier === "free") {
      if ((recentLogs || []).length >= entitlements.limits.smokingLogs) {
        toast.error(t("smokingLog.freeLimitReached", { limit: entitlements.limits.smokingLogs }));
        return;
      }
    }

    const pipe = pipeMode === "collection" ? (pipes || []).find((p) => p && p.id === formData.pipe_id) : null;
    const blend = blendMode === "collection" ? (blends || []).find((b) => b && b.id === formData.blend_id) : null;

    if (pipeMode === "collection" && !pipe) { toast.error(t("smokingLog.selectBoth")); return; }
    if (pipeMode === "external" && !externalPipe) { toast.error("Please select or add an external pipe."); return; }
    if (blendMode === "collection" && !blend) { toast.error(t("smokingLog.selectBoth")); return; }
    if (blendMode === "external" && !externalBlend) { toast.error("Please select or add an external blend."); return; }

    setSaving(true);

    try {
      const bowls = parseInt(formData.bowls_used) || 1;
      let tobaccoUsed = 0;
      if (blendMode === "collection") {
        tobaccoUsed = pipe ? estimateTobaccoUsage(pipe, bowls) : (bowls * 0.75 * 0.035274);
      }

      let bowl_name = null;
      if (pipeMode === "collection" && formData.bowl_variant_id && hasMultipleBowls) {
        const bowl = selectedPipe.interchangeable_bowls.find(
          (b) => (b.bowl_variant_id || `bowl_${selectedPipe.interchangeable_bowls.indexOf(b)}`) === formData.bowl_variant_id
        );
        bowl_name = bowl?.name || null;
      }

      const pipe_name = pipeMode === "collection" ? pipe.name : ([externalPipe.maker, externalPipe.model].filter(Boolean).join(" ") || "External Pipe");
      const blend_name = blendMode === "collection" ? blend.name : (externalBlend.name || "External Blend");

      // Destructure id fields out so they can be conditionally re-added below,
      // preventing null values from being sent when an external item is selected.
      const { pipe_id: formPipeId, blend_id: formBlendId, ...restFormData } = formData;

      const logData = prepareLogData({
        ...restFormData,
        ...(pipeMode === "collection" && formPipeId ? { pipe_id: formPipeId } : {}),
        ...(blendMode === "collection" && formBlendId ? { blend_id: formBlendId } : {}),
        pipe_name,
        blend_name,
        bowl_name,
        date: toLocalDateYmd(formData.date),
        bowls_used: bowls,
        tobaccoUsed,
        container_id: blendMode === "collection" ? (formData.container_id || null) : null,
        notes: [
          formData.notes,
          contextTag ? `Context: ${contextTag}` : "",
        ].filter(Boolean).join("\n"),
        ...(pipeMode === "external" && externalPipe ? {
          external_pipe_name: [externalPipe.maker, externalPipe.model || externalPipe.name].filter(Boolean).join(" ") || pipe_name,
          external_pipe_maker: externalPipe.maker || "",
          external_pipe_shape: externalPipe.shape || "",
        } : {}),
        ...(blendMode === "external" && externalBlend ? {
          external_blend_name: externalBlend.name || blend_name,
          external_blend_manufacturer: externalBlend.manufacturer || "",
          external_blend_type: externalBlend.blend_type || "",
        } : {}),
      });

      // ── STEP 2: Build payload ────────────────────────────────────────────
      if (import.meta.env.DEV) {
        console.log("[LogSessionModal] submitting payload:", logData);
      }

      // ── STEP 3: Save SmokingLog ──────────────────────────────────────────
      await createLogMutation.mutateAsync(logData);

      if (import.meta.env.DEV) {
        console.log("[LogSessionModal] save success");
      }

      // ── STEP 4: Run post-save updates ────────────────────────────────────
      // Container deduction (owned blend only)
      if (logData.container_id && blendMode === "collection") {
        try {
          const containerRes = await base44.entities.TobaccoContainer.filter({ id: logData.container_id });
          const container = containerRes?.[0];
          if (container?.id) {
            const gramsUsed = logData.tobaccoUsed * 28.35;
            await safeUpdate("TobaccoContainer", container.id, {
              quantity_grams: Math.max(0, Number(container.quantity_grams || 0) - gramsUsed),
              updated_date: new Date().toISOString(),
            }, user?.email);
            queryClient.invalidateQueries({ queryKey: ["containers", user?.email, logData.blend_id] });
          }
        } catch (err) { console.error("[LogSessionModal] Failed to update container:", err); }
      }

      // Auto-reduce inventory only for owned blends
      if (autoReduceInventory && logData.tobaccoUsed > 0 && hasPaid && blendMode === "collection") {
        const blendToReduce = (blends || []).find((b) => b.id === logData.blend_id);
        if (blendToReduce) {
          let remaining = Number(logData.tobaccoUsed);
          const updateData = {};
          if ((blendToReduce.bulk_open || 0) > 0 && remaining > 0) {
            const toReduce = Math.min(blendToReduce.bulk_open, remaining);
            updateData.bulk_open = Math.max(0, (blendToReduce.bulk_open || 0) - toReduce);
            updateData.bulk_total_quantity_oz = Math.max(0, (blendToReduce.bulk_total_quantity_oz || 0) - toReduce);
            remaining -= toReduce;
          }
          if ((blendToReduce.tin_tins_open || 0) > 0 && remaining > 0 && blendToReduce.tin_size_oz) {
            const tinsToOpen = Math.ceil(remaining / blendToReduce.tin_size_oz);
            const actualTinReduction = Math.min(tinsToOpen, blendToReduce.tin_tins_open);
            const actualOzReduction = Math.min(actualTinReduction * blendToReduce.tin_size_oz, remaining);
            updateData.tin_tins_open = Math.max(0, (blendToReduce.tin_tins_open || 0) - actualTinReduction);
            updateData.tin_total_tins = Math.max(0, (blendToReduce.tin_total_tins || 0) - actualTinReduction);
            updateData.tin_total_quantity_oz = Math.max(0, (blendToReduce.tin_total_quantity_oz || 0) - actualOzReduction);
            remaining -= actualOzReduction;
          }
          if (Object.keys(updateData).length > 0) {
            try { await updateBlendMutation.mutateAsync({ id: blendToReduce.id, data: updateData }); }
            catch (err) { console.error("[LogSessionModal] Failed to update blend inventory:", err); }
          }
        }
      }

      // Break-in update (only for owned pipe)
      if (logData.is_break_in && logData.pipe_id && logData.blend_id && pipeMode === "collection") {
        try {
          const freshPipes = await base44.entities.Pipe.filter({ id: logData.pipe_id });
          const freshPipe = freshPipes[0];
          if (freshPipe?.id) {
            const bowlsToAdd = Number(logData.bowls_used || 1);
            const schedule = Array.isArray(freshPipe.break_in_schedule) ? freshPipe.break_in_schedule : [];
            const resolvedBlendName = logData.blend_name || (blends || []).find((b) => b.id === logData.blend_id)?.name || "";
            const matchIndex = schedule.findIndex((item) => scheduleMatches(item, logData.blend_id, resolvedBlendName));
            let updatedSchedule;
            if (matchIndex >= 0) {
              updatedSchedule = schedule.map((item, idx) =>
                idx !== matchIndex ? item : { ...item, bowls_completed: (item.bowls_completed || 0) + bowlsToAdd }
              );
            } else {
              updatedSchedule = [...schedule, { blend_id: logData.blend_id, blend_name: resolvedBlendName || t("common.unknownBlend"), suggested_bowls: 5, bowls_completed: bowlsToAdd, reasoning: t("smokingLog.autoAddedReasoning") }];
            }
            await safeUpdate("Pipe", freshPipe.id, { break_in_schedule: updatedSchedule }, user?.email);
            invalidatePipeQueries(queryClient, user?.email);
            queryClient.invalidateQueries({ queryKey: ["pipe", logData.pipe_id] });
          }
        } catch (err) { console.error("[LogSessionModal] Failed to update break-in schedule:", err); }
      }

      queryClient.invalidateQueries({ queryKey: ["smoking-logs"] });
      invalidateBlendQueries(queryClient, user?.email);

      // ── STEP 5: Build external items for Want List prompt ─────────────────
      const externalItems = [];
      if (blendMode === "external" && externalBlend) {
        externalItems.push({ label: externalBlend.name || "Unknown Blend", item_type: "blend", itemData: externalBlend });
      }
      if (pipeMode === "external" && externalPipe) {
        const pipeLabel = [externalPipe.maker, externalPipe.model].filter(Boolean).join(" ") || "Unknown Pipe";
        externalItems.push({ label: pipeLabel, item_type: "pipe", itemData: externalPipe });
      }

      if (import.meta.env.DEV) {
        console.log("[LogSessionModal] external items count:", externalItems.length);
      }

      toast.success(t("smokingLog.logSession") + " " + t("common.saved", { defaultValue: "saved" }));

      // Reset form state
      setFormData({ pipe_id: "", bowl_variant_id: "", blend_id: "", container_id: "", bowls_used: 1, is_break_in: false, date: toLocalDateYmd(), notes: "" });
      setPipeMode("collection");
      setExternalPipe(null);
      setShowPipeManual(false);
      setBlendMode("collection");
      setExternalBlend(null);
      setShowBlendManual(false);
      setContextTag("");

      // ── STEP 6: Show PostSessionPrompt or close modal cleanly ────────────
      if (externalItems.length > 0) {
        if (import.meta.env.DEV) {
          console.log("[LogSessionModal] opening PostSessionPrompt for", externalItems.length, "item(s)");
        }
        postPromptPendingRef.current = true;
        setPostPromptItems(externalItems);
      } else {
        if (import.meta.env.DEV) {
          console.log("[LogSessionModal] closing modal cleanly");
        }
        onClose();
      }
    } catch (err) {
      console.error("[LogSessionModal] Session save error:", err);
      toast.error("Failed to log session");
    } finally {
      setSaving(false);
    }
  };

  if (isAppleBuild) return null;

  return (
    <>
      {postPromptItems && (
        <PostSessionPrompt
          externalItems={postPromptItems}
          onDone={() => { postPromptPendingRef.current = false; setPostPromptItems(null); onClose(); }}
        />
      )}
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open && !saving && !postPromptPendingRef.current) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="mb-6">
        <SheetTitle>Log Pipe Session</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── PIPE ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-[#E0D8C8] text-sm font-semibold block mb-2">Pipe Source</Label>
              <div className="flex rounded-xl overflow-hidden border border-[rgba(180,140,75,0.25)]">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setPipeMode("collection"); setExternalPipe(null); setFormData((f) => ({ ...f, pipe_id: "", bowl_variant_id: "" })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    pipeMode === "collection"
                      ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                      : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  From Collection
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setPipeMode("external"); setFormData((f) => ({ ...f, pipe_id: "", bowl_variant_id: "" })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    pipeMode === "external"
                      ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                      : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Other Pipe
                </button>
              </div>
            </div>

            {pipeMode === "collection" ? (
              <>
                <Select value={formData.pipe_id} onValueChange={(v) => setFormData({ ...formData, pipe_id: v, bowl_variant_id: "" })} disabled={saving}>
                  <SelectTrigger><SelectValue placeholder={t("smokingLog.selectPipe")} /></SelectTrigger>
                  <SelectContent>
                    {(pipes || []).map((p) => {
                      const restStatus = pipeRestStatusMap[p.id] || { ready: true, message: "" };
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2 w-full">
                            <span>{p.name}</span>
                            {restStatus.ready
                              ? <CheckCircle className="w-3 h-3 text-green-600 ml-auto" />
                              : <Badge variant="outline" className="text-xs ml-auto">{t("smokingLog.resting")}</Badge>
                            }
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {formData.pipe_id && (
                  <Alert className="mt-2">
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-xs">{(pipeRestStatusMap[formData.pipe_id] || {}).message}</AlertDescription>
                  </Alert>
                )}
              </>
            ) : externalPipe ? (
              <ExternalItemChip label={[externalPipe.maker, externalPipe.model || externalPipe.name].filter(Boolean).join(" ") || "External Pipe"} onClear={() => { setExternalPipe(null); setShowPipeManual(false); }} />
            ) : showPipeManual ? (
              <ExternalItemManualEntry
                itemType="pipe"
                onCancel={() => setShowPipeManual(false)}
                onSave={(item) => { setExternalPipe(item); setShowPipeManual(false); }}
              />
            ) : (
              <>
                <ExternalItemSearch itemType="pipe" onSelect={setExternalPipe} onManualAdd={() => setShowPipeManual(true)} />
                <p className="text-xs text-amber-400/80 mt-1">Select a search result or add the item manually to continue.</p>
              </>
            )}
          </div>

          {/* Bowl variant (only if owned pipe with multiple bowls) */}
          {pipeMode === "collection" && hasMultipleBowls && (
            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">{t("smokingLog.bowlUsed")}</Label>
              <Select value={formData.bowl_variant_id} onValueChange={(v) => setFormData({ ...formData, bowl_variant_id: v })} disabled={saving}>
                <SelectTrigger><SelectValue placeholder={t("smokingLog.selectBowl")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("smokingLog.noSpecificBowl")}</SelectItem>
                  {(selectedPipe?.interchangeable_bowls || []).map((bowl, idx) => {
                    const bowlId = bowl.bowl_variant_id || `bowl_${idx}`;
                    return <SelectItem key={bowlId} value={bowlId}>{bowl.name || t("smokingLog.bowlNumber", { number: idx + 1 })}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── BLEND ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-[#E0D8C8] text-sm font-semibold block mb-2">Blend Source</Label>
              <div className="flex rounded-xl overflow-hidden border border-[rgba(180,140,75,0.25)]">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setBlendMode("collection"); setExternalBlend(null); setFormData((f) => ({ ...f, blend_id: "", container_id: "" })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    blendMode === "collection"
                      ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                      : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  From Collection
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setBlendMode("external"); setFormData((f) => ({ ...f, blend_id: "", container_id: "" })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    blendMode === "external"
                      ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                      : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Something New
                </button>
              </div>
            </div>

            {blendMode === "collection" ? (
              <Select value={formData.blend_id} onValueChange={(v) => setFormData({ ...formData, blend_id: v, container_id: "" })} disabled={saving}>
                <SelectTrigger><SelectValue placeholder={t("smokingLog.selectBlend")} /></SelectTrigger>
                <SelectContent>
                  {sortedBlends.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : externalBlend ? (
              <ExternalItemChip label={externalBlend.name || "External Blend"} onClear={() => { setExternalBlend(null); setShowBlendManual(false); }} />
            ) : showBlendManual ? (
              <ExternalItemManualEntry
                itemType="blend"
                onCancel={() => setShowBlendManual(false)}
                onSave={(item) => { setExternalBlend(item); setShowBlendManual(false); }}
              />
            ) : (
              <>
                <ExternalItemSearch itemType="blend" onSelect={setExternalBlend} onManualAdd={() => setShowBlendManual(true)} />
                <p className="text-xs text-amber-400/80 mt-1">Select a search result or add the item manually to continue.</p>
              </>
            )}
          </div>

          {/* Container (owned blend only) */}
          {blendMode === "collection" && formData.blend_id && containers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">{t("smokingLog.container")}</Label>
              <Select value={formData.container_id || ""} onValueChange={(v) => setFormData({ ...formData, container_id: v })} disabled={saving}>
                <SelectTrigger><SelectValue placeholder={t("smokingLog.autoNone")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("smokingLog.autoNone")}</SelectItem>
                  {containers.map((c) => <SelectItem key={c.id} value={c.id}>{c.container_name} — {c.quantity_grams ?? 0}g</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bowls used */}
          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">{t("smokingLog.numberOfBowls")}</Label>
            <Input type="number" min="1" value={formData.bowls_used} onChange={(e) => setFormData({ ...formData, bowls_used: e.target.value })} disabled={saving} />
            {pipeMode === "collection" && formData.pipe_id && formData.bowls_used && (
              <p className="text-xs text-[#A4B0C4]">
                {t("smokingLog.estUsage")}: ~{Number(estimateTobaccoUsage(selectedPipe, parseInt(formData.bowls_used) || 1)).toFixed(2)} {t("units.oz")}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">{t("smokingLog.date")}</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} disabled={saving} />
          </div>

          {/* Context tags */}
          <SessionContextTags value={contextTag} onChange={setContextTag} />

          {/* Toggles */}
          <div className="space-y-3">
            {pipeMode === "collection" && (
              <div className="flex items-center gap-3">
                <Switch checked={formData.is_break_in} onCheckedChange={(v) => setFormData({ ...formData, is_break_in: v })} disabled={saving} />
                <Label className="text-[#E0D8C8]">{t("smokingLog.partOfBreakIn")}</Label>
              </div>
            )}
            {blendMode === "collection" && (
              <div className="flex items-center gap-3">
                <Switch checked={autoReduceInventory} onCheckedChange={setAutoReduceInventory} disabled={saving} />
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

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">{t("smokingLog.notes")}</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={t("smokingLog.notesPlaceholder")} rows={3} disabled={saving} />
          </div>

          {/* Inline save requirements guidance */}
          {(() => {
            const msgs = [];
            if (pipeMode === "collection" && !formData.pipe_id) msgs.push("Select a pipe from your collection to continue.");
            if (pipeMode === "external" && !externalPipe) msgs.push("Select a search result or add the pipe manually to continue.");
            if (blendMode === "collection" && !formData.blend_id) msgs.push("Select a blend from your collection to continue.");
            if (blendMode === "external" && !externalBlend) msgs.push("Select a search result or add the blend manually to continue.");
            if (msgs.length === 0) return null;
            return (
              <div className="rounded-xl px-3 py-2.5 space-y-1" style={{ background: "rgba(180,140,75,0.10)", border: "1px solid rgba(180,140,75,0.22)" }}>
                {msgs.map((m) => (
                  <p key={m} className="text-xs" style={{ color: "rgba(212,165,116,0.9)" }}>⚠ {m}</p>
                ))}
              </div>
            );
          })()}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">{t("common.cancel")}</Button>
            <Button
              type="submit"
              disabled={
                saving ||
                (pipeMode === "collection" && !formData.pipe_id) ||
                (pipeMode === "external" && !externalPipe) ||
                (blendMode === "collection" && !formData.blend_id) ||
                (blendMode === "external" && !externalBlend)
              }
              className="flex-1"
            >
              {saving ? "Saving..." : t("smokingLog.logSession")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    </>
  );
}