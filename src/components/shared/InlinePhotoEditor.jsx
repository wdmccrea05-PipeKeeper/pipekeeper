import React, { useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Pencil, X, Loader2, BookImage, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';
import { Input } from '@/components/ui/input';
import { findInternalImageMatches } from '@/lib/images/imageLibraryMatcher';
import { upsertLibraryImageEntry } from '@/lib/images/imageLibraryService';
import { linkImageToRecord } from '@/lib/images/imageRecordLinkService';
import { normalizeBottleKey, normalizeBlendKey, normalizePipeKey } from '@/lib/images/imageNormalization';

// ── Source label chip styles ──────────────────────────────────────────────────

const SOURCE_LABEL_STYLES = {
  'Label Library':    { background: 'rgba(180,140,75,0.22)',  color: '#D4A574',              border: '1px solid rgba(180,140,75,0.4)' },
  'User Uploaded':    { background: 'rgba(46,125,92,0.22)',   color: '#6ee7b7',              border: '1px solid rgba(46,125,92,0.4)' },
  'User Confirmed':   { background: 'rgba(46,125,92,0.18)',   color: '#86efac',              border: '1px solid rgba(46,125,92,0.35)' },
  'Community Match':  { background: 'rgba(59,130,246,0.18)',  color: 'rgba(147,197,253,0.9)', border: '1px solid rgba(59,130,246,0.3)' },
  'Reference Image':  { background: 'rgba(99,102,241,0.15)',  color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(99,102,241,0.3)' },
  'Library Match':    { background: 'rgba(255,255,255,0.08)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(255,255,255,0.12)' },
};

/**
 * Internal library match section for the edit flow.
 * Shows previously stored images for the same product so the user can
 * pick a better or replacement image from the internal library.
 */
function InternalLibrarySection({ entityType, recordName, brand, maker, shape, onSelect }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    if (fetched) { setOpen(true); return; }
    setLoading(true);
    try {
      const results = await findInternalImageMatches({ entityType, name: recordName, brand, maker, shape });
      setMatches(results || []);
      setFetched(true);
    } catch {
      setMatches([]);
      setFetched(true);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={open ? () => setOpen(false) : load}
        className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
        style={{ color: 'rgba(180,140,75,0.75)' }}
      >
        <BookImage className="w-3.5 h-3.5" />
        {open ? 'Hide Library Matches' : 'Browse Library Matches'}
        {loading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
      </button>

      {open && !loading && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(180,140,75,0.18)', background: 'rgba(20,13,8,0.9)' }}>
          {matches.length === 0 ? (
            <p className="text-[11px] p-3" style={{ color: 'rgba(224,216,200,0.4)' }}>
              No library matches found yet.
            </p>
          ) : (
            <div className="flex flex-col gap-0 divide-y" style={{ '--tw-divide-opacity': 0.08 }}>
              {matches.map((m) => {
                const srcStyle = SOURCE_LABEL_STYLES[m.sourceLabel] || SOURCE_LABEL_STYLES['Library Match'];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { onSelect(m.cachedImageUrl); setOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    {m.cachedImageUrl ? (
                      <img
                        src={m.cachedImageUrl}
                        alt={m.title}
                        className="w-10 h-10 rounded-lg object-contain flex-shrink-0"
                        style={{ background: 'rgba(0,0,0,0.3)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{m.title || m.sourceLabel}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={srcStyle}>
                        {m.sourceLabel}
                      </span>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(46,125,92,0.8)' }}>Use</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogoLibraryPicker({ onSelect, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Auto-search when opened with a pre-filled query
  React.useEffect(() => {
    if (initialQuery.trim()) handleSearch(initialQuery);
  }, []);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const all = await base44.entities.TobaccoLogoLibrary.list('-created_date', 200);
      const lq = q.toLowerCase().trim();
      setLogos((all || []).filter(l => l.brand_name?.toLowerCase().includes(lq)));
      setSearched(true);
    } catch {
      setLogos([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(180,140,75,0.25)', background: 'rgba(20,13,8,0.97)' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(180,140,75,0.12)' }}>
        <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>Browse Logo Library</p>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10">
          <X className="w-3 h-3" style={{ color: 'rgba(224,216,200,0.6)' }} />
        </button>
      </div>
      <div className="p-2 flex gap-1.5">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search brand…"
          autoFocus
          className="flex-1 text-xs h-8"
          style={{ background: 'rgba(20,13,8,0.7)', border: '1px solid rgba(180,140,75,0.3)', color: '#F5F1E7' }}
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className="px-2 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(180,140,75,0.85)', color: '#1a1008', flexShrink: 0 }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </div>
      {searched && logos.length === 0 && (
        <p className="text-center text-[10px] py-3" style={{ color: 'rgba(224,216,200,0.4)' }}>No logos found</p>
      )}
      {logos.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 p-2 max-h-44 overflow-y-auto">
          {logos.map(logo => (
            <button
              key={logo.id}
              onClick={() => onSelect(logo.logo_url)}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img src={logo.logo_url} alt={logo.brand_name} className="w-10 h-10 object-contain rounded" />
              <p className="text-[9px] text-center leading-tight line-clamp-2" style={{ color: 'rgba(212,165,116,0.8)' }}>{logo.brand_name}</p>
            </button>
          ))}
        </div>
      )}
      <div className="pb-1" />
    </div>
  );
}

/**
 * InlinePhotoEditor
 *
 * Props:
 *   photos: string[]              — current array of photo URLs
 *   onUpdate: (photos) => void    — called with updated array after add/remove/edit
 *   maxPhotos?: number            — default 5
 *   label?: string                — section label
 */
export default function InlinePhotoEditor({
  photos         = [],
  onUpdate,
  maxPhotos      = 5,
  label          = 'Photos',
  showLogoLibrary = false,
  recordName     = '',
  entityType     = null,   // 'bottle' | 'blend' | 'pipe' — enables library match browse
  brand          = '',     // for bottle (distillery) / blend (manufacturer)
  maker          = '',     // for pipe
  shape          = '',     // for pipe
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropUrl, setCropUrl] = useState(null);   // URL being cropped
  const [cropIndex, setCropIndex] = useState(null); // index of existing photo being edited
  const [showLibrary, setShowLibrary] = useState(false);

  const cleanPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const canAdd = cleanPhotos.length < maxPhotos && !uploading;

  // Upload a File object, returns the remote URL
  async function uploadFile(file) {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  }

  // Upload a data-URL (from cropper), returns the remote URL
  async function uploadDataUrl(dataUrl) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    return uploadFile(file);
  }

  async function handleFileSelected(e, source) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    // Show cropper before uploading — convert file to object URL for preview
    const localUrl = URL.createObjectURL(file);
    setCropIndex(null); // new photo, not editing existing
    setCropUrl(localUrl);
  }

  async function handleCropSave(croppedDataUrl) {
    setCropUrl(null);
    setUploading(true);
    setError('');
    try {
      const remoteUrl = await uploadDataUrl(croppedDataUrl);
      if (cropIndex !== null) {
        // Replacing an existing photo
        const updated = cleanPhotos.map((p, i) => (i === cropIndex ? remoteUrl : p));
        onUpdate(updated);
      } else {
        // Adding a new photo
        onUpdate([...cleanPhotos, remoteUrl]);
      }
    } catch (err) {
      console.error('[InlinePhotoEditor] upload failed', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setCropIndex(null);
    }
  }

  function handleCropCancel() {
    setCropUrl(null);
    setCropIndex(null);
  }

  function removePhoto(idx) {
    onUpdate(cleanPhotos.filter((_, i) => i !== idx));
  }

  function editPhoto(idx) {
    setCropIndex(idx);
    setCropUrl(cleanPhotos[idx]);
  }

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180,140,75,0.8)' }}>
          {label}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Existing photos */}
        {cleanPhotos.map((url, idx) => (
          <div
            key={idx}
            className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(180,140,75,0.22)' }}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />

            {/* Always-visible controls (works on touch + desktop) */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => editPhoto(idx)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/35 active:scale-90 transition-all"
                aria-label="Edit photo"
              >
                <Pencil className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/70 active:scale-90 transition-all"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        ))}

        {/* Add from Camera */}
        {canAdd && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-all hover:opacity-80 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(180,140,75,0.35)',
              color: 'rgba(180,140,75,0.75)',
            }}
            aria-label="Take photo with camera"
            title="Camera"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[9px] font-medium">Camera</span>
              </>
            )}
          </button>
        )}

        {/* Add from Gallery */}
        {canAdd && (
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-all hover:opacity-80 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(180,140,75,0.35)',
              color: 'rgba(180,140,75,0.75)',
            }}
            aria-label="Choose from gallery"
            title="Gallery"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-[9px] font-medium">Gallery</span>
              </>
            )}
          </button>
        )}

        {/* Logo Library button — blend only */}
        {canAdd && showLogoLibrary && (
          <button
            type="button"
            onClick={() => setShowLibrary(v => !v)}
            className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-all hover:opacity-80 active:scale-95"
            style={{
              background: showLibrary ? 'rgba(180,140,75,0.12)' : 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(180,140,75,0.35)',
              color: 'rgba(180,140,75,0.75)',
            }}
            aria-label="Browse logo library"
            title="Logo Library"
          >
            <BookImage className="w-5 h-5" />
            <span className="text-[9px] font-medium">Library</span>
          </button>
        )}
      </div>

      {showLibrary && (
        <LogoLibraryPicker
          onSelect={(url) => { onUpdate([...cleanPhotos, url]); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
          initialQuery={recordName}
        />
      )}

      {/* Internal library matches — shown for all supported entity types */}
      {entityType && (entityType === 'bottle' || entityType === 'blend' || entityType === 'pipe') && (
        <InternalLibrarySection
          entityType={entityType}
          recordName={recordName}
          brand={brand}
          maker={maker}
          shape={shape}
          onSelect={(url) => { if (url) onUpdate([...cleanPhotos, url]); }}
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Camera input — opens camera on mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelected(e, 'camera')}
      />

      {/* Gallery input — opens photo picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e, 'gallery')}
      />

      {/* Cropper modal */}
      {cropUrl && (
        <ImageCropper
          imageUrl={cropUrl}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}