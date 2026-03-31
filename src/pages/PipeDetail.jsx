import React, { useEffect, useMemo, useState } from 'react';
import { useMeasurement } from '@/components/utils/measurementConversion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Share2,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Ruler,
  CircleDollarSign,
  Info,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { scopedEntities } from '@/components/api/scopedEntities';

function DetailStat({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.16)',
      }}
    >
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

function MetaRow({ label, value }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,140,75,0.12)',
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#D8C7A6]/60">{label}</p>
      <p className="text-sm md:text-base font-medium text-[#F5F1E7] mt-1 break-words">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,140,75,0.14)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon ? <Icon className="w-4 h-4 text-[#D4A574]" /> : null}
        <p className="text-sm font-semibold text-[#F5F1E7]">{title}</p>
      </div>
      {children}
    </div>
  );
}

function firstPresent(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function showText(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function showBool(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

export default function PipeDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasPremium: isPaidUser } = useCurrentUser();
  const { formatLength, formatWeight } = useMeasurement();
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
  const [detailCardOpen, setDetailCardOpen] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!pipeId || !user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // getForUser uses filter({ id, created_by }) — explicit and ownership-scoped
        // fallback to direct .get() in case filter-by-id behaves unexpectedly
        let pipeRecord = await scopedEntities.Pipe.getForUser(user.email, pipeId).catch(() => null);
        if (!pipeRecord) {
          // Fallback: direct primary key lookup, then verify ownership
          const direct = await base44.entities.Pipe.get(pipeId).catch(() => null);
          if (direct && direct.created_by === user.email) {
            pipeRecord = direct;
          }
        }

        const blendsList = await scopedEntities.TobaccoBlend.listForUser(user.email, '-updated_date', 500).catch(() => []);

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
    return () => {
      mounted = false;
    };
  }, [pipeId, user?.email]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Pipe.delete(pipe.id);
      toast.success('Pipe deleted');
      navigate('/Pipes');
    } catch (e) {
      toast.error('Failed to delete pipe');
      setDeleting(false);
    }
  };

  const handlePipeUpdate = async (updates) => {
    if (!pipe) return;
    try {
      await base44.entities.Pipe.update(pipe.id, updates);
      // Re-fetch: try getForUser first, fallback to direct get
      let fresh = await scopedEntities.Pipe.getForUser(user?.email, pipe.id).catch(() => null);
      if (!fresh) {
        const direct = await base44.entities.Pipe.get(pipe.id).catch(() => null);
        if (direct && direct.created_by === user?.email) fresh = direct;
      }
      setPipe(fresh || ((prev) => ({ ...prev, ...updates })));
      toast.success(t('common.saved') || 'Pipe updated');
    } catch (e) {
      console.error('[PipeDetail] update failed', e);
      toast.error(t('errors.updateFailed') || 'Failed to update pipe');
    }
  };

  async function handleFindSimilar() {
    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);

    try {
      const allPipes = user?.email
        ? await base44.entities.Pipe
            .filter({ created_by: user.email }, '-updated_date', 200)
            .catch(() => [])
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

  const normalized = useMemo(() => {
    if (!pipe) return null;

    return {
      ...pipe,
      // Geometry
      sizeClass: firstPresent(pipe, ['sizeClass', 'size_class']),
      bowlStyle: firstPresent(pipe, ['bowlStyle', 'bowl_style']),
      shankShape: firstPresent(pipe, ['shankShape', 'shank_shape']),
      // Measurements
      lengthValue: firstPresent(pipe, ['length_mm', 'length', 'lengthMm']),
      weightValue: firstPresent(pipe, ['weight_grams', 'weight', 'weightGrams']),
      bowlHeightValue: firstPresent(pipe, ['bowl_height_mm', 'bowlHeight', 'bowlHeightMm']),
      bowlWidthValue: firstPresent(pipe, ['bowl_width_mm', 'bowlWidth', 'bowlWidthMm']),
      bowlDiameterValue: firstPresent(pipe, ['bowl_diameter_mm', 'bowlDiameter', 'bowlDiameterMm', 'chamber_diameter_mm']),
      bowlDepthValue: firstPresent(pipe, ['bowl_depth_mm', 'bowlDepth', 'bowlDepthMm', 'chamber_depth_mm']),
      // Physical characteristics (snake_case → camelCase)
      bowlMaterial: firstPresent(pipe, ['bowl_material', 'bowlMaterial']),
      stemMaterial: firstPresent(pipe, ['stem_material', 'stemMaterial']),
      filterType: firstPresent(pipe, ['filter_type', 'filterType']),
      chamberVolume: firstPresent(pipe, ['chamber_volume', 'chamberVolume']),
      countryOfOrigin: firstPresent(pipe, ['country_of_origin', 'countryOfOrigin']),
      // Value & meta
      purchasePrice: firstPresent(pipe, ['purchase_price', 'purchasePrice']),
      estimatedValue: firstPresent(pipe, ['estimated_value', 'estimatedValue']),
      favorite: firstPresent(pipe, ['is_favorite', 'favorite']),
      smokingCharacteristics: firstPresent(pipe, ['usage_characteristics', 'smoking_characteristics', 'smokingCharacteristics', 'usageCharacteristics']),
      includedInAi: firstPresent(pipe, ['included_in_ai', 'includedInAi']) ??
        (pipe?.ai_excluded != null ? !pipe.ai_excluded : null),
      collectibleOnly: firstPresent(pipe, ['collectible_only', 'collectibleOnly', 'ai_excluded']),
    };
  }, [pipe]);

  if (loading) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Loading pipe…</p>
      </div>
    );
  }

  if (!pipe || !normalized) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Unable to load record.</p>
      </div>
    );
  }

  const mainPhoto = pipe.photos?.[0];

  const money = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && value !== '' && value != null ? formatCurrency(num) : '—';
  };

  const conditionSummary = normalized.condition
    ? String(normalized.condition).split('-').pop()?.trim() || String(normalized.condition)
    : '—';

  return (
    <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={handleFindSimilar}
            style={{
              background: 'rgba(180,140,75,0.15)',
              border: '1px solid rgba(180,140,75,0.3)',
              color: '#D4A574',
            }}
          >
            <Search className="w-4 h-4 mr-2" />
            Find Similar
          </Button>

          <Button
            onClick={() => setShowShareModal(true)}
            style={{
              background: 'rgba(180, 140, 75, 0.2)',
              border: '1px solid rgba(180, 140, 75, 0.35)',
              color: '#F5F1E7',
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>

          <Button
            onClick={() => navigate(`/Pipes?edit=${encodeURIComponent(pipe.id)}`)}
            style={{
              background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))',
              color: '#fff',
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>

          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            style={{
              borderColor: 'rgba(180,80,80,0.4)',
              color: 'rgba(220,120,120,0.9)',
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))',
          border: '1px solid rgba(180,140,75,0.18)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="px-6 py-5 border-b border-[rgba(180,140,75,0.15)]">
          <p className="text-2xl font-semibold text-[#F5F1E7]">Pipe Snapshot</p>
          <p className="text-sm text-[#D8C7A6]/70 mt-1">Quick overview of the pipe record</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="p-6 flex flex-col items-center gap-4 border-r border-[rgba(180,140,75,0.12)]">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={pipe.name}
                className="max-h-[440px] w-full object-contain"
                style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }}
              />
            ) : (
              <div className="w-full h-[280px] rounded-2xl flex flex-col items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                <PipeShapeIcon
                  shape={pipe.shape}
                  className="w-16 h-16"
                  style={{ color: 'rgba(180,140,75,0.3)' }}
                />
                <p className="text-xs uppercase tracking-wider mt-2">{pipe.shape || 'No Photo'}</p>
              </div>
            )}

            <InlinePhotoEditor
              photos={pipe.photos || []}
              maxPhotos={5}
              label="Photos"
              onUpdate={async (updatedPhotos) => {
                await base44.entities.Pipe.update(pipe.id, { photos: updatedPhotos });
                setPipe((prev) => ({ ...prev, photos: updatedPhotos }));
              }}
            />
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1
                className="text-3xl md:text-5xl font-bold leading-tight break-words"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                {pipe.name}
              </h1>
              <p className="text-base md:text-lg text-[#D8C7A6]/84 mt-3 break-words">
                {[normalized.maker, normalized.countryOfOrigin].filter(Boolean).join(' • ')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailStat
                label="Shape"
                value={t(`shapes.${normalized.shape}`, normalized.shape) || '—'}
                icon={() => <PipeShapeIcon shape={normalized.shape} className="w-4 h-4" />}
              />
              <DetailStat
                label="Material"
                value={normalized.bowlMaterial || '—'}
                icon={() => <span className="text-[#B48C4B]">●</span>}
              />
              <DetailStat
                label="Finish"
                value={normalized.finish || '—'}
                icon={() => <span className="text-[#B48C4B]">●</span>}
              />
              <DetailStat
                label="Estimated Value"
                value={money(normalized.estimatedValue)}
                icon={() => <CircleDollarSign className="w-4 h-4 text-[#B48C4B]" />}
              />
            </div>

            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(180,140,75,0.14)',
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Size</p>
                  <p className="text-2xl font-semibold mt-2">{normalized.sizeClass || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Length</p>
                  <p className="text-2xl font-semibold mt-2">
                    {normalized.lengthValue != null ? (formatLength(Number(normalized.lengthValue)) || `${normalized.lengthValue} mm`) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Weight</p>
                  <p className="text-2xl font-semibold mt-2">
                    {normalized.weightValue != null ? (formatWeight(Number(normalized.weightValue)) || `${normalized.weightValue} g`) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Condition</p>
                  <p className="text-2xl font-semibold mt-2">{conditionSummary}</p>
                </div>
              </div>
              {(normalized.bowlHeightValue != null || normalized.bowlWidthValue != null || normalized.bowlDiameterValue != null || normalized.bowlDepthValue != null) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[rgba(180,140,75,0.12)]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Bowl Height</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlHeightValue != null ? (formatLength(Number(normalized.bowlHeightValue)) || `${normalized.bowlHeightValue} mm`) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Bowl Width</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlWidthValue != null ? (formatLength(Number(normalized.bowlWidthValue)) || `${normalized.bowlWidthValue} mm`) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Bowl Diameter</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlDiameterValue != null ? (formatLength(Number(normalized.bowlDiameterValue)) || `${normalized.bowlDiameterValue} mm`) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Bowl Depth</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlDepthValue != null ? (formatLength(Number(normalized.bowlDepthValue)) || `${normalized.bowlDepthValue} mm`) : '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {pipe.notes && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,140,75,0.14)',
                }}
              >
                <p className="text-sm font-semibold mb-2">Notes</p>
                <p className="text-[#E0D8C8]/80 whitespace-pre-wrap">{pipe.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))',
          border: '1px solid rgba(180,140,75,0.18)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.4)',
        }}
      >
        <button
          type="button"
          onClick={() => setDetailCardOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-[rgba(180,140,75,0.15)] text-left"
        >
          <div>
            <p className="text-lg font-semibold text-[#F5F1E7]">Pipe Functions & Details</p>
            <p className="text-sm text-[#D8C7A6]/70 mt-1">
              Condition, rotation, specialization, maintenance, and full record details
            </p>
          </div>
          <div className="flex items-center gap-2 text-[#D4A574]">
            <span className="text-xs uppercase tracking-[0.14em]">
              {detailCardOpen ? 'Hide' : 'Show'}
            </span>
            {detailCardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {detailCardOpen && (
          <Tabs defaultValue="condition" className="w-full">
            <div className="border-b border-[rgba(180,140,75,0.15)] px-2 pt-2 overflow-x-auto">
              <TabsList className="bg-transparent gap-0.5 flex-nowrap min-w-max">
                <TabsTrigger value="condition" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  Condition
                </TabsTrigger>
                <TabsTrigger value="rotation" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  Rotation
                </TabsTrigger>
                <TabsTrigger value="specialization" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  Specialization
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  Maintenance
                </TabsTrigger>
                <TabsTrigger value="details" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  Details
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="condition" className="p-4 m-0">
              <PipeConditionTracker pipe={pipe} onUpdate={handlePipeUpdate} />
            </TabsContent>

            <TabsContent value="rotation" className="p-4 m-0">
              <RotationPlanner pipe={pipe} blends={blends} />
            </TabsContent>

            <TabsContent value="specialization" className="p-4 m-0">
              <PipeSpecialization
                pipe={pipe}
                blends={blends}
                onUpdate={handlePipeUpdate}
                isPaidUser={isPaidUser}
              />
            </TabsContent>

            <TabsContent value="maintenance" className="p-4 m-0">
              <MaintenanceLog pipeId={pipe.id} pipeName={pipe.name} />
            </TabsContent>

            <TabsContent value="details" className="p-4 md:p-5 m-0">
              <div className="space-y-4">
                <SectionCard title="Pipe Geometry" icon={Info}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <MetaRow label="Shape" value={showText(normalized.shape)} />
                    <MetaRow label="Bowl Style" value={showText(normalized.bowlStyle)} />
                    <MetaRow label="Shank Shape" value={showText(normalized.shankShape)} />
                    <MetaRow label="Bend" value={showText(normalized.bend)} />
                    <MetaRow label="Size Class" value={showText(normalized.sizeClass)} />
                    <MetaRow label="Chamber Volume" value={showText(normalized.chamberVolume)} />
                  </div>
                </SectionCard>

                <SectionCard title="Physical Characteristics" icon={Info}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <MetaRow label="Bowl Material" value={showText(normalized.bowlMaterial)} />
                    <MetaRow label="Stem Material" value={showText(normalized.stemMaterial)} />
                    <MetaRow label="Finish" value={showText(normalized.finish)} />
                    <MetaRow label="Filter Type" value={showText(normalized.filterType)} />
                    <MetaRow label="Country of Origin" value={showText(normalized.countryOfOrigin)} />
                    <MetaRow label="Maker" value={showText(normalized.maker)} />
                  </div>
                </SectionCard>

                <SectionCard title="Measurements" icon={Ruler}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <MetaRow label="Length" value={normalized.lengthValue != null ? (formatLength(Number(normalized.lengthValue)) || `${normalized.lengthValue} mm`) : '—'} />
                    <MetaRow label="Weight" value={normalized.weightValue != null ? (formatWeight(Number(normalized.weightValue)) || `${normalized.weightValue} g`) : '—'} />
                    <MetaRow label="Bowl Height" value={normalized.bowlHeightValue != null ? (formatLength(Number(normalized.bowlHeightValue)) || `${normalized.bowlHeightValue} mm`) : '—'} />
                    <MetaRow label="Bowl Width" value={normalized.bowlWidthValue != null ? (formatLength(Number(normalized.bowlWidthValue)) || `${normalized.bowlWidthValue} mm`) : '—'} />
                    <MetaRow label="Bowl Diameter" value={normalized.bowlDiameterValue != null ? (formatLength(Number(normalized.bowlDiameterValue)) || `${normalized.bowlDiameterValue} mm`) : '—'} />
                    <MetaRow label="Bowl Depth" value={normalized.bowlDepthValue != null ? (formatLength(Number(normalized.bowlDepthValue)) || `${normalized.bowlDepthValue} mm`) : '—'} />
                  </div>
                </SectionCard>

                <SectionCard title="Value & Notes" icon={CircleDollarSign}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <MetaRow label="Purchase Price" value={money(normalized.purchasePrice)} />
                    <MetaRow label="Estimated Value" value={money(normalized.estimatedValue)} />
                    <MetaRow label="Favorite" value={showBool(normalized.favorite)} />
                    <MetaRow label="Collectible Only" value={showBool(normalized.collectibleOnly)} />
                    <MetaRow label="Included in AI" value={showBool(normalized.includedInAi)} />
                    <MetaRow label="Condition" value={showText(normalized.condition)} />
                  </div>

                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(180,140,75,0.12)',
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#D8C7A6]/60 mb-2">
                        Usage Characteristics
                      </p>
                      <p className="text-sm text-[#F5F1E7] whitespace-pre-wrap">
                        {showText(normalized.smokingCharacteristics)}
                      </p>
                    </div>

                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(180,140,75,0.12)',
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#D8C7A6]/60 mb-2">
                        Notes
                      </p>
                      <p className="text-sm text-[#F5F1E7] whitespace-pre-wrap">
                        {showText(normalized.notes)}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </TabsContent>
          </Tabs>
        )}
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
            <AlertDialogDescription>
              This will permanently delete <strong>{pipe?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'rgba(180,60,60,0.9)', color: '#fff' }}
            >
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