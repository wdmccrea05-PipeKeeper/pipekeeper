import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";
import { Search, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * BlendQuickLookup — searches ALL TobaccoBlend records in the system (not just
 * the current user's collection) to quickly find and pre-fill blend metadata.
 *
 * Props:
 *   onSelect   (blend) => void   - called with the full blend record when chosen
 *   excludeIds  Set<string>       - blend IDs to exclude from results (e.g. already owned)
 */
export default function BlendQuickLookup({ onSelect, excludeIds = new Set() }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedName, setSelectedName] = useState(null);
  const containerRef = useRef(null);

  // Lazy-load ALL blends only when the user focuses the search field
  const { data: allBlends = [], isLoading } = useQuery({
    queryKey: ["all-tobacco-blends-global"],
    queryFn: () => fetchAllEntities(base44.entities.TobaccoBlend, {}, "-updated_date", 5000, 200, "BlendQuickLookup"),
    enabled: focused,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  // Deduplicate by name+manufacturer, exclude already-owned, and filter by query
  const results = useMemo(() => {
    if (!allBlends.length) return [];
    const seen = new Set();
    const deduped = [];
    for (const b of allBlends) {
      if (excludeIds.has(b.id)) continue;
      const key = `${(b.name || "").toLowerCase()}|${(b.manufacturer || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(b);
    }
    if (!query.trim()) return deduped.slice(0, 8);
    const q = query.toLowerCase();
    return deduped
      .filter((b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.manufacturer || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [allBlends, query, excludeIds]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (blend) => {
    setSelectedName(blend.name);
    setQuery("");
    setFocused(false);
    onSelect?.(blend);
  };

  return (
    <div ref={containerRef} className="space-y-1">
      <label className="text-xs text-[#D8C7A6]/70">Quick Lookup (search all known blends)</label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D8C7A6]/40" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedName(null); }}
            onFocus={() => setFocused(true)}
            placeholder="Search by name or manufacturer…"
            className="pl-8 bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
          />
          {isLoading && focused && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[#B48C4B]" />
          )}
        </div>

        {focused && !selectedName && (
          <div className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden max-h-64 overflow-y-auto"
            style={{ background: "rgba(25,17,12,0.99)", border: "1px solid rgba(180,140,75,0.3)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
          >
            {isLoading && allBlends.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#B48C4B]" />
                <span className="text-xs text-[#D8C7A6]/60">Loading blend database…</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-[#D8C7A6]/50">
                  {query.trim() ? "No matches found. Enter manually below." : "Start typing to search…"}
                </p>
              </div>
            ) : (
              results.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className="w-full text-left px-3 py-2 transition-colors hover:bg-[rgba(180,140,75,0.12)]"
                  style={{ borderBottom: "1px solid rgba(180,140,75,0.08)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F5F1E7] truncate">{b.name}</p>
                      {b.manufacturer && <p className="text-xs text-[#B48C4B] truncate">{b.manufacturer}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.blend_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(180,140,75,0.15)", color: "#D4A574", border: "1px solid rgba(180,140,75,0.25)" }}
                        >
                          {b.blend_type}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedName && (
        <div className="flex items-center gap-1.5 text-xs text-[#6fcf97]">
          <Check className="w-3 h-3" />
          <span className="truncate">Filled from: {selectedName}</span>
          <button
            type="button"
            onClick={() => setSelectedName(null)}
            className="text-[#D8C7A6]/50 hover:text-[#D8C7A6] ml-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}