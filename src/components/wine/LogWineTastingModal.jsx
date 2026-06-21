import React, { useEffect, useMemo, useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { sortByLabel } from '@/lib/sorting/alphabetical';

const SERVING_OPTIONS = [
  'standard_glass',
  'decanted',
  'chilled',
  'cellar_temperature',
  'room_temperature',
  'blind_tasting',
  'restaurant_pour',
  'event_tasting',
  'other',
];

const CONTEXT_CHIPS = [
  'dinner',
  'restaurant_bar',
  'friends_house',
  'tasting_event',
  'wine_club',
  'celebration',
  'at_home',
  'other',
];

const WINE_STYLES = ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange', 'other'];

const ACQUISITION_OPTIONS = [
  { value: 'just_log', labelKey: 'wine.acquisitionOptions.just_log' },
  { value: 'add_to_collection', labelKey: 'wine.acquisitionOptions.add_to_collection' },
  { value: 'wishlist', labelKey: 'wine.acquisitionOptions.wishlist' },
  { value: 'shopping_list', labelKey: 'wine.acquisitionOptions.shopping_list' },
  { value: 'not_for_me', labelKey: 'wine.acquisitionOptions.not_for_me' },
];

function RatingSelector({ value, onChange }) {
  const { t } = useTranslation();
  const values = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#E0D8C8]">{t('wine.ratingLabel')}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating === value ? '' : rating)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: value === rating
                ? 'linear-gradient(135deg, rgba(163,92,92,1), rgba(130,65,65,1))'
                : 'rgba(255,255,255,0.05)',
              color: value === rating ? '#fff' : '#F5F1E7',
              border: value === rating
                ? '1px solid rgba(163,92,92,0.9)'
                : '1px solid rgba(180,140,75,0.18)',
            }}
          >
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              {rating}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectedChip({ label, onClear }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(163,92,92,0.15)] border border-[rgba(163,92,92,0.3)] text-xs text-[#C47070]">
      <span className="font-medium truncate max-w-[200px]">{label}</span>
      <button type="button" onClick={onClear} className="shrink-0 hover:text-white">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * LogWineTastingModal — canonical wine tasting modal, parity with WhiskeyKeeper LogTastingModal.
 *
 * Props:
 *  - wine        : prefilled Wine record (from collection / detail page)
 *  - wines       : full collection array (for selector)
 *  - isOpen      : boolean
 *  - onClose     : fn
 *  - onSaved     : fn(savedTasting)
 *  - defaultMode : "collection" | "new" — override starting tab
 */
export default function LogWineTastingModal({
  wine,
  wines = [],
  isOpen = true,
  onClose,
  onSaved,
  defaultMode,
}) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ── source toggle ─────────────────────────────────────────────────────────
  const hasCollection = wines.length > 0 || !!wine;
  const [mode, setMode] = useState(
    defaultMode ?? (hasCollection ? 'collection' : 'new')
  );

  // ── collection mode ────────────────────────────────────────────────────────
  const sortedWines = useMemo(
    () => sortByLabel(wines || [], (w) => w?.name || ''),
    [wines]
  );
  const servingOptions = useMemo(
    () => SERVING_OPTIONS.map((opt) => ({ value: opt, label: t(`wine.servingMethods.${opt}`) })),
    [t]
  );
  const contextOptions = useMemo(
    () => CONTEXT_CHIPS.map((chip) => ({ value: chip, label: t(`wine.contexts.${chip}`) })),
    [t]
  );
  const [selectedWineId, setSelectedWineId] = useState(wine?.id || '');
  const [selectedWineName, setSelectedWineName] = useState(wine?.name || '');

  // ── "something new" fields ────────────────────────────────────────────────
  const [newWine, setNewWine] = useState({
    producer: '',
    name: '',
    vintage: '',
    style: '',
    varietal: '',
    region: '',
    country: '',
  });
  const setNew = (k, v) => setNewWine((p) => ({ ...p, [k]: v }));

  const [acquisitionIntent, setAcquisitionIntent] = useState('just_log');

  // ── shared tasting fields ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    date: today,
    serving_method: 'standard_glass',
    rating: '',
    notes: '',
    aroma_notes: '',
    palate_notes: '',
    finish_notes: '',
    food_pairing: '',
    occasion: '',
    tags: '',
    would_buy_again: false,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const [contextChip, setContextChip] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync prefilled wine when prop changes
  useEffect(() => {
    if (wine?.id) {
      setSelectedWineId(wine.id);
      setSelectedWineName(wine.name || '');
    }
  }, [wine?.id]);

  // Validate and save
  async function handleSave() {
    setError('');

    if (mode === 'collection' && !selectedWineName) {
      setError(t('wine.pleaseSelectCollectionWine'));
      return;
    }
    if (mode === 'new' && !newWine.name && !newWine.producer) {
      setError(t('wine.pleaseEnterWineNameOrProducer'));
      return;
    }

    setSaving(true);

    const tagsArr = form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    if (contextChip) tagsArr.push(contextChip);

    const payload = {
      source_type: mode === 'collection' ? 'collection' : 'out_of_collection',
      date: form.date,
      serving_method: form.serving_method,
      rating: form.rating === '' ? null : Number(form.rating),
      notes: form.notes?.trim() || '',
      aroma_notes: form.aroma_notes?.trim() || '',
      palate_notes: form.palate_notes?.trim() || '',
      finish_notes: form.finish_notes?.trim() || '',
      food_pairing: form.food_pairing?.trim() || '',
      occasion: form.occasion?.trim() || '',
      tags: tagsArr,
      would_buy_again: form.would_buy_again,
      context: contextChip || '',
      created_by: user?.email,
    };

    if (mode === 'collection') {
      if (selectedWineId) payload.wine_id = selectedWineId;
      payload.wine_name = selectedWineName;
    } else {
      // Embed out-of-collection wine metadata directly on tasting
      payload.producer = newWine.producer?.trim() || '';
      payload.wine_name = newWine.name?.trim() || newWine.producer?.trim() || t('wine.unknownWine');
      if (newWine.vintage) payload.vintage = Number(newWine.vintage);
      payload.style = newWine.style || '';
      payload.varietal = newWine.varietal?.trim() || '';
      payload.region = newWine.region?.trim() || '';
      payload.country = newWine.country?.trim() || '';
      payload.acquisition_intent = acquisitionIntent;
    }

    try {
      // 1. Save the tasting record
      const tasting = await base44.entities.WineTasting.create(payload);

      // 2. Handle acquisition intents for "Something New"
      if (mode === 'new') {
        if (acquisitionIntent === 'add_to_collection') {
          // Create a Wine record and link the tasting to it
          const newBottle = await base44.entities.Wine.create({
            name: newWine.name?.trim() || t('wine.unknownWine'),
            producer: newWine.producer?.trim() || '',
            vintage: newWine.vintage ? Number(newWine.vintage) : undefined,
            style: newWine.style || undefined,
            varietal: newWine.varietal?.trim() || undefined,
            region: newWine.region?.trim() || undefined,
            country_of_origin: newWine.country?.trim() || undefined,
            created_by: user?.email,
          });
          // Link tasting to new wine
          if (newBottle?.id) {
            await base44.entities.WineTasting.update(tasting.id, { wine_id: newBottle.id });
          }
        } else if (acquisitionIntent === 'wishlist' || acquisitionIntent === 'shopping_list') {
          await base44.entities.AcquisitionItem.create({
            name: newWine.name?.trim() || newWine.producer?.trim() || t('wine.unknownWine'),
            item_type: 'wine',
            category: acquisitionIntent === 'wishlist' ? 'wishlist' : 'shopping_list',
            brand: newWine.producer?.trim() || '',
            is_manual: true,
            created_by: user?.email,
          }).catch(() => {}); // non-blocking
        } else if (acquisitionIntent === 'not_for_me') {
          // Mark tasting as excluded; update payload field
          await base44.entities.WineTasting.update(tasting.id, { ai_excluded: true }).catch(() => {});
        }
      }

      onSaved?.(tasting);
      onClose?.();
    } catch (e) {
      setError(t('wine.saveTastingFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, rgba(38,22,18,0.98), rgba(24,12,10,1))',
          border: '1px solid rgba(163,92,92,0.24)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-[rgba(163,92,92,0.16)]">
          <div>
            <h2 className="text-xl font-bold text-[#F5F1E7]">{t('wine.logTasting')}</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              {mode === 'collection'
                ? selectedWineName || t('wine.collection')
                : newWine.name || newWine.producer || t('wine.addBottle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5"
            aria-label={t('storyViewer.close')}
          >
            <X className="w-5 h-5 text-[#E0D8C8]" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

          {/* Source toggle */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[#E0D8C8] block">{t('wine.sourceLabel')}</label>
            <div className="flex rounded-xl overflow-hidden border border-[rgba(163,92,92,0.25)]">
              <button
                type="button"
                onClick={() => setMode('collection')}
                className={`flex-1 py-2 text-sm font-medium transition-all ${
                  mode === 'collection'
                    ? 'bg-[rgba(163,92,92,0.25)] text-[#F5F1E7]'
                    : 'bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {t('wine.collection')}
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`flex-1 py-2 text-sm font-medium transition-all ${
                  mode === 'new'
                    ? 'bg-[rgba(163,92,92,0.25)] text-[#F5F1E7]'
                    : 'bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {t('wine.addBottle')}
              </button>
            </div>

            {/* From Collection: wine selector */}
            {mode === 'collection' && (
              sortedWines.length > 0 ? (
                <select
                  value={selectedWineId}
                  onChange={(e) => {
                    const selected = sortedWines.find((w) => w.id === e.target.value);
                    setSelectedWineId(e.target.value);
                    setSelectedWineName(selected?.name || '');
                  }}
                  className="w-full rounded-xl px-3 py-2.5 bg-[rgba(20,15,12,0.6)] border border-[rgba(130,65,65,0.28)] text-[#F5F1E7] text-sm"
                >
                  <option value="" className="bg-[#1A120D]">{t('wine.collection')}</option>
                  {sortedWines.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#1A120D]">
                      {w.name}{w.vintage ? ` (${w.vintage})` : ''}
                    </option>
                  ))}
                </select>
              ) : wine?.name ? (
                <SelectedChip label={wine.name} onClear={() => { setSelectedWineId(''); setSelectedWineName(''); }} />
              ) : (
                <p className="text-xs py-2" style={{ color: 'rgba(224,216,200,0.45)' }}>
                  {t('wine.addWinesForInsights')}
                </p>
              )
            )}

            {/* Something New: quick entry fields */}
            {mode === 'new' && (
              <div className="space-y-3 rounded-xl p-4" style={{ background: 'rgba(163,92,92,0.06)', border: '1px solid rgba(163,92,92,0.14)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t("auto.components_wine_LogWineTastingModal.producer_winery_1g9wqi")}</label>
                    <Input
                      value={newWine.producer}
                      onChange={(e) => setNew('producer', e.target.value)}
                      placeholder={t('wine.wineryPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.name')}</label>
                    <Input
                      value={newWine.name}
                      onChange={(e) => setNew('name', e.target.value)}
                      placeholder={t('wine.name')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.vintage')}</label>
                    <Input
                      type="number"
                      value={newWine.vintage}
                      onChange={(e) => setNew('vintage', e.target.value)}
                      placeholder="2019"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.style')}</label>
                    <select
                      value={newWine.style}
                      onChange={(e) => setNew('style', e.target.value)}
                      className="w-full rounded-lg px-3 py-2.5 bg-[rgba(20,15,12,0.6)] border border-[rgba(130,65,65,0.28)] text-[#F5F1E7] text-sm"
                    >
                      <option value="" className="bg-[#1A120D]">{t('wine.style')}</option>
                      {WINE_STYLES.map((s) => (
                        <option key={s} value={s} className="bg-[#1A120D]">{t(`wine.styles.${s}`, s)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.varietal')}</label>
                    <Input
                      value={newWine.varietal}
                      onChange={(e) => setNew('varietal', e.target.value)}
                      placeholder={t("auto.components_wine_LogWineTastingModal.pinot_noir_exqf53")}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.region')}</label>
                    <Input
                      value={newWine.region}
                      onChange={(e) => setNew('region', e.target.value)}
                      placeholder={t("auto.components_wine_LogWineTastingModal.burgundy_19n53s")}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.country')}</label>
                    <Input
                      value={newWine.country}
                      onChange={(e) => setNew('country', e.target.value)}
                      placeholder={t("auto.components_wine_LogWineTastingModal.france_1ds9zi")}
                    />
                  </div>
                </div>

                {/* Acquisition intent */}
                <div>
                  <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-2">{t('wine.wantList')}</label>
                  <div className="flex flex-wrap gap-2">
                    {ACQUISITION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAcquisitionIntent(opt.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: acquisitionIntent === opt.value
                            ? 'rgba(163,92,92,0.28)'
                            : 'rgba(255,255,255,0.05)',
                          color: acquisitionIntent === opt.value ? '#F5F1E7' : 'rgba(224,216,200,0.6)',
                          border: acquisitionIntent === opt.value
                            ? '1px solid rgba(163,92,92,0.5)'
                            : '1px solid rgba(180,140,75,0.15)',
                        }}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date + Serving */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#E0D8C8] block mb-2">{t('wine.tastingDate')}</label>
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#E0D8C8] block mb-2">{t('wine.servingMethodLabel')}</label>
              <select
                value={form.serving_method}
                onChange={(e) => set('serving_method', e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.18)] text-[#F5F1E7]"
              >
                {servingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1A120D]">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating */}
          <RatingSelector value={form.rating} onChange={(r) => set('rating', r)} />

          {/* Main tasting notes */}
          <div>
            <label className="text-sm font-medium text-[#E0D8C8] block mb-2">{t('wine.tastingNotes')}</label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder={t('wine.tastingNotesPlaceholder')}
              className="min-h-[100px]"
            />
          </div>

          {/* Structured notes (collapsible feel — always visible but compact) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.aromaNotes')}</label>
              <Input
                value={form.aroma_notes}
                onChange={(e) => set('aroma_notes', e.target.value)}
                placeholder={t('wine.aromaPlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.palatNotes')}</label>
              <Input
                value={form.palate_notes}
                onChange={(e) => set('palate_notes', e.target.value)}
                placeholder={t('wine.palateNotesPlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.finishNotes')}</label>
              <Input
                value={form.finish_notes}
                onChange={(e) => set('finish_notes', e.target.value)}
                placeholder={t('wine.finishNotesPlaceholder')}
              />
            </div>
          </div>

          {/* Pairing + Occasion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.foodPairing')}</label>
              <Input
                value={form.food_pairing}
                onChange={(e) => set('food_pairing', e.target.value)}
                placeholder={t('wine.foodPairingPlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#E0D8C8]/70 block mb-1">{t('wine.occasion')}</label>
              <Input
                value={form.occasion}
                onChange={(e) => set('occasion', e.target.value)}
                placeholder={t('wine.occasionPlaceholder')}
              />
            </div>
          </div>

          {/* Context chips */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E0D8C8] block">{t('wine.context')}</label>
            <div className="flex flex-wrap gap-2">
              {contextOptions.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setContextChip(contextChip === chip.value ? '' : chip.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: contextChip === chip.value
                      ? 'rgba(163,92,92,0.25)'
                      : 'rgba(255,255,255,0.05)',
                    color: contextChip === chip.value ? '#F5F1E7' : 'rgba(224,216,200,0.6)',
                    border: contextChip === chip.value
                      ? '1px solid rgba(163,92,92,0.45)'
                      : '1px solid rgba(180,140,75,0.15)',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-[#E0D8C8] block mb-2">{t('common.tags')}</label>
            <Input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder={t('wine.tagsPlaceholder')}
            />
          </div>

          {/* Would buy again */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.would_buy_again}
              onChange={(e) => set('would_buy_again', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'rgba(224,216,200,0.8)' }}>{t('wine.wouldBuyAgainLabel')}</span>
          </label>

          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-[#F5F1E7] bg-red-500/15 border border-red-400/20">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-[rgba(163,92,92,0.16)] flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSave}
            disabled={
              saving ||
              (mode === 'collection' && !selectedWineName) ||
              (mode === 'new' && !newWine.name && !newWine.producer)
            }
            style={{
              background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(130,65,65,1))',
              color: '#fff',
            }}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.saving')}
              </span>
            ) : t('wine.saveTasting')}
          </Button>
        </div>
      </div>
    </div>
  );
}