import React, { useState } from 'react';
import { ArrowLeft, Search, Loader2, PenLine, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const PLACEHOLDERS = {
  blend: 'e.g. Dunhill Nightcap, Carter Hall…',
  pipe: 'e.g. Peterson System Standard, Dunhill…',
  bottle: 'e.g. Laphroaig 10, Buffalo Trace…',
};

// Normalize for comparison: lowercase, trim, collapse whitespace, strip punctuation
function norm(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

// Score a result item against the query. Higher = better match.
function scoreItem(itemType, item, normQuery) {
  const namePrimary =
    itemType === 'blend' ? item.name :
    itemType === 'pipe' ? item.name :
    item.name;
  const nameNorm = norm(namePrimary);
  const queryTokens = normQuery.split(' ').filter(Boolean);

  if (nameNorm === normQuery) return 100;                    // exact
  if (nameNorm.startsWith(normQuery)) return 90;            // starts with
  if (nameNorm.includes(normQuery)) return 80;              // contains full phrase
  // token overlap
  const nameTokens = nameNorm.split(' ');
  const overlap = queryTokens.filter(t => nameTokens.includes(t)).length;
  if (overlap === queryTokens.length) return 70;            // all tokens present
  if (overlap > 0) return 50 + overlap * 5;                 // partial token match
  return 0;                                                  // no match
}

// Re-rank results so exact/close matches appear first
function rankResults(itemType, items, query) {
  const normQuery = norm(query);
  return [...items]
    .map(item => ({ item, score: scoreItem(itemType, item, normQuery) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, _exactMatch: score >= 80 }));
}

const PROMPTS = {
  blend: (q) => `I am looking up the pipe tobacco blend named exactly "${q}".

Return a JSON object with an "items" array of up to 6 results.
Rules:
1. The FIRST result MUST be the blend named "${q}" itself if it exists — do not substitute a similar blend.
2. After the exact match, you may include closely related blends (same manufacturer, same family, or highly similar).
3. Do NOT place similar-sounding blends ahead of "${q}".
4. If "${q}" does not exist, return the closest real alternatives.

Each item: name (string), manufacturer (string), blend_type (string), strength (string), description (one sentence).`,

  pipe: (q) => `I am looking up the tobacco pipe named or made by "${q}".

Return a JSON object with an "items" array of up to 6 results.
Rules:
1. The FIRST result MUST be the pipe "${q}" itself if it exists.
2. After the exact match, you may include closely related models or maker's other pipes.
3. Do NOT place similar pipes ahead of "${q}".

Each item: name (string), maker (string), shape (string), bowl_material (string), description (one sentence).`,

  bottle: (q) => `I am looking up the whiskey bottle or expression named exactly "${q}".

Return a JSON object with an "items" array of up to 6 results.
Rules:
1. The FIRST result MUST be the expression named "${q}" itself if it exists.
2. After the exact match, you may include closely related expressions from the same distillery.
3. Do NOT place similar bottles ahead of "${q}".

Each item: name (string), distillery (string), whiskey_type (string), age (number or null), abv (number or null), description (one sentence).`,
};

const SCHEMA = {
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
          distillery: { type: 'string' },
          blend_type: { type: 'string' },
          whiskey_type: { type: 'string' },
          shape: { type: 'string' },
          bowl_material: { type: 'string' },
          strength: { type: 'string' },
          age: { type: 'number' },
          abv: { type: 'number' },
          description: { type: 'string' },
        },
      },
    },
  },
};

function getSubtitle(itemType, item) {
  if (itemType === 'blend') return item.manufacturer;
  if (itemType === 'pipe') return item.maker;
  if (itemType === 'bottle') return item.distillery;
  return '';
}

export default function AddFlowQuickSearch({ itemType, typeLabel, onBack, onSelect, onManual }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: PROMPTS[itemType](query.trim()),
        response_json_schema: SCHEMA,
        add_context_from_internet: true,
      });
      const raw = Array.isArray(res?.items) ? res.items.filter(i => i?.name) : [];
      setResults(rankResults(itemType, raw, query.trim()));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
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
            {itemType === 'blend' ? 'Search by blend name or manufacturer' :
             itemType === 'pipe' ? 'Search by maker, model, or shape' :
             'Search by bottle name, distillery, or expression'}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={PLACEHOLDERS[itemType]}
            autoFocus
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
            style={{ background: 'linear-gradient(135deg, rgba(180,140,75,0.9), rgba(150,115,60,0.9))', color: '#1a1008', fontWeight: 600, flexShrink: 0 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'rgba(224,216,200,0.4)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Searching…</span>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((item, i) => (
              <button
                key={i}
                onClick={() => onSelect(item)}
                className="w-full text-left flex items-start justify-between gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-white/[0.05] active:bg-white/[0.07]"
                style={{ border: item._exactMatch && i === 0 ? '1px solid rgba(180,140,75,0.35)' : '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm break-words" style={{ color: '#F5F1E7' }}>{item.name}</p>
                    {item._exactMatch && i === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(180,140,75,0.18)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.3)' }}>
                        Best Match
                      </span>
                    )}
                  </div>
                  {getSubtitle(itemType, item) && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.75)' }}>{getSubtitle(itemType, item)}</p>
                  )}
                  {item.description && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'rgba(224,216,200,0.45)' }}>{item.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(180,140,75,0.5)' }} />
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>No results found for "{query}"</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div className="text-center py-8" style={{ color: 'rgba(224,216,200,0.3)' }}>
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter a name above to search</p>
          </div>
        )}

        {/* Manual fallback */}
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