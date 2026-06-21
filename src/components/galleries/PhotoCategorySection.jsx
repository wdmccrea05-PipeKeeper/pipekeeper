import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import PhotoUploader from '@/components/PhotoUploader';
import { useTranslation } from '@/components/i18n/safeTranslation';

/**
 * PhotoCategorySection
 * Displays a categorized photo gallery with upload/camera/search controls
 * 
 * Props:
 * - categoryLabel: string (e.g., "Main Photos", "Stamping Photos")
 * - photos: array of URLs
 * - maxPhotos: number (e.g., 5, 2)
 * - onPhotosSelected: (files) => void
 * - onRemovePhoto: (index) => void
 * - onSearchOnlineClick: () => void (optional)
 * - recordType: string (pipe, blend, bottle)
 * - recordData: object (current form data for search query generation)
 */
export default function PhotoCategorySection({
  categoryLabel,
  photos = [],
  maxPhotos = 5,
  onPhotosSelected,
  onRemovePhoto,
  onSearchOnlineClick,
  recordType,
  recordData,
}) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const canAddMore = photos.length < maxPhotos;
  
  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-[rgba(30,20,15,0.5)] border border-[rgba(140,105,65,0.2)]">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#E0D8C8]">{categoryLabel}</h3>
        <span className="text-xs text-[#D8C7A6]/60">
          {photos.length} / {maxPhotos}
        </span>
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="space-y-2">
          {/* Main Photo Display */}
          <div className="relative group">
            <img
              src={photos[currentIndex]}
              alt=""
              className="w-full h-40 object-cover rounded-lg border border-[rgba(140,105,65,0.3)]"
            />

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Remove Button */}
            <button
              onClick={() => onRemovePhoto(currentIndex)}
              className="absolute top-2 right-2 p-1 rounded-full bg-red-600/80 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              type="button"
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Photo Thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {photos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 h-12 w-12 rounded border-2 transition-colors ${
                    idx === currentIndex
                      ? 'border-[#D4A574] opacity-100'
                      : 'border-[rgba(140,105,65,0.3)] opacity-60 hover:opacity-100'
                  }`}
                  type="button"
                >
                  <img src={url} alt="" className="w-full h-full object-cover rounded" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-[#D8C7A6]/60">{t("mediaLimits.noPhotos")}</p>
        </div>
      )}

      {/* Upload Controls */}
      <PhotoUploader
        onPhotosSelected={onPhotosSelected}
        existingPhotos={photos}
        maxPhotos={maxPhotos}
        onSearchOnlineClick={onSearchOnlineClick}
        showSearchOption={!!onSearchOnlineClick}
        recordType={recordType}
        recordData={recordData}
      />

      {/* Limit Indicator */}
      {!canAddMore && (
        <p className="text-xs text-[#D4A574]/80 text-center">
          {t("mediaLimits.maximumImagesReached")}
        </p>
      )}
    </div>
  );
}