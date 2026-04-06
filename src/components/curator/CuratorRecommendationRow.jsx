/**
 * Curator Recommendation Row
 *
 * Single recommendation item with full workflow controls:
 * Accept, Dismiss, Exclude This Item, Show Why, Ask Curator to Clarify
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, HelpCircle, XCircle, Ban, ChevronDown, ArrowRight } from "lucide-react";
import { recordRecommendationAction } from "./curatorRecommendationHistory";

const CONFIDENCE_COLORS = {
  high: { bg: "rgba(46,125,92,0.15)", text: "rgba(80,180,130,1)", label: "High" },
  medium: { bg: "rgba(180,140,75,0.15)", text: "rgba(212,165,116,1)", label: "Medium" },
  low: { bg: "rgba(139,58,58,0.15)", text: "rgba(212,120,120,1)", label: "Low" },
};

/** Format a proposed-change payload into readable key→value lines. */
function renderProposedChange(proposedChange) {
  if (!proposedChange) return null;
  const { type, payload } = proposedChange;
  if (!payload || typeof payload !== "object") return null;

  const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;

  const humanizeKey = (k) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const humanizeValue = (v) => {
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object") return Object.entries(v).map(([k2, v2]) => `${humanizeKey(k2)}: ${v2}`).join("; ");
    return String(v);
  };

  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1.5"
      style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(140,105,65,0.18)" }}
    >
      {type && (
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(180,140,75,0.8)" }}>
          {type.replace(/_/g, " ")}
        </p>
      )}
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-2">
          <span className="shrink-0 font-medium" style={{ color: "rgba(224,216,200,0.55)", minWidth: "6rem" }}>
            {humanizeKey(k)}
          </span>
          <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "rgba(180,140,75,0.4)" }} />
          <span style={{ color: "rgba(224,216,200,0.85)" }}>{humanizeValue(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CuratorRecommendationRow({
  item,
  workflowId,
  onAccept,
  onClarify,
  onDismiss,
  onExclude,
  isSelected,
  onToggleSelect,
  isLoading = false,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [excluded, setExcluded] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const confidenceStyle = CONFIDENCE_COLORS[item.confidence] || CONFIDENCE_COLORS.medium;
  const hasProposedChange =
    item.proposedChange?.payload && Object.keys(item.proposedChange.payload).length > 0;

  const handleDismiss = () => {
    recordRecommendationAction(item.id, 'dismissed');
    setDismissed(true);
    if (onDismiss) onDismiss(item);
  };

  const handleExclude = () => {
    recordRecommendationAction(item.id, 'excluded');
    setExcluded(true);
    if (onExclude) onExclude(item);
  };

  const handleAccept = async () => {
    recordRecommendationAction(item.id, 'accepted');
    if (onAccept) await onAccept(item);
  };

  if (dismissed || excluded) {
    return (
      <div
        className="rounded-lg px-4 py-2.5 mb-2 flex items-center justify-between text-xs"
        style={{ background: "rgba(20,14,10,0.3)", border: "1px solid rgba(140,105,65,0.08)", color: "rgba(224,216,200,0.35)" }}
      >
        <span>{item.itemName} — {excluded ? 'excluded from future suggestions' : 'dismissed'}</span>
        <button
          onClick={() => { setDismissed(false); setExcluded(false); }}
          className="text-xs hover:opacity-80 underline ml-4 shrink-0"
          style={{ color: "rgba(180,140,75,0.55)" }}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl mb-3 overflow-hidden transition-all"
      style={{
        background: isSelected ? "rgba(46,125,92,0.07)" : "rgba(35,24,17,0.55)",
        border: `1px solid ${isSelected ? "rgba(46,125,92,0.35)" : "rgba(140,105,65,0.16)"}`,
        boxShadow: isSelected ? "0 0 0 1px rgba(46,125,92,0.2)" : "none",
      }}
    >
      <div className="p-4">
        {/* Header row: checkbox, item name, badges */}
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-4 h-4 mt-1 rounded accent-green-600 cursor-pointer flex-shrink-0"
              disabled={isLoading}
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Item name + badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: "#F5F1E7" }}>
                {item.itemName}
              </span>
              {item.type && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(180,140,75,0.13)", color: "rgba(212,165,116,0.9)" }}
                >
                  {item.type}
                </span>
              )}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: confidenceStyle.bg, color: confidenceStyle.text }}
              >
                {confidenceStyle.label}
              </span>
            </div>

            {/* Issue */}
            <p className="text-sm leading-relaxed mb-1.5" style={{ color: "rgba(224,216,200,0.75)" }}>
              <span className="font-medium" style={{ color: "rgba(212,120,120,0.9)" }}>Issue: </span>
              {item.issue}
            </p>

            {/* Recommendation */}
            <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.8)" }}>
              <span className="font-medium" style={{ color: "rgba(212,165,116,0.9)" }}>Suggested: </span>
              {item.recommendation}
            </p>
          </div>
        </div>

        {/* "What changes" disclosure */}
        {hasProposedChange && (
          <div className="mt-3">
            <button
              onClick={() => setShowWhy(v => !v)}
              className="flex items-center gap-1.5 text-xs transition-opacity"
              style={{ color: showWhy ? "rgba(212,165,116,0.9)" : "rgba(180,140,75,0.6)" }}
            >
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{ transform: showWhy ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              />
              {showWhy ? "Hide changes" : "What would change"}
            </button>
            {showWhy && (
              <div className="mt-2">
                {renderProposedChange(item.proposedChange)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3"
        style={{ borderTop: "1px solid rgba(140,105,65,0.1)", background: "rgba(0,0,0,0.12)" }}
      >
        {onAccept && (
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            size="sm"
            className="text-xs h-8 gap-1.5 font-medium"
            style={{
              background: "linear-gradient(135deg, rgba(46,125,92,0.9), rgba(38,100,73,1))",
              border: "1px solid rgba(46,125,92,0.3)",
              color: "#e8f5ee",
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {hasProposedChange ? "Accept & Apply Changes" : "Accept"}
          </Button>
        )}

        {onClarify && (
          <Button
            onClick={() => onClarify(item)}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            style={{ borderColor: "rgba(180,140,75,0.22)", color: "rgba(212,165,116,0.9)" }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Ask Curator
          </Button>
        )}

        <div className="ml-auto flex gap-1">
          <Button
            onClick={handleDismiss}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="text-xs h-8 gap-1"
            style={{ color: "rgba(224,216,200,0.38)" }}
          >
            <XCircle className="w-3.5 h-3.5" />
            Dismiss
          </Button>

          <Button
            onClick={handleExclude}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="text-xs h-8 gap-1"
            style={{ color: "rgba(200,100,100,0.5)" }}
            title="Exclude this item from future suggestions"
          >
            <Ban className="w-3.5 h-3.5" />
            Exclude
          </Button>
        </div>

        {onAccept && hasProposedChange && (
          <p className="w-full text-xs mt-1" style={{ color: "rgba(224,216,200,0.38)" }}>
            Accepting will apply the changes shown above to this record in your collection.
          </p>
        )}
        {onAccept && !hasProposedChange && (
          <p className="w-full text-xs mt-1" style={{ color: "rgba(224,216,200,0.38)" }}>
            Accepting acknowledges this recommendation — no automatic data change will occur.
          </p>
        )}
      </div>
    </div>
  );
}