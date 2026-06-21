import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/components/i18n/safeTranslation';

const DEFAULT_VALUATION_FORM = {
  purchase_price: '',
  purchase_price_type: 'total_paid',
  estimated_unit_value: '',
  estimated_total_value: '',
  replacement_cost_estimate: '',
  valuation_source: '',
  valuation_confidence: '',
  valuation_notes: '',
  valuation_updated_at: '',
  manual_valuation_override: '',
  manual_valuation_enabled: false,
};

function toInputNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function CigarValuationModal({ open, onOpenChange, cigar, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_VALUATION_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !cigar) return;
    const valuationDate = cigar.valuation_updated_at
      ? new Date(cigar.valuation_updated_at).toISOString().slice(0, 10)
      : '';

    setForm({
      purchase_price: toInputNumber(cigar.purchase_price),
      purchase_price_type: cigar.purchase_price_type || 'total_paid',
      estimated_unit_value: toInputNumber(cigar.estimated_unit_value ?? cigar.estimated_value),
      estimated_total_value: toInputNumber(cigar.estimated_total_value),
      replacement_cost_estimate: toInputNumber(cigar.replacement_cost_estimate),
      valuation_source: cigar.valuation_source || '',
      valuation_confidence: cigar.valuation_confidence || '',
      valuation_notes: cigar.valuation_notes || '',
      valuation_updated_at: valuationDate,
      manual_valuation_override: toInputNumber(cigar.manual_valuation_override),
      manual_valuation_enabled: Boolean(cigar.manual_valuation_enabled),
    });
  }, [open, cigar]);

  const setField = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!cigar?.id || typeof onSave !== 'function') return;
    setSaving(true);
    try {
      const valuationUpdatedAt = form.valuation_updated_at
        ? new Date(`${form.valuation_updated_at}T12:00:00.000Z`).toISOString()
        : new Date().toISOString();

      const estimatedUnit = toNullableNumber(form.estimated_unit_value);
      const payload = {
        purchase_price: toNullableNumber(form.purchase_price),
        purchase_price_type: form.purchase_price_type || null,
        estimated_unit_value: estimatedUnit,
        estimated_value: estimatedUnit, // legacy compatibility
        estimated_total_value: toNullableNumber(form.estimated_total_value),
        replacement_cost_estimate: toNullableNumber(form.replacement_cost_estimate),
        valuation_source: form.valuation_source?.trim() || null,
        valuation_confidence: form.valuation_confidence || null,
        valuation_notes: form.valuation_notes?.trim() || null,
        valuation_updated_at: valuationUpdatedAt,
        manual_valuation_override: toNullableNumber(form.manual_valuation_override),
        manual_valuation_enabled: Boolean(form.manual_valuation_enabled),
      };

      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('cigars.valuation.manageValuation')}</DialogTitle>
          <DialogDescription>
            {t('cigars.valuation.manageValuationDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="ck-field-label">{t('cigars.valuation.purchasePrice')}</label>
            <Input type="number" value={form.purchase_price} onChange={setField('purchase_price')} placeholder="0.00" />
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.purchasePriceType')}</label>
            <Select value={form.purchase_price_type || undefined} onValueChange={setField('purchase_price_type')}>
              <SelectTrigger><SelectValue placeholder={t('cigars.valuation.selectType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">{t('cigars.valuation.typeSingle')}</SelectItem>
                <SelectItem value="pack">{t('cigars.valuation.typePack')}</SelectItem>
                <SelectItem value="box">{t('cigars.valuation.typeBox')}</SelectItem>
                <SelectItem value="bundle">{t('cigars.valuation.typeBundle')}</SelectItem>
                <SelectItem value="total_paid">{t('cigars.valuation.typeTotal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.estimatedUnitValue')}</label>
            <Input type="number" value={form.estimated_unit_value} onChange={setField('estimated_unit_value')} placeholder="0.00" />
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.estimatedTotalValue')}</label>
            <Input type="number" value={form.estimated_total_value} onChange={setField('estimated_total_value')} placeholder="0.00" />
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.replacementCostEstimate')}</label>
            <Input type="number" value={form.replacement_cost_estimate} onChange={setField('replacement_cost_estimate')} placeholder="0.00" />
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.valuationDate')}</label>
            <Input type="date" value={form.valuation_updated_at} onChange={setField('valuation_updated_at')} />
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.valuationSource')}</label>
            <Input value={form.valuation_source} onChange={setField('valuation_source')} placeholder={t('cigars.valuation.valuationSourcePlaceholder')} />
          </div>
          <div>
            <label className="ck-field-label">{t('cigars.valuation.valuationConfidence')}</label>
            <Select value={form.valuation_confidence || undefined} onValueChange={setField('valuation_confidence')}>
              <SelectTrigger><SelectValue placeholder={t('cigars.valuation.selectConfidence')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('cigars.valuation.confidenceHigh')}</SelectItem>
                <SelectItem value="medium">{t('cigars.valuation.confidenceMedium')}</SelectItem>
                <SelectItem value="low">{t('cigars.valuation.confidenceLow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="ck-field-label">{t('cigars.valuation.valuationNotes')}</label>
            <Textarea value={form.valuation_notes} onChange={setField('valuation_notes')} rows={3} placeholder={t('cigars.valuation.valuationNotesPlaceholder')} />
          </div>
          <div className="sm:col-span-2 rounded-xl px-3 py-3 border border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.02)]">
            <label className="flex items-center gap-2 text-sm text-[#F5F1E7]">
              <input
                type="checkbox"
                checked={form.manual_valuation_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, manual_valuation_enabled: e.target.checked }))}
              />
              {t('cigars.valuation.enableManualOverride')}
            </label>
            {form.manual_valuation_enabled && (
              <div className="mt-3">
                <label className="ck-field-label">{t('cigars.valuation.manualOverrideValue')}</label>
                <Input type="number" value={form.manual_valuation_override} onChange={setField('manual_valuation_override')} placeholder="0.00" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('cigars.valuation.saving') : t('cigars.valuation.saveValuation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

