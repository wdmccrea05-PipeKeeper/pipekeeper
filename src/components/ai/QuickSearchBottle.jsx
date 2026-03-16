import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2 } from "lucide-react";

function WhiskeyBottleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function QuickSearchBottle({ isOpen, onClose, onBottleAdded }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setResults([]);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a whiskey expert database. Search for whiskey bottles matching: "${query}".
Return up to 5 matching bottles as structured data. For each bottle, provide all known details.
Return a JSON object with a "bottles" array.`,
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
                region: { type: "string" },
                country: { type: "string" },
                type: { type: "string" },
                age_years: { type: "number" },
                abv: { type: "number" },
                bottle_size_ml: { type: "number" },
                typical_price_usd: { type: "number" },
                description: { type: "string" },
              }
            }
          }
        }
      }
    });

    setResults(result?.bottles || []);
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
      purchase_price: bottle.typical_price_usd || null,
      average_market_value: bottle.typical_price_usd || null,
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