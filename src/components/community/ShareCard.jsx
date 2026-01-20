import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

export default function ShareCard({ item, type, open, onClose }) {
  const cardRef = useRef(null);

  const handleDownload = async () => {
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#1A2B3A',
        scale: 2,
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.name}-share-card.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Share card downloaded');
    } catch (error) {
      toast.error('Failed to generate share card');
    }
  };

  const handleShare = async () => {
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#1A2B3A',
        scale: 2,
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `${item.name}-share-card.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${item.name} - PipeKeeper`,
          text: type === 'pipe' ? `Check out my ${item.name} pipe` : `Check out ${item.name} tobacco`,
        });
        toast.success('Shared successfully');
      } else {
        handleDownload();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Card</DialogTitle>
        </DialogHeader>

        <div ref={cardRef} className="bg-gradient-to-br from-[#1A2B3A] to-[#243548] p-6 rounded-2xl">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              {type === 'pipe' ? (
                <img src={PIPE_ICON} alt="" className="w-8 h-8 opacity-70" />
              ) : item.logo ? (
                <img src={item.logo} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 bg-white/10 rounded-full" />
              )}
              <div>
                <p className="text-[#E0D8C8]/50 text-xs uppercase tracking-wider">
                  {type === 'pipe' ? 'Pipe' : 'Tobacco'}
                </p>
              </div>
            </div>

            {/* Image */}
            {item.photos?.[0] ? (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img 
                  src={item.photos[0]} 
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
              </div>
            ) : item.photo ? (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img 
                  src={item.photo} 
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
              </div>
            ) : null}

            {/* Title */}
            <h3 className="text-2xl font-bold text-[#E0D8C8] mb-2">{item.name}</h3>

            {/* Details */}
            <div className="space-y-1 text-sm text-[#E0D8C8]/70">
              {type === 'pipe' ? (
                <>
                  {item.maker && <p>Maker: {item.maker}</p>}
                  {item.shape && <p>Shape: {item.shape}</p>}
                  {item.bowl_material && <p>Material: {item.bowl_material}</p>}
                </>
              ) : (
                <>
                  {item.manufacturer && <p>Manufacturer: {item.manufacturer}</p>}
                  {item.blend_type && <p>Blend: {item.blend_type}</p>}
                  {item.strength && <p>Strength: {item.strength}</p>}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-[#E0D8C8]/50 text-xs">
                Shared from PipeKeeper
              </p>
              <div className="w-6 h-6 bg-white/10 rounded" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleShare} className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}