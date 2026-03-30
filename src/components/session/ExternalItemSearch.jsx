import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";

/**
 * ExternalItemSearch
 * Smart search (LLM-backed) + manual fallback for logging external items.
 *
 * Props:
 *   itemType: "blend" | "bottle" | "pipe"
 *   onSelect: (externalItem) => void
 *     externalItem shape:
 *       blend:  { name, manufacturer, blend_type, notes }
 *       bottle: { name, distillery, type, notes }
 *       pipe:   { maker, model, shape, notes }
 *   initialQuery: string (optional)
 */

const BLEND_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          manufacturer: { type: "string" },
          blend_type: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
};

const BOTTLE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          distillery: { type: "string" },
          type: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
};

const PIPE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          maker: { type: "string" },
          shape: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
};

function buildPrompt(itemType, query) {
  if (itemType === "blend") {
    return `Search for pipe tobacco blends matching: "${query}". Return up to 5 ranked results. Each result should have name, manufacturer, blend_type, and a short description. Focus on real, well-known blends.`;
  }
  if (itemType === "bottle") {
    return `Search for whiskey / spirits bottles matching: "${query}". Return up to 5 ranked results. Each result should have name, distillery, type (e.g. Scotch Single Malt, Bourbon, Rye), and a short description.`;
  }
  return `Search for pipe makers / models matching: "${query}". Return up to 5 ranked results. Each result should have name (model), maker, shape, and a short description.`;
}

function getSchema(itemType) {
  if (itemType === "blend") return BLEND_SCHEMA;
  if (itemType === "bottle") return BOTTLE_SCHEMA;
  return PIPE_SCHEMA;
}

function resultToItem(itemType, r) {
  if (itemType === "blend") return { name: r.name, manufacturer: r.manufacturer || "", blend_type: r.blend_type || "", notes: r.description || "" };
  if (itemType === "bottle") return { name: r.name, distillery: r.distillery || "", type: r.type || "", notes: r.description || "" };
  return { model: r.name, maker: r.maker || "", shape: r.shape || "", notes: r.description || "" };
}

function displayLabel(itemType, item) {
  if (itemType === "blend") return `${item.name}${item.manufacturer ? ` — ${item.manufacturer}` : ""}`;
  if (itemType === "bottle") return `${item.name}${item.distillery ? ` — ${item.distillery}` : ""}`;
  return `${item.model || item.name || ""}${item.maker ? ` — ${item.maker}` : ""}`;
}

const MANUAL_LABELS = {
  blend:  ["Blend Name *", "Manufacturer", "Blend Type", "Notes"],
  bottle: ["Expression Name *", "Distillery / Brand", "Type (Scotch, Bourbon…)", "Notes"],
  pipe:   ["Maker / Brand", "Model / Name", "Shape", "Notes"],
};

export default function ExternalItemSearch({ itemType = "blend", onSelect, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ a: "", b: "", c: "", d: "" });

  const labels = MANUAL_LABELS[itemType] || MANUAL_LABELS.blend;

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(itemType, query),
        add_context_from_internet: true,
        response_json_schema: getSchema(itemType),
        model: "gemini_3_flash",
      });
      setResults(res?.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manual.a.trim()) return;
    let item;
    if (itemType === "blend") {
      item = { name: manual.a.trim(), manufacturer: manual.b.trim(), blend_type: manual.c.trim(), notes: manual.d.trim() };
    } else if (itemType === "bottle") {
      item = { name: manual.a.trim(), distillery: manual.b.trim(), type: manual.c.trim(), notes: manual.d.trim() };
    } else {
      item = { model: manual.a.trim(), maker: manual.b.trim(), shape: manual.c.trim(), notes: manual.d.trim() };
    }
    onSelect(item);
  };

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4A574]/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder={`Search ${itemType === "pipe" ? "pipes" : itemType === "bottle" ? "whiskey / spirits" : "tobacco blends"}…`}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.28)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-1 focus:ring-[#A35C5C]"
          />
        </div>
        <button
          type="button"
          onClick={doSearch}
          disabled={loading || !query.trim()}
          className="px-3 h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg,#a35c5c,#8f4e4e)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div className="space-y-1.5">
          {results.length === 0 ? (
            <p className="text-xs text-[#E0D8C8]/50 text-center py-2">No matches found.</p>
          ) : (
            results.map((r, i) => {
              const item = resultToItem(itemType, r);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-[rgba(180,140,75,0.18)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <div className="text-sm font-medium text-[#F5F1E7]">{displayLabel(itemType, item)}</div>
                  {item.notes && <div className="text-xs text-[#E0D8C8]/50 mt-0.5 line-clamp-1">{item.notes}</div>}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Manual fallback toggle */}
      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[#D4A574]/80 hover:text-[#D4A574] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add manually
        {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showManual && (
        <div className="space-y-2 p-3 rounded-xl border border-[rgba(180,140,75,0.18)] bg-[rgba(0,0,0,0.15)]">
          {["a", "b", "c", "d"].map((key, i) => (
            <div key={key}>
              <label className="text-xs text-[#E0D8C8]/70 block mb-1">{labels[i]}</label>
              <input
                type="text"
                value={manual[key]}
                onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full h-8 px-2.5 rounded-lg bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.25)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-1 focus:ring-[#A35C5C]"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={!manual.a.trim()}
            className="w-full h-8 rounded-lg text-sm font-medium text-white disabled:opacity-40 mt-1"
            style={{ background: "linear-gradient(135deg,#a35c5c,#8f4e4e)" }}
          >
            Use This
          </button>
        </div>
      )}
    </div>
  );
}