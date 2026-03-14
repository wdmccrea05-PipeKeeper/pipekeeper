import React, { useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Loader2, Search, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickSearchBottle({ open, onOpenChange, onAdd }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for information about this whiskey/bourbon bottle: "${query}"

Search the web for detailed information about this specific whiskey. Include:
- Exact distillery name and location
- Full product name
- Type of whiskey (Bourbon, Scotch, Rye, etc.)
- Age statement if available
- ABV (alcohol by volume)
- Standard bottle size
- Region/country of origin
- Tasting notes and flavor profile
- Typical market price
- Production status (current, discontinued, limited edition)
- Any notable characteristics or awards

Return an array of relevant whiskey matches with detailed information. Include 3-5 results if possible.`,
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
                  age: { type: "number" },
                  abv: { type: "number" },
                  bottle_size: { type: "string" },
                  tasting_notes: { type: "string" },
                  typical_price: { type: "number" },
                  production_status: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      setResults(result.bottles || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBottle = async (bottle) => {
    setAdding(bottle.name);
    try {
      const bottleData = {
        name: bottle.name || '',
        distillery: bottle.distillery || '',
        region: bottle.region || '',
        country: bottle.country || '',
        type: bottle.type || 'Other',
        age: bottle.age || null,
        abv: bottle.abv || null,
        bottle_size: bottle.bottle_size || '750ml',
        notes: bottle.tasting_notes || bottle.description || '',
        purchase_price: bottle.typical_price || null,
        fill_level: 'Full',
        bottle_count: 1,
        favorite: false
      };

      const created = await base44.entities.Bottle.create(bottleData);
      
      onAdd(created);
      
      setQuery('');
      setResults([]);
      onOpenChange(false);
    } catch (err) {
      console.error('Add error:', err);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-600" />
            {t("quickSearch.quickSearchAddBottle")}
          </DialogTitle>
          <DialogDescription>
            {t("quickSearch.searchBottleDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("quickSearch.bottlePlaceholder")}
              className="border-stone-200"
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="bg-amber-700 hover:bg-amber-800 shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  {t("common.search")}
                </>
              )}
            </Button>
          </form>

          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <p className="text-sm font-medium text-stone-700">
                  {t("quickSearch.foundResults", { count: results.length })}
                </p>
                {results.map((bottle, idx) => (
                  <Card
                    key={idx}
                    className="border-stone-300 bg-stone-50/70 hover:border-amber-400 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 font-sans">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-stone-950 text-[1.05rem] leading-snug tracking-[0.01em]">{bottle.name}</h4>
                          </div>
                          <p className="text-sm text-stone-800 font-semibold">{bottle.distillery}</p>
                          {bottle.region && bottle.country && (
                            <p className="text-xs font-medium text-stone-600 mt-1">{bottle.region}, {bottle.country}</p>
                          )}
                          {bottle.description && (
                            <p className="text-sm font-medium text-stone-700 mt-2 leading-relaxed">{bottle.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {bottle.type && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-medium">
                                {bottle.type}
                              </Badge>
                            )}
                            {bottle.age && (
                              <Badge variant="secondary" className="bg-stone-200 text-stone-800 border-stone-300 text-xs font-medium">
                                {bottle.age} {t("quickSearch.years")}
                              </Badge>
                            )}
                            {bottle.abv && (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-medium">
                                {bottle.abv}% ABV
                              </Badge>
                            )}
                            {bottle.bottle_size && (
                              <Badge variant="secondary" className="bg-stone-100 text-stone-700 border-stone-300 text-xs font-medium">
                                {bottle.bottle_size}
                              </Badge>
                            )}
                          </div>
                          {bottle.tasting_notes && (
                            <p className="text-xs font-medium text-stone-600 mt-2 italic">
                              {bottle.tasting_notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right space-y-3">
                          {bottle.typical_price && (
                            <div>
                              <p className="text-xs font-medium text-stone-600">{t("quickSearch.typicalPrice")}</p>
                              <p className="font-semibold text-emerald-800 text-sm">
                                {formatCurrency(bottle.typical_price)}
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={() => handleAddBottle(bottle)}
                            disabled={adding !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 w-full"
                          >
                            {adding === bottle.name ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t("quickSearch.adding")}
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                {t("quickSearch.addToCollection")}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && results.length === 0 && query && (
            <div className="text-center py-8">
              <p className="text-stone-500">{t("quickSearch.noResults")}</p>
            </div>
          )}

          {!query && !loading && results.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🥃</div>
              <p className="text-stone-500">{t("quickSearch.enterBottleName")}</p>
              <p className="text-xs text-stone-400 mt-2">
                {t("quickSearch.bottleExamples")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}