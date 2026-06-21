import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronRight, Check, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { toast } from "sonner";
import PostSessionPrompt from "@/components/session/PostSessionPrompt";
import ExternalItemPicker from "@/components/session/ExternalItemPicker";
import { sortByLabel } from "@/lib/sorting/alphabetical";

function SelectItem({ item, selected, onClick, accent = "#D4A574" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{
        background: selected ? `${accent}18` : "rgba(255,255,255,0.03)",
        border: selected
          ? `1px solid ${accent}55`
          : "1px solid rgba(180,140,75,0.14)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#F5F1E7] truncate">
          {item.name}
        </p>
        {item.sub ? (
          <p className="text-xs text-[#D8C7A6]/65 mt-0.5">{item.sub}</p>
        ) : null}
      </div>
      {selected ? (
        <Check className="w-4 h-4 shrink-0" style={{ color: accent }} />
      ) : null}
    </button>
  );
}

function SourceToggle({ value, onChange }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-[rgba(180,140,75,0.25)] mb-3">
      <button
        type="button"
        onClick={() => onChange("collection")}
        className={`flex-1 py-2 text-sm font-medium transition-all ${
          value === "collection"
            ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
            : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
        }`}
      >
        From Collection
      </button>
      <button
        type="button"
        onClick={() => onChange("external")}
        className={`flex-1 py-2 text-sm font-medium transition-all ${
          value === "external"
            ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
            : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
        }`}
      >
        Out of Collection
      </button>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#D8C7A6]/60">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.16)] text-[#F5F1E7] outline-none"
      />
    </div>
  );
}

function buildSessionGroupId(userEmail) {
  const safeUser = String(userEmail || "guest")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24);
  return `combo_${safeUser}_${Date.now()}`;
}

function normalizeExternalItem(item, fallbackType, defaultLabel = "External Item") {
  if (!item) return null;
  return {
    label:
      item.label ||
      item.name ||
      item.title ||
      item.itemData?.name ||
      defaultLabel,
    item_type: item.item_type || fallbackType,
    itemData: item.itemData || item,
  };
}

export default function CombinedSessionModal({
  isOpen,
  onClose,
  onSaved,
  pipes = [],
  blends = [],
  bottles = [],
  initialSelection = null,
}) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const saveLockRef = useRef(false);

  const [step, setStep] = useState(0);

  const [pipeMode, setPipeMode] = useState("collection");
  const [blendMode, setBlendMode] = useState("collection");
  const [bottleMode, setBottleMode] = useState("collection");

  const [selectedPipe, setSelectedPipe] = useState(null);
  const [selectedBlend, setSelectedBlend] = useState(null);
  const [selectedBottle, setSelectedBottle] = useState(null);

  const [externalPipe, setExternalPipe] = useState({
    maker: "",
    model: "",
    shape: "",
  });
  const [externalBlend, setExternalBlend] = useState({
    name: "",
    manufacturer: "",
    blend_type: "",
  });
  const [externalBottle, setExternalBottle] = useState({
    name: "",
    distillery: "",
    type: "",
  });

  const [externalPipePicked, setExternalPipePicked] = useState(null);
  const [externalBlendPicked, setExternalBlendPicked] = useState(null);
  const [externalBottlePicked, setExternalBottlePicked] = useState(null);

  const [sessionNotes, setSessionNotes] = useState("");
  const [tastingRating, setTastingRating] = useState("");
  const [saving, setSaving] = useState(false);
  const [postPromptItems, setPostPromptItems] = useState(null);

  const steps = useMemo(
    () => ["pipe", "blend", "bottle", "confirm"],
    []
  );
  const sortedPipes = useMemo(
    () => sortByLabel(pipes || [], (pipe) => pipe?.name || ""),
    [pipes]
  );
  const sortedBlends = useMemo(
    () => sortByLabel(blends || [], (blend) => blend?.name || ""),
    [blends]
  );
  const sortedBottles = useMemo(
    () => sortByLabel(bottles || [], (bottle) => bottle?.name || ""),
    [bottles]
  );

  const currentStep = steps[step];

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setPipeMode("collection");
      setBlendMode("collection");
      setBottleMode("collection");
      setSelectedPipe(null);
      setSelectedBlend(null);
      setSelectedBottle(null);
      setExternalPipe({ maker: "", model: "", shape: "" });
      setExternalBlend({ name: "", manufacturer: "", blend_type: "" });
      setExternalBottle({ name: "", distillery: "", type: "" });
      setExternalPipePicked(null);
      setExternalBlendPicked(null);
      setExternalBottlePicked(null);
      setSessionNotes("");
      setTastingRating("");
      setSaving(false);
      setPostPromptItems(null);
      saveLockRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !initialSelection) return;

    if (initialSelection.pipe) {
      const pipeId = initialSelection.pipe.id;
      const matchedPipe =
        (pipeId && pipes.find((p) => p.id === pipeId)) ||
        pipes.find((p) => p.name === initialSelection.pipe.name);

      if (matchedPipe) {
        setPipeMode("collection");
        setSelectedPipe(matchedPipe);
      } else {
        setPipeMode("external");
        setExternalPipePicked(
          normalizeExternalItem(
            {
              label: initialSelection.pipe.name,
              item_type: "pipe",
              itemData: initialSelection.pipe,
            },
            "pipe"
          )
        );
        setExternalPipe({
          maker: initialSelection.pipe.maker || "",
          model: initialSelection.pipe.model || initialSelection.pipe.name || "",
          shape: initialSelection.pipe.shape || "",
        });
      }
    }

    if (initialSelection.blend) {
      const blendId = initialSelection.blend.id;
      const matchedBlend =
        (blendId && blends.find((b) => b.id === blendId)) ||
        blends.find((b) => b.name === initialSelection.blend.name);

      if (matchedBlend) {
        setBlendMode("collection");
        setSelectedBlend(matchedBlend);
      } else {
        setBlendMode("external");
        setExternalBlendPicked(
          normalizeExternalItem(
            {
              label: initialSelection.blend.name,
              item_type: "blend",
              itemData: initialSelection.blend,
            },
            "blend"
          )
        );
        setExternalBlend({
          name: initialSelection.blend.name || "",
          manufacturer: initialSelection.blend.manufacturer || "",
          blend_type: initialSelection.blend.blend_type || "",
        });
      }
    }

    if (initialSelection.bottle) {
      const bottleId = initialSelection.bottle.id;
      const matchedBottle =
        (bottleId && bottles.find((b) => b.id === bottleId)) ||
        bottles.find((b) => b.name === initialSelection.bottle.name);

      if (matchedBottle) {
        setBottleMode("collection");
        setSelectedBottle(matchedBottle);
      } else {
        setBottleMode("external");
        setExternalBottlePicked(
          normalizeExternalItem(
            {
              label: initialSelection.bottle.name,
              item_type: "bottle",
              itemData: initialSelection.bottle,
            },
            "bottle"
          )
        );
        setExternalBottle({
          name: initialSelection.bottle.name || "",
          distillery: initialSelection.bottle.distillery || "",
          type: initialSelection.bottle.type || "",
        });
      }
    }

    if (initialSelection.notes) {
      setSessionNotes(initialSelection.notes);
    }
  }, [isOpen, initialSelection, pipes, blends, bottles]);

  // PostSessionPrompt must render even if isOpen has been set to false by the
  // parent's onSaved handler (e.g., CuratorWorkspace closes the modal to invalidate
  // queries) — keep this check ABOVE the !isOpen early-return.
  if (postPromptItems) {
    return (
      <PostSessionPrompt
        externalItems={postPromptItems}
        onDone={() => {
          setPostPromptItems(null);
          saveLockRef.current = false;
          onClose?.();
        }}
      />
    );
  }

  if (!isOpen) return null;

  function advance() {
    if (saving) return;
    if (step < steps.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (saving) return;
    if (step > 0) setStep((s) => s - 1);
  }

  function getPipeDisplay() {
    if (pipeMode === "external") {
      return (
        externalPipePicked?.label ||
        [externalPipe.maker, externalPipe.model].filter(Boolean).join(" ") ||
        null
      );
    }
    return selectedPipe?.name || null;
  }

  function getBlendDisplay() {
    if (blendMode === "external") {
      return externalBlendPicked?.label || externalBlend.name || null;
    }
    return selectedBlend?.name || null;
  }

  function getBottleDisplay() {
    if (bottleMode === "external") {
      return externalBottlePicked?.label || externalBottle.name || null;
    }
    return selectedBottle?.name || null;
  }

  async function handleConfirm() {
    if (saving || saveLockRef.current) return;

    if (!user?.email) {
      toast.error("You must be signed in to log a session.");
      return;
    }

    const hasPipeChoice =
      pipeMode === "external"
        ? Boolean(getPipeDisplay())
        : Boolean(selectedPipe);

    const hasBlendChoice =
      blendMode === "external"
        ? Boolean(getBlendDisplay())
        : Boolean(selectedBlend);

    const hasBottleChoice =
      bottleMode === "external"
        ? Boolean(getBottleDisplay())
        : Boolean(selectedBottle);

    if (!hasPipeChoice && !hasBlendChoice && !hasBottleChoice) {
      toast.error("Choose at least one item before logging.");
      return;
    }

    saveLockRef.current = true;
    setSaving(true);

    if (import.meta.env.DEV) {
      console.log('[CombinedSession] save started', { pipeMode, blendMode, bottleMode });
    }

    try {
      const nowIso = new Date().toISOString();
      const sessionGroupId = buildSessionGroupId(user.email);
      const sharedNotes = sessionNotes.trim();

      const operations = [];
      const externalItems = [];

      const pipeName = getPipeDisplay();
      const blendName = getBlendDisplay();
      const bottleName = getBottleDisplay();

      if (hasPipeChoice || hasBlendChoice) {
        operations.push(
          base44.entities.SmokingLog.create({
            created_by: user.email,
            pipe_id: pipeMode === "collection" ? selectedPipe?.id || null : null,
            pipe_name: pipeName,
            blend_id: blendMode === "collection" ? selectedBlend?.id || null : null,
            blend_name: blendName,
            bowls_used: 1,
            date: nowIso,
            notes: sharedNotes || null,
            session_group_id: sessionGroupId,
            ...(pipeMode === "external" && pipeName
              ? {
                  external_pipe_name: pipeName,
                  external_pipe_maker: externalPipe.maker || "",
                  external_pipe_shape: externalPipe.shape || "",
                }
              : {}),
            ...(blendMode === "external" && blendName
              ? {
                  external_blend_name: blendName,
                  external_blend_manufacturer: externalBlend.manufacturer || "",
                  external_blend_type: externalBlend.blend_type || "",
                }
              : {}),
          })
        );
      }

      if (hasBottleChoice) {
        const parsedRating =
          tastingRating === "" ? null : Number(tastingRating);

        operations.push(
          base44.entities.TastingLog.create({
            created_by: user.email,
            bottle_id: bottleMode === "collection" ? selectedBottle?.id || null : null,
            bottle_name: bottleName,
            tasting_date: nowIso,
            notes: sharedNotes || null,
            rating:
              Number.isFinite(parsedRating) && parsedRating > 0
                ? parsedRating
                : null,
            session_group_id: sessionGroupId,
            ...(bottleMode === "external" && bottleName
              ? {
                  external_bottle_name: bottleName,
                  external_bottle_distillery: externalBottle.distillery || "",
                  external_bottle_type: externalBottle.type || "",
                }
              : {}),
          })
        );
      }

      if (pipeMode === "external" && pipeName) {
        externalItems.push(
          normalizeExternalItem(
            externalPipePicked || {
              label: pipeName,
              item_type: "pipe",
              itemData: {
                name: pipeName,
                maker: externalPipe.maker,
                model: externalPipe.model,
                shape: externalPipe.shape,
              },
            },
            "pipe"
          )
        );
      }

      if (blendMode === "external" && blendName) {
        externalItems.push(
          normalizeExternalItem(
            externalBlendPicked || {
              label: blendName,
              item_type: "blend",
              itemData: {
                name: blendName,
                manufacturer: externalBlend.manufacturer,
                blend_type: externalBlend.blend_type,
              },
            },
            "blend"
          )
        );
      }

      if (bottleMode === "external" && bottleName) {
        externalItems.push(
          normalizeExternalItem(
            externalBottlePicked || {
              label: bottleName,
              item_type: "bottle",
              itemData: {
                name: bottleName,
                distillery: externalBottle.distillery,
                type: externalBottle.type,
              },
            },
            "bottle"
          )
        );
      }

      if (import.meta.env.DEV) {
        console.log(`[CombinedSession] firing ${operations.length} create operation(s), ${externalItems.length} external item(s)`);
      }

      await Promise.all(operations);

      if (import.meta.env.DEV) {
        console.log('[CombinedSession] save complete', { sessionGroupId, externalItems: externalItems.length });
      }

      if (externalItems.length > 0) {
        // Set postPromptItems BEFORE calling onSaved so the PostSessionPrompt
        // guard (above the !isOpen check) can render even if the parent closes
        // the modal inside its onSaved handler.
        setPostPromptItems(externalItems);
        toast.success(
          "Session logged. Choose what to do with the out-of-collection items."
        );
        await Promise.resolve(onSaved?.({ sessionGroupId }));
        // Do NOT call onClose here — PostSessionPrompt's onDone will call it.
      } else {
        await Promise.resolve(onSaved?.({ sessionGroupId }));
        toast.success("Combined session logged.");
        onClose?.();
      }
    } catch (error) {
      console.error("[CombinedSessionModal] failed to save", error);
      toast.error("Failed to log combined session. Please try again.");
      saveLockRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1400] bg-black/75 flex items-center justify-center p-4" onClick={() => { if (!saving) onClose?.(); }}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(145deg,rgba(38,26,18,0.98),rgba(24,16,12,1))",
          border: "1px solid rgba(180,140,75,0.24)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
          maxHeight: "90vh",
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-[rgba(180,140,75,0.14)] shrink-0">
          <div>
            <h3 className="font-bold text-[#F5F1E7] text-lg">
              Pipe + Whiskey Session
            </h3>
            <p className="text-xs mt-0.5 text-[#E0D8C8]/60">
              Step {step + 1} of {steps.length}
              {currentStep !== "confirm"
                ? ` — ${
                    currentStep === "pipe"
                      ? t('session.selectPipe')
                      : currentStep === "blend"
                      ? t('session.selectBlend')
                      : t('session.selectWhiskey')
                  }`
                : " — Confirm"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (saving) return;
              onClose?.();
            }}
            className="p-1.5 rounded-lg hover:bg-white/8 text-[#E0D8C8]/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {currentStep === "pipe" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55">
                Choose a pipe from your collection or log something out of collection.
              </p>

              <SourceToggle value={pipeMode} onChange={setPipeMode} />

              {pipeMode === "collection" ? (
                <>
                  <SelectItem
                    item={{ name: "Skip — No pipe" }}
                    selected={selectedPipe === null}
                    onClick={() => {
                      setSelectedPipe(null);
                      advance();
                    }}
                    accent="#888888"
                  />
                  {sortedPipes.map((pipe) => (
                    <SelectItem
                      key={pipe.id}
                      item={{
                        name: pipe.name,
                        sub: [pipe.maker, pipe.shape].filter(Boolean).join(" · "),
                      }}
                      selected={selectedPipe?.id === pipe.id}
                      onClick={() => {
                        setSelectedPipe(pipe);
                        advance();
                      }}
                      accent="#D4A574"
                    />
                  ))}
                </>
              ) : (
                <ExternalItemPicker
                  itemType="pipe"
                  selectedItem={externalPipePicked}
                  onSelect={(item) => {
                    const normalized = normalizeExternalItem(item, "pipe", t('session.externalItem'));
                    setExternalPipePicked(normalized);
                    setExternalPipe((prev) => ({
                      ...prev,
                      maker: normalized?.itemData?.maker || prev.maker,
                      model:
                        normalized?.itemData?.model ||
                        normalized?.itemData?.name ||
                        normalized?.label ||
                        prev.model,
                      shape: normalized?.itemData?.shape || prev.shape,
                    }));
                  }}
                  manualFields={
                    <div className="space-y-3 rounded-xl border border-[rgba(180,140,75,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
                      <TextField
                        label={t('session.pipeMaker')}
                        value={externalPipe.maker}
                        onChange={(value) =>
                          setExternalPipe((prev) => ({ ...prev, maker: value }))
                        }
                        placeholder="Boswell"
                      />
                      <TextField
                        label={t('session.pipeModel')}
                        value={externalPipe.model}
                        onChange={(value) =>
                          setExternalPipe((prev) => ({ ...prev, model: value }))
                        }
                        placeholder="Jumbo"
                      />
                      <TextField
                        label={t('common.shape')}
                        value={externalPipe.shape}
                        onChange={(value) =>
                          setExternalPipe((prev) => ({ ...prev, shape: value }))
                        }
                        placeholder="Billiard"
                      />
                    </div>
                  }
                />
              )}
            </>
          ) : null}

          {currentStep === "blend" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55">
                Choose a blend from your collection or log something out of collection.
              </p>

              <SourceToggle value={blendMode} onChange={setBlendMode} />

              {blendMode === "collection" ? (
                <>
                  <SelectItem
                    item={{ name: "Skip — No blend" }}
                    selected={selectedBlend === null}
                    onClick={() => {
                      setSelectedBlend(null);
                      advance();
                    }}
                    accent="#888888"
                  />
                  {sortedBlends.map((blend) => (
                    <SelectItem
                      key={blend.id}
                      item={{
                        name: blend.name,
                        sub: [blend.manufacturer, blend.blend_type]
                          .filter(Boolean)
                          .join(" · "),
                      }}
                      selected={selectedBlend?.id === blend.id}
                      onClick={() => {
                        setSelectedBlend(blend);
                        advance();
                      }}
                      accent="#8FBD7B"
                    />
                  ))}
                </>
              ) : (
                <ExternalItemPicker
                  itemType="blend"
                  selectedItem={externalBlendPicked}
                  onSelect={(item) => {
                    const normalized = normalizeExternalItem(item, "blend", t('session.externalItem'));
                    setExternalBlendPicked(normalized);
                    setExternalBlend((prev) => ({
                      ...prev,
                      name:
                        normalized?.itemData?.name ||
                        normalized?.label ||
                        prev.name,
                      manufacturer:
                        normalized?.itemData?.manufacturer || prev.manufacturer,
                      blend_type:
                        normalized?.itemData?.blend_type || prev.blend_type,
                    }));
                  }}
                  manualFields={
                    <div className="space-y-3 rounded-xl border border-[rgba(180,140,75,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
                      <TextField
                        label={t('session.blendName')}
                        value={externalBlend.name}
                        onChange={(value) =>
                          setExternalBlend((prev) => ({ ...prev, name: value }))
                        }
                        placeholder="Cowboy Coffee"
                      />
                      <TextField
                        label={t('common.manufacturer')}
                        value={externalBlend.manufacturer}
                        onChange={(value) =>
                          setExternalBlend((prev) => ({
                            ...prev,
                            manufacturer: value,
                          }))
                        }
                        placeholder="Cornell & Diehl"
                      />
                      <TextField
                        label={t('session.blendType')}
                        value={externalBlend.blend_type}
                        onChange={(value) =>
                          setExternalBlend((prev) => ({
                            ...prev,
                            blend_type: value,
                          }))
                        }
                        placeholder="Aromatic"
                      />
                    </div>
                  }
                />
              )}
            </>
          ) : null}

          {currentStep === "bottle" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55">
                Choose a whiskey from your collection or log something out of collection.
              </p>

              <SourceToggle value={bottleMode} onChange={setBottleMode} />

              {bottleMode === "collection" ? (
                <>
                  <SelectItem
                    item={{ name: "Skip — No whiskey" }}
                    selected={selectedBottle === null}
                    onClick={() => {
                      setSelectedBottle(null);
                      advance();
                    }}
                    accent="#888888"
                  />
                  {sortedBottles.map((bottle) => (
                    <SelectItem
                      key={bottle.id}
                      item={{
                        name: bottle.name,
                        sub: [bottle.distillery, bottle.type].filter(Boolean).join(" · "),
                      }}
                      selected={selectedBottle?.id === bottle.id}
                      onClick={() => {
                        setSelectedBottle(bottle);
                        advance();
                      }}
                      accent="#B66565"
                    />
                  ))}
                </>
              ) : (
                <ExternalItemPicker
                  itemType="bottle"
                  selectedItem={externalBottlePicked}
                  onSelect={(item) => {
                    const normalized = normalizeExternalItem(item, "bottle", t('session.externalItem'));
                    setExternalBottlePicked(normalized);
                    setExternalBottle((prev) => ({
                      ...prev,
                      name:
                        normalized?.itemData?.name ||
                        normalized?.label ||
                        prev.name,
                      distillery:
                        normalized?.itemData?.distillery || prev.distillery,
                      type: normalized?.itemData?.type || prev.type,
                    }));
                  }}
                  manualFields={
                    <div className="space-y-3 rounded-xl border border-[rgba(180,140,75,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
                      <TextField
                        label={t('session.bottleName')}
                        value={externalBottle.name}
                        onChange={(value) =>
                          setExternalBottle((prev) => ({ ...prev, name: value }))
                        }
                        placeholder="Smoke Wagon Bourbon"
                      />
                      <TextField
                        label={t('whiskey.distillery')}
                        value={externalBottle.distillery}
                        onChange={(value) =>
                          setExternalBottle((prev) => ({
                            ...prev,
                            distillery: value,
                          }))
                        }
                        placeholder="Smoke Wagon"
                      />
                      <TextField
                        label={t('common.type')}
                        value={externalBottle.type}
                        onChange={(value) =>
                          setExternalBottle((prev) => ({ ...prev, type: value }))
                        }
                        placeholder="Bourbon"
                      />
                    </div>
                  }
                />
              )}
            </>
          ) : null}

          {currentStep === "confirm" ? (
            <div className="space-y-4">
              <p className="text-sm text-[#D8C7A6]/70">
                Review and log this session. Any out-of-collection items will be offered for Wish List / Shopping / Not for Me right after save.
              </p>

              {getPipeDisplay() || getBlendDisplay() ? (
                <div className="rounded-xl p-4 border border-[rgba(212,165,116,0.22)] bg-[rgba(212,165,116,0.06)]">
                  <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider mb-2">
                    Pipe Session
                  </p>
                  {getPipeDisplay() ? (
                    <p className="text-sm text-[#F5F1E7]">Pipe: {getPipeDisplay()}</p>
                  ) : null}
                  {getBlendDisplay() ? (
                    <p className="text-sm text-[#F5F1E7] mt-1">Blend: {getBlendDisplay()}</p>
                  ) : null}
                </div>
              ) : null}

              {getBottleDisplay() ? (
                <div className="rounded-xl p-4 border border-[rgba(182,101,101,0.22)] bg-[rgba(182,101,101,0.06)]">
                  <p className="text-xs font-semibold text-[#D47C7C] uppercase tracking-wider mb-2">
                    Whiskey Tasting
                  </p>
                  <p className="text-sm text-[#F5F1E7]">Pour: {getBottleDisplay()}</p>
                </div>
              ) : null}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#D8C7A6]/60 mb-2">
                    Session Notes
                  </label>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={4}
                    placeholder="Optional notes about the smoke, pour, pairing, or overall experience"
                    className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.16)] text-[#F5F1E7] outline-none"
                  />
                </div>

                {getBottleDisplay() ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#D8C7A6]/60 mb-2">
                      Whiskey Rating
                    </label>
                    <select
                      value={tastingRating}
                      onChange={(e) => setTastingRating(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.16)] text-[#F5F1E7] outline-none"
                    >
                      <option value="">No rating</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-5 py-4 flex gap-3 border-t border-[rgba(180,140,75,0.14)] shrink-0">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#E0D8C8]/75 border border-[rgba(180,140,75,0.22)] hover:bg-white/5 disabled:opacity-50"
            >
              Back
            </button>
          ) : null}

          {currentStep !== "confirm" ? (
            <button
              type="button"
              onClick={advance}
              disabled={saving}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{
                background: "rgba(180,140,75,0.15)",
                border: "1px solid rgba(180,140,75,0.3)",
                color: "#D4A574",
              }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : null}

          {currentStep === "confirm" ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg,rgba(163,92,92,1),rgba(143,72,72,1))",
                color: "#fff",
              }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? "Logging…" : "Log Session"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
