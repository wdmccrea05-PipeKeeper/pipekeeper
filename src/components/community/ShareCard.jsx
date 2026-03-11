import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { useTranslation } from '@/components/i18n/safeTranslation';

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

export default function ShareCard({ item, type, open, onClose }) {
  const { t } = useTranslation();
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
      
      toast.success(t('shareCard.downloadSuccess'));
    } catch (error) {
      toast.error(t('shareCard.downloadError'));
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
          text: type === 'pipe'
            ? t('shareCard.shareTextPipe', { name: item.name })
            : t('shareCard.shareTextTobacco', { name: item.name }),
        });
        toast.success(t('shareCard.shareSuccess'));
      } else {
        handleDownload();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error(t('shareCard.shareError'));
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shareCard.title')}</DialogTitle>
        </DialogHeader>

        <div ref={cardRef} className="relative overflow-hidden p-6 rounded-2xl" style={{
          background: "linear-gradient(150deg, #0d1822 0%, #141f2e 40%, #1a2d3f 80%, #1a2f40 100%)",
          border: "1px solid rgba(200,121,65,0.22)",
        }}>
          <div
            className="relative rounded-xl p-6"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(4px)",
            }}
          >
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
                  {type === 'pipe' ? t('shareCard.pipeType') : t('shareCard.tobaccoType')}
                </p>
              </div>
            </div>

            {/* Image */}
            {item.photos?.[0] ? (
              <div className="mb-4 rounded-lg overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                <img 
                  src={item.photos[0]} 
                  alt={item.name}
                  className="w-full h-56 object-cover"
                />
              </div>
            ) : item.photo ? (
              <div className="mb-4 rounded-lg overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                <img 
                  src={item.photo} 
                  alt={item.name}
                  className="w-full h-56 object-cover"
                />
              </div>
            ) : null}

            {/* Title */}
            <h3
              className="text-3xl font-extrabold text-[#F5F1E7] mb-2"
              style={{
                textShadow: "0 2px 12px rgba(0,0,0,0.65), 0 0 24px rgba(200,121,65,0.30)",
                lineHeight: "1.15",
              }}
            >
              {item.name}
            </h3>

            {/* Details */}
            <div className="space-y-1 text-sm text-[#E0D8C8]/70">
              {type === 'pipe' ? (
                <>
                  {item.maker && <p>{t('shareCard.makerLabel')} {item.maker}</p>}
                  {item.shape && <p>{t('shareCard.shapeLabel')} {item.shape}</p>}
                  {item.bowl_material && <p>{t('shareCard.materialLabel')} {item.bowl_material}</p>}
                </>
              ) : (
                <>
                  {item.manufacturer && <p>{t('shareCard.manufacturerLabel')} {item.manufacturer}</p>}
                  {item.blend_type && <p>{t('shareCard.blendLabel')} {item.blend_type}</p>}
                  {item.strength && <p>{t('shareCard.strengthLabel')} {item.strength}</p>}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-[#E0D8C8]/50 text-xs">
                {t('shareCard.sharedFrom')}
              </p>
              <div className="w-6 h-6 bg-white/10 rounded" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            {t('shareCard.download')}
          </Button>
          <Button onClick={handleShare} className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            {t('common.share')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}