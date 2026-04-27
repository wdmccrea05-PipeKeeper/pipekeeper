import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wine, Plus, Search, Star, Edit2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import WineForm from '@/components/wine/WineForm';
import LogWineTastingModal from '@/components/wine/LogWineTastingModal';
import { useCurrency } from '@/lib/currency/useCurrency';

function WineCard({ wine, onEdit, onDelete, onLogTasting, formatFromBase, t }) {
  const drinkingStatus = useMemo(() => {
    if (!wine.drinking_window_start || !wine.drinking_window_end) return null;
    const now = new Date();
    const start = new Date(wine.drinking_window_start);
    const end = new Date(wine.drinking_window_end);
    if (now < start) return { label: t('wine.tooYoung', 'Too Young'), color: '#6B8FC4' };
    if (now > end) return { label: t('wine.pastPeak', 'Past Peak'), color: '#A35C5C' };
    return { label: t('wine.drinkNow', 'Drink Now'), color: '#2E7D5C' };
  }, [wine, t]);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
      style={{ background: 'rgba(42,28,20,0.85)', border: '1px solid rgba(139,58,58,0.28)' }}
    >
      {wine.photos?.[0] ? (
        <div className="h-32 overflow-hidden">
          <img src={wine.photos[0]} alt={wine.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center" style={{ background: 'rgba(139,58,58,0.1)' }}>
          <Wine className="w-10 h-10" style={{ color: 'rgba(139,58,58,0.4)' }} />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" style={{ color: '#F5F1E7' }}>{wine.name}</h3>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
              {[wine.producer, wine.vintage].filter(Boolean).join(' · ')}
            </p>
            {wine.region && (
              <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{wine.region}</p>
            )}
          </div>
          {wine.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3" style={{ color: '#C47070', fill: '#C47070' }} />
              <span className="text-xs font-semibold" style={{ color: '#C47070' }}>{wine.rating}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {drinkingStatus && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${drinkingStatus.color}22`, color: drinkingStatus.color, border: `1px solid ${drinkingStatus.color}44` }}
            >
              {drinkingStatus.label}
            </span>
          )}
          {wine.quantity > 1 && (
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
              ×{wine.quantity} {t('wine.bottles', 'btls')}
            </span>
          )}
          {wine.estimated_value > 0 && (
            <span className="text-xs ml-auto" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {formatFromBase(wine.estimated_value)}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onLogTasting(wine)}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all"
            style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}
          >
            {t('wine.logTasting', 'Log Tasting')}
          </button>
          <button onClick={() => onEdit(wine)} className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'rgba(224,216,200,0.5)' }}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(wine)} className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'rgba(224,216,200,0.4)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Wines() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const [showForm, setShowForm] = useState(urlParams.get('action') === 'add');
  const [editingWine, setEditingWine] = useState(null);
  const [tastingWine, setTastingWine] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const { data: wines = [], isLoading } = useQuery({
    queryKey: ['wines', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Wine.filter({ created_by: user?.email }, '-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Wine.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wines'] }),
  });

  const filtered = useMemo(() => {
    let list = [...wines];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        [w.name, w.producer, w.region, w.varietal, w.vintage?.toString()].some((v) => v?.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'vintage') return (b.vintage || 0) - (a.vintage || 0);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'value') return ((b.estimated_value || 0) * (b.quantity || 1)) - ((a.estimated_value || 0) * (a.quantity || 1));
      return 0;
    });
    return list;
  }, [wines, search, sortBy]);

  const handleDelete = (wine) => {
    if (window.confirm(`${t('common.confirmDelete', 'Delete')} "${wine.name}"?`)) {
      deleteMutation.mutate(wine.id);
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingWine(null);
    queryClient.invalidateQueries({ queryKey: ['wines'] });
  };

  if (showForm || editingWine) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <WineForm
          wine={editingWine}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingWine(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WineKeeperModuleNav currentPageName="Wines" />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>
          {t('wine.collection', 'Wine Collection')}
          <span className="text-sm font-normal ml-2" style={{ color: 'rgba(224,216,200,0.5)' }}>({wines.length})</span>
        </h1>
        <Button onClick={() => setShowForm(true)} style={{ background: '#8B3A3A', color: '#F5F1E7' }} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t('wine.addBottle', 'Add Bottle')}
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(224,216,200,0.4)' }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('wine.searchPlaceholder', 'Search by name, producer, region, varietal…')}
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
          style={{ background: 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
        >
          <option value="name">{t('wine.sortName', 'Name')}</option>
          <option value="vintage">{t('wine.sortVintage', 'Vintage')}</option>
          <option value="rating">{t('wine.sortRating', 'Rating')}</option>
          <option value="value">{t('wine.sortValue', 'Value')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Wine className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(139,58,58,0.4)' }} />
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {search ? t('wine.noBottlesFound', 'No bottles found') : t('wine.noBottlesYet', 'No bottles yet')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((wine) => (
            <WineCard
              key={wine.id}
              wine={wine}
              onEdit={setEditingWine}
              onDelete={handleDelete}
              onLogTasting={setTastingWine}
              formatFromBase={formatFromBase}
              t={t}
            />
          ))}
        </div>
      )}

      {tastingWine && (
        <LogWineTastingModal
          wine={tastingWine}
          isOpen={!!tastingWine}
          onClose={() => setTastingWine(null)}
          onSaved={() => { setTastingWine(null); queryClient.invalidateQueries({ queryKey: ['wine-tastings-summary'] }); }}
        />
      )}
    </div>
  );
}