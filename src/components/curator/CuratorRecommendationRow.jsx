/**
 * Curator Recommendation Row
 * 
 * Single recommendation item with controls
 * Displays: issue, recommendation, confidence, accept/clarify buttons
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, HelpCircle } from "lucide-react";

const CONFIDENCE_COLORS = {
  high: { bg: "rgba(46,125,92,0.2)", text: "rgba(46,125,92,1)", label: "High" },
  medium: { bg: "rgba(180,140,75,0.2)", text: "rgba(212,165,116,1)", label: "Medium" },
  low: { bg: "rgba(139,58,58,0.2)", text: "rgba(212,120,120,1)", label: "Low" },
};

export default function CuratorRecommendationRow({
  item,
  onAccept,
  onClarify,
  isSelected,
  onToggleSelect,
  isLoading = false,
}) {
  const [expandedDetails, setExpandedDetails] = useState(false);
  const confidenceStyle = CONFIDENCE_COLORS[item.confidence] || CONFIDENCE_COLORS.medium;

  return (
    <div
      className="rounded-lg p-4 mb-3 border transition-all"
      style={{
        background: "rgba(40,28,20,0.4)",
        borderColor: isSelected ? "rgba(46,125,92,0.4)" : "rgba(140,105,65,0.15)",
        boxShadow: isSelected ? "0 0 0 1px rgba(46,125,92,0.3)" : "none",
      }}
    >
      {/* Header: checkbox, item name, confidence */}
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
          <div className="flex items-baseline gap-2 mb-2 flex-wrap">
            <h4 className="text-sm font-semibold" style={{ color: "#F5F1E7" }}>
              {item.itemName}
            </h4>
            {item.type && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: "rgba(180,140,75,0.15)",
                  color: "rgba(212,165,116,1)",
                }}
              >
                {item.type}
              </span>
            )}
          </div>

          {/* Issue description */}
          <p className="text-xs mb-2" style={{ color: "rgba(224,216,200,0.7)" }}>
            <span style={{ color: "rgba(212,120,120,1)" }}>Issue:</span> {item.issue}
          </p>

          {/* Recommendation */}
          <p className="text-xs mb-3" style={{ color: "rgba(224,216,200,0.75)" }}>
            <span style={{ color: "rgba(212,165,116,1)" }}>Recommend:</span> {item.recommendation}
          </p>

          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                background: confidenceStyle.bg,
                color: confidenceStyle.text,
              }}
            >
              {confidenceStyle.label} confidence
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "rgba(140,105,65,0.1)" }}>
        {onAccept && (
          <Button
            onClick={() => onAccept(item)}
            disabled={isLoading}
            size="sm"
            className="text-xs px-3 h-8"
            style={{
              background: "linear-gradient(135deg, rgba(46,125,92,0.9), rgba(38,100,73,1))",
              border: "1px solid rgba(46,125,92,0.4)",
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Accept
          </Button>
        )}

        {onClarify && (
          <Button
            onClick={() => onClarify(item)}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="text-xs px-3 h-8"
            style={{
              borderColor: "rgba(180,140,75,0.25)",
              color: "rgba(212,165,116,1)",
            }}
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1" />
            Clarify
          </Button>
        )}
      </div>
    </div>
  );
}