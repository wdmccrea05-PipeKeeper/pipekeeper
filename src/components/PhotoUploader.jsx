import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Camera, Image as ImageIcon, X } from "lucide-react";

export default function PhotoUploader({ onPhotosSelected, existingPhotos = [], maxPhotos = 10 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (e, source) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onPhotosSelected(files);
    }
    // Reset input
    if (source === 'file' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (source === 'camera' && cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const remainingSlots = maxPhotos - existingPhotos.length;
  const canAddMore = remainingSlots > 0;

  return (
    <div className="w-full">
      <div className="flex gap-2 w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore}
          className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">From Gallery</span>
          <span className="sm:hidden">Gallery</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAddMore}
          className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <Camera className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Take Photo</span>
          <span className="sm:hidden">Camera</span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e, 'camera')}
        className="hidden"
      />

      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {existingPhotos.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
            </div>
          ))}
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-[#E0D8C8]/70 mt-2">Maximum photos reached</p>
      )}
    </div>
  );
}