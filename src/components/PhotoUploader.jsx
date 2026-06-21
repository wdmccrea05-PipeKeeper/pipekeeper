import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';
import { toast } from 'sonner';



export default function PhotoUploader({
  onPhotosSelected,
  existingPhotos = [],
  maxPhotos = 10,
  onSearchOnlineClick: _onSearchOnlineClick = null,
  showSearchOption: _showSearchOption = false,
  recordType = null,
  recordData: _recordData = null,
  buttonClassName = '',
  previewClassName = '',
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const remainingSlots = Math.max(0, maxPhotos - existingPhotos.length);
  const canAddMore = remainingSlots > 0;

  const isBottle = recordType === 'bottle';
  const previewSizingClass = previewClassName ||
    (isBottle ? 'w-20 h-28 object-contain rounded border bg-black/20' : 'w-20 h-20 object-contain rounded border bg-black/10');

  const openCropper = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    // reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e?.target?.files?.[0];
    if (file) openCropper(file);
  };

  const handleCropSave = async (croppedDataUrl) => {
    setUploading(true);
    let didSucceed = false;
    try {
      // Convert data URL to blob
      const res = await fetch(croppedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newPhotos = [...existingPhotos, file_url];
      if (typeof onPhotosSelected === 'function') onPhotosSelected(newPhotos);
      didSucceed = true;
    } catch (err) {
      console.error('[PhotoUploader] upload error:', err);
      toast.error(t('photoUploader.failedToUploadPhoto'));
    } finally {
      setUploading(false);
      if (didSucceed) {
        setCropImageUrl(null);
      }
    }
  };

  const handleRemovePhoto = (idx) => {
    const newPhotos = existingPhotos.filter((_, i) => i !== idx);
    if (typeof onPhotosSelected === 'function') onPhotosSelected(newPhotos);
  };

  return (
    <>
    {cropImageUrl && (
      <ImageCropper
        imageUrl={cropImageUrl}
        onSave={handleCropSave}
        onCancel={() => { setCropImageUrl(null); }}
      />
    )}
    <div className="w-full">
      <div className="flex flex-wrap gap-2 w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore || uploading}
          className={`flex-1 min-w-[100px] bg-stone-700 border-stone-600 text-white hover:bg-stone-800 ${buttonClassName}`}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
          <span className="hidden sm:inline">{t('photoUploader.fromGallery')}</span>
          <span className="sm:hidden">{t('photoUploader.gallery')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAddMore || uploading}
          className={`flex-1 min-w-[100px] bg-stone-700 border-stone-600 text-white hover:bg-stone-800 ${buttonClassName}`}
        >
          <Camera className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{t('photoUploader.takePhoto')}</span>
          <span className="sm:hidden">{t('photoUploader.camera')}</span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {existingPhotos.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative group">
              <img src={url} alt="" className={previewSizingClass} style={{ backgroundColor: 'transparent' }} />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-[#E0D8C8]/70 mt-2">
          {t('photoUploader.maximumPhotosReached')}
        </p>
      )}
    </div>
    </>
  );
}
