/**
 * CombinedSessionModal
 * Real multi-step combined session: choose pipe + blend + bottle, then log both
 * SmokingLog and TastingLog from one coordinated workflow. Does NOT require Curator.
 */

import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronRight, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { toast } from "sonner";

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
}) {
  const { user } = useCurrentUser();

  const [step, setStep] = useState(0);
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [selectedBlend, setSelectedBlend] = useState(null);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [tastingRating, setTastingRating] = useState("");
  const [saving, setSaving] = useState(false);

  const hasPipe = pipes.length > 0;
  const hasBlend = blends.length > 0;
  const hasBottle = bottles.length > 0;

  const steps = useMemo(
    () =>
      [hasPipe ? "pipe" : null, hasBlend ? "blend" : null, hasBottle ? "bottle" : null, "confirm"].filter(Boolean),
    [hasPipe, hasBlend, hasBottle]
  );

  const currentStep = steps[step];

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setSelectedPipe(null);
      setSelectedBlend(null);
      setSelectedBottle(null);
      setSessionNotes("");
      setTastingRating("");
      setSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function advance() {
    if (step < steps.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleConfirm() {
    if (!user?.email) {
      toast.error("You must be signed in to log a session.");
      return;
    }

    if (!selectedPipe && !selectedBlend && !selectedBottle) {
      toast.error("Choose at least one item before logging.");
      return;
    }

    setSaving(true);

    try {
      const nowIso = new Date().toISOString();
      const sessionGroupId = buildSessionGroupId(user.email);
      const sharedNotes = sessionNotes.trim();

      const operations = [];

      if (selectedPipe || selectedBlend) {
        operations.push(
          base44.entities.SmokingLog.create({
            created_by: user.email,
            pipe_id: selectedPipe?.id || null,
            pipe_name: selectedPipe?.name || null,
            blend_id: selectedBlend?.id || null,
            blend_name: selectedBlend?.name || null,
            bowls_used: 1,
            date: nowIso,
            notes: sharedNotes || null,
            session_group_id: sessionGroupId,
          })
        );
      }

      if (selectedBottle) {
        const parsedRating =
          tastingRating === "" ? null : Number(tastingRating);

        operations.push(
          base44.entities.TastingLog.create({
            created_by: user.email,
            bottle_id: selectedBottle.id,
            bottle_name: selectedBottle.name,
            tasting_date: nowIso,
            notes: sharedNotes || null,
            rating:
              Number.isFinite(parsedRating) && parsedRating > 0
                ? parsedRating
                : null,
            session_group_id: sessionGroupId,
          })
        );
      }

      await Promise.all(operations);

      const loggedParts = [
        selectedPipe || selectedBlend ? "pipe session" : null,
        selectedBottle ? "whiskey tasting" : null,
      ].filter(Boolean);

      toast.success(`Logged ${loggedParts.join(" + ")}.`);
      await Promise.resolve(onSaved?.({ sessionGroupId }));
      onClose?.();
    } catch (error) {
      console.error("[CombinedSessionModal] failed to save", error);
      toast.error("Failed to log combined session. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1400] bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background:
            "linear-gradient(145deg,rgba(38,26,18,0.98),rgba(24,16,12,1))",
          border: "1px solid rgba(180,140,75,0.24)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
          maxHeight: "85vh",
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

        <div className="flex-1 overflow-y-auto p-5 space-y-2 min-h-0">
          {currentStep === "pipe" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55 mb-3">
                Choose a pipe for this session.
              </p>

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
          ) : null}

          {currentStep === "blend" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55 mb-3">
                Choose a tobacco blend.
              </p>

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
          ) : null}

          {currentStep === "bottle" ? (
            <>
              <p className="text-xs text-[#D8C7A6]/55 mb-3">
                Choose a whiskey bottle.
              </p>

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
                    sub: [bottle.distillery, bottle.type]
                      .filter(Boolean)
                      .join(" · "),
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
          ) : null}

          {currentStep === "confirm" ? (
            <div className="space-y-4">
              <p className="text-sm text-[#D8C7A6]/70">
                Review and log this combined session.
              </p>

              {selectedPipe || selectedBlend ? (
                <div className="rounded-xl p-4 border border-[rgba(212,165,116,0.22)] bg-[rgba(212,165,116,0.06)]">
                  <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider mb-2">
                    Pipe Session
                  </p>
                  <p className="text-sm text-[#F5F1E7]">
                    {selectedPipe?.name || "No pipe selected"}
                  </p>
                  {selectedBlend ? (
                    <p className="text-xs text-[#D8C7A6]/65 mt-1">
                      {selectedBlend.name}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {selectedBottle ? (
                <div className="rounded-xl p-4 border border-[rgba(182,101,101,0.22)] bg-[rgba(182,101,101,0.06)]">
                  <p className="text-xs font-semibold text-[#D47C7C] uppercase tracking-wider mb-2">
                    Whiskey Tasting
                  </p>
                  <p className="text-sm text-[#F5F1E7]">
                    {selectedBottle.name}
                  </p>
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

                {selectedBottle ? (
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

              {!selectedPipe && !selectedBlend && !selectedBottle ? (
                <p className="text-sm text-[#D8C7A6]/55">
                  Nothing selected. Go back and choose at least one item.
                </p>
              ) : null}
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
              disabled={saving || (!selectedPipe && !selectedBlend && !selectedBottle)}
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