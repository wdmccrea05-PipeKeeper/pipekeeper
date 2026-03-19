import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import {
  Plus, BookOpen, TrendingUp, Search, Package, Grid3X3, List,
  Package2, Pencil, Trash2, GlassWater, Star, DollarSign, Layers
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from '@/components/i18n/safeTranslation';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import BottleCard from '@/components/whiskey/BottleCard';
import BottleListItem from '@/components/whiskey/BottleListItem';
import BottleForm from '@/components/whiskey/BottleForm';
import LogTastingModal from '@/components/whiskey/LogTastingModal';
import BottleInsights from '@/components/whiskey/BottleInsights';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import QuickSearchBottle from '@/components/ai/QuickSearchBottle';
import InventoryManager from '@/components/whiskey/InventoryManager';
import InventoryMigrator from '@/components/whiskey/InventoryMigrator';
import CollectorDisplayCard from '@/components/ui/CollectorDisplayCard';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import WhiskeyExporter from '@/components/export/WhiskeyExporter';
import { getBottleUnitValue } from '@/components/utils/whiskeyValueHelpers';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

function StatBadge({ icon: Icon, label, value, accent = '#D4A574' }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(42,28,18,0.7), rgba(28,18,12,0.85))',
        border: '1px solid rgba(180,140,75,0.18)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(180,140,75,0.65)' }}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold" style={{ color: accent, fontFamily: "'Georgia', serif" }}>
        {value}
      </p>
    </div>
  );
}

export default function WhiskeyPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingBottle, setEditingBottle] = useState(null);
  const [showTastingLog, setShowTastingLog] = useState(null);
  const [editingTastingLog, setEditingTastingLog] = useState(null);
  const [shareBottle, setShareBottle] = useState(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [inventoryBottle, setInventoryBottle] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('whiskeyViewMode') || 'grid');
  const [displayMode, setDisplayMode] = useState(() => localStorage.getItem('whiskeyDisplayMode') === 'collector');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('whiskeySortBy') || 'date');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
      setShowForm(true);
      window.history.replaceState({}, '', '/Whiskey');
    }
  }, []);

  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles', user?.email, sortBy],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const filteredBottles = (bottles || []).sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    return new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 100);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Aggregate stats
  const stats = useMemo(() => {
    const totalValue = bottles.reduce((sum, b) => {
      const v = Number(b?.collector_value) || Number(b?.aftermarket_price) || Number(b?.retail_price) || Number(b?.purchase_price) || 0;
      return sum + v;
    }, 0);
    const ratedBottles = bottles.filter(b => b.rating && Number(b.rating) > 0);
    const avgRating = ratedBottles.length > 0
      ? (ratedBottles.reduce((s, b) => s + Number(b.rating), 0) / ratedBottles.length).toFixed(1)
      : null;
    return {
      count: bottles.length,
      totalValue,
      avgRating,
      tastingCount: tastingLogs.length,
    };
  }, [bottles, tastingLogs]);

  const createBottleMutation = useMutation({
    mutationFn: (data) => base44.entities.Bottle.create(data),
    onSuccess: (created, data) => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      setShowForm(false);
      setEditingBottle(null);
      toast.success(t('whiskey.bottleAdded', 'Whiskey added!'));
      if (created?.id) setInventoryBottle({ ...data, id: created.id });
    },
  });

  const updateBottleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bottle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      setShowForm(false);
      setEditingBottle(null);
      toast.success(t('whiskey.bottleUpdated', 'Whiskey updated!'));
    },
  });

  const deleteBottleMutation = useMutation({
    mutationFn: async (id) => {
      const units = await base44.entities.WhiskeyInventoryUnit.filter({ bottle_id: id }).catch(() => []);
      await Promise.all((Array.isArray(units) ? units : []).map((u) => base44.entities.WhiskeyInventoryUnit.delete(u.id).catch(() => null)));
      const logs = await base44.entities.TastingLog.filter({ bottle_id: id }).catch(() => []);
      await Promise.all((Array.isArray(logs) ? logs : []).map((l) => base44.entities.TastingLog.delete(l.id).catch(() => null)));
      return base44.entities.Bottle.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      queryClient.invalidateQueries({ queryKey: ['whiskey-inventory'] });
      toast.success(t('whiskey.bottleDeleted', 'Bottle deleted!'));
    },
  });

  const deleteTastingLogMutation = useMutation({
    mutationFn: (id) => base44.entities.TastingLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      toast.success(t('whiskey.tastingDeleted', 'Tasting deleted'));
    },
  });

  const handleSaveBottle = (data) => {
    if (editingBottle) {
      updateBottleMutation.mutate({ id: editingBottle.id, data });
    } else {
      createBottleMutation.mutate(data);
    }
  };

  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <div className="space-y-8">
        <InventoryMigrator />
        <WhiskeyKeeperModuleNav currentPageName="Whiskey" />

        {/* Hero Header */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, rgba(38,24,14,0.97) 0%, rgba(50,32,18,0.96) 50%, rgba(38,24,14,0.97) 100%)',
            border: '1px solid rgba(180,140,75,0.28)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(180,140,100,0.1)',
          }}
        >
          {/* Gold accent top line */}
          <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, rgba(180,140,75,0) 0%, rgba(180,140,75,0.8) 50%, rgba(180,140,75,0) 100%)' }} />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              {/* Left: Title + stats */}
              <div className="space-y-5 flex-1 min-w-0">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-shrink-0">
                    <img
                      src={MODULE_ICONS.whiskeykeeper}
                      alt="WhiskeyKeeper"
                      className="w-12 h-12 object-contain"
                      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))', backgroundColor: 'transparent' }}
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1
                      className="text-3xl sm:text-4xl font-bold tracking-tight break-words"
                      style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
                    >
                      {t('whiskeykeeper.title', 'WhiskeyKeeper')}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.65)' }}>
                      {t('whiskeykeeper.description', 'Track bottles, inventory, value, and tasting notes')}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                {bottles.length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    <StatBadge icon={GlassWater} label={t('hub.bottles', 'Bottles')} value={stats.count} accent="#D4A574" />
                    <StatBadge icon={BookOpen} label={t('whiskey.tastings', 'Tastings')} value={stats.tastingCount} accent="#C87941" />
                    {stats.avgRating && (
                      <StatBadge icon={Star} label={t('common.rating', 'Rating')} value={`${stats.avgRating}/5`} accent="#E0C060" />
                    )}
                    {stats.totalValue > 0 && (
                      <StatBadge
                        icon={DollarSign}
                        label={t('hub.totalValue', 'Value')}
                        value={stats.totalValue >= 1000 ? `$${(stats.totalValue / 1000).toFixed(1)}k` : `$${stats.totalValue.toFixed(0)}`}
                        accent="#10B981"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Right: Action buttons */}
              <div className="flex flex-wrap gap-2 items-start">
                <WhiskeyExporter />
                <Button onClick={() => setShowQuickSearch(true)} variant="outline" size="sm" className="text-sm">
                  <Search className="w-4 h-4 mr-1.5" />
                  {t('quickActions.quickSearchBottle', 'Quick Add')}
                </Button>
                <Button
                  onClick={() => { setEditingBottle(null); setShowForm(true); }}
                  size="sm"
                  style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#F5F1E7', border: '1px solid rgba(163,92,92,0.5)' }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {t('whiskey.addBottle', 'Add Bottle')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        {bottles.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); localStorage.setItem('whiskeySortBy', v); }}>
                <SelectTrigger className="w-32 h-9" style={{ borderColor: 'rgba(180,140,75,0.2)', fontSize: '0.8rem' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">{t('whiskey.newestFirst', 'Newest')}</SelectItem>
                  <SelectItem value="name">{t('whiskey.byName', 'By Name')}</SelectItem>
                  <SelectItem value="rating">{t('whiskey.byRating', 'By Rating')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-lg p-0.5" style={{ borderColor: 'rgba(180,140,75,0.2)', background: 'rgba(180,140,75,0.04)' }} role="group">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 rounded"
                  onClick={() => { setViewMode('grid'); localStorage.setItem('whiskeyViewMode', 'grid'); }}
                  title={t('common.gridView', 'Grid')}>
                  <Grid3X3 className="w-3.5 h-3.5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 rounded"
                  onClick={() => { setViewMode('list'); localStorage.setItem('whiskeyViewMode', 'list'); }}
                  title={t('common.listView', 'List')}>
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button variant="outline" size="icon" className={`h-7 w-7 ${displayMode ? 'border-amber-600/60 bg-amber-600/15' : ''}`}
                onClick={() => { const n = !displayMode; setDisplayMode(n); localStorage.setItem('whiskeyDisplayMode', n ? 'collector' : 'standard'); }}
                title={t('whiskey.collectorView', 'Collector View')}>
                <Package2 className="w-3.5 h-3.5" style={{ color: displayMode ? 'rgba(180,140,75,1)' : 'rgba(224,216,200,0.6)' }} />
              </Button>
            </div>
          </div>
        )}

        {/* Add/Edit Bottle Sheet */}
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{editingBottle ? t('whiskey.editBottle', 'Edit Bottle') : t('whiskey.addBottle', 'Add Bottle')}</SheetTitle>
            </SheetHeader>
            <BottleForm bottle={editingBottle} onSubmit={handleSaveBottle} onCancel={() => { setShowForm(false); setEditingBottle(null); }} />
          </SheetContent>
        </Sheet>

        {/* Inventory Manager Sheet */}
        <Sheet open={!!inventoryBottle} onOpenChange={(open) => { if (!open) setInventoryBottle(null); }}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{t('whiskey.manageInventory', 'Manage Inventory')}</SheetTitle>
            </SheetHeader>
            {inventoryBottle && <InventoryManager bottle={inventoryBottle} onClose={() => setInventoryBottle(null)} />}
          </SheetContent>
        </Sheet>

        {/* Tasting Log Modals */}
        <LogTastingModal isOpen={!!showTastingLog} onClose={() => setShowTastingLog(null)} bottles={showTastingLog ? [showTastingLog] : bottles} user={user} />
        <LogTastingModal isOpen={!!editingTastingLog} onClose={() => setEditingTastingLog(null)} bottles={bottles} user={user} editLog={editingTastingLog} />

        {/* Insights */}
        {bottles.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: 'linear-gradient(135deg, rgba(42,31,24,0.5), rgba(31,21,16,0.5))', border: '1px solid rgba(180,140,75,0.15)' }}
          >
            <BottleInsights bottles={bottles} tastingLogs={tastingLogs} />
          </div>
        )}

        {/* Collection Grid/List */}
        {bottles.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.1em] font-semibold" style={{ color: 'rgba(180,140,75,0.8)' }}>
                {t('whiskey.yourCollection', 'Your Collection')} · {filteredBottles.length}
              </h2>
            </div>
            <div className={viewMode === 'grid'
              ? (displayMode ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5')
              : 'flex flex-col gap-3'}>
              {filteredBottles.map((bottle) => {
                if (displayMode && viewMode === 'grid') {
                  return (
                    <a key={bottle.id} href={createPageUrl(`BottleDetail?id=${encodeURIComponent(bottle.id)}`)}>
                      <CollectorDisplayCard
                        image={bottle.photo || bottle.image || bottle.image_url}
                        title={bottle.name}
                        subtitle={bottle.distillery || bottle.region || bottle.country || '—'}
                        badges={<>
                          {bottle.type && <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(180,140,75,0.15)', color: 'rgba(224,216,200,0.8)' }}>{bottle.type}</span>}
                          {bottle.age && <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>{bottle.age}y</span>}
                        </>}
                        valueDisplay={getBottleUnitValue(bottle) > 0 ? (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(46,125,92,0.9)', color: '#fff' }}>
                            ${getBottleUnitValue(bottle).toFixed(0)}
                          </span>
                        ) : null}
                        onClick={() => {}}
                        fallbackIcon={
                           <div style={{ color: 'rgba(180,140,75,0.3)' }} className="text-center">
                             <GlassWater className="w-12 h-12 mx-auto mb-2 opacity-40" />
                            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.4)' }}>{t('whiskey.noPhoto', 'No photo')}</p>
                          </div>
                        }
                      />
                    </a>
                  );
                } else if (viewMode === 'grid') {
                  return (
                    <div key={bottle.id} className="space-y-2">
                      <a href={createPageUrl(`BottleDetail?id=${encodeURIComponent(bottle.id)}`)}>
                        <BottleCard bottle={bottle} onClick={() => {}} />
                      </a>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => setShowTastingLog(bottle)} variant="outline" size="sm" className="flex-1">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {t('whiskey.logTasting', 'Log Tasting')}
                        </Button>
                        <Button onClick={() => setInventoryBottle(bottle)} variant="outline" size="sm" className="flex-1">
                          <Package className="w-3 h-3 mr-1" />
                          {t('whiskey.inventory', 'Inventory')}
                        </Button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <a key={bottle.id} href={createPageUrl(`BottleDetail?id=${encodeURIComponent(bottle.id)}`)}>
                      <BottleListItem bottle={bottle} onClick={() => {}} />
                    </a>
                  );
                }
              })}
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-16 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(42,31,24,0.4), rgba(31,21,16,0.5))',
              border: '1px solid rgba(180,140,75,0.15)',
            }}
          >
            <div
               className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.22)' }}
             >
               <GlassWater className="w-8 h-8" style={{ color: 'rgba(180,140,75,0.5)' }} />
            </div>
            <h2 style={{ color: '#F5F1E7' }} className="text-xl font-semibold mb-2">{t('whiskey.noBottlesYet', 'No bottles yet')}</h2>
            <p style={{ color: 'rgba(224,216,200,0.6)' }} className="mb-6 max-w-sm mx-auto">{t('whiskey.startTracking', 'Start tracking your whiskey collection')}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => setShowForm(true)} style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#F5F1E7' }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('whiskey.addFirstBottle', 'Add First Bottle')}
              </Button>
              <Button onClick={() => setShowQuickSearch(true)} variant="outline">
                <Search className="w-4 h-4 mr-2" />
                {t('quickActions.quickSearchBottle', 'Quick Add')}
              </Button>
            </div>
          </div>
        )}

        {/* Quick Search */}
        <QuickSearchBottle
          isOpen={showQuickSearch}
          onClose={() => setShowQuickSearch(false)}
          onBottleAdded={(created) => {
            queryClient.invalidateQueries({ queryKey: ['bottles'] });
            if (created?.id) setInventoryBottle(created);
          }}
        />

        {/* Share Modal */}
        {shareBottle && (
          <ShareRecordModal
            isOpen={!!shareBottle}
            onOpenChange={(open) => { if (!open) setShareBottle(null); }}
            moduleType="whiskey"
            record={shareBottle}
            userProfile={{ email: user?.email }}
          />
        )}

        {/* Recent Tastings */}
        {tastingLogs.length > 0 && (
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(38,24,14,0.95), rgba(28,18,12,0.98))',
                border: '1px solid rgba(180,140,75,0.2)',
              }}
            >
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(180,140,75,0.12)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.22)' }}>
                    <BookOpen className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.9)' }} />
                  </div>
                  <h2 style={{ color: '#F5F1E7' }} className="text-lg font-bold">{t('whiskeykeeper.recentTastings', 'Recent Tastings')}</h2>
                </div>
                <a href={createPageUrl('Tastings')} className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'rgba(180,140,75,0.8)', background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.18)' }}>
                  {t('common.viewAll', 'View all')} →
                </a>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(180,140,75,0.08)' }}>
                {tastingLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="px-6 py-4 group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p style={{ color: '#F5F1E7' }} className="font-semibold text-sm">{log.bottle_name}</p>
                        <p style={{ color: 'rgba(224,216,200,0.5)' }} className="text-xs mt-0.5">
                          {log.tasting_date ? new Date(log.tasting_date).toLocaleDateString() : '—'}
                        </p>
                        {log.notes && <p style={{ color: 'rgba(224,216,200,0.65)' }} className="text-xs mt-1.5 line-clamp-2">{log.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {log.rating != null && (
                          <div style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <Star className="w-2.5 h-2.5" />
                            {Number(log.rating).toFixed(1)}
                          </div>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTastingLog(log)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: '#D45C5C' }}
                            onClick={() => deleteTastingLogMutation.mutate(log.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </LockedModuleGuard>
  );
}