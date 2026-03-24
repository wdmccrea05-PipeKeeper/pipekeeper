import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, Trash2 } from "lucide-react";

export default function CuratorActionResultCard({
  item,
  state,
  onAccept,
  onReject,
  onAskCurator,
}) {
  const isApplying = state?.status === "applying";
  const isAccepted = state?.status === "accepted";
  const isRejected = state?.status === "rejected";

  return (
    <div
      className="rounded-xl p-4 sm:p-5 border"
      style={{
        background: isAccepted
          ? "linear-gradient(135deg, rgba(46, 125, 92, 0.12), rgba(46, 125, 92, 0.08))"
          : isRejected
          ? "linear-gradient(135deg, rgba(100, 70, 45, 0.1), rgba(100, 70, 45, 0.08))"
          : "linear-gradient(135deg, rgba(60, 45, 30, 0.5), rgba(50, 35, 25, 0.4))",
        borderColor: isAccepted
          ? "rgba(46, 125, 92, 0.35)"
          : isRejected
          ? "rgba(100, 70, 45, 0.35)"
          : "rgba(140, 105, 65, 0.3)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4
          className="font-semibold text-base leading-snug"
          style={{
            color: isAccepted ? "#4A7C59" : isRejected ? "#C87941" : "#F5F1E7",
          }}
        >
          {item.title}
        </h4>
        {(isAccepted || isRejected) && (
          <CheckCircle2
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{
              color: isAccepted ? "#4A7C59" : "#C87941",
            }}
          />
        )}
      </div>

      {/* Record info */}
      {item.recordName && (
        <div
          className="text-xs uppercase tracking-wide mb-2"
          style={{ color: "rgba(212, 165, 116, 0.7)" }}
        >
          {item.recordType}: {item.recordName}
        </div>
      )}

      {/* Explanation */}
      <p
        className="text-sm mb-3 leading-relaxed"
        style={{ color: "rgba(245, 241, 231, 0.85)" }}
      >
        {item.explanation}
      </p>

      {/* Rationale */}
      {item.rationale && (
        <p
          className="text-xs mb-3 leading-relaxed italic"
          style={{ color: "rgba(224, 216, 200, 0.65)" }}
        >
          {item.rationale}
        </p>
      )}

      {/* Confidence */}
      {typeof item.confidence === "number" && (
        <div
          className="text-xs mb-3"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          Confidence: <strong>{Math.round(item.confidence * 100)}%</strong>
        </div>
      )}

      {/* Proposed changes */}
      {item.proposedChanges && Object.keys(item.proposedChanges).length > 0 && (
        <div className="mb-3 p-2 rounded-lg" style={{ background: "rgba(180, 140, 75, 0.08)" }}>
          <div
            className="text-xs uppercase tracking-wide mb-1.5"
            style={{ color: "rgba(180, 140, 75, 0.8)" }}
          >
            Changes
          </div>
          <pre
            className="text-xs leading-relaxed overflow-auto"
            style={{ color: "rgba(224, 216, 200, 0.75)" }}
          >
            {Object.entries(item.proposedChanges)
              .map(([key, val]) => `${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`)
              .join("\n")}
          </pre>
        </div>
      )}

      {/* Status message */}
      {isAccepted && (
        <p
          className="text-sm font-medium mb-3"
          style={{ color: "#4A7C59" }}
        >
          ✓ Applied to your collection
        </p>
      )}

      {isRejected && (
        <p
          className="text-sm font-medium mb-3"
          style={{ color: "#C87941" }}
        >
          ✕ Dismissed
        </p>
      )}

      {/* Action buttons */}
      {!isAccepted && !isRejected && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isApplying}
            style={{
              background: "linear-gradient(135deg, rgba(74, 124, 89, 0.95), rgba(65, 105, 76, 1))",
              color: "white",
            }}
            className="hover:opacity-90"
          >
            {isApplying ? "Applying…" : "Accept"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isApplying}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reject
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onAskCurator}
            disabled={isApplying}
            className="gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask
          </Button>
        </div>
      )}
    </div>
  );
}