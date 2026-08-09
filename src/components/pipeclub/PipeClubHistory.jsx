import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";
import { Star, X, CalendarDays, MapPin, BookmarkPlus, ThumbsDown, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PipeIcon from "@/components/icons/PipeIcon";
import { toast } from "sonner";

const ACCENT = "#D4A574";
const MUTED = "rgba(224,216,200,0.7)";

function StarDisplay({ value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="w-3.5 h-3.5"
          fill={n <= value ? "#B48C4B" : "transparent"}
          stroke={n <= value ? "#B48C4B" : "rgba(180,140,75,0.3)"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function DispositionBadge({ disposition }) {
  if (!disposition || disposition === "none") return null;
  if (disposition === "wishlist") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,92,0.15)", border: "1px solid rgba(46,125,92,0.3)", color: "#6fcf97" }}>
        On Wishlist
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(163,92,92,0.15)", border: "1px solid rgba(163,92,92,0.3)", color: "#e07070" }}>
      Not For Me
    </span>
  );
}

function SessionDetailModal({ session, onClose, onDispositionChange }) {
  const [changingDisposition, setChangingDisposition] = useState(false);

  const handleDisposition = async (newDisp) => {
    setChangingDisposition(true);
    try {
      await onDispositionChange(session, newDisp);
    } finally {
      setChangingDisposition(false);
    }
  };

  const currentDisp = session.disposition ?? "none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-5 shadow-2xl overflow-y-auto max-h-[85vh]"
        style={{ background: "linear-gradient(145deg, rgba(38,26,18,0.99), rgba(25,17,12,1))", border: "1px solid rgba(180,140,75,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#D8C7A6]/50 hover:text-[#D8C7A6]">
          <X className="w-5 h-5" />
        </button>

        <div className="text-xs uppercase tracking-widest text-[#B48C4B] mb-1">Pipe Club Session</div>
        <h3 className="text-xl font-bold text-[#F5F1E7] pr-6 mb-1" style={{ fontFamily: "'Georgia', serif" }}>
          {session.proposed_blend_name}
        </h3>
        {session.proposed_blend_manufacturer && (
          <p className="text-sm text-[#B48C4B] mb-3">{session.proposed_blend_manufacturer}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <DispositionBadge disposition={session.disposition} />
          {session.recommended_is_best_available && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(180,140,75,0.15)", border: "1px solid rgba(180,140,75,0.3)", color: "#D4A574" }}>
              Best Available
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#D8C7A6]/70">
            <CalendarDays className="w-4 h-4 text-[#B48C4B]/60 flex-shrink-0" />
            {new Date(session.date).toLocaleDateString()}
          </div>
          {session.club_name && (
            <p className="text-sm text-[#D8C7A6]/70 ml-6">{session.club_name}</p>
          )}
          {session.location && (
            <div className="flex items-center gap-2 text-sm text-[#D8C7A6]/70">
              <MapPin className="w-4 h-4 text-[#B48C4B]/60 flex-shrink-0" />
              {session.location}
            </div>
          )}
        </div>

        {/* Recommendation */}
        {session.recommended_pipe_name && (
          <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(60,40,20,0.4)", border: "1px solid rgba(180,140,75,0.25)" }}>
            <p className="text-xs uppercase tracking-widest text-[#B48C4B] mb-1">Recommendation</p>
            <div className="flex items-center gap-2">
              <PipeIcon className="w-4 h-4 flex-shrink-0" color={ACCENT} />
              <span className="font-semibold text-[#F5F1E7]">{session.recommended_pipe_name}</span>
            </div>
            {session.recommended_bowl_name && (
              <p className="text-xs text-[#D8C7A6]/70 ml-6 mt-0.5">Bowl: {session.recommended_bowl_name}</p>
            )}
          </div>
        )}

        {/* Actual pipe used */}
        {session.actual_pipe_name && (
          <div className="mb-3">
            <p className="text-xs text-[#D8C7A6]/60 mb-1">Actually smoked:</p>
            <div className="flex items-center gap-2">
              <PipeIcon className="w-4 h-4 flex-shrink-0" color={ACCENT} />
              <span className="text-sm text-[#F5F1E7]">{session.actual_pipe_name}</span>
            </div>
          </div>
        )}

        {/* Ratings */}
        {(session.overall_rating || session.pairing_rating) && (
          <div className="space-y-1.5 mb-3">
            {session.overall_rating && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#D8C7A6]/60 w-24">Tobacco:</span>
                <StarDisplay value={session.overall_rating} />
              </div>
            )}
            {session.pairing_rating && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#D8C7A6]/60 w-24">Pairing:</span>
                <StarDisplay value={session.pairing_rating} />
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {session.post_session_notes && (
          <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.12)" }}>
            <p className="text-xs text-[#B48C4B] mb-1">Notes</p>
            <p className="text-sm text-[#E0D8C8] whitespace-pre-wrap">{session.post_session_notes}</p>
          </div>
        )}

        {/* Disposition controls */}
        <div className="pt-2 space-y-2">
          <p className="text-xs text-[#D8C7A6]/60">Tobacco disposition:</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={changingDisposition}
              onClick={() => handleDisposition(currentDisp === "wishlist" ? "none" : "wishlist")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{
                background: currentDisp === "wishlist" ? "rgba(46,125,92,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${currentDisp === "wishlist" ? "rgba(46,125,92,0.4)" : "rgba(180,140,75,0.15)"}`,
                color: currentDisp === "wishlist" ? "#6fcf97" : MUTED,
              }}
            >
              {currentDisp === "wishlist" ? <><RotateCcw className="w-3 h-3" /> Undo Wishlist</> : <><BookmarkPlus className="w-3 h-3" /> Wishlist</>}
            </button>
            <button
              type="button"
              disabled={changingDisposition}
              onClick={() => handleDisposition(currentDisp === "not_for_me" ? "none" : "not_for_me")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{
                background: currentDisp === "not_for_me" ? "rgba(163,92,92,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${currentDisp === "not_for_me" ? "rgba(163,92,92,0.4)" : "rgba(180,140,75,0.15)"}`,
                color: currentDisp === "not_for_me" ? "#e07070" : MUTED,
              }}
            >
              {currentDisp === "not_for_me" ? <><RotateCcw className="w-3 h-3" /> Undo Not For Me</> : <><ThumbsDown className="w-3 h-3" /> Not For Me</>}
            </button>
          </div>
          {changingDisposition && (
            <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-[#B48C4B]" /></div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PipeClubHistory — shows all saved Pipe Club sessions.
 */
export default function PipeClubHistory() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["pipe-club-sessions", user?.email],
    queryFn: () => fetchAllEntities(base44.entities.PipeClubSession, { created_by: user?.email, session_type: "pipe_club" }, "-date", 5000, 200, "PipeClubHistory"),
    enabled: !!user?.email,
  });

  const handleDispositionChange = async (session, newDisp) => {
    try {

      // Update AcquisitionItem if it exists
      if (session.wishlist_item_id) {
        if (newDisp === "none") {
          await base44.entities.AcquisitionItem.update(session.wishlist_item_id, { status: "archived" });
        } else if (newDisp === "wishlist") {
          await base44.entities.AcquisitionItem.update(session.wishlist_item_id, { status: "wishlist" });
        } else if (newDisp === "not_for_me") {
          await base44.entities.AcquisitionItem.update(session.wishlist_item_id, { status: "do_not_buy_again" });
        }
      } else if (newDisp !== "none") {
        // Create new AcquisitionItem
        const created = await base44.entities.AcquisitionItem.create({
          name: session.proposed_blend_name,
          manufacturer: session.proposed_blend_manufacturer ?? null,
          item_type: "blend",
          status: newDisp === "wishlist" ? "wishlist" : "do_not_buy_again",
          created_by: user.email,
        });
        await base44.entities.PipeClubSession.update(session.id, {
          disposition: newDisp,
          wishlist_item_id: created?.id ?? null,
        });
        queryClient.invalidateQueries({ queryKey: ["pipe-club-sessions", user?.email] });
        setSelected((prev) => prev?.id === session.id ? { ...prev, disposition: newDisp, wishlist_item_id: created?.id } : prev);
        toast.success(newDisp === "wishlist" ? "Added to Wishlist" : "Marked Not For Me");
        return;
      }

      await base44.entities.PipeClubSession.update(session.id, { disposition: newDisp });
      queryClient.invalidateQueries({ queryKey: ["pipe-club-sessions", user?.email] });
      setSelected((prev) => prev?.id === session.id ? { ...prev, disposition: newDisp } : prev);
      toast.success(
        newDisp === "none" ? "Disposition cleared" :
        newDisp === "wishlist" ? "Added to Wishlist" : "Marked Not For Me"
      );
    } catch {
      toast.error("Failed to update disposition. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#B48C4B]" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-[#D8C7A6]/50 text-sm">No Pipe Club sessions yet.</p>
        <p className="text-[#D8C7A6]/35 text-xs">Start a session to see your history here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => setSelected(session)}
            className="w-full text-left rounded-2xl p-4 transition-colors hover:bg-[rgba(180,140,75,0.06)]"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(180,140,75,0.18)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(180,140,75,0.15)", border: "1px solid rgba(180,140,75,0.25)" }}
              >
                <PipeIcon className="w-4 h-4" color={ACCENT} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-[#F5F1E7] text-sm leading-tight truncate">{session.proposed_blend_name}</p>
                  <DispositionBadge disposition={session.disposition} />
                </div>
                {session.proposed_blend_manufacturer && (
                  <p className="text-xs text-[#B48C4B] truncate">{session.proposed_blend_manufacturer}</p>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-[#D8C7A6]/50">
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                  {session.club_name && (
                    <span className="text-xs text-[#D8C7A6]/50">{session.club_name}</span>
                  )}
                  {session.actual_pipe_name && (
                    <span className="text-xs text-[#D8C7A6]/50">Smoked: {session.actual_pipe_name}</span>
                  )}
                </div>
                {(session.overall_rating != null) && (
                  <div className="mt-1"><StarDisplay value={session.overall_rating} /></div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <SessionDetailModal
          session={selected}
          onClose={() => setSelected(null)}
          onDispositionChange={handleDispositionChange}
        />
      )}
    </>
  );
}
