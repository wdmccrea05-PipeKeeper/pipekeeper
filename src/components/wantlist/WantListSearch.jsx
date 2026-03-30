import React, { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { scopedEntities } from "@/components/api/scopedEntities";
import { base44 } from "@/api/base44Client";

export default function WantListSearch({ onSelect, onManualAdd }) {
  const { user } = useCurrentUser();
  const access = useAccessSummary();

  const userEmail = user?.email || null;
  const activeModules = access?.activeModules || [];
  const whiskeyEnabled = activeModules.includes("whiskeykeeper");

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const availableCategories = useMemo(() => {
    const categories = ["all", "pipe", "blend"];
    if (whiskeyEnabled) categories.push("bottle");
    return categories;
  }, [whiskeyEnabled]);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim() || !userEmail) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const promises = [
        scopedEntities.Pipe.listForUser(userEmail, "-updated_date", 200),
        scopedEntities.TobaccoBlend.listForUser(userEmail, "-updated_date", 200),
      ];

      if (whiskeyEnabled) {
        promises.push(
          base44.entities.Bottle.filter({ created_by: userEmail }, "-updated_date", 200).catch(() => [])
        );
      }

      const resolved = await Promise.all(promises);
      const pipes = resolved[0] || [];
      const blends = resolved[1] || [];
      const bottles = whiskeyEnabled ? (resolved[2] || []) : [];

      const queryLower = query.toLowerCase();

      const pipeResults = pipes
        .filter((p) =>
          (p.name || "").toLowerCase().includes(queryLower) ||
          (p.maker || "").toLowerCase().includes(queryLower)
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
          (b.name || "").toLowerCase().includes(queryLower) ||
          (b.manufacturer || "").toLowerCase().includes(queryLower)
        )
        .map((b) => ({
          id: b.id,
          name: b.name,
          brand: b.manufacturer,
          type: "blend",
          display: `${b.name} by ${b.manufacturer || "Unknown"}`,
          entity: b,
        }));

      const bottleResults = whiskeyEnabled
        ? bottles
            .filter((b) =>
              (b.name || "").toLowerCase().includes(queryLower) ||
              (b.brand || "").toLowerCase().includes(queryLower)
            )
            .map((b) => ({
              id: b.id,
              name: b.name,
              brand: b.brand,
              type: "bottle",
              display: `${b.name} by ${b.brand || "Unknown"}`,
              entity: b,
            }))
        : [];

      let combined = [...pipeResults, ...blendResults, ...bottleResults];

      if (selectedCategory !== "all") {
        combined = combined.filter((r) => r.type === selectedCategory);
      }

      setResults(combined);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [selectedCategory, userEmail, whiskeyEnabled]);

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your collection records"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(searchQuery);
          }}
        />
        <Button
          type="button"
          onClick={() => handleSearch(searchQuery)}
          disabled={searching || !userEmail}
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableCategories.map((category) => (
          <Button
            key={category}
            type="button"
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
          >
            {category === "all"
              ? "All"
              : category === "pipe"
              ? "Pipes"
              : category === "blend"
              ? "Tobacco"
              : "Whiskey"}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {results.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => handleSelect(item)}
            className="w-full rounded-xl border px-4 py-3 text-left transition hover:bg-white/5"
            style={{
              borderColor: "rgba(180,140,75,0.18)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="font-medium text-[#F5F1E7]">{item.name}</div>
            <div className="text-sm text-[#D8C7A6]/75">{item.display}</div>
          </button>
        ))}

        {!searching && searchQuery.trim() && results.length === 0 && (
          <div className="rounded-xl border px-4 py-6 text-center text-[#D8C7A6]/75">
            No matches found in your records.
          </div>
        )}
      </div>

      <div>
        <Button type="button" variant="outline" onClick={onManualAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Manually
        </Button>
      </div>
    </div>
  );
}
