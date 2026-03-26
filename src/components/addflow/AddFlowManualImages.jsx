import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Loader2, Check, BookImage, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ENTITIES = { blend: 'TobaccoBlend', pipe: 'Pipe', bottle: 'Bottle' };

function buildFinalRecord(itemType, data) {
  const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  if (itemType === 'blend') return clean({
    name: data.name,
    manufacturer: data.manufacturer,
    blend_type: data.blend_type,
    strength: data.strength,
    cut: data.cut,
    flavor_notes: data.flavor_notes?.length ? data.flavor_notes : undefined,
    notes: data.notes,
    logo: data.logo,
    tin_total_tins: data.tin_total_tins,
    tin_size_oz: data.tin_size_oz,
    tin_total_quantity_oz: data.tin_total_quantity_oz,
    tin_tins_open: data.tin_tins_open,
    tin_tins_cellared: data.tin_tins_cellared,
    tin_cellared_date: data.tin_cellared_date,
    bulk_total_quantity_oz: data.bulk_total_quantity_oz,
    bulk_open: data.bulk_open,
    bulk_cellared: data.bulk_cellared,
    bulk_cellared_date: data.bulk_cellared_date,
    pouch_total_pouches: data.pouch_total_pouches,
    pouch_size_oz: data.pouch_size_oz,
    pouch_total_quantity_oz: data.pouch_total_quantity_oz,
    pouch_pouches_open: data.pouch_pouches_open,
    pouch_pouches_cellared: data.pouch_pouches_cellared,
    pouch_cellared_date: data.pouch_cellared_date,
  });
  if (itemType === 'pipe') return clean({
    name: data.name,
    maker: data.maker,
    shape: data.shape,
    bowl_material: data.bowl_material,
    finish: data.finish,
    condition: data.condition,
    notes: data.notes,
    photos: data.photos?.length ? data.photos : undefined,
  });
  if (itemType === 'bottle') return clean({
    name: data.name,
    distillery: data.distillery,
    type: data.type,
    abv: data.abv ? Number(data.abv) : undefined,
    age: data.age ? Number(data.age) : undefined,
    notes: data.notes,
    photo: data.photo,
  });
  return { name: data.name };
}

function LogoLibraryPicker({ onSelect, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  React.useEffect(() => {
    if (initialQuery.trim()) handleSearch(initialQuery);
  }, []);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const all = await base44.entities.TobaccoLogoLibrary.list('-created_date', 500);
      const lq = q.toLowerCase().trim();
      const queryWords = lq.split(/\s+/).filter(Boolean);
      let filtered = (all || []).filter(l => {
        const brandLower = l.brand_name?.toLowerCase() || '';
        // Match if any word from query is in the brand name
        return queryWords.some(word => brandLower.includes(word)) || brandLower.includes(lq);
      });
      // If no exact matches, show all available logos for browsing
      if (filtered.length === 0) filtered = all || [];
      setLogos(filtered);
      setSearched(true);
    } catch {
      setLogos([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(180,140,75,0.25)', background: 'rgba(20,13,8,0.95)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(180,140,75,0.12)' }}>
        <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>Browse Logo Library</p>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10">
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(224,216,200,0.6)' }} />
        </button>
      </div>
      <div className="p-3 flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search brand name…"
          autoFocus
          className="flex-1 text-sm"
          style={{ background: 'rgba(20,13,8,0.7)', border: '1px solid rgba(180,140,75,0.3)', color: '#F5F1E7' }}
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
      {searched && logos.length === 0 && (
        <p className="text-center text-xs py-4" style={{ color: 'rgba(224,216,200,0.4)' }}>No logos found for "{query}"</p>
      )}
      {logos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 p-3 max-h-52 overflow-y-auto">
          {logos.map(logo => (
            <button
              key={logo.id}
              onClick={() => onSelect(logo.logo_url)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img src={logo.logo_url} alt={logo.brand_name} className="w-12 h-12 object-contain rounded" />
              <p className="text-[10px] text-center leading-tight" style={{ color: 'rgba(212,165,116,0.8)' }}>{logo.brand_name}</p>
            </button>
          ))}
        </div>
      )}
      <div className="pb-1" />
    </div>
  );
}

export default function AddFlowManualImages({ itemType, typeLabel, data, onBack, onCreated }) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileRef = useRef(null);

  const imageLabel = itemType === 'blend' ? 'Tin / Label Photo' :
                     itemType === 'pipe' ? 'Pipe Photo' : 'Bottle Photo';

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
        else if (itemType === 'pipe') finalData.photos = [imageUrl];
        else if (itemType === 'bottle') finalData.photo = imageUrl;
      }
      
      // If this is a quick add (has _quickRecord), update existing record
      if (data._quickRecord && itemType === 'blend') {
        const updateData = buildFinalRecord(itemType, finalData);
        const blendId = data._quickRecord.id;
        await base44.entities.TobaccoBlend.update(blendId, updateData);
        
        // Create CellarLog entries for cellared quantities
        await createCellarLogsForRecord(blendId, finalData, data._quickRecord.name);
        
        toast.success(`${typeLabel} saved!`);
        onCreated({ ...data._quickRecord, ...updateData });
      } else {
        // Manual add - create new record
        const record = buildFinalRecord(itemType, finalData);
        const created = await base44.entities[ENTITIES[itemType]].create(record);
        
        // Create CellarLog entries for cellared quantities
        if (itemType === 'blend') {
          await createCellarLogsForRecord(created.id, finalData, created.name);
        }
        
        toast.success(`${typeLabel} saved!`);
        onCreated({ ...created, ...finalData });
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  
  async function createCellarLogsForRecord(blendId, data, blendName) {
    const today = new Date().toISOString().split('T')[0];
    const logs = [];
    
    // Tins cellared
    if (data.tin_tins_cellared && Number(data.tin_tins_cellared) > 0 && data.tin_size_oz) {
      const amount = Number(data.tin_tins_cellared) * Number(data.tin_size_oz);
      logs.push({
        blend_id: blendId,
        blend_name: blendName,
        transaction_type: 'added',
        date: data.tin_cellared_date || today,
        amount_oz: amount,
        container_type: 'tin',
      });
    }
    
    // Bulk cellared
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
    
    // Pouches cellared
    if (data.pouch_pouches_cellared && Number(data.pouch_pouches_cellared) > 0 && data.pouch_size_oz) {
      const amount = Number(data.pouch_pouches_cellared) * Number(data.pouch_size_oz);
      logs.push({
        blend_id: blendId,
        blend_name: blendName,
        transaction_type: 'added',
        date: data.pouch_cellared_date || today,
        amount_oz: amount,
        container_type: 'pouch',
      });
    }
    
    if (logs.length > 0) {
      await base44.entities.CellarLog.bulkCreate(logs);
    }
  }

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
            Add Photo
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>{itemType === 'blend' ? 'Step 4 of 4 — Optional' : 'Step 3 of 3 — Optional'}</p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
          Add a photo now, or skip and add one later from the record.
        </p>

        {/* Upload zone */}
        {imageUrl ? (
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(180,140,75,0.25)', height: 240, background: 'rgba(0,0,0,0.2)' }}>
            <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(20,13,8,0.85)', color: '#F5F1E7', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              ×
            </button>
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(46,125,92,0.85)', color: '#fff' }}>
              <Check className="w-3 h-3" /> Uploaded
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-2xl flex flex-col items-center justify-center gap-3 py-10 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
            style={{ border: '2px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.6)' }}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}>
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm" style={{ color: 'rgba(212,165,116,0.85)' }}>{imageLabel}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.35)' }}>Tap to browse</p>
                </div>
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {/* Logo library option — blend only */}
        {itemType === 'blend' && !imageUrl && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowLibrary(v => !v)}
              className="flex items-center gap-2 justify-center w-full py-2.5 rounded-xl transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(180,140,75,0.2)', color: 'rgba(180,140,75,0.75)' }}
            >
              <BookImage className="w-4 h-4" />
              <span className="text-sm font-medium">Browse Logo Library</span>
            </button>
            {showLibrary && (
              <LogoLibraryPicker
                onSelect={(url) => { setImageUrl(url); setShowLibrary(false); }}
                onClose={() => setShowLibrary(false)}
                initialQuery={data?.name || ''}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ background: 'linear-gradient(135deg, rgba(46,125,92,1), rgba(36,105,76,1))', color: '#fff', fontWeight: 600 }}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save {typeLabel}
        </Button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-center text-sm py-1 transition-colors hover:opacity-80 w-full"
          style={{ color: 'rgba(224,216,200,0.4)' }}
        >
          Skip photo and save
        </button>
      </div>
      <div className="pb-2" />
    </div>
  );
}