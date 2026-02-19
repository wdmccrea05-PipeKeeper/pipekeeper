import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function PipeSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const extractPipes = (payload) => {
    if (Array.isArray(payload?.pipes)) return payload.pipes;
    if (Array.isArray(payload?.data?.pipes)) return payload.data.pipes;
    if (Array.isArray(payload?.response?.pipes)) return payload.response.pipes;
    if (Array.isArray(payload?.output?.pipes)) return payload.output.pipes;

    // Some LLM bridges return JSON as text
    const text = payload?.text || payload?.output_text || payload?.content;
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed?.pipes)) return parsed.pipes;
      } catch {
        // ignore parse error
      }
    }
    return [];
  };

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);
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

If this is a specific model or line, provide details about that model.

IMPORTANT PRICING GUIDELINES - Use realistic market values:
- Estate quality makers: $100-$500+
- Artisan pipes: $200-$2000+ 
- Factory pipes: $75-$300
- Premium brands (Dunhill, Charatan, Peterson, Savinelli): $150-$800+
- Budget/basket pipes: $25-$75
- High-end artisans can exceed $2000

Base prices on actual current market data from estate dealers and auction results.

CRITICAL DIMENSION RULES:
- Only provide dimensions (length_mm, weight_grams, bowl_height_mm, bowl_width_mm, bowl_depth_mm, bowl_diameter_mm) if explicitly stated in manufacturer specifications or reputable retailer listings for the same model/shape
- Do NOT estimate or infer dimensions
- If dimensions are not found in listings, return null for each dimension field
- Include dimensions_source (string) describing where dimensions were found
- Include dimensions_found (boolean) indicating if any dimensions were sourced

CRITICAL: Do NOT include any URLs, links, sources, citations, or website names in your response. Provide only descriptions and analysis.

Return an array of relevant pipe matches with detailed information.`,
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
                  era: { type: "string" },
                  price_range_low: { type: "number" },
                  price_range_high: { type: "number" },
                  description: { type: "string" },
                  length_mm: { type: ["number", "null"] },
                  weight_grams: { type: ["number", "null"] },
                  bowl_height_mm: { type: ["number", "null"] },
                  bowl_width_mm: { type: ["number", "null"] },
                  bowl_diameter_mm: { type: ["number", "null"] },
                  bowl_depth_mm: { type: ["number", "null"] },
                  dimensions_source: { type: ["string", "null"] },
                  dimensions_found: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      setResults(extractPipes(result));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPipe = (pipe, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Convert the search result to form data
    const formData = {
      name: pipe.name || '',
      maker: pipe.maker || '',
      country_of_origin: pipe.country_of_origin || '',
      shape: pipe.typical_shapes?.[0] || '',
      bowl_material: pipe.typical_materials?.[0] || '',
      finish: pipe.typical_finishes?.[0] || '',
      year_made: pipe.era || '',
      estimated_value: pipe.price_range_low || null,
      notes: pipe.description || ''
    };

    // Only add dimensions if they were explicitly found
    const dimFields = ['length_mm', 'weight_grams', 'bowl_height_mm', 'bowl_width_mm', 'bowl_diameter_mm', 'bowl_depth_mm'];
    for (const field of dimFields) {
      if (pipe[field] != null) {
        formData[field] = pipe[field];
      }
    }

    // Add dimensions source to notes if found
    if (pipe.dimensions_source) {
      formData.notes = [formData.notes, `Dimensions source: ${pipe.dimensions_source}`]
        .filter(Boolean)
        .join('\n\n');
    }

    onSelect(formData);
    setResults([]);
    setQuery('');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleSearch();
            }
          }}
          placeholder="Search by maker, model, or brand (e.g., 'Peterson System 314')"
          className="border-stone-200"
        />
        <Button 
          type="button"
          onClick={handleSearch}
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
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {results.map((pipe, idx) => (
              <Card
                key={idx}
                className="cursor-pointer hover:bg-amber-50 transition-colors border-stone-200"
                onClick={(e) => handleSelectPipe(pipe, e)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-stone-800">{pipe.name}</h4>
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      </div>
                      <p className="text-sm text-stone-600">{pipe.maker}</p>
                      {pipe.country_of_origin && (
                        <p className="text-xs text-stone-500 mt-1">{pipe.country_of_origin}</p>
                      )}
                      {pipe.description && (
                        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{pipe.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {pipe.typical_shapes?.slice(0, 2).map((shape, i) => (
                          <Badge key={i} variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                            {shape}
                          </Badge>
                        ))}
                        {pipe.typical_materials?.slice(0, 2).map((mat, i) => (
                          <Badge key={i} variant="secondary" className="bg-stone-100 text-stone-700 border-stone-200 text-xs">
                            {mat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {(pipe.price_range_low || pipe.price_range_high) && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-stone-500">Typical Value</p>
                        <p className="font-semibold text-emerald-700">
                          ${pipe.price_range_low?.toLocaleString()}
                          {pipe.price_range_high && ` - $${pipe.price_range_high?.toLocaleString()}`}
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

      {!loading && hasSearched && results.length === 0 && query && (
        <p className="text-sm text-stone-500 text-center py-4">
          No results found. Try searching for a maker or model name.
        </p>
      )}
    </div>
  );
}
