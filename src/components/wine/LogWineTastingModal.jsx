import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function Field({ label, children }) {
  return (
    <div>
      <label className="ck-field-label">{label}</label>
      {children}
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-2xl transition-opacity hover:opacity-80"
          style={{ color: star <= value ? '#C47070' : 'rgba(224,216,200,0.25)' }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function LogWineTastingModal({ wine, isOpen, onClose, onSaved }) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: today,
    rating: 0,
    notes: '',
    aroma_notes: '',
    palate_notes: '',
    finish_notes: '',
    food_pairing: '',
    occasion: '',
    would_buy_again: false,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.WineTasting.create({
      ...form,
      wine_id: wine.id,
      wine_name: wine.name,
      created_by: user?.email,
    });
    setSaving(false);
    onSaved?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(28,18,12,0.98)', border: '1px solid rgba(139,58,58,0.35)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#F5F1E7' }}>
            {t('wine.logTasting', 'Log Tasting')}
            {wine?.name && <span className="ml-2 text-sm font-normal" style={{ color: 'rgba(224,216,200,0.55)' }}>— {wine.name}</span>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Field label={t('wine.tastingDate', 'Date')}>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
          </Field>

          <Field label={t('wine.rating', 'Rating')}>
            <StarRating value={form.rating} onChange={(v) => set('rating', v)} />
          </Field>

          <Field label={t('wine.aromaNotes', 'Aroma / Nose')}>
            <Input value={form.aroma_notes} onChange={(e) => set('aroma_notes', e.target.value)} placeholder={t('wine.aromaPlaceholder', 'Floral, earthy, fruity…')} />
          </Field>
          <Field label={t('wine.palatNotes', 'Palate')}>
            <Input value={form.palate_notes} onChange={(e) => set('palate_notes', e.target.value)} placeholder={t('wine.palateNotesPlaceholder', 'Tannins, acidity, body…')} />
          </Field>
          <Field label={t('wine.finishNotes', 'Finish')}>
            <Input value={form.finish_notes} onChange={(e) => set('finish_notes', e.target.value)} placeholder={t('wine.finishNotesPlaceholder', 'Long, short, bitter, smooth…')} />
          </Field>
          <Field label={t('wine.foodPairing', 'Food Pairing')}>
            <Input value={form.food_pairing} onChange={(e) => set('food_pairing', e.target.value)} placeholder={t('wine.foodPairingPlaceholder', 'e.g., lamb, cheese, chocolate')} />
          </Field>
          <Field label={t('wine.occasion', 'Occasion')}>
            <Input value={form.occasion} onChange={(e) => set('occasion', e.target.value)} placeholder={t('wine.occasionPlaceholder', 'e.g., dinner, celebration')} />
          </Field>

          <Field label={t('common.notes', 'Notes')}>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder={t('wine.tastingNotesPlaceholder', 'Overall impression…')}
              className="flex w-full rounded-xl px-4 py-2.5 text-base resize-none"
              style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
            />
          </Field>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.would_buy_again} onChange={(e) => set('would_buy_again', e.target.checked)} />
            <span className="text-sm" style={{ color: 'rgba(224,216,200,0.8)' }}>{t('wine.wouldBuyAgain', 'Would buy again')}</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} style={{ background: '#8B3A3A', color: '#F5F1E7' }}>
              {saving ? t('common.saving') : t('wine.saveTasting', 'Save Tasting')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}