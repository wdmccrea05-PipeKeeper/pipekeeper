import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Leaf, Share2, Search, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PipeIcon from '@/components/icons/PipeIcon';
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import BestPipesDrawer from '@/components/recommendations/BestPipesDrawer';
import TobaccoInventoryManager from '@/components/tobacco/TobaccoInventoryManager';
import CellarLog from '@/components/tobacco/CellarLog';
import { scorePipeBlend } from '@/components/utils/pairingScoreCanonical';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/components/utils/localeFormatters';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { toast } from 'sonner';

function DetailStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(180,140,75,0.16)' }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[rgba(180,140,75,0.12)] flex-shrink-0">
          <Icon className="w-3 h-3 text-[#B48C4B]" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-[#D8C7A6]/68 leading-tight">{label}</p>
      </div>
      <p className="text-sm font-semibold text-[#F5F1E7] break-words leading-snug">{value}</p>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarResult, setSimilarResult] = useState(null);
  const [similarError, setSimilarError] = useState(null);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);

  const [showBestPipes, setShowBestPipes] = useState(false);
  const [bestPipesLoading, setBestPipesLoading] = useState(false);
  const [bestPipesResults, setBestPipesResults] = useState(null);
  const [bestPipesError, setBestPipesError] = useState(null);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.TobaccoBlend.delete(blend.id);
      toast.success('Blend deleted');
      navigate(-1);
    } catch (e) {
      toast.error('Failed to delete blend');
      setDeleting(false);
    }
  };

  const handleBlendUpdate = async (updates) => {
    if (!blend) return;
    setIsUpdatingInventory(true);
    try {
      await base44.entities.TobaccoBlend.update(blend.id, updates);
      setBlend(prev => ({ ...prev, ...updates }));
      toast.success(t("inventory.saved") || "Inventory updated");
    } catch (e) {
      console.error('[TobaccoDetail] update failed', e);
      toast.error(t("errors.updateFailed") || "Failed to update inventory");
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  async function handleFindSimilar() {
    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);
    try {
      const allBlends = await base44.entities.TobaccoBlend.list('-updated_date', 200).catch(() => []);
      const allLogs = await base44.entities.SmokingLog.list('-date', 100).catch(() => []);
      const result = await runFindSimilar({
        recordType: 'blend',
        anchor: blend,
        context: { blends: allBlends || [], smokingLogs: allLogs || [] },
        mode: 'detail',
      });
      setSimilarResult(result);
    } catch (e) {
      setSimilarError(e?.message || 'Failed to find similar blends.');
    } finally {
      setSimilarLoading(false);
    }
  }

  async function handleBestPipes() {
    setShowBestPipes(true);
    setBestPipesLoading(true);
    setBestPipesError(null);
    setBestPipesResults(null);
    try {
      const me = await base44.auth.me();
      const pipes = await base44.entities.Pipe.filter({ created_by: me.email }, '-updated_date', 200).catch(() => []);
      const userProfile = null; // basic scoring without profile for now
      const scored = (pipes || [])
        .filter(p => !p.ai_excluded)
        .map(p => {
          const { score, why } = scorePipeBlend(p, blend, userProfile);
          return {
            pipe_id: p.id,
            pipe_name: p.name,
            maker: p.maker,
            shape: p.shape,
            bowl_material: p.bowl_material,
            score,
            why,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setBestPipesResults(scored);
    } catch (e) {
      setBestPipesError(e?.message || 'Failed to score pipes.');
    } finally {
      setBestPipesLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-[#F5F1E7]"><p>Loading blend…</p></div>;
  }

  if (!blend) {
    return <div className="p-6 text-[#F5F1E7]"><p>Unable to load record.</p></div>;
  }

  const mainPhoto = blend.logo || blend.photos?.[0];
  const totalOz = (Number(blend.tin_total_quantity_oz) || 0) + (Number(blend.bulk_total_quantity_oz) || 0) + (Number(blend.pouch_total_quantity_oz) || 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 text-[#F5F1E7]">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleBestPipes} style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}>
            <PipeIcon className="w-4 h-4 mr-2" color="#D4A574" />
            Best Pipes
          </Button>
          <Button onClick={handleFindSimilar} style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}>
            <Search className="w-4 h-4 mr-2" />
            Find Similar
          </Button>
          <Button variant="outline" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={() => navigate(`/Tobacco?edit=${encodeURIComponent(blend.id)}`)} style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))', color: '#fff' }}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" style={{ borderColor: 'rgba(180,80,80,0.4)', color: 'rgba(220,120,120,0.9)' }}>
            <Trash2 className="w-4 h-4" />
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
            <InlinePhotoEditor photos={blend.photos || []} maxPhotos={2} label="Photos" showLogoLibrary recordName={blend.name} onUpdate={async (updatedPhotos) => {
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

            <div className="grid grid-cols-2 gap-4">
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

      {blend && (
        <>
          <TobaccoInventoryManager 
            blend={blend} 
            onUpdate={handleBlendUpdate}
            isUpdating={isUpdatingInventory}
          />

          <CellarLog blend={blend} />
        </>
      )}

      <ShareRecordModal
        isOpen={showShareModal}
        onOpenChange={setShowShareModal}
        moduleType="tobacco"
        record={blend}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this blend?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete <strong>{blend?.name}</strong>. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} style={{ background: 'rgba(180,60,60,0.9)', color: '#fff' }}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SimilarItemsDrawer
        isOpen={showSimilar}
        onClose={() => setShowSimilar(false)}
        result={similarResult}
        loading={similarLoading}
        error={similarError}
        onRetry={handleFindSimilar}
        recordType="blend"
        anchorName={blend?.name}
      />

      <BestPipesDrawer
        isOpen={showBestPipes}
        onClose={() => setShowBestPipes(false)}
        results={bestPipesResults}
        loading={bestPipesLoading}
        error={bestPipesError}
        onRetry={handleBestPipes}
        anchorName={blend?.name}
      />
    </div>
  );
}