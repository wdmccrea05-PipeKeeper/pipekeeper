import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BottleForm from '@/components/whiskey/BottleForm';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

export default function BottleFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bottle, setBottle] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();

  const bottleId = searchParams.get('id');
  const userEmail = useMemo(
    () => String(user?.email || user?.user_email || '').trim().toLowerCase(),
    [user]
  );

  useEffect(() => {
    if (!bottleId || !userEmail) return;

    let cancelled = false;

    async function loadBottle() {
      setLoading(true);
      try {
        let record = null;
        try {
          record = await base44.entities.Bottle.get(bottleId);
        } catch {
          const found = await base44.entities.Bottle.filter({ id: bottleId, created_by: userEmail });
          record = found?.[0] || null;
        }

        if (record && record.created_by && record.created_by !== userEmail) {
          record = null;
        }

        if (!cancelled) {
          setBottle(record || null);
        }
      } catch (err) {
        console.error('[BottleFormPage] load error:', err);
        if (!cancelled) setBottle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBottle();
    return () => {
      cancelled = true;
    };
  }, [bottleId, userEmail]);

  const handleSubmit = async (data) => {
    if (!userEmail) return;

    const payload = {
      ...data,
      created_by: userEmail,
      user_email: data?.user_email || userEmail,
    };

    try {
      if (bottle?.id) {
        if (bottle.created_by && bottle.created_by !== userEmail) {
          throw new Error('Unauthorized bottle update attempt.');
        }
        await base44.entities.Bottle.update(bottle.id, payload);
        navigate(`/BottleDetail?id=${encodeURIComponent(bottle.id)}`);
      } else {
        const created = await base44.entities.Bottle.create(payload);
        navigate(`/BottleDetail?id=${encodeURIComponent(created.id)}&inventory=1`);
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div
            className="rounded-2xl p-8"
            style={{
              background:
                'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
              border: '1px solid rgba(180,140,75,0.22)',
            }}
          >
            <p className="text-[#D8C7A6]">Loading…</p>
          </div>
        ) : (
          <BottleForm
            bottle={bottle || undefined}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
          />
        )}
      </div>
    </LockedModuleGuard>
  );
}
