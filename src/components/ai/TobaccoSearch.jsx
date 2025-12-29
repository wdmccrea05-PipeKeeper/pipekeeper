import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function TobaccoSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

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

CRITICAL: Do NOT include any URLs, links, sources, citations, or website names in your response. Provide only descriptions and analysis.

Return an array of relevant tobacco blend matches with detailed information.`,
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

  const handleSelectBlend = (blend) => {
    // Convert the search result to form data
    const formData = {
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
      notes: blend.description || ''
    };
    onSelect(formData);
  };

  const BLEND_COLORS = {
    "Virginia": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Virginia/Perique": "bg-orange-100 text-orange-800 border-orange-200",
    "English": "bg-stone-700 text-white border-stone-600",
    "Balkan": "bg-stone-600 text-white border-stone-500",
    "Aromatic": "bg-purple-100 text-purple-800 border-purple-200",
    "Burley": "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by blend name or manufacturer (e.g., 'Orlik Golden Sliced')"
          className="border-stone-200"
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
              Search
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
            className="space-y-2"
          >
            {results.map((blend, idx) => (
              <Card
                key={idx}
                className="cursor-pointer hover:bg-amber-50 transition-colors border-stone-200"
                onClick={() => handleSelectBlend(blend)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-stone-800">{blend.name}</h4>
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      </div>
                      <p className="text-sm text-stone-600">{blend.manufacturer}</p>
                      {blend.description && (
                        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{blend.description}</p>
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
                      </div>
                      {blend.flavor_notes && blend.flavor_notes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-stone-500">Flavors: {blend.flavor_notes.slice(0, 4).join(', ')}</p>
                        </div>
                      )}
                    </div>
                    {blend.typical_rating && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-stone-500">Rating</p>
                        <p className="font-semibold text-amber-700 flex items-center gap-1">
                          ⭐ {blend.typical_rating}/5
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && results.length === 0 && query && (
        <p className="text-sm text-stone-500 text-center py-4">
          No results found. Try searching for a different blend name.
        </p>
      )}
    </div>
  );
}