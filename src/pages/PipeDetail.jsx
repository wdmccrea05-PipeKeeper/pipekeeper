import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Share2, Search, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import PipeSpecialization from '@/components/pipes/PipeSpecialization';
import MaintenanceLog from '@/components/pipes/MaintenanceLog';
import PipeConditionTracker from '@/components/pipes/PipeConditionTracker';
import RotationPlanner from '@/components/pipes/RotationPlanner';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/localeFormatters';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import PipeShapeIcon from '@/components/pipes/PipeShapeIcon';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

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
  const { user, hasPremium: isPaidUser } = useCurrentUser();
  const [params] = useSearchParams();
  const pipeId = params.get('id') || params.get('pipeId');
  
  const [pipe, setPipe] = useState(null);
  const [blends, setBlends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarResult, setSimilarResult] = useState(null);
  const [similarError, setSimilarError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      if (!pipeId) {
        setLoading(false);
        return;
      }
      
      try {
        const [pipeRecord, blendsList] = await Promise.all([
          base44.entities.Pipe.get(pipeId),
          base44.entities.TobaccoBlend.filter({ created_by: user?.email }, '-updated_date', 500).catch(() => [])        ]);
        
        if (mounted) {
          setPipe(pipeRecord);
          setBlends(Array.isArray(blendsList) ? blendsList : []);
        }
      } catch (e) {
        console.error('[PipeDetail] failed to load data', e);
        if (mounted) setPipe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    loadData();
    return () => { mounted = false; };
  }, [pipeId, user?.email]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Pipe.delete(pipe.id);
      toast.success('Pipe deleted');
      navigate('/Pipes');

  const handlePipeUpdate = async (updates) => {
    if (!pipe) return;
    try {
      await base44.entities.Pipe.update(pipe.id, updates);
      setPipe(prev => ({ ...prev, ...updates }));
      toast.success(t("common.saved") || "Pipe updated");
    } catch (e) {
      console.error('[PipeDetail] update failed', e);
      toast.error(t("errors.updateFailed") || "Failed to update pipe");
    }
  };

  async function handleFindSimilar() {
    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);
    try {
      const allPipes = user?.email
        ? await base44.entities.Pipe.filter({ created_by: user.email }, '-updated_date', 200).catch(() => [])
        : [];
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

  const fmt2 = (v) => v != null && !isNaN(Number(v)) ? parseFloat(Number(v).toFixed(2)) : '—';

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
            <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" style={{ borderColor: 'rgba(180,80,80,0.4)', color: 'rgba(220,120,120,0.9)' }}>
              <Trash2 className="w-4 h-4" />
            </Button>
           </div>
      </div>

      {/* Tabbed functions card — top */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.18)', boxShadow: '0 14px 40px rgba(0,0,0,0.4)' }}>
        <Tabs defaultValue="condition" className="w-full">
          <div className="border-b border-[rgba(180,140,75,0.15)] px-2 pt-2 overflow-x-auto">
            <TabsList className="bg-transparent gap-0.5 flex-nowrap min-w-max">
              <TabsTrigger value="condition" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">Condition</TabsTrigger>
              <TabsTrigger value="rotation" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">Rotation</TabsTrigger>
              <TabsTrigger value="specialization" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">Specialization</TabsTrigger>
              <TabsTrigger value="maintenance" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">Maintenance</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="condition" className="p-4 m-0">
            <PipeConditionTracker pipe={pipe} onUpdate={handlePipeUpdate} />
          </TabsContent>
          <TabsContent value="rotation" className="p-4 m-0">
            <RotationPlanner pipe={pipe} blends={blends} />
          </TabsContent>
          <TabsContent value="specialization" className="p-4 m-0">
            <PipeSpecialization pipe={pipe} blends={blends} onUpdate={handlePipeUpdate} isPaidUser={isPaidUser} />
          </TabsContent>
          <TabsContent value="maintenance" className="p-4 m-0">
            <MaintenanceLog pipeId={pipe.id} pipeName={pipe.name} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Main info card — below */}
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
                  <p className="text-2xl font-semibold mt-2">{fmt2(pipe.length_mm)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Weight (g)</p>
                  <p className="text-2xl font-semibold mt-2">{fmt2(pipe.weight_grams)}</p>
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pipe?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete <strong>{pipe?.name}</strong>. This action cannot be undone.</AlertDialogDescription>
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
        recordType="pipe"
        anchorName={pipe?.name}
      />
    </div>
  );
}