import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Wine, Star, Edit2, Trash2, ArrowLeft, BookOpen, MapPin, Calendar, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import WineForm from '@/components/wine/WineForm';
import LogWineTastingModal from '@/components/wine/LogWineTastingModal';
import EnrichButton from '@/components/shared/EnrichButton';
import { useCurrency } from '@/lib/currency/useCurrency';

function resolveWineDisplayValue(wine) {
  const qty = wine.quantity || 1;
  if (wine.manual_valuation_enabled && wine.manual_estimated_value > 0) return wine.manual_estimated_value * qty;
  if (wine.estimated_total_value > 0) return wine.estimated_total_value;
  if (wine.market_estimated_total_value > 0) return wine.market_estimated_total_value;
  if (wine.estimated_unit_value > 0) return wine.estimated_unit_value * qty;
  if (wine.market_estimated_unit_value > 0) return wine.market_estimated_unit_value * qty;
  if (wine.estimated_value > 0) return wine.estimated_value * qty;
  return null;
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b" style={{ borderColor: 'rgba(180,140,75,0.1)' }}>
      <span className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>{label}</span>
      <span className="text-sm font-medium text-right" style={{ color: '#F5F1E7' }}>{value}</span>
    </div>
  );
}

export default function WineDetail() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const wineId = urlParams.get('id');

  const [editing, setEditing] = useState(false);
  const [logTasting, setLogTasting] = useState(false);

  const { data: wine, isLoading } = useQuery({
    queryKey: ['wine', wineId],
    queryFn: () => base44.entities.Wine.get(wineId),
    enabled: !!wineId,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ['wine-tastings', wineId],
    queryFn: () => base44.entities.WineTasting.filter({ wine_id: wineId }, '-date', 50),
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
    if (window.confirm(`Delete "${wine?.name}"?`)) deleteMutation.mutate();
  };

  if (!wineId) {
    navigate('/Wines');
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <div className="text-center py-16" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('common.loading')}</div>
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
          onSaved={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ['wine', wineId] });
            queryClient.invalidateQueries({ queryKey: ['wines'] });
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const displayValue = resolveWineDisplayValue(wine);
  const drinkingStatus = (() => {
    if (!wine.drinking_window_start || !wine.drinking_window_end) return null;
    const now = new Date();
    if (now < new Date(wine.drinking_window_start)) return { label: 'Too Young', color: '#6B8FC4' };
    if (now > new Date(wine.drinking_window_end)) return { label: 'Past Peak', color: '#A35C5C' };
    return { label: 'Drink Now', color: '#2E7D5C' };
  })();

  return (
    <div className="space-y-6">
      <WineKeeperModuleNav currentPageName="Wines" />

      {/* Back + Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/Wines')}
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'rgba(224,216,200,0.7)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Back')}
        </button>
        <div className="flex items-center gap-2">
          <EnrichButton itemType="wine" record={wine} onEnriched={() => queryClient.invalidateQueries({ queryKey: ['wine', wineId] })} />
          <Button size="sm" onClick={() => setLogTasting(true)} style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}>
            <BookOpen className="w-4 h-4 mr-1" />
            Log Tasting
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            {t('common.edit', 'Edit')}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} style={{ color: '#A35C5C' }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Photo + core info */}
        <div className="lg:col-span-1 space-y-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(42,28,20,0.85)', border: '1px solid rgba(139,58,58,0.28)' }}
          >
            {wine.photos?.[0] ? (
              <img src={wine.photos[0]} alt={wine.name} className="w-full aspect-square object-cover" />
            ) : (
              <div className="aspect-square flex items-center justify-center" style={{ background: 'rgba(139,58,58,0.08)' }}>
                <Wine className="w-20 h-20" style={{ color: 'rgba(139,58,58,0.3)' }} />
              </div>
            )}
            <div className="p-4 space-y-2">
              <h1 className="text-lg font-bold" style={{ color: '#F5F1E7' }}>{wine.name}</h1>
              <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>{wine.producer}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {wine.style && (
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(139,58,58,0.15)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}>
                    {wine.style}
                  </span>
                )}
                {drinkingStatus && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${drinkingStatus.color}22`, color: drinkingStatus.color, border: `1px solid ${drinkingStatus.color}44` }}>
                    {drinkingStatus.label}
                  </span>
                )}
                {wine.is_favorite && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,165,116,0.15)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.3)' }}>
                    ★ Favorite
                  </span>
                )}
              </div>
              {wine.rating > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4" style={{ color: '#C47070', fill: '#C47070' }} />
                  <span className="text-sm font-semibold" style={{ color: '#C47070' }}>{wine.rating} / 5</span>
                </div>
              )}
              {displayValue && (
                <p className="text-base font-bold mt-2" style={{ color: '#D4A574' }}>{formatFromBase(displayValue)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Details + tastings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Details card */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(42,28,20,0.85)', border: '1px solid rgba(180,140,75,0.18)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(212,165,116,0.8)' }}>Details</h2>
            <InfoRow label="Vintage" value={wine.vintage} />
            <InfoRow label="Varietal" value={wine.varietal} />
            <InfoRow label="Region" value={wine.region} />
            <InfoRow label="Country" value={wine.country_of_origin || wine.country} />
            <InfoRow label="Appellation" value={wine.appellation} />
            <InfoRow label="Bottle Size" value={wine.bottle_size} />
            <InfoRow label="Quantity" value={wine.quantity != null ? `${wine.quantity} bottle${wine.quantity !== 1 ? 's' : ''}` : null} />
            <InfoRow label="ABV" value={wine.abv ? `${wine.abv}%` : null} />
            <InfoRow label="Purchase Price" value={wine.purchase_price ? formatFromBase(wine.purchase_price) : null} />
            <InfoRow label="Drink From" value={wine.drink_window_start || wine.drinking_window_start} />
            <InfoRow label="Drink By" value={wine.drink_window_end || wine.drinking_window_end} />
            <InfoRow label="Storage" value={wine.storage_location_id || wine.cellar_location} />
            {wine.notes && (
              <div className="pt-3 mt-1">
                <p className="text-xs mb-1" style={{ color: 'rgba(224,216,200,0.55)' }}>Notes</p>
                <p className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>{wine.notes}</p>
              </div>
            )}
          </div>

          {/* Tastings */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(42,28,20,0.85)', border: '1px solid rgba(180,140,75,0.18)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(212,165,116,0.8)' }}>
                Tasting Log ({tastings.length})
              </h2>
              <button
                onClick={() => setLogTasting(true)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}
              >
                + Log Tasting
              </button>
            </div>
            {tastings.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'rgba(224,216,200,0.4)' }}>No tastings logged yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tastings.map((tasting) => (
                  <div key={tasting.id} className="p-3 rounded-xl" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.12)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
                        {tasting.date ? new Date(tasting.date).toLocaleDateString() : '—'}
                      </span>
                      {tasting.rating != null && (
                        <span className="text-xs font-semibold" style={{ color: '#C47070' }}>★ {tasting.rating}</span>
                      )}
                    </div>
                    {tasting.notes && <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.8)' }}>{tasting.notes}</p>}
                    {tasting.occasion && <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{tasting.occasion}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {logTasting && (
        <LogWineTastingModal
          wine={wine}
          isOpen={logTasting}
          onClose={() => setLogTasting(false)}
          onSaved={() => {
            setLogTasting(false);
            queryClient.invalidateQueries({ queryKey: ['wine-tastings', wineId] });
          }}
        />
      )}
    </div>
  );
}