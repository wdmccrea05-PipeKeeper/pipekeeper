import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Leaf, Pencil, Share2, Search, Trash2 } from 'lucide-react';
import EnrichButton from '@/components/shared/EnrichButton';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PipeIcon from '@/components/icons/PipeIcon';
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import BestPipesDrawer from '@/components/recommendations/BestPipesDrawer';
import TobaccoInventoryManager from '@/components/tobacco/TobaccoInventoryManager';
import CellarLog from '@/components/tobacco/CellarLog';
import { scorePipeBlend } from '@/components/utils/pairingScoreCanonical';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/components/utils/localeFormatters';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { scopedEntities } from '@/components/api/scopedEntities';
import { base44 } from '@/api/base44Client';
import ValueStrategySection from '@/components/whiskey/ValueStrategySection';
import {
  buildValuationSnapshot,
  resolveValueTrend,
} from '@/components/valuation/valueEngine';
import {
  seedInitialSnapshotIfMissing,
  refreshItemValue,
} from '@/components/valuation/valueRefreshService';
import { ReplacementDifficultyPanel } from '@/components/tobacco/TobaccoValuation';

// ── Valuation modals ──────────────────────────────────────────────────────────

function AddItemValueSnapshotModal({ item, itemType, moduleKey, valuationSnapshot, userEmail, onClose, onSaved }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    snapshot_date: today,
    computed_current_value: String(valuationSnapshot?.currentValue || ''),
    value_confidence: valuationSnapshot?.confidence || 'medium',
    source: valuationSnapshot?.source || '',
    rarity_score: String(valuationSnapshot?.rarityScore || ''),
    replacement_difficulty: valuationSnapshot?.replacementDifficulty || 'moderate',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const toN = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.ItemValueSnapshot.create({
        module_key: moduleKey,
        item_type: itemType,
        item_id: item.id,
        created_by: userEmail,
        snapshot_date: form.snapshot_date,
        computed_current_value: toN(form.computed_current_value),
        value_confidence: form.value_confidence,
        source: form.source || null,
        rarity_score: toN(form.rarity_score),
        replacement_difficulty: form.replacement_difficulty,
        notes: form.notes || null,
        is_auto_generated: false,
      });
      onSaved();
    } catch (e) {
      console.error('[TobaccoDetail] failed to save snapshot', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('whiskey.saveValueCheckpoint', 'Save Value Checkpoint')}</h3>
        <div className="space-y-3">
          {[
            { label: t('valuation.snapshotDate', 'Snapshot Date'), field: 'snapshot_date', type: 'date' },
            { label: t('valuation.currentValue', 'Current Value'), field: 'computed_current_value', type: 'number' },
            { label: t('valuation.source', 'Source'), field: 'source', type: 'text' },
            { label: t('valuation.rarityScore', 'Rarity Score (0–100)'), field: 'rarity_score', type: 'number' },
            { label: t('common.notes', 'Notes'), field: 'notes', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Confidence</label>
            <Select value={form.value_confidence} onValueChange={v => setForm(p => ({ ...p, value_confidence: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Replacement Difficulty</label>
            <Select value={form.replacement_difficulty} onValueChange={v => setForm(p => ({ ...p, replacement_difficulty: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="very_hard">Very Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,rgba(163,92,92,1),rgba(140,74,74,1))', color: '#F5F1E7' }}>
            {saving ? t('common.saving', 'Saving…') : t('whiskey.saveValueCheckpoint', 'Save Value Checkpoint')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddPriceObservationModal({ itemId, itemType, moduleKey, userEmail, onClose, onSaved }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    observed_date: today,
    observed_price: '',
    price_type: 'retail',
    source_name: '',
    source_url: '',
    condition_note: '',
    region: '',
    currency: 'USD',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.observed_price) return;
    setSaving(true);
    try {
      await base44.entities.PriceObservation.create({
        module_key: moduleKey,
        item_type: itemType,
        item_id: itemId,
        created_by: userEmail,
        observed_price: Number(form.observed_price),
        price_type: form.price_type,
        source_name: form.source_name || null,
        source_url: form.source_url || null,
        observed_date: form.observed_date,
        condition_note: form.condition_note || null,
        region: form.region || null,
        currency: form.currency || 'USD',
        is_manual: true,
      });
      onSaved();
    } catch (e) {
      console.error('[TobaccoDetail] failed to save observation', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(59,130,246,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">Add Market Observation</h3>
        <div className="space-y-3">
          {[
            { label: 'Observed Date', field: 'observed_date', type: 'date' },
            { label: 'Price *', field: 'observed_price', type: 'number' },
            { label: 'Source Name', field: 'source_name', type: 'text' },
            { label: 'Source URL', field: 'source_url', type: 'text' },
            { label: 'Condition Note', field: 'condition_note', type: 'text' },
            { label: 'Region', field: 'region', type: 'text' },
            { label: 'Currency', field: 'currency', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Price Type</label>
            <Select value={form.price_type} onValueChange={v => setForm(p => ({ ...p, price_type: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="aftermarket">Aftermarket</SelectItem>
                <SelectItem value="auction">Auction</SelectItem>
                <SelectItem value="collector">Collector</SelectItem>
                <SelectItem value="estimate">Estimate</SelectItem>
                <SelectItem value="private_sale">Private Sale</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.observed_price} style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(37,99,235,0.9))', color: '#F5F1E7' }}>
            {saving ? t('common.saving', 'Saving…') : t('whiskey.saveObservation', 'Save Observation')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditTobaccoValuationModal({ blend, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    manual_market_value: String(blend?.manual_market_value || ''),
    production_status: blend?.production_status || '',
    is_seasonal: !!(blend?.seasonal || blend?.is_seasonal),
    regional_exclusive: !!(blend?.regional_exclusive || blend?.region_exclusive || blend?.regional_exclusivity),
    is_limited: !!(blend?.limited_batch || blend?.is_limited || blend?.is_limited_release),
    rarity_score_override: String(blend?.rarity_score_override || ''),
    rarity_notes: blend?.rarity_notes || '',
    manufacturer_status: blend?.manufacturer_status || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        manual_market_value: form.manual_market_value ? Number(form.manual_market_value) : null,
        production_status: form.production_status || null,
        seasonal: form.is_seasonal,
        regional_exclusive: form.regional_exclusive,
        is_limited: form.is_limited,
        rarity_score_override: form.rarity_score_override ? Number(form.rarity_score_override) : null,
        rarity_notes: form.rarity_notes || null,
        manufacturer_status: form.manufacturer_status || null,
      };
      await scopedEntities.TobaccoBlend.update(blend.id, updates);
      onSaved(updates);
    } catch (e) {
      console.error('[TobaccoDetail] failed to save valuation inputs', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(251,191,36,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('valuation.editInputs', 'Edit Valuation Inputs')}</h3>
        <p className="text-xs text-[#D8C7A6]/60">These fields feed directly into the shared valuation engine.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Manual Market Value ($) — current value override</label>
            <Input type="number" value={form.manual_market_value} onChange={e => setForm(p => ({ ...p, manual_market_value: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Production Status</label>
            <Select value={form.production_status || 'none'} onValueChange={v => setForm(p => ({ ...p, production_status: v === 'none' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Not set —</SelectItem>
                <SelectItem value="In Production">In Production</SelectItem>
                <SelectItem value="Discontinued">Discontinued</SelectItem>
                <SelectItem value="Limited Release">Limited Release</SelectItem>
                <SelectItem value="Seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Manufacturer Status</label>
            <Select value={form.manufacturer_status || 'none'} onValueChange={v => setForm(p => ({ ...p, manufacturer_status: v === 'none' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Not set —</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="limited_production">Limited Production</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="defunct">Defunct / Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.is_seasonal} onChange={e => setForm(p => ({ ...p, is_seasonal: e.target.checked }))} className="rounded" />
              <span>Seasonal Release</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.regional_exclusive} onChange={e => setForm(p => ({ ...p, regional_exclusive: e.target.checked }))} className="rounded" />
              <span>Regional Exclusivity</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.is_limited} onChange={e => setForm(p => ({ ...p, is_limited: e.target.checked }))} className="rounded" />
              <span>Limited Release / Small Batch</span>
            </label>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Rarity Notes</label>
            <Input type="text" value={form.rarity_notes} onChange={e => setForm(p => ({ ...p, rarity_notes: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. only available in UK…" />
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Rarity Score Override (0–100, blank = auto)</label>
            <Input type="number" min="0" max="100" value={form.rarity_score_override} onChange={e => setForm(p => ({ ...p, rarity_score_override: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="Leave blank for auto" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.8),rgba(217,160,32,0.9))', color: '#1a120d' }}>
            {saving ? t('common.saving', 'Saving…') : t('common.save', 'Save Inputs')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getOwnershipLabel(blend) {
  const parts = [];
  if (blend.tin_total_tins) parts.push(`${blend.tin_total_tins} tin${blend.tin_total_tins !== 1 ? 's' : ''}`);
  if (blend.pouch_total_pouches) parts.push(`${blend.pouch_total_pouches} pouch${blend.pouch_total_pouches !== 1 ? 'es' : ''}`);
  if (blend.bulk_total_quantity_oz) {
    const bulkFormatted = Number(blend.bulk_total_quantity_oz).toFixed(2);
    parts.push(`${bulkFormatted} oz bulk`);
  }
  return parts.length > 0 ? parts.join(', ') : '0';
}

function DetailStat({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(180,140,75,0.16)' }}
    >
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
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const blendId = params.get('id') || params.get('blendId');
  const userEmail = user?.email || null;

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

  // Valuation history & observations
  const [valueSnapshots, setValueSnapshots] = useState([]);
  const [priceObservations, setPriceObservations] = useState([]);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showEditValuationModal, setShowEditValuationModal] = useState(false);
  const [isRefreshingValue, setIsRefreshingValue] = useState(false);

  const tobaccoStrategy = useMemo(
    () => blend ? buildValuationSnapshot(blend, 'pipekeeper', { valueHistory: valueSnapshots }) : null,
    [blend, valueSnapshots]
  );
  const valueTrend = useMemo(() => resolveValueTrend(valueSnapshots), [valueSnapshots]);

  useEffect(() => {
    let mounted = true;

    async function loadBlend() {
      if (!blendId || !userEmail) {
        if (mounted) {
          setBlend(null);
          setLoading(false);
        }
        return;
      }

      try {
        const [record, snapshots, observations] = await Promise.all([
          scopedEntities.TobaccoBlend.getForUser(userEmail, blendId),
          base44.entities.ItemValueSnapshot.filter(
            { module_key: 'pipekeeper', item_type: 'tobacco', item_id: blendId, created_by: userEmail },
            '-snapshot_date', 20
          ).catch(() => []),
          base44.entities.PriceObservation.filter(
            { module_key: 'pipekeeper', item_type: 'tobacco', item_id: blendId, created_by: userEmail },
            '-observed_date', 20
          ).catch(() => []),
        ]);
        if (mounted) {
          setBlend(record);
          setValueSnapshots(snapshots || []);
          setPriceObservations(observations || []);

          // Auto-seed the first value snapshot if none exist yet
          if (record && userEmail && (snapshots || []).length === 0) {
            const seeded = await seedInitialSnapshotIfMissing(
              record,
              'pipekeeper',
              'tobacco',
              userEmail,
              base44,
              snapshots || [],
              {}
            );
            if (seeded && mounted) {
              const fresh = await base44.entities.ItemValueSnapshot.filter(
                { module_key: 'pipekeeper', item_type: 'tobacco', item_id: blendId, created_by: userEmail },
                '-snapshot_date', 20
              ).catch(() => []);
              if (mounted) setValueSnapshots(fresh || []);
            }
          }
        }
      } catch (e) {
        console.error('[TobaccoDetail] failed to load blend', e);
        if (mounted) setBlend(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBlend();
    return () => {
      mounted = false;
    };
  }, [blendId, userEmail]);

  async function reloadSnapshots() {
    if (!blendId || !userEmail) return;
    const rows = await base44.entities.ItemValueSnapshot.filter(
      { module_key: 'pipekeeper', item_type: 'tobacco', item_id: blendId, created_by: userEmail },
      '-snapshot_date', 20
    ).catch(() => []);
    setValueSnapshots(rows || []);
  }

  async function reloadObservations() {
    if (!blendId || !userEmail) return;
    const rows = await base44.entities.PriceObservation.filter(
      { module_key: 'pipekeeper', item_type: 'tobacco', item_id: blendId, created_by: userEmail },
      '-observed_date', 20
    ).catch(() => []);
    setPriceObservations(rows || []);
  }

  async function handleRefreshValueNow() {
    if (!blend || !userEmail || isRefreshingValue) return;
    setIsRefreshingValue(true);
    try {
      const newSnap = await refreshItemValue(
        blend,
        'pipekeeper',
        'tobacco',
        userEmail,
        base44,
        { valueHistory: valueSnapshots }
      );
      if (newSnap) {
        await reloadSnapshots();
      }
    } finally {
      setIsRefreshingValue(false);
    }
  }

  const handleDelete = async () => {
    if (!blend?.id || !userEmail || blend.created_by !== userEmail) return;

    setDeleting(true);
    try {
      await scopedEntities.TobaccoBlend.delete(blend.id);
      toast.success('Blend deleted');
      navigate('/Tobacco');
    } catch (e) {
      console.error('[TobaccoDetail] delete failed', e);
      toast.error('Failed to delete blend');
      setDeleting(false);
    }
  };

  const handleBlendUpdate = async (updates) => {
    if (!blend?.id || !userEmail || blend.created_by !== userEmail) return;

    setIsUpdatingInventory(true);
    try {
      await scopedEntities.TobaccoBlend.update(blend.id, updates);
      setBlend((prev) => ({ ...prev, ...updates }));
      toast.success(t('inventory.saved') || 'Inventory updated');
      // Invalidate curator collection so the Curator page reflects the update immediately
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
    } catch (e) {
      console.error('[TobaccoDetail] update failed', e);
      toast.error(t('errors.updateFailed') || 'Failed to update inventory');
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  async function handleFindSimilar() {
    if (!blend || !userEmail) return;

    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);

    try {
      const [allBlends, allLogs] = await Promise.all([
        scopedEntities.TobaccoBlend.listForUser(userEmail, '-updated_date', 200).catch(() => []),
        scopedEntities.SmokingLog.listForUser(userEmail, '-date', 100).catch(() => []),
      ]);

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
    if (!blend || !userEmail) return;

    setShowBestPipes(true);
    setBestPipesLoading(true);
    setBestPipesError(null);
    setBestPipesResults(null);

    try {
      const pipes = await scopedEntities.Pipe.listForUser(userEmail, '-updated_date', 200).catch(() => []);
      const userProfile = null;

      const scored = (pipes || [])
        .filter((p) => !p.ai_excluded)
        .map((p) => {
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
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Loading blend…</p>
      </div>
    );
  }

  if (!blend) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Unable to load record.</p>
      </div>
    );
  }

  const mainPhoto = blend.logo || blend.photos?.[0];
  const totalOz =
    (Number(blend.tin_total_quantity_oz) || 0) +
    (Number(blend.bulk_total_quantity_oz) || 0) +
    (Number(blend.pouch_total_quantity_oz) || 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 text-[#F5F1E7]">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            onClick={handleBestPipes}
            size="sm"
            style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
          >
            <PipeIcon className="w-4 h-4 mr-2" color="#D4A574" />
            Best Pipes
          </Button>

          <Button
            onClick={handleFindSimilar}
            size="sm"
            style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
          >
            <Search className="w-4 h-4 mr-2" />
            Find Similar
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>

          <EnrichButton itemType="blend" record={blend} onEnriched={setBlend} />

          <Button
            onClick={() => navigate(`/Tobacco?edit=${encodeURIComponent(blend.id)}`)}
            size="sm"
            style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))', color: '#fff' }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>

          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            size="sm"
            style={{ borderColor: 'rgba(180,80,80,0.4)', color: 'rgba(220,120,120,0.9)' }}
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
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="p-6 flex flex-col items-center gap-4 border-r border-[rgba(180,140,75,0.12)]">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={blend.name}
                className="max-h-[440px] w-full object-contain"
                style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }}
              />
            ) : (
              <div className="w-full h-[280px] rounded-2xl flex flex-col items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                <Leaf className="w-16 h-16" style={{ color: 'rgba(90,124,90,0.25)' }} />
                <p className="text-xs uppercase tracking-wider mt-2">No Photo</p>
              </div>
            )}

            <InlinePhotoEditor
              photos={blend.photos || []}
              maxPhotos={2}
              label="Photos"
              showLogoLibrary
              recordName={blend.name}
              onUpdate={async (updatedPhotos) => {
                await scopedEntities.TobaccoBlend.update(blend.id, { photos: updatedPhotos });
                setBlend((prev) => ({ ...prev, photos: updatedPhotos }));
              }}
            />
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1
                className="text-3xl md:text-5xl font-bold leading-tight break-words"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                {blend.name}
              </h1>
              <p className="text-base md:text-lg text-[#D8C7A6]/84 mt-3 break-words">
                {blend.manufacturer || 'Unknown Maker'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailStat label="Type" value={t(`blendTypes.${blend.blend_type}`, blend.blend_type) || '—'} icon={Leaf} />
              <DetailStat label="Strength" value={blend.strength || '—'} icon={() => <span className="text-[#B48C4B]">●</span>} />
              <DetailStat label="Cut" value={blend.cut || '—'} icon={() => <span className="text-[#B48C4B]">●</span>} />
              <DetailStat label="Rating" value={blend.rating ? `⭐ ${blend.rating}/5` : '—'} icon={() => <span className="text-[#B48C4B]">★</span>} />
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Total (oz)</p>
                  <p className="text-2xl font-semibold mt-2">{formatWeight(totalOz)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Owned</p>
                  <p className="text-2xl font-semibold mt-2">{getOwnershipLabel(blend)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Status</p>
                  <p className="text-2xl font-semibold mt-2">
                    {blend.production_status ? blend.production_status.split(' ')[0] : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Aging</p>
                  <p className="text-2xl font-semibold mt-2">
                    {blend.aging_potential ? blend.aging_potential.split(' ')[0] : '—'}
                  </p>
                </div>
              </div>
            </div>

            {blend.flavor_notes && blend.flavor_notes.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}
              >
                <p className="text-sm font-semibold mb-3">Flavor Notes</p>
                <div className="flex flex-wrap gap-2">
                  {blend.flavor_notes.map((note, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm bg-[rgba(180,140,75,0.14)] border border-[rgba(180,140,75,0.2)]"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {blend.notes && (
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}
              >
                <p className="text-sm font-semibold mb-2">Notes</p>
                <p className="text-[#E0D8C8]/80 whitespace-pre-wrap">{blend.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TobaccoInventoryManager blend={blend} onUpdate={handleBlendUpdate} isUpdating={isUpdatingInventory} />
      <CellarLog blend={blend} />

      {/* Value & Strategy Section — full feature parity with BottleDetail */}
      {tobaccoStrategy ? (
        <ValueStrategySection
          valuationSnapshot={tobaccoStrategy}
          valueTrend={valueTrend}
          valueSnapshots={valueSnapshots}
          priceObservations={priceObservations}
          item={blend}
          moduleKey="pipekeeper"
          itemType="tobacco"
          onAddSnapshot={() => setShowSnapshotModal(true)}
          onAddObservation={() => setShowObservationModal(true)}
          onEditValuation={() => setShowEditValuationModal(true)}
          onRefreshNow={handleRefreshValueNow}
          isRefreshing={isRefreshingValue}
        />
      ) : (
        /* Fallback: standalone replacement difficulty + strategy when full valuation is unavailable */
        <ReplacementDifficultyPanel blend={blend} />
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
            <AlertDialogTitle>{t('tobacco.deleteConfirm', 'Delete this blend?')}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{blend?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'rgba(180,60,60,0.9)', color: '#fff' }}
            >
              {deleting ? t('common.deleting', 'Deleting…') : t('common.confirmDelete', 'Yes, delete')}
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

      {showSnapshotModal && (
        <AddItemValueSnapshotModal
          item={blend}
          itemType="tobacco"
          moduleKey="pipekeeper"
          valuationSnapshot={tobaccoStrategy}
          userEmail={userEmail}
          onClose={() => setShowSnapshotModal(false)}
          onSaved={() => { setShowSnapshotModal(false); reloadSnapshots(); toast.success('Value checkpoint saved'); }}
        />
      )}

      {showObservationModal && (
        <AddPriceObservationModal
          itemId={blend.id}
          itemType="tobacco"
          moduleKey="pipekeeper"
          userEmail={userEmail}
          onClose={() => setShowObservationModal(false)}
          onSaved={() => { setShowObservationModal(false); reloadObservations(); toast.success('Observation saved'); }}
        />
      )}

      {showEditValuationModal && (
        <EditTobaccoValuationModal
          blend={blend}
          onClose={() => setShowEditValuationModal(false)}
          onSaved={(updates) => {
            setBlend(prev => ({ ...prev, ...updates }));
            setShowEditValuationModal(false);
            toast.success('Valuation inputs updated');
            // Reload snapshots so Value History reflects the new inputs
            reloadSnapshots();
            queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
          }}
        />
      )}
    </div>
  );
}