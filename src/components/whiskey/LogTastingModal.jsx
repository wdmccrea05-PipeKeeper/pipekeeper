import React, { useEffect, useMemo, useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ExternalItemSearch from '@/components/session/ExternalItemSearch';
import ExternalItemManualEntry from '@/components/session/ExternalItemManualEntry';
import SessionContextTags from '@/components/session/SessionContextTags';
import PostSessionPrompt from '@/components/session/PostSessionPrompt';

const SERVING_OPTIONS = ['Neat', 'With Ice', 'With Water', 'Cocktail', 'Other'];

function RatingSelector({ value, onChange }) {
  const values = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#E0D8C8]">Rating</p>
      <div className="flex flex-wrap gap-2">
        {values.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: value === rating
                ? 'linear-gradient(135deg, rgba(196,122,58,1), rgba(160,95,40,1))'
                : 'rgba(255,255,255,0.05)',
              color: value === rating ? '#1A120D' : '#F5F1E7',
              border: value === rating ? '1px solid rgba(196,122,58,0.9)' : '1px solid rgba(180,140,75,0.18)',
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

function ExternalChip({ label, onClear }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(180,140,75,0.15)] border border-[rgba(180,140,75,0.3)] text-xs text-[#D4A574]">
      <span className="font-medium truncate max-w-[200px]">{label}</span>
      <button type="button" onClick={onClear} className="shrink-0 hover:text-white">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function LogTastingModal({ bottle, bottles = [], editLog = null, onClose, onSaved, onDeleted, isOpen = true }) {
  const isEdit = Boolean(editLog);

  const initialDate = useMemo(() => {
    if (editLog?.tasting_date) return String(editLog.tasting_date).slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }, [editLog]);

  const [bottleMode, setBottleMode] = useState("collection");
  const [externalBottle, setExternalBottle] = useState(null);
  const [showBottleManual, setShowBottleManual] = useState(false);
  const [contextTag, setContextTag] = useState('');
  const [postPromptItems, setPostPromptItems] = useState(null);

  const [form, setForm] = useState({
    bottle_id: bottle?.id || editLog?.bottle_id || '',
    bottle_name: bottle?.name || editLog?.bottle_name || '',
    tasting_date: initialDate,
    rating: editLog?.rating ?? '',
    notes: editLog?.notes || '',
    serving_method: editLog?.serving_method || 'Neat',
    tags: Array.isArray(editLog?.tags) ? editLog.tags.join(', ') : editLog?.tags || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bottle) {
      setForm((prev) => ({
        ...prev,
        bottle_id: bottle.id || prev.bottle_id,
        bottle_name: bottle.name || prev.bottle_name,
      }));
    }
  }, [bottle?.id]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    // Validate — require bottle_name; bottle_id is optional (pre-filled bottles may lack id)
    if (bottleMode === "collection" && !form.bottle_name) {
      setError('Please select a bottle from your collection.');
      return;
    }
    if (bottleMode === "external" && !externalBottle) {
      setError('Please search for or add the bottle you tasted.');
      return;
    }

    setSaving(true);
    setError('');

    const bottleName = bottleMode === "collection" ? form.bottle_name : (externalBottle.name || "External Bottle");

    const tagsArr = form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    if (contextTag) tagsArr.push(contextTag);

    const payload = {
      ...(bottleMode === "collection" && form.bottle_id ? { bottle_id: form.bottle_id } : {}),
      bottle_name: bottleName,
      tasting_date: form.tasting_date,
      rating: form.rating === '' ? null : Number(form.rating),
      notes: form.notes?.trim() || '',
      serving_method: form.serving_method || 'Neat',
      tags: tagsArr,
    };

    try {
      let saved;
      if (isEdit && editLog?.id) {
        saved = await base44.entities.TastingLog.update(editLog.id, payload);
      } else {
        saved = await base44.entities.TastingLog.create(payload);
      }
      onSaved?.(saved);

      // Post-prompt for external bottles
      if (bottleMode === "external" && externalBottle && !isEdit) {
        setPostPromptItems([{
          label: externalBottle.name || "External Bottle",
          item_type: "bottle",
          itemData: externalBottle,
        }]);
      } else {
        onClose?.();
      }
    } catch (e) {
      console.error('[LogTastingModal] save failed', e);
      setError('Unable to save tasting. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {postPromptItems && (
        <PostSessionPrompt
          externalItems={postPromptItems}
          onDone={() => { setPostPromptItems(null); onClose?.(); }}
        />
      )}

      {!postPromptItems && (
        <div className="fixed inset-0 z-[1200] bg-black/70 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(24,16,12,1))',
              border: '1px solid rgba(180,140,75,0.24)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
            }}
          >
            {/* Header */}
            <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-[rgba(180,140,75,0.16)]">
              <div>
                <h2 className="text-xl font-bold text-[#F5F1E7]">
                  {isEdit ? 'Edit Tasting' : 'Log Whiskey Tasting'}
                </h2>
                <p className="text-sm text-[#D8C7A6]/75 mt-1">
                  {bottleMode === "external" && externalBottle ? externalBottle.name : (form.bottle_name || 'Select a bottle')}
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/5" aria-label="Close">
                <X className="w-5 h-5 text-[#E0D8C8]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

              {/* Bottle Source Segmented Control */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-[#E0D8C8] block mb-2">Bottle Source</label>
                  {!isEdit && (
                    <div className="flex rounded-xl overflow-hidden border border-[rgba(180,140,75,0.25)]">
                      <button
                        type="button"
                        onClick={() => { setBottleMode("collection"); setExternalBottle(null); updateField('bottle_id', ''); updateField('bottle_name', ''); }}
                        className={`flex-1 py-2 text-sm font-medium transition-all ${
                          bottleMode === "collection"
                            ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                            : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                        }`}
                      >
                        From Collection
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBottleMode("external"); updateField('bottle_id', ''); updateField('bottle_name', ''); }}
                        className={`flex-1 py-2 text-sm font-medium transition-all ${
                          bottleMode === "external"
                            ? "bg-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
                            : "bg-transparent text-[#E0D8C8]/60 hover:bg-[rgba(255,255,255,0.05)]"
                        }`}
                      >
                        Something New
                      </button>
                    </div>
                  )}
                </div>

                {bottleMode === "collection" ? (
                  bottles.length > 0 ? (
                    <select
                      value={form.bottle_id}
                      onChange={(e) => {
                        const selected = bottles.find((b) => b.id === e.target.value);
                        updateField('bottle_id', e.target.value);
                        updateField('bottle_name', selected?.name || '');
                      }}
                      className="w-full rounded-xl px-3 py-2.5 bg-[rgba(20,15,12,0.6)] border border-[rgba(140,105,65,0.28)] text-[#F5F1E7] text-sm"
                    >
                      <option value="" className="bg-[#1A120D]">Select a bottle...</option>
                      {bottles.map((b) => (
                        <option key={b.id} value={b.id} className="bg-[#1A120D]">{b.name}</option>
                      ))}
                    </select>
                  ) : form.bottle_name ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(180,140,75,0.15)] border border-[rgba(180,140,75,0.3)] text-xs text-[#D4A574]">
                      <span className="font-medium">{form.bottle_name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#E0D8C8]/50 py-2">No bottles in your collection yet. Switch to "Something New" to log an external pour.</p>
                  )
                ) : externalBottle ? (
                  <ExternalChip label={externalBottle.name || "External Bottle"} onClear={() => { setExternalBottle(null); setShowBottleManual(false); }} />
                ) : showBottleManual ? (
                  <ExternalItemManualEntry
                    itemType="bottle"
                    onCancel={() => setShowBottleManual(false)}
                    onSave={(item) => { setExternalBottle(item); setShowBottleManual(false); }}
                  />
                ) : (
                  <>
                    <ExternalItemSearch itemType="bottle" onSelect={setExternalBottle} onManualAdd={() => setShowBottleManual(true)} />
                    <p className="text-xs text-amber-400/80 mt-1">Select a search result or add the item manually to continue.</p>
                  </>
                )}
              </div>

              {/* Date + Serving */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#E0D8C8] block mb-2">Tasting Date</label>
                  <Input type="date" value={form.tasting_date} onChange={(e) => updateField('tasting_date', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#E0D8C8] block mb-2">Serving Method</label>
                  <select
                    value={form.serving_method}
                    onChange={(e) => updateField('serving_method', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.18)] text-[#F5F1E7]"
                  >
                    {SERVING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#1A120D]">{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <RatingSelector value={form.rating} onChange={(rating) => updateField('rating', rating)} />

              <div>
                <label className="text-sm font-medium text-[#E0D8C8] block mb-2">Tasting Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="What stood out? Aroma, palate, finish, balance, pairing, etc."
                  className="min-h-[120px]"
                />
              </div>

              <SessionContextTags value={contextTag} onChange={setContextTag} />

              <div>
                <label className="text-sm font-medium text-[#E0D8C8] block mb-2">Tags</label>
                <Input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="dessert, oak, citrus, special occasion" />
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2 text-sm text-[#F5F1E7] bg-red-500/15 border border-red-400/20">{error}</div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-[rgba(180,140,75,0.16)] flex gap-3">
              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={async () => {
                    if (!confirm('Delete this tasting log?')) return;
                    await base44.entities.TastingLog.delete(editLog.id);
                    onDeleted?.();
                    onClose?.();
                  }}
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleSave}
                disabled={saving || (bottleMode === "collection" && !form.bottle_name) || (bottleMode === "external" && !externalBottle)}
                style={{ background: 'linear-gradient(135deg, rgba(196,122,58,1), rgba(160,95,40,1))', color: '#1A120D' }}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span>
                ) : isEdit ? 'Update Tasting' : 'Save Tasting'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}