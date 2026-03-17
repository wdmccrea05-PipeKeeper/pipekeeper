import React, { useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Search } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

function acceptSingleOrMany(files, maxPhotos) {
  const arr = Array.from(files || []);
  if (!arr.length) return [];
  return maxPhotos === 1 ? arr.slice(0, 1) : arr;
}

export default function PhotoUploader({
  onPhotosSelected,
  existingPhotos = [],
  maxPhotos = 10,
  onSearchOnlineClick = null,
  showSearchOption = false,
  recordType = null,
  recordData = null,
  buttonClassName = '',
  previewClassName = '',
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const remainingSlots = Math.max(0, maxPhotos - existingPhotos.length);
  const canAddMore = remainingSlots > 0;

  const isBottle = recordType === 'bottle';
  const previewSizingClass = useMemo(() => {
    if (previewClassName) return previewClassName;
    return isBottle
      ? 'w-20 h-28 object-contain rounded border bg-black/20'
      : 'w-20 h-20 object-cover rounded border';
  }, [isBottle, previewClassName]);

  const handleFileSelect = (e, source) => {
    const selectedFiles = acceptSingleOrMany(e?.target?.files, maxPhotos);
    if (selectedFiles.length > 0 && typeof onPhotosSelected === 'function') {
      onPhotosSelected(selectedFiles);
    }

    if (source === 'file' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (source === 'camera' && cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore}
          className={`flex-1 min-w-[100px] bg-stone-700 border-stone-600 text-white hover:bg-stone-800 ${buttonClassName}`}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{t("photos.fromGallery") || 'From Gallery'}</span>
          <span className="sm:hidden">{t("photos.gallery") || 'Gallery'}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAddMore}
          className={`flex-1 min-w-[100px] bg-stone-700 border-stone-600 text-white hover:bg-stone-800 ${buttonClassName}`}
        >
          <Camera className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{t("aiIdentifier.takePhoto") || 'Take Photo'}</span>
          <span className="sm:hidden">{t("photos.camera") || 'Camera'}</span>
        </Button>

        {showSearchOption && typeof onSearchOnlineClick === 'function' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSearchOnlineClick}
            disabled={!canAddMore}
            className={`flex-1 min-w-[100px] bg-stone-700 border-stone-600 text-white hover:bg-stone-800 ${buttonClassName}`}
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{t("onlineImageSearch.searchOnline", "Search Online")}</span>
            <span className="sm:hidden">{t("onlineImageSearch.search", "Search")}</span>
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={maxPhotos !== 1}
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={false}
        onChange={(e) => handleFileSelect(e, 'camera')}
        className="hidden"
      />

      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {existingPhotos.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative">
              <img src={url} alt="" className={previewSizingClass} />
            </div>
          ))}
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-[#E0D8C8]/70 mt-2">
          {t("photos.maxReached") || 'Maximum photos reached'}
        </p>
      )}
    </div>
  );
}
