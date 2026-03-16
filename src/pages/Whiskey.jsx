import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, TrendingUp, BarChart3, Share2, Search, Package } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import ModuleNav from '@/components/modules/ModuleNav';
import BottleCard from '@/components/whiskey/BottleCard';
import BottleForm from '@/components/whiskey/BottleForm';
import TastingLogForm from '@/components/whiskey/TastingLog';
import BottleInsights from '@/components/whiskey/BottleInsights';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import QuickSearchBottle from '@/components/ai/QuickSearchBottle';
import InventoryManager from '@/components/whiskey/InventoryManager';
import InventoryMigrator from '@/components/whiskey/InventoryMigrator';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import WhiskeyExporter from '@/components/export/WhiskeyExporter';

function WhiskeyBottleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function WhiskeyPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingBottle, setEditingBottle] = useState(null);
  const [showTastingLog, setShowTastingLog] = useState(null);
  const [shareBottle, setShareBottle] = useState(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [inventoryBottle, setInventoryBottle] = useState(null);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
      setShowForm(true);
      window.history.replaceState({}, '', '/Whiskey');
    }
  }, []);

  const moduleNavItems = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', icon: WhiskeyBottleIcon },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
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

  const createBottleMutation = useMutation({
    mutationFn: (data) => base44.entities.Bottle.create(data),
    onSuccess: (created, data) => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      setShowForm(false);
      setEditingBottle(null);
      toast.success('Whiskey added!');
      // Open inventory manager for the new bottle so user can add units
      if (created?.id) {
        setInventoryBottle({ ...data, id: created.id });
      }
    },
  });

  const updateBottleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bottle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      setShowForm(false);
      setEditingBottle(null);
      toast.success('Whiskey updated!');
    },
  });

  const deleteBottleMutation = useMutation({
    mutationFn: async (id) => {
      // Also delete all inventory units
      const units = await base44.entities.WhiskeyInventoryUnit.filter({ bottle_id: id });
      for (const u of units) {
        await base44.entities.WhiskeyInventoryUnit.delete(u.id);
      }
      return base44.entities.Bottle.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      toast.success('Bottle deleted!');
    },
  });

  const createTastingLogMutation = useMutation({
    mutationFn: (data) => base44.entities.TastingLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      setShowTastingLog(null);
      toast.success('Tasting logged!');
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
    <div className="space-y-6">
      {/* Silent migration of legacy bottle_count → inventory units */}
      <InventoryMigrator />

      <ModuleNav items={moduleNavItems} currentPath="/Whiskey" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))',
                border: '1px solid rgba(120, 90, 65, 0.45)',
                boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)',
              }}
            >
              <WhiskeyBottleIcon className="w-5 h-5" style={{ color: 'rgba(180, 140, 75, 1)' }} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
              WhiskeyKeeper
            </h1>
          </div>
          <p className="text-base pl-14" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
            Track your whiskey collection and tasting notes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WhiskeyExporter />
          <Button onClick={() => setShowQuickSearch(true)} variant="outline" className="text-sm">
            <Search className="w-4 h-4 mr-2" />
            {t('quickActions.quickSearchBottle') || 'Quick Add'}
          </Button>
          <Button onClick={() => { setEditingBottle(null); setShowForm(true); }} className="bg-[#A35C5C] hover:bg-[#8C4A4A]">
            <Plus className="w-4 h-4 mr-2" />
            {t('whiskey.addBottle') || 'Add Bottle'}
          </Button>
        </div>
      </div>

      {/* Add/Edit Bottle Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingBottle ? 'Edit Whiskey' : 'Add Whiskey'}</SheetTitle>
          </SheetHeader>
          <BottleForm
            bottle={editingBottle}
            onSubmit={handleSaveBottle}
            onCancel={() => { setShowForm(false); setEditingBottle(null); }}
          />
        </SheetContent>
      </Sheet>

      {/* Inventory Manager Sheet */}
      <Sheet open={!!inventoryBottle} onOpenChange={(open) => { if (!open) setInventoryBottle(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Manage Inventory</SheetTitle>
          </SheetHeader>
          {inventoryBottle && (
            <InventoryManager bottle={inventoryBottle} onClose={() => setInventoryBottle(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Tasting Log Modal */}
      {showTastingLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <TastingLogForm
            bottle={showTastingLog}
            onSubmit={(data) => createTastingLogMutation.mutate(data)}
            onCancel={() => setShowTastingLog(null)}
          />
        </div>
      )}

      {/* Insights */}
      {bottles.length > 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))', border: '1px solid rgba(180, 140, 75, 0.15)' }}>
          <BottleInsights bottles={bottles} tastingLogs={tastingLogs} />
        </div>
      )}

      {/* Collection Grid */}
      {bottles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bottles.map((bottle) => (
            <div key={bottle.id} className="space-y-2">
              <BottleCard bottle={bottle} onClick={() => { setEditingBottle(bottle); setShowForm(true); }} />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setShowTastingLog(bottle)} variant="outline" size="sm" className="flex-1">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Log Tasting
                </Button>
                <Button onClick={() => setInventoryBottle(bottle)} variant="outline" size="sm" className="flex-1">
                  <Package className="w-3 h-3 mr-1" />
                  Inventory
                </Button>
                <Button onClick={() => setShareBottle(bottle)} variant="outline" size="sm">
                  <Share2 className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => { if (confirm('Delete this whiskey?')) deleteBottleMutation.mutate(bottle.id); }}
                  variant="outline" size="sm" className="text-red-400 border-red-400/30"
                >
                  {t('common.delete') || 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.3), rgba(31, 21, 16, 0.3))', border: '1px solid rgba(180, 140, 75, 0.15)' }}>
          <WhiskeyBottleIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(180,140,75,0.5)' }} />
          <h2 style={{ color: '#F5F1E7' }} className="text-xl font-semibold mb-2">No bottles yet</h2>
          <p style={{ color: 'rgba(224,216,200,0.6)' }} className="mb-6">Start tracking your whiskey collection</p>
          <Button onClick={() => setShowForm(true)} style={{ background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))', color: '#F5F1E7' }}>
            Add Your First Bottle
          </Button>
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
          <h2 style={{ color: '#F5F1E7' }} className="text-2xl font-bold">Recent Tastings</h2>
          <div className="grid grid-cols-1 gap-3">
            {tastingLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="rounded-lg p-4"
                style={{ background: 'rgba(180, 140, 75, 0.08)', border: '1px solid rgba(180, 140, 75, 0.15)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p style={{ color: '#F5F1E7' }} className="font-semibold">{log.bottle_name}</p>
                    <p style={{ color: 'rgba(224,216,200,0.6)' }} className="text-sm">
                      {new Date(log.tasting_date).toLocaleDateString()}
                    </p>
                  </div>
                  {log.rating && (
                    <div style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }} className="px-3 py-1 rounded-full text-sm font-semibold">
                      {Number(log.rating).toFixed(1)}/5
                    </div>
                  )}
                </div>
                {log.notes && <p style={{ color: 'rgba(224,216,200,0.7)' }} className="text-sm mt-2">{log.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}