import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";
import { Users, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PipeIcon from "@/components/icons/PipeIcon";
import PipeClubSessionWizard from "./PipeClubSessionWizard";
import PipeClubHistory from "./PipeClubHistory";
import { useQueryClient } from "@tanstack/react-query";

const ACCENT = "#D4A574";

/**
 * PipeClubHome — landing page for the Pipe Club feature.
 *
 * Shows:
 *  - Prominent "Start Session" call to action
 *  - Recent session history
 */
export default function PipeClubHome() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: recentSessions = [] } = useQuery({
    queryKey: ["pipe-club-sessions-recent", user?.email],
    queryFn: () => fetchAllEntities(base44.entities.PipeClubSession, { created_by: user?.email, session_type: "pipe_club" }, "-date", 5000, 1, "PipeClubHome"),
    enabled: !!user?.email,
  });

  const handleSessionComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ["pipe-club-sessions", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["pipe-club-sessions-recent", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["session-history-calendar", user?.email] });
    setShowHistory(true);
  };

  if (showWizard) {
    return (
      <div className="p-4 md:p-6">
        <PipeClubSessionWizard
          onComplete={handleSessionComplete}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(180,140,75,0.15)", border: "1px solid rgba(180,140,75,0.3)" }}
        >
          <Users className="w-6 h-6" style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1E7]" style={{ fontFamily: "'Georgia', serif" }}>
            Pipe Club
          </h1>
          <p className="text-sm text-[#D8C7A6]/65 mt-0.5">
            Find the best pipe from what you brought for any club tobacco.
          </p>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => setShowWizard(true)}
        className="w-full rounded-2xl p-6 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: "linear-gradient(135deg, rgba(107,74,45,0.6) 0%, rgba(60,40,20,0.7) 100%)",
          border: "1px solid rgba(180,140,75,0.35)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(180,140,75,0.25)", border: "1px solid rgba(180,140,75,0.4)" }}
          >
            <Plus className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-xl font-bold text-[#F5F1E7]" style={{ fontFamily: "'Georgia', serif" }}>
              Start Session
            </p>
            <p className="text-sm text-[#D8C7A6]/65 mt-1 leading-relaxed">
              Select your pipes, identify the club blend, and get an instant recommendation.
            </p>
          </div>
        </div>
      </button>

      {/* How it works */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(180,140,75,0.15)" }}
      >
        <p className="text-xs uppercase tracking-widest text-[#B48C4B] font-medium">How it works</p>
        {[
          ["Select pipes you brought", "Multi-select from your collection."],
          ["Identify the club blend", "Choose from your collection, wishlist, or enter a new tobacco."],
          ["Get the recommendation", "The canonical pairing engine scores only the pipes you have with you."],
          ["Log the session", "Record which pipe you used and rate the experience."],
        ].map(([title, desc]) => (
          <div key={title} className="flex gap-3">
            <PipeIcon className="w-4 h-4 flex-shrink-0 mt-0.5" color="rgba(180,140,75,0.5)" />
            <div>
              <p className="text-sm font-medium text-[#F5F1E7]">{title}</p>
              <p className="text-xs text-[#D8C7A6]/55">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Session history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#B48C4B]" />
            <h2 className="font-semibold text-[#F5F1E7]">Session History</h2>
          </div>
          {!showHistory && recentSessions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="text-xs text-[#D4A574] hover:opacity-80"
            >
              Show all
            </button>
          )}
        </div>

        {showHistory ? (
          <PipeClubHistory />
        ) : (
          recentSessions.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(180,140,75,0.12)" }}
            >
              <p className="text-[#D8C7A6]/40 text-sm">No sessions yet. Start your first Pipe Club session above.</p>
            </div>
          ) : (
            <div
              className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-[rgba(180,140,75,0.06)] transition-colors"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(180,140,75,0.18)" }}
              onClick={() => setShowHistory(true)}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(180,140,75,0.15)" }}
              >
                <PipeIcon className="w-4 h-4" color={ACCENT} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F5F1E7] truncate">{recentSessions[0]?.proposed_blend_name}</p>
                <p className="text-xs text-[#D8C7A6]/50">{recentSessions[0]?.date ? new Date(recentSessions[0].date).toLocaleDateString() : ""}</p>
              </div>
              <span className="text-xs text-[#D4A574]">View all →</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
