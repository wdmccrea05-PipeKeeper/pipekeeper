import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Loader2, Search, Plus, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickSearchPipe({ open, onOpenChange, onAdd }) {
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
        prompt: `Search for information about this pipe: "${query}"

Search the web for detailed information about this specific pipe maker, model, or brand. Include:
- Exact maker/brand name and country of origin
- Common pipe shapes/models they make
- Materials used (briar, meerschaum, etc.)
- Typical finish styles
- Historical information and production years
- Typical price ranges and current market value
- Any notable characteristics
- Typical bowl dimensions if available

If this is a specific model or line, provide details about that model.

Return an array of relevant pipe matches with detailed information. Include 3-5 results if possible.`,
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
                  typical_materials: { type: "array", items: { type: "string" } },
                  typical_finishes: { type: "array", items: { type: "string" } },
                  stem_materials: { type: "array", items: { type: "string" } },
                  era: { type: "string" },
                  price_range_low: { type: "number" },
                  price_range_high: { type: "number" },
                  typical_chamber_volume: { type: "string" },
                  bowl_diameter_mm: { type: "number" },
                  bowl_depth_mm: { type: "number" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      setResults(result.pipes || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPipe = async (pipe) => {
    setAdding(pipe.name);
    try {
      const pipeData = {
        name: pipe.name || '',
        maker: pipe.maker || '',
        country_of_origin: pipe.country_of_origin || '',
        shape: pipe.typical_shapes?.[0] || '',
        bowl_material: pipe.typical_materials?.[0] || 'Briar',
        stem_material: pipe.stem_materials?.[0] || '',
        finish: pipe.typical_finishes?.[0] || '',
        year_made: pipe.era || '',
        chamber_volume: pipe.typical_chamber_volume || '',
        bowl_diameter_mm: pipe.bowl_diameter_mm || null,
        bowl_depth_mm: pipe.bowl_depth_mm || null,
        estimated_value: pipe.price_range_low ? Math.round((pipe.price_range_low + (pipe.price_range_high || pipe.price_range_low)) / 2) : null,
        notes: pipe.description || '',
        photos: [],
        stamping_photos: []
      };

      const created = await base44.entities.Pipe.create(pipeData);
      
      // Call the onAdd callback with the created pipe
      onAdd(created);
      
      // Reset and close
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
            {t("quickSearch.quickSearchAddPipe")}
          </DialogTitle>
          <DialogDescription>
            {t("quickSearch.searchPipeDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("quickSearch.pipePlaceholder")}
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
                <p className="text-sm text-stone-600">
                  {t("quickSearch.foundResults", { count: results.length })}
                </p>
                {results.map((pipe, idx) => (
                  <Card
                    key={idx}
                    className="border-stone-200 hover:border-amber-300 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-stone-800 text-lg">{pipe.name}</h4>
                          </div>
                          <p className="text-sm text-stone-600 font-medium">{pipe.maker}</p>
                          {pipe.country_of_origin && (
                            <p className="text-xs text-stone-500 mt-1">{t("quickSearch.madeIn", { country: pipe.country_of_origin })}</p>
                          )}
                          {pipe.era && (
                            <p className="text-xs text-stone-500">{t("quickSearch.era")}: {pipe.era}</p>
                          )}
                          {pipe.description && (
                            <p className="text-sm text-stone-600 mt-2 leading-relaxed">{pipe.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {pipe.typical_shapes?.slice(0, 3).map((shape, i) => (
                              <Badge key={i} variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                {shape}
                              </Badge>
                            ))}
                            {pipe.typical_materials?.slice(0, 2).map((mat, i) => (
                              <Badge key={i} variant="secondary" className="bg-stone-100 text-stone-700 border-stone-200 text-xs">
                                {mat}
                              </Badge>
                            ))}
                            {pipe.typical_finishes?.slice(0, 2).map((finish, i) => (
                              <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                {finish}
                              </Badge>
                            ))}
                          </div>
                          {(pipe.bowl_diameter_mm || pipe.bowl_depth_mm) && (
                            <p className="text-xs text-stone-500 mt-2">
                              {t("quickSearch.bowl")}: {pipe.bowl_diameter_mm && `${pipe.bowl_diameter_mm}mm ⌀`}
                              {pipe.bowl_diameter_mm && pipe.bowl_depth_mm && ' × '}
                              {pipe.bowl_depth_mm && `${pipe.bowl_depth_mm}mm ${t("quickSearch.deep")}`}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right space-y-3">
                          {(pipe.price_range_low || pipe.price_range_high) && (
                            <div>
                              <p className="text-xs text-stone-500">{t("quickSearch.typicalValue")}</p>
                              <p className="font-semibold text-emerald-700 text-sm">
                                ${pipe.price_range_low?.toLocaleString()}
                                {pipe.price_range_high && pipe.price_range_high !== pipe.price_range_low && 
                                  ` - $${pipe.price_range_high?.toLocaleString()}`}
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={() => handleAddPipe(pipe)}
                            disabled={adding !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 w-full"
                          >
                            {adding === pipe.name ? (
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
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-stone-500">{t("quickSearch.enterPipeName")}</p>
              <p className="text-xs text-stone-400 mt-2">
                {t("quickSearch.pipeExamples")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}