import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookImage, Check, Globe, Image as ImageIcon, Library, Loader2, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { createInventoryEngine } from '@/components/inventory/InventoryEngine';
import { getProductImageSuggestions } from '@/lib/images/productImagePipeline';
import { findInternalImageMatches } from '@/lib/images/imageLibraryMatcher';
import { uploadUserPhoto } from '@/lib/images/imageUploadService';
import { linkImageToRecord } from '@/lib/images/imageRecordLinkService';
import { upsertLibraryImageEntry } from '@/lib/images/imageLibraryService';
import { normalizeBottleKey, normalizeBlendKey, normalizePipeKey } from '@/lib/images/imageNormalization';

const ENTITIES = {
  blend: 'TobaccoBlend',
  pipe: 'Pipe',
  bottle: 'Bottle',
  cigar: 'Cigar',
};

function cleanObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function buildBaseRecord(itemType, data) {
  if (itemType === 'blend') {
    return cleanObject({
      name: data.name,
      manufacturer: data.manufacturer,
      blend_type: data.blend_type,
      strength: data.strength,
      cut: data.cut,
      flavor_notes: Array.isArray(data.flavor_notes) && data.flavor_notes.length ? data.flavor_notes : undefined,
      notes: data.notes,
      logo: data.logo,
    });
  }

  if (itemType === 'pipe') {
    return cleanObject({
      name: data.name,
      maker: data.maker,
      shape: data.shape,
      bowl_material: data.bowl_material,
      finish: data.finish,
      condition: data.condition,
      notes: data.notes,
      photos: Array.isArray(data.photos) && data.photos.length ? data.photos : undefined,
    });
  }

  if (itemType === 'bottle') {
    return cleanObject({
      name: data.name,
      distillery: data.distillery,
      type: data.type,
      age: data.age ? Number(data.age) : undefined,
      abv: data.abv ? Number(data.abv) : undefined,
      notes: data.notes,
      photo: data.photo,
    });
  }

  if (itemType === 'cigar') {
    return cleanObject({
      name: data.name,
      brand: data.brand,
      line: data.line,
      vitola: data.vitola,
      wrapper: data.wrapper,
      binder: data.binder,
      filler: data.filler,
      country_of_origin: data.country_of_origin,
      body: data.body,
      strength: data.strength,
      production_status: data.production_status,
      flavor_notes: Array.isArray(data.flavor_notes) && data.flavor_notes.length ? data.flavor_notes : undefined,
      personal_notes: data.personal_notes || data.notes,
      photos: Array.isArray(data.photos) && data.photos.length ? data.photos : undefined,
    });
  }

  return cleanObject({ name: data.name });
}

const CONFIDENCE_CHIP_STYLES = {
  'Exact Match':       { background: 'rgba(46,125,92,0.28)',   color: '#6ee7b7',              border: '1px solid rgba(46,125,92,0.5)' },
  'High Confidence':   { background: 'rgba(46,125,92,0.18)',   color: '#86efac',              border: '1px solid rgba(46,125,92,0.35)' },
  'Medium Confidence': { background: 'rgba(180,140,75,0.18)',  color: '#D4A574',              border: '1px solid rgba(180,140,75,0.35)' },
  'Reference':         { background: 'rgba(99,102,241,0.15)',  color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(99,102,241,0.3)' },
  'Low Confidence':    { background: 'rgba(120,80,60,0.18)',   color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(120,80,60,0.3)' },
  // Legacy fallback labels from the previous pipeline
  High:   { background: 'rgba(46,125,92,0.18)',  color: '#86efac',              border: '1px solid rgba(46,125,92,0.35)' },
  Medium: { background: 'rgba(180,140,75,0.18)', color: '#D4A574',              border: '1px solid rgba(180,140,75,0.35)' },
  Low:    { background: 'rgba(120,80,60,0.18)',  color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(120,80,60,0.3)' },
};

// Source label chip styles for internal library matches
const SOURCE_LABEL_STYLES = {
  'Label Library':    { background: 'rgba(180,140,75,0.22)',  color: '#D4A574',              border: '1px solid rgba(180,140,75,0.4)' },
  'User Uploaded':    { background: 'rgba(46,125,92,0.22)',   color: '#6ee7b7',              border: '1px solid rgba(46,125,92,0.4)' },
  'User Confirmed':   { background: 'rgba(46,125,92,0.18)',   color: '#86efac',              border: '1px solid rgba(46,125,92,0.35)' },
  'Community Match':  { background: 'rgba(59,130,246,0.18)',  color: 'rgba(147,197,253,0.9)', border: '1px solid rgba(59,130,246,0.3)' },
  'Reference Image':  { background: 'rgba(99,102,241,0.15)',  color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(99,102,241,0.3)' },
  'Library Match':    { background: 'rgba(255,255,255,0.08)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(255,255,255,0.12)' },
};

// ── Helpers for library promotion ─────────────────────────────────────────────

function buildNormalizedKey(itemType, data) {
  if (itemType === 'bottle') return normalizeBottleKey({ brand: data.distillery, name: data.name });
  if (itemType === 'blend')  return normalizeBlendKey({ brand: data.manufacturer, name: data.name });
  if (itemType === 'pipe')   return normalizePipeKey({ maker: data.maker, name: data.name, shape: data.shape });
  return '';
}

function buildDisplayName(itemType, data) {
  if (itemType === 'bottle') return [data.distillery, data.name].filter(Boolean).join(' — ');
  if (itemType === 'blend')  return [data.manufacturer, data.name].filter(Boolean).join(' — ');
  if (itemType === 'pipe')   return [data.maker, data.name, data.shape].filter(Boolean).join(' ');
  return data.name || '';
}

/**
 * Silently promote a user-uploaded image into the ProductImageLibrary.
 * Only fires when the product identity is sufficiently known (normalized key exists).
 *
 * @param {string} itemType
 * @param {Object} data
 * @param {string} imageUrl
 * @param {boolean} [referenceOnly]  — for pipes
 * @returns {Promise<string|null>}   — created library entry ID, or null
 */
async function promoteUploadToLibrary(itemType, data, imageUrl, referenceOnly = false) {
  if (!imageUrl) return null;
  const normalizedName = buildNormalizedKey(itemType, data);
  if (!normalizedName) return null;

  const payload = {
    entity_type:     itemType,
    normalized_name: normalizedName,
    display_name:    buildDisplayName(itemType, data),
    image_url:       imageUrl,
    source_type:     'user_upload',
    verified:        true,
    verified_count:  1,
    reference_only:  referenceOnly,
  };
  if (itemType === 'bottle') payload.brand = data.distillery || null;
  if (itemType === 'blend')  payload.brand = data.manufacturer || null;
  if (itemType === 'pipe')   { payload.maker = data.maker || null; payload.shape = data.shape || null; }

  try {
    const entry = await upsertLibraryImageEntry(payload);
    return entry?.id || null;
  } catch {
    return null;
  }
}



/**
 * Determine the best URL to save when the user clicks "Use This".
 * Only returns a cachedImageUrl (stable internal URL from ingestion).
 * Never saves raw external candidate URLs as the record image.
 *
 * @param {Object} result - PipelineResult
 * @returns {string|null}
 */
function getImageUrlForSave(result) {
  return result.cachedImageUrl || null;
}

/**
 * Returns the thumbnail src for a suggestion row.
 * Uses only the stable internal cachedImageUrl — never raw retailer hotlinks.
 *
 * @param {Object} result - PipelineResult
 * @returns {string|null}
 */
function getThumbnailSrc(result) {
  return result.cachedImageUrl || null;
}

/**
 * Thumbnail for a suggestion row.
 *
 * Renders only the stable internal cachedImageUrl set by the ingestion pipeline.
 * Shows a placeholder icon when no internal URL is available (ingestion failed
 * or unavailable). Never renders raw retailer hotlinks.
 */
function SuggestionThumb({ result }) {
  const [errored, setErrored] = useState(false);

  const src = getThumbnailSrc(result);

  if (!src || errored) {
    return (
      <div
        data-image-fallback=""
        className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <ImageIcon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.25)' }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={result.title || 'Suggested image'}
      className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
      onError={() => setErrored(true)}
    />
  );
}

/**
 * InternalLibraryMatches — auto-fetches from the internal image library on
 * mount and shows results with source labels (Label Library, User Confirmed,
 * Community Match, Reference Image) before the external pipeline runs.
 */
function InternalLibraryMatches({ itemType, data, onSelectImage }) {
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [matches, setMatches]     = useState([]);
  const hasFetchedRef             = useRef(false);

  const fields = {
    entityType:   itemType,
    name:         data.name,
    brand:        data.distillery || data.manufacturer,
    distillery:   data.distillery,
    manufacturer: data.manufacturer,
    maker:        data.maker,
    shape:        data.shape,
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (!fields.name && !fields.brand && !fields.maker) return;
    hasFetchedRef.current = true;

    setLoading(true);
    findInternalImageMatches(fields)
      .then((results) => setMatches(results || []))
      .catch(() => setMatches([]))
      .finally(() => { setLoading(false); setFetched(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1" style={{ color: 'rgba(224,216,200,0.4)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Searching library…</span>
      </div>
    );
  }

  if (!fetched) return null;

  if (matches.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>
        No library matches found yet. Upload your own photo or save and add one later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold" style={{ color: 'rgba(212,165,116,0.85)' }}>
        Library Matches
      </p>
      {matches.map((m) => {
        const chipStyle = CONFIDENCE_CHIP_STYLES[m.confidenceLabel] || CONFIDENCE_CHIP_STYLES['Reference'];
        const srcStyle  = SOURCE_LABEL_STYLES[m.sourceLabel] || SOURCE_LABEL_STYLES['Library Match'];
        const [thumbErr, setThumbErr] = [false, () => {}]; // simple fallback

        return (
          <div
            key={m.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #111111 0%, #0b0b0b 100%)',
              border: m.isExactMatch
                ? '1px solid rgba(46,125,92,0.35)'
                : '1px solid rgba(212,175,55,0.18)',
              borderRadius: 18,
            }}
          >
            {/* Thumbnail */}
            <LibraryThumb imageUrl={m.cachedImageUrl} title={m.title} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {m.title || m.sourceLabel}
                </p>
                {/* Source label chip */}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={srcStyle}
                >
                  {m.sourceLabel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* Confidence chip */}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={chipStyle}
                >
                  {m.confidenceLabel}
                </span>
                {m.verifiedCount > 0 && (
                  <span className="text-[10px]" style={{ color: 'rgba(224,216,200,0.35)' }}>
                    ×{m.verifiedCount}
                  </span>
                )}
              </div>
            </div>

            {/* Use This button */}
            <Button
              type="button"
              size="sm"
              onClick={() => onSelectImage(m.cachedImageUrl, {
                image_source_type:      m.sourceType,
                image_confidence:       m.confidenceLabel,
                image_verified_by_user: true,
                _libraryImageId:        m.libraryImageId,
                _isInternalMatch:       true,
              })}
              style={{
                background: 'rgba(46,125,92,0.85)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '11px',
                flexShrink: 0,
              }}
            >
              <Check className="w-3 h-3 mr-1" />
              Use This
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** Simple thumbnail with error fallback for library match cards. */
function LibraryThumb({ imageUrl, title }) {
  const [errored, setErrored] = useState(false);
  if (!imageUrl || errored) {
    return (
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <ImageIcon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.25)' }} />
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={title || 'Library image'}
      className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
      onError={() => setErrored(true)}
    />
  );
}

/**
 * Inline component that fetches and displays web reference image suggestions.
 * Only fetches when `active` is true (i.e. the user has explicitly opened the panel).
 */
function ImageSuggestions({ itemType, data, onSelectImage, onRequestFileUpload, active }) {
  const [loading, setLoading]   = useState(false);
  const [fetched, setFetched]   = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchCount, setSearchCount] = useState(0);
  const hasFetchedRef = useRef(false);

  const fields = {
    name:         data.name,
    distillery:   data.distillery,
    maker:        data.maker,
    manufacturer: data.manufacturer,
    region:       data.region,
    country:      data.country || data.country_of_origin,
    shape:        data.shape,
  };

  const fetchSuggestions = async (isRetry = false) => {
    if (loading) return;
    setLoading(true);
    setFetched(false);
    try {
      const { results } = await getProductImageSuggestions({
        entityType:   itemType,
        forceRefresh: isRetry,
        ...fields,
      });
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.log('[AddFlowManualImages] Pipeline results:', results.map((r) => ({
          title:          r.title,
          sourceDomain:   r.sourceDomain,
          imageStatus:    r.imageStatus,
          cachedImageUrl: r.cachedImageUrl,
          confidenceLabel: r.confidenceLabel,
        })));
      }
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  // Only fetch when the panel is explicitly activated by the user
  useEffect(() => {
    if (!active) return;
    if (!hasFetchedRef.current && (fields.name || fields.distillery || fields.maker || fields.manufacturer)) {
      hasFetchedRef.current = true;
      fetchSuggestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleSearchAgain = () => {
    setSearchCount(c => c + 1);
    fetchSuggestions(true);
  };

  if (!active) return null;
  if (!loading && !fetched) return null;

  const readyCount = suggestions.filter((s) => s.imageStatus === 'ready').length;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            Reference Matches from the Web
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
            {suggestions.length > 0
              ? readyCount > 0
                ? `${readyCount} image preview${readyCount === 1 ? '' : 's'} available. These are possible product matches, not verified image previews.`
                : `${suggestions.length} likely match${suggestions.length === 1 ? '' : 'es'} found — no verified image previews available yet.`
              : 'These are possible product matches, not verified image previews.'}
          </p>
        </div>
        {fetched && (
          <button
            type="button"
            onClick={handleSearchAgain}
            className="text-xs px-2.5 py-1 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(180,140,75,0.8)', border: '1px solid rgba(180,140,75,0.2)' }}
          >
            Search Again
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3" style={{ color: 'rgba(224,216,200,0.4)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{searchCount > 0 ? 'Broadening search…' : 'Finding trusted matches…'}</span>
        </div>
      )}

      {!loading && fetched && suggestions.length === 0 && (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>
            No trusted matches found.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              type="button"
              onClick={handleSearchAgain}
              className="text-xs px-3 py-1.5 rounded-full transition-colors hover:bg-white/10"
              style={{ color: 'rgba(180,140,75,0.8)', border: '1px solid rgba(180,140,75,0.2)' }}
            >
              Search Again
            </button>
            <button
              type="button"
              onClick={onRequestFileUpload}
              className="text-xs px-3 py-1.5 rounded-full transition-colors hover:bg-white/10"
              style={{ color: 'rgba(224,216,200,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Upload your own photo
            </button>
          </div>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.map((img) => {
            const chipLabel = img.confidenceLabel || (itemType === 'pipe' ? 'Reference' : 'Low Confidence');
            const chipStyle = CONFIDENCE_CHIP_STYLES[chipLabel] || CONFIDENCE_CHIP_STYLES['Low Confidence'];
            const chipIcon =
              chipLabel === 'Exact Match'       ? '✓ ' :
              chipLabel === 'High Confidence'   ? '✓ ' :
              chipLabel === 'Medium Confidence' ? '~ ' :
              chipLabel === 'Reference'         ? '◈ ' : '? ';

            // imageStatus drives the row label and action button behaviour.
            // Only rows with imageStatus === 'ready' have an acquired internal image.
            const isImageReady    = img.imageStatus === 'ready';
            const isImageFailed   = img.imageStatus === 'failed';

            const rowLabel =
              isImageReady
                ? img.isReferenceImage
                  ? 'Reference Image'
                  : img.isExactMatch
                    ? 'Exact Match'
                    : 'Suggested Image'
                : isImageFailed
                  ? 'Matched Product'
                  : img.isReferenceImage
                    ? 'Reference Match'
                    : 'Matched Product';

            // Status badge shown next to the row label
            const statusBadge =
              isImageReady
                ? { label: 'Image Ready',  color: 'rgba(46,125,92,0.9)',    bg: 'rgba(46,125,92,0.15)',    border: '1px solid rgba(46,125,92,0.35)' }
                : isImageFailed
                  ? { label: 'Image Failed', color: 'rgba(224,216,200,0.35)', bg: 'rgba(60,40,30,0.35)',   border: '1px solid rgba(120,80,60,0.3)' }
                  : { label: 'Match Only',   color: 'rgba(180,140,75,0.8)',  bg: 'rgba(180,140,75,0.1)',   border: '1px solid rgba(180,140,75,0.25)' };

            return (
              <div
                key={img.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, #111111 0%, #0b0b0b 100%)',
                  border: isImageReady && img.isExactMatch
                    ? '1px solid rgba(46,125,92,0.35)'
                    : '1px solid rgba(212,175,55,0.15)',
                  borderRadius: 18,
                }}
              >
                {/* Thumbnail — only renders when ingestion produced a cachedImageUrl */}
                <SuggestionThumb result={img} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {rowLabel}
                    </p>
                    {/* Image acquisition status badge */}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: statusBadge.bg, color: statusBadge.color, border: statusBadge.border }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                  {img.title && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {img.title}
                    </p>
                  )}

                  {!isImageReady && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(224,216,200,0.3)' }}>
                      No verified image preview available
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {/* Source chip */}
                    {img.sourceDomain && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={{
                          background: img.isInternationalSource ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.07)',
                          color: img.isInternationalSource ? 'rgba(147,197,253,0.9)' : 'rgba(224,216,200,0.5)',
                          border: img.isInternationalSource ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {img.isInternationalSource && <Globe className="w-2.5 h-2.5" />}
                        {img.sourceDomain}
                      </span>
                    )}

                    {/* Confidence chip */}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={chipStyle}
                    >
                      {chipIcon}{chipLabel}
                    </span>
                  </div>
                </div>

                {/* Action button:
                     - image_ready  → enabled "Use This Image" (saves internal URL)
                     - match_only   → enabled "Use This Match" (saves metadata, no image URL)
                     - image_failed → disabled "Image Failed" */}
                <Button
                  type="button"
                  size="sm"
                  disabled={isImageFailed}
                  onClick={() => {
                    if (isImageReady) {
                      const useUrl = getImageUrlForSave(img);
                      if (!useUrl) return;
                      onSelectImage(useUrl, {
                        image_source_domain:    img.sourceDomain    || null,
                        image_source_type:      img.sourceType      || null,
                        image_confidence:       img.confidenceLabel || null,
                        image_verified_by_user: true,
                      });
                    } else {
                      // Match-only: save product metadata, no image URL
                      onSelectImage(null, {
                        image_source_domain:    img.sourceDomain    || null,
                        image_source_type:      img.sourceType      || null,
                        image_confidence:       img.confidenceLabel || null,
                        image_verified_by_user: false,
                      });
                    }
                  }}
                  style={isImageFailed ? {
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(224,216,200,0.25)',
                    fontWeight: 600,
                    fontSize: 11,
                    flexShrink: 0,
                    minWidth: 72,
                    borderRadius: 10,
                    cursor: 'not-allowed',
                    border: '1px solid rgba(255,255,255,0.08)',
                  } : isImageReady ? {
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.85), rgba(180,140,50,0.85))',
                    color: '#1a1008',
                    fontWeight: 700,
                    fontSize: 11,
                    flexShrink: 0,
                    minWidth: 72,
                    borderRadius: 10,
                  } : {
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(224,216,200,0.65)',
                    fontWeight: 600,
                    fontSize: 11,
                    flexShrink: 0,
                    minWidth: 80,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {isImageFailed ? 'Image Failed' : isImageReady ? 'Use This Image' : 'Use This Match'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogoLibraryPicker({ onSelect, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (term = query) => {
    if (!term.trim()) return;
    setLoading(true);
    try {
      const all = await base44.entities.TobaccoLogoLibrary.list('-created_date', 500);
      const normalized = term.toLowerCase().trim();
      const results = (all || []).filter((logo) =>
        (logo.brand_name || '').toLowerCase().includes(normalized)
      );
      setLogos(results);
    } catch {
      setLogos([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialQuery.trim()) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(180,140,75,0.25)', background: 'rgba(20,13,8,0.95)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(180,140,75,0.12)' }}>
        <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>Browse Logo Library</p>
        <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10">
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(224,216,200,0.6)' }} />
        </button>
      </div>

      <div className="p-3 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search brand name…"
          className="flex-1 text-sm"
          style={{
            background: 'rgba(20,13,8,0.7)',
            border: '1px solid rgba(180,140,75,0.3)',
            color: '#F5F1E7',
          }}
        />
        <Button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          size="sm"
          style={{ background: 'rgba(180,140,75,0.9)', color: '#1a1008', fontWeight: 600, flexShrink: 0 }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {logos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 p-3 max-h-52 overflow-y-auto">
          {logos.map((logo) => (
            <button
              type="button"
              key={logo.id}
              onClick={() => onSelect(logo.logo_url)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img src={logo.logo_url} alt={logo.brand_name} className="w-12 h-12 object-contain rounded" />
              <p className="text-[10px] text-center leading-tight" style={{ color: 'rgba(212,165,116,0.8)' }}>
                {logo.brand_name}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

async function createCellarLogsForBlend(blendId, data, blendName) {
  const today = new Date().toISOString().split('T')[0];
  const logs = [];

  if (data.tin_tins_cellared && Number(data.tin_tins_cellared) > 0 && data.tin_size_oz) {
    logs.push({
      blend_id: blendId,
      blend_name: blendName,
      transaction_type: 'added',
      date: data.tin_cellared_date || today,
      amount_oz: Number(data.tin_tins_cellared) * Number(data.tin_size_oz),
      container_type: 'tin',
    });
  }

  if (data.bulk_cellared && Number(data.bulk_cellared) > 0) {
    logs.push({
      blend_id: blendId,
      blend_name: blendName,
      transaction_type: 'added',
      date: data.bulk_cellared_date || today,
      amount_oz: Number(data.bulk_cellared),
      container_type: 'bulk',
    });
  }

  if (data.pouch_pouches_cellared && Number(data.pouch_pouches_cellared) > 0 && data.pouch_size_oz) {
    logs.push({
      blend_id: blendId,
      blend_name: blendName,
      transaction_type: 'added',
      date: data.pouch_cellared_date || today,
      amount_oz: Number(data.pouch_pouches_cellared) * Number(data.pouch_size_oz),
      container_type: 'pouch',
    });
  }

  if (data.jar_cellared && Number(data.jar_cellared) > 0) {
    logs.push({
      blend_id: blendId,
      blend_name: blendName,
      transaction_type: 'added',
      date: data.jar_cellared_date || today,
      amount_oz: Number(data.jar_cellared),
      container_type: 'jar',
    });
  }

  if (logs.length > 0) {
    await base44.entities.CellarLog.bulkCreate(logs);
  }
}

export default function AddFlowManualImages({ itemType, typeLabel, data, onBack, onCreated }) {
  const [imageUrl, setImageUrl] = useState(
    itemType === 'blend' ? data.logo || '' : (itemType === 'pipe' || itemType === 'cigar') ? data.photos?.[0] || '' : data.photo || ''
  );
  const [imageMeta, setImageMeta]           = useState(null);
  const [uploading, setUploading]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showLibrary, setShowLibrary]       = useState(false);
  // Controls whether the optional external reference search panel is open
  const [showWebSearch, setShowWebSearch]   = useState(false);
  // Pipe-specific: whether the uploaded image is a reusable reference
  const [pipeIsReference, setPipeIsReference] = useState(false);
  const fileRef = useRef(null);

  const imageLabel =
    itemType === 'blend'
      ? 'Tin / Label Photo'
      : itemType === 'pipe'
        ? 'Pipe Photo'
        : itemType === 'cigar'
          ? 'Cigar Photo'
          : 'Bottle Photo';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const result = await uploadUserPhoto(file, {
        entityType: itemType,
        name:       data.name || '',
      });
      if (result.ok && result.fileUrl) {
        setImageUrl(result.fileUrl);
        setImageMeta({ image_source_type: 'user_upload', image_verified_by_user: true });
      } else {
        toast.error(result.error || 'Image upload failed');
      }
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const finalData = { ...data };

      if (imageUrl) {
        if (itemType === 'blend') finalData.logo = imageUrl;
        if (itemType === 'pipe') finalData.photos = [imageUrl];
        if (itemType === 'bottle') finalData.photo = imageUrl;
        if (itemType === 'cigar') finalData.photos = [imageUrl];
      }

      // Persist image source metadata when the user selected from suggestions
      const imageMetaPayload = imageMeta ? cleanObject({
        image_source_domain:    imageMeta.image_source_domain,
        image_source_type:      imageMeta.image_source_type,
        image_confidence:       imageMeta.image_confidence,
        image_verified_by_user: imageMeta.image_verified_by_user,
      }) : {};

      const inventoryPayload = finalData._inventoryPayload || createInventoryEngine(itemType).buildUpdatePayload(finalData);

      // If we have a quick record ID, update it instead of creating a new one
      if (finalData._quickRecord?.id) {
        const bottleSafeInventory = itemType === 'bottle'
          ? cleanObject({ purchase_price: inventoryPayload.purchase_price })
          : inventoryPayload;

        const updateData = cleanObject({
          ...bottleSafeInventory,
          ...imageMetaPayload,
          ...(itemType === 'blend' ? { logo: finalData.logo } : {}),
          ...(itemType === 'pipe' ? { photos: finalData.photos } : {}),
          ...(itemType === 'bottle' ? { photo: finalData.photo } : {}),
          ...(itemType === 'cigar' ? { photos: finalData.photos } : {}),
        });

        await base44.entities[ENTITIES[itemType]].update(finalData._quickRecord.id, updateData);

        if (itemType === 'blend') {
          await createCellarLogsForBlend(finalData._quickRecord.id, { ...finalData, ...updateData }, finalData._quickRecord.name);
        }

        // Async side-effects: library promotion + record link (non-blocking)
        if (imageUrl && (itemType === 'bottle' || itemType === 'blend' || itemType === 'pipe')) {
          const isUserUpload  = !imageMeta?._isInternalMatch;
          const libraryImageId = imageMeta?._libraryImageId || null;

          if (isUserUpload) {
            promoteUploadToLibrary(itemType, finalData, imageUrl, itemType === 'pipe' && pipeIsReference).then((libId) => {
              linkImageToRecord({
                recordType:      itemType,
                recordId:        finalData._quickRecord.id,
                imageUrl,
                imageSourceType: 'user_upload',
                libraryImageId:  libId,
                verifiedByUser:  true,
              });
            }).catch((e) => { if (import.meta.env.DEV) console.warn('[ImageLibrary] side-effect failed:', e); });
          } else {
            linkImageToRecord({
              recordType:      itemType,
              recordId:        finalData._quickRecord.id,
              imageUrl,
              imageSourceType: imageMeta?.image_source_type || 'user_confirmed',
              libraryImageId,
              verifiedByUser:  true,
            }).catch((e) => { if (import.meta.env.DEV) console.warn('[ImageLibrary] side-effect failed:', e); });
          }
        }

        toast.success(`${typeLabel} saved!`);
        onCreated?.({ ...finalData._quickRecord, ...updateData });
        return;
      }

      // Create new record
      const recordPayload = cleanObject({
        ...buildBaseRecord(itemType, finalData),
        ...inventoryPayload,
        ...imageMetaPayload,
      });

      const created = await base44.entities[ENTITIES[itemType]].create(recordPayload);

      if (itemType === 'blend') {
        await createCellarLogsForBlend(created.id, recordPayload, created.name);
      }

      // Async side-effects: library promotion + record link (non-blocking)
      if (imageUrl && created?.id && (itemType === 'bottle' || itemType === 'blend' || itemType === 'pipe')) {
        const isUserUpload   = !imageMeta?._isInternalMatch;
        const libraryImageId = imageMeta?._libraryImageId || null;

        if (isUserUpload) {
          promoteUploadToLibrary(itemType, { ...finalData, ...recordPayload }, imageUrl, itemType === 'pipe' && pipeIsReference).then((libId) => {
            linkImageToRecord({
              recordType:      itemType,
              recordId:        created.id,
              imageUrl,
              imageSourceType: 'user_upload',
              libraryImageId:  libId,
              verifiedByUser:  true,
            });
          }).catch((e) => { if (import.meta.env.DEV) console.warn('[ImageLibrary] side-effect failed:', e); });
        } else {
          linkImageToRecord({
            recordType:      itemType,
            recordId:        created.id,
            imageUrl,
            imageSourceType: imageMeta?.image_source_type || 'user_confirmed',
            libraryImageId,
            verifiedByUser:  true,
          }).catch((e) => { if (import.meta.env.DEV) console.warn('[ImageLibrary] side-effect failed:', e); });
        }
      }

      toast.success(`${typeLabel} saved!`);
      onCreated?.({ ...created, ...recordPayload });
    } catch (error) {
      toast.error(error?.message || 'Failed to save');
    } finally {
      setSaving(false);
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
            Add Photo
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
            Step 4 of 4 — Optional
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
          Add a photo now, or skip and add one later from the record.
        </p>

        {imageUrl ? (
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(180,140,75,0.25)', height: 240, background: 'rgba(0,0,0,0.2)' }}
          >
            <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => { setImageUrl(''); setImageMeta(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(20,13,8,0.85)', color: '#F5F1E7', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              ×
            </button>
            <div
              className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
              style={{
                background: imageMeta?._isInternalMatch ? 'rgba(180,140,75,0.85)' : 'rgba(46,125,92,0.85)',
                color: '#fff',
              }}
            >
              <Check className="w-3 h-3" />
              {imageMeta?._isInternalMatch ? 'Library Image' : 'Uploaded'}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors hover:bg-white/5"
            style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.65)' }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6" />
                <span className="text-sm">{imageLabel}</span>
              </div>
            )}
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {/* Pipe-specific: reference image toggle (shown after upload) */}
        {itemType === 'pipe' && imageUrl && !imageMeta?._isInternalMatch && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <input
              id="pipe-reference-toggle"
              type="checkbox"
              checked={pipeIsReference}
              onChange={(e) => setPipeIsReference(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="pipe-reference-toggle" className="text-xs cursor-pointer" style={{ color: 'rgba(167,139,250,0.85)' }}>
              Save as Reference Image — reusable for this pipe model
            </label>
          </div>
        )}

        {itemType === 'blend' && (
          <Button
            variant="outline"
            onClick={() => setShowLibrary((prev) => !prev)}
            style={{
              borderColor: 'rgba(180,140,75,0.25)',
              color: 'rgba(224,216,200,0.75)',
              background: 'transparent',
            }}
          >
            <BookImage className="w-4 h-4 mr-2" />
            Browse Logo Library
          </Button>
        )}

        {showLibrary && itemType === 'blend' && (
          <LogoLibraryPicker
            initialQuery={data.manufacturer || data.name || ''}
            onSelect={(url) => {
              setImageUrl(url);
              setImageMeta({ image_source_type: 'existing_logo_library', image_verified_by_user: true, _isInternalMatch: true });
              setShowLibrary(false);
            }}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {/* ── Internal library matches (Tier 1 — shown first) ── */}
        {(itemType === 'bottle' || itemType === 'blend' || itemType === 'pipe') && (
          <>
            <div style={{ height: 1, background: 'rgba(180,140,75,0.1)' }} />
            <InternalLibraryMatches
              itemType={itemType}
              data={data}
              onSelectImage={(url, meta) => {
                if (url) setImageUrl(url);
                setImageMeta(meta || null);
              }}
            />
          </>
        )}

        {/* ── External pipeline suggestions (optional, collapsed by default) ── */}
        {(itemType === 'bottle' || itemType === 'blend' || itemType === 'pipe') && (
          <>
            <div style={{ height: 1, background: 'rgba(180,140,75,0.06)' }} />
            <button
              type="button"
              onClick={() => setShowWebSearch((prev) => !prev)}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl hover:bg-white/5 transition-colors self-start"
              style={{ color: 'rgba(180,140,75,0.7)', border: '1px solid rgba(180,140,75,0.18)' }}
            >
              <Globe className="w-3.5 h-3.5" />
              {showWebSearch ? 'Hide Web Reference Matches' : 'Search Web for Reference Matches'}
            </button>
            {showWebSearch && (
              <ImageSuggestions
                active={showWebSearch}
                itemType={itemType}
                data={data}
                onSelectImage={(url, meta) => {
                  if (url) setImageUrl(url);
                  setImageMeta(meta || null);
                }}
                onRequestFileUpload={() => fileRef.current?.click()}
              />
            )}
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-2"
          style={{
            background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save {typeLabel}
        </Button>
      </div>
    </div>
  );
}