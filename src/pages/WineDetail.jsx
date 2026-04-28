import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/currency/useCurrency';
import {
  getWineTotalValue, getWineUnitValue, getWineQuantity,
  getWineDrinkWindowStatus, getWineRarityScore, getWinePrimaryImage,
  hasWineValuation, getWineValuationSource, getWineValuationConfidence,
  getWineRegionDisplay,
} from '@/lib/collection/wineSelectors';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import WineForm from '@/components/wine/WineForm';
import LogWineTastingModal from '@/components/wine/LogWineTastingModal';
import EnrichButton from '@/components/shared/EnrichButton';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import AddToWantListModal from '@/components/wantlist/AddToWantListModal';
import {
  ArrowLeft, Star, Edit2, Trash2, BookOpen, BookmarkPlus,
  MapPin, Wine, AlertTriangle, TrendingUp, Package, BarChart2,
  CheckCircle, Clock, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { toast } from 'sonner';

const DRINK_WINDOW_COLORS = { drink_now: '#2E7D5C', too_young: '#6B8FC4', past_peak: '#A35C5C' };
const DRINK_WINDOW_LABELS = { drink_now: 'Drink Now', too_young: 'Too Young', past_peak: 'Past Peak' };

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
    toast.success('Valuation saved');
  };

  return (
    <div className="space-y-4">
      {isLowConf && hasWineValuation(wine) && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(180,120,40,0.12)', border: '1px solid rgba(180,120,40,0.25)', color: 'rgba(224,190,100,0.85)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Low confidence estimate — consider running Enrich or setting a manual override.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>Unit Value</p>
          <p className="text-base font-bold" style={{ color: unitValue ? '#D4A574' : 'rgba(224,216,200,0.3)' }}>
            {unitValue ? formatFromBase(unitValue) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>Total Value ({qty}×)</p>
          <p className="text-base font-bold" style={{ color: totalValue ? '#D4A574' : 'rgba(224,216,200,0.3)' }}>
            {totalValue ? formatFromBase(totalValue) : '—'}
          </p>
        </div>
        {wine.purchase_price > 0 && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>Purchase Price</p>
            <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{formatFromBase(wine.purchase_price)}</p>
          </div>
        )}
        {wine.market_replacement_cost_estimate > 0 && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.5)' }}>Replacement Est.</p>
            <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{formatFromBase(wine.market_replacement_cost_estimate)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
        {source && <span>Source: <span style={{ color: 'rgba(224,216,200,0.75)' }}>{source}</span></span>}
        {confidence && <span>Confidence: <span style={{ color: confidence === 'high' ? '#2E7D5C' : confidence === 'medium' ? '#D4A574' : '#C47070' }}>{confidence}</span></span>}
        {(wine.valuation_updated_at || wine.market_valuation_updated_at) && (
          <span>Updated: <span style={{ color: 'rgba(224,216,200,0.75)' }}>{new Date(wine.valuation_updated_at || wine.market_valuation_updated_at).toLocaleDateString()}</span></span>
        )}
      </div>

      {wine.valuation_notes && (
        <p className="text-xs italic" style={{ color: 'rgba(224,216,200,0.5)' }}>{wine.valuation_notes}</p>
      )}

      {!editing ? (
        <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 rounded-lg" style={{ background: 'rgba(180,140,75,0.1)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.25)' }}>
          Manual Override
        </button>
      ) : (
        <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(180,140,75,0.12)' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={manualEnabled} onChange={(e) => setManualEnabled(e.target.checked)} />
            <span className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>Enable manual valuation override</span>
          </label>
          {manualEnabled && (
            <div>
              <label className="ck-field-label">Manual Unit Value ($)</label>
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
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rarity Panel ────────────────────────────────────────────────────────────
function RarityPanel({ wine, formatFromBase }) {
  const score = getWineRarityScore(wine);
  const unitValue = getWineUnitValue(wine);
  const hasVintage = !!wine.vintage;
  const dwStatus = getWineDrinkWindowStatus(wine);

  const factors = [
    hasVintage && { label: 'Vintage', note: `${wine.vintage} (${new Date().getFullYear() - Number(wine.vintage)} years)` },
    unitValue > 0 && { label: 'Market Value', note: formatFromBase(unitValue) + '/btl' },
    dwStatus && { label: 'Drinking Window', note: DRINK_WINDOW_LABELS[dwStatus] },
    wine.producer && { label: 'Producer', note: wine.producer },
    wine.region && { label: 'Region', note: wine.region },
  ].filter(Boolean);

  if (score === null) {
    return (
      <div className="text-center py-6" style={{ color: 'rgba(224,216,200,0.4)' }}>
        <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Not enough data to score rarity yet.</p>
        <p className="text-xs mt-1">Add vintage, region, and valuation to generate a score.</p>
      </div>
    );
  }

  const color = score >= 70 ? '#D4A574' : score >= 40 ? '#6B8FC4' : '#C47070';
  const label = score >= 70 ? 'Collectible' : score >= 40 ? 'Notable' : 'Common';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ background: `${color}22`, border: `2px solid ${color}66`, color }}>
          {score}
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color }}>{label}</p>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>Collectibility score out of 100</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>

      <div className="space-y-1.5">
        {factors.map((f, i) => (
          <div key={i} className="flex justify-between items-center text-sm py-1" style={{ borderBottom: '1px solid rgba(180,140,75,0.06)' }}>
            <span style={{ color: 'rgba(224,216,200,0.55)' }}>{f.label}</span>
            <span style={{ color: '#F5F1E7' }}>{f.note}</span>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>
        Score is based on vintage age, market value, and drinking window. Add more data to improve accuracy.
      </p>
    </div>
  );
}

// ─── Tasting Log ─────────────────────────────────────────────────────────────
function TastingLog({ wineId, wineName, onOpenModal }) {
  const { data: tastings = [] } = useQuery({
    queryKey: ['wine-tastings', wineId],
    queryFn: () => base44.entities.WineTasting.filter({ wine_id: wineId }, '-date', 50),
    enabled: !!wineId,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{tastings.length} tasting{tastings.length !== 1 ? 's' : ''} logged</span>
        <button onClick={onOpenModal} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}>
          + Log Tasting
        </button>
      </div>
      {tastings.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'rgba(224,216,200,0.35)' }}>No tastings logged yet.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tastings.map((tasting) => (
            <div key={tasting.id} className="p-3 rounded-xl" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.1)' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
                  {tasting.date ? new Date(tasting.date).toLocaleDateString() : '—'}
                </span>
                {tasting.rating != null && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C47070' }}>
                    <Star className="w-3 h-3 fill-current" /> {tasting.rating}
                  </span>
                )}
              </div>
              {tasting.notes && <p className="text-sm" style={{ color: 'rgba(224,216,200,0.8)' }}>{tasting.notes}</p>}
              {tasting.aroma_notes && <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>Aroma: {tasting.aroma_notes}</p>}
              {tasting.food_pairing && <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>Pairing: {tasting.food_pairing}</p>}
              {tasting.occasion && <p className="text-xs mt-0.5 italic" style={{ color: 'rgba(224,216,200,0.4)' }}>{tasting.occasion}</p>}
              {tasting.would_buy_again === true && (
                <span className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: '#2E7D5C' }}>
                  <CheckCircle className="w-3 h-3" /> Would buy again
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
  const enrichedFields = [
    wine.varietal && 'Varietal',
    wine.appellation && 'Appellation',
    wine.abv && 'ABV',
    wine.market_estimated_unit_value && 'Market Value',
    wine.valuation_source && 'Valuation Source',
    (wine.drink_window_start || wine.drinking_window_start) && 'Drink Window',
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
              <Clock className="w-3 h-3 inline mr-1" />Last enriched {new Date(updatedAt).toLocaleDateString()}
            </p>
          )}
          {wine.valuation_source && (
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>Source: {wine.valuation_source}</p>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.4)' }}>No enrichment data yet. Run Enrich to fill missing fields.</p>
      )}
      <EnrichButton itemType="wine" record={wine} onEnriched={onEnriched} />
    </div>
  );
}

// ─── Main WineDetail Page ─────────────────────────────────────────────────────
export default function WineDetail() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const wineId = urlParams.get('id');

  const [editing, setEditing] = useState(false);
  const [logTasting, setLogTasting] = useState(false);
  const [wantListOpen, setWantListOpen] = useState(false);

  const { data: wine, isLoading } = useQuery({
    queryKey: ['wine', wineId],
    queryFn: () => base44.entities.Wine.get(wineId),
    enabled: !!wineId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Wine.delete(wineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] });
      navigate('/Wines');
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Delete "${wine?.name}"? This cannot be undone.`)) deleteMutation.mutate();
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wine', wineId] });
    queryClient.invalidateQueries({ queryKey: ['wines'] });
  };

  const handlePhotosUpdate = (photos) => {
    queryClient.setQueryData(['wine', wineId], (prev) => prev ? { ...prev, photos } : prev);
    queryClient.invalidateQueries({ queryKey: ['wines'] });
  };

  const handleValuationSaved = (updates) => {
    queryClient.setQueryData(['wine', wineId], (prev) => prev ? { ...prev, ...updates } : prev);
    queryClient.invalidateQueries({ queryKey: ['wines'] });
  };

  if (!wineId) { navigate('/Wines'); return null; }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <div className="text-center py-16" style={{ color: 'rgba(224,216,200,0.5)' }}>Loading…</div>
      </div>
    );
  }

  if (!wine) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <div className="text-center py-16" style={{ color: 'rgba(224,216,200,0.5)' }}>Wine not found.</div>
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
  const dwLabel = dwStatus ? DRINK_WINDOW_LABELS[dwStatus] : null;
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
          Back to Collection
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <EnrichButton itemType="wine" record={wine} onEnriched={(updated) => {
            queryClient.setQueryData(['wine', wineId], (prev) => prev ? { ...prev, ...updated } : prev);
            invalidate();
          }} />
          <Button size="sm" onClick={() => setLogTasting(true)} style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}>
            <BookOpen className="w-4 h-4 mr-1" />
            Log Tasting
          </Button>
          <Button size="sm" onClick={() => setWantListOpen(true)} variant="outline">
            <BookmarkPlus className="w-4 h-4 mr-1" />
            Want List
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
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
            {photo ? (
              <img src={photo} alt={wine.name} className="w-full aspect-[3/4] object-cover" />
            ) : (
              <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ background: 'rgba(139,58,58,0.06)' }}>
                <Wine className="w-20 h-20" style={{ color: 'rgba(139,58,58,0.25)' }} />
              </div>
            )}
            <div className="px-4 pb-2">
              <InlinePhotoEditor
                photos={wine.photos || []}
                maxPhotos={6}
                label="Photos"
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
                    ★ Favorite
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
            <MetricCard icon={Package} label="Qty" value={`${qty} btl${qty !== 1 ? 's' : ''}`} />
            <MetricCard icon={TrendingUp} label="Value" value={totalValue ? formatFromBase(totalValue) : '—'} color="#D4A574" />
            {rarityScore !== null && (
              <MetricCard icon={BarChart2} label="Rarity" value={`${rarityScore}/100`} color={rarityScore >= 70 ? '#D4A574' : rarityScore >= 40 ? '#6B8FC4' : '#C47070'} />
            )}
            {dwStatus && (
              <MetricCard icon={Clock} label="Window" value={dwLabel} color={dwColor} />
            )}
            {regionDisplay && (
              <MetricCard icon={MapPin} label="Region" value={regionDisplay} />
            )}
            {wine.cellar_location && (
              <MetricCard icon={Package} label="Storage" value={wine.cellar_location} />
            )}
          </div>
        </div>

        {/* ── Right column: sections ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Details */}
          <SectionCard title="Details">
            <InfoRow label="Wine Name" value={wine.name} />
            <InfoRow label="Producer" value={wine.producer} />
            <InfoRow label="Vintage" value={wine.vintage} />
            <InfoRow label="Style" value={wine.style ? wine.style.charAt(0).toUpperCase() + wine.style.slice(1) : null} />
            <InfoRow label="Varietal" value={wine.varietal} />
            {Array.isArray(wine.blend_components) && wine.blend_components.length > 0 && (
              <InfoRow label="Blend" value={wine.blend_components.join(', ')} />
            )}
            <InfoRow label="Region" value={wine.region} />
            <InfoRow label="Country" value={wine.country_of_origin || wine.country} />
            <InfoRow label="Appellation" value={wine.appellation} />
            <InfoRow label="Bottle Size" value={wine.bottle_size} />
            <InfoRow label="ABV" value={wine.abv ? `${wine.abv}%` : null} />
            <InfoRow label="Quantity" value={qty > 0 ? `${qty} bottle${qty !== 1 ? 's' : ''}` : null} />
            <InfoRow label="Purchase Price" value={wine.purchase_price ? formatFromBase(wine.purchase_price) : null} />
            <InfoRow label="Cellar Location" value={wine.cellar_location} />
            <InfoRow label="Drink From" value={wine.drink_window_start || wine.drinking_window_start} />
            <InfoRow label="Drink By" value={wine.drink_window_end || wine.drinking_window_end} />
            {wine.notes && (
              <div className="pt-3">
                <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.45)' }}>Notes</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.8)' }}>{wine.notes}</p>
              </div>
            )}
          </SectionCard>

          {/* Valuation */}
          <SectionCard title="Valuation">
            <ValuationPanel wine={wine} formatFromBase={formatFromBase} onSaved={handleValuationSaved} />
          </SectionCard>

          {/* Rarity */}
          <SectionCard title="Rarity & Collectibility">
            <RarityPanel wine={wine} formatFromBase={formatFromBase} />
          </SectionCard>

          {/* Tasting Log */}
          <SectionCard title="Tasting Log">
            <TastingLog wineId={wineId} wineName={wine.name} onOpenModal={() => setLogTasting(true)} />
          </SectionCard>

          {/* Enrichment */}
          <SectionCard title="Enrichment Details" defaultOpen={false}>
            <EnrichmentDetails
              wine={wine}
              onEnriched={(updated) => {
                queryClient.setQueryData(['wine', wineId], (prev) => prev ? { ...prev, ...updated } : prev);
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
          isOpen={logTasting}
          onClose={() => setLogTasting(false)}
          onSaved={() => {
            setLogTasting(false);
            queryClient.invalidateQueries({ queryKey: ['wine-tastings', wineId] });
            queryClient.invalidateQueries({ queryKey: ['wine-tastings-summary'] });
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
    </div>
  );
}