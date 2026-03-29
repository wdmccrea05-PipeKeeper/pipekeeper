import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";
import ShoppingListTypeSelect from "@/components/shoppinglist/ShoppingListTypeSelect";

export default function ShoppingListSearch({ onSelect }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedType, setSelectedType] = useState("buy_new_item");

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const [pipes, blends, bottles] = await Promise.all([
        base44.entities.Pipe.filter({}, "-updated_date", 50),
        base44.entities.TobaccoBlend.filter({}, "-updated_date", 50),
        base44.entities.Bottle.filter({}, "-updated_date", 50),
      ]);

      const query_lower = query.toLowerCase();

      const pipeResults = pipes
        .filter((p) =>
          (p.name || "").toLowerCase().includes(query_lower) ||
          (p.maker || "").toLowerCase().includes(query_lower)
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.maker,
          type: "pipe",
          display: `${p.name} by ${p.maker || "Unknown"}`,
          entity: p,
        }));

      const blendResults = blends
        .filter((b) =>
          (b.name || "").toLowerCase().includes(query_lower) ||
          (b.manufacturer || "").toLowerCase().includes(query_lower)
        )
        .map((b) => ({
          id: b.id,
          name: b.name,
          brand: b.manufacturer,
          type: "blend",
          display: `${b.name} by ${b.manufacturer || "Unknown"}`,
          entity: b,
        }));

      const bottleResults = bottles
        .filter((b) =>
          (b.name || "").toLowerCase().includes(query_lower) ||
          (b.brand || "").toLowerCase().includes(query_lower)
        )
        .map((b) => ({
          id: b.id,
          name: b.name,
          brand: b.brand,
          type: "bottle",
          display: `${b.name} by ${b.brand || "Unknown"}`,
          entity: b,
        }));

      const combined = [...pipeResults, ...blendResults, ...bottleResults];
      setResults(combined);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectResult = (result) => {
    onSelect({
      name: result.name,
      brand: result.brand,
      item_type: result.type === "blend" ? "blend" : result.type === "pipe" ? "pipe" : "bottle",
      shopping_type: selectedType,
      linked_entity_id: result.id,
      linked_entity_type: result.type === "pipe" ? "Pipe" : result.type === "blend" ? "TobaccoBlend" : "Bottle",
      is_manual: false,
    });
    setSearchQuery("");
    setResults([]);
  };

  return (
    <div className="space-y-4">
      <ShoppingListTypeSelect value={selectedType} onChange={setSelectedType} />

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-[#D4A574]/50" />
        <Input
          placeholder="Search blends, pipes, bottles..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          className="pl-10"
        />
      </div>

      {results.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-2 bg-[rgba(255,255,255,0.03)] border border-[#b48c4b]/20 rounded-lg p-3">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelectResult(result)}
              className="w-full text-left p-3 rounded border border-[#b48c4b]/20 hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-[#E0D8C8]">{result.display}</div>
                  <div className="text-xs text-[#E0D8C8]/50 capitalize">{result.type}</div>
                </div>
                <Plus className="w-4 h-4 text-[#D4A574] ml-2 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {searchQuery && results.length === 0 && !searching && (
        <div className="text-center py-6">
          <p className="text-[#E0D8C8]/50 text-sm">No results found</p>
        </div>
      )}
    </div>
  );
}