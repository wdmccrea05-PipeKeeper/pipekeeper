import React, { useState, useMemo } from "react";
import { Search, X, CheckSquare, Square } from "lucide-react";
import PipeIcon from "@/components/icons/PipeIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getItemPhoto } from "@/lib/images/getItemPhoto";

/**
 * PipePresentSelector — multi-select of pipes from the user's collection.
 *
 * Each pipe can optionally have interchangeable bowls; when present, the user
 * can select which bowl variant is physically at the meeting.
 *
 * Props:
 *   pipes        {object[]}            - all Pipe records from user's collection
 *   selected     {Set<string>}         - set of pipe IDs currently selected
 *   bowlSelections {object}            - map of pipe_id → bowl_variant_id (or null = main pipe)
 *   onToggle     (pipeId) => void
 *   onBowlChange (pipeId, bowlVariantId) => void
 *   onSelectAll  () => void
 *   onClearAll   () => void
 */
export default function PipePresentSelector({
  pipes = [],
  selected,
  bowlSelections = {},
  onToggle,
  onBowlChange,
  onSelectAll,
  onClearAll,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return pipes;
    const q = search.toLowerCase();
    return pipes.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.maker || "").toLowerCase().includes(q)
    );
  }, [pipes, search]);

  return (
    <div className="space-y-3">
      {/* Search + bulk controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B48C4B]/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pipes…"
            className="pl-9 bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onSelectAll} className="text-xs text-[#D4A574] hover:text-[#D4A574]">
          All
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearAll} className="text-xs text-[#D8C7A6]/60">
          Clear
        </Button>
      </div>

      {/* Pipe list */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-[#D8C7A6]/50 py-6">No pipes in your collection.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {filtered.map((pipe) => {
            const isSelected = selected.has(pipe.id);
            const photo = getItemPhoto(pipe);
            const hasBowls = Array.isArray(pipe.bowl_variants) && pipe.bowl_variants.length > 0;
            const selectedBowl = bowlSelections[pipe.id];

            return (
              <div key={pipe.id} className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${isSelected ? "rgba(180,140,75,0.4)" : "rgba(180,140,75,0.15)"}` }}
              >
                {/* Pipe row */}
                <button
                  type="button"
                  onClick={() => onToggle(pipe.id)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-[rgba(180,140,75,0.06)]"
                  style={{ background: isSelected ? "rgba(60,40,20,0.4)" : "transparent" }}
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 flex-shrink-0" style={{ color: "#D4A574" }} />
                  ) : (
                    <Square className="w-5 h-5 flex-shrink-0 text-[#B48C4B]/40" />
                  )}
                  <div
                    className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: "rgba(180,140,75,0.1)", border: "1px solid rgba(180,140,75,0.2)" }}
                  >
                    {photo ? (
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <PipeIcon className="w-4 h-4" color="#B48C4B" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#F5F1E7] truncate">{pipe.name}</p>
                    {pipe.maker && (
                      <p className="text-xs text-[#B48C4B] truncate">{pipe.maker}</p>
                    )}
                  </div>
                </button>

                {/* Bowl variant sub-selector */}
                {isSelected && hasBowls && (
                  <div
                    className="px-3 pb-3 pt-1 space-y-1"
                    style={{ borderTop: "1px solid rgba(180,140,75,0.12)" }}
                  >
                    <p className="text-xs text-[#D8C7A6]/60 mb-1">Which bowl is present?</p>
                    {/* "All / main pipe" option */}
                    <button
                      type="button"
                      onClick={() => onBowlChange(pipe.id, null)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: selectedBowl === null ? "rgba(180,140,75,0.2)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selectedBowl === null ? "rgba(180,140,75,0.35)" : "rgba(180,140,75,0.1)"}`,
                        color: selectedBowl === null ? "#D4A574" : "rgba(224,216,200,0.6)",
                      }}
                    >
                      All bowls / main pipe
                    </button>
                    {pipe.bowl_variants.map((bv) => (
                      <button
                        key={bv.id}
                        type="button"
                        onClick={() => onBowlChange(pipe.id, bv.id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: selectedBowl === bv.id ? "rgba(180,140,75,0.2)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${selectedBowl === bv.id ? "rgba(180,140,75,0.35)" : "rgba(180,140,75,0.1)"}`,
                          color: selectedBowl === bv.id ? "#D4A574" : "rgba(224,216,200,0.6)",
                        }}
                      >
                        {bv.name || `Bowl ${bv.id}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[#D8C7A6]/50 text-right">
        {selected.size} of {pipes.length} selected
      </p>
    </div>
  );
}
