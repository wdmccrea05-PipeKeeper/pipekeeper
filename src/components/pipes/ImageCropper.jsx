import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crop, RotateCw, ZoomIn, Check, X, Lock, Unlock, Grid3x3, RefreshCw, Maximize2 } from "lucide-react";

export default function ImageCropper({ imageUrl, onSave, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const initialCropRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Center crop on image - 16:9 ratio as default (matches final display)
      const targetRatio = 16/9;
      let width, height;
      
      // Fit to image while maintaining 16:9
      if (img.width / img.height > targetRatio) {
        // Image is wider than 16:9
        height = img.height * 0.9;
        width = height * targetRatio;
      } else {
        // Image is taller than 16:9
        width = img.width * 0.9;
        height = width / targetRatio;
      }
      
      const initialCrop = {
        x: (img.width - width) / 2,
        y: (img.height - height) / 2,
        width: width,
        height: height
      };
      setCrop(initialCrop);
      initialCropRef.current = initialCrop;
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

    // Set canvas size to maintain aspect ratio
    const maxDimension = 600;
    const aspectRatio = img.width / img.height;
    
    if (aspectRatio > 1) {
      // Landscape
      canvas.width = maxDimension;
      canvas.height = maxDimension / aspectRatio;
    } else {
      // Portrait or square
      canvas.height = maxDimension;
      canvas.width = maxDimension * aspectRatio;
    }

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

    // Draw grid (rule of thirds)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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
    }
    
    // Draw edge midpoint handles
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    const midHandleSize = 10;
    
    [[cropX + cropW/2, cropY], [cropX + cropW/2, cropY + cropH], 
     [cropX, cropY + cropH/2], [cropX + cropW, cropY + cropH/2]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - midHandleSize/2, hy - midHandleSize/2, midHandleSize, midHandleSize);
      ctx.strokeRect(hx - midHandleSize/2, hy - midHandleSize/2, midHandleSize, midHandleSize);
    });

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
    // Corners
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
    }
    // Edge midpoints
    else if (Math.abs(mouseX - (cropX + cropW/2)) < handleSize && Math.abs(mouseY - cropY) < handleSize) {
      setIsResizing(true);
      setResizeHandle('n');
    } else if (Math.abs(mouseX - (cropX + cropW/2)) < handleSize && Math.abs(mouseY - (cropY + cropH)) < handleSize) {
      setIsResizing(true);
      setResizeHandle('s');
    } else if (Math.abs(mouseX - cropX) < handleSize && Math.abs(mouseY - (cropY + cropH/2)) < handleSize) {
      setIsResizing(true);
      setResizeHandle('w');
    } else if (Math.abs(mouseX - (cropX + cropW)) < handleSize && Math.abs(mouseY - (cropY + cropH/2)) < handleSize) {
      setIsResizing(true);
      setResizeHandle('e');
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
        const aspectRatio = prev.width / prev.height;
        
        if (resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw' || resizeHandle === 'se') {
          // Corner resize
          if (resizeHandle.includes('n')) {
            const newY = Math.max(0, Math.min(prev.y + dy, prev.y + prev.height - 50));
            newCrop.height = prev.height + (prev.y - newY);
            newCrop.y = newY;
            if (aspectRatioLocked) {
              newCrop.width = newCrop.height * aspectRatio;
              if (resizeHandle.includes('e')) {
                // Keep left edge fixed
              } else {
                // Keep right edge fixed, adjust x
                newCrop.x = prev.x + prev.width - newCrop.width;
              }
            }
          }
          if (resizeHandle.includes('s') && !resizeHandle.includes('n')) {
            newCrop.height = Math.max(50, Math.min(img.height - prev.y, prev.height + dy));
            if (aspectRatioLocked) {
              newCrop.width = newCrop.height * aspectRatio;
              if (resizeHandle.includes('e')) {
                // Keep left edge fixed
              } else {
                // Keep right edge fixed, adjust x
                newCrop.x = prev.x + prev.width - newCrop.width;
              }
            }
          }
          if (resizeHandle.includes('w') && !aspectRatioLocked) {
            const newX = Math.max(0, Math.min(prev.x + dx, prev.x + prev.width - 50));
            newCrop.width = prev.width + (prev.x - newX);
            newCrop.x = newX;
          }
          if (resizeHandle.includes('e') && !aspectRatioLocked) {
            newCrop.width = Math.max(50, Math.min(img.width - prev.x, prev.width + dx));
          }
        } else {
          // Edge resize
          if (resizeHandle === 'n') {
            const newY = Math.max(0, Math.min(prev.y + dy, prev.y + prev.height - 50));
            newCrop.height = prev.height + (prev.y - newY);
            newCrop.y = newY;
            if (aspectRatioLocked) {
              newCrop.width = newCrop.height * aspectRatio;
              newCrop.x = prev.x + (prev.width - newCrop.width) / 2;
            }
          } else if (resizeHandle === 's') {
            newCrop.height = Math.max(50, Math.min(img.height - prev.y, prev.height + dy));
            if (aspectRatioLocked) {
              newCrop.width = newCrop.height * aspectRatio;
              newCrop.x = prev.x + (prev.width - newCrop.width) / 2;
            }
          } else if (resizeHandle === 'w') {
            const newX = Math.max(0, Math.min(prev.x + dx, prev.x + prev.width - 50));
            newCrop.width = prev.width + (prev.x - newX);
            newCrop.x = newX;
            if (aspectRatioLocked) {
              newCrop.height = newCrop.width / aspectRatio;
              newCrop.y = prev.y + (prev.height - newCrop.height) / 2;
            }
          } else if (resizeHandle === 'e') {
            newCrop.width = Math.max(50, Math.min(img.width - prev.x, prev.width + dx));
            if (aspectRatioLocked) {
              newCrop.height = newCrop.width / aspectRatio;
              newCrop.y = prev.y + (prev.height - newCrop.height) / 2;
            }
          }
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
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');

    // Set output canvas to match crop dimensions (preserves aspect ratio)
    outputCanvas.width = crop.width;
    outputCanvas.height = crop.height;

    // Apply rotation if needed
    if (rotation !== 0) {
      const rotatedCanvas = document.createElement('canvas');
      const rotatedCtx = rotatedCanvas.getContext('2d');
      
      // Calculate rotated dimensions
      const rad = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      rotatedCanvas.width = img.width * cos + img.height * sin;
      rotatedCanvas.height = img.width * sin + img.height * cos;
      
      // Rotate and draw image
      rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rotatedCtx.rotate(rad);
      rotatedCtx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Crop from rotated image - extract exact pixels without scaling
      outputCtx.drawImage(
        rotatedCanvas,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );
    } else {
      // Direct crop without rotation - extract exact pixels
      outputCtx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );
    }

    return outputCanvas.toDataURL('image/jpeg', 0.95);
  };

  const handleSave = () => {
    const croppedImage = getCroppedImage();
    onSave(croppedImage);
  };

  const setPresetRatio = (ratio) => {
    const centerX = crop.x + crop.width / 2;
    const centerY = crop.y + crop.height / 2;
    const newWidth = Math.min(crop.width, imageRef.current.width * 0.8);
    const newHeight = newWidth / ratio;
    setCrop({
      x: Math.max(0, centerX - newWidth / 2),
      y: Math.max(0, centerY - newHeight / 2),
      width: newWidth,
      height: newHeight,
    });
  };

  const resetCrop = () => {
    if (initialCropRef.current) {
      setCrop(initialCropRef.current);
    }
  };

  const fitToCanvas = () => {
    const img = imageRef.current;
    if (!img) return;
    const width = img.width * 0.95;
    const height = img.height * 0.95;
    setCrop({
      x: (img.width - width) / 2,
      y: (img.height - height) / 2,
      width,
      height
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-full sm:max-w-3xl max-h-[95vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>Crop & Adjust Image</DialogTitle>
          <p className="text-xs sm:text-sm text-stone-500">
            Drag to move • Drag corners to resize • Use sliders to zoom and rotate
          </p>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
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
              className="w-full h-auto cursor-move max-h-[50vh] sm:max-h-[500px]"
            />
          </div>

          {/* Preset Ratios */}
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
            <Button type="button" variant="outline" size="sm" onClick={() => setPresetRatio(16/9)} className="bg-amber-50 text-xs sm:text-sm px-2 sm:px-3">
              16:9
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPresetRatio(4/3)} className="text-xs sm:text-sm px-2 sm:px-3">
              4:3
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPresetRatio(1)} className="text-xs sm:text-sm px-2 sm:px-3">
              Square
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={fitToCanvas} className="text-xs sm:text-sm px-2 sm:px-3">
              <Maximize2 className="w-3 h-3 mr-1" />
              Max
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetCrop} className="text-xs sm:text-sm px-2 sm:px-3">
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                step={0.05}
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

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-stone-50 rounded-lg text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Switch
                checked={aspectRatioLocked}
                onCheckedChange={setAspectRatioLocked}
              />
              <label className="font-medium flex items-center gap-1 cursor-pointer" onClick={() => setAspectRatioLocked(!aspectRatioLocked)}>
                {aspectRatioLocked ? <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" /> : <Unlock className="w-3 h-3 sm:w-4 sm:h-4 text-stone-400" />}
                <span className="hidden sm:inline">Lock Ratio</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showGrid}
                onCheckedChange={setShowGrid}
              />
              <label className="font-medium flex items-center gap-1 cursor-pointer" onClick={() => setShowGrid(!showGrid)}>
                <Grid3x3 className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                <span className="hidden sm:inline">Grid</span>
              </label>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-2 text-xs text-stone-500">
            <Crop className="w-4 h-4" />
            <span>Drag to move • Drag handles to resize • {aspectRatioLocked ? 'Aspect locked' : 'Free-form'}</span>
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