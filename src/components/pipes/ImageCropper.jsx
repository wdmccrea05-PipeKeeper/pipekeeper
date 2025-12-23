import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crop, RotateCw, ZoomIn, Check, X } from "lucide-react";

export default function ImageCropper({ imageUrl, onSave, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Center crop on image - free form (4:3 ratio as default)
      const width = Math.min(img.width * 0.8, img.width);
      const height = Math.min(img.height * 0.8, img.height);
      setCrop({
        x: (img.width - width) / 2,
        y: (img.height - height) / 2,
        width: width,
        height: height
      });
      drawCanvas();
    };
  }, [imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [crop, zoom, rotation, imageLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Set canvas size
    canvas.width = 500;
    canvas.height = 500;

    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Calculate scale to fit image in canvas
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw image
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate crop area (but don't clear it - keep it visible)
    const cropX = (crop.x / img.width) * img.width * scale + x;
    const cropY = (crop.y / img.height) * img.height * scale + y;
    const cropW = (crop.width / img.width) * img.width * scale;
    const cropH = (crop.height / img.height) * img.height * scale;

    // Clear crop area (make it fully transparent)
    ctx.clearRect(cropX, cropY, cropW, cropH);
    
    // Redraw image in crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    ctx.restore();

    // Draw crop border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.strokeRect(cropX, cropY, cropW, cropH);
    
    // Draw resize handles
    const handleSize = 12;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    // Corner handles
    [[cropX, cropY], [cropX + cropW, cropY], [cropX, cropY + cropH], [cropX + cropW, cropY + cropH]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
    });

    // Draw grid
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cropX + (cropW / 3) * i, cropY);
      ctx.lineTo(cropX + (cropW / 3) * i, cropY + cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + (cropH / 3) * i);
      ctx.lineTo(cropX + cropW, cropY + (cropH / 3) * i);
      ctx.stroke();
    }

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
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    
    const cropX = (crop.x / img.width) * img.width * scale + x;
    const cropY = (crop.y / img.height) * img.height * scale + y;
    const cropW = (crop.width / img.width) * img.width * scale;
    const cropH = (crop.height / img.height) * img.height * scale;
    
    const handleSize = 20;
    
    // Check for resize handles with larger hit area
    if (Math.abs(mouseX - cropX) < handleSize && Math.abs(mouseY - cropY) < handleSize) {
      setIsResizing(true);
      setResizeHandle('nw');
    } else if (Math.abs(mouseX - (cropX + cropW)) < handleSize && Math.abs(mouseY - cropY) < handleSize) {
      setIsResizing(true);
      setResizeHandle('ne');
    } else if (Math.abs(mouseX - cropX) < handleSize && Math.abs(mouseY - (cropY + cropH)) < handleSize) {
      setIsResizing(true);
      setResizeHandle('sw');
    } else if (Math.abs(mouseX - (cropX + cropW)) < handleSize && Math.abs(mouseY - (cropY + cropH)) < handleSize) {
      setIsResizing(true);
      setResizeHandle('se');
    } else if (mouseX >= cropX && mouseX <= cropX + cropW && mouseY >= cropY && mouseY <= cropY + cropH) {
      // Inside crop area - drag to move
      setIsDragging(true);
    }
    
    setDragStart({ x: mouseX, y: mouseY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    
    e.preventDefault();
    const { mouseX, mouseY } = getEventCoordinates(e);
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
    
    const dx = (mouseX - dragStart.x) / scale;
    const dy = (mouseY - dragStart.y) / scale;
    
    if (isResizing) {
      setCrop(prev => {
        let newCrop = { ...prev };
        
        if (resizeHandle.includes('n')) {
          const newY = Math.max(0, Math.min(prev.y + dy, prev.y + prev.height - 50));
          newCrop.height = prev.height + (prev.y - newY);
          newCrop.y = newY;
        }
        if (resizeHandle.includes('s')) {
          newCrop.height = Math.max(50, Math.min(img.height - prev.y, prev.height + dy));
        }
        if (resizeHandle.includes('w')) {
          const newX = Math.max(0, Math.min(prev.x + dx, prev.x + prev.width - 50));
          newCrop.width = prev.width + (prev.x - newX);
          newCrop.x = newX;
        }
        if (resizeHandle.includes('e')) {
          newCrop.width = Math.max(50, Math.min(img.width - prev.x, prev.width + dx));
        }
        
        return newCrop;
      });
      setDragStart({ x: mouseX, y: mouseY });
    } else if (isDragging) {
      setCrop(prev => ({
        ...prev,
        x: Math.max(0, Math.min(img.width - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(img.height - prev.height, prev.y + dy))
      }));
      setDragStart({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const getCroppedImage = () => {
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = crop.width;
    canvas.height = crop.height;

    // Apply rotation if needed
    if (rotation !== 0) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      tempCtx.translate(img.width / 2, img.height / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.translate(-img.width / 2, -img.height / 2);
      tempCtx.drawImage(img, 0, 0);
      ctx.drawImage(tempCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    } else {
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = () => {
    const croppedImage = getCroppedImage();
    onSave(croppedImage);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crop & Adjust Image</DialogTitle>
          <p className="text-sm text-stone-500">
            Drag to move • Drag corners to resize • Use sliders to zoom and rotate
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            ref={containerRef}
            className="relative bg-stone-900 rounded-lg overflow-hidden touch-none"
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
              className="w-full h-auto cursor-move"
              style={{ maxHeight: '500px' }}
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
                min={0.3}
                max={4}
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

          <div className="flex items-center justify-center gap-2 text-xs text-stone-500 bg-stone-50 rounded-lg p-2">
            <Crop className="w-4 h-4" />
            <span>Drag inside to move • Drag corners to resize • Free-form cropping enabled</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-amber-700 hover:bg-amber-800">
            <Check className="w-4 h-4 mr-2" />
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}