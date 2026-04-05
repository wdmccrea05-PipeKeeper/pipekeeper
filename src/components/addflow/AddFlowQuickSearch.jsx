import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Loader2, PenLine, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { rankSearchResults } from '@/utils/search/SmartSearchEngine';

const PLACEHOLDERS = {
  blend: 'e.g. Carter Hall, Orlik Golden Sliced…',
  pipe: 'e.g. Falcon Standard, Peterson 312…',
  bottle: "e.g. Blanton's Single Barrel, Eagle Rare…",
  cigar: 'e.g. Oliva Serie V, Arturo Fuente Hemingway…',
};

const SEARCH_PROMPTS = {
  blend: (query) => `Find exact tobacco blend matches for "${query}".
Rules:
1. If the exact blend exists, return it first.
2. Do not put merely similar blends ahead of the searched blend.
3. Return up to 8 tobacco blend results.

Return JSON with "items" array.
Each item:
- name
- manufacturer
- blend_type
- strength
- cut
- description
- flavor_notes`,
  pipe: (query) => `Find exact tobacco pipe matches for "${query}".
Rules:
1. If the exact maker/model exists, return it first.
2. Do not put similar shapes ahead of the searched pipe.
3. Return up to 8 pipe results.

Return JSON with "items" array.
Each item:
- name
- maker
- model
- shape
- bowl_material
- description`,
  bottle: (query) => `Find exact whiskey bottle matches for "${query}".
Rules:
1. If the exact bottle/expression exists, return it first.
2. Do not put merely similar bottles ahead of the searched bottle.
3. Return up to 8 bottle results.

Return JSON with "items" array.
Each item:
- name
- distillery
- expression
- whiskey_type
- type
- age
- abv
- description`,
  cigar: (query) => `Find exact premium cigar matches for "${query}".
Rules:
1. If the exact cigar exists, return it first.
2. Do not put merely similar cigars ahead of the searched cigar.
3. Return up to 8 cigar results.

Return JSON with "items" array.
Each item:
- name
- brand
- line
- vitola
- wrapper
- binder
- filler
- country_of_origin
- body (mild / mild_medium / medium / medium_full / full)
- strength (mild / mild_medium / medium / medium_full / full)
- production_status (regular_production / limited / discontinued / seasonal / unknown)
- description`,
};

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          manufacturer: { type: 'string' },
          maker: { type: 'string' },
          model: { type: 'string' },
          distillery: { type: 'string' },
          expression: { type: 'string' },
          blend_type: { type: 'string' },
          whiskey_type: { type: 'string' },
          type: { type: 'string' },
          shape: { type: 'string' },
          bowl_material: { type: 'string' },
          strength: { type: 'string' },
          cut: { type: 'string' },
          age: { type: 'number' },
          abv: { type: 'number' },
          flavor_notes: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          // cigar fields
          brand: { type: 'string' },
          line: { type: 'string' },
          vitola: { type: 'string' },
          wrapper: { type: 'string' },
          binder: { type: 'string' },
          filler: { type: 'string' },
          country_of_origin: { type: 'string' },
          body: { type: 'string' },
          production_status: { type: 'string' },
        },
      },
    },
  },
};

function subtitleFor(itemType, item) {
  if (itemType === 'blend') return item.manufacturer;
  if (itemType === 'pipe') return item.maker || item.model;
  if (itemType === 'bottle') return item.distillery;
  if (itemType === 'cigar') return item.brand;
  return '';
}

export default function AddFlowQuickSearch({ itemType, typeLabel, onBack, onSelect, onManual }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(false);

    try {
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: SEARCH_PROMPTS[itemType](query.trim()),
        response_json_schema: SEARCH_SCHEMA,
        add_context_from_internet: true,
      });

      const rawItems = Array.isArray(llmResult?.items) ? llmResult.items.filter((item) => item?.name) : [];
      const ranked = rankSearchResults(query.trim(), rawItems, itemType);
      setResults(ranked.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Quick Add {typeLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {itemType === 'blend'
              ? 'Search by blend name or manufacturer'
              : itemType === 'pipe'
                ? 'Search by maker, model, or shape'
                : itemType === 'cigar'
                  ? 'Search by cigar name, brand, or line'
                  : 'Search by bottle name, distillery, or expression'}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={PLACEHOLDERS[itemType]}
            className="flex-1"
            style={{
              background: 'rgba(20,13,8,0.7)',
              border: '1px solid rgba(180,140,75,0.3)',
              color: '#F5F1E7',
            }}
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              background: 'linear-gradient(135deg, rgba(180,140,75,0.9), rgba(150,115,60,0.9))',
              color: '#1a1008',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'rgba(224,216,200,0.4)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Searching…</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((item, index) => (
              <button
                key={`${item.name}-${index}`}
                onClick={() => onSelect(item)}
                className="w-full text-left flex items-start justify-between gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-white/[0.05] active:bg-white/[0.07]"
                style={{
                  border:
                    item._isExact && index === 0
                      ? '1px solid rgba(180,140,75,0.35)'
                      : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm break-words" style={{ color: '#F5F1E7' }}>
                      {item.name}
                    </p>
                    {item._isExact && index === 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: 'rgba(180,140,75,0.18)',
                          color: '#D4A574',
                          border: '1px solid rgba(180,140,75,0.3)',
                        }}
                      >
                        Exact Match
                      </span>
                    )}
                  </div>
                  {subtitleFor(itemType, item) && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.75)' }}>
                      {subtitleFor(itemType, item)}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      {item.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(180,140,75,0.5)' }} />
              </button>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
              No results found for "{query}"
            </p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-8" style={{ color: 'rgba(224,216,200,0.3)' }}>
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter a name above to search</p>
          </div>
        )}

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5 mt-1"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">Add Manually Instead</span>
        </button>
      </div>

      <div className="pb-2" />
    </div>
  );
}