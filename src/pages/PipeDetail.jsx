import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Share2, Search } from 'lucide-react';
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/localeFormatters';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import PipeShapeIcon from '@/components/pipes/PipeShapeIcon';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { useTranslation } from '@/components/i18n/safeTranslation';

function DetailStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(180,140,75,0.16)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(180,140,75,0.12)] border border-[rgba(180,140,75,0.2)]">
          <Icon className="w-4 h-4 text-[#B48C4B]" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{label}</p>
          <p className="text-lg font-semibold text-[#F5F1E7] mt-1 break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function PipeDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pipeId = params.get('id') || params.get('pipeId');
  
  const [pipe, setPipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarResult, setSimilarResult] = useState(null);
  const [similarError, setSimilarError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadPipe() {
      if (!pipeId) {
        setLoading(false);
        return;
      }
      
      try {
        const record = await base44.entities.Pipe.get(pipeId);
        if (mounted) setPipe(record);
      } catch (e) {
        console.error('[PipeDetail] failed to load pipe', e);
        if (mounted) setPipe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    loadPipe();
    return () => { mounted = false; };
  }, [pipeId]);

  async function handleFindSimilar() {
    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);
    try {
      const allPipes = await base44.entities.Pipe.list('-updated_date', 200).catch(() => []);
      const result = await runFindSimilar({
        recordType: 'pipe',
        anchor: pipe,
        context: { pipes: allPipes || [] },
        mode: 'detail',
      });
      setSimilarResult(result);
    } catch (e) {
      setSimilarError(e?.message || 'Failed to find similar pipes.');
    } finally {
      setSimilarLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-[#F5F1E7]"><p>Loading pipe…</p></div>;
  }

  if (!pipe) {
    return <div className="p-6 text-[#F5F1E7]"><p>Unable to load record.</p></div>;
  }

  const mainPhoto = pipe.photos?.[0];

  return (
    <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
      <div className="flex items-center justify-between gap-3">
         <Button variant="outline" onClick={() => navigate(-1)}>
           <ArrowLeft className="w-4 h-4 mr-2" />
           Back
         </Button>
         <div className="flex gap-2">
           <Button onClick={handleFindSimilar} style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}>
             <Search className="w-4 h-4 mr-2" />
             Find Similar
           </Button>
           <Button onClick={() => setShowShareModal(true)} style={{ background: 'rgba(180, 140, 75, 0.2)', border: '1px solid rgba(180, 140, 75, 0.35)', color: '#F5F1E7' }}>
             <Share2 className="w-4 h-4 mr-2" />
             Share
           </Button>
           <Button onClick={() => navigate(`/Pipes?edit=${encodeURIComponent(pipe.id)}`)} style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))', color: '#fff' }}>
             <Pencil className="w-4 h-4 mr-2" />
             Edit
           </Button>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.18)', boxShadow: '0 14px 40px rgba(0,0,0,0.4)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="p-6 flex flex-col items-center gap-4 border-r border-[rgba(180,140,75,0.12)]">
            {mainPhoto ? (
              <img src={mainPhoto} alt={pipe.name} className="max-h-[440px] w-full object-contain" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }} />
            ) : (
              <div className="w-full h-[280px] rounded-2xl flex flex-col items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                <PipeShapeIcon shape={pipe.shape} className="w-16 h-16" style={{ color: 'rgba(180,140,75,0.3)' }} />
                <p className="text-xs uppercase tracking-wider mt-2">{pipe.shape || 'No Photo'}</p>
              </div>
            )}
            <InlinePhotoEditor photos={pipe.photos || []} maxPhotos={5} label="Photos" onUpdate={async (updatedPhotos) => {
              await base44.entities.Pipe.update(pipe.id, { photos: updatedPhotos });
              setPipe((prev) => ({ ...prev, photos: updatedPhotos }));
            }} />
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight break-words" style={{ fontFamily: "'Georgia', serif" }}>
                {pipe.name}
              </h1>
              <p className="text-base md:text-lg text-[#D8C7A6]/84 mt-3 break-words">
                {[pipe.maker, pipe.country_of_origin].filter(Boolean).join(' • ')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailStat label="Shape" value={t(`shapes.${pipe.shape}`, pipe.shape) || '—'} icon={() => <PipeShapeIcon shape={pipe.shape} className="w-4 h-4" />} />
              <DetailStat label="Material" value={pipe.bowl_material || '—'} icon={() => <span className="text-[#B48C4B]">●</span>} />
              <DetailStat label="Finish" value={pipe.finish || '—'} icon={() => <span className="text-[#B48C4B]">●</span>} />
              <DetailStat label="Estimated Value" value={pipe.estimated_value ? formatCurrency(+pipe.estimated_value) : '—'} icon={() => <span className="text-[#B48C4B]">$</span>} />
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Size</p>
                  <p className="text-2xl font-semibold mt-2">{pipe.sizeClass || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Length (mm)</p>
                  <p className="text-2xl font-semibold mt-2">{pipe.length_mm || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Weight (g)</p>
                  <p className="text-2xl font-semibold mt-2">{pipe.weight_grams || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Condition</p>
                  <p className="text-2xl font-semibold mt-2">{pipe.condition ? pipe.condition.split('-').pop() : '—'}</p>
                </div>
              </div>
            </div>

            {pipe.notes && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
                <p className="text-sm font-semibold mb-2">Notes</p>
                <p className="text-[#E0D8C8]/80 whitespace-pre-wrap">{pipe.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareRecordModal
        isOpen={showShareModal}
        onOpenChange={setShowShareModal}
        moduleType="pipe"
        record={pipe}
      />

      <SimilarItemsDrawer
        isOpen={showSimilar}
        onClose={() => setShowSimilar(false)}
        result={similarResult}
        loading={similarLoading}
        error={similarError}
        onRetry={handleFindSimilar}
        recordType="pipe"
        anchorName={pipe?.name}
      />
    </div>
  );
}