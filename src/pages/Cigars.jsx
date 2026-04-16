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
import { useCurrency } from '@/lib/currency/useCurrency';

const TABS = ['collection', 'humidors', 'wishlist', 'shopping', 'restock'];

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
  // Subscribe to currency context so value displays re-render when currency changes
  useCurrency();

  const TAB_LABELS = {
    collection: t('cigars.tabCollection', 'Collection'),
    humidors: t('cigars.tabHumidors', 'Humidors'),
    wishlist: t('cigars.tabWishlist', 'Wishlist'),
    shopping: t('cigars.tabShopping', 'Shopping List'),
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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTargetCigar, setAssignTargetCigar] = useState(null);
  const [assignHumidorId, setAssignHumidorId] = useState('unassigned');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCigarIds, setSelectedCigarIds] = useState([]);
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
    } else if (activeTab === 'shopping') {
      list = list.filter((c) => c.shopping_list);
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
  const shoppingCount = useMemo(() => cigars.filter((c) => c.shopping_list).length, [cigars]);
  const restockCount = useMemo(() => cigars.filter((c) => c.restock_flag).length, [cigars]);

  const handleToggleFavorite = async (cigar) => {
    try {
      const patch = { is_favorite: !cigar.is_favorite };
      await base44.entities.Cigar.update(cigar.id, patch);
      updateCigarInCache(cigar.id, patch);
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

  const invalidateCigars = () => {
    queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['cigars-summary', user?.email] });
  };

  const updateCigarInCache = (cigarId, patch) => {
    queryClient.setQueryData(['cigars', user?.email], (prev = []) =>
      Array.isArray(prev)
        ? prev.map((c) => (c.id === cigarId ? { ...c, ...patch } : c))
        : prev
    );
    if (editingCigar?.id === cigarId) {
      setEditingCigar((prev) => (prev ? { ...prev, ...patch } : prev));
    }
  };

  const openAssignHumidorDialog = (cigar) => {
    if (!cigar?.id) return;
    setAssignTargetCigar(cigar);
    setAssignHumidorId(cigar.humidor_id || 'unassigned');
    setAssignDialogOpen(true);
  };

  const handleAssignHumidor = async () => {
    if (!assignTargetCigar?.id) return;
    const humidorId = assignHumidorId === 'unassigned' ? null : assignHumidorId;
    try {
      await base44.entities.Cigar.update(assignTargetCigar.id, {
        humidor_id: humidorId,
        ...(humidorId ? {} : {
          humidor_tray: null,
          humidor_shelf: null,
          humidor_drawer: null,
          humidor_section: null,
        }),
      });
      updateCigarInCache(assignTargetCigar.id, { humidor_id: humidorId });
      invalidateCigars();
      setAssignDialogOpen(false);
      setAssignTargetCigar(null);
      toast.success('Humidor assignment updated');
    } catch {
      toast.error('Failed to assign humidor');
    }
  };

  const handleQuickAction = async (cigar, action) => {
    if (!cigar?.id) return;
    const normalizedAction = typeof action === 'string' ? action : action?.type;
    try {
      if (normalizedAction === 'smoked_one') {
        const current = Number(cigar.singles_equivalent ?? cigar.quantity ?? 0);
        const nextSingles = Math.max(0, current - 1);
        const patch = { singles_equivalent: nextSingles };
        if (cigar.unit_type === 'single') patch.quantity = Math.max(0, Number(cigar.quantity || 0) - 1);
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'bought_more') {
        const packageSize = Number(cigar.cigars_per_package || (cigar.unit_type === 'single' ? 1 : 1));
        const patch = {
          quantity: Number(cigar.quantity || 0) + 1,
          singles_equivalent: Number(cigar.singles_equivalent ?? 0) + packageSize,
        };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'toggle_wishlist') {
        const patch = { wishlist: !cigar.wishlist };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'toggle_shopping') {
        const patch = { shopping_list: !cigar.shopping_list };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'toggle_restock') {
        const patch = { restock_flag: !cigar.restock_flag };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'toggle_not_for_me') {
        const next = !cigar.not_for_me;
        const patch = { not_for_me: next, ai_excluded: next };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'toggle_favorite') {
        const patch = { is_favorite: !cigar.is_favorite };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'assign_humidor') {
        const humidorId = action?.humidorId || null;
        const patch = {
          humidor_id: humidorId,
          ...(humidorId ? {} : {
            humidor_tray: null,
            humidor_shelf: null,
            humidor_drawer: null,
            humidor_section: null,
          }),
        };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      } else if (normalizedAction === 'unassign_humidor') {
        const patch = {
          humidor_id: null,
          humidor_tray: null,
          humidor_shelf: null,
          humidor_drawer: null,
          humidor_section: null,
        };
        await base44.entities.Cigar.update(cigar.id, patch);
        updateCigarInCache(cigar.id, patch);
      }
      invalidateCigars();
    } catch {
      toast.error('Failed to apply action');
    }
  };

  const toggleCigarSelection = (cigar) => {
    if (!cigar?.id) return;
    setSelectedCigarIds((prev) =>
      prev.includes(cigar.id) ? prev.filter((id) => id !== cigar.id) : [...prev, cigar.id]
    );
  };

  const selectedCigars = useMemo(
    () => cigars.filter((c) => selectedCigarIds.includes(c.id)),
    [cigars, selectedCigarIds]
  );

  useEffect(() => {
    setSelectedCigarIds((prev) => prev.filter((id) => cigars.some((c) => c.id === id)));
  }, [cigars]);

  const handleBulkAction = async (action, humidorId = null) => {
    if (!selectedCigarIds.length) return;
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete ${selectedCigarIds.length} cigars? This cannot be undone.`)) return;
        await Promise.all(selectedCigarIds.map((id) => base44.entities.Cigar.delete(id)));
      } else {
        const patches = selectedCigars.map((cigar) => {
          if (action === 'assign_humidor') {
            const targetId = humidorId || null;
            return {
              id: cigar.id,
              patch: {
                humidor_id: targetId,
                ...(targetId ? {} : {
                  humidor_tray: null,
                  humidor_shelf: null,
                  humidor_drawer: null,
                  humidor_section: null,
                }),
              },
            };
          }
          if (action === 'wishlist') return { id: cigar.id, patch: { wishlist: true } };
          if (action === 'shopping') return { id: cigar.id, patch: { shopping_list: true } };
          if (action === 'restock') return { id: cigar.id, patch: { restock_flag: true } };
          if (action === 'clear_flags') return { id: cigar.id, patch: { wishlist: false, shopping_list: false, restock_flag: false, not_for_me: false, ai_excluded: false } };
          return null;
        }).filter(Boolean);
        await Promise.all(patches.map(({ id, patch }) => base44.entities.Cigar.update(id, patch)));
      }
      setSelectedCigarIds([]);
      setSelectMode(false);
      invalidateCigars();
      toast.success('Bulk action applied');
    } catch {
      toast.error('Failed to apply bulk action');
    }
  };

  const selectedCount = selectedCigarIds.length;

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
                : tab === 'shopping'
                ? shoppingCount
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

            <button
              type="button"
              onClick={() => {
                const next = !selectMode;
                if (next && displayMode) {
                  setDisplayMode(false);
                  localStorage.setItem('cigarsDisplayMode', 'standard');
                }
                setSelectMode(next);
                if (!next) setSelectedCigarIds([]);
              }}
              className="px-3 py-2 rounded-xl text-sm transition-all"
              style={{
                background: selectMode ? 'rgba(140,107,63,0.25)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(140,107,63,0.2)',
                color: selectMode ? '#F5F1E7' : 'rgba(224,216,200,0.7)',
              }}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          </div>

          {selectMode && (
            <div
              className="rounded-xl p-3 flex flex-wrap items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,107,63,0.2)' }}
            >
              <span className="text-sm text-[#E0D8C8]/80 min-w-24">
                {selectedCount} selected
              </span>
              <Button size="sm" variant="outline" disabled={!selectedCount} onClick={() => handleBulkAction('wishlist')}>Wishlist</Button>
              <Button size="sm" variant="outline" disabled={!selectedCount} onClick={() => handleBulkAction('shopping')}>Shopping</Button>
              <Button size="sm" variant="outline" disabled={!selectedCount} onClick={() => handleBulkAction('restock')}>Restock</Button>
              <Button size="sm" variant="outline" disabled={!selectedCount} onClick={() => handleBulkAction('clear_flags')}>Clear Flags</Button>
              <Select
                value={assignHumidorId || 'unassigned'}
                onValueChange={(value) => {
                  setAssignHumidorId(value);
                  if (selectedCount > 0) handleBulkAction('assign_humidor', value === 'unassigned' ? null : value);
                }}
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Assign Humidor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Assign: Unassigned</SelectItem>
                  {humidors.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!selectedCount} onClick={() => handleBulkAction('delete')} style={{ color: '#E05555' }}>
                Delete
              </Button>
            </div>
          )}

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
                  : activeTab === 'shopping'
                  ? t('cigars.noShopping', 'No shopping list cigars')
                  : activeTab === 'restock'
                  ? t('cigars.noRestock', 'No restock alerts')
                  : t('cigars.noCigars', 'No cigars yet')}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {activeTab === 'collection'
                  ? t('cigars.addFirstCigar', 'Add your first cigar to start tracking your collection')
                  : activeTab === 'wishlist'
                  ? t('cigars.markAsWishlist', 'Mark cigars as wishlist to see them here')
                  : activeTab === 'shopping'
                  ? t('cigars.markAsShopping', 'Mark cigars as shopping list to see them here')
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
                  onQuickAction={handleQuickAction}
                  onEdit={(target) => {
                    setEditingCigar(target);
                    setEditDialogOpen(true);
                  }}
                  onDelete={async (target) => {
                    if (!target?.id) return;
                    if (!window.confirm(`Delete ${target.name || 'this cigar'}? This cannot be undone.`)) return;
                    try {
                      await base44.entities.Cigar.delete(target.id);
                      invalidateCigars();
                      toast.success('Cigar deleted');
                    } catch {
                      toast.error('Failed to delete cigar');
                    }
                  }}
                  onAssignHumidor={openAssignHumidorDialog}
                  humidors={humidors}
                  selectMode={selectMode}
                  isSelected={selectedCigarIds.includes(cigar.id)}
                  onToggleSelect={toggleCigarSelection}
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
                  onQuickAction={handleQuickAction}
                  onEdit={(target) => {
                    setEditingCigar(target);
                    setEditDialogOpen(true);
                  }}
                  onDelete={async (target) => {
                    if (!target?.id) return;
                    if (!window.confirm(`Delete ${target.name || 'this cigar'}? This cannot be undone.`)) return;
                    try {
                      await base44.entities.Cigar.delete(target.id);
                      invalidateCigars();
                      toast.success('Cigar deleted');
                    } catch {
                      toast.error('Failed to delete cigar');
                    }
                  }}
                  onAssignHumidor={openAssignHumidorDialog}
                  humidors={humidors}
                  selectMode={selectMode}
                  isSelected={selectedCigarIds.includes(cigar.id)}
                  onToggleSelect={toggleCigarSelection}
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

      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setAssignTargetCigar(null);
        }}
      >
        <DialogContent className="max-w-md" style={{ background: 'rgba(27,19,13,0.98)', border: '1px solid rgba(140,107,63,0.35)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              Assign Humidor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#E0D8C8]/70">
              {assignTargetCigar ? `${assignTargetCigar.brand || ''} ${assignTargetCigar.name || ''}`.trim() : ''}
            </p>
            <Select value={assignHumidorId || 'unassigned'} onValueChange={setAssignHumidorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select humidor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {humidors.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignHumidor}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
