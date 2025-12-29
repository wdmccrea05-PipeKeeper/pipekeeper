import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageModal({ imageUrl, isOpen, onClose, alt = "Image" }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full p-0 bg-black/95 border-none">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[90vh]">
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}