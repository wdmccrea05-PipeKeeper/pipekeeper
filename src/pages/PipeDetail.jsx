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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import PipeSpecialization from '@/components/pipes/PipeSpecialization';
import MaintenanceLog from '@/components/pipes/MaintenanceLog';
import PipeConditionTracker from '@/components/pipes/PipeConditionTracker';
import RotationPlanner from '@/components/pipes/RotationPlanner';
import InterchangeableBowls from '@/components/pipes/InterchangeableBowls';
import ValueLookup from '@/components/ai/ValueLookup';
import ValuationCredibility, { computePipeValuation } from '@/components/valuation/ValuationCredibility';
import UnifiedValuationCard from '@/components/valuation/UnifiedValuationCard';

import {
  buildValuationSnapshot,
  resolveValueTrend,
} from '@/components/valuation/valueEngine';
import {
  seedInitialSnapshotIfMissing,
  refreshItemValue,
} from '@/components/valuation/valueRefreshService';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import PipeShapeIcon from '@/components/pipes/PipeShapeIcon';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { hasModuleProAccess } from '@/components/utils/moduleEntitlements';
import { scopedEntities } from '@/components/api/scopedEntities';
import { useCurrency } from '@/lib/currency/useCurrency';
import EnrichButton from '@/components/shared/EnrichButton';
import { safeUpdate } from '@/components/utils/safeUpdate';
import PipePhotoGallery from '@/components/pipes/PipePhotoGallery';
import BreakInSchedule from '@/components/pipes/BreakInSchedule';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';
import { getItemPhoto } from '@/lib/images/getItemPhoto';

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

// ── Valuation modals ──────────────────────────────────────────────────────────

function AddItemValueSnapshotModal({ item, itemType, moduleKey, valuationSnapshot, userEmail, onClose, onSaved }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    snapshot_date: today,
    computed_current_value: String(valuationSnapshot?.currentValue || ''),
    retail_value: '',
    market_value: '',
    collector_value: '',
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
        retail_value: toN(form.retail_value),
        market_value: toN(form.market_value),
        collector_value: toN(form.collector_value),
        value_confidence: form.value_confidence,
        source: form.source || null,
        rarity_score: toN(form.rarity_score),
        replacement_difficulty: form.replacement_difficulty,
        notes: form.notes || null,
        is_auto_generated: false,
      });
      onSaved();
    } catch (e) {
      console.error('[PipeDetail] failed to save snapshot', e);
      toast.error(e?.message || 'Failed to save value checkpoint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('whiskey.saveValueCheckpoint')}</h3>
        <div className="space-y-3">
          {[
            { label: t('valuation.snapshotDate'), field: 'snapshot_date', type: 'date' },
            { label: t('valuation.currentValue'), field: 'computed_current_value', type: 'number' },
            { label: t('valuation.retailValue'), field: 'retail_value', type: 'number' },
            { label: t('valuation.marketValue'), field: 'market_value', type: 'number' },
            { label: t('valuation.collectorValue'), field: 'collector_value', type: 'number' },
            { label: t('valuation.source'), field: 'source', type: 'text' },
            { label: t('valuation.rarityScore'), field: 'rarity_score', type: 'number' },
            { label: t('common.notes'), field: 'notes', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input
                type={type}
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.confidence_1vbeba")}</label>
            <Select value={form.value_confidence} onValueChange={v => setForm(prev => ({ ...prev, value_confidence: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t("auto.pages_PipeDetail.high_yjucrp")}</SelectItem>
                <SelectItem value="medium">{t("auto.pages_PipeDetail.medium_1i29el")}</SelectItem>
                <SelectItem value="low">{t("auto.pages_PipeDetail.low_376lfb")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.replacement_difficulty_i84seg")}</label>
            <Select value={form.replacement_difficulty} onValueChange={v => setForm(prev => ({ ...prev, replacement_difficulty: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">{t("auto.pages_PipeDetail.easy_yjrv6f")}</SelectItem>
                <SelectItem value="moderate">{t("auto.pages_PipeDetail.moderate_1p8371")}</SelectItem>
                <SelectItem value="hard">{t("auto.pages_PipeDetail.hard_yju6bo")}</SelectItem>
                <SelectItem value="very_hard">{t("auto.pages_PipeDetail.very_hard_1c9zw8")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,rgba(163,92,92,1),rgba(140,74,74,1))', color: '#F5F1E7' }}>
            {saving ? t('common.saving') : t('whiskey.saveValueCheckpoint')}
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
      console.error('[PipeDetail] failed to save observation', e);
      toast.error(e?.message || 'Failed to save observation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(59,130,246,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t("auto.pages_PipeDetail.add_market_observation_1w30d5")}</h3>
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
              <Input
                type={type}
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.price_type_1v7ft2")}</label>
            <Select value={form.price_type} onValueChange={v => setForm(prev => ({ ...prev, price_type: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">{t("auto.pages_PipeDetail.retail_1lb3kj")}</SelectItem>
                <SelectItem value="aftermarket">{t("auto.pages_PipeDetail.aftermarket_1cn991")}</SelectItem>
                <SelectItem value="auction">{t("auto.pages_PipeDetail.auction_1agp8h")}</SelectItem>
                <SelectItem value="collector">{t("auto.pages_PipeDetail.collector_pjqx64")}</SelectItem>
                <SelectItem value="estimate">{t("auto.pages_PipeDetail.estimate_1munng")}</SelectItem>
                <SelectItem value="private_sale">{t("auto.pages_PipeDetail.private_sale_1eid6r")}</SelectItem>
                <SelectItem value="other">{t("auto.pages_PipeDetail.other_3u793b")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.observed_price} style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(37,99,235,0.9))', color: '#F5F1E7' }}>
            {saving ? t('common.saving') : t('whiskey.saveObservation')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditPipeValuationModal({ pipe, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    estimated_value: String(pipe?.estimated_value || ''),
    maker_status: pipe?.maker_status || '',
    production_type: pipe?.production_type || '',
    artisan_tier: pipe?.artisan_tier || '',
    is_limited_run: !!(pipe?.limited_run || pipe?.is_limited_run),
    one_of_a_kind: !!(pipe?.one_of_a_kind || pipe?.is_one_of_a_kind),
    provenance_notes: pipe?.provenance_notes || '',
    replacement_difficulty_override: pipe?.replacement_difficulty_override || '',
    rarity_score_override: String(pipe?.rarity_score_override || ''),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        maker_status: form.maker_status || null,
        production_type: form.production_type || null,
        artisan_tier: form.artisan_tier || null,
        limited_run: form.is_limited_run,
        one_of_a_kind: form.one_of_a_kind,
        provenance_notes: form.provenance_notes || null,
        replacement_difficulty_override: form.replacement_difficulty_override || null,
        rarity_score_override: form.rarity_score_override ? Number(form.rarity_score_override) : null,
      };
      await safeUpdate('Pipe', pipe.id, updates, pipe?.created_by || null);
      onSaved(updates);
    } catch (e) {
      console.error('[PipeDetail] failed to save valuation inputs', e);
      toast.error(e?.message || 'Failed to save valuation inputs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(251,191,36,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('valuation.editInputs')}</h3>
        <p className="text-xs text-[#D8C7A6]/60">{t("auto.pages_PipeDetail.these_fields_feed_directly_into_the_s5uu9e")}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.estimated_value_v9voqf")}</label>
            <Input type="number" value={form.estimated_value} onChange={e => setForm(p => ({ ...p, estimated_value: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.maker_status_1pmgg1")}</label>
            <Select value={form.maker_status || '__none__'} onValueChange={v => setForm(p => ({ ...p, maker_status: v === '__none__' ? '' : v }))}>              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_PipeDetail.select_1tkotp")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("auto.pages_PipeDetail.not_set_14d5wt")}</SelectItem>
                <SelectItem value="active">{t("auto.pages_PipeDetail.active_1a9l7e")}</SelectItem>
                <SelectItem value="limited_production">{t("auto.pages_PipeDetail.limited_production_a93d90")}</SelectItem>
                <SelectItem value="retired">{t("auto.pages_PipeDetail.retired_no_longer_producing_yd1mwi")}</SelectItem>
                <SelectItem value="inactive">{t("auto.pages_PipeDetail.inactive_company_closed_zjbwhk")}</SelectItem>
                <SelectItem value="deceased">{t("auto.pages_PipeDetail.deceased_12cg2u")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.production_type_9cw6vi")}</label>
            <Select value={form.production_type || '__none__'} onValueChange={v => setForm(p => ({ ...p, production_type: v === '__none__' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_PipeDetail.select_1tkotp")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("auto.pages_PipeDetail.not_set_14d5wt")}</SelectItem>
                <SelectItem value="factory">{t("auto.pages_PipeDetail.factory_production_smcr8k")}</SelectItem>
                <SelectItem value="standard_artisan">{t("auto.pages_PipeDetail.standard_artisan_ogx9rc")}</SelectItem>
                <SelectItem value="limited_artisan_batch">{t("auto.pages_PipeDetail.limited_artisan_batch_1utr1c")}</SelectItem>
                <SelectItem value="one_off">{t("auto.pages_PipeDetail.one_off_commissioned_yk6d7s")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.artisan_tier_5tgp9n")}</label>
            <Select value={form.artisan_tier || '__none__'} onValueChange={v => setForm(p => ({ ...p, artisan_tier: v === '__none__' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_PipeDetail.select_1tkotp")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("auto.pages_PipeDetail.not_set_14d5wt")}</SelectItem>
                <SelectItem value="factory">{t("auto.pages_PipeDetail.factory_mass_production_8hsjlz")}</SelectItem>
                <SelectItem value="emerging">{t("auto.pages_PipeDetail.emerging_artisan_txev5x")}</SelectItem>
                <SelectItem value="established">{t("auto.pages_PipeDetail.established_artisan_wm5u7z")}</SelectItem>
                <SelectItem value="master">{t("auto.pages_PipeDetail.master_carver_wz6t0")}</SelectItem>
                <SelectItem value="prestige">{t("auto.pages_PipeDetail.prestige_collector_tier_1dvk0y")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.one_of_a_kind} onChange={e => setForm(p => ({ ...p, one_of_a_kind: e.target.checked }))} className="rounded" />
              <span>{t("auto.pages_PipeDetail.one_of_a_kind_commissioned_pnljek")}</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.is_limited_run} onChange={e => setForm(p => ({ ...p, is_limited_run: e.target.checked }))} className="rounded" />
              <span>{t("auto.pages_PipeDetail.limited_run_special_edition_1dj664")}</span>
            </label>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.provenance_certification_notes_1cqdlu")}</label>
            <Input type="text" value={form.provenance_notes} onChange={e => setForm(p => ({ ...p, provenance_notes: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. original box, dated receipt…" />
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.replacement_difficulty_override_1quqgk")}</label>
            <Select value={form.replacement_difficulty_override || '__none__'} onValueChange={v => setForm(p => ({ ...p, replacement_difficulty_override: v === '__none__' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_PipeDetail.engine_auto_computes_18ucrp")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("auto.pages_PipeDetail.auto_engine_bi126l")}</SelectItem>
                <SelectItem value="easy">{t("auto.pages_PipeDetail.easy_yjrv6f")}</SelectItem>
                <SelectItem value="moderate">{t("auto.pages_PipeDetail.moderate_1p8371")}</SelectItem>
                <SelectItem value="hard">{t("auto.pages_PipeDetail.hard_yju6bo")}</SelectItem>
                <SelectItem value="very_hard">{t("auto.pages_PipeDetail.very_hard_1c9zw8")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_PipeDetail.rarity_score_override_0_100_blank_9gpnd7")}</label>
            <Input type="number" min="0" max="100" value={form.rarity_score_override} onChange={e => setForm(p => ({ ...p, rarity_score_override: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder={t("auto.pages_PipeDetail.leave_blank_for_auto_1xylmr")} />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.8),rgba(217,160,32,0.9))', color: '#1a120d' }}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PipeDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const isPaidUser = hasModuleProAccess(user, 'pipekeeper');
  const { formatLength, formatWeight } = useMeasurement();
  const { formatFromBase } = useCurrency();
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
  const [showAppraisal, setShowAppraisal] = useState(false);
  // Valuation history & observations
  const [valueSnapshots, setValueSnapshots] = useState([]);
  const [priceObservations, setPriceObservations] = useState([]);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showEditValuationModal, setShowEditValuationModal] = useState(false);
  const [isRefreshingValue, setIsRefreshingValue] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [smokingLogs, setSmokingLogs] = useState([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [selectedSessionDay, setSelectedSessionDay] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!pipeId || !user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let pipeRecord = await scopedEntities.Pipe.getForUser(user.email, pipeId).catch(() => null);
        if (!pipeRecord) {
          const direct = await base44.entities.Pipe.get(pipeId).catch(() => null);
          if (direct && direct.created_by === user.email) {
            pipeRecord = direct;
          }
        }

        const blendsList = await scopedEntities.TobaccoBlend.listForUser(user.email, '-updated_date', 500).catch(() => []);

        const [snapshots, observations] = await Promise.all([
          base44.entities.ItemValueSnapshot.filter(
            { module_key: 'pipekeeper', item_type: 'pipe', item_id: pipeId, created_by: user.email },
            '-snapshot_date', 20
          ).catch(() => []),
          base44.entities.PriceObservation.filter(
            { module_key: 'pipekeeper', item_type: 'pipe', item_id: pipeId, created_by: user.email },
            '-observed_date', 20
          ).catch(() => []),
        ]);

        const logs = await base44.entities.SmokingLog.filter(
          { pipe_id: pipeId, created_by: user.email }, '-date', 500
        ).catch(() => []);

        if (mounted) {
          setPipe(pipeRecord);
          setBlends(Array.isArray(blendsList) ? blendsList : []);
          setValueSnapshots(snapshots || []);
          setPriceObservations(observations || []);
          setSmokingLogs(logs || []);

          // Auto-seed the first value snapshot if none exist yet
          if (pipeRecord && user?.email && (snapshots || []).length === 0) {
            const seeded = await seedInitialSnapshotIfMissing(
              pipeRecord,
              'pipekeeper',
              'pipe',
              user.email,
              base44,
              snapshots || [],
              {}
            );
            if (seeded && mounted) {
              const fresh = await base44.entities.ItemValueSnapshot.filter(
                { module_key: 'pipekeeper', item_type: 'pipe', item_id: pipeId, created_by: user.email },
                '-snapshot_date', 20
              ).catch(() => []);
              if (mounted) setValueSnapshots(fresh || []);
            }
          }
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

  async function reloadSnapshots() {
    if (!pipeId || !user?.email) return;
    const rows = await base44.entities.ItemValueSnapshot.filter(
      { module_key: 'pipekeeper', item_type: 'pipe', item_id: pipeId, created_by: user.email },
      '-snapshot_date', 20
    ).catch(() => []);
    setValueSnapshots(rows || []);
  }

  async function reloadObservations() {
    if (!pipeId || !user?.email) return;
    const rows = await base44.entities.PriceObservation.filter(
      { module_key: 'pipekeeper', item_type: 'pipe', item_id: pipeId, created_by: user.email },
      '-observed_date', 20
    ).catch(() => []);
    setPriceObservations(rows || []);
  }

  async function handleRefreshValueNow() {
    if (!pipe || !user?.email || isRefreshingValue) return;
    setIsRefreshingValue(true);
    try {
      const newSnap = await refreshItemValue(
        pipe,
        'pipekeeper',
        'pipe',
        user.email,
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
    setDeleting(true);
    try {
      await base44.entities.Pipe.delete(pipe.id);
      toast.success(t("auto.pages_PipeDetail.pipe_deleted_182uwa"));
      navigate('/Pipes');
    } catch (e) {
      toast.error(t("auto.pages_PipeDetail.failed_to_delete_pipe_fon7bi"));
      setDeleting(false);
    }
  };

  const handlePipeUpdate = async (updates) => {
    if (!pipe) return;
    try {
      await safeUpdate('Pipe', pipe.id, updates, user?.email);
      // Re-fetch: try getForUser first, fallback to direct get
      let fresh = await scopedEntities.Pipe.getForUser(user?.email, pipe.id).catch(() => null);
      if (!fresh) {
        const direct = await base44.entities.Pipe.get(pipe.id).catch(() => null);
        if (direct && direct.created_by === user?.email) fresh = direct;
      }
      setPipe(fresh || { ...pipe, ...updates });
      toast.success(t('common.saved'));
    } catch (e) {
      console.error('[PipeDetail] update failed', e);
      toast.error(e?.message || t('errors.updateFailed'));
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

  const computedValuation = useMemo(() => computePipeValuation(pipe), [pipe]);
  const pipeStrategy = useMemo(
    () => pipe ? buildValuationSnapshot(pipe, 'pipekeeper', { valueHistory: valueSnapshots }) : null,
    [pipe, valueSnapshots]
  );
  const valueTrend = useMemo(() => resolveValueTrend(valueSnapshots), [valueSnapshots]);

  if (loading) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>{t("auto.pages_PipeDetail.loading_pipe_1sv4hi")}</p>
      </div>
    );
  }

  if (!pipe || !normalized) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>{t("auto.pages_PipeDetail.unable_to_load_record_2v51v0")}</p>
      </div>
    );
  }

  const mainPhoto = getItemPhoto(pipe);
  const allPhotos = [
    ...(pipe.photos || []),
    ...(pipe.stamping_photos || [])
  ];

  const handlePhotoClick = (index) => {
    setGalleryIndex(index);
    setShowPhotoGallery(true);
  };

  const money = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && value !== '' && value != null ? formatFromBase(num) : '—';
  };

  const conditionSummary = normalized.condition
    ? String(normalized.condition).split('-').pop()?.trim() || String(normalized.condition)
    : '—';

  return (
    <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("auto.pages_PipeDetail.back_yjpjkm")}
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleFindSimilar}
            className="flex-1 sm:flex-none"
            style={{
              background: 'rgba(180,140,75,0.15)',
              border: '1px solid rgba(180,140,75,0.3)',
              color: '#D4A574',
            }}
          >
            <Search className="w-4 h-4 mr-2" />
            {t("auto.pages_PipeDetail.find_similar_afe8ev")}
          </Button>

          <Button
            onClick={() => setShowShareModal(true)}
            className="flex-1 sm:flex-none"
            style={{
              background: 'rgba(180, 140, 75, 0.2)',
              border: '1px solid rgba(180, 140, 75, 0.35)',
              color: '#F5F1E7',
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t("auto.pages_PipeDetail.share_3wrj14")}
          </Button>

          <EnrichButton itemType="pipe" record={pipe} onEnriched={setPipe} />

          <Button
            onClick={() => navigate(`/Pipes?edit=${encodeURIComponent(pipe.id)}`)}
            className="flex-1 sm:flex-none"
            style={{
              background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))',
              color: '#fff',
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            {t("auto.pages_PipeDetail.edit_yjrxfv")}
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
          <p className="text-2xl font-semibold text-[#F5F1E7]">{t("auto.pages_PipeDetail.pipe_snapshot_sbq09v")}</p>
          <p className="text-sm text-[#D8C7A6]/70 mt-1">{t("auto.pages_PipeDetail.quick_overview_of_the_pipe_record_c85igs")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="p-6 flex flex-col items-center gap-4 border-r border-[rgba(180,140,75,0.12)]">
            {mainPhoto ? (
              <button
                type="button"
                onClick={() => handlePhotoClick(0)}
                className="max-h-[440px] w-full rounded-xl overflow-hidden hover:opacity-90 transition-opacity group relative"
                style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }}
                title={t("auto.pages_PipeDetail.click_to_view_full_gallery_1om0ig")}
              >
                <img
                  src={mainPhoto}
                  alt={pipe.name}
                  className="max-h-[440px] w-full object-contain"
                />
                {allPhotos.length > 1 && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <span className="text-white/0 group-hover:text-white/70 text-sm font-medium">
                      {allPhotos.length} photos
                    </span>
                  </div>
                )}
              </button>
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

            {/* Photo set preview — first image larger, rest as thumbnails */}
            {allPhotos.length > 1 && (
              <div className="w-full space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] font-semibold text-[#D8C7A6]/60">
                  {t("auto.pages_PipeDetail.photo_set_yvlfhf")}{allPhotos.length})
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePhotoClick(idx)}
                      className="aspect-square rounded-lg overflow-hidden border border-[rgba(180,140,75,0.18)] hover:border-[rgba(180,140,75,0.35)] transition-all hover:scale-105"
                      title={`View photo ${idx + 1}`}
                    >
                      <img
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <InlinePhotoEditor
              photos={pipe.photos || []}
              maxPhotos={20}
              label="Photos"
              entityType="pipe"
              recordName={pipe.name || ''}
              maker={pipe.maker || ''}
              shape={pipe.shape || ''}
              onUpdate={async (updatedPhotos) => {
                await handlePipeUpdate({ photos: updatedPhotos });
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

            {/* UNIFIED VALUATION CARD */}
            {pipeStrategy && (
              <UnifiedValuationCard
                item={pipe}
                itemType="pipe"
                moduleKey="pipekeeper"
                valuationSnapshot={pipeStrategy}
                valueTrend={valueTrend}
                valueSnapshots={valueSnapshots}
                priceObservations={priceObservations}
                onRunAppraisal={() => setShowAppraisal(v => !v)}
                appraisalContent={showAppraisal ? (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
                    {computedValuation && <ValuationCredibility valuation={computedValuation} />}
                    <ValueLookup
                      pipe={pipe}
                      onUpdateValue={(newValue) => handlePipeUpdate({ estimated_value: newValue })}
                    />
                  </div>
                ) : null}
                onAddSnapshot={() => setShowSnapshotModal(true)}
                onAddObservation={() => setShowObservationModal(true)}
                onEditValuation={() => setShowEditValuationModal(true)}
                onRefreshNow={handleRefreshValueNow}
                isRefreshing={isRefreshingValue}
              />
            )}

            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(180,140,75,0.14)',
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.size_yk2u9s")}</p>
                  <p className="text-2xl font-semibold mt-2">{normalized.sizeClass || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.length_1hf694")}</p>
                  <p className="text-2xl font-semibold mt-2">
                    {normalized.lengthValue != null ? (formatLength(Number(normalized.lengthValue)) || `${normalized.lengthValue} mm`) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.weight_1ojd9v")}</p>
                  <p className="text-2xl font-semibold mt-2">
                    {normalized.weightValue != null ? (formatWeight(Number(normalized.weightValue)) || `${normalized.weightValue} g`) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.condition_1r6c97")}</p>
                  <p className="text-2xl font-semibold mt-2">{conditionSummary}</p>
                </div>
              </div>
              {(normalized.bowlHeightValue != null || normalized.bowlWidthValue != null || normalized.bowlDiameterValue != null || normalized.bowlDepthValue != null) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[rgba(180,140,75,0.12)]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.bowl_height_csn6uq")}</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlHeightValue != null ? (formatLength(Number(normalized.bowlHeightValue)) || `${normalized.bowlHeightValue} mm`) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.bowl_width_qihp6h")}</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlWidthValue != null ? (formatLength(Number(normalized.bowlWidthValue)) || `${normalized.bowlWidthValue} mm`) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.bowl_diameter_17ojik")}</p>
                    <p className="text-xl font-semibold mt-2">{normalized.bowlDiameterValue != null ? (formatLength(Number(normalized.bowlDiameterValue)) || `${normalized.bowlDiameterValue} mm`) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_PipeDetail.bowl_depth_q4zy5q")}</p>
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
                <p className="text-sm font-semibold mb-2">{t("auto.pages_PipeDetail.notes_3te9gu")}</p>
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
            <p className="text-lg font-semibold text-[#F5F1E7]">{t("auto.pages_PipeDetail.pipe_functions_and_details_bq9tdk")}</p>
            <p className="text-sm text-[#D8C7A6]/70 mt-1">
              {t("auto.pages_PipeDetail.condition_rotation_specialization_maintenance_an_17sxsa")}
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
          <>
          <Tabs defaultValue="condition" className="w-full">
            <div className="border-b border-[rgba(180,140,75,0.15)] px-2 pt-2">
              <TabsList className="bg-transparent gap-0.5">
                <TabsTrigger value="condition" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.condition_1r6c97")}
                </TabsTrigger>
                <TabsTrigger value="rotation" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.rotation_18434d")}
                </TabsTrigger>
                <TabsTrigger value="specialization" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.specialization_3efo3o")}
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.maintenance_1d02mv")}
                </TabsTrigger>
                <TabsTrigger value="bowls" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.bowls_3kxbf0")}
                </TabsTrigger>
                <TabsTrigger value="breakin" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.break_in_1824zs")}
                </TabsTrigger>
                <TabsTrigger value="details" className="data-[state=active]:bg-[rgba(180,140,75,0.15)] data-[state=active]:text-[#D4A574] text-[#E0D8C8]/70 rounded-lg text-xs px-3">
                  {t("auto.pages_PipeDetail.details_th3nu3")}
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

            <TabsContent value="bowls" className="p-4 m-0">
              <InterchangeableBowls pipe={pipe} onUpdate={handlePipeUpdate} />
            </TabsContent>

            <TabsContent value="breakin" className="p-4 m-0">
              <BreakInSchedule pipe={pipe} blends={blends} />
            </TabsContent>

            <TabsContent value="details" className="p-4 md:p-5 m-0">
              <div className="space-y-4">
                <SectionCard title={t("auto.pages_PipeDetail.pipe_geometry_1gw1sl")} icon={Info}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <MetaRow label="Shape" value={showText(normalized.shape)} />
                    <MetaRow label="Bowl Style" value={showText(normalized.bowlStyle)} />
                    <MetaRow label="Shank Shape" value={showText(normalized.shankShape)} />
                    <MetaRow label="Bend" value={showText(normalized.bend)} />
                    <MetaRow label="Size Class" value={showText(normalized.sizeClass)} />
                    <MetaRow label="Chamber Volume" value={showText(normalized.chamberVolume)} />
                  </div>
                </SectionCard>

                <SectionCard title={t("auto.pages_PipeDetail.physical_characteristics_1ls8hz")} icon={Info}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <MetaRow label="Bowl Material" value={showText(normalized.bowlMaterial)} />
                    <MetaRow label="Stem Material" value={showText(normalized.stemMaterial)} />
                    <MetaRow label="Finish" value={showText(normalized.finish)} />
                    <MetaRow label="Filter Type" value={showText(normalized.filterType)} />
                    <MetaRow label="Country of Origin" value={showText(normalized.countryOfOrigin)} />
                    <MetaRow label="Maker" value={showText(normalized.maker)} />
                  </div>
                </SectionCard>

                <SectionCard title={t("auto.pages_PipeDetail.measurements_1hdgye")} icon={Ruler}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <MetaRow label="Length" value={normalized.lengthValue != null ? (formatLength(Number(normalized.lengthValue)) || `${normalized.lengthValue} mm`) : '—'} />
                    <MetaRow label="Weight" value={normalized.weightValue != null ? (formatWeight(Number(normalized.weightValue)) || `${normalized.weightValue} g`) : '—'} />
                    <MetaRow label="Bowl Height" value={normalized.bowlHeightValue != null ? (formatLength(Number(normalized.bowlHeightValue)) || `${normalized.bowlHeightValue} mm`) : '—'} />
                    <MetaRow label="Bowl Width" value={normalized.bowlWidthValue != null ? (formatLength(Number(normalized.bowlWidthValue)) || `${normalized.bowlWidthValue} mm`) : '—'} />
                    <MetaRow label="Bowl Diameter" value={normalized.bowlDiameterValue != null ? (formatLength(Number(normalized.bowlDiameterValue)) || `${normalized.bowlDiameterValue} mm`) : '—'} />
                    <MetaRow label="Bowl Depth" value={normalized.bowlDepthValue != null ? (formatLength(Number(normalized.bowlDepthValue)) || `${normalized.bowlDepthValue} mm`) : '—'} />
                  </div>
                </SectionCard>

                <SectionCard title={t("auto.pages_PipeDetail.stamping_1qbzgn")} icon={Info}>
                  {pipe.stamping ? (
                    <div
                      className="rounded-xl p-4 mb-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(180,140,75,0.12)',
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#D8C7A6]/60 mb-2">
                        {t("auto.pages_PipeDetail.stamping_text_y8da4t")}
                      </p>
                      <p className="text-sm text-[#F5F1E7] whitespace-pre-wrap">{pipe.stamping}</p>
                    </div>
                  ) : null}
                  <InlinePhotoEditor
                    photos={pipe.stamping_photos || []}
                    maxPhotos={20}
                    label="Stamping Photos"
                    onUpdate={async (updatedPhotos) => {
                      await handlePipeUpdate({ stamping_photos: updatedPhotos });
                    }}
                  />
                </SectionCard>

                <SectionCard title={t("auto.pages_PipeDetail.value_and_notes_1xcj1h")} icon={CircleDollarSign}>
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
                        {t("auto.pages_PipeDetail.usage_characteristics_kunmfq")}
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
                        {t("auto.pages_PipeDetail.notes_3te9gu")}
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

          {/* Sessions Calendar Preview */}
          {smokingLogs.length > 0 && (() => {
            const sessionRows = smokingLogs.map((log) => ({
              id: log.id,
              moduleType: 'pipe',
              date: log.date || log.created_date,
              itemLabel: log.tobacco_blend_name || '',
              rating: log.rating,
              notes: log.notes,
            }));
            const { byDate, highlightedDates } = buildSessionCalendarData(sessionRows, 'all');
            const selectedKey = selectedSessionDay ? toLocalDateYmd(selectedSessionDay) : null;
            const dayLogs = selectedKey ? (byDate[selectedKey] || []) : [];

            return (
              <div
                className="rounded-2xl p-5 mt-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,140,75,0.14)',
                }}
              >
                <button
                  type="button"
                  className="flex items-center justify-between w-full mb-0"
                  onClick={() => setSessionsOpen((v) => !v)}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#F5F1E7]">{t("auto.pages_PipeDetail.sessions_11ubv2")}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(180,140,75,0.18)] text-[#D4A574] font-medium">
                      {smokingLogs.length}
                    </span>
                  </div>
                  {sessionsOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#D8C7A6]/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#D8C7A6]/60" />
                  )}
                </button>

                {sessionsOpen && (
                  <div className="mt-4 space-y-4">
                    <Calendar
                      mode="single"
                      selected={selectedSessionDay}
                      onSelect={setSelectedSessionDay}
                      modifiers={{ highlighted: highlightedDates }}
                      modifiersClassNames={{
                        highlighted: 'bg-[rgba(180,140,75,0.3)] text-[#F5F1E7] rounded-full font-semibold',
                      }}
                      className="rounded-xl border border-[rgba(180,140,75,0.18)] bg-[rgba(255,255,255,0.02)] text-[#F5F1E7] w-full"
                    />
                    {selectedKey && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 font-semibold">
                          {selectedKey}
                        </p>
                        {dayLogs.length === 0 ? (
                          <p className="text-sm text-[#E0D8C8]/50">{t("auto.pages_PipeDetail.no_sessions_on_this_day_12q13o")}</p>
                        ) : (
                          dayLogs.map((log, i) => (
                            <div
                              key={log.id || i}
                              className="rounded-xl p-3"
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(180,140,75,0.12)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#F5F1E7]">
                                  {log.itemLabel || 'Smoke'}
                                </p>
                                {log.rating != null && (
                                  <span className="text-xs text-[#D4A574]">★ {log.rating}</span>
                                )}
                              </div>
                              {log.notes && (
                                <p className="text-xs text-[#E0D8C8]/60 mt-1 line-clamp-2">{log.notes}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </> 
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
            <AlertDialogTitle>{t("auto.pages_PipeDetail.delete_this_pipe_webvfh")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("auto.pages_PipeDetail.this_will_permanently_delete_1e3ibn")} <strong>{pipe?.name}</strong>{t("auto.pages_PipeDetail.this_action_cannot_be_undone_15oama")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("auto.pages_PipeDetail.cancel_1bin7k")}</AlertDialogCancel>
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

      {showSnapshotModal && (
        <AddItemValueSnapshotModal
          item={pipe}
          itemType="pipe"
          moduleKey="pipekeeper"
          valuationSnapshot={pipeStrategy}
          userEmail={user?.email}
          onClose={() => setShowSnapshotModal(false)}
          onSaved={() => { setShowSnapshotModal(false); reloadSnapshots(); toast.success(t("auto.pages_PipeDetail.value_checkpoint_saved_1wnagr")); }}
        />
      )}

      {showObservationModal && (
        <AddPriceObservationModal
          itemId={pipe.id}
          itemType="pipe"
          moduleKey="pipekeeper"
          userEmail={user?.email}
          onClose={() => setShowObservationModal(false)}
          onSaved={() => { setShowObservationModal(false); reloadObservations(); toast.success(t("auto.pages_PipeDetail.observation_saved_4xbdpg")); }}
        />
      )}

      {showEditValuationModal && (
        <EditPipeValuationModal
          pipe={pipe}
          onClose={() => setShowEditValuationModal(false)}
          onSaved={(updates) => {
            setPipe(prev => ({ ...prev, ...updates }));
            setShowEditValuationModal(false);
            toast.success(t("auto.pages_PipeDetail.valuation_inputs_updated_mda542"));
            // Reload snapshots so Value History reflects the new inputs
            reloadSnapshots();
          }}
        />
      )}

      <PipePhotoGallery
        photos={allPhotos}
        isOpen={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
}