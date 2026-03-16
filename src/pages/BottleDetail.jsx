import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit2, Share2, Trash2, BookOpen, Package, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BottleForm from '@/components/whiskey/BottleForm';
import InventoryManager from '@/components/whiskey/InventoryManager';
import TastingLogForm from '@/components/whiskey/TastingLog';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { toast } from 'sonner';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { Badge } from '@/components/ui/badge';

function WhiskeyBottleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function BottleDetail() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  
  const bottleId = searchParams.get('id');
  
  const [showEdit, setShowEdit] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showTastingLog, setShowTastingLog] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const { data: bottle, isLoading } = useQuery({
    queryKey: ['bottle-detail', bottleId],
    queryFn: async () => {
      if (!bottleId) return null;
      const result = await base44.entities.Bottle.filter({ id: bottleId });
      return result?.[0] || null;
    },
    enabled: !!bottleId,
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['bottle-tastings', bottleId],
    queryFn: async () => {
      if (!bottleId) return [];
      const result = await base44.entities.TastingLog.filter({ bottle_id: bottleId }, '-tasting_date', 50);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!bottleId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bottle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottle-detail', bottleId] });
      queryClient.invalidateQueries({ queryKey: ['bottles'] });
      setShowEdit(false);
      toast.success(t('notifications.updated'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const units = await base44.entities.WhiskeyInventoryUnit.filter({ bottle_id: id });
      for (const u of units) await base44.entities.WhiskeyInventoryUnit.delete(u.id);
      return base44.entities.Bottle.delete(id);
    },
    onSuccess: () => {
      toast.success(t('notifications.deleted'));
      navigate('/Whiskey');
    },
  });

  const createTastingMutation = useMutation({
    mutationFn: (data) => base44.entities.TastingLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bottle-tastings', bottleId] });
      setShowTastingLog(false);
      toast.success(t('notifications.created'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#D4A574] rounded-full animate-spin" />
      </div>
    );
  }

  if (!bottle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[#E0D8C8]">{t('common.notFound')}</p>
        <Button onClick={() => navigate('/Whiskey')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const renderStars = (rating) =>
    Array.from({ length: 5 }).map((_, i) => (
      <span key={i} style={{
        fontSize: '1.25rem',
        color: i < Math.round(rating || 0) ? '#D4AF37' : 'rgba(180,140,75,0.25)',
      }}>★</span>
    ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Button onClick={() => navigate('/Whiskey')} variant="ghost" className="text-[#E0D8C8]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => setShowShare(true)} variant="outline" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowEdit(true)} variant="outline" size="sm">
            <Edit2 className="w-4 h-4 mr-2" />
            {t('common.edit')}
          </Button>
          <Button 
            onClick={() => { if (confirm(t('common.confirmDelete'))) deleteMutation.mutate(bottle.id); }} 
            variant="outline" size="sm" className="text-red-400 border-red-400/30"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image */}
        <div className="lg:col-span-1">
          {bottle.photo ? (
            <img src={bottle.photo} alt={bottle.name} className="w-full rounded-2xl" />
          ) : (
            <div className="w-full aspect-square rounded-2xl flex items-center justify-center" 
              style={{ background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.3), rgba(80, 55, 35, 0.3))' }}>
              <WhiskeyBottleIcon className="w-16 h-16" style={{ color: 'rgba(180,140,75,0.3)' }} />
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Type */}
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#F5F1E7' }}>
              {bottle.name}
            </h1>
            <p className="text-lg" style={{ color: 'rgba(180,140,75,0.85)' }}>
              {bottle.distillery || t('whiskey.unknownDistillery')}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {bottle.type && <Badge className="text-xs" style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.3)' }}>{bottle.type}</Badge>}
              {bottle.region && <Badge className="text-xs" style={{ background: 'rgba(123,155,91,0.15)', color: '#7B9B5B', border: '1px solid rgba(123,155,91,0.3)' }}>{bottle.region}</Badge>}
              {bottle.country && <Badge className="text-xs" style={{ background: 'rgba(100,80,60,0.15)', color: '#E0D8C8', border: '1px solid rgba(120,100,80,0.3)' }}>{bottle.country}</Badge>}
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.15)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
                {t('whiskey.age')}
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: '#D4A574' }}>
                {bottle.age ? `${bottle.age}y` : '—'}
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.15)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
                {t('whiskey.abv')}
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: '#D4A574' }}>
                {bottle.abv ? `${bottle.abv}%` : '—'}
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.15)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
                {t('whiskey.bottleSize')}
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: '#D4A574' }}>
                {bottle.bottle_size || '—'}
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.15)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
                {t('whiskey.value')}
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: '#D4A574' }}>
                {formatCurrency(bottle.average_market_value || bottle.purchase_price || 0)}
              </p>
            </div>
          </div>

          {/* Rating */}
          {bottle.rating && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>
                {t('whiskey.rating')}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {renderStars(bottle.rating)}
                </div>
                <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>
                  {Number(bottle.rating).toFixed(1)}/5
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={() => setShowInventory(true)} variant="outline" className="flex-1">
              <Package className="w-4 h-4 mr-2" />
              {t('whiskey.manageInventory')}
            </Button>
            <Button onClick={() => setShowTastingLog(true)} variant="outline" className="flex-1">
              <BookOpen className="w-4 h-4 mr-2" />
              {t('whiskey.logTasting')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tasting History */}
      {tastingLogs.length > 0 && (
        <div className="rounded-lg p-6" style={{ background: 'rgba(42,30,20,0.5)', border: '1px solid rgba(180,140,75,0.15)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#F5F1E7' }}>
            {t('whiskey.tastingHistory')}
          </h2>
          <div className="space-y-3">
            {tastingLogs.map((log) => (
              <div key={log.id} className="rounded-lg p-4" style={{ background: 'rgba(100,70,45,0.1)', border: '1px solid rgba(180,140,75,0.15)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold" style={{ color: '#F5F1E7' }}>
                      {new Date(log.tasting_date).toLocaleDateString()}
                    </p>
                    {log.notes && <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.7)' }}>{log.notes}</p>}
                  </div>
                  {log.rating && (
                    <div className="flex gap-0.5">
                      {renderStars(log.rating)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form Sheet */}
      <Sheet open={showEdit} onOpenChange={setShowEdit}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('common.edit')}</SheetTitle>
          </SheetHeader>
          <BottleForm
            bottle={bottle}
            onSubmit={(data) => updateMutation.mutate({ id: bottle.id, data })}
            onCancel={() => setShowEdit(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Inventory Sheet */}
      <Sheet open={showInventory} onOpenChange={setShowInventory}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('whiskey.manageInventory')}</SheetTitle>
          </SheetHeader>
          <InventoryManager bottle={bottle} onClose={() => setShowInventory(false)} />
        </SheetContent>
      </Sheet>

      {/* Tasting Log Modal */}
      {showTastingLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <TastingLogForm
            bottle={bottle}
            onSubmit={(data) => createTastingMutation.mutate(data)}
            onCancel={() => setShowTastingLog(false)}
          />
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareRecordModal
          isOpen={showShare}
          onOpenChange={setShowShare}
          moduleType="whiskey"
          record={bottle}
          userProfile={{ email: user?.email }}
        />
      )}
    </div>
  );
}