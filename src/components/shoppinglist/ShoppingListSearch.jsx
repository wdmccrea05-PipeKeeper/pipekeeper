import React, { useState, useMemo } from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { base44 } from "@/api/base44Client";
import { rankSearchResults } from "@/utils/search/SmartSearchEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ALL_ITEM_TYPES = [
  { value: "blend", label: "Tobacco", moduleKey: "pipekeeper" },
  { value: "pipe", label: "Pipe", moduleKey: "pipekeeper" },
  { value: "bottle", label: "Whiskey", moduleKey: "whiskeykeeper" },
];

const SHOPPING_TYPES = [
  { value: "buy_new_item", label: "Buy New" },
  { value: "restock", label: "Restock" },
];

async function searchTobacco(query) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Search for pipe tobacco blend: "${query}". Return 5 matching blends with details.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        blends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              manufacturer: { type: "string" },
              blend_type: { type: "string" },
              strength: { type: "string" },
              cut: { type: "string" },
              production_status: { type: "string" },
              description: { type: "string" },
            },
          },
        },
      },
    },
  });

  return rankSearchResults(query, result?.blends || [], "blend").slice(0, 10);
}

async function searchPipe(query) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Search for pipe or pipe maker: "${query}". Return 5 matching pipes/brands with details.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        pipes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              maker: { type: "string" },
              country_of_origin: { type: "string" },
              typical_shapes: { type: "array", items: { type: "string" } },
              description: { type: "string" },
              price_range_low: { type: "number" },
              price_range_high: { type: "number" },
            },
          },
        },
      },
    },
  });

  return rankSearchResults(query, result?.pipes || [], "pipe").slice(0, 10);
}

async function searchBottle(query) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Search for whiskey bottle: "${query}". Return up to 5 matching bottles.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        bottles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              distillery: { type: "string" },
              type: { type: "string" },
              region: { type: "string" },
              age_years: { type: "number" },
              abv: { type: "number" },
              typical_price_usd: { type: "number" },
              description: { type: "string" },
            },
          },
        },
      },
    },
  });

  return rankSearchResults(query, result?.bottles || [], "bottle").slice(0, 10);
}

export default function ShoppingListSearch({ onAdded }) {
  const { user } = useCurrentUser();
  const access = useAccessSummary();

  const activeModules = access?.activeModules || [];
  const itemTypes = useMemo(() => {
    return ALL_ITEM_TYPES.filter((t) => activeModules.includes(t.moduleKey));
  }, [activeModules]);

  const [itemType, setItemType] = useState("blend");
  const [shoppingType, setShoppingType] = useState("buy_new_item");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState(null);

  const effectiveItemType = useMemo(() => {
    if (itemTypes.some((t) => t.value === itemType)) return itemType;
    return itemTypes[0]?.value || "blend";
  }, [itemType, itemTypes]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setSearched(true);
    setResults([]);

    try {
      let items = [];

      if (effectiveItemType === "blend") items = await searchTobacco(query);
      else if (effectiveItemType === "pipe") items = await searchPipe(query);
      else if (effectiveItemType === "bottle") items = await searchBottle(query);

      setResults(items);
    } catch (err) {
      console.error(err);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (item) => {
    setAdding(item.name);

    try {
      let name = "";
      let brand = "";

      if (effectiveItemType === "blend") {
        name = item.name;
        brand = item.manufacturer;
      } else if (effectiveItemType === "pipe") {
        name = item.name;
        brand = item.maker;
      } else {
        name = item.name;
        brand = item.distillery;
      }

      await base44.entities.ShoppingListItem.create({
        name,
        brand: brand || "",
        item_type: effectiveItemType,
        shopping_type: shoppingType,
        status: "active",
        priority: "medium",
        is_manual: false,
        notes: item.description || "",
        created_by: user?.email || undefined,
      });

      toast.success(`"${name}" added to Shopping List`);
      onAdded?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add item");
    } finally {
      setAdding(null);
    }
  };

  if (itemTypes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-[#E0D8C8]/50">
          <p className="text-sm">No shopping categories are available for your current access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <p className="text-xs text-[#E0D8C8]/60 mb-2 font-medium uppercase tracking-wide">Item Category</p>
          <div className="flex gap-2">
            {itemTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setItemType(t.value);
                  setResults([]);
                  setSearched(false);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  effectiveItemType === t.value
                    ? "bg-[#A35C5C] border-[#A35C5C] text-white"
                    : "border-[rgba(180,140,75,0.25)] text-[#E0D8C8]/70 hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-[#E0D8C8]/60 mb-2 font-medium uppercase tracking-wide">Shopping Type</p>
          <div className="flex gap-2">
            {SHOPPING_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setShoppingType(t.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  shoppingType === t.value
                    ? "bg-[#b48c4b]/30 border-[#b48c4b] text-[#D4A574]"
                    : "border-[rgba(180,140,75,0.25)] text-[#E0D8C8]/70 hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#D4A574]/50" />
          <Input
            placeholder={`Search for a ${itemTypes.find((t) => t.value === effectiveItemType)?.label.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
            autoFocus
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {!searched && !searching && (
        <p className="text-xs text-center text-[#E0D8C8]/40 py-2">
          Search using AI-powered web lookup
        </p>
      )}

      {searching && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#D4A574]" />
          <p className="text-sm text-[#E0D8C8]/60">Searching...</p>
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="text-center py-8 text-[#E0D8C8]/50">
          <p className="text-sm">No results found. Try a different search.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {results.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="rounded-xl border border-[rgba(180,140,75,0.18)] bg-[rgba(255,255,255,0.02)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#F5F1E7] break-words">{item.name}</p>
                  <p className="text-sm text-[#E0D8C8]/70 mt-1 break-words">
                    {item.manufacturer || item.maker || item.distillery || item.type || "Unknown"}
                  </p>
                  {item.description ? (
                    <p className="text-xs text-[#E0D8C8]/55 mt-2 line-clamp-3">{item.description}</p>
                  ) : null}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAdd(item)}
                  disabled={adding === item.name}
                >
                  {adding === item.name ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}