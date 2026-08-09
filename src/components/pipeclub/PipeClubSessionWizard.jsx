import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Star, BookmarkPlus, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PipePresentSelector from "./PipePresentSelector";
import ClubBlendEntry from "./ClubBlendEntry";
import PipeClubResults from "./PipeClubResults";
import { rankPresentPipes, serializePipesPresent, getConfidenceTier, isBestAvailable } from "./pipeClubPairing";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";
import { QUERY_KEYS, STALE_TIME } from "@/lib/queryKeys";
import { pairingMatrixQueryOptions } from "@/components/utils/pairingPolicy";
import { filterAiEligibleItems } from "@/components/platform/aiEligibility";

const STEP_SETUP = "setup";
const STEP_PIPES = "pipes";
const STEP_BLEND = "blend";
const STEP_RESULTS = "results";
const STEP_LOG = "log";

const STEPS = [STEP_SETUP, STEP_PIPES, STEP_BLEND, STEP_RESULTS, STEP_LOG];
const STEP_LABELS = {
  [STEP_SETUP]: "Session",
  [STEP_PIPES]: "Pipes",
  [STEP_BLEND]: "Blend",
  [STEP_RESULTS]: "Recommendation",
  [STEP_LOG]: "Log",
};

function StepIndicator({ currentStep }) {
  const idx = STEPS.indexOf(currentStep);
  return (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className="text-xs px-2 py-0.5 rounded-full font-medium transition-colors"
            style={{
              background: i <= idx ? "rgba(180,140,75,0.25)" : "rgba(255,255,255,0.04)",
              color: i <= idx ? "#D4A574" : "rgba(224,216,200,0.35)",
              border: `1px solid ${i === idx ? "rgba(180,140,75,0.5)" : "transparent"}`,
            }}
          >
            {STEP_LABELS[s]}
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px" style={{ background: "rgba(180,140,75,0.15)" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StarRating({ value, onChange, label }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-[#D8C7A6]/70">{label}</label>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}>
            <Star
              className="w-6 h-6 transition-colors"
              fill={n <= (value ?? 0) ? "#B48C4B" : "transparent"}
              stroke={n <= (value ?? 0) ? "#B48C4B" : "rgba(180,140,75,0.4)"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * PipeClubSessionWizard — multi-step wizard for a Pipe Club session.
 *
 * Props:
 *   onComplete  () => void    - called after session is saved
 *   onCancel    () => void
 */
export default function PipeClubSessionWizard({ onComplete, onCancel }) {
  const { user } = useCurrentUser();
  const [step, setStep] = useState(STEP_SETUP);
  const [saving, setSaving] = useState(false);

  // Step 1 — session metadata
  const [sessionMeta, setSessionMeta] = useState({
    date: new Date().toISOString().slice(0, 16),
    club_name: "",
    location: "",
    notes: "",
  });

  // Step 2 — pipes present
  const [selectedPipeIds, setSelectedPipeIds] = useState(new Set());
  const [bowlSelections, setBowlSelections] = useState({});

  // Step 3 — blend
  const [blendSource, setBlendSource] = useState("new"); // "collection" | "wishlist" | "new"
  const [selectedBlendId, setSelectedBlendId] = useState(null);
  const [tempBlend, setTempBlend] = useState({});
  const [blendSearch, setBlendSearch] = useState("");

  // Step 4 — results
  const [best, setBest] = useState(null);
  const [alternative, setAlternative] = useState(null);

  // Step 5 — log
  const [actualPipeId, setActualPipeId] = useState(null);
  const [actualBowlVariantId, setActualBowlVariantId] = useState(null);
  const [overallRating, setOverallRating] = useState(null);
  const [pairingRating, setPairingRating] = useState(null);
  const [wouldSmokeAgain, setWouldSmokeAgain] = useState(null);
  const [postNotes, setPostNotes] = useState("");
  const [disposition, setDisposition] = useState("none"); // "none" | "wishlist" | "not_for_me"

  // Data
  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: QUERY_KEYS.pipes(user?.email),
    queryFn: () => fetchAllEntities(base44.entities.Pipe, { created_by: user?.email }, '-updated_date', 5000, 200, 'PipeClub:Pipe'),
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
  });

  const { data: blends = [] } = useQuery({
    queryKey: QUERY_KEYS.blendSummary(user?.email),
    queryFn: () => fetchAllEntities(base44.entities.TobaccoBlend, { created_by: user?.email }, '-updated_date', 5000, 200, 'PipeClub:TobaccoBlend'),
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist-blends", user?.email],
    queryFn: () => base44.entities.AcquisitionItem.filter({ created_by: user?.email, item_type: "blend" }, "-created_date", 200),
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0] ?? null;
    },
    enabled: !!user?.email,
  });

  const { data: savedPairings } = useQuery(pairingMatrixQueryOptions(user?.email));

  // Derived: present pipes as records (with bowl variant attached for scorer)
  const presentPipeRecords = useMemo(() => {
    const allPipes = filterAiEligibleItems(pipes);
    return [...selectedPipeIds].map((id) => {
      const pipe = allPipes.find((p) => p.id === id) || pipes.find((p) => p.id === id);
      if (!pipe) return null;
      const bvId = bowlSelections[id] ?? null;
      return { ...pipe, selectedBowlVariantId: bvId };
    }).filter(Boolean);
  }, [pipes, selectedPipeIds, bowlSelections]);

  // Derived: effective blend for scoring
  const effectiveBlend = useMemo(() => {
    if (blendSource === "collection" && selectedBlendId) {
      return blends.find((b) => b.id === selectedBlendId) ?? null;
    }
    if (blendSource === "wishlist" && selectedBlendId) {
      const wi = wishlistItems.find((w) => w.id === selectedBlendId);
      if (!wi) return null;
      return { name: wi.name, manufacturer: wi.manufacturer };
    }
    if (blendSource === "new") {
      return tempBlend?.name ? tempBlend : null;
    }
    return null;
  }, [blendSource, selectedBlendId, blends, wishlistItems, tempBlend]);

  // Navigate
  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    if (STEPS[idx + 1] === STEP_RESULTS) runScoring();
  };
  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const runScoring = () => {
    if (!effectiveBlend || presentPipeRecords.length === 0) return;

    // Build present-pipe records including bowl variant expansion for the scorer.
    // Expand: if a specific bowl is selected, only pass that bowl to the scorer
    // by temporarily overwriting bowl_variants.
    const pipesForScorer = presentPipeRecords.map((pipe) => {
      const bvId = pipe.selectedBowlVariantId;
      if (bvId === null || !Array.isArray(pipe.bowl_variants) || pipe.bowl_variants.length === 0) {
        return pipe;
      }
      // User selected a specific bowl — restrict bowl_variants to that bowl only
      const specificBowl = pipe.bowl_variants.find((bv) => bv.id === bvId);
      return { ...pipe, bowl_variants: specificBowl ? [specificBowl] : pipe.bowl_variants };
    });

    const { best: b, alternative: a } = rankPresentPipes(pipesForScorer, effectiveBlend, userProfile);
    setBest(b);
    setAlternative(a);
  };

  const handleSave = async () => {
    if (!user?.email) return;
    setSaving(true);
    try {
      // Determine blend metadata
      const blendName = effectiveBlend?.name ?? "";
      const blendManufacturer = effectiveBlend?.manufacturer ?? "";
      const propBlendId = blendSource === "collection" ? selectedBlendId : null;

      // Build pipes-present JSON
      const pipesJson = serializePipesPresent(presentPipeRecords);

      // Build temp tobacco snapshot for new blends
      const tempSnapshot = blendSource === "new" && effectiveBlend
        ? JSON.stringify(tempBlend)
        : null;

      // Wishlist / not-for-me — handle AcquisitionItem creation
      let wishlistItemId = null;
      if (disposition === "wishlist" && blendSource !== "collection") {
        // Check for existing wishlist/not-for-me entry
        const existing = wishlistItems.find(
          (w) =>
            w.item_type === "blend" &&
            (w.name || "").toLowerCase() === blendName.toLowerCase() &&
            (w.manufacturer || "").toLowerCase() === blendManufacturer.toLowerCase()
        );
        if (existing) {
          // Update to wishlist if it was not_for_me
          if (existing.status === "do_not_buy_again") {
            await base44.entities.AcquisitionItem.update(existing.id, { status: "wishlist" });
          }
          wishlistItemId = existing.id;
        } else {
          const created = await base44.entities.AcquisitionItem.create({
            name: blendName,
            manufacturer: blendManufacturer,
            item_type: "blend",
            status: "wishlist",
            created_by: user.email,
          });
          wishlistItemId = created?.id ?? null;
        }
      } else if (disposition === "not_for_me") {
        const existing = wishlistItems.find(
          (w) =>
            w.item_type === "blend" &&
            (w.name || "").toLowerCase() === blendName.toLowerCase()
        );
        if (existing) {
          await base44.entities.AcquisitionItem.update(existing.id, { status: "do_not_buy_again" });
          wishlistItemId = existing.id;
        } else {
          const created = await base44.entities.AcquisitionItem.create({
            name: blendName,
            manufacturer: blendManufacturer,
            item_type: "blend",
            status: "do_not_buy_again",
            created_by: user.email,
          });
          wishlistItemId = created?.id ?? null;
        }
      }

      // Find actual pipe record
      const actualPipe = pipes.find((p) => p.id === actualPipeId);
      const actualBowl = actualBowlVariantId
        ? actualPipe?.bowl_variants?.find((bv) => bv.id === actualBowlVariantId)
        : null;

      await base44.entities.PipeClubSession.create({
        session_type: "pipe_club",
        date: new Date(sessionMeta.date).toISOString(),
        club_name: sessionMeta.club_name || null,
        location: sessionMeta.location || null,
        notes: sessionMeta.notes || null,
        pipes_present: pipesJson,
        proposed_blend_id: propBlendId,
        proposed_blend_name: blendName,
        proposed_blend_manufacturer: blendManufacturer,
        proposed_blend_source: blendSource,
        temp_tobacco_snapshot: tempSnapshot,
        recommended_pipe_id: best?.pipe_id ?? null,
        recommended_pipe_name: best?.pipe_name ?? null,
        recommended_bowl_variant_id: best?.bowl_variant_id ?? null,
        recommended_bowl_name: best?.bowl_name ?? null,
        recommended_score: best?.score ?? null,
        recommended_confidence: best ? getConfidenceTier(best) : null,
        recommended_is_best_available: best ? isBestAvailable(best) : false,
        recommended_why: best?.why ?? null,
        alternative_pipe_id: alternative?.pipe_id ?? null,
        alternative_pipe_name: alternative?.pipe_name ?? null,
        alternative_bowl_variant_id: alternative?.bowl_variant_id ?? null,
        alternative_bowl_name: alternative?.bowl_name ?? null,
        alternative_score: alternative?.score ?? null,
        alternative_why: alternative?.why ?? null,
        actual_pipe_id: actualPipeId || null,
        actual_pipe_name: actualPipe?.name ?? null,
        actual_bowl_variant_id: actualBowlVariantId || null,
        actual_bowl_name: actualBowl?.name ?? null,
        overall_rating: overallRating ?? null,
        pairing_rating: pairingRating ?? null,
        would_smoke_again: wouldSmokeAgain ?? null,
        post_session_notes: postNotes || null,
        disposition,
        wishlist_item_id: wishlistItemId,
        created_by: user.email,
      });

      toast.success("Pipe Club session saved!");
      onComplete?.();
    } catch (err) {
      toast.error("Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Validation
  const canGoNext = useMemo(() => {
    if (step === STEP_PIPES) return selectedPipeIds.size > 0;
    if (step === STEP_BLEND) {
      if (blendSource === "new") return !!(tempBlend?.name && tempBlend?.manufacturer);
      return !!selectedBlendId;
    }
    return true;
  }, [step, selectedPipeIds, blendSource, tempBlend, selectedBlendId]);

  const filteredBlends = useMemo(() => {
    if (!blendSearch.trim()) return blends;
    const q = blendSearch.toLowerCase();
    return blends.filter((b) => (b.name || "").toLowerCase().includes(q) || (b.manufacturer || "").toLowerCase().includes(q));
  }, [blends, blendSearch]);

  const filteredWishlist = useMemo(() => {
    const active = wishlistItems.filter((w) => ["wishlist", "shopping_list"].includes(w.status));
    if (!blendSearch.trim()) return active;
    const q = blendSearch.toLowerCase();
    return active.filter((w) => (w.name || "").toLowerCase().includes(q));
  }, [wishlistItems, blendSearch]);

  return (
    <div
      className="rounded-2xl p-5 space-y-4 w-full max-w-lg mx-auto"
      style={{ background: "linear-gradient(145deg, rgba(38,26,18,0.99), rgba(25,17,12,1))", border: "1px solid rgba(180,140,75,0.2)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F5F1E7]" style={{ fontFamily: "'Georgia', serif" }}>
          Pipe Club Session
        </h2>
        <button onClick={onCancel} className="text-[#D8C7A6]/50 hover:text-[#D8C7A6] text-xl leading-none">×</button>
      </div>

      <StepIndicator currentStep={step} />

      {/* ── Step 1: Session metadata ── */}
      {step === STEP_SETUP && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-[#D8C7A6]/70">Date & Time</label>
            <Input
              type="datetime-local"
              value={sessionMeta.date}
              onChange={(e) => setSessionMeta((p) => ({ ...p, date: e.target.value }))}
              className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#D8C7A6]/70">Club / Meeting Name (optional)</label>
            <Input
              value={sessionMeta.club_name}
              onChange={(e) => setSessionMeta((p) => ({ ...p, club_name: e.target.value }))}
              placeholder="e.g. Tuesday Smoke Ring"
              className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#D8C7A6]/70">Location (optional)</label>
            <Input
              value={sessionMeta.location}
              onChange={(e) => setSessionMeta((p) => ({ ...p, location: e.target.value }))}
              placeholder="e.g. The Briar Patch"
              className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#D8C7A6]/70">Notes (optional)</label>
            <Textarea
              value={sessionMeta.notes}
              onChange={(e) => setSessionMeta((p) => ({ ...p, notes: e.target.value }))}
              placeholder="General session notes…"
              rows={2}
              className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Select pipes present ── */}
      {step === STEP_PIPES && (
        <div className="space-y-2">
          <p className="text-sm text-[#D8C7A6]/70">Select the pipes you physically brought to this meeting:</p>
          {pipesLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#B48C4B]" /></div>
          ) : (
            <PipePresentSelector
              pipes={pipes}
              selected={selectedPipeIds}
              bowlSelections={bowlSelections}
              onToggle={(id) => setSelectedPipeIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              })}
              onBowlChange={(id, bvId) => setBowlSelections((prev) => ({ ...prev, [id]: bvId }))}
              onSelectAll={() => setSelectedPipeIds(new Set(pipes.map((p) => p.id)))}
              onClearAll={() => setSelectedPipeIds(new Set())}
            />
          )}
        </div>
      )}

      {/* ── Step 3: Blend selection ── */}
      {step === STEP_BLEND && (
        <div className="space-y-3">
          {/* Source tabs */}
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(180,140,75,0.15)" }}>
            {[["collection", "My Collection"], ["wishlist", "Wishlist"], ["new", "New / Not Owned"]].map(([src, label]) => (
              <button
                key={src}
                type="button"
                onClick={() => { setBlendSource(src); setSelectedBlendId(null); }}
                className="flex-1 text-xs py-1.5 rounded-md transition-colors font-medium"
                style={{
                  background: blendSource === src ? "rgba(180,140,75,0.25)" : "transparent",
                  color: blendSource === src ? "#D4A574" : "rgba(224,216,200,0.5)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {(blendSource === "collection" || blendSource === "wishlist") && (
            <Input
              value={blendSearch}
              onChange={(e) => setBlendSearch(e.target.value)}
              placeholder="Search…"
              className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
            />
          )}

          {blendSource === "collection" && (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredBlends.length === 0 && <p className="text-sm text-[#D8C7A6]/50 text-center py-4">No blends found.</p>}
              {filteredBlends.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBlendId(b.id)}
                  className="w-full text-left px-3 py-2 rounded-xl transition-colors"
                  style={{
                    background: selectedBlendId === b.id ? "rgba(60,40,20,0.5)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedBlendId === b.id ? "rgba(180,140,75,0.4)" : "rgba(180,140,75,0.15)"}`,
                  }}
                >
                  <p className="text-sm font-medium text-[#F5F1E7]">{b.name}</p>
                  {b.manufacturer && <p className="text-xs text-[#B48C4B]">{b.manufacturer}</p>}
                </button>
              ))}
            </div>
          )}

          {blendSource === "wishlist" && (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredWishlist.length === 0 && <p className="text-sm text-[#D8C7A6]/50 text-center py-4">No wishlist blends found.</p>}
              {filteredWishlist.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedBlendId(w.id)}
                  className="w-full text-left px-3 py-2 rounded-xl transition-colors"
                  style={{
                    background: selectedBlendId === w.id ? "rgba(60,40,20,0.5)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedBlendId === w.id ? "rgba(180,140,75,0.4)" : "rgba(180,140,75,0.15)"}`,
                  }}
                >
                  <p className="text-sm font-medium text-[#F5F1E7]">{w.name}</p>
                  {w.manufacturer && <p className="text-xs text-[#B48C4B]">{w.manufacturer}</p>}
                </button>
              ))}
            </div>
          )}

          {blendSource === "new" && (
            <ClubBlendEntry initialData={tempBlend} onChange={setTempBlend} />
          )}
        </div>
      )}

      {/* ── Step 4: Results ── */}
      {step === STEP_RESULTS && (
        <div className="space-y-3">
          {selectedPipeIds.size === 0 && (
            <p className="text-sm text-[#D8C7A6]/60 text-center py-4">No pipes selected. Go back and select at least one pipe.</p>
          )}
          {selectedPipeIds.size > 0 && !effectiveBlend && (
            <p className="text-sm text-[#D8C7A6]/60 text-center py-4">No blend selected. Go back to choose a blend.</p>
          )}
          {selectedPipeIds.size > 0 && effectiveBlend && (
            <PipeClubResults
              best={best}
              alternative={alternative}
              blendName={effectiveBlend?.name}
            />
          )}
        </div>
      )}

      {/* ── Step 5: Log ── */}
      {step === STEP_LOG && (
        <div className="space-y-4">
          {/* Actual pipe used */}
          <div className="space-y-2">
            <label className="text-xs text-[#D8C7A6]/70">Pipe actually smoked (optional)</label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              <button
                type="button"
                onClick={() => setActualPipeId(null)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
                style={{
                  background: actualPipeId === null ? "rgba(60,40,20,0.4)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${actualPipeId === null ? "rgba(180,140,75,0.35)" : "rgba(180,140,75,0.12)"}`,
                  color: actualPipeId === null ? "#D4A574" : "rgba(224,216,200,0.5)",
                }}
              >
                Not recorded
              </button>
              {presentPipeRecords.map((pipe) => (
                <button
                  key={pipe.id}
                  type="button"
                  onClick={() => { setActualPipeId(pipe.id); setActualBowlVariantId(null); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
                  style={{
                    background: actualPipeId === pipe.id ? "rgba(60,40,20,0.4)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${actualPipeId === pipe.id ? "rgba(180,140,75,0.35)" : "rgba(180,140,75,0.12)"}`,
                  }}
                >
                  <span className="text-[#F5F1E7]">{pipe.name}</span>
                  {pipe.maker && <span className="text-[#B48C4B] ml-2 text-xs">{pipe.maker}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ratings */}
          <StarRating value={overallRating} onChange={setOverallRating} label="Overall tobacco rating" />
          <StarRating value={pairingRating} onChange={setPairingRating} label="Pipe + tobacco pairing rating" />

          {/* Would smoke again */}
          <div className="space-y-1">
            <label className="text-xs text-[#D8C7A6]/70">Would smoke again?</label>
            <div className="flex gap-2">
              {[true, false, null].map((val) => {
                const label = val === true ? "Yes" : val === false ? "No" : "Not sure";
                return (
                  <button key={String(val)} type="button" onClick={() => setWouldSmokeAgain(wouldSmokeAgain === val ? null : val)}
                    className="flex-1 text-xs py-1.5 rounded-full transition-colors"
                    style={{
                      background: wouldSmokeAgain === val && val !== null ? "rgba(180,140,75,0.25)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${wouldSmokeAgain === val && val !== null ? "rgba(180,140,75,0.4)" : "rgba(180,140,75,0.15)"}`,
                      color: wouldSmokeAgain === val && val !== null ? "#D4A574" : "rgba(224,216,200,0.5)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-session notes */}
          <div className="space-y-1">
            <label className="text-xs text-[#D8C7A6]/70">Post-session notes (optional)</label>
            <Textarea
              value={postNotes}
              onChange={(e) => setPostNotes(e.target.value)}
              rows={2}
              placeholder="How did it smoke?"
              className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
            />
          </div>

          {/* Disposition — only show for unowned/wishlist blends */}
          {blendSource !== "collection" && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-[#D8C7A6]/70">Add to your tobacco tracking:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDisposition(disposition === "wishlist" ? "none" : "wishlist")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: disposition === "wishlist" ? "rgba(46,125,92,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${disposition === "wishlist" ? "rgba(46,125,92,0.4)" : "rgba(180,140,75,0.15)"}`,
                    color: disposition === "wishlist" ? "#6fcf97" : "rgba(224,216,200,0.6)",
                  }}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  {disposition === "wishlist" ? <><Check className="w-3 h-3" /> Added</> : "Add to Wishlist"}
                </button>
                <button
                  type="button"
                  onClick={() => setDisposition(disposition === "not_for_me" ? "none" : "not_for_me")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: disposition === "not_for_me" ? "rgba(163,92,92,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${disposition === "not_for_me" ? "rgba(163,92,92,0.4)" : "rgba(180,140,75,0.15)"}`,
                    color: disposition === "not_for_me" ? "#e07070" : "rgba(224,216,200,0.6)",
                  }}
                >
                  <ThumbsDown className="w-4 h-4" />
                  {disposition === "not_for_me" ? <><Check className="w-3 h-3" /> Marked</> : "Not For Me"}
                </button>
              </div>
              {disposition !== "none" && (
                <p className="text-xs text-[#D8C7A6]/50 text-center">
                  {disposition === "wishlist" ? "Will be added to your Want List." : "Will be excluded from future recommendations."}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {step !== STEP_SETUP ? (
          <Button variant="outline" onClick={goBack} className="gap-1 text-[#D8C7A6] border-[rgba(180,140,75,0.25)]">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel} className="text-[#D8C7A6]/60">Cancel</Button>
        )}

        {step !== STEP_LOG ? (
          <Button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex-1 gap-1"
            style={{ background: "rgba(180,140,75,0.25)", color: "#D4A574", border: "1px solid rgba(180,140,75,0.4)" }}
          >
            {step === STEP_BLEND ? "Score Pipes" : "Next"} <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 gap-1"
            style={{ background: "rgba(180,140,75,0.25)", color: "#D4A574", border: "1px solid rgba(180,140,75,0.4)" }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Session"}
          </Button>
        )}
      </div>
    </div>
  );
}
