import React, { useCallback, useMemo, useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/i18n/safeTranslation";

const SEARCH_CACHE = new Map();

function normalizeQuery(q = '') {
  return String(q).trim().replace(/\s+/g, ' ');
}

function dedupeUrls(items = []) {
  const seen = new Set();
  const out = [];
  for (const url of items) {
    const key = String(url || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function generateSearchQuery(type, data) {
  if (!data) return '';

  if (type === 'pipe') {
    const parts = [data.maker, data.name].filter(Boolean);
    return parts.length ? `${parts.join(' ')} pipe` : 'tobacco pipe';
  }

  if (type === 'blend') {
    const parts = [data.manufacturer, data.name].filter(Boolean);
    return parts.length ? `${parts.join(' ')} tin label` : 'tobacco tin label';
  }

  if (type === 'bottle') {
    const parts = [data.distillery, data.name, data.type].filter(Boolean);
    return parts.length ? `${parts.join(' ')} bottle` : 'whiskey bottle';
  }

  return '';
}

function buildFallbackQueries(query, recordType) {
  const q = normalizeQuery(query);
  if (!q) return [];

  const queries = [q];

  if (recordType === 'bottle') {
    queries.push(`${q} whiskey bottle`);
    queries.push(`${q} bourbon bottle`);
    queries.push(`${q} scotch bottle`);
    queries.push(`${q} front label`);
  }

  if (recordType === 'pipe') {
    queries.push(`${q} tobacco pipe`);
    queries.push(`${q} pipe catalog`);
  }

  if (recordType === 'blend') {
    queries.push(`${q} tobacco tin`);
    queries.push(`${q} tin art`);
    queries.push(`${q} tobacco label`);
  }

  return dedupeUrls(queries);
}

export default function OnlineImageSearch({
  recordType,
  recordData,
  onImageSelected,
  onClose
}) {
  const { t } = useTranslation();

  const initialQuery = useMemo(
    () => generateSearchQuery(recordType, recordData),
    [recordType, recordData]
  );

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault?.();

    const query = normalizeQuery(searchQuery);
    if (!query) {
      setError(t("onlineImageSearch.queryRequired", "Please enter a search query"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${recordType}:${query.toLowerCase()}`;
      if (SEARCH_CACHE.has(cacheKey)) {
        setImages(SEARCH_CACHE.get(cacheKey));
        setLoading(false);
        return;
      }

      const fallbackQueries = buildFallbackQueries(query, recordType);
      let found = [];

      for (const candidate of fallbackQueries) {
        try {
          const response = await base44.functions.invoke('searchProductImages', {
            query: candidate,
            recordType,
            limit: 16,
          });

          const payload = response?.data || response || {};
          const urls = dedupeUrls(payload?.images || []);
          if (urls.length) {
            found = urls;
            break;
          }
        } catch (err) {
          console.error('Image search candidate failed:', candidate, err);
        }
      }

      if (!found.length) {
        setImages([]);
        setError(t("onlineImageSearch.noResults", "No images found. Try a more specific brand and product name."));
        return;
      }

      SEARCH_CACHE.set(cacheKey, found);
      setImages(found);
    } catch (err) {
      console.error('Search error:', err);
      setError(t("onlineImageSearch.searchError", "Failed to search for images. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [recordType, searchQuery, t]);

  const handleSelectImage = useCallback((imageUrl) => {
    onImageSelected(imageUrl);
    onClose();
  }, [onImageSelected, onClose]);

  return (
    <div className="w-full h-full flex flex-col space-y-3">
      <form onSubmit={handleSearch} className="space-y-2 flex-shrink-0">
        <label className="block text-sm font-medium text-[#E0D8C8]">
          {t("onlineImageSearch.searchQuery", "Search Query")}
        </label>

        <div className="flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("onlineImageSearch.enterQuery", "Enter search query...")}
            disabled={loading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={loading || !normalizeQuery(searchQuery)}
            className="bg-[#A35C5C] hover:bg-[#8F4E4E] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <p className="text-xs text-[#E0D8C8]/60">
          {t("onlineImageSearch.tip", "Tip: include distillery, bottle name, and type for better results")}
        </p>
      </form>

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#E05D5D]/20 border border-[#E05D5D]/40">
          <AlertCircle className="w-5 h-5 text-[#E05D5D] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#E0D8C8]">{error}</p>
        </div>
      )}

      {!!images.length && (
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          <p className="text-sm text-[#E0D8C8]/70">
            {t("onlineImageSearch.selectImage", "Select an image to edit and use")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
            {images.map((imageUrl, idx) => (
              <button
                key={`${imageUrl}-${idx}`}
                type="button"
                className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-[#E0D8C8]/20 hover:border-[#A35C5C]/50 bg-black/20"
                onClick={() => handleSelectImage(imageUrl)}
              >
                <img
                  src={imageUrl}
                  alt={`Result ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8 flex-1">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#A35C5C] mx-auto" />
            <p className="text-sm text-[#E0D8C8]/70">{t("common.searching", "Searching...")}</p>
          </div>
        </div>
      )}

      {!loading && images.length === 0 && !error && (
        <div className="text-center p-6 rounded-lg bg-[#3a2a20]/30 border border-[#E0D8C8]/10 flex-1 flex items-center justify-center">
          <div>
            <Search className="w-8 h-8 text-[#E0D8C8]/40 mx-auto mb-2" />
            <p className="text-sm text-[#E0D8C8]/60">
              {t("onlineImageSearch.startSearch", "Enter a search query and click search to find images")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
