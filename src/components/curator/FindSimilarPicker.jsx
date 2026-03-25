import React, { useState } from "react";
import { SearchCheck, X, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_CONFIG = {
  find_similar_blends: {
    label: "Discover Similar Blends",
    itemsKey: "blends",
    nameFn: (b) => `${b.name}${b.manufacturer ? ` — ${b.manufacturer}` : ""}`,
    keyFn: (b) => b.id,
    noun: "blend",
  },
  find_similar_pipes: {
    label: "Discover Similar Pipes",
    itemsKey: "pipes",
    nameFn: (p) => `${p.name}${p.maker ? ` — ${p.maker}` : ""}`,
    keyFn: (p) => p.id,
    noun: "pipe",
  },
  find_similar_bottles: {
    label: "Discover Similar Pours",
    itemsKey: "bottles",
    nameFn: (b) => `${b.name}${b.distillery ? ` — ${b.distillery}` : ""}`,
    keyFn: (b) => b.id,
    noun: "bottle",
  },
};

/** Returns up to 3 "best" items as default anchors based on usage + favorites */
function getTop3(items, logs, actionType) {
  if (!items?.length) return [];

  const isBlend = actionType === "find_similar_blends";
  const isPipe = actionType === "find_similar_pipes";

  // Count usage from logs
  const usageCounts = {};
  if (logs?.length) {
    for (const log of logs) {
      const key = isBlend ? log.blend_name : isPipe ? log.pipe_name : log.bottle_id;
      if (key) usageCounts[key] = (usageCounts[key] || 0) + 1;
    }
  }

  const scored = items.map((item) => {
    const usageKey = isBlend ? item.name : isPipe ? item.name : item.id;
    const usage = usageCounts[usageKey] || 0;
    const fav = item.is_favorite ? 3 : 0;
    return { item, score: usage + fav };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.item);
}

export default function FindSimilarPicker({
  actionType,
  pipes = [],
  blends = [],
  bottles = [],
  smokingLogs = [],
  tastingLogs = [],
  onConfirm,
  onCancel,
}) {
  const config = TYPE_CONFIG[actionType];
  if (!config) return null;

  const allItems = actionType === "find_similar_blends" ? blends
    : actionType === "find_similar_pipes" ? pipes
    : bottles;

  const logs = actionType === "find_similar_bottles" ? tastingLogs : smokingLogs;
  const top3 = getTop3(allItems, logs, actionType);

  const [mode, setMode] = useState("top3"); // "top3" | "pick"
  const [selectedId, setSelectedId] = useState(top3[0]?.id || allItems[0]?.id || "");

  const selectedItem = allItems.find((i) => i.id === selectedId);

  const handleConfirm = () => {
    if (mode === "top3") {
      onConfirm(top3.length > 0 ? top3 : allItems.slice(0, 3), true);
    } else {
      if (!selectedItem) return;
      onConfirm([selectedItem], false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mb-4 space-y-4"
      style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.98), rgba(32,22,15,0.98))",
        border: "1px solid rgba(180,140,75,0.3)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SearchCheck className="w-4 h-4 text-[#B48C4B]" />
          <span className="text-sm font-semibold text-[#F5F1E7]">{config.label}</span>
        </div>
        <button
          onClick={onCancel}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 text-[#D8C7A6]/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-[#E0D8C8]/65">
        Which {config.noun} should Curator use as a reference for finding similar items?
      </p>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("top3")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === "top3"
              ? "bg-[rgba(180,140,75,0.2)] border border-[rgba(180,140,75,0.4)] text-[#D4A574]"
              : "border border-[rgba(180,140,75,0.15)] text-[#E0D8C8]/60 hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          My Top {Math.min(3, top3.length) || 3} {config.noun}s
        </button>
        <button
          onClick={() => setMode("pick")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === "pick"
              ? "bg-[rgba(180,140,75,0.2)] border border-[rgba(180,140,75,0.4)] text-[#D4A574]"
              : "border border-[rgba(180,140,75,0.15)] text-[#E0D8C8]/60 hover:bg-white/5"
          }`}
        >
          Choose a specific {config.noun}
        </button>
      </div>

      {/* Top 3 display */}
      {mode === "top3" && (
        <div className="space-y-1.5">
          {(top3.length > 0 ? top3 : allItems.slice(0, 3)).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(180,140,75,0.12)" }}
            >
              {item.is_favorite && <Star className="w-3 h-3 text-[#D4A574] flex-shrink-0" />}
              <span className="text-[#E0D8C8]/85 truncate">{config.nameFn(item)}</span>
            </div>
          ))}
          {top3.length === 0 && allItems.length === 0 && (
            <p className="text-xs text-[#E0D8C8]/45 text-center py-2">No items found.</p>
          )}
          <p className="text-[10px] text-[#E0D8C8]/40 pt-1">
            Based on most-used and favorited {config.noun}s
          </p>
        </div>
      )}

      {/* Single pick dropdown */}
      {mode === "pick" && (
        <div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-[#F5F1E7] appearance-none"
            style={{
              background: "rgba(20,15,12,0.7)",
              border: "1px solid rgba(180,140,75,0.3)",
              outline: "none",
            }}
          >
            {allItems.map((item) => (
              <option key={item.id} value={item.id} style={{ background: "#241913" }}>
                {config.nameFn(item)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={mode === "pick" && !selectedItem}
        className="w-full"
        style={{ background: "linear-gradient(135deg, #a35c5c, #8f4e4e)", color: "#fff" }}
      >
        <SearchCheck className="w-4 h-4 mr-2" />
        Find Similar
      </Button>
    </div>
  );
}