import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wine, Plus, Search, Star, Edit2, Trash2, BookmarkPlus, Filter, ChevronDown, Grid3X3, List } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import WineForm from '@/components/wine/WineForm';
import WineListItem from '@/components/wine/WineListItem';
import LogWineTastingModal from '@/components/wine/LogWineTastingModal';
import AddFlowModal from '@/components/addflow/AddFlowModal';
import EnrichButton from '@/components/shared/EnrichButton';
import AddToWantListModal from '@/components/wantlist/AddToWantListModal';
import { useCurrency } from '@/lib/currency/useCurrency';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';
import {
  getWineTotalValue, getWineQuantity, getWineDrinkWindowStatus,
  getWinePrimaryImage, sortWines, filterWines, searchWines,
  getWineValuationConfidence,
} from '@/lib/collection/wineSelectors';

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'producer_asc', label: 'Producer A–Z' },
  { value: 'vintage_desc', label: 'Vintage Newest' },
  { value: 'vintage_asc', label: 'Vintage Oldest' },
  { value: 'value_desc', label: 'Highest Value' },
  { value: 'value_asc', label: 'Lowest Value' },
  { value: 'rating_desc', label: 'Highest Rating' },
  { value: 'quantity_desc', label: 'Most Bottles' },
  { value: 'drink_now', label: 'Drink Now' },
  { value: 'drink_window', label: 'Drink Soon' },
  { value: 'region_asc', label: 'Region' },
  { value: 'varietal_asc', label: 'Varietal' },
  { value: 'style_asc', label: 'Style' },
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'recently_updated', label: 'Recently Updated' },
  { value: 'needs_valuation', label: 'Needs Valuation' },
];

const STYLES = ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange', 'other'];
const DRINK_WINDOW_LABELS = { drink_now: 'Drink Now', too_young: 'Too Young', past_peak: 'Past Peak' };
const DRINK_WINDOW_COLORS = { drink_now: '#2E7D5C', too_young: '#6B8FC4', past_peak: '#A35C5C' };

function WineCard({ wine, onEdit, onDelete, onLogTasting, onEnriched, onAddToWantList, formatFromBase, navigate }) {
  const dwStatus = getWineDrinkWindowStatus(wine);
  const totalValue = getWineTotalValue(wine);
  const confidence = getWineValuationConfidence(wine);
  const photo = getWinePrimaryImage(wine);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all hover:border-[rgba(139,58,58,0.5)] hover:-translate-y-0.5 cursor-pointer flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(52,32,22,0.98), rgba(30,18,12,1))',
        border: '1px solid rgba(139,58,58,0.28)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.42)',
      }}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        navigate(`/WineDetail?id=${encodeURIComponent(wine.id)}`);
      }}
    >
      {/* Image area — same h-48 / object-contain as BottleCard */}
      <div className="relative h-48 bg-gradient-to-b from-[#3d2020] to-[#200f0f]">
        {photo ? (
          <img src={photo} alt={wine.name} className="w-full h-48 object-contain" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Wine className="w-12 h-12" style={{ color: 'rgba(139,58,58,0.3)' }} />
          </div>
        )}
        {wine.style && (
          <div className="absolute top-3 left-3">
            <span className="text-xs px-2 py-1 rounded-full capitalize font-medium" style={{ background: 'rgba(139,58,58,0.7)', color: '#F5E8E8', border: '1px solid rgba(139,58,58,0.5)' }}>
              {wine.style}
            </span>
          </div>
        )}
        {wine.is_favorite && (
          <div className="absolute top-3 right-3">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(212,165,116,0.75)', color: '#fff' }}>★</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 space-y-4">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-[#F5F1E7] leading-tight break-words">{wine.name}</h3>
          <p className="text-sm text-[#E0D8C8] break-words mt-1.5 leading-relaxed">
            {[wine.producer, wine.vintage ? String(wine.vintage) : null].filter(Boolean).join(' · ') || 'No details'}
          </p>
          {(wine.region || wine.appellation || wine.varietal) && (
            <p className="text-xs mt-1 truncate" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {[wine.appellation || wine.region, wine.varietal].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {dwStatus && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${DRINK_WINDOW_COLORS[dwStatus]}22`, color: DRINK_WINDOW_COLORS[dwStatus], border: `1px solid ${DRINK_WINDOW_COLORS[dwStatus]}44` }}>
              {DRINK_WINDOW_LABELS[dwStatus]}
            </span>
          )}
          {getWineQuantity(wine) > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(224,216,200,0.65)' }}>×{getWineQuantity(wine)} btls</span>
          )}
          {wine.rating > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: 'rgba(196,112,112,0.12)', color: '#C47070', border: '1px solid rgba(196,112,112,0.25)' }}>
              <Star className="w-2.5 h-2.5 fill-current" /> {wine.rating}
            </span>
          )}
        </div>

        {/* Value panel — mirrors WhiskeyKeeper BottleCard style */}
        <div className="rounded-xl p-3.5" style={{ background: 'rgba(139,58,58,0.10)', border: '1px solid rgba(139,58,58,0.18)' }}>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#D4A574' }}>
            {totalValue > 0 ? (confidence === 'low' ? '~Estimated Value' : 'Collection Value') : 'Not Valued'}
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: totalValue > 0 ? '#F5F1E7' : 'rgba(224,216,200,0.3)' }}>
            {totalValue > 0 ? formatFromBase(totalValue) : '—'}
          </div>
          {wine.notes && (
            <p className="text-sm mt-2 break-words" style={{ color: 'rgba(224,216,200,0.65)', lineHeight: '1.5' }}>
              {wine.notes.slice(0, 80)}{wine.notes.length > 80 ? '…' : ''}
            </p>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onLogTasting(wine)}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium"
            style={{ background: 'rgba(139,58,58,0.2)', color: '#C47070', border: '1px solid rgba(139,58,58,0.3)' }}
          >
            Log Tasting
          </button>
          <EnrichButton itemType="wine" record={wine} onEnriched={onEnriched} />
          <button onClick={() => onAddToWantList(wine)} className="p-1.5 rounded-lg hover:opacity-70" title="Add to Want List" style={{ color: 'rgba(224,216,200,0.5)' }}>
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(wine)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'rgba(224,216,200,0.5)' }}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(wine)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'rgba(224,216,200,0.35)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Wines() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userEmail = user?.email ?? null;

  const urlParams = new URLSearchParams(window.location.search);
  const [showAddModal, setShowAddModal] = useState(urlParams.get('action') === 'add');
  const [editingWine, setEditingWine] = useState(null);
  const [tastingWine, setTastingWine] = useState(null);
  const [wantListWine, setWantListWine] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('wineViewMode') || 'grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});

  const invalidateWines = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wines(userEmail) });
  const invalidateWineTastingsSummary = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wineTastingsSummary(userEmail) });
  const openWineDetail = (wineId) => navigate(`/WineDetail?id=${encodeURIComponent(wineId)}`);
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('wineViewMode', mode);
  };

  const { data: wines = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.wines(userEmail),
    queryFn: async () => {
      const result = await base44.entities.Wine.filter({ created_by: userEmail }, '-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!userEmail,
    staleTime: STALE_TIME.COLLECTION,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Wine.delete(id),
    onSuccess: invalidateWines,
  });

  const filtered = useMemo(() => {
    let list = searchWines(wines, search);
    list = filterWines(list, filters);
    list = sortWines(list, sortBy);
    return list;
  }, [wines, search, sortBy, filters]);

  const handleDelete = (wine) => {
    if (window.confirm(`Delete "${wine.name}"?`)) deleteMutation.mutate(wine.id);
  };

  const setFilter = (key, val) => setFilters((prev) => val ? { ...prev, [key]: val } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));

  if (editingWine) {
    return (
      <div className="space-y-6">
        <WineKeeperModuleNav currentPageName="Wines" />
        <WineForm
          wine={editingWine}
          onSaved={() => { setEditingWine(null); invalidateWines(); }}
          onCancel={() => setEditingWine(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WineKeeperModuleNav currentPageName="Wines" />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>
          Wine Collection
          <span className="text-sm font-normal ml-2" style={{ color: 'rgba(224,216,200,0.5)' }}>({wines.length})</span>
        </h1>
        <Button onClick={() => setShowAddModal(true)} style={{ background: '#8B3A3A', color: '#F5F1E7' }} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Bottle
        </Button>
      </div>

      {/* Search + Sort + Filter row */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(224,216,200,0.4)' }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, producer, region, varietal…"
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
          style={{ background: 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
          style={{ background: Object.keys(filters).length > 0 ? 'rgba(139,58,58,0.25)' : 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
        >
          <Filter className="w-4 h-4" />
          Filters {Object.keys(filters).length > 0 ? `(${Object.keys(filters).length})` : ''}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(180,140,75,0.25)' }} role="group" aria-label="View mode">
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => handleViewModeChange('grid')}
            className={`rounded-none rounded-l-lg ${viewMode === 'grid' ? 'bg-[rgba(139,58,58,0.24)] text-[#F5F1E7]' : 'text-[#E0D8C8]/65 hover:bg-[rgba(255,255,255,0.05)]'}`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => handleViewModeChange('list')}
            className={`rounded-none rounded-r-lg ${viewMode === 'list' ? 'bg-[rgba(139,58,58,0.24)] text-[#F5F1E7]' : 'text-[#E0D8C8]/65 hover:bg-[rgba(255,255,255,0.05)]'}`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ background: 'rgba(42,28,20,0.7)', border: '1px solid rgba(180,140,75,0.15)' }}>
          <div>
            <label className="ck-field-label">Style</label>
            <select value={filters.style || ''} onChange={(e) => setFilter('style', e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-sm" style={{ background: 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.2)', color: '#F5F1E7' }}>
              <option value="">All</option>
              {STYLES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="ck-field-label">Drink Window</label>
            <select value={filters.drink_window || ''} onChange={(e) => setFilter('drink_window', e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-sm" style={{ background: 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.2)', color: '#F5F1E7' }}>
              <option value="">All</option>
              <option value="drink_now">Drink Now</option>
              <option value="too_young">Too Young</option>
              <option value="past_peak">Past Peak</option>
            </select>
          </div>
          <div>
            <label className="ck-field-label">Valuation</label>
            <select value={filters.valued || ''} onChange={(e) => setFilter('valued', e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-sm" style={{ background: 'rgba(20,14,10,0.7)', border: '1px solid rgba(180,140,75,0.2)', color: '#F5F1E7' }}>
              <option value="">All</option>
              <option value="valued">Valued</option>
              <option value="unvalued">Needs Valuation</option>
            </select>
          </div>
          <div>
            <label className="ck-field-label">Vintage From</label>
            <Input type="number" value={filters.vintage_min || ''} onChange={(e) => setFilter('vintage_min', e.target.value)} placeholder="e.g. 2010" className="text-sm" />
          </div>
          <div>
            <label className="ck-field-label">Vintage To</label>
            <Input type="number" value={filters.vintage_max || ''} onChange={(e) => setFilter('vintage_max', e.target.value)} placeholder="e.g. 2023" className="text-sm" />
          </div>
          {Object.keys(filters).length > 0 && (
            <button onClick={() => setFilters({})} className="text-xs underline mt-2" style={{ color: '#C47070' }}>Clear filters</button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12" style={{ color: 'rgba(224,216,200,0.5)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Wine className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(139,58,58,0.4)' }} />
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {search || Object.keys(filters).length > 0 ? 'No bottles match your filters.' : 'No bottles yet. Add your first wine!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((wine) => (
            <WineCard
              key={wine.id}
              wine={wine}
              onEdit={setEditingWine}
              onDelete={handleDelete}
              onLogTasting={setTastingWine}
              onAddToWantList={setWantListWine}
              onEnriched={invalidateWines}
              formatFromBase={formatFromBase}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wine) => (
            <WineListItem
              key={wine.id}
              wine={wine}
              onOpen={() => openWineDetail(wine.id)}
              onEdit={setEditingWine}
              onDelete={handleDelete}
              onLogTasting={setTastingWine}
              onEnriched={invalidateWines}
              onAddToWantList={setWantListWine}
              formatFromBase={formatFromBase}
            />
          ))}
        </div>
      )}

      {tastingWine && (
        <LogWineTastingModal
          wine={tastingWine}
          wines={wines}
          isOpen={!!tastingWine}
          onClose={() => setTastingWine(null)}
          onSaved={() => { setTastingWine(null); invalidateWineTastingsSummary(); }}
        />
      )}

      {wantListWine && (
        <AddToWantListModal
          open={!!wantListWine}
          onOpenChange={(open) => { if (!open) setWantListWine(null); }}
          item={{ name: wantListWine.name, maker: wantListWine.producer, image: getWinePrimaryImage(wantListWine) }}
          itemType="wine"
        />
      )}

      <AddFlowModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={invalidateWines}
        initialItemType="wine"
      />
    </div>
  );
}