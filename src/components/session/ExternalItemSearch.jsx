import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { trackedInvokeLLM } from '@/lib/integrationTelemetry';
import { Search, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { rankSearchResults } from "@/utils/search/SmartSearchEngine";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { scopedEntities } from "@/components/api/scopedEntities";

const SCHEMA_BY_TYPE = {
  blend: {
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
  },
  bottle: {
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
            expression: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  },
  pipe: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            maker: { type: "string" },
            model: { type: "string" },
            shape: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  },
};

const MANUAL_LABELS = {
  blend: ["Blend Name *", "Manufacturer", "Blend Type", "Notes"],
  bottle: ["Expression Name *", "Distillery / Brand", "Type (Scotch, Bourbon…)", "Notes"],
  pipe: ["Maker / Brand", "Model / Name *", "Shape", "Notes"],
};

const PLACEHOLDER_BY_TYPE = {
  blend: "Search tobacco blends…",
  bottle: "Search whiskey / spirits…",
  pipe: "Search pipes…",
};

function buildPrompt(itemType, query) {
  if (itemType === "blend") {
    return `Find likely real-world pipe tobacco matches for "${query}". Return up to 6 results with name, manufacturer, blend_type, and short description. Prefer exact or highly likely known blends first.`;
  }
  if (itemType === "bottle") {
    return `Find likely real-world whiskey or spirits matches for "${query}". Return up to 6 results with name, expression if known, distillery, type, and short description. Prefer exact or highly likely known bottles first.`;
  }
  return `Find likely real-world pipe matches for "${query}". Return up to 6 results with maker, model/name, shape, and short description. Prefer exact or highly likely known pipes first.`;
}

function normalizeLocalResult(itemType, item) {
  if (itemType === "blend") {
    return {
      name: item.name,
      manufacturer: item.manufacturer || "",
      blend_type: item.blend_type || "",
      notes: item.notes || "",
      _isExact: item._isExact,
      _searchScore: item._searchScore,
      _source: "local",
    };
  }

  if (itemType === "bottle") {
    return {
      name: item.name || item.expression || "",
      distillery: item.distillery || item.brand || "",
      type: item.type || item.whiskey_type || "",
      expression: item.expression || item.name || "",
      notes: item.notes || "",
      _isExact: item._isExact,
      _searchScore: item._searchScore,
      _source: "local",
    };
  }

  return {
    maker: item.maker || "",
    model: item.model || item.name || "",
    shape: item.shape || "",
    notes: item.notes || "",
    _isExact: item._isExact,
    _searchScore: item._searchScore,
    _source: "local",
  };
}

function normalizeRemoteResult(itemType, item) {
  if (itemType === "blend") {
    return {
      name: item.name || "",
      manufacturer: item.manufacturer || "",
      blend_type: item.blend_type || "",
      notes: item.description || "",
      _source: "remote",
    };
  }

  if (itemType === "bottle") {
    return {
      name: item.name || item.expression || "",
      distillery: item.distillery || "",
      type: item.type || "",
      expression: item.expression || item.name || "",
      notes: item.description || "",
      _source: "remote",
    };
  }

  return {
    maker: item.maker || "",
    model: item.model || item.name || "",
    shape: item.shape || "",
    notes: item.description || "",
    _source: "remote",
  };
}

function displayLabel(itemType, item) {
  if (itemType === "blend") {
    return `${item.name}${item.manufacturer ? ` — ${item.manufacturer}` : ""}`;
  }
  if (itemType === "bottle") {
    return `${item.name}${item.distillery ? ` — ${item.distillery}` : ""}`;
  }
  return `${item.model || item.name || ""}${item.maker ? ` — ${item.maker}` : ""}`;
}

function dedupeResults(itemType, items) {
  const seen = new Set();

  return items.filter((item) => {
    const key =
      itemType === "blend"
        ? `${(item.name || "").toLowerCase()}|${(item.manufacturer || "").toLowerCase()}`
        : itemType === "bottle"
        ? `${(item.name || item.expression || "").toLowerCase()}|${(item.distillery || "").toLowerCase()}`
        : `${(item.model || item.name || "").toLowerCase()}|${(item.maker || "").toLowerCase()}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ExternalItemSearch({ itemType = "blend", onSelect, initialQuery = "" }) {
  const { user } = useCurrentUser();
  const access = useAccessSummary();
  const userEmail = user?.email || null;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ a: "", b: "", c: "", d: "" });

  const activeModules = access?.activeModules || [];
  const whiskeyEnabled = activeModules.includes("whiskeykeeper");

  const labels = MANUAL_LABELS[itemType] || MANUAL_LABELS.blend;

  const itemTypeAllowed = useMemo(() => {
    if (itemType === "blend" || itemType === "pipe") return true;
    if (itemType === "bottle") return whiskeyEnabled;
    return false;
  }, [itemType, whiskeyEnabled]);

  const loadLocalItems = async () => {
    if (!userEmail) return [];

    if (itemType === "blend") {
      return scopedEntities.TobaccoBlend.listForUser(userEmail, "-updated_date", 500).catch(() => []);
    }

    if (itemType === "pipe") {
      return scopedEntities.Pipe.listForUser(userEmail, "-updated_date", 500).catch(() => []);
    }

    if (itemType === "bottle") {
      if (!whiskeyEnabled) return [];
      return base44.entities.Bottle.filter({ created_by: userEmail }, "-updated_date", 500).catch(() => []);
    }

    return [];
  };

  const doSearch = async () => {
    const q = query.trim();
    if (!q || !itemTypeAllowed) {
      setResults([]);
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const localItems = await loadLocalItems();
      const rankedLocal = rankSearchResults(q, localItems || [], itemType)
        .slice(0, 8)
        .map((item) => normalizeLocalResult(itemType, item));

      let merged = [...rankedLocal];

      const needsRemoteFallback =
        rankedLocal.length === 0 || !rankedLocal.some((item) => item._isExact);

      if (needsRemoteFallback) {
        try {
          const llmResult = await trackedInvokeLLM({
            prompt: buildPrompt(itemType, q),
            add_context_from_internet: true,
            response_json_schema: SCHEMA_BY_TYPE[itemType],
            model: "gemini_3_flash",
          });

          const remoteItems = (llmResult?.results || []).map((item) =>
            normalizeRemoteResult(itemType, item)
          );

          merged = dedupeResults(itemType, [...rankedLocal, ...remoteItems]).slice(0, 10);
        } catch {
          merged = rankedLocal;
        }
      }

      setResults(merged);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!itemTypeAllowed) return;

    const primary = manual.a.trim();
    if (!primary) return;

    let item;
    if (itemType === "blend") {
      item = {
        name: primary,
        manufacturer: manual.b.trim(),
        blend_type: manual.c.trim(),
        notes: manual.d.trim(),
      };
    } else if (itemType === "bottle") {
      item = {
        name: primary,
        distillery: manual.b.trim(),
        type: manual.c.trim(),
        notes: manual.d.trim(),
      };
    } else {
      item = {
        maker: manual.a.trim(),
        model: manual.b.trim() || manual.a.trim(),
        shape: manual.c.trim(),
        notes: manual.d.trim(),
      };
    }

    onSelect(item);
  };

  return (
    <div className="space-y-3">
      {!itemTypeAllowed && itemType === "bottle" ? (
       <div className="rounded-xl border border-[rgba(180,140,75,0.18)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-sm text-[#E0D8C8]/70">
         Whiskey search is not available in this release.
       </div>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4A574]/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder={PLACEHOLDER_BY_TYPE[itemType] || "Search…"}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.28)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-1 focus:ring-[#A35C5C]"
            disabled={!itemTypeAllowed}
          />
        </div>
        <button
          type="button"
          onClick={doSearch}
          disabled={loading || !query.trim() || !itemTypeAllowed}
          className="px-3 h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg,#a35c5c,#8f4e4e)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {results !== null && itemTypeAllowed && (
        <div className="space-y-1.5">
          {results.length === 0 ? (
            <p className="text-xs text-[#E0D8C8]/50 text-center py-2">No matches found.</p>
          ) : (
            results.map((item, i) => (
              <button
                key={`${itemType}-${i}-${displayLabel(itemType, item)}`}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-[rgba(180,140,75,0.18)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#F5F1E7] break-words">
                      {displayLabel(itemType, item)}
                    </div>
                    {item.notes ? (
                      <div className="text-xs text-[#E0D8C8]/50 mt-0.5 line-clamp-1">
                        {item.notes}
                      </div>
                    ) : null}
                  </div>
                  {item._isExact ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(46,125,92,0.25)] text-[#9BE3B5] shrink-0">
                      Exact
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[#D4A574]/80 hover:text-[#D4A574] transition-colors"
        disabled={!itemTypeAllowed}
      >
        <Plus className="w-3.5 h-3.5" />
        Add manually
        {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showManual && itemTypeAllowed && (
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
            disabled={itemType === "pipe" ? !manual.b.trim() && !manual.a.trim() : !manual.a.trim()}
            className="w-full h-8 rounded-lg text-sm font-medium text-white disabled:opacity-40 mt-1"
            style={{ background: "linear-gradient(135deg,#a35c5c,#8f4e4e)" }}
          >
            Use This
          </button>
        </div>
      )}

      <p className="text-xs text-[#E0D8C8]/45">
        Select a result or add the item manually to continue.
      </p>
    </div>
  );
}