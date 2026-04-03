import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BookOpen, PlusCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import LogTastingModal from '@/components/whiskey/LogTastingModal';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import { useTranslation } from '@/components/i18n/safeTranslation';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

function TastingsInner() {
  const { t } = useTranslation();
  const { user, isLoading: userLoading } = useCurrentUser();
  const location = useLocation();

  const [tastings, setTastings] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [editingTasting, setEditingTasting] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const userEmail = user?.email || null;
  const shouldAutoOpenLogModal = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('action') === 'log';
  }, [location.search]);

  const openCreateModal = useCallback((preferredBottle = null) => {
    setSelectedBottle(preferredBottle || bottles[0] || null);
    setEditingTasting(null);
    setShowModal(true);
  }, [bottles]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingTasting(null);
    setSelectedBottle(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!userEmail) {
      setTastings([]);
      setBottles([]);
      return;
    }

    try {
      const [logs, bottleRows] = await Promise.all([
        base44.entities.TastingLog.filter({ created_by: userEmail }, '-tasting_date', 500).catch(() => []),
        base44.entities.Bottle.filter({ created_by: userEmail }, '-created_date', 500).catch(() => []),
      ]);

      const sortedLogs = [...(logs || [])].sort(
        (a, b) =>
          new Date(b.tasting_date || b.created_at || 0) -
          new Date(a.tasting_date || a.created_at || 0)
      );

      setTastings(sortedLogs);
      setBottles(bottleRows || []);
    } catch (e) {
      console.error('[Tastings] failed to load', e);
      setTastings([]);
      setBottles([]);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userLoading) return;
    loadData();
  }, [loadData, userLoading]);

  useEffect(() => {
    if (!shouldAutoOpenLogModal || userLoading || showModal) return;
    openCreateModal();
  }, [openCreateModal, shouldAutoOpenLogModal, showModal, userLoading]);

  return (
    <>
      <div className="space-y-6">
        <WhiskeyKeeperModuleNav currentPageName="Tastings" />

        <div className="p-6 space-y-6 text-[#F5F1E7]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1
                className="text-4xl font-bold"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                {t('whiskey.tastings', 'Tasting Notes')}
              </h1>
              <p className="text-[#D8C7A6]/78 mt-2">
                {tastings.length} {t('whiskey.tastingsLogged', 'tastings logged')}
              </p>
            </div>

            <Button
              onClick={() => openCreateModal()}
              style={{
                background: 'linear-gradient(135deg, rgba(196,122,58,1), rgba(160,95,40,1))',
                color: '#1A120D',
              }}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Log Tasting
            </Button>
          </div>

          {tastings.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'rgba(42,31,24,0.55)',
                border: '1px solid rgba(180,140,75,0.16)',
              }}
            >
              <BookOpen className="w-10 h-10 mx-auto text-[#B48C4B] mb-4" />
              <p className="text-2xl font-semibold">No tasting notes yet</p>
              <p className="text-[#D8C7A6]/76 mt-2">
                Log your first tasting to track your whiskey journey
              </p>
              <Button
                className="mt-5"
                onClick={() => openCreateModal()}
              >
                Log Tasting
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tastings.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => {
                    const bottle = bottles.find((b) => b.id === log.bottle_id) || null;
                    setSelectedBottle(bottle);
                    setEditingTasting(log);
                    setShowModal(true);
                  }}
                  className="w-full text-left rounded-2xl p-4"
                  style={{
                    background: 'rgba(42,31,24,0.55)',
                    border: '1px solid rgba(180,140,75,0.16)',
                  }}
                >
                  <p className="text-xl font-semibold">{log.bottle_name}</p>
                  <p className="text-[#D8C7A6]/76 mt-1">
                    {log.tasting_date
                      ? new Date(log.tasting_date).toLocaleDateString('en-US')
                      : 'Unknown date'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal ? (
        <LogTastingModal
          bottle={selectedBottle}
          bottles={bottles}
          editLog={editingTasting}
          onClose={closeModal}
          onSaved={async () => {
            await loadData();
            // Do NOT call closeModal() here — LogTastingModal manages its own
            // close lifecycle via the onClose prop. Calling closeModal() here
            // would unmount LogTastingModal (and any PostSessionPrompt inside
            // it) before the user can interact with the Want List prompt.
          }}
        />
      ) : null}
    </>
  );
}

export default function Tastings() {
  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <TastingsInner />
    </LockedModuleGuard>
  );
}