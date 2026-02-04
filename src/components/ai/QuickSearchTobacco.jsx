import React, { useState } from 'react';
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

const BLEND_COLORS = {
  "Virginia": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Virginia/Perique": "bg-orange-100 text-orange-800 border-orange-200",
  "English": "bg-stone-700 text-white border-stone-600",
  "Balkan": "bg-stone-600 text-white border-stone-500",
  "Aromatic": "bg-purple-100 text-purple-800 border-purple-200",
  "Burley": "bg-amber-100 text-amber-800 border-amber-200",
  "Virginia/Burley": "bg-yellow-200 text-yellow-900 border-yellow-300",
  "Latakia Blend": "bg-stone-800 text-white border-stone-700",
  "Oriental/Turkish": "bg-rose-100 text-rose-800 border-rose-200",
};

export default function QuickSearchTobacco({ open, onOpenChange, onAdd }) {
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
        prompt: `Search for information about this pipe tobacco blend: "${query}"

Search the web for detailed information about this specific tobacco blend. Include:
- Exact blend name and manufacturer
- Blend type/category (Virginia, English, Aromatic, etc.)
- Tobacco components (types of tobacco used)
- Cut type (Ribbon, Flake, etc.)
- Strength level (Mild, Medium, Full, etc.)
- Room note (how it smells to others)
- Flavor profile and tasting notes
- Tin sizes available
- Production status (current, discontinued, etc.)
- Aging potential
- Typical reviews and ratings

Return an array of relevant tobacco blend matches with detailed information. Include 3-5 results if possible.`,
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
                  tobacco_components: { type: "array", items: { type: "string" } },
                  cut: { type: "string" },
                  strength: { type: "string" },
                  room_note: { type: "string" },
                  flavor_notes: { type: "array", items: { type: "string" } },
                  tin_size_oz: { type: "number" },
                  production_status: { type: "string" },
                  aging_potential: { type: "string" },
                  description: { type: "string" },
                  typical_rating: { type: "number" }
                }
              }
            }
          }
        }
      });

      setResults(result.blends || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlend = async (blend) => {
    setAdding(blend.name);
    try {
      const blendData = {
        name: blend.name || '',
        manufacturer: blend.manufacturer || '',
        blend_type: blend.blend_type || '',
        tobacco_components: blend.tobacco_components || [],
        cut: blend.cut || '',
        strength: blend.strength || '',
        room_note: blend.room_note || '',
        flavor_notes: blend.flavor_notes || [],
        tin_size_oz: blend.tin_size_oz || null,
        production_status: blend.production_status || '',
        aging_potential: blend.aging_potential || '',
        rating: blend.typical_rating || null,
        notes: blend.description || '',
        photo: '',
        quantity_owned: 0
      };

      const created = await base44.entities.TobaccoBlend.create(blendData);
      
      // Call the onAdd callback with the created blend
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
            {t("quickSearch.quickSearchAddTobacco")}
          </DialogTitle>
          <DialogDescription>
            {t("quickSearch.searchTobaccoDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("quickSearch.tobaccoPlaceholder")}
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
                {results.map((blend, idx) => (
                  <Card
                    key={idx}
                    className="border-stone-200 hover:border-amber-300 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-stone-800 text-lg">{blend.name}</h4>
                          </div>
                          <p className="text-sm text-stone-600 font-medium">{blend.manufacturer}</p>
                          {blend.description && (
                            <p className="text-sm text-stone-600 mt-2 leading-relaxed">{blend.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {blend.blend_type && (
                              <Badge 
                                variant="secondary" 
                                className={`${BLEND_COLORS[blend.blend_type] || 'bg-stone-100 text-stone-800 border-stone-200'} text-xs`}
                              >
                                {blend.blend_type}
                              </Badge>
                            )}
                            {blend.strength && (
                              <Badge variant="secondary" className="bg-stone-100 text-stone-700 border-stone-200 text-xs">
                                {blend.strength}
                              </Badge>
                            )}
                            {blend.cut && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                {blend.cut}
                              </Badge>
                            )}
                            {blend.production_status && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  blend.production_status === 'Discontinued' 
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {blend.production_status}
                              </Badge>
                            )}
                          </div>
                          {blend.flavor_notes && blend.flavor_notes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-stone-500">
                                {t("quickSearch.flavors")}: {blend.flavor_notes.slice(0, 5).join(', ')}
                              </p>
                            </div>
                          )}
                          {blend.tobacco_components && blend.tobacco_components.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs text-stone-500">
                                {t("quickSearch.components")}: {blend.tobacco_components.join(', ')}
                              </p>
                            </div>
                          )}
                          {blend.tin_size_oz && (
                            <p className="text-xs text-stone-500 mt-1">
                              {t("quickSearch.tinSize")}: {blend.tin_size_oz}oz
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right space-y-3">
                          {blend.typical_rating && (
                            <div>
                              <p className="text-xs text-stone-500">{t("quickSearch.avgRating")}</p>
                              <p className="font-semibold text-amber-700 text-sm flex items-center gap-1">
                                ⭐ {blend.typical_rating}/5
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={() => handleAddBlend(blend)}
                            disabled={adding !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 w-full"
                          >
                            {adding === blend.name ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t("quickSearch.adding")}
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                {t("quickSearch.addToCellar")}
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
              <p className="text-stone-500">{t("quickSearch.enterTobaccoName")}</p>
              <p className="text-xs text-stone-400 mt-2">
                {t("quickSearch.tobaccoExamples")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}