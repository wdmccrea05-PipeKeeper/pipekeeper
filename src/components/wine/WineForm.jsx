import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhotoUploader from '@/components/PhotoUploader';

const SIZES = ['375ml', '500ml', '750ml', '1L', '1.5L', '3L', 'Other'];
const STYLES = ['dessert', 'fortified', 'orange', 'red', 'rosé', 'sparkling', 'white', 'other'];

function Field({ label, children }) {
  return (
    <div>
      <label className="ck-field-label">{label}</label>
      {children}
    </div>
  );
}

export default function WineForm({ wine, onSaved, onCancel }) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const isEdit = !!wine?.id;

  const [form, setForm] = useState({
    name: wine?.name || '',
    producer: wine?.producer || '',
    vintage: wine?.vintage || '',
    region: wine?.region || '',
    country: wine?.country || '',
    appellation: wine?.appellation || '',
    varietal: wine?.varietal || '',
    style: wine?.style || 'red',
    bottle_size: wine?.bottle_size || '750ml',
    quantity: wine?.quantity ?? 1,
    purchase_price: wine?.purchase_price || '',
    estimated_value: wine?.estimated_value || '',
    manual_valuation_enabled: wine?.manual_valuation_enabled || false,
    manual_estimated_value: wine?.manual_estimated_value || '',
    drinking_window_start: wine?.drinking_window_start || '',
    drinking_window_end: wine?.drinking_window_end || '',
    cellar_location: wine?.cellar_location || '',
    rating: wine?.rating || 0,
    notes: wine?.notes || '',
    is_favorite: wine?.is_favorite || false,
    photos: wine?.photos || [],
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.producer) return;
    setSaving(true);
    const payload = {
      ...form,
      vintage: form.vintage ? Number(form.vintage) : undefined,
      quantity: Number(form.quantity) || 1,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      manual_estimated_value: form.manual_estimated_value ? Number(form.manual_estimated_value) : undefined,
      created_by: user?.email,
    };
    if (isEdit) {
      await base44.entities.Wine.update(wine.id, payload);
    } else {
      await base44.entities.Wine.create(payload);
    }
    setSaving(false);
    onSaved?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>
        {isEdit ? t('wine.editBottle') : t('wine.addBottle')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('wine.name') + ' *'}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g., Château Margaux" />
        </Field>
        <Field label={t('wine.producer') + ' *'}>
          <Input value={form.producer} onChange={(e) => set('producer', e.target.value)} required placeholder="e.g., Château Margaux" />
        </Field>
        <Field label={t('wine.vintage')}>
          <Input type="number" value={form.vintage} onChange={(e) => set('vintage', e.target.value)} placeholder="e.g., 2018" min={1800} max={new Date().getFullYear()} />
        </Field>
        <Field label={t('wine.style')}>
          <select
            value={form.style}
            onChange={(e) => set('style', e.target.value)}
            className="flex h-11 w-full rounded-xl px-4 text-base"
            style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
          >
            {STYLES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Field>
        <Field label={t('wine.region')}>
          <Input value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="e.g., Bordeaux, Napa Valley" />
        </Field>
        <Field label={t('wine.country')}>
          <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="e.g., France, USA" />
        </Field>
        <Field label={t('wine.appellation')}>
          <Input value={form.appellation} onChange={(e) => set('appellation', e.target.value)} placeholder="e.g., Margaux AOC" />
        </Field>
        <Field label={t('wine.varietal')}>
          <Input value={form.varietal} onChange={(e) => set('varietal', e.target.value)} placeholder="e.g., Cabernet Sauvignon" />
        </Field>
        <Field label={t('wine.bottleSize')}>
          <select
            value={form.bottle_size}
            onChange={(e) => set('bottle_size', e.target.value)}
            className="flex h-11 w-full rounded-xl px-4 text-base"
            style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
          >
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label={t('wine.quantity')}>
          <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} min={0} />
        </Field>
        <Field label={t('wine.purchasePrice')}>
          <Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label={t('wine.estimatedValue')}>
          <Input type="number" step="0.01" value={form.estimated_value} onChange={(e) => set('estimated_value', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label={t('wine.drinkingWindowStart')}>
          <Input type="date" value={form.drinking_window_start} onChange={(e) => set('drinking_window_start', e.target.value)} />
        </Field>
        <Field label={t('wine.drinkingWindowEnd')}>
          <Input type="date" value={form.drinking_window_end} onChange={(e) => set('drinking_window_end', e.target.value)} />
        </Field>
        <Field label={t('wine.cellarLocation')}>
          <Input value={form.cellar_location} onChange={(e) => set('cellar_location', e.target.value)} placeholder="e.g., Rack A, Shelf 2" />
        </Field>
        <Field label={t('wine.rating')}>
          <Input type="number" value={form.rating} onChange={(e) => set('rating', Number(e.target.value))} min={0} max={5} step={0.5} />
        </Field>
      </div>

      {/* Manual valuation override */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'rgba(42,28,20,0.6)', border: '1px solid rgba(180,140,75,0.2)' }}
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.manual_valuation_enabled}
            onChange={(e) => set('manual_valuation_enabled', e.target.checked)}
          />
          <span className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.9)' }}>
            {t('wine.manualValuationOverride')}
          </span>
        </label>
        {form.manual_valuation_enabled && (
          <Field label={t('wine.manualEstimatedValue')}>
            <Input
              type="number"
              step="0.01"
              value={form.manual_estimated_value}
              onChange={(e) => set('manual_estimated_value', e.target.value)}
              placeholder="0.00"
            />
          </Field>
        )}
      </div>

      {/* Photo upload */}
      <div>
        <label className="ck-field-label">{t('wine.photos')}</label>
        <PhotoUploader
          existingPhotos={form.photos}
          onPhotosSelected={(photos) => set('photos', photos)}
          maxPhotos={6}
          recordType="bottle"
        />
      </div>

      <Field label={t('common.notes')}>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder={t('wine.notesPlaceholder')}
          className="flex w-full rounded-xl px-4 py-2.5 text-base resize-none"
          style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
        />
      </Field>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={form.is_favorite} onChange={(e) => set('is_favorite', e.target.checked)} />
        <span className="text-sm" style={{ color: 'rgba(224,216,200,0.8)' }}>{t('wine.markFavorite')}</span>
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} style={{ background: '#8B3A3A', color: '#F5F1E7' }}>
          {saving ? t('common.saving') : isEdit ? t('wine.saveBottle') : t('wine.addBottle')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}