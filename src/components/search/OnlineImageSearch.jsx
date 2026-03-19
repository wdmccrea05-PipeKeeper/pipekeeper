import React, { useEffect, useMemo, useState } from 'react';
import { Search, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

function buildBottleQuery(recordData = {}) {
  const parts = [
    recordData?.name,
    recordData?.distillery,
    recordData?.type,
    recordData?.region,
    recordData?.country,
    recordData?.bottle_type === 'wine' ? 'wine bottle' : 'whiskey bottle',
  ]
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim());
  return parts.join(' ').trim();
}

function buildPipeQuery(recordData = {}) {
  const parts = [
    recordData?.maker,
    recordData?.name,
    recordData?.shape,
    recordData?.finish,
    recordData?.bowl_material,
    'pipe',
  ]
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim());
  return parts.join(' ').trim();
}

function buildTobaccoQuery(recordData = {}) {
  const parts = [
    recordData?.manufacturer,
    recordData?.name,
    recordData?.blend_type,
    'pipe tobacco',
  ]
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim());
  return parts.join(' ').trim();
}

function buildQueryForType(recordType, recordData) {
  if (recordType === 'pipe') return buildPipeQuery(recordData);
  if (recordType === 'tobacco' || recordType === 'blend') return buildTobaccoQuery(recordData);
  return buildBottleQuery(recordData);
}

function placeholderForType(recordType) {
  if (recordType === 'pipe') return 'Search pipe image…';
  if (recordType === 'tobacco' || recordType === 'blend') return 'Search tobacco / blend image…';
  return 'Search bottle image…';
}

function emptyHintForType(recordType) {
  if (recordType === 'pipe') return 'Search for a pipe image to see results here.';
  if (recordType === 'tobacco' || recordType === 'blend') return 'Search for a tobacco or blend image to see results here.';
  return 'Search for a bottle image to see results here.';
}

function normalizeResultImage(item) {
   if (!item) return null;

   const candidates = [
     item?.urls?.regular,
     item?.urls?.full,
     item?.image?.url,
     item.image,
     item.image_url,
     item.full_url,
     item.original_url,
     item.media_url,
     item.src,
     item.url,
     item.original,
     item.full,
     item.preview_url,
     item.thumbnail_url,
     item.thumbnail,
     item?.urls?.small,
     item?.urls?.thumb,
   ].filter((v) => typeof v === 'string' && v.trim());

   return candidates[0] || null;
 }

function normalizeResults(raw) {
  if (!raw) return [];

  const arrayCandidate =
    (Array.isArray(raw) && raw) ||
    raw.results ||
    raw.images ||
    raw.items ||
    raw.data ||
    raw.output ||
    [];

  if (!Array.isArray(arrayCandidate)) return [];

  return arrayCandidate
    .map((item, index) => {
      const imageUrl = normalizeResultImage(item);
      if (!imageUrl) return null;

      return {
        id:
          item.id ||
          item.image_id ||
          item.url ||
          item.image ||
          item.thumbnail ||
          `result-${index}`,
        imageUrl,
        thumbUrl:
          item.thumbnail ||
          item.thumbnail_url ||
          item?.urls?.thumb ||
          item?.urls?.small ||
          imageUrl,
        title:
          item.title ||
          item.name ||
          item.alt ||
          item.description ||
          `Image ${index + 1}`,
        source:
          item.source ||
          item.provider ||
          item.domain ||
          item.site ||
          '',
      };
    })
    .filter(Boolean);
}

function ResultCard({ result, selected, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(result.imageUrl)}
      className="relative rounded-xl overflow-hidden text-left transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: selected
          ? '2px solid rgba(180,140,75,0.9)'
          : '1px solid rgba(180,140,75,0.18)',
        boxShadow: selected ? '0 0 0 1px rgba(180,140,75,0.2)' : 'none',
      }}
    >
      <div className="aspect-[4/3] w-full bg-black/20 flex items-center justify-center overflow-hidden">
        {!imageFailed ? (
          <img
            src={result.thumbUrl || result.imageUrl}
            alt={result.title}
            className="w-full h-full object-contain bg-black/10"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#D8C7A6]/60">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">Preview unavailable</span>
          </div>
        )}
      </div>

      <div className="p-3 min-h-[72px]">
        <p className="text-sm font-medium text-[#F5F1E7] line-clamp-2">{result.title}</p>
        {result.source ? (
          <p className="text-xs mt-1 text-[#D8C7A6]/60 truncate">{result.source}</p>
        ) : null}
      </div>

      {selected ? (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#B48C4B] flex items-center justify-center text-[#1b130d]">
          <Check className="w-4 h-4" />
        </div>
      ) : null}
    </button>
  );
}

export default function OnlineImageSearch({
  recordType = 'bottle',
  recordData = {},
  onImageSelected,
  onClose,
}) {
  const initialQuery = useMemo(() => buildQueryForType(recordType, recordData), [recordType, recordData]);

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialQuery) {
      runSearch(initialQuery);
    }
  }, [initialQuery]);

  async function runSearch(forcedQuery = query) {
    const q = (forcedQuery || '').trim();
    if (!q) {
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let raw = null;

      // Preferred provider path
      try {
        raw = await base44.functions.invoke('searchRecordImages', {
          query: q,
          recordType,
          recordData,
        });
      } catch (firstError) {
        // fallback provider path
        raw = await base44.functions.invoke('searchImages', {
          query: q,
          recordType,
          recordData,
        });
      }

      const normalized = normalizeResults(raw?.data || raw);
      setResults(normalized);

      if (!normalized.length) {
        setError('No image results found for that search.');
      }
    } catch (err) {
      console.error('[OnlineImageSearch] search failed:', err);
      setResults([]);
      setError('Search failed. Please try a different query.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(url) {
    setSelectedUrl(url);
  }

  function handleUseSelected() {
    if (!selectedUrl) return;
    onImageSelected?.(selectedUrl);
    onClose?.();
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 px-5 py-4 border-b" style={{ borderColor: 'rgba(180,140,75,0.14)' }}>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholderForType(recordType)}
              className="w-full rounded-xl px-4 py-3 bg-[rgba(255,255,255,0.04)] text-[#F5F1E7] border border-[rgba(180,140,75,0.18)] outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch();
                }
              }}
            />
          </div>

          <Button
            type="button"
            onClick={() => runSearch()}
            style={{
              background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
              color: '#F5F1E7',
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-xs text-[#D8C7A6]/65">
            {loading
              ? 'Searching online images...'
              : results.length > 0
                ? `${results.length} result${results.length === 1 ? '' : 's'}`
                : 'Results'}
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedUrl}
              onClick={handleUseSelected}
              style={{
                background: selectedUrl
                  ? 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))'
                  : 'rgba(255,255,255,0.08)',
                color: '#F5F1E7',
              }}
            >
              Use Selected
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="h-full min-h-[240px] flex items-center justify-center text-[#D8C7A6]/70">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-full min-h-[220px] flex items-center justify-center">
            <div className="text-center text-[#D8C7A6]/70 max-w-md">
              <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-70" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="h-full min-h-[220px] flex items-center justify-center">
            <div className="text-center text-[#D8C7A6]/70 max-w-md">
              <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-70" />
              <p className="text-sm">{emptyHintForType(recordType)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                selected={selectedUrl === result.imageUrl}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}