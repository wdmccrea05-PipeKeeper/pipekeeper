import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import ModuleNav from '@/components/modules/ModuleNav';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import { Wine, BookOpen, TrendingUp, BarChart3, Edit, Trash2, Check, X } from 'lucide-react';
import { formatDate } from '@/components/utils/localeFormatters';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function TastingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState('');

  const moduleNavItems = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', icon: Wine },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 100);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const updateTastingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TastingLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      setEditingId(null);
      toast.success('Tasting updated!');
    },
  });

  const deleteTastingMutation = useMutation({
    mutationFn: (id) => base44.entities.TastingLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      toast.success('Tasting deleted!');
    },
  });

  return (
    <div className="space-y-6">
      <WhiskeyKeeperModuleNav currentPageName="Tastings" />

      <div>
        <h1
          className="text-4xl font-bold tracking-tight mb-2"
          style={{
            color: '#F5F1E7',
            fontFamily: "'Georgia', serif",
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          }}
        >
          {t('nav.tastingNotes') || 'Tasting Notes'}
        </h1>
        <p style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
          {tastingLogs.length} {t('whiskeykeeper.tastingsLogged') || 'tastings logged'}
        </p>
      </div>

      {tastingLogs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {tastingLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg p-5 group"
              style={{
                background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
                border: '1px solid rgba(180, 140, 75, 0.2)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 style={{ color: '#F5F1E7' }} className="text-lg font-semibold">
                    {log.bottle_name}
                  </h3>
                  <p style={{ color: 'rgba(224,216,200,0.6)' }} className="text-sm">
                    {formatDate(log.tasting_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {log.rating && (
                    <div
                      style={{
                        background: 'rgba(212, 175, 55, 0.2)',
                        color: '#D4AF37',
                      }}
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                    >
                      {log.rating.toFixed(1)}/5
                    </div>
                  )}
                  {editingId !== log.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingId(log.id); setEditNotes(log.notes || ''); }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3.5 h-3.5" style={{ color: 'rgba(180,140,75,0.7)' }} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTastingMutation.mutate(log.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#D45C5C' }} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {editingId === log.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="h-24"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      className="h-8"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateTastingMutation.mutate({ id: log.id, data: { notes: editNotes } })}
                      className="h-8"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {log.notes && (
                    <p style={{ color: 'rgba(224,216,200,0.75)' }} className="mb-2">
                      {log.notes}
                    </p>
                  )}
                  {log.pairing && (
                    <p style={{ color: 'rgba(180,140,75,0.8)' }} className="text-sm">
                      <span style={{ color: 'rgba(224,216,200,0.6)' }}>{t('whiskeykeeper.pairing') || 'Pairing'}:</span> {log.pairing}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.3), rgba(31, 21, 16, 0.3))',
            border: '1px solid rgba(180, 140, 75, 0.15)',
          }}
        >
          <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(180,140,75,0.5)' }} />
          <h2 style={{ color: '#F5F1E7' }} className="text-xl font-semibold mb-2">
            {t('whiskeykeeper.noTastings') || 'No tasting notes yet'}
          </h2>
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('whiskeykeeper.startLogging') || 'Log your first tasting to track your whiskey journey'}
          </p>
        </div>
      )}
    </div>
  );
}