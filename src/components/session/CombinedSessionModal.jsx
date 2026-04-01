import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronRight, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { toast } from "sonner";
import PostSessionPrompt from "@/components/session/PostSessionPrompt";
import ExternalItemPicker from "@/components/session/ExternalItemPicker";

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


function buildSessionGroupId(userEmail) {
  const safeUser = String(userEmail || "guest")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24);
  return `combo_${safeUser}_${Date.now()}`;
}

export default function CombinedSessionModal({
  isOpen,
  onClose,
  onSaved,
  pipes = [],
  blends = [],
  bottles = [],
  preFillPipe = null,
  preFillBlend = null,
  preFillBottle = null,
}) {
  const { user } = useCurrentUser();

  const [step, setStep] = useState(0);

  const [pipeMode, setPipeMode] = useState("collection");
  const [blendMode, setBlendMode] = useState("collection");
  const [bottleMode, setBottleMode] = useState("collection");

  const [selectedPipe, setSelectedPipe] = useState(null);
  const [selectedBlend, setSelectedBlend] = useState(null);
  const [selectedBottle, setSelectedBottle] = useState(null);

  const [externalPipe, setExternalPipe] = useState({ maker: "", model: "", shape: "" });
  const [externalBlend, setExternalBlend] = useState({ name: "", manufacturer: "", blend_type: "" });
  const [externalBottle, setExternalBottle] = useState({ name: "", distillery: "", type: "" });

  const [sessionNotes, setSessionNotes] = useState("");
  const [tastingRating, setTastingRating] = useState("");
  const [pipeRating, setPipeRating] = useState("");
  const [blendRating, setBlendRating] = useState("");
  const [saving, setSaving] = useState(false);
  const [postPromptItems, setPostPromptItems] = useState(null);

  const hasPipe = true;
  const hasBlend = true;
  const hasBottle = true;

  const steps = useMemo(
    () => [hasPipe ? "pipe" : null, hasBlend ? "blend" : null, hasBottle ? "bottle" : null, "confirm"].filter(Boolean),
    [hasPipe, hasBlend, hasBottle]
  );

  const currentStep = steps[step];

  // Apply prefill when modal opens with pre-selected items
  useEffect(() => {
    if (isOpen) {
      if (preFillPipe) { setSelectedPipe(preFillPipe); setPipeMode("collection"); }
      if (preFillBlend) { setSelectedBlend(preFillBlend); setBlendMode("collection"); }
      if (preFillBottle) { setSelectedBottle(preFillBottle); setBottleMode("collection"); }
    }
  }, [isOpen, preFillPipe, preFillBlend, preFillBottle]);

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
      setSessionNotes("");
      setTastingRating("");
      setPipeRating("");
      setBlendRating("");
      setSaving(false);
      setPostPromptItems(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function advance() {
    if (step < steps.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  function getPipeDisplay() {
    if (pipeMode === "external") {
      return [externalPipe.maker, externalPipe.model].filter(Boolean).join(" ") || null;
    }
    return selectedPipe?.name || null;
  }

  function getBlendDisplay() {
    if (blendMode === "external") return externalBlend.name || null;
    return selectedBlend?.name || null;
  }

  function getBottleDisplay() {
    if (bottleMode === "external") return externalBottle.name || null;
    return selectedBottle?.name || null;
  }

  async function handleConfirm() {
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

    setSaving(true);

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
            pipe_id: pipeMode === "collection" && selectedPipe?.id ? selectedPipe.id : "",
            pipe_name: pipeName || "",
            blend_id: blendMode === "collection" && selectedBlend?.id ? selectedBlend.id : "",
            blend_name: blendName || "",
            bowls_used: 1,
            date: nowIso,
            notes: sharedNotes || null,
            session_group_id: sessionGroupId,
            ...(pipeRating ? { pipe_rating: Number(pipeRating) } : {}),
            ...(blendRating ? { blend_rating: Number(blendRating) } : {}),

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
            ...(bottleMode === "collection" && selectedBottle?.id ? { bottle_id: selectedBottle.id } : {}),
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
        externalItems.push({
          label: pipeName,
          item_type: "pipe",
          itemData: {
            name: pipeName,
            maker: externalPipe.maker,
            model: externalPipe.model,
            shape: externalPipe.shape,
          },
        });
      }

      if (blendMode === "external" && blendName) {
        externalItems.push({
          label: blendName,
          item_type: "blend",
          itemData: {
            name: blendName,
            manufacturer: externalBlend.manufacturer,
            blend_type: externalBlend.blend_type,
          },
        });
      }

      if (bottleMode === "external" && bottleName) {
        externalItems.push({
          label: bottleName,
          item_type: "bottle",
          itemData: {
            name: bottleName,
            distillery: externalBottle.distillery,
            type: externalBottle.type,
          },
        });
      }

      await Promise.all(operations);

      await Promise.resolve(onSaved?.({ sessionGroupId }));

      if (externalItems.length > 0) {
        setPostPromptItems(externalItems);
        toast.success("Session logged. Choose what to do with the out-of-collection items.");
      } else {
        toast.success("Combined session logged.");
        onClose?.();
      }
    } catch (error) {
      console.error("[CombinedSessionModal] failed to save", error);
      toast.error("Failed to log combined session. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (postPromptItems) {
    return (
      <PostSessionPrompt
        externalItems={postPromptItems}
        onDone={() => {
          setPostPromptItems(null);
          onClose?.();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[1400] bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
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
                      ? "Select Pipe"
                      : currentStep === "blend"
                      ? "Select Blend"
                      : "Select Whiskey"
                  }`
                : " — Confirm"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 text-[#E0D8C8]/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {currentStep === "pipe" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55">
                Choose a pipe from your collection, or search / identify one out of collection.
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
                  {pipes.map((pipe) => (
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
                  initialValues={externalPipe}
                  onSelect={(item) => {
                    setExternalPipe({
                      maker: item.maker || "",
                      model: item.model || item.name || "",
                      shape: item.shape || "",
                    });
                    advance();
                  }}
                />
              )}
            </>
          ) : null}

          {currentStep === "blend" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55">
                Choose a blend from your collection, or search / identify one out of collection.
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
                  {blends.map((blend) => (
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
                  initialValues={externalBlend}
                  onSelect={(item) => {
                    setExternalBlend({
                      name: item.name || "",
                      manufacturer: item.manufacturer || "",
                      blend_type: item.blend_type || "",
                    });
                    advance();
                  }}
                />
              )}
            </>
          ) : null}

          {currentStep === "bottle" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55">
                Choose a whiskey from your collection, or search / identify one out of collection.
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
                  {bottles.map((bottle) => (
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
                  initialValues={externalBottle}
                  onSelect={(item) => {
                    setExternalBottle({
                      name: item.name || "",
                      distillery: item.distillery || "",
                      type: item.type || "",
                    });
                    advance();
                  }}
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
                {getPipeDisplay() ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#D8C7A6]/60 mb-2">Pipe Rating</label>
                    <select value={pipeRating} onChange={(e) => setPipeRating(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.16)] text-[#F5F1E7] outline-none">
                      <option value="">No rating</option>
                      <option value="1">1 — Poor</option>
                      <option value="2">2 — Fair</option>
                      <option value="3">3 — Good</option>
                      <option value="4">4 — Very Good</option>
                      <option value="5">5 — Excellent</option>
                    </select>
                  </div>
                ) : null}
                {getBlendDisplay() ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#D8C7A6]/60 mb-2">Blend Rating</label>
                    <select value={blendRating} onChange={(e) => setBlendRating(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.16)] text-[#F5F1E7] outline-none">
                      <option value="">No rating</option>
                      <option value="1">1 — Poor</option>
                      <option value="2">2 — Fair</option>
                      <option value="3">3 — Good</option>
                      <option value="4">4 — Very Good</option>
                      <option value="5">5 — Excellent</option>
                    </select>
                  </div>
                ) : null}
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#D8C7A6]/60 mb-2">Whiskey Rating</label>
                    <select value={tastingRating} onChange={(e) => setTastingRating(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.16)] text-[#F5F1E7] outline-none">
                      <option value="">No rating</option>
                      <option value="1">1 — Poor</option>
                      <option value="2">2 — Fair</option>
                      <option value="3">3 — Good</option>
                      <option value="4">4 — Very Good</option>
                      <option value="5">5 — Excellent</option>
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
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#E0D8C8]/75 border border-[rgba(180,140,75,0.22)] hover:bg-white/5"
            >
              Back
            </button>
          ) : null}

          {currentStep !== "confirm" ? (
            <button
              type="button"
              onClick={advance}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
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