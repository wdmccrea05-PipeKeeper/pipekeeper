import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Grid3X3, List, Cigarette, SortAsc, Filter, Package2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import CigarCard from '@/components/cigars/CigarCard';
import CigarListItem from '@/components/cigars/CigarListItem';
import CigarForm from '@/components/cigars/CigarForm';
import AddCigarModal from '@/components/cigars/AddCigarModal';
import HumidorManager from '@/components/cigars/HumidorManager';
import CollectorGridView from '@/components/ui/CollectorGridView';

const TABS = ['collection', 'humidors', 'wishlist', 'restock'];

const BODY_OPTIONS = ['mild', 'mild_medium', 'medium', 'medium_full', 'full'];
const STRENGTH_OPTIONS = ['mild', 'medium', 'full'];

function sortCigars(cigars, sortBy) {
  return [...cigars].sort((a, b) => {
    const aVal = a[sortBy] ?? '';
    const bVal = b[sortBy] ?? '';
    if (typeof aVal === 'number' && typeof bVal === 'number') return bVal - aVal;
    return String(aVal).localeCompare(String(bVal));
  });
}

function matchesSearch(cigar, q) {
  if (!q) return true;
  const haystack = [
    cigar.name,
    cigar.brand,
    cigar.vitola,
    cigar.wrapper,
    cigar.line,
    cigar.country_of_origin,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q.toLowerCase().trim());
}

function TabButton({ label, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
      style={{
        background: active ? 'rgba(140,107,63,0.35)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(140,107,63,0.5)' : '1px solid rgba(140,107,63,0.18)',
        color: active ? '#F5F1E7' : 'rgba(224,216,200,0.7)',
      }}
    >
      {label}
      {badge > 0 && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
          style={{
            background: 'rgba(140,107,63,0.4)',
            color: '#D4A574',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function CigarsInner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const TAB_LABELS = {
    collection: t('cigars.tabCollection', 'Collection'),
    humidors: t('cigars.tabHumidors', 'Humidors'),
    wishlist: t('cigars.tabWishlist', 'Wishlist'),
    restock: t('cigars.tabRestock', 'Restock'),
  };

  const SORT_OPTIONS = [
    { value: 'name', label: t('cigars.sortName', 'Name') },
    { value: 'brand', label: t('cigars.sortBrand', 'Brand') },
    { value: 'created_date', label: t('cigars.sortAddedDate', 'Added Date') },
    { value: 'estimated_value', label: t('cigars.sortValue', 'Value') },
    { value: 'quantity', label: t('cigars.sortQuantity', 'Quantity') },
  ];

  const searchParams = new URLSearchParams(location.search);
  const actionParam = searchParams.get('action');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'collection');
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBody, setFilterBody] = useState('');
  const [filterStrength, setFilterStrength] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterHumidor, setFilterHumidor] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCigar, setEditingCigar] = useState(null);
  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem('cigarsDisplayMode') === 'collector';
  });

  useEffect(() => {
    if (actionParam === 'add') {
      setActiveTab('collection');
      setAddFlowOpen(true);
    }
    if (tabParam && TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [actionParam, tabParam]);

  const { data: cigars = [], isLoading } = useQuery({
    queryKey: ['cigars', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.Cigar.filter(
        { created_by: user?.email },
        '-created_date',
        500
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.HumidorLocation.filter(
        { created_by: user?.email }
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const origins = useMemo(() => {
    const set = new Set(cigars.map((c) => c.country_of_origin).filter(Boolean));
    return Array.from(set).sort();
  }, [cigars]);

  const filteredCigars = useMemo(() => {
    let list = cigars;

    if (activeTab === 'wishlist') {
      list = list.filter((c) => c.wishlist);
    } else if (activeTab === 'restock') {
      list = list.filter((c) => c.restock_flag);
    }

    if (search) list = list.filter((c) => matchesSearch(c, search));
    if (filterBody) list = list.filter((c) => c.body === filterBody);
    if (filterStrength) list = list.filter((c) => c.strength === filterStrength);
    if (filterOrigin) list = list.filter((c) => c.country_of_origin === filterOrigin);
    if (filterHumidor) list = list.filter((c) => c.humidor_id === filterHumidor);

    return sortCigars(list, sortBy);
  }, [cigars, activeTab, search, sortBy, filterBody, filterStrength, filterOrigin, filterHumidor]);

  const wishlistCount = useMemo(() => cigars.filter((c) => c.wishlist).length, [cigars]);
  const restockCount = useMemo(() => cigars.filter((c) => c.restock_flag).length, [cigars]);

  const handleToggleFavorite = async (cigar) => {
    try {
      await base44.entities.Cigar.update(cigar.id, { is_favorite: !cigar.is_favorite });
      queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleFormSubmit = () => {
    queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
    setEditDialogOpen(false);
    setEditingCigar(null);
  };

  const openAdd = () => {
    setAddFlowOpen(true);
  };

  return (
    <div className="space-y-6 text-[#F5F1E7]">
      <CigarKeeperModuleNav currentPageName="Cigars" onLogSession={undefined} />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
            {t('cigars.collection', 'Cigar Collection')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.65)' }}>
          {cigars.length} {t('cigars.inCollection', 'in your collection')}
          </p>
        </div>
        <Button
          onClick={openAdd}
          style={{
            background: 'linear-gradient(135deg, rgba(140,107,63,1), rgba(100,74,45,1))',
            color: '#F5F1E7',
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('cigars.addCigar', 'Add Cigar')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            label={TAB_LABELS[tab]}
            active={activeTab === tab}
            badge={
              tab === 'wishlist'
                ? wishlistCount
                : tab === 'restock'
                ? restockCount
                : tab === 'collection'
                ? cigars.length
                : 0
            }
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {activeTab === 'humidors' ? (
        <HumidorManager cigars={cigars} />
      ) : (
        <>
          {/* Search + sort + view controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[160px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(140,107,63,0.2)',
              }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'rgba(224,216,200,0.5)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('cigars.searchPlaceholder', 'Search by name, brand, vitola, wrapper…')}
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: '#F5F1E7' }}
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                className="w-40 h-9"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(140,107,63,0.2)',
                  color: '#F5F1E7',
                }}
              >
                <SortAsc className="w-3.5 h-3.5 mr-1.5" style={{ color: 'rgba(224,216,200,0.5)' }} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: 'rgba(25,17,11,0.98)', border: '1px solid rgba(140,107,63,0.35)' }}>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all"
              style={{
                background: showFilters ? 'rgba(140,107,63,0.3)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(140,107,63,0.2)',
                color: 'rgba(224,216,200,0.8)',
              }}
            >
              <Filter className="w-4 h-4" />
              {t('common.filter', 'Filter')}
            </button>

            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(140,107,63,0.2)' }}
            >
              {['grid', 'list'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className="px-3 py-2"
                  style={{
                    background: viewMode === mode ? 'rgba(140,107,63,0.25)' : 'rgba(255,255,255,0.03)',
                    color: '#F5F1E7',
                  }}
                >
                  {mode === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const newMode = !displayMode;
                setDisplayMode(newMode);
                localStorage.setItem('cigarsDisplayMode', newMode ? 'collector' : 'standard');
              }}
              className="px-3 py-2 rounded-xl text-sm transition-all"
              style={{
                background: displayMode ? 'rgba(140,107,63,0.25)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(140,107,63,0.2)',
                color: displayMode ? 'rgba(140, 107, 63, 1)' : 'rgba(224, 216, 200, 0.7)',
              }}
              title="Collector Display Mode"
            >
              <Package2 className="w-4 h-4" />
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div
              className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
              style={{
                background: 'rgba(40,28,18,0.7)',
                border: '1px solid rgba(140,107,63,0.2)',
              }}
            >
              <div>
                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {t('cigars.filterBody', 'Body')}
                </label>
                <Select value={filterBody || 'all'} onValueChange={(v) => setFilterBody(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,107,63,0.2)', color: '#F5F1E7' }}>
                    <SelectValue placeholder={t('cigars.filterAny', 'Any')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('cigars.filterAny', 'Any')}</SelectItem>
                    {BODY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o.replace('_', '-')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {t('cigars.filterStrength', 'Strength')}
                </label>
                <Select value={filterStrength || 'all'} onValueChange={(v) => setFilterStrength(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,107,63,0.2)', color: '#F5F1E7' }}>
                    <SelectValue placeholder={t('cigars.filterAny', 'Any')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('cigars.filterAny', 'Any')}</SelectItem>
                    {STRENGTH_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {t('cigars.filterOrigin', 'Origin')}
                </label>
                <Select value={filterOrigin || 'all'} onValueChange={(v) => setFilterOrigin(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,107,63,0.2)', color: '#F5F1E7' }}>
                    <SelectValue placeholder={t('cigars.filterAny', 'Any')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('cigars.filterAny', 'Any')}</SelectItem>
                    {origins.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {t('cigars.filterHumidor', 'Humidor')}
                </label>
                <Select value={filterHumidor || 'all'} onValueChange={(v) => setFilterHumidor(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,107,63,0.2)', color: '#F5F1E7' }}>
                    <SelectValue placeholder={t('cigars.filterAny', 'Any')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('cigars.filterAny', 'Any')}</SelectItem>
                    {humidors.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results count */}
          {(search || filterBody || filterStrength || filterOrigin || filterHumidor) && (
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {filteredCigars.length} {filteredCigars.length !== 1 ? t('cigars.results', 'results') : t('cigars.result', 'result')}
            </p>
          )}

          {/* Content */}
          {isLoading ? (
            <p style={{ color: 'rgba(224,216,200,0.6)' }}>{t('common.loading')}</p>
          ) : filteredCigars.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'rgba(42,31,24,0.55)',
                border: '1px solid rgba(140,107,63,0.18)',
              }}
            >
              <Cigarette className="w-10 h-10 mx-auto mb-4" style={{ color: '#8C6B3F' }} />
              <p className="text-2xl font-semibold" style={{ color: '#F5F1E7' }}>
                {activeTab === 'wishlist'
                  ? t('cigars.noWishlist', 'No wishlist cigars')
                  : activeTab === 'restock'
                  ? t('cigars.noRestock', 'No restock alerts')
                  : t('cigars.noCigars', 'No cigars yet')}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {activeTab === 'collection'
                  ? t('cigars.addFirstCigar', 'Add your first cigar to start tracking your collection')
                  : activeTab === 'wishlist'
                  ? t('cigars.markAsWishlist', 'Mark cigars as wishlist to see them here')
                  : t('cigars.markAsRestock', 'Mark cigars for restock to see them here')}
              </p>
              {activeTab === 'collection' && (
                <Button className="mt-5" onClick={openAdd}>
                  {t('cigars.addFirstCigarBtn', 'Add your first cigar')}
                </Button>
              )}
            </div>
          ) : displayMode && viewMode === 'grid' ? (
            <CollectorGridView
              items={filteredCigars}
              getImage={(cigar) => cigar.photos?.[0]}
              getTitle={(cigar) => cigar.name}
              getSubtitle={(cigar) => [cigar.brand, cigar.vitola].filter(Boolean).join(' · ')}
              getValue={(cigar) => cigar.estimated_value}
              getIsFavorite={(cigar) => cigar.is_favorite}
              getKey={(cigar) => cigar.id}
              onToggleFavorite={(cigar) => handleToggleFavorite(cigar)}
              onClick={(cigar) => {
                setEditingCigar(cigar);
                setEditDialogOpen(true);
              }}
              onEdit={(cigar) => {
                setEditingCigar(cigar);
                setEditDialogOpen(true);
              }}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              gap="gap-8"
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {filteredCigars.map((cigar) => (
                <CigarCard
                  key={cigar.id}
                  cigar={cigar}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCigars.map((cigar) => (
                <CigarListItem
                  key={cigar.id}
                  cigar={cigar}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit dialog */}
      <AddCigarModal
        open={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
      />

      {/* Edit dialog — only opened when editing an existing cigar */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setEditingCigar(null);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{
            background: 'linear-gradient(145deg, rgba(40,28,18,0.98), rgba(27,19,13,0.99))',
            border: '1px solid rgba(140,107,63,0.35)',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              {t('cigars.editCigar', 'Edit Cigar')}
            </DialogTitle>
          </DialogHeader>
          <CigarForm
            cigar={editingCigar || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setEditDialogOpen(false);
              setEditingCigar(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// LockedModuleGuard is already applied by App.jsx's CigarReleaseRoute wrapper
export default function Cigars() {
  return <CigarsInner />;
}