import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useLocaleFormatting } from '@/components/utils/localeFormatters';
import {
  getWineTotalValue, getWineUnitValue, getWineQuantity,
  getWineDrinkWindowStatus, getWineRarityScore, getWineRarityResult, getWinePrimaryImage,
  hasWineValuation, getWineValuationSource, getWineValuationConfidence,
  getWineRegionDisplay,
} from '@/lib/collection/wineSelectors';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import WineForm from '@/components/wine/WineForm';
import LogWineTastingModal from '@/components/wine/LogWineTastingModal';
import EnrichButton from '@/components/shared/EnrichButton';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import AddToWantListModal from '@/components/wantlist/AddToWantListModal';
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import UnifiedValuationCard from '@/components/valuation/UnifiedValuationCard';
import { buildValuationSnapshot, resolveValueTrend } from '@/components/valuation/valueEngine';
import { refreshItemValue, seedInitialSnapshotIfMissing } from '@/components/valuation/valueRefreshService';
import {
  ArrowLeft, Star, Edit2, Trash2, BookOpen, BookmarkPlus,
  MapPin, Wine, AlertTriangle, TrendingUp, Package, BarChart2,
  CheckCircle, Clock, ChevronDown, ChevronUp, Search, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';

const DRINK_WINDOW_COLORS = { drink_now: '#2E7D5C', too_young: '#6B8FC4', past_peak: '#A35C5C' };

// ─── Tiny section card wrapper ──────────────────────────────────────────────
function SectionCard({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(42,28,20,0.85)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(212,165,116,0.85)' }}>{title}</span>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(212,165,116,0.5)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(212,165,116,0.5)' }} />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 py-2" style={{ borderBottom: '1px solid rgba(180,140,75,0.08)' }}>
      <span className="text-sm shrink-0" style={{ color: 'rgba(224,216,200,0.55)' }}>{label}</span>
      <span className="text-sm font-medium text-right" style={{ color: '#F5F1E7' }}>{value}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'rgba(42,28,20,0.7)', border: '1px solid rgba(180,140,75,0.14)' }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" style={{ color: color || '#D4A574' }} />}
        <span className="text-xs uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.5)' }}>{label}</span>
      </div>
      <span className="text-lg font-bold" style={{ color: color || '#F5F1E7' }}>{value}</span>
      {subtext && <span className="text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>{subtext}</span>}
    </div>
  );
}



// ─── Valuation Panel ─────────────────────────────────────────────────────────
function ValuationPanel({ wine, formatFromBase, onSaved }) {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatting();
  const [editing, setEditing] = useState(false);
  const [manualEnabled, setManualEnabled] = useState(wine.manual_valuation_enabled || false);
  const [manualValue, setManualValue] = useState(wine.manual_estimated_value || '');
  const [saving, setSaving] = useState(false);

  const unitValue = getWineUnitValue(wine);
  const totalValue = getWineTotalValue(wine);
  const qty = getWineQuantity(wine);
  const source = getWineValuationSource(wine);
  const confidence = getWineValuationConfidence(wine);
  const isLowConf = confidence === 'low';

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      manual_valuation_enabled: manualEnabled,
      manual_estimated_value: manualEnabled && manualValue ? Number(manualValue) : undefined,
    };
    await base44.entities.Wine.update(wine.id, updates);
    setSaving(false);
    setEditing(false);
    onSaved(updates);
    toast.success(t('wine.valuationSaved'));
  };

  return (
    <div className="space-y-4">
      {isLowConf && hasWineValuation(wine) && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(180,120,40,0.12)', border: '1px solid rgba(180,120,40,0.25)', color: 'rgba(224,190,100,0.85)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t('wine.lowConfidenceEstimate')}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.unitValue')}</p>
          <p className="text-base font-bold" style={{ color: unitValue ? '#D4A574' : 'rgba(224,216,200,0.3)' }}>
            {unitValue ? formatFromBase(unitValue) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.totalValueWithQuantity', { count: qty })}</p>
          <p className="text-base font-bold" style={{ color: totalValue ? '#D4A574' : 'rgba(224,216,200,0.3)' }}>
            {totalValue ? formatFromBase(totalValue) : '—'}
          </p>
        </div>
        {wine.purchase_price > 0 && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.purchasePrice')}</p>
            <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{formatFromBase(wine.purchase_price)}</p>
          </div>
        )}
        {wine.market_replacement_cost_estimate > 0 && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.replacementEstimate')}</p>
            <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{formatFromBase(wine.market_replacement_cost_estimate)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
        {source && <span>{t('wine.sourceLabel')}: <span style={{ color: 'rgba(224,216,200,0.75)' }}>{source}</span></span>}
        {confidence && <span>{t('wine.confidenceLabel')}: <span style={{ color: confidence === 'high' ? '#2E7D5C' : confidence === 'medium' ? '#D4A574' : '#C47070' }}>{confidence}</span></span>}
        {(wine.valuation_updated_at || wine.market_valuation_updated_at) && (
          <span>{t('common.updated')}: <span style={{ color: 'rgba(224,216,200,0.75)' }}>{formatDate(wine.valuation_updated_at || wine.market_valuation_updated_at)}</span></span>
        )}
      </div>

      {wine.valuation_notes && (
        <p className="text-xs italic" style={{ color: 'rgba(224,216,200,0.5)' }}>{wine.valuation_notes}</p>
      )}

      {!editing ? (
        <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 rounded-lg" style={{ background: 'rgba(180,140,75,0.1)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.25)' }}>
          {t('wine.manualOverride')}
        </button>
      ) : (
        <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(180,140,75,0.12)' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={manualEnabled} onChange={(e) => setManualEnabled(e.target.checked)} />
            <span className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>{t('wine.enableManualValuationOverride')}</span>
          </label>
          {manualEnabled && (
            <div>
              <label className="ck-field-label">{t('wine.manualUnitValue')}</label>
              <input
                type="number"
                step="0.01"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-base"
                style={{ background: 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
                placeholder="0.00"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={handleSave} style={{ background: '#8B3A3A', color: '#F5F1E7' }}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rarity Panel ────────────────────────────────────────────────────────────
function RarityPanel({ wine, formatFromBase }) {
  const { t } = useTranslation();
  const result = getWineRarityResult(wine);

  if (!result || result.score === null) {
    return (
      <div className="text-center py-6" style={{ color: 'rgba(224,216,200,0.4)' }}>
        <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">{t('wine.rarityInsufficientTitle')}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.3)' }}>{t('wine.rarityInsufficientBody')}</p>
      </div>
    );
  }

  const { score, label, confidence, factors, reasoning } = result;

  const color =
    score >= 85 ? '#D4A574' :
    score >= 65 ? '#C47070' :
    score >= 45 ? '#6B8FC4' :
    score >= 25 ? '#7EB584' :
    'rgba(224,216,200,0.5)';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ background: `${color}22`, border: `2px solid ${color}66`, color }}>
          {score}
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color }}>{label}</p>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.collectibilityScoreOutOf100')}</p>
          {confidence && confidence !== 'insufficient' && (
            <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{
              background: confidence === 'high' ? 'rgba(46,125,92,0.12)' : confidence === 'medium' ? 'rgba(180,140,75,0.12)' : 'rgba(139,58,58,0.12)',
              color: confidence === 'high' ? '#4EAD80' : confidence === 'medium' ? '#D4A574' : '#C47070',
              border: `1px solid ${confidence === 'high' ? 'rgba(46,125,92,0.25)' : confidence === 'medium' ? 'rgba(180,140,75,0.25)' : 'rgba(139,58,58,0.25)'}`,
            }}>
              {t('wine.confidenceWithLevel', { confidence })}
            </span>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
      </div>

      {/* Contributing factors */}
      {factors.length > 0 && (
        <div className="space-y-1.5">
          {factors.map((f, i) => (
            <div key={i} className="flex justify-between items-center text-sm py-1" style={{ borderBottom: '1px solid rgba(180,140,75,0.06)' }}>
              <span style={{ color: 'rgba(224,216,200,0.55)' }}>{f.label}</span>
              <span style={{ color: '#F5F1E7' }}>{f.note}</span>
            </div>
          ))}
        </div>
      )}

      {reasoning && (
        <p className="text-xs italic" style={{ color: 'rgba(224,216,200,0.4)' }}>{reasoning}</p>
      )}
    </div>
  );
}

// ─── Tasting Log ─────────────────────────────────────────────────────────────
function TastingLog({ wineId, wineName, onOpenModal }) {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatting();
  const { data: tastings = [] } = useQuery({
    queryKey: QUERY_KEYS.wineTastings(wineId),
    queryFn: () => base44.entities.WineTasting.filter({ wine_id: wineId }, '-date', 50),
    enabled: !!wineId,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.tastingsLoggedCount', { count: tastings.length })}</span>
        <button onClick={onOpenModal} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}>
          + {t('wine.logTasting')}
        </button>
      </div>
      {tastings.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'rgba(224,216,200,0.35)' }}>{t('wine.noTastingsLoggedYet')}</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tastings.map((tasting) => (
            <div key={tasting.id} className="p-3 rounded-xl" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.1)' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
                  {tasting.date ? formatDate(tasting.date) : '—'}
                </span>
                {tasting.rating != null && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C47070' }}>
                    <Star className="w-3 h-3 fill-current" /> {tasting.rating}
                  </span>
                )}
              </div>
              {tasting.notes && <p className="text-sm" style={{ color: 'rgba(224,216,200,0.8)' }}>{tasting.notes}</p>}
              {tasting.aroma_notes && <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.aromaLabel')}: {tasting.aroma_notes}</p>}
              {tasting.food_pairing && <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.pairingLabel')}: {tasting.food_pairing}</p>}
              {tasting.occasion && <p className="text-xs mt-0.5 italic" style={{ color: 'rgba(224,216,200,0.4)' }}>{tasting.occasion}</p>}
              {tasting.would_buy_again === true && (
                <span className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: '#2E7D5C' }}>
                  <CheckCircle className="w-3 h-3" /> {t('wine.wouldBuyAgainLabel')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Enrichment Details ───────────────────────────────────────────────────────
function EnrichmentDetails({ wine, onEnriched }) {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatting();
  const enrichedFields = [
    wine.varietal && t('wine.varietal'),
    wine.appellation && t('wine.appellation'),
    wine.abv && 'ABV',
    wine.market_estimated_unit_value && t('wine.marketValueField'),
    wine.valuation_source && t('wine.valuationSourceField'),
    (wine.drink_window_start || wine.drinking_window_start) && t('wine.drinkWindowField'),
  ].filter(Boolean);

  const updatedAt = wine.market_valuation_updated_at || wine.valuation_updated_at;

  return (
    <div className="space-y-3">
      {enrichedFields.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {enrichedFields.map((f) => (
              <span key={f} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(46,125,92,0.12)', color: '#4EAD80', border: '1px solid rgba(46,125,92,0.25)' }}>
                <CheckCircle className="w-3 h-3 inline mr-1" />{f}
              </span>
            ))}
          </div>
          {updatedAt && (
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
              <Clock className="w-3 h-3 inline mr-1" />{t('wine.lastEnriched', { date: formatDate(updatedAt) })}
            </p>
          )}
          {wine.valuation_source && (
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>{t('wine.sourceLabel')}: {wine.valuation_source}</p>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.4)' }}>{t('wine.noEnrichmentData')}</p>
      )}
      <EnrichButton itemType="wine" record={wine} onEnriched={onEnriched} />
    </div>
  );
}

// ─── Main WineDetail Page ─────────────────────────────────────────────────────
export default function WineDetail() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const { formatDate } = useLocaleFormatting();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const wineId = urlParams.get('id');

  const [editing, setEditing] = useState(false);
  const [logTasting, setLogTasting] = useState(false);
  const [wantListOpen, setWantListOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarResult, setSimilarResult] = useState(null);
  const [similarError, setSimilarError] = useState(null);
  const [valueSnapshots, setValueSnapshots] = useState([]);
  const [priceObservations, setPriceObservations] = useState([]);
  const [isRefreshingValue, setIsRefreshingValue] = useState(false);

  const { data: wine, isLoading } = useQuery({
    queryKey: QUERY_KEYS.wine(wineId),
    queryFn: () => base44.entities.Wine.get(wineId),
    enabled: !!wineId,
  });

  const { data: allWines = [] } = useQuery({
    queryKey: QUERY_KEYS.wines(user?.email),
    queryFn: async () => base44.entities.Wine.filter({ created_by: user?.email }, '-created_date').catch(() => []),
    enabled: !!user?.email,
    staleTime: STALE_TIME.COLLECTION,
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Wine.delete(wineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wines(user?.email) });
      navigate('/Wines');
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('wine.deleteConfirm', { name: wine?.name || '' }))) deleteMutation.mutate();
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wine(wineId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wines(user?.email) });
  };

  const handlePhotosUpdate = (photos) => {
    queryClient.setQueryData(QUERY_KEYS.wine(wineId), (prev) => prev ? { ...prev, photos } : prev);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wines(user?.email) });
  };

  const handleValuationSaved = (updates) => {
    queryClient.setQueryData(QUERY_KEYS.wine(wineId), (prev) => prev ? { ...prev, ...updates } : prev);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wines(user?.email) });
  };

  useEffect(() => {
    if (!wineId || !user?.email) return;
    let mounted = true;

    async function loadValuationArtifacts() {
      const [snapshots, observations] = await Promise.all([
        base44.entities.ItemValueSnapshot.filter({
          item_id: wineId,
          module_key: 'winekeeper',
          created_by: user.email,
        }, '-snapshot_date', 20).catch(() => []),
        base44.entities.PriceObservation.filter({
          item_id: wineId,
          module_key: 'winekeeper',
          created_by: user.email,
        }, '-observed_date', 20).catch(() => []),
      ]);

      if (!mounted) return;
      setValueSnapshots(Array.isArray(snapshots) ? snapshots : []);
      setPriceObservations(Array.isArray(observations) ? observations : []);
    }

    loadValuationArtifacts();
    return () => { mounted = false; };
  }, [wineId, user?.email]);

  useEffect(() => {
    if (!wine || !user?.email) return;
    let mounted = true;

    (async () => {
      if (valueSnapshots.length === 0) {
        const seeded = await seedInitialSnapshotIfMissing(
          wine,
          'winekeeper',
          'wine',
          user.email,
          base44,
          valueSnapshots,
          {}
        );
        if (seeded && mounted) {
          const snapshots = await base44.entities.ItemValueSnapshot.filter({
            item_id: wine.id,
            module_key: 'winekeeper',
            created_by: user.email,
          }, '-snapshot_date', 20).catch(() => []);
          if (mounted) setValueSnapshots(Array.isArray(snapshots) ? snapshots : []);
        }
      }
    })();

    return () => { mounted = false; };
  }, [wine, user?.email, valueSnapshots]);

  const valuationSnapshot = useMemo(
    () => (wine ? buildValuationSnapshot(wine, 'winekeeper', { valueHistory: valueSnapshots }) : null),
    [wine, valueSnapshots]
  );
  const valueTrend = useMemo(() => resolveValueTrend(valueSnapshots), [valueSnapshots]);

  const handleRefreshValueNow = async () => {
    if (!wine || !user?.email || isRefreshingValue) return;
    setIsRefreshingValue(true);
    try {
      const newSnap = await refreshItemValue(wine, 'winekeeper', 'wine', user.email, base44, { valueHistory: valueSnapshots });
      if (newSnap) {
        setValueSnapshots((prev) => [newSnap, ...prev]);
      }
    } finally {
      setIsRefreshingValue(false);
    }
  };

  const handleFindSimilar = async () => {
    if (!wine || !user?.email) return;
    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);

    try {
      const allTastings = await base44.entities.WineTasting
        .filter({ created_by: user.email }, '-date', 100)
        .catch(() => []);
      const result = await runFindSimilar({
        recordType: 'wine',
        anchor: wine,
        context: {
          wines: allWines || [],
          tastings: allTastings || [],
        },
      });
      setSimilarResult(result);
    } catch (error) {
      setSimilarError(error?.message || t('wine.findSimilarFailed'));
    } finally {
      setSimilarLoading(false);
    }
  };

  if (!wineId) { navigate('/Wines'); return null; }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <div className="text-center py-16" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.loading')}</div>
      </div>
    );
  }

  if (!wine) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <div className="text-center py-16" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('wine.notFound')}</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <WineForm
          wine={wine}
          onSaved={() => { setEditing(false); invalidate(); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const dwStatus = getWineDrinkWindowStatus(wine);
  const totalValue = getWineTotalValue(wine);
  const qty = getWineQuantity(wine);
  const rarityScore = getWineRarityScore(wine);
  const photo = getWinePrimaryImage(wine);
  const regionDisplay = getWineRegionDisplay(wine);
  const dwLabel = dwStatus ? t(`wine.${dwStatus === 'drink_now' ? 'drinkNow' : dwStatus === 'too_young' ? 'tooYoung' : 'pastPeak'}`) : null;
  const dwColor = dwStatus ? DRINK_WINDOW_COLORS[dwStatus] : null;

  return (
    <div className="space-y-6">
      <WineKeeperModuleNav currentPageName="Wines" />

      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/Wines')}
          className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
          style={{ color: 'rgba(224,216,200,0.65)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('wine.backToCollection')}
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <EnrichButton itemType="wine" record={wine} onEnriched={(updated) => {
            queryClient.setQueryData(QUERY_KEYS.wine(wineId), (prev) => prev ? { ...prev, ...updated } : prev);
            invalidate();
          }} />
          <Button size="sm" variant="outline" onClick={handleFindSimilar}>
            <Search className="w-4 h-4 mr-1" />
            {t('common.similar')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-1" />
            {t('common.share')}
          </Button>
          <Button size="sm" onClick={() => setLogTasting(true)} style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}>
            <BookOpen className="w-4 h-4 mr-1" />
            {t('wine.logTasting')}
          </Button>
          <Button size="sm" onClick={() => setWantListOpen(true)} variant="outline">
            <BookmarkPlus className="w-4 h-4 mr-1" />
            {t('wine.wantList')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            {t('common.edit')}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} style={{ color: '#A35C5C' }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: hero + quick metrics ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Hero card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(42,28,20,0.9)', border: '1px solid rgba(139,58,58,0.3)' }}>
            {/* Hero image — object-contain so full bottle shows, same treatment as WhiskeyKeeper */}
            <div className="w-full bg-gradient-to-b from-[#3d2020] to-[#200f0f]" style={{ minHeight: '280px' }}>
              {photo ? (
                <img src={photo} alt={wine.name} className="w-full object-contain" style={{ maxHeight: '360px', minHeight: '280px' }} />
              ) : (
                <div className="w-full flex items-center justify-center" style={{ minHeight: '280px', background: 'rgba(139,58,58,0.06)' }}>
                  <Wine className="w-20 h-20" style={{ color: 'rgba(139,58,58,0.25)' }} />
                </div>
              )}
            </div>
            <div className="px-4 pb-2">
              <InlinePhotoEditor
                photos={wine.photos || []}
                maxPhotos={6}
                label={t('wine.photos')}
                entityType="wine"
                recordName={wine.name || ''}
                brand={wine.producer || ''}
                onUpdate={async (newPhotos) => {
                  await base44.entities.Wine.update(wine.id, { photos: newPhotos });
                  handlePhotosUpdate(newPhotos);
                }}
              />
            </div>
            <div className="p-5 space-y-2">
              <h1 className="text-xl font-bold leading-snug" style={{ color: '#F5F1E7' }}>{wine.name}</h1>
              <p className="text-sm font-medium" style={{ color: 'rgba(224,216,200,0.75)' }}>{wine.producer}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {wine.vintage && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,165,116,0.12)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.25)' }}>
                    {wine.vintage}
                  </span>
                )}
                {wine.style && (
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(139,58,58,0.12)', color: '#C47070', border: '1px solid rgba(139,58,58,0.25)' }}>
                    {wine.style}
                  </span>
                )}
                {dwStatus && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${dwColor}22`, color: dwColor, border: `1px solid ${dwColor}44` }}>
                    {dwLabel}
                  </span>
                )}
                {wine.is_favorite && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,165,116,0.12)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.25)' }}>
                    ★ {t('wine.favorites')}
                  </span>
                )}
              </div>
              {wine.rating > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4" style={{ color: '#C47070', fill: i <= wine.rating ? '#C47070' : 'transparent' }} />
                  ))}
                  <span className="text-sm font-semibold ml-1" style={{ color: '#C47070' }}>{wine.rating}/5</span>
                </div>
              )}
              {totalValue > 0 && (
                <p className="text-xl font-bold mt-1" style={{ color: '#D4A574' }}>{formatFromBase(totalValue)}</p>
              )}
            </div>
          </div>

          {/* Snapshot metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Package} label={t('wine.quantityShort')} value={t('wine.quantityBottles', { count: qty })} />
            <MetricCard icon={TrendingUp} label={t('wine.valueShort')} value={totalValue ? formatFromBase(totalValue) : '—'} color="#D4A574" />
            {rarityScore !== null && (
              <MetricCard icon={BarChart2} label={t('wine.rarityShort')} value={`${rarityScore}/100`} color={rarityScore >= 70 ? '#D4A574' : rarityScore >= 40 ? '#6B8FC4' : '#C47070'} />
            )}
            {dwStatus && (
              <MetricCard icon={Clock} label={t('wine.windowShort')} value={dwLabel} color={dwColor} />
            )}
            {regionDisplay && (
              <MetricCard icon={MapPin} label={t('wine.region')} value={regionDisplay} />
            )}
            {wine.cellar_location && (
              <MetricCard icon={Package} label={t('wine.storageShort')} value={wine.cellar_location} />
            )}
          </div>
        </div>

        {/* ── Right column: sections ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Details */}
          <SectionCard title={t('wine.detailsSection')}>
            <InfoRow label={t('wine.name')} value={wine.name} />
            <InfoRow label={t('wine.producer')} value={wine.producer} />
            <InfoRow label={t('wine.vintage')} value={wine.vintage} />
            <InfoRow label={t('wine.style')} value={wine.style ? t(`wine.styles.${wine.style}`, wine.style) : null} />
            <InfoRow label={t('wine.varietal')} value={wine.varietal} />
            {Array.isArray(wine.blend_components) && wine.blend_components.length > 0 && (
              <InfoRow label={t('wine.blend')} value={wine.blend_components.join(', ')} />
            )}
            <InfoRow label={t('wine.region')} value={wine.region} />
            <InfoRow label={t('wine.country')} value={wine.country_of_origin || wine.country} />
            <InfoRow label={t('wine.appellation')} value={wine.appellation} />
            <InfoRow label={t('wine.bottleSize')} value={wine.bottle_size} />
            <InfoRow label="ABV" value={wine.abv ? `${wine.abv}%` : null} />
            <InfoRow label={t('wine.quantity')} value={qty > 0 ? t('wine.quantityBottles', { count: qty }) : null} />
            <InfoRow label={t('wine.purchasePrice')} value={wine.purchase_price ? formatFromBase(wine.purchase_price) : null} />
            <InfoRow label={t('wine.cellarLocation')} value={wine.cellar_location} />
            <InfoRow label={t('wine.drinkingWindowStart')} value={wine.drink_window_start || wine.drinking_window_start ? formatDate(wine.drink_window_start || wine.drinking_window_start) : null} />
            <InfoRow label={t('wine.drinkingWindowEnd')} value={wine.drink_window_end || wine.drinking_window_end ? formatDate(wine.drink_window_end || wine.drinking_window_end) : null} />
            {wine.notes && (
              <div className="pt-3">
                <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.45)' }}>{t('wine.notes')}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.8)' }}>{wine.notes}</p>
              </div>
            )}
          </SectionCard>

          {valuationSnapshot ? (
            <UnifiedValuationCard
              item={wine}
              itemType="wine"
              moduleKey="winekeeper"
              valuationSnapshot={valuationSnapshot}
              valueTrend={valueTrend}
              valueSnapshots={valueSnapshots}
              priceObservations={priceObservations}
              onEditValuation={() => {}}
              onRefreshNow={handleRefreshValueNow}
              isRefreshing={isRefreshingValue}
            />
          ) : (
            <SectionCard title={t('wine.valuationSection')}>
              <ValuationPanel wine={wine} formatFromBase={formatFromBase} onSaved={handleValuationSaved} />
            </SectionCard>
          )}

          <SectionCard title={t('wine.manualValuationControls')} defaultOpen={false}>
            <ValuationPanel wine={wine} formatFromBase={formatFromBase} onSaved={handleValuationSaved} />
          </SectionCard>

          {/* Rarity */}
          <SectionCard title={t('wine.rarityCollectibility')}>
            <RarityPanel wine={wine} formatFromBase={formatFromBase} />
          </SectionCard>

          {/* Tasting Log */}
          <SectionCard title={t('wine.tastingLogSection')}>
            <TastingLog wineId={wineId} wineName={wine.name} onOpenModal={() => setLogTasting(true)} />
          </SectionCard>

          {/* Enrichment */}
          <SectionCard title={t('wine.enrichmentDetailsSection')} defaultOpen={false}>
            <EnrichmentDetails
              wine={wine}
              onEnriched={(updated) => {
                queryClient.setQueryData(QUERY_KEYS.wine(wineId), (prev) => prev ? { ...prev, ...updated } : prev);
                invalidate();
              }}
            />
          </SectionCard>
        </div>
      </div>

      {/* Tasting modal */}
      {logTasting && (
        <LogWineTastingModal
          wine={wine}
          wines={[wine]}
          isOpen={logTasting}
          onClose={() => setLogTasting(false)}
          defaultMode="collection"
          onSaved={() => {
            setLogTasting(false);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wineTastings(wineId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wineTastingsSummary(user?.email) });
          }}
        />
      )}

      {/* Want list modal */}
      {wantListOpen && (
        <AddToWantListModal
          open={wantListOpen}
          onOpenChange={(open) => { if (!open) setWantListOpen(false); }}
          item={{ name: wine.name, maker: wine.producer, image: photo }}
          itemType="wine"
        />
      )}

      <ShareRecordModal
        isOpen={showShareModal}
        onOpenChange={setShowShareModal}
        moduleType="wine"
        record={wine}
        userProfile={{ email: user?.email }}
      />

      <SimilarItemsDrawer
        isOpen={showSimilar}
        onClose={() => setShowSimilar(false)}
        result={similarResult}
        loading={similarLoading}
        error={similarError}
        onRetry={handleFindSimilar}
        recordType="wine"
        anchorName={wine?.name}
      />
    </div>
  );
}