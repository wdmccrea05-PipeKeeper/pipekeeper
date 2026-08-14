import React, { useState, useRef } from 'react';
import { ArrowLeft, ChevronRight, Globe, Loader2, PenLine, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchForRecord } from '@/lib/search/unifiedSearchService';

const PLACEHOLDERS = {
  blend: 'e.g. Carter Hall, Orlik Golden Sliced, Mac Baren HH…',
  pipe: 'e.g. Falcon Standard, Peterson 312, Savinelli 320…',
  bottle: 'e.g. Lagavulin 16, Nikka Coffey Grain, Eagle Rare…',
  cigar: 'e.g. Oliva Serie V, Arturo Fuente Hemingway…',
  wine: 'e.g. Château Margaux, Opus One, Caymus Cabernet…',
};

// Confidence badge colours
const CONFIDENCE_STYLES = {
  High:   { background: 'rgba(46,125,92,0.22)',  color: '#6ee7b7', border: '1px solid rgba(46,125,92,0.4)' },
  Medium: { background: 'rgba(180,140,75,0.18)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.35)' },
  Low:    { background: 'rgba(120,80,60,0.18)',  color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(120,80,60,0.3)' },
};

function ConfidenceChip({ label }) {
  const style = CONFIDENCE_STYLES[label] || CONFIDENCE_STYLES.Low;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={style}>
      {label === 'High' ? '✓ ' : label === 'Medium' ? '~ ' : '? '}{label}
    </span>
  );
}

function SourceChip({ domain, isInternational }) {
  if (!domain) return null;
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
      style={{
        background: isInternational ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.07)',
        color: isInternational ? 'rgba(147,197,253,0.9)' : 'rgba(224,216,200,0.5)',
        border: isInternational ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {isInternational && <Globe className="w-2.5 h-2.5" />}
      {domain}
    </span>
  );
}

function subtitleFor(itemType, item) {
  if (item.subtitle) return item.subtitle;
  if (itemType === 'blend') return item.manufacturer || item.matchedBrand;
  if (itemType === 'pipe') return item.maker || item.matchedBrand;
  if (itemType === 'bottle') return item.distillery || item.matchedBrand;
  if (itemType === 'cigar') return item.brand || item.matchedBrand;
  if (itemType === 'wine') return item.producer || item.winery || item.matchedBrand;
  return '';
}

function titleFor(item) {
  return item.title || item.name || '';
}

function descriptionFor(item) {
  return item.metadata?.description || item.description || '';
}

const MIN_CHARS = 2;

export default function AddFlowQuickSearch({ itemType, typeLabel, onBack, onSelect, onManual }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [errorCategory, setErrorCategory] = useState(null);
  const [userMessage, setUserMessage] = useState(null);
  const requestIdRef = useRef(0);
  const lastSearchedQueryRef = useRef('');
  const inputRef = useRef(null);

  // Explicit submit — one search per user action, not one per keystroke.
  // Stale results are ignored via requestId. Identical repeated queries
  // are skipped. Manual Add remains available regardless of search state.
  const performSearch = async (searchQuery) => {
    const trimmed = (searchQuery || '').trim();
    if (trimmed.length < MIN_CHARS) return;

    // Skip identical immediately repeated queries
    if (trimmed === lastSearchedQueryRef.current && !loading) return;

    const currentRequestId = ++requestIdRef.current;
    lastSearchedQueryRef.current = trimmed;

    setLoading(true);
    setErrorCategory(null);
    setUserMessage(null);

    try {
      const {
        results: ranked,
        errorCategory: errCat,
        userMessage: errMsg,
      } = await searchForRecord(trimmed, itemType, { maxResults: 10 });

      // Ignore stale results from a previous request
      if (currentRequestId !== requestIdRef.current) return;

      setResults(ranked || []);
      if (errCat && errCat !== 'VALID_ZERO_RESULTS') {
        setErrorCategory(errCat);
        setUserMessage(errMsg);
      }
    } catch {
      if (currentRequestId === requestIdRef.current) {
        setResults([]);
        setErrorCategory('PROVIDER_ERROR');
        setUserMessage('Search is temporarily unavailable. You can try again later or add this item manually.');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setSearched(true);
      }
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    performSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setErrorCategory(null);
    setUserMessage(null);
    lastSearchedQueryRef.current = '';
    inputRef.current?.focus();
  };

  // When the user taps a result we pass back the metadata (raw LLM fields) so
  // AddFlowQuickConfirm can still access all the original properties.
  const handleSelect = (item) => {
    const payload = {
      ...item.metadata,
      name: item.title || item.metadata?.name,
      _confidenceScore: item.confidenceScore,
      _confidenceLabel: item.confidenceLabel,
      _confidenceReason: item.confidenceReason,
      _sourceDomain: item.sourceDomain,
      _sourceTier: item.sourceTier,
      _isExact: item.isExactMatch,
      _suggestedImageUrl: item.imageUrl || null,
    };
    onSelect(payload);
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
                  : itemType === 'wine'
                    ? 'Search by wine name, producer, or vintage'
                    : 'Search by bottle name, distillery, or expression'}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Search input — explicit submit (Enter or Search button) */}
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(180,140,75,0.5)' }} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[itemType]}
            autoFocus
            className="pl-9 pr-20"
            style={{
              background: 'rgba(20,13,8,0.7)',
              border: '1px solid rgba(180,140,75,0.3)',
              color: '#F5F1E7',
            }}
          />
          {query && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-16 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(224,216,200,0.4)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin pointer-events-none" style={{ color: 'rgba(180,140,75,0.6)' }} />
          ) : (
            <button
              type="submit"
              disabled={query.trim().length < MIN_CHARS}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                background: query.trim().length >= MIN_CHARS ? 'rgba(180,140,75,0.18)' : 'transparent',
                border: '1px solid rgba(180,140,75,0.25)',
                color: '#D4A574',
              }}
            >
              Search
            </button>
          )}
        </form>

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((item, index) => (
              <button
                key={item.id || `${titleFor(item)}-${index}`}
                onClick={() => handleSelect(item)}
                className="w-full text-left flex items-start justify-between gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-white/[0.05] active:bg-white/[0.07]"
                style={{
                  border:
                    item.isExactMatch && index === 0
                      ? '1px solid rgba(180,140,75,0.35)'
                      : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm break-words" style={{ color: '#F5F1E7' }}>
                      {titleFor(item)}
                    </p>
                    {item.isExactMatch && index === 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(180,140,75,0.18)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.3)' }}
                      >
                        Exact Match
                      </span>
                    )}
                    {item.confidenceLabel && <ConfidenceChip label={item.confidenceLabel} />}
                  </div>

                  {subtitleFor(itemType, item) && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.75)' }}>
                      {subtitleFor(itemType, item)}
                    </p>
                  )}

                  {(item.regionHint || item.countryHint) && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(147,197,253,0.7)' }}>
                      {[item.regionHint, item.countryHint].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {descriptionFor(item) && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      {descriptionFor(item)}
                    </p>
                  )}

                  {item.sourceDomain && (
                    <div className="mt-1.5">
                      <SourceChip domain={item.sourceDomain} isInternational={item.isInternationalSource} />
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(180,140,75,0.5)' }} />
              </button>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8">
            {userMessage ? (
              <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {userMessage}
              </p>
            ) : (
              <>
                <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
                  No trusted matches found for "{query}"
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.3)' }}>
                  Add manually or try a different search.
                </p>
              </>
            )}
          </div>
        )}

        {!loading && !searched && query.trim().length < MIN_CHARS && (
          <div className="text-center py-8" style={{ color: 'rgba(224,216,200,0.3)' }}>
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Type a name and press Search</p>
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