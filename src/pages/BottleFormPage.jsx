import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BottleForm from '@/components/whiskey/BottleForm';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

function BottleFormPageInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const [bottle, setBottle] = useState(null);
  const [loading, setLoading] = useState(false);

  const bottleId = searchParams.get('id');

  useEffect(() => {
    if (!bottleId || !user?.email) return;

    let cancelled = false;

    async function loadBottle() {
      setLoading(true);
      try {
        let record = null;

        try {
          const fetched = await base44.entities.Bottle.get(bottleId);
          if (fetched?.created_by === user.email) {
            record = fetched;
          }
        } catch {
          // fall through to scoped lookup
        }

        if (!record) {
          const found = await base44.entities.Bottle.filter({ id: bottleId, created_by: user.email });
          record = found?.[0] || null;
        }

        if (!cancelled) {
          setBottle(record);
        }
      } catch (err) {
        console.error('[BottleFormPage] load error:', err);
        if (!cancelled) {
          setBottle(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBottle();

    return () => {
      cancelled = true;
    };
  }, [bottleId, user?.email]);

  const handleSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        created_by: bottle?.created_by || user?.email || data?.created_by,
      };

      if (bottle?.id) {
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BottleForm
        bottle={bottle || undefined}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}

export default function BottleFormPage() {
  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <BottleFormPageInner />
    </LockedModuleGuard>
  );
}