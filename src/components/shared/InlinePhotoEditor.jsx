import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Pencil, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';

/**
 * InlinePhotoEditor
 *
 * Props:
 *   photos: string[]              — current array of photo URLs
 *   onUpdate: (photos) => void    — called with updated array after add/remove/edit
 *   maxPhotos?: number            — default 5
 *   label?: string                — section label
 */
export default function InlinePhotoEditor({ photos = [], onUpdate, maxPhotos = 5, label = 'Photos' }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropUrl, setCropUrl] = useState(null);   // URL being cropped
  const [cropIndex, setCropIndex] = useState(null); // index of existing photo being edited

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
            className="relative group w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(180,140,75,0.22)' }}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />

            {/* Hover overlay with Edit + Remove */}
            <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => editPhoto(idx)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                aria-label="Edit photo"
              >
                <Pencil className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-red-500/60 transition-colors"
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
      </div>

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