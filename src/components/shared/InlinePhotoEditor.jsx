import React, { useRef, useState } from 'react';
import { Camera, X, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * InlinePhotoEditor
 * 
 * Props:
 *   photos: string[]         — current array of photo URLs
 *   onUpdate: (photos) => void — called with the new array after add/remove
 *   maxPhotos?: number        — default 5
 *   label?: string            — optional label shown above
 */
export default function InlinePhotoEditor({ photos = [], onUpdate, maxPhotos = 5, label = 'Photos' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const cleanPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpdate([...cleanPhotos, file_url]);
    } catch (err) {
      console.error('[InlinePhotoEditor] upload failed', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx) {
    const updated = cleanPhotos.filter((_, i) => i !== idx);
    onUpdate(updated);
  }

  const canAdd = cleanPhotos.length < maxPhotos && !uploading;

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180,140,75,0.8)' }}>
          {label}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {cleanPhotos.map((url, idx) => (
          <div
            key={idx}
            className="relative group w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(180,140,75,0.22)' }}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove photo"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-all hover:opacity-80 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(180,140,75,0.35)',
              color: 'rgba(180,140,75,0.7)',
            }}
            aria-label="Add photo"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium">Add</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}