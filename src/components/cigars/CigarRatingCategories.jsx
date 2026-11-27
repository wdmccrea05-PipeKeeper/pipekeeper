import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Plus, Trash2 } from 'lucide-react';
import {
  RATING_CATEGORIES,
  averageCategoryRating,
  normalizeRating,
  sortRatingsNewestFirst,
} from '@/lib/cigars/cigarRatings';

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(180,140,75,0.25)',
  color: '#F5F1E7',
};

function asList(result) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.items) ? result.items : [];
}

function todayYmd() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function emptyDraft() {
  const draft = { rated_at: todayYmd(), observations: '' };
  RATING_CATEGORIES.forEach((category) => {
    draft[category.key] = '';
  });
  return draft;
}

/**
 * Structured, dated cigar ratings.
 *
 * Every category is optional, and each save appends a new dated observation, so
 * the earlier ratings stay in the record's history.
 */
export default function CigarRatingCategories({ cigar, userEmail }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    if (!cigar?.id) return;
    setLoading(true);
    const result = await base44.entities.CigarRating.filter(
      { cigar_id: cigar.id },
      { sort: '-rated_at', limit: 100 }
    ).catch(() => []);
    setRatings(asList(result));
    setLoading(false);
  }, [cigar?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const history = useMemo(() => sortRatingsNewestFirst(ratings).map(normalizeRating), [ratings]);

  const handleSave = async () => {
    if (!cigar?.id) return;
    const payload = {
      cigar_id: cigar.id,
      cigar_name: cigar.name || null,
      rated_at: draft.rated_at || todayYmd(),
      observations: draft.observations || null,
      created_by: userEmail || null,
    };
    RATING_CATEGORIES.forEach((category) => {
      const value = draft[category.key];
      payload[category.key] = value === '' ? null : Number(value);
    });
    setSaving(true);
    try {
      await base44.entities.CigarRating.create(payload);
      setDraft(emptyDraft());
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ratingId) => {
    await base44.entities.CigarRating.delete(ratingId);
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>Structured ratings</p>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {history.length
              ? `${history.length} dated observation${history.length === 1 ? '' : 's'} recorded`
              : 'Every category is optional — record only what you observed.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? 'Cancel' : 'Add rating'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.2)' }}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key}>
                <label className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {category.label}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="5"
                  step="0.5"
                  value={draft[category.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [category.key]: e.target.value }))}
                  placeholder="—"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[160px,1fr]">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>
                Date
              </label>
              <Input
                type="date"
                value={draft.rated_at}
                onChange={(e) => setDraft((d) => ({ ...d, rated_at: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>
                Observations
              </label>
              <Textarea
                className="resize-none"
                rows={2}
                value={draft.observations}
                onChange={(e) => setDraft((d) => ({ ...d, observations: e.target.value }))}
                placeholder="What you noticed about construction, draw, burn, aroma and flavor"
                style={inputStyle}
              />
            </div>
          </div>
          <Button className="mt-2 w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save rating'}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>Loading ratings…</p>
      ) : history.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>No structured ratings recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((rating) => {
            const average = averageCategoryRating(rating);
            return (
              <div
                key={rating.id || `${rating.rated_at}-${average}`}
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.16)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>
                      {rating.rated_at || 'Undated'}
                      {average !== null ? ` · ${average}/5 average` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {RATING_CATEGORIES.filter((category) => rating.categories[category.key] !== null).map((category) => (
                        <span key={category.key} className="text-[11px]" style={{ color: 'rgba(224,216,200,0.7)' }}>
                          <Star className="mr-0.5 inline h-3 w-3" style={{ color: '#D4A574' }} />
                          {category.label} {rating.categories[category.key]}
                        </span>
                      ))}
                    </div>
                    {rating.observations && (
                      <p className="mt-1 text-[11px]" style={{ color: 'rgba(224,216,200,0.6)' }}>{rating.observations}</p>
                    )}
                  </div>
                  {rating.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(rating.id)}
                      className="shrink-0 rounded-lg p-1.5 hover:bg-white/10"
                      aria-label="Delete rating"
                      style={{ color: 'rgba(224,216,200,0.5)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}