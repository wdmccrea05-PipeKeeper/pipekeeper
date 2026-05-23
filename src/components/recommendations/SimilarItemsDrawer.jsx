import React from "react";
import { X, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const GROUP_LABELS = {
  closest_match: "Closest Match",
  adjacent_exploration: "Adjacent Exploration",
  premium_step_up: "Premium Step-Up",
  value_pick: "Value Pick",
  collection_gap: "Collection Gap",
};

const TYPE_LABELS = {
  blend: "Blends",
  pipe: "Pipes",
  bottle: "Pours",
  wine: "Wines",
  cigar: "Cigars",
};

const LOADING_COPY = {
  blend: "Finding similar blends…",
  pipe: "Finding similar pipes…",
  bottle: "Finding similar pours…",
  wine: "Finding similar wines…",
  cigar: "Finding similar cigars…",
};

function SimilarItemCard({ item }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(180,140,75,0.18)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-[#F5F1E7] break-words">{item.title}</div>
          {item.category && (
            <div className="text-xs text-[#B48C4B] mt-0.5 uppercase tracking-wider">{item.category}</div>
          )}
          {item.anchorRef && (
            <div className="text-xs mt-0.5" style={{ color: "rgba(212,165,116,0.6)" }}>Similar to: {item.anchorRef}</div>
          )}
        </div>
        {item.group && GROUP_LABELS[item.group] && (
          <span
            className="text-xs px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
            style={{
              background: "rgba(180,140,75,0.14)",
              border: "1px solid rgba(180,140,75,0.25)",
              color: "#D4A574",
            }}
          >
            {GROUP_LABELS[item.group]}
          </span>
        )}
      </div>

      <p className="text-sm text-[#E0D8C8]/85 leading-relaxed">{item.explanation}</p>

      {Array.isArray(item.characteristics) && item.characteristics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.characteristics.map((c, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(180,140,75,0.1)",
                border: "1px solid rgba(180,140,75,0.2)",
                color: "rgba(224,216,200,0.8)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {item.whyFitsYou && (
        <p
          className="text-xs italic pl-3"
          style={{ color: "rgba(212,165,116,0.8)", borderLeft: "2px solid rgba(180,140,75,0.3)" }}
        >
          {item.whyFitsYou}
        </p>
      )}
    </div>
  );
}

export default function SimilarItemsDrawer({
  isOpen,
  onClose,
  result,
  loading,
  error,
  onRetry,
  recordType = "blend",
  anchorName,
}) {
  if (!isOpen) return null;

  const typeLabel = TYPE_LABELS[recordType] || "Items";
  const loadingText = LOADING_COPY[recordType] || "Finding similar items…";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-t-3xl flex flex-col"
        style={{
          background: "linear-gradient(145deg, rgba(38,26,18,0.99), rgba(25,17,12,1))",
          border: "1px solid rgba(180,140,75,0.2)",
          borderBottom: "none",
          height: "90vh",
          maxHeight: "90vh",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ borderColor: "rgba(180,140,75,0.15)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#B48C4B]" />
              <span className="font-semibold text-[#F5F1E7]">Similar {typeLabel} to Try</span>
            </div>
            {anchorName && (
              <p className="text-xs text-[#D8C7A6]/65 mt-0.5">Based on {anchorName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-[#D8C7A6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="w-9 h-9 rounded-full border-4 animate-spin"
                style={{
                  borderColor: "rgba(180,140,75,0.2)",
                  borderTopColor: "#B48C4B",
                }}
              />
              <p className="text-sm text-[#D8C7A6]/70">{loadingText}</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <p className="text-[#E0D8C8]/70 text-sm max-w-sm">
                We couldn't generate similar recommendations right now. Please try again.
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && result && (
            <div className="space-y-4">
              {result.summary && (
                <p className="text-sm text-[#D8C7A6]/75 leading-relaxed pb-1">{result.summary}</p>
              )}

              {result.items?.length > 0 ? (
                result.items.map((item, i) => (
                  <SimilarItemCard key={item.id || i} item={item} />
                ))
              ) : (
                <div className="text-center py-10 text-[#D8C7A6]/65 text-sm leading-relaxed">
                  We couldn't find enough strong non-owned matches from this item.
                  <br />
                  Try a broader search in Curator for more options.
                </div>
              )}

              {result.insufficientResults && result.items?.length > 0 && (
                <p className="text-xs text-[#D8C7A6]/50 text-center pt-1">
                  Fewer than 3 strong matches found. Try Curator for a broader search.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (result || error) && (
          <div
            className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0"
            style={{ borderColor: "rgba(180,140,75,0.15)" }}
          >
            <button
              onClick={onRetry}
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: "#B48C4B" }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-xs hover:opacity-80 transition-opacity"
              style={{ color: "rgba(216,199,166,0.6)" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}