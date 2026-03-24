import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Leaf, Share2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/components/utils/localeFormatters';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
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

export default function TobaccoDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const blendId = params.get('id') || params.get('blendId');
  
  const [blend, setBlend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    async function loadBlend() {
      if (!blendId) {
        setLoading(false);
        return;
      }
      
      try {
        const record = await base44.entities.TobaccoBlend.get(blendId);
        if (mounted) setBlend(record);
      } catch (e) {
        console.error('[TobaccoDetail] failed to load blend', e);
        if (mounted) setBlend(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    loadBlend();
    return () => { mounted = false; };
  }, [blendId]);

  if (loading) {
    return <div className="p-6 text-[#F5F1E7]"><p>Loading blend…</p></div>;
  }

  if (!blend) {
    return <div className="p-6 text-[#F5F1E7]"><p>Unable to load record.</p></div>;
  }

  const mainPhoto = blend.logo || blend.photos?.[0];
  const totalOz = (Number(blend.tin_total_quantity_oz) || 0) + (Number(blend.bulk_total_quantity_oz) || 0) + (Number(blend.pouch_total_quantity_oz) || 0);

  return (
    <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={() => navigate(-1)} style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))', color: '#fff' }}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.18)', boxShadow: '0 14px 40px rgba(0,0,0,0.4)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="p-6 flex flex-col items-center gap-4 border-r border-[rgba(180,140,75,0.12)]">
            {mainPhoto ? (
              <img src={mainPhoto} alt={blend.name} className="max-h-[440px] w-full object-contain" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }} />
            ) : (
              <div className="w-full h-[280px] rounded-2xl flex flex-col items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                <Leaf className="w-16 h-16" style={{ color: 'rgba(90,124,90,0.25)' }} />
                <p className="text-xs uppercase tracking-wider mt-2">No Photo</p>
              </div>
            )}
            <InlinePhotoEditor photos={blend.photos || []} maxPhotos={2} label="Photos" onUpdate={async (updatedPhotos) => {
              await base44.entities.TobaccoBlend.update(blend.id, { photos: updatedPhotos });
              setBlend((prev) => ({ ...prev, photos: updatedPhotos }));
            }} />
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight break-words" style={{ fontFamily: "'Georgia', serif" }}>
                {blend.name}
              </h1>
              <p className="text-base md:text-lg text-[#D8C7A6]/84 mt-3 break-words">
                {blend.manufacturer || 'Unknown Maker'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailStat label="Type" value={t(`blendTypes.${blend.blend_type}`, blend.blend_type) || '—'} icon={() => <Leaf className="w-4 h-4" />} />
              <DetailStat label="Strength" value={blend.strength || '—'} icon={() => <span className="text-[#B48C4B]">●</span>} />
              <DetailStat label="Cut" value={blend.cut || '—'} icon={() => <span className="text-[#B48C4B]">●</span>} />
              <DetailStat label="Rating" value={blend.rating ? `⭐ ${blend.rating}/5` : '—'} icon={() => <span className="text-[#B48C4B]">★</span>} />
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Total (oz)</p>
                  <p className="text-2xl font-semibold mt-2">{formatWeight(totalOz)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Tins Owned</p>
                  <p className="text-2xl font-semibold mt-2">{blend.tin_total_tins || 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Status</p>
                  <p className="text-2xl font-semibold mt-2">{blend.production_status ? blend.production_status.split(' ')[0] : '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Aging</p>
                  <p className="text-2xl font-semibold mt-2">{blend.aging_potential ? blend.aging_potential.split(' ')[0] : '—'}</p>
                </div>
              </div>
            </div>

            {(blend.flavor_notes && blend.flavor_notes.length > 0) && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
                <p className="text-sm font-semibold mb-3">Flavor Notes</p>
                <div className="flex flex-wrap gap-2">
                  {blend.flavor_notes.map((note, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-sm bg-[rgba(180,140,75,0.14)] border border-[rgba(180,140,75,0.2)]">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {blend.notes && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
                <p className="text-sm font-semibold mb-2">Notes</p>
                <p className="text-[#E0D8C8]/80 whitespace-pre-wrap">{blend.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareRecordModal
        isOpen={showShareModal}
        onOpenChange={setShowShareModal}
        moduleType="tobacco"
        record={blend}
      />
    </div>
  );
}