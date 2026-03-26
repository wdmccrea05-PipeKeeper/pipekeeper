import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { rankSearchResults } from '@/utils/search/SmartSearchEngine';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

function WhiskeyBottleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function QuickSearchBottle({ isOpen, onClose, onBottleAdded }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [searched, setSearched] = useState(false);

  const deduplicateBottles = (bottles) => {
    if (!bottles || bottles.length === 0) return [];
    
    // Normalize bottle names for comparison
    const normalize = (str) => {
      return (str || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b(barrel proof|cask strength|bp|cs|proof only)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Group by: distillery + normalized name (core release identity)
    const groups = new Map();
    
    bottles.forEach((bottle) => {
      const distillery = (bottle.distillery || 'unknown').toLowerCase().trim();
      const normalized = normalize(bottle.name);
      
      const groupKey = `${distillery}|${normalized}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(bottle);
    });
    
    // Select best representative from each group
    const results = [];
    groups.forEach((group) => {
      // Sort group by data completeness
      const sorted = group.sort((a, b) => {
        const aScore = [a.name, a.distillery, a.age_years, a.abv, a.region, a.country].filter(v => v !== null && v !== undefined && v !== '').length;
        const bScore = [b.name, b.distillery, b.age_years, b.abv, b.region, b.country].filter(v => v !== null && v !== undefined && v !== '').length;
        return bScore - aScore;
      });
      
      const best = sorted[0];
      
      // Only keep if meets minimum data requirements
      if (best.name && best.distillery && (best.age_years !== undefined || best.abv)) {
        // If price data is missing, try to use it from other variants in group
        const withPrice = sorted.find(b => b.typical_price_usd);
        if (withPrice && !best.typical_price_usd) {
          best.typical_price_usd = withPrice.typical_price_usd;
        }
        results.push(best);
      }
    });
    
    // Final sort: by known-ness (age + ABV + description), then price availability
    results.sort((a, b) => {
      const aKnown = [a.age_years, a.abv, a.description].filter(v => v !== null && v !== undefined && v !== '').length;
      const bKnown = [b.age_years, b.abv, b.description].filter(v => v !== null && v !== undefined && v !== '').length;
      if (aKnown !== bKnown) return bKnown - aKnown;
      
      // Tiebreaker: price availability
      const aPrice = a.typical_price_usd ? 1 : 0;
      const bPrice = b.typical_price_usd ? 1 : 0;
      return bPrice - aPrice;
    });
    
    // Return top 5 unique high-quality results
    return results.slice(0, 5);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setResults([]);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a whiskey expert database. Search for exact whiskey bottles matching: "${query}".
Focus on the core release, not variants. Return up to 8 matching bottles as structured data.
For each bottle, provide all known details. Include age statement, proof/ABV, and typical retail price.
Prioritize well-known, commonly available bottles. Return a JSON object with a "bottles" array.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          bottles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Full bottle name including age/proof if applicable" },
                distillery: { type: "string" },
                region: { type: "string" },
                country: { type: "string" },
                type: { type: "string", description: "e.g. Scotch, Bourbon, Rye, Irish Whiskey" },
                age_years: { type: "number", description: "Age statement in years, null if NAS" },
                abv: { type: "number", description: "Alcohol by volume percentage" },
                bottle_size_ml: { type: "number" },
                typical_price_usd: { type: "number", description: "Typical retail price USD" },
                description: { type: "string", description: "Brief tasting notes or description" },
              }
            }
          }
        }
      }
    });

    const deduplicated = deduplicateBottles(result?.bottles || []);
    const ranked = rankSearchResults(query, deduplicated, 'bottle');
    setResults(ranked.slice(0, 20));
    setSearching(false);
  };

  const handleAdd = async (bottle) => {
    setAddingId(bottle.name);
    const bottleData = {
      name: bottle.name,
      distillery: bottle.distillery,
      region: bottle.region,
      country: bottle.country,
      type: bottle.type,
      age: bottle.age_years || null,
      abv: bottle.abv || null,
      bottle_size: '750ml',
      purchase_type: 'retail',
      retail_price: bottle.typical_price_usd || null,
      value_confidence: 'medium',
      value_source_summary: bottle.typical_price_usd ? 'Web search retail pricing' : null,
    };
    const created = await base44.entities.Bottle.create(bottleData);
    setAddingId(null);
    // Pass full created record so caller can open inventory manager
    onBottleAdded?.({ ...bottleData, id: created?.id });
    onClose();
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const handleClose = () => {
    onClose();
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg flex flex-col" style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.98), rgba(30,20,14,0.99))",
        border: "1px solid rgba(140,105,65,0.4)",
        maxHeight: "85vh",
      }}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-[#F5F1E7] flex items-center gap-2">
            <WhiskeyBottleIcon className="w-5 h-5 text-amber-400" style={{ color: '#D4AF37' }} />
            {t("quickSearch.quickSearchAddBottle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">
          {/* Search bar — always visible */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#E0D8C8]/50" />
              <Input
                placeholder={t("quickSearch.bottlePlaceholder")}
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
            <p className="text-xs text-center flex-shrink-0" style={{ color: "rgba(224, 216, 200, 0.5)" }}>
              {t("quickSearch.bottleExamples")}
            </p>
          )}

          {searching && (
            <div className="text-center py-6 flex-shrink-0">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
              <p className="text-sm" style={{ color: "rgba(224, 216, 200, 0.7)" }}>{t("common.searching")}</p>
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="text-center py-6 flex-shrink-0" style={{ color: 'rgba(224,216,200,0.6)' }}>
              <WhiskeyBottleIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("quickSearch.noResults")}</p>
            </div>
          )}

          {/* Scrollable results area */}
          {results.length > 0 && (
            <div className="overflow-y-auto flex-1 space-y-2 pr-1" style={{ minHeight: 0 }}>
              {results.map((bottle, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(52,37,24,0.6), rgba(42,30,18,0.75))",
                    border: "1px solid rgba(140,105,65,0.25)"
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#F5F1E7] text-sm leading-snug">{bottle.name}</p>
                      {bottle.distillery && (
                        <p className="text-xs text-[#E0D8C8]/70 mt-0.5">{bottle.distillery}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {bottle._isExact && (
                          <Badge className="text-xs bg-emerald-900/60 text-emerald-200 border-emerald-700/50" style={{ fontWeight: '600' }}>✓ Exact Match</Badge>
                        )}
                        {bottle.type && <Badge className="text-xs bg-amber-900/50 text-amber-200 border-amber-700/40">{bottle.type}</Badge>}
                        {bottle.region && <Badge className="text-xs bg-[#3a2a20]/60 text-[#E0D8C8]/80 border-[#8b6239]/30">{bottle.region}</Badge>}
                        {bottle.age_years && <Badge className="text-xs bg-[#3a2a20]/60 text-[#E0D8C8]/80 border-[#8b6239]/30">{bottle.age_years}yr</Badge>}
                        {bottle.abv && <Badge className="text-xs bg-[#3a2a20]/60 text-[#E0D8C8]/80 border-[#8b6239]/30">{bottle.abv}%</Badge>}
                        {bottle.typical_price_usd && <Badge className="text-xs bg-emerald-900/40 text-emerald-300 border-emerald-700/40">${bottle.typical_price_usd}</Badge>}
                      </div>
                      {bottle.description && (
                        <p className="text-xs text-[#E0D8C8]/50 mt-1 line-clamp-2">{bottle.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAdd(bottle)}
                      disabled={addingId === bottle.name}
                      className="w-full"
                    >
                      {addingId === bottle.name ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Adding...</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5 mr-1" /> Add to Collection</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}