import React, { useMemo, useState } from "react";
import { Loader2, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { rankSearchResults } from "@/utils/search/SmartSearchEngine";

const ENTITY_BY_TYPE = {
  pipe: "Pipe",
  blend: "TobaccoBlend",
  bottle: "Bottle",
};

const PLACEHOLDERS = {
  pipe: "Search for a pipe you tried...",
  blend: "Search for a blend you tried...",
  bottle: "Search for a whiskey you tried...",
};

function normalizeResult(itemType, item) {
  if (itemType === "pipe") {
    return {
      id: item.id,
      item_type: "pipe",
      name: item.name || item.model || "Unknown Pipe",
      brand_or_maker: item.maker || "",
      maker: item.maker || "",
      model: item.model || item.name || "",
      shape: item.shape || "",
      notes: item.notes || "",
      _searchScore: item._searchScore,
      _isExact: item._isExact,
    };
  }

  if (itemType === "blend") {
    return {
      id: item.id,
      item_type: "blend",
      name: item.name || "Unknown Blend",
      brand_or_maker: item.manufacturer || "",
      manufacturer: item.manufacturer || "",
      blend_type: item.blend_type || "",
      cut: item.cut || "",
      notes: item.notes || "",
      _searchScore: item._searchScore,
      _isExact: item._isExact,
    };
  }

  return {
    id: item.id,
    item_type: "bottle",
    name: item.name || item.expression || "Unknown Whiskey",
    brand_or_maker: item.distillery || "",
    distillery: item.distillery || "",
    expression: item.expression || item.name || "",
    type: item.type || item.whiskey_type || "",
    age: item.age || "",
    notes: item.notes || "",
    _searchScore: item._searchScore,
    _isExact: item._isExact,
  };
}

export default function ExternalItemSearch({
  itemType,
  value,
  onSelect,
  onManualAdd,
  label,
}) {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const placeholder = useMemo(
    () => PLACEHOLDERS[itemType] || "Search...",
    [itemType]
  );

  const handleSearch = async (rawQuery = query) => {
    const q = (rawQuery || "").trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    setSearched(false);

    try {
      const entityName = ENTITY_BY_TYPE[itemType];
      const allItems = await base44.entities[entityName]
        .list("-updated_date", 500)
        .catch(() => []);

      const ranked = rankSearchResults(q, allItems || [], itemType);
      const normalized = ranked.slice(0, 12).map((item) => normalizeResult(itemType, item));

      setResults(normalized);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {label ? (
        <p
          className="text-sm font-medium"
          style={{ color: "rgba(224,216,200,0.8)" }}
        >
          {label}
        </p>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "rgba(224,216,200,0.45)" }}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          onClick={() => handleSearch()}
          disabled={searching || !query.trim()}
          style={{
            background: "rgba(163,92,92,0.95)",
            color: "#fff",
            minWidth: 52,
          }}
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {searched && results.length === 0 ? (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            border: "1px solid rgba(180,140,75,0.18)",
            background: "rgba(255,255,255,0.02)",
            color: "rgba(224,216,200,0.7)",
          }}
        >
          <p>No likely matches found.</p>
          <p className="mt-1" style={{ color: "rgba(224,216,200,0.5)" }}>
            Add it manually to continue.
          </p>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => (
            <button
              key={`${result.item_type}-${result.id}`}
              type="button"
              onClick={() => onSelect?.(result)}
              className="w-full text-left rounded-xl p-3 transition-colors hover:bg-white/[0.04]"
              style={{
                border: "1px solid rgba(180,140,75,0.18)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="font-medium break-words"
                    style={{ color: "#F5F1E7" }}
                  >
                    {result.name}
                  </div>
                  {result.brand_or_maker ? (
                    <div
                      className="text-sm mt-1"
                      style={{ color: "rgba(224,216,200,0.65)" }}
                    >
                      {result.brand_or_maker}
                    </div>
                  ) : null}
                </div>

                {result._isExact ? (
                  <span
                    className="text-[11px] px-2 py-1 rounded-full shrink-0"
                    style={{
                      background: "rgba(46,125,92,0.22)",
                      color: "#9BE3B5",
                    }}
                  >
                    Exact
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => onManualAdd?.(query)}
          className="w-full"
          style={{
            borderColor: "rgba(180,140,75,0.25)",
            color: "rgba(224,216,200,0.85)",
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Manually
        </Button>
      </div>

      <p
        className="text-xs"
        style={{ color: "rgba(224,216,200,0.45)" }}
      >
        Select a result or add manually to continue.
      </p>
    </div>
  );
}