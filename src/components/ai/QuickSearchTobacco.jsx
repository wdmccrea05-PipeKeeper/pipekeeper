import React, { useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { rankSearchResults } from '@/utils/search/SmartSearchEngine';
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

      const ranked = rankSearchResults(query, result.blends || [], 'blend');
      setResults(ranked.slice(0, 20));
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
                    className="transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.2)' }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg break-words" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{blend.name}</h4>
                          {blend.manufacturer && (
                            <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(212,165,116,0.85)' }}>{blend.manufacturer}</p>
                          )}
                          {blend.description && (
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(224,216,200,0.72)' }}>{blend.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                                     {blend._isExact && (
                                       <Badge variant="secondary" className="text-xs" style={{ background: 'rgba(46,125,92,0.25)', color: 'rgba(100,220,160,1)', border: '1px solid rgba(46,125,92,0.5)', fontWeight: '600' }}>
                                         {t("auto.components_ai_QuickSearchTobacco.exact_match_vy612y")}
                                       </Badge>
                                     )}
                                     {blend.blend_type && (
                                       <Badge variant="secondary" className="text-xs" style={{ background: 'rgba(180,140,75,0.18)', color: 'rgba(212,165,116,1)', border: '1px solid rgba(180,140,75,0.32)' }}>
                                         {blend.blend_type}
                                       </Badge>
                                     )}
                            {blend.strength && (
                              <Badge variant="secondary" className="text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(224,216,200,0.85)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                {blend.strength}
                              </Badge>
                            )}
                            {blend.cut && (
                              <Badge variant="secondary" className="text-xs" style={{ background: 'rgba(163,92,92,0.15)', color: 'rgba(220,160,160,0.9)', border: '1px solid rgba(163,92,92,0.28)' }}>
                                {blend.cut}
                              </Badge>
                            )}
                            {blend.production_status && blend.production_status !== 'Current Production' && (
                              <Badge variant="secondary" className="text-xs" style={{
                                background: blend.production_status === 'Discontinued' ? 'rgba(200,70,70,0.15)' : 'rgba(46,125,92,0.15)',
                                color: blend.production_status === 'Discontinued' ? 'rgba(240,140,140,0.9)' : 'rgba(100,200,140,0.9)',
                                border: blend.production_status === 'Discontinued' ? '1px solid rgba(200,70,70,0.28)' : '1px solid rgba(46,125,92,0.28)',
                              }}>
                                {blend.production_status}
                              </Badge>
                            )}
                          </div>
                          {blend.flavor_notes && blend.flavor_notes.length > 0 && (
                            <p className="text-xs mt-2" style={{ color: 'rgba(224,216,200,0.55)' }}>
                              {t("quickSearch.flavors")}: {blend.flavor_notes.slice(0, 5).join(', ')}
                            </p>
                          )}
                          {blend.tobacco_components && blend.tobacco_components.length > 0 && (
                            <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.55)' }}>
                              {t("quickSearch.components")}: {blend.tobacco_components.join(', ')}
                            </p>
                          )}
                          {blend.tin_size_oz && (
                            <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.55)' }}>
                              {t("quickSearch.tinSize")}: {blend.tin_size_oz}oz
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right space-y-3">
                          {blend.typical_rating && (
                            <div>
                              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{t("quickSearch.avgRating")}</p>
                              <p className="font-semibold text-sm flex items-center gap-1 justify-end" style={{ color: '#D4A574' }}>
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
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("quickSearch.adding")}</>
                            ) : (
                              <><Plus className="w-4 h-4 mr-2" />{t("quickSearch.addToCellar")}</>
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