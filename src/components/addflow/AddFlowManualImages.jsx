import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookImage, Check, Globe, Image as ImageIcon, Loader2, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { createInventoryEngine } from '@/components/inventory/InventoryEngine';
import { searchForImages } from '@/lib/search/unifiedSearchService';

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
  High:   { background: 'rgba(46,125,92,0.22)',  color: '#6ee7b7', border: '1px solid rgba(46,125,92,0.4)' },
  Medium: { background: 'rgba(180,140,75,0.18)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.35)' },
  Low:    { background: 'rgba(120,80,60,0.18)',  color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(120,80,60,0.3)' },
};

function proxyImageUrl(url) {
  if (!url) return null;
  // Proxy through weserv.nl to bypass hotlink protection and CORS issues
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=112&h=112&fit=contain&we`;
}

/** Thumbnail that shows a placeholder when the image fails to load */
function SuggestionThumb({ imageUrl, title }) {
  const [failed, setFailed] = useState(false);
  const proxied = proxyImageUrl(imageUrl);

  if (!imageUrl || (failed && !proxied)) {
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
      src={failed ? imageUrl : proxied}
      alt={title || 'Suggested image'}
      className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Inline component that fetches and displays trusted image suggestions for the
 * current record. Fires automatically on mount when no image is present.
 */
function ImageSuggestions({ itemType, data, onSelectImage }) {
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
      // Pass a seed on retries so the LLM uses alternative sources/angles
      const seed = isRetry ? Date.now() : undefined;
      const { results } = await searchForImages(itemType, fields, { maxResults: 6, seed });
      setSuggestions(results.filter((r) => r.imageUrl));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  // Auto-fetch once on mount
  useEffect(() => {
    if (!hasFetchedRef.current && (fields.name || fields.distillery || fields.maker || fields.manufacturer)) {
      hasFetchedRef.current = true;
      fetchSuggestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchAgain = () => {
    setSearchCount(c => c + 1);
    fetchSuggestions(true);
  };

  if (!loading && !fetched) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            Suggested Images
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
            {suggestions.length > 0
              ? `${suggestions.length} trusted image${suggestions.length === 1 ? '' : 's'} found.`
              : 'Choose a trusted image match or upload your own.'}
          </p>
        </div>
        {fetched && (
          <button
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
          <span className="text-xs">{searchCount > 0 ? 'Broadening search…' : 'Finding trusted images…'}</span>
        </div>
      )}

      {!loading && fetched && suggestions.length === 0 && (
        <p className="text-xs py-2" style={{ color: 'rgba(224,216,200,0.35)' }}>
          No trusted image matches found. Try Search Again, paste an image URL, or upload your own.
        </p>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.map((img) => (
            <div
              key={img.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: 'linear-gradient(180deg, #111111 0%, #0b0b0b 100%)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 18,
              }}
            >
              {/* Thumbnail — stateful so failed loads show a placeholder */}
              <SuggestionThumb imageUrl={img.imageUrl} title={img.title} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {img.imageLabel || (itemType === 'pipe' ? 'Reference Image' : 'Suggested Match')}
                </p>
                {img.title && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {img.title}
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
                  {img.confidenceLabel && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={CONFIDENCE_CHIP_STYLES[img.confidenceLabel] || CONFIDENCE_CHIP_STYLES.Low}
                    >
                      {img.confidenceLabel === 'High' ? '✓ ' : img.confidenceLabel === 'Medium' ? '~ ' : '? '}
                      {img.confidenceLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Action button */}
              <Button
                size="sm"
                onClick={() => onSelectImage(img.imageUrl)}
                style={{
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.85), rgba(180,140,50,0.85))',
                  color: '#1a1008',
                  fontWeight: 700,
                  fontSize: 11,
                  flexShrink: 0,
                  minWidth: 72,
                  borderRadius: 10,
                }}
              >
                Use This
              </Button>
            </div>
          ))}
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
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10">
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
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

      const inventoryPayload = finalData._inventoryPayload || createInventoryEngine(itemType).buildUpdatePayload(finalData);

      // If we have a quick record ID, update it instead of creating a new one
      if (finalData._quickRecord?.id) {
        const bottleSafeInventory = itemType === 'bottle'
          ? cleanObject({ purchase_price: inventoryPayload.purchase_price })
          : inventoryPayload;

        const updateData = cleanObject({
          ...bottleSafeInventory,
          ...(itemType === 'blend' ? { logo: finalData.logo } : {}),
          ...(itemType === 'pipe' ? { photos: finalData.photos } : {}),
          ...(itemType === 'bottle' ? { photo: finalData.photo } : {}),
          ...(itemType === 'cigar' ? { photos: finalData.photos } : {}),
        });

        await base44.entities[ENTITIES[itemType]].update(finalData._quickRecord.id, updateData);

        if (itemType === 'blend') {
          await createCellarLogsForBlend(finalData._quickRecord.id, { ...finalData, ...updateData }, finalData._quickRecord.name);
        }

        toast.success(`${typeLabel} saved!`);
        onCreated?.({ ...finalData._quickRecord, ...updateData });
        return;
      }

      // Create new record
      const recordPayload = cleanObject({
        ...buildBaseRecord(itemType, finalData),
        ...inventoryPayload,
      });

      const created = await base44.entities[ENTITIES[itemType]].create(recordPayload);

      if (itemType === 'blend') {
        await createCellarLogsForBlend(created.id, recordPayload, created.name);
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
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(20,13,8,0.85)', color: '#F5F1E7', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              ×
            </button>
            <div
              className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
              style={{ background: 'rgba(46,125,92,0.85)', color: '#fff' }}
            >
              <Check className="w-3 h-3" /> Uploaded
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
            Browse Library
          </Button>
        )}

        {showLibrary && itemType === 'blend' && (
          <LogoLibraryPicker
            initialQuery={data.manufacturer || data.name || ''}
            onSelect={(url) => {
              setImageUrl(url);
              setShowLibrary(false);
            }}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {/* Trusted image suggestions — shown when no image has been chosen yet */}
        {!imageUrl && (itemType === 'bottle' || itemType === 'blend' || itemType === 'pipe') && (
          <div style={{ height: 1, background: 'rgba(180,140,75,0.1)' }} />
        )}
        {!imageUrl && (itemType === 'bottle' || itemType === 'blend' || itemType === 'pipe') && (
          <ImageSuggestions
            itemType={itemType}
            data={data}
            onSelectImage={(url) => setImageUrl(url)}
          />
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