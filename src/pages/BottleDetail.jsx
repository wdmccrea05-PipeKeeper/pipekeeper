import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Star, MapPin, Calendar, DollarSign, Tag, FlaskConical, TrendingUp, Sparkles, BarChart2, BookOpen, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import LogTastingModal from '@/components/whiskey/LogTastingModal';
import { toast } from 'sonner';

function getBottlePhoto(bottle) {
  if (!bottle) return null;
  // Check photos array first, then singular fields
  if (Array.isArray(bottle.photos) && bottle.photos.length > 0) return bottle.photos[0];
  return (
    bottle.photo ||
    bottle.image ||
    bottle.image_url ||
    bottle.thumbnail ||
    bottle.thumbnail_url ||
    null
  );
}

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,140,75,0.14)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(180,140,75,0.12)',
            border: '1px solid rgba(180,140,75,0.18)',
          }}
        >
          <Icon className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.92)' }} />
        </div>
        <div className="min-w-0">
          <p
            className="text-xs uppercase tracking-wider mb-1"
            style={{ color: 'rgba(180,140,75,0.72)' }}
          >
            {label}
          </p>
          <p className="text-sm text-[#F5F1E7] break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function BottleDetail() {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const { user } = useCurrentUser();
   const queryClient = useQueryClient();
   const [searchParams] = useSearchParams();

   const [bottle, setBottle] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [showTastingLog, setShowTastingLog] = useState(false);
   const [editingTastingLog, setEditingTastingLog] = useState(null);

  const bottleId = useMemo(() => {
    const raw = searchParams.get('id') || searchParams.get('bottleId') || '';
    return raw.trim();
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadBottle() {
      if (!bottleId) {
        setError(t('whiskey.invalidBottleId', 'Invalid bottle id.'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        let record = null;

        try {
          record = await base44.entities.Bottle.get(bottleId);
        } catch {
          const found = await base44.entities.Bottle.filter({ id: bottleId });
          record = found?.[0] || null;
        }

        if (!cancelled) {
          if (!record) {
            setError(t('whiskey.bottleNotFound', 'Bottle not found.'));
          } else {
            setBottle(record);
          }
        }
      } catch (err) {
        console.error('[BottleDetail] load error:', err);
        if (!cancelled) {
          setError(t('common.loadError', 'Unable to load record.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBottle();
    return () => {
      cancelled = true;
    };
  }, [bottleId, t]);

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs-bottle', bottleId],
    queryFn: async () => {
      if (!bottleId) return [];
      const result = await base44.entities.TastingLog.filter({ bottle_id: bottleId }, '-tasting_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!bottleId,
    staleTime: 10000,
  });

  const deleteTastingMutation = useMutation({
    mutationFn: (id) => base44.entities.TastingLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs-bottle', bottleId] });
      toast.success(t('whiskey.tastingDeleted', 'Tasting deleted'));
    },
  });

  const updateTastingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TastingLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs-bottle', bottleId] });
      setEditingTastingLog(null);
      toast.success(t('whiskey.tastingUpdated', 'Tasting updated'));
    },
  });

  const canonicalValue = useMemo(() => {
    if (!bottle) return 0;
    return (
      Number(bottle.collector_value) ||
      Number(bottle.aftermarket_price) ||
      Number(bottle.retail_price) ||
      Number(bottle.purchase_price) ||
      0
    );
  }, [bottle]);

  const valuationSource = useMemo(() => {
    if (!bottle) return null;
    if (Number(bottle.collector_value) > 0) return { label: 'Collector Value', field: 'collector_value', confidence: 'high' };
    if (Number(bottle.aftermarket_price) > 0) return { label: 'Aftermarket Price', field: 'aftermarket_price', confidence: 'medium' };
    if (Number(bottle.retail_price) > 0) return { label: 'Retail Price', field: 'retail_price', confidence: 'medium' };
    if (Number(bottle.purchase_price) > 0) return { label: 'Purchase Price', field: 'purchase_price', confidence: 'low' };
    return null;
  }, [bottle]);

  const gain = useMemo(() => {
    if (!bottle || !canonicalValue || !bottle.purchase_price) return null;
    const pp = Number(bottle.purchase_price);
    if (!pp || pp <= 0) return null;
    const delta = canonicalValue - pp;
    const pct = ((delta / pp) * 100).toFixed(1);
    return { delta, pct };
  }, [bottle, canonicalValue]);

  const displayPhoto = getBottlePhoto(bottle);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-8"
          style={{
            background:
              'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
            border: '1px solid rgba(180,140,75,0.22)',
          }}
        >
          <p className="text-[#D8C7A6]">{t('common.loading', 'Loading…')}</p>
        </div>
      </div>
    );
  }

  if (error || !bottle) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-8"
          style={{
            background:
              'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
            border: '1px solid rgba(180,140,75,0.22)',
          }}
        >
          <p className="text-[#F5F1E7] text-lg font-semibold mb-4">
            {t('whiskey.bottleDetail', 'Bottle Detail')}
          </p>
          <p className="text-[#D8C7A6] mb-6">{error || t('whiskey.bottleNotFound', 'Bottle not found.')}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back', 'Back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
         <Button variant="outline" onClick={() => navigate(-1)}>
           <ArrowLeft className="w-4 h-4 mr-2" />
           {t('common.back', 'Back')}
         </Button>

         <div className="flex gap-2 flex-wrap">
           <Button variant="outline" onClick={() => setShowTastingLog(true)}>
             <BookOpen className="w-4 h-4 mr-2" />
             {t('whiskey.recordTasting', 'Record Tasting')}
           </Button>
           <Button
             onClick={() => navigate(`/BottleForm?id=${encodeURIComponent(bottle.id)}`)}
             style={{
               background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
               color: '#F5F1E7',
             }}
           >
             <Edit className="w-4 h-4 mr-2" />
             {t('common.edit', 'Edit')}
           </Button>
         </div>
       </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(42, 31, 24, 0.96), rgba(31, 21, 16, 0.99))',
          border: '1px solid rgba(180,140,75,0.22)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr]">
          <div
            className="min-h-[320px] lg:min-h-full flex items-center justify-center p-6"
            style={{
              background:
                'radial-gradient(circle at 30% 20%, rgba(180,140,75,0.12), transparent 45%), rgba(0,0,0,0.18)',
              borderRight: '1px solid rgba(180,140,75,0.12)',
            }}
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={bottle?.name || t('whiskey.photoPreview', 'Bottle photo')}
                className="w-full h-full max-h-[520px] object-contain"
                style={{
                  backgroundColor: 'transparent',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.38))',
                }}
              />
            ) : (
              <div
                className="w-full h-[320px] rounded-2xl flex flex-col items-center justify-center text-center px-6"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(180,140,75,0.22)',
                }}
              >
                <p className="text-[#F5F1E7] font-medium mb-2">
                  {t('whiskey.noBottlePhoto', 'No bottle photo')}
                </p>
                <p className="text-sm text-[#D8C7A6]/75">
                  {t('whiskey.noBottlePhotoSub', 'Add or search for a bottle photo to display it here.')}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <div className="flex items-start gap-3 flex-wrap">
                <h1
                  className="text-3xl md:text-4xl font-bold"
                  style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
                >
                  {bottle.name || t('whiskey.untitledBottle', 'Untitled Bottle')}
                </h1>

                {bottle.favorite ? (
                  <div
                    className="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(180,140,75,0.14)',
                      border: '1px solid rgba(180,140,75,0.24)',
                      color: '#E0C68A',
                    }}
                  >
                    <Star className="w-3.5 h-3.5" />
                    {t('common.favorite', 'Favorite')}
                  </div>
                ) : null}
              </div>

              <p className="mt-2 text-[#D8C7A6]/85 text-base">
                {[bottle.distillery, bottle.region, bottle.country].filter(Boolean).join(' • ') ||
                  t('whiskey.bottleDetailSub', 'Bottle details and notes')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow icon={Tag} label={t('whiskey.type', 'Type')} value={bottle.type} />
              <InfoRow
                icon={Tag}
                label={t('whiskey.bottleType', 'Bottle Type')}
                value={bottle.bottle_type}
              />
              <InfoRow
                icon={MapPin}
                label={t('whiskey.purchaseLocation', 'Purchase Location')}
                value={bottle.purchase_location}
              />
              <InfoRow
                icon={Calendar}
                label={t('whiskey.purchaseDate', 'Purchase Date')}
                value={formatDate(bottle.purchase_date)}
              />
              <InfoRow
                icon={DollarSign}
                label={t('whiskey.purchasePrice', 'Purchase Price')}
                value={formatCurrency(bottle.purchase_price)}
              />
              <InfoRow
                icon={DollarSign}
                label={t('whiskey.collectorValue', 'Collector Value')}
                value={
                  formatCurrency(bottle.collector_value) ||
                  formatCurrency(bottle.aftermarket_price) ||
                  formatCurrency(bottle.retail_price)
                }
              />
            </div>

            {bottle.flavor_notes && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,140,75,0.14)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.75)' }} />
                  <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(180,140,75,0.72)' }}>
                    Flavor Notes
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bottle.flavor_notes.split(',').map((note, i) => note.trim() && (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.24)', color: 'rgba(212,180,110,1)' }}
                    >
                      {note.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(bottle.notes || bottle.rating || bottle.age || bottle.abv) && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,140,75,0.14)',
                }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {bottle.age ? (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70 mb-1">
                        {t('whiskey.age', 'Age')}
                      </p>
                      <p className="text-[#F5F1E7]">{bottle.age}</p>
                    </div>
                  ) : null}

                  {bottle.abv ? (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70 mb-1">
                        {t('whiskey.abv', 'ABV')}
                      </p>
                      <p className="text-[#F5F1E7]">{bottle.abv}</p>
                    </div>
                  ) : null}

                  {bottle.bottle_size ? (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70 mb-1">
                        {t('whiskey.bottleSize', 'Bottle Size')}
                      </p>
                      <p className="text-[#F5F1E7]">{bottle.bottle_size}</p>
                    </div>
                  ) : null}

                  {bottle.rating ? (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70 mb-1">
                        {t('common.rating', 'Rating')}
                      </p>
                      <p className="text-[#F5F1E7]">{bottle.rating}</p>
                    </div>
                  ) : null}
                </div>

                {bottle.notes ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70 mb-2">
                      {t('whiskey.tastingNotes', 'Tasting Notes')}
                    </p>
                    <p className="text-[#F5F1E7]/90 whitespace-pre-wrap leading-relaxed">
                      {bottle.notes}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Valuation Intelligence Card */}
      {canonicalValue > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(38,28,16,0.97), rgba(28,20,12,0.99))',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="px-6 pt-5 pb-4 border-b flex items-center gap-3" style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
                {t('whiskey.valuationCard', 'Valuation')}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {t('whiskey.valuationSub', 'Estimated value from your collection data')}
              </p>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(16,185,129,0.7)' }}>
                  {valuationSource?.label || t('whiskey.estimatedValue', 'Estimated Value')}
                </p>
                <p className="text-3xl font-bold" style={{ color: '#10B981', fontFamily: "'Georgia', serif" }}>
                  {formatCurrency(canonicalValue)}
                </p>
                {valuationSource && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: valuationSource.confidence === 'high' ? '#10B981' : valuationSource.confidence === 'medium' ? '#F59E0B' : '#6B7280' }}
                    />
                    <p className="text-xs capitalize" style={{ color: 'rgba(224,216,200,0.5)' }}>
                      {valuationSource.confidence} {t('whiskey.confidence', 'confidence')}
                    </p>
                  </div>
                )}
              </div>

              {bottle.purchase_price && Number(bottle.purchase_price) > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(180,140,75,0.07)', border: '1px solid rgba(180,140,75,0.15)' }}>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180,140,75,0.7)' }}>
                    {t('whiskey.purchasePrice', 'Purchase Price')}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#D4A574', fontFamily: "'Georgia', serif" }}>
                    {formatCurrency(bottle.purchase_price)}
                  </p>
                </div>
              )}

              {gain && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: gain.delta >= 0 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                    border: `1px solid ${gain.delta >= 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
                  }}
                >
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180,140,75,0.7)' }}>
                    {t('whiskey.gainLoss', 'Gain / Loss')}
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: gain.delta >= 0 ? '#10B981' : '#EF4444', fontFamily: "'Georgia', serif" }}
                  >
                    {gain.delta >= 0 ? '+' : ''}{formatCurrency(gain.delta)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
                    {gain.pct >= 0 ? '+' : ''}{gain.pct}% vs purchase
                  </p>
                </div>
              )}
            </div>

            {bottle.value_source_summary && (
              <p className="text-xs mt-4 leading-relaxed" style={{ color: 'rgba(224,216,200,0.45)' }}>
                {bottle.value_source_summary}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pairing & Tasting Intelligence Card */}
      {(bottle.flavor_notes || bottle.notes || bottle.type) && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(38,24,14,0.97), rgba(28,18,12,0.99))',
            border: '1px solid rgba(180,140,75,0.22)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="px-6 pt-5 pb-4 border-b flex items-center gap-3" style={{ borderColor: 'rgba(180,140,75,0.1)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.22)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.9)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
                {t('whiskey.pairingCard', 'Pairing & Tasting Intelligence')}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {t('whiskey.pairingSub', 'Flavor context and serving suggestions')}
              </p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            {bottle.type && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: 'rgba(180,140,75,0.65)' }}>
                  {t('whiskey.styleProfile', 'Style Profile')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.24)', color: '#D4A574' }}>
                    {bottle.type}
                  </span>
                  {bottle.region && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.16)', color: 'rgba(212,180,110,0.8)' }}>
                      {bottle.region}
                    </span>
                  )}
                  {bottle.country && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.16)', color: 'rgba(212,180,110,0.8)' }}>
                      {bottle.country}
                    </span>
                  )}
                  {bottle.age && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
                      {bottle.age}yr
                    </span>
                  )}
                  {bottle.abv && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.16)', color: 'rgba(212,180,110,0.8)' }}>
                      {bottle.abv}% ABV
                    </span>
                  )}
                </div>
              </div>
            )}

            {bottle.flavor_notes && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: 'rgba(180,140,75,0.65)' }}>
                  {t('whiskey.flavorNotes', 'Flavor Notes')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bottle.flavor_notes.split(',').map((note, i) => note.trim() && (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(196,180,240,0.9)' }}>
                      {note.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: 'rgba(180,140,75,0.65)' }}>
                {t('whiskey.servingSuggestions', 'Serving Suggestions')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Neat', desc: 'Full flavour expression at room temperature', accent: '#D4A574' },
                  { label: 'With Ice', desc: 'Opens lighter notes as it dilutes', accent: '#74A5D4' },
                  { label: 'With Water', desc: 'A few drops can unlock hidden complexity', accent: '#7AAA68' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: s.accent }}>{s.label}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.58)' }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => navigate('/Curator', {
                  state: {
                    seedPrompt: `Help me understand this bottle and how to enjoy it: ${bottle.name}${bottle.distillery ? ` by ${bottle.distillery}` : ''}. Give me tasting guidance, serving suggestions, what stands out about it, and what in my collection pairs well with it.`,
                    scope: 'whiskeykeeper',
                    selectedModules: ['whiskeykeeper'],
                    sourceRecord: {
                      id: bottle.id,
                      type: 'bottle',
                      name: bottle.name,
                    },
                  },
                })}
                size="sm"
                className="w-full"
                style={{ background: 'linear-gradient(135deg, rgba(139,58,58,0.85), rgba(109,46,46,1))', border: '1px solid rgba(163,92,92,0.4)', color: '#F5F1E7' }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {t('whiskey.askCurator', 'Ask Curator about this bottle')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}