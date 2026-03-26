import React, { useState, useRef } from 'react';
import { ArrowLeft, Search, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const PLACEHOLDERS = {
  pipe: 'e.g. Dunhill Shell Briar, Peterson System',
  blend: 'e.g. Dunhill Nightcap, McClelland 2035',
  bottle: 'e.g. Laphroaig 10, Buffalo Trace',
};

const PROMPTS = {
  pipe: (q) => `Find real pipe tobacco pipes matching: "${q}"
Return 5 results as JSON: {"items":[{"name":"...","brand":"...","shape":"...","bowl_material":"...","finish":"...","description":"..."}]}
Only real commercial pipes. No fictional items.`,

  blend: (q) => `Find real tobacco blends matching: "${q}"
Return 5 results as JSON: {"items":[{"name":"...","brand":"...","blend_type":"...","strength":"...","flavor_notes":["..."],"description":"..."}]}
Only real commercially available blends.`,

  bottle: (q) => `Find real whiskey bottles matching: "${q}"
Return 5 results as JSON: {"items":[{"name":"...","brand":"...","whiskey_type":"...","age":null,"abv":null,"region":"...","description":"..."}]}
Only real commercially available whiskeys.`,
};

export default function AddFlowSearchStep({ itemType, onSelect, onBack }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setResults([]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: PROMPTS[itemType]?.(query.trim()),
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'object' } }
          }
        }
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      setResults(items.filter(i => i?.name));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleManual = () => {
    onSelect({ name: query.trim(), brand: '', _isManual: true });
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 360 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(180,140,75,0.14)' }}>
        <button onClick={onBack} className="text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors mr-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          Search
        </h2>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3 flex-1">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(224,216,200,0.4)' }} />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder={PLACEHOLDERS[itemType]}
              className="pl-9 bg-[rgba(20,15,12,0.6)] border-[rgba(180,140,75,0.28)] text-[#F5F1E7] placeholder:text-[#E0D8C8]/35 text-sm"
              autoFocus
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            size="sm"
            style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff', flexShrink: 0 }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'rgba(224,216,200,0.5)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 240 }}>
            {results.map((item, i) => (
              <button
                key={i}
                onClick={() => onSelect(item)}
                className="w-full text-left px-4 py-3 rounded-xl transition-colors hover:bg-white/5 active:bg-white/8"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="font-medium text-sm break-words" style={{ color: '#F5F1E7' }}>{item.name}</p>
                {item.brand && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{item.brand}</p>
                )}
                {item.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(224,216,200,0.4)' }}>{item.description}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-6" style={{ color: 'rgba(224,216,200,0.5)' }}>
            <p className="text-sm mb-1">No results found</p>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>Try a different search or add manually</p>
          </div>
        )}

        {!loading && searched && query.trim() && (
          <button
            onClick={handleManual}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-full text-left mt-auto transition-colors hover:bg-white/5"
            style={{ border: '1px dashed rgba(180,140,75,0.3)', color: 'rgba(180,140,75,0.8)' }}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Add "{query}" manually</span>
          </button>
        )}
      </div>
    </div>
  );
}