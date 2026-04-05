import React, { useRef, useState } from 'react';
import { ArrowLeft, BookImage, Check, Loader2, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { createInventoryEngine } from '@/components/inventory/InventoryEngine';

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
        const updateData = cleanObject({
          ...inventoryPayload,
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