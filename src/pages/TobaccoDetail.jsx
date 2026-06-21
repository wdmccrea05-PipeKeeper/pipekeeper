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
import UnifiedValuationCard from '@/components/valuation/UnifiedValuationCard';

import {
  buildValuationSnapshot,
  resolveValueTrend,
} from '@/components/valuation/valueEngine';
import {
  seedInitialSnapshotIfMissing,
  refreshItemValue,
} from '@/components/valuation/valueRefreshService';
import { normalizeFlavorProfile } from '@/components/tobacco/flavorNotes';


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
            { label: t('valuation.source'), field: 'source', type: 'text' },
            { label: t('valuation.rarityScore'), field: 'rarity_score', type: 'number' },
            { label: t('common.notes'), field: 'notes', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.confidence_1vbeba")}</label>
            <Select value={form.value_confidence} onValueChange={v => setForm(p => ({ ...p, value_confidence: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t("auto.pages_TobaccoDetail.high_yjucrp")}</SelectItem>
                <SelectItem value="medium">{t("auto.pages_TobaccoDetail.medium_1i29el")}</SelectItem>
                <SelectItem value="low">{t("auto.pages_TobaccoDetail.low_376lfb")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.replacement_difficulty_i84seg")}</label>
            <Select value={form.replacement_difficulty} onValueChange={v => setForm(p => ({ ...p, replacement_difficulty: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">{t("auto.pages_TobaccoDetail.easy_yjrv6f")}</SelectItem>
                <SelectItem value="moderate">{t("auto.pages_TobaccoDetail.moderate_1p8371")}</SelectItem>
                <SelectItem value="hard">{t("auto.pages_TobaccoDetail.hard_yju6bo")}</SelectItem>
                <SelectItem value="very_hard">{t("auto.pages_TobaccoDetail.very_hard_1c9zw8")}</SelectItem>
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
      console.error('[TobaccoDetail] failed to save observation', e);
      toast.error(e?.message || 'Failed to save observation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(59,130,246,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t("auto.pages_TobaccoDetail.add_market_observation_1w30d5")}</h3>
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
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.price_type_1v7ft2")}</label>
            <Select value={form.price_type} onValueChange={v => setForm(p => ({ ...p, price_type: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">{t("auto.pages_TobaccoDetail.retail_1lb3kj")}</SelectItem>
                <SelectItem value="aftermarket">{t("auto.pages_TobaccoDetail.aftermarket_1cn991")}</SelectItem>
                <SelectItem value="auction">{t("auto.pages_TobaccoDetail.auction_1agp8h")}</SelectItem>
                <SelectItem value="collector">{t("auto.pages_TobaccoDetail.collector_pjqx64")}</SelectItem>
                <SelectItem value="estimate">{t("auto.pages_TobaccoDetail.estimate_1munng")}</SelectItem>
                <SelectItem value="private_sale">{t("auto.pages_TobaccoDetail.private_sale_1eid6r")}</SelectItem>
                <SelectItem value="other">{t("auto.pages_TobaccoDetail.other_3u793b")}</SelectItem>
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

function EditTobaccoValuationModal({ blend, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    // Pricing fields
    purchase_price: String(blend?.purchase_price || ''),
    purchase_price_type: blend?.purchase_price_type || '',
    cost_basis: String(blend?.cost_basis || ''),
    price_per_oz: String(blend?.price_per_oz || ''),
    ai_estimated_value: String(blend?.ai_estimated_value || ''),
    manual_market_value: String(blend?.manual_market_value || ''),
    market_estimated_unit_value: String(blend?.market_estimated_unit_value || ''),
    market_estimated_total_value: String(blend?.market_estimated_total_value || ''),
    valuation_source: blend?.valuation_source || '',
    valuation_confidence: blend?.valuation_confidence || '',
    valuation_notes: blend?.valuation_notes || '',
    // Rarity / production fields
    production_status: blend?.production_status || '',
    manufacturer_status: blend?.manufacturer_status || '',
    is_seasonal: !!(blend?.seasonal || blend?.is_seasonal),
    regional_exclusive: !!(blend?.regional_exclusive || blend?.region_exclusive || blend?.regional_exclusivity),
    is_limited: !!(blend?.limited_batch || blend?.is_limited || blend?.is_limited_release),
    rarity_score_override: String(blend?.rarity_score_override || ''),
    rarity_notes: blend?.rarity_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const toN = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
      const updates = {
        // Pricing
        purchase_price: toN(form.purchase_price),
        purchase_price_type: form.purchase_price_type || null,
        cost_basis: toN(form.cost_basis),
        price_per_oz: toN(form.price_per_oz),
        ai_estimated_value: toN(form.ai_estimated_value),
        manual_market_value: toN(form.manual_market_value),
        market_estimated_unit_value: toN(form.market_estimated_unit_value),
        market_estimated_total_value: toN(form.market_estimated_total_value),
        valuation_source: form.valuation_source || null,
        valuation_confidence: form.valuation_confidence || null,
        valuation_notes: form.valuation_notes || null,
        // Rarity / production
        production_status: form.production_status || null,
        manufacturer_status: form.manufacturer_status || null,
        seasonal: form.is_seasonal,
        regional_exclusive: form.regional_exclusive,
        is_limited: form.is_limited,
        rarity_score_override: toN(form.rarity_score_override),
        rarity_notes: form.rarity_notes || null,
      };
      await scopedEntities.TobaccoBlend.update(blend.id, updates);
      onSaved(updates);
    } catch (e) {
      console.error('[TobaccoDetail] failed to save valuation inputs', e);
      toast.error(e?.message || 'Failed to save valuation inputs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(251,191,36,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('valuation.editInputs')}</h3>
        <p className="text-xs text-[#D8C7A6]/60">{t("auto.pages_TobaccoDetail.these_fields_feed_directly_into_the_s5uu9e")}</p>

        <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider pt-1">{t("auto.pages_TobaccoDetail.pricing_9upkb5")}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.purchase_price_per_unit_1neieh")}</label>
              <Input type="number" value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. 15.00" />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.purchase_type_1s5qci")}</label>
              <Select value={form.purchase_price_type || 'none'} onValueChange={v => setForm(p => ({ ...p, purchase_price_type: v === 'none' ? '' : v }))}>
                <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_TobaccoDetail.select_1tkotp")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("auto.pages_TobaccoDetail.not_set_14d5wt")}</SelectItem>
                  <SelectItem value="tin">{t("auto.pages_TobaccoDetail.per_tin_1kpqfr")}</SelectItem>
                  <SelectItem value="oz">{t("auto.pages_TobaccoDetail.per_oz_1k0evp")}</SelectItem>
                  <SelectItem value="pouch">{t("auto.pages_TobaccoDetail.per_pouch_at2lmz")}</SelectItem>
                  <SelectItem value="lot">{t("auto.pages_TobaccoDetail.lot_bundle_1fohom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.cost_basis_total_paid_138zwz")}</label>
              <Input type="number" value={form.cost_basis} onChange={e => setForm(p => ({ ...p, cost_basis: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. 45.00" />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.price_per_oz_oz_1g61fs")}</label>
              <Input type="number" value={form.price_per_oz} onChange={e => setForm(p => ({ ...p, price_per_oz: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. 1.25" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.market_unit_value_oz_1e8e1b")}</label>
              <Input type="number" value={form.market_estimated_unit_value} onChange={e => setForm(p => ({ ...p, market_estimated_unit_value: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="current $/oz" />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.market_total_value_7sjz3z")}</label>
              <Input type="number" value={form.market_estimated_total_value} onChange={e => setForm(p => ({ ...p, market_estimated_total_value: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="total lot value" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.ai_estimated_value_oz_ul5qx")}</label>
              <Input type="number" value={form.ai_estimated_value} onChange={e => setForm(p => ({ ...p, ai_estimated_value: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder={t("auto.pages_TobaccoDetail.ai_per_oz_estimate_c937s8")} />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.manual_market_value_override_15x5fn")}</label>
              <Input type="number" value={form.manual_market_value} onChange={e => setForm(p => ({ ...p, manual_market_value: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="manual override" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.valuation_source_3m80mh")}</label>
              <Input type="text" value={form.valuation_source} onChange={e => setForm(p => ({ ...p, valuation_source: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. Smokingpipes.com" />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.valuation_confidence_14g6fp")}</label>
              <Select value={form.valuation_confidence || 'none'} onValueChange={v => setForm(p => ({ ...p, valuation_confidence: v === 'none' ? '' : v }))}>
                <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_TobaccoDetail.select_1tkotp")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("auto.pages_TobaccoDetail.not_set_14d5wt")}</SelectItem>
                  <SelectItem value="high">{t("auto.pages_TobaccoDetail.high_yjucrp")}</SelectItem>
                  <SelectItem value="medium">{t("auto.pages_TobaccoDetail.medium_1i29el")}</SelectItem>
                  <SelectItem value="low">{t("auto.pages_TobaccoDetail.low_376lfb")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.valuation_notes_1fo4sm")}</label>
            <Input type="text" value={form.valuation_notes} onChange={e => setForm(p => ({ ...p, valuation_notes: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder={t("auto.pages_TobaccoDetail.any_notes_about_the_valuation_1id1gi")} />
          </div>
        </div>

        <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider pt-2">{t("auto.pages_TobaccoDetail.rarity_and_production_3o7stp")}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.production_status_wvj3rk")}</label>
            <Select value={form.production_status || 'none'} onValueChange={v => setForm(p => ({ ...p, production_status: v === 'none' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_TobaccoDetail.select_1tkotp")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("auto.pages_TobaccoDetail.not_set_14d5wt")}</SelectItem>
                <SelectItem value="In Production">{t("auto.pages_TobaccoDetail.in_production_zmt4cj")}</SelectItem>
                <SelectItem value="Discontinued">{t("auto.pages_TobaccoDetail.discontinued_10hh6x")}</SelectItem>
                <SelectItem value="Limited Release">{t("auto.pages_TobaccoDetail.limited_release_1stdet")}</SelectItem>
                <SelectItem value="Seasonal">{t("auto.pages_TobaccoDetail.seasonal_q71x4r")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.manufacturer_status_1ysuv0")}</label>
            <Select value={form.manufacturer_status || 'none'} onValueChange={v => setForm(p => ({ ...p, manufacturer_status: v === 'none' ? '' : v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue placeholder={t("auto.pages_TobaccoDetail.select_1tkotp")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("auto.pages_TobaccoDetail.not_set_14d5wt")}</SelectItem>
                <SelectItem value="active">{t("auto.pages_TobaccoDetail.active_1a9l7e")}</SelectItem>
                <SelectItem value="limited_production">{t("auto.pages_TobaccoDetail.limited_production_a93d90")}</SelectItem>
                <SelectItem value="inactive">{t("auto.pages_TobaccoDetail.inactive_1nsqnn")}</SelectItem>
                <SelectItem value="defunct">{t("auto.pages_TobaccoDetail.defunct_closed_1tli4d")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.is_seasonal} onChange={e => setForm(p => ({ ...p, is_seasonal: e.target.checked }))} className="rounded" />
              <span>{t("auto.pages_TobaccoDetail.seasonal_release_147ou7")}</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.regional_exclusive} onChange={e => setForm(p => ({ ...p, regional_exclusive: e.target.checked }))} className="rounded" />
              <span>{t("auto.pages_TobaccoDetail.regional_exclusivity_bip0fz")}</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] cursor-pointer">
              <input type="checkbox" checked={form.is_limited} onChange={e => setForm(p => ({ ...p, is_limited: e.target.checked }))} className="rounded" />
              <span>{t("auto.pages_TobaccoDetail.limited_release_small_batch_1gdg50")}</span>
            </label>
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.rarity_notes_1qz5uy")}</label>
            <Input type="text" value={form.rarity_notes} onChange={e => setForm(p => ({ ...p, rarity_notes: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder="e.g. only available in UK…" />
          </div>
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t("auto.pages_TobaccoDetail.rarity_score_override_0_100_blank_9gpnd7")}</label>
            <Input type="number" min="0" max="100" value={form.rarity_score_override} onChange={e => setForm(p => ({ ...p, rarity_score_override: e.target.value }))} className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" placeholder={t("auto.pages_TobaccoDetail.leave_blank_for_auto_1xylmr")} />
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
      toast.success(t("auto.pages_TobaccoDetail.blend_deleted_1v8ehb"));
      navigate('/Tobacco');
    } catch (e) {
      console.error('[TobaccoDetail] delete failed', e);
      toast.error(t("auto.pages_TobaccoDetail.failed_to_delete_blend_k3nj39"));
      setDeleting(false);
    }
  };

  const handleBlendUpdate = async (updates) => {
    if (!blend?.id || !userEmail || blend.created_by !== userEmail) return;

    setIsUpdatingInventory(true);
    try {
      await scopedEntities.TobaccoBlend.update(blend.id, updates);
      setBlend((prev) => ({ ...prev, ...updates }));
      toast.success(t('inventory.saved'));
      // Invalidate curator collection so the Curator page reflects the update immediately
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
    } catch (e) {
      console.error('[TobaccoDetail] update failed', e);
      toast.error(t('errors.updateFailed'));
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
        <p>{t("auto.pages_TobaccoDetail.loading_blend_l9j7y")}</p>
      </div>
    );
  }

  if (!blend) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>{t("auto.pages_TobaccoDetail.unable_to_load_record_2v51v0")}</p>
      </div>
    );
  }

  const mainPhoto = blend.logo || blend.photos?.[0];
  const totalOz =
    (Number(blend.tin_total_quantity_oz) || 0) +
    (Number(blend.bulk_total_quantity_oz) || 0) +
    (Number(blend.pouch_total_quantity_oz) || 0);
  const flavorProfile = normalizeFlavorProfile(blend.flavor_profile ?? blend.flavor_notes);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 text-[#F5F1E7]">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("auto.pages_TobaccoDetail.back_yjpjkm")}
        </Button>

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            onClick={handleBestPipes}
            size="sm"
            style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
          >
            <PipeIcon className="w-4 h-4 mr-2" color="#D4A574" />
            {t("auto.pages_TobaccoDetail.best_pipes_120dxa")}
          </Button>

          <Button
            onClick={handleFindSimilar}
            size="sm"
            style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
          >
            <Search className="w-4 h-4 mr-2" />
            {t("auto.pages_TobaccoDetail.find_similar_afe8ev")}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            {t("auto.pages_TobaccoDetail.share_3wrj14")}
          </Button>

          <EnrichButton itemType="blend" record={blend} onEnriched={setBlend} />

          <Button
            onClick={() => navigate(`/Tobacco?edit=${encodeURIComponent(blend.id)}`)}
            size="sm"
            style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(143,78,78,1))', color: '#fff' }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            {t("auto.pages_TobaccoDetail.edit_yjrxfv")}
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
                <p className="text-xs uppercase tracking-wider mt-2">{t("auto.pages_TobaccoDetail.no_photo_bbfq98")}</p>
              </div>
            )}

            <InlinePhotoEditor
              photos={blend.photos || []}
              maxPhotos={2}
              label="Photos"
              showLogoLibrary
              entityType="blend"
              recordName={blend.name}
              brand={blend.manufacturer || ''}
              onUpdate={async (updatedPhotos) => {
                try {
                  await scopedEntities.TobaccoBlend.update(blend.id, { photos: updatedPhotos });
                  setBlend((prev) => ({ ...prev, photos: updatedPhotos }));
                } catch (err) {
                  console.error('[TobaccoDetail] photo update failed', err);
                  toast.error(err?.message || 'Failed to update photos');
                }
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
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_TobaccoDetail.total_oz_ibkgkj")}</p>
                  <p className="text-2xl font-semibold mt-2">{formatWeight(totalOz)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_TobaccoDetail.owned_3u9pb6")}</p>
                  <p className="text-2xl font-semibold mt-2">{getOwnershipLabel(blend)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_TobaccoDetail.status_1m8lgy")}</p>
                  <p className="text-2xl font-semibold mt-2">
                    {blend.production_status ? blend.production_status.split(' ')[0] : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{t("auto.pages_TobaccoDetail.aging_3k1esr")}</p>
                  <p className="text-2xl font-semibold mt-2">
                    {blend.aging_potential ? blend.aging_potential.split(' ')[0] : '—'}
                  </p>
                </div>
              </div>
            </div>

            {flavorProfile.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}
              >
                <p className="text-sm font-semibold mb-3">{t("auto.pages_TobaccoDetail.flavor_notes_hrnhp4")}</p>
                <div className="flex flex-wrap gap-2">
                  {flavorProfile.map((note, idx) => (
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
                <p className="text-sm font-semibold mb-2">{t("auto.pages_TobaccoDetail.notes_3te9gu")}</p>
                <p className="text-[#E0D8C8]/80 whitespace-pre-wrap">{blend.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TobaccoInventoryManager blend={blend} onUpdate={handleBlendUpdate} isUpdating={isUpdatingInventory} />
      <CellarLog blend={blend} />

      {/* UNIFIED VALUATION CARD */}
      {tobaccoStrategy && (
        <UnifiedValuationCard
          item={blend}
          itemType="tobacco"
          moduleKey="pipekeeper"
          valuationSnapshot={tobaccoStrategy}
          valueTrend={valueTrend}
          valueSnapshots={valueSnapshots}
          priceObservations={priceObservations}
          onAddSnapshot={() => setShowSnapshotModal(true)}
          onAddObservation={() => setShowObservationModal(true)}
          onEditValuation={() => setShowEditValuationModal(true)}
          onRefreshNow={handleRefreshValueNow}
          isRefreshing={isRefreshingValue}
        />
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
            <AlertDialogTitle>{t('tobacco.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("auto.pages_TobaccoDetail.this_will_permanently_delete_1e3ibn")} <strong>{blend?.name}</strong>{t("auto.pages_TobaccoDetail.this_action_cannot_be_undone_15oama")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'rgba(180,60,60,0.9)', color: '#fff' }}
            >
              {deleting ? t('common.deleting') : t('common.confirmDelete')}
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
          onSaved={() => { setShowSnapshotModal(false); reloadSnapshots(); toast.success(t("auto.pages_TobaccoDetail.value_checkpoint_saved_1wnagr")); }}
        />
      )}

      {showObservationModal && (
        <AddPriceObservationModal
          itemId={blend.id}
          itemType="tobacco"
          moduleKey="pipekeeper"
          userEmail={userEmail}
          onClose={() => setShowObservationModal(false)}
          onSaved={() => { setShowObservationModal(false); reloadObservations(); toast.success(t("auto.pages_TobaccoDetail.observation_saved_4xbdpg")); }}
        />
      )}

      {showEditValuationModal && (
        <EditTobaccoValuationModal
          blend={blend}
          onClose={() => setShowEditValuationModal(false)}
          onSaved={async (updates) => {
            const merged = { ...blend, ...updates };
            setBlend(merged);
            setShowEditValuationModal(false);
            toast.success(t("auto.pages_TobaccoDetail.valuation_inputs_updated_mda542"));
            // Reload snapshots so Value History reflects the new inputs
            reloadSnapshots();
            queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
            // Recompute value snapshot with new pricing data
            try {
              await refreshItemValue(
                merged,
                'pipekeeper',
                'tobacco',
                userEmail,
                base44,
                { valueHistory: valueSnapshots }
              );
              await reloadSnapshots();
            } catch (refreshErr) {
              console.warn('[TobaccoDetail] valuation refresh after pricing save failed', refreshErr);
            }
          }}
        />
      )}
    </div>
  );
}
