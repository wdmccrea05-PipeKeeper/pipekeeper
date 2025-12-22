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
    canvas.width = 400;
    canvas.height = 400;

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

    // Draw transparent crop area (just reduce overlay opacity in this area)
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(cropX, cropY, cropW, cropH);

    // Draw crop border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);
    
    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = '#fff';
    ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropX + cropW - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropX - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropX + cropW - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    
    const cropX = (crop.x / img.width) * img.width * scale + x;
    const cropY = (crop.y / img.height) * img.height * scale + y;
    const cropW = (crop.width / img.width) * img.width * scale;
    const cropH = (crop.height / img.height) * img.height * scale;
    
    const handleSize = 10;
    
    // Check for resize handles
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
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = (mouseX - dragStart.x) / zoom;
    const dy = (mouseY - dragStart.y) / zoom;
    
    if (isResizing) {
      const img = imageRef.current;
      setCrop(prev => {
        let newCrop = { ...prev };
        
        if (resizeHandle.includes('n')) {
          newCrop.y = Math.max(0, Math.min(prev.y + dy, prev.y + prev.height - 50));
          newCrop.height = prev.height - (newCrop.y - prev.y);
        }
        if (resizeHandle.includes('s')) {
          newCrop.height = Math.max(50, Math.min(img.height - prev.y, prev.height + dy));
        }
        if (resizeHandle.includes('w')) {
          newCrop.x = Math.max(0, Math.min(prev.x + dx, prev.x + prev.width - 50));
          newCrop.width = prev.width - (newCrop.x - prev.x);
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
        x: Math.max(0, Math.min(imageRef.current.width - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(imageRef.current.height - prev.height, prev.y + dy))
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop & Adjust Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            ref={containerRef}
            className="relative bg-stone-100 rounded-lg overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-auto cursor-move"
              style={{ maxHeight: '400px' }}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ZoomIn className="w-4 h-4" />
                  Zoom
                </label>
                <span className="text-sm text-stone-500">{zoom.toFixed(1)}x</span>
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
                  <RotateCw className="w-4 h-4" />
                  Rotation
                </label>
                <span className="text-sm text-stone-500">{rotation}°</span>
              </div>
              <Slider
                value={[rotation]}
                onValueChange={([v]) => setRotation(v)}
                min={0}
                max={360}
                step={15}
                className="w-full"
              />
            </div>

            <p className="text-xs text-stone-500 text-center">
              Drag to move crop area • Drag corners to resize freely
            </p>
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