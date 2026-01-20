import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ZoomIn, RotateCw, Check, X } from "lucide-react";

export default function AvatarCropper({ image, onCropComplete, onCancel, aspectRatio = 1, cropShape = "round" }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      // Center image
      setPosition({ x: 0, y: 0 });
    };
  }, [image]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [position, zoom, rotation, imageLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Calculate scale to fit image in canvas
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
    const x = (canvas.width - img.width * scale) / 2 + position.x;
    const y = (canvas.height - img.height * scale) / 2 + position.y;

    // Apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw image
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate crop area (center circle/square)
    const cropSize = Math.min(canvas.width, canvas.height) * 0.7;
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;

    // Clear crop area
    ctx.save();
    ctx.beginPath();
    if (cropShape === "round") {
      ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(cropX, cropY, cropSize, cropSize);
    }
    ctx.clip();
    
    // Apply rotation again for clipped area
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // Redraw image in crop area
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    ctx.restore();

    // Draw crop border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (cropShape === "round") {
      ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(cropX, cropY, cropSize, cropSize);
    }
    ctx.stroke();

    ctx.restore();
  };

  const getEventCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;
    
    return { mouseX, mouseY };
  };

  const handleMouseDown = (e) => {
    const { mouseX, mouseY } = getEventCoordinates(e);
    setIsDragging(true);
    setDragStart({ x: mouseX - position.x, y: mouseY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const { mouseX, mouseY } = getEventCoordinates(e);
    
    setPosition({
      x: mouseX - dragStart.x,
      y: mouseY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getCroppedImage = () => {
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const outputSize = 400; // Output resolution
    canvas.width = outputSize;
    canvas.height = outputSize;

    const canvasWidth = 400;
    const canvasHeight = 400;
    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * zoom;
    const x = (canvasWidth - img.width * scale) / 2 + position.x;
    const y = (canvasHeight - img.height * scale) / 2 + position.y;

    const cropSize = Math.min(canvasWidth, canvasHeight) * 0.7;
    const cropX = (canvasWidth - cropSize) / 2;
    const cropY = (canvasHeight - cropSize) / 2;

    // Draw to output canvas
    ctx.save();
    if (cropShape === "round") {
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // Apply rotation to output
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-outputSize / 2, -outputSize / 2);

    // Scale coordinates to output size
    const scaleRatio = outputSize / canvasWidth;
    ctx.drawImage(
      img, 
      (x - cropX) / scale, 
      (y - cropY) / scale, 
      cropSize / scale, 
      cropSize / scale, 
      0, 
      0, 
      outputSize, 
      outputSize
    );
    ctx.restore();

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        resolve(file);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleSave = async () => {
    const croppedFile = await getCroppedImage();
    onCropComplete(croppedFile);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile Picture</DialogTitle>
          <p className="text-sm text-stone-500">
            Drag to move • Zoom • Rotate • Crop
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview Reference Frame */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-amber-900">Final Profile Picture Preview</span>
            </div>
            <div className="flex justify-center">
              <div className={`relative ${cropShape === "round" ? "rounded-full" : "rounded-lg"} border-4 border-dashed border-amber-400 bg-white overflow-hidden`} style={{ width: '120px', height: '120px' }}>
                {imageLoaded && (
                  <canvas
                    ref={(canvas) => {
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      const img = imageRef.current;
                      if (!img) return;
                      
                      canvas.width = 120;
                      canvas.height = 120;
                      
                      ctx.save();
                      if (cropShape === "round") {
                        ctx.beginPath();
                        ctx.arc(60, 60, 60, 0, Math.PI * 2);
                        ctx.clip();
                      }
                      
                      const canvasWidth = 400;
                      const canvasHeight = 400;
                      const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * zoom;
                      const x = (canvasWidth - img.width * scale) / 2 + position.x;
                      const y = (canvasHeight - img.height * scale) / 2 + position.y;
                      const cropSize = Math.min(canvasWidth, canvasHeight) * 0.7;
                      const cropX = (canvasWidth - cropSize) / 2;
                      const cropY = (canvasHeight - cropSize) / 2;
                      
                      ctx.translate(60, 60);
                      ctx.rotate((rotation * Math.PI) / 180);
                      ctx.translate(-60, -60);
                      
                      const scaleRatio = 120 / canvasWidth;
                      ctx.drawImage(
                        img, 
                        (x - cropX) / scale, 
                        (y - cropY) / scale, 
                        cropSize / scale, 
                        cropSize / scale, 
                        0, 
                        0, 
                        120, 
                        120
                      );
                      ctx.restore();
                    }}
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-2 text-center">
              This is how your profile picture will appear
            </p>
          </div>

          <div 
            className="relative bg-stone-900 rounded-lg overflow-hidden touch-none flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-auto cursor-move max-w-full"
              style={{ maxHeight: '400px', maxWidth: '400px' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-amber-600" />
                  Zoom
                </label>
                <span className="text-sm font-mono text-stone-600">{zoom.toFixed(1)}x</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-amber-600" />
                  Rotation
                </label>
                <span className="text-sm font-mono text-stone-600">{rotation}°</span>
              </div>
              <div className="flex gap-2">
                <Slider
                  value={[rotation]}
                  onValueChange={([v]) => setRotation(v)}
                  min={0}
                  max={360}
                  step={1}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="shrink-0"
                >
                  90°
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-amber-700 hover:bg-amber-800">
            <Check className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}