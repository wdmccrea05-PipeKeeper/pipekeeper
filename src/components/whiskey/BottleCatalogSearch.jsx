import React, { useState, useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const WHISKEY_CATALOG = [
  { name: "Lagavulin 16 Year Old", distillery: "Lagavulin", region: "Islay", country: "Scotland", type: "Single Malt Scotch", abv: 43, age: 16, retail_price: 90 },
  { name: "Glenfiddich 12 Year Old", distillery: "Glenfiddich", region: "Speyside", country: "Scotland", type: "Single Malt Scotch", abv: 40, age: 12, retail_price: 45 },
  { name: "Macallan 12 Year Old Sherry Oak", distillery: "Macallan", region: "Speyside", country: "Scotland", type: "Single Malt Scotch", abv: 40, age: 12, retail_price: 75 },
  { name: "Laphroaig 10 Year Old", distillery: "Laphroaig", region: "Islay", country: "Scotland", type: "Single Malt Scotch", abv: 40, age: 10, retail_price: 55 },
  { name: "Glenlivet 12 Year Old", distillery: "Glenlivet", region: "Speyside", country: "Scotland", type: "Single Malt Scotch", abv: 40, age: 12, retail_price: 40 },
  { name: "Oban 14 Year Old", distillery: "Oban", region: "Highland", country: "Scotland", type: "Single Malt Scotch", abv: 43, age: 14, retail_price: 75 },
  { name: "Talisker 10 Year Old", distillery: "Talisker", region: "Island", country: "Scotland", type: "Single Malt Scotch", abv: 45.8, age: 10, retail_price: 65 },
  { name: "Highland Park 12 Year Old", distillery: "Highland Park", region: "Island", country: "Scotland", type: "Single Malt Scotch", abv: 40, age: 12, retail_price: 55 },
  { name: "Ardbeg 10 Year Old", distillery: "Ardbeg", region: "Islay", country: "Scotland", type: "Single Malt Scotch", abv: 46, age: 10, retail_price: 55 },
  { name: "Balvenie DoubleWood 12 Year Old", distillery: "Balvenie", region: "Speyside", country: "Scotland", type: "Single Malt Scotch", abv: 40, age: 12, retail_price: 65 },
  { name: "Buffalo Trace", distillery: "Buffalo Trace", region: "Kentucky", country: "USA", type: "Bourbon", abv: 45, retail_price: 35 },
  { name: "Maker's Mark", distillery: "Maker's Mark", region: "Kentucky", country: "USA", type: "Bourbon", abv: 45, retail_price: 30 },
  { name: "Woodford Reserve", distillery: "Woodford Reserve", region: "Kentucky", country: "USA", type: "Bourbon", abv: 43.2, retail_price: 40 },
  { name: "Bulleit Bourbon", distillery: "Bulleit", region: "Kentucky", country: "USA", type: "Bourbon", abv: 45, retail_price: 30 },
  { name: "Knob Creek 9 Year Old", distillery: "Knob Creek", region: "Kentucky", country: "USA", type: "Bourbon", abv: 50, age: 9, retail_price: 40 },
  { name: "Eagle Rare 10 Year Old", distillery: "Buffalo Trace", region: "Kentucky", country: "USA", type: "Bourbon", abv: 45, age: 10, retail_price: 45 },
  { name: "Blanton's Original Single Barrel", distillery: "Buffalo Trace", region: "Kentucky", country: "USA", type: "Bourbon", abv: 46.5, retail_price: 65 },
  { name: "Redbreast 12 Year Old", distillery: "Midleton", region: "Cork", country: "Ireland", type: "Irish Single Pot Still", abv: 40, age: 12, retail_price: 65 },
  { name: "Jameson", distillery: "Midleton", region: "Cork", country: "Ireland", type: "Irish Blended", abv: 40, retail_price: 30 },
  { name: "Green Spot", distillery: "Midleton", region: "Cork", country: "Ireland", type: "Irish Single Pot Still", abv: 40, retail_price: 55 },
  { name: "Nikka Whisky From the Barrel", distillery: "Nikka", region: "Japan", country: "Japan", type: "Japanese Blended", abv: 51.4, retail_price: 80 },
  { name: "Yamazaki 12 Year Old", distillery: "Suntory", region: "Osaka", country: "Japan", type: "Japanese Single Malt", abv: 43, age: 12, retail_price: 160 },
  { name: "Hibiki Japanese Harmony", distillery: "Suntory", region: "Japan", country: "Japan", type: "Japanese Blended", abv: 43, retail_price: 90 },
];

function matchCatalog(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return WHISKEY_CATALOG.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.distillery.toLowerCase().includes(q) ||
      w.region?.toLowerCase().includes(q)
  ).slice(0, 6);
}

export default function BottleCatalogSearch({ onSelect, onManualAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleSearch = useCallback((e) => {
    const q = e.target.value;
    setQuery(q);
    setResults(matchCatalog(q));
  }, []);

  const handleSelect = (entry) => {
    onSelect(entry);
    setQuery(entry.name);
    setResults([]);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-[#D4AF37]/60 pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search whiskey catalog (e.g. Lagavulin 16)…"
          className="pl-9 pr-9 bg-[#0f0f0f] border-[rgba(212,175,55,0.2)] text-[#F5F1E7] placeholder:text-[#F5F1E7]/30"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-[#F5F1E7]/40 hover:text-[#F5F1E7]/70"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {focused && results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #111111 0%, #0b0b0b 100%)",
            border: "1px solid rgba(212,175,55,0.15)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          {results.map((entry, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(entry)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[rgba(212,175,55,0.06)] transition-colors"
            >
              <div className="w-8 h-10 rounded flex-shrink-0 flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
                <span className="text-[10px] text-[#D4AF37]/60" aria-hidden="true">🥃</span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#F5F1E7]">{entry.name}</p>
                <p className="text-xs text-[#F5F1E7]/50">{entry.distillery} · {entry.region}, {entry.country}</p>
              </div>
            </button>
          ))}
          <div
            className="px-4 py-2 border-t"
            style={{ borderColor: "rgba(212,175,55,0.1)" }}
          >
            <button
              type="button"
              onMouseDown={onManualAdd}
              className="text-xs text-[#D4AF37]/70 hover:text-[#D4AF37]"
            >
              Can't find it? Add manually →
            </button>
          </div>
        </div>
      )}

      {focused && query.length >= 2 && results.length === 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl px-4 py-3"
          style={{
            background: "linear-gradient(180deg, #111111 0%, #0b0b0b 100%)",
            border: "1px solid rgba(212,175,55,0.15)",
          }}
        >
          <p className="text-sm text-[#F5F1E7]/50 mb-2">No catalog match found.</p>
          <button
            type="button"
            onMouseDown={onManualAdd}
            className="text-xs text-[#D4AF37]/70 hover:text-[#D4AF37]"
          >
            Add manually →
          </button>
        </div>
      )}
    </div>
  );
}
