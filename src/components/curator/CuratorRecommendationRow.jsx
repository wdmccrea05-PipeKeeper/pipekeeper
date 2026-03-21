/**
 * Curator Recommendation Row
 *
 * Single recommendation item with full workflow controls:
 * Accept, Dismiss, Exclude This Item, Show Why, Ask Curator to Clarify
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, HelpCircle, XCircle, Ban, ChevronDown } from "lucide-react";
import { recordRecommendationAction } from "./curatorRecommendationHistory";

const CONFIDENCE_COLORS = {
  high: { bg: "rgba(46,125,92,0.2)", text: "rgba(46,125,92,1)", label: "High" },
  medium: { bg: "rgba(180,140,75,0.2)", text: "rgba(212,165,116,1)", label: "Medium" },
  low: { bg: "rgba(139,58,58,0.2)", text: "rgba(212,120,120,1)", label: "Low" },
};

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
        style={{ background: "rgba(20,14,10,0.3)", border: "1px solid rgba(140,105,65,0.1)", color: "rgba(224,216,200,0.4)" }}
      >
        <span>{item.itemName} — {excluded ? 'excluded from future suggestions' : 'dismissed'}</span>
        <button
          onClick={() => { setDismissed(false); setExcluded(false); }}
          className="text-xs hover:opacity-80 underline"
          style={{ color: "rgba(180,140,75,0.6)" }}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4 mb-3 border transition-all"
      style={{
        background: "rgba(40,28,20,0.4)",
        borderColor: isSelected ? "rgba(46,125,92,0.4)" : "rgba(140,105,65,0.15)",
        boxShadow: isSelected ? "0 0 0 1px rgba(46,125,92,0.3)" : "none",
      }}
    >
      {/* Header: checkbox, item name, type badge, confidence */}
      <div className="flex items-start gap-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.id)}
            className="w-5 h-5 mt-1 rounded accent-green-600 cursor-pointer flex-shrink-0"
            disabled={isLoading}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
            <h4 className="text-sm font-semibold" style={{ color: "#F5F1E7" }}>
              {item.itemName}
            </h4>
            {item.type && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(180,140,75,0.15)", color: "rgba(212,165,116,1)" }}
              >
                {item.type}
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: confidenceStyle.bg, color: confidenceStyle.text }}
            >
              {confidenceStyle.label} confidence
            </span>
          </div>

          <p className="text-xs mb-1.5" style={{ color: "rgba(224,216,200,0.7)" }}>
            <span style={{ color: "rgba(212,120,120,1)" }}>Issue: </span>{item.issue}
          </p>
          <p className="text-xs mb-2" style={{ color: "rgba(224,216,200,0.75)" }}>
            <span style={{ color: "rgba(212,165,116,1)" }}>Recommend: </span>{item.recommendation}
          </p>

          {/* Show Why toggle */}
          {item.proposedChange?.payload && Object.keys(item.proposedChange.payload).length > 0 && (
            <button
              onClick={() => setShowWhy(v => !v)}
              className="flex items-center gap-1 text-xs mb-2 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "rgba(180,140,75,1)" }}
            >
              <ChevronDown
                className="w-3 h-3 transition-transform"
                style={{ transform: showWhy ? 'rotate(0)' : 'rotate(-90deg)' }}
              />
              Show Why
            </button>
          )}

          {showWhy && item.proposedChange && (
            <div
              className="rounded p-2.5 mb-2 text-xs font-mono"
              style={{ background: "rgba(0,0,0,0.3)", color: "rgba(180,200,180,0.85)", border: "1px solid rgba(100,130,100,0.2)" }}
            >
              <p className="font-semibold text-green-400 mb-1">Proposed Change</p>
              <p>Type: {item.proposedChange.type}</p>
              {Object.entries(item.proposedChange.payload || {}).map(([k, v]) => (
                <p key={k}>{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: "rgba(140,105,65,0.1)" }}>
        {onAccept && (
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            size="sm"
            className="text-xs px-3 h-8 gap-1"
            style={{
              background: "linear-gradient(135deg, rgba(46,125,92,0.9), rgba(38,100,73,1))",
              border: "1px solid rgba(46,125,92,0.4)",
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accept
          </Button>
        )}

        {onClarify && (
          <Button
            onClick={() => onClarify(item)}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="text-xs px-3 h-8 gap-1"
            style={{ borderColor: "rgba(180,140,75,0.25)", color: "rgba(212,165,116,1)" }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Ask Curator
          </Button>
        )}

        <Button
          onClick={handleDismiss}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="text-xs px-3 h-8 gap-1 ml-auto"
          style={{ color: "rgba(224,216,200,0.45)" }}
        >
          <XCircle className="w-3.5 h-3.5" />
          Dismiss
        </Button>

        <Button
          onClick={handleExclude}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="text-xs px-3 h-8 gap-1"
          style={{ color: "rgba(200,100,100,0.6)" }}
          title="Exclude this item from future suggestions"
        >
          <Ban className="w-3.5 h-3.5" />
          Exclude
        </Button>
      </div>
    </div>
  );
}