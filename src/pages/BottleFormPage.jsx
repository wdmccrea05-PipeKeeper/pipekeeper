import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BottleForm from '@/components/whiskey/BottleForm';

export default function BottleFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bottle, setBottle] = useState(null);
  const [loading, setLoading] = useState(false);

  const bottleId = searchParams.get('id');

  useEffect(() => {
    if (!bottleId) return;

    let cancelled = false;

    async function loadBottle() {
      setLoading(true);
      try {
        let record = null;
        try {
          record = await base44.entities.Bottle.get(bottleId);
        } catch {
          const found = await base44.entities.Bottle.filter({ id: bottleId });
          record = found?.[0] || null;
        }

        if (!cancelled && record) {
          setBottle(record);
        }
      } catch (err) {
        console.error('[BottleFormPage] load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBottle();
    return () => {
      cancelled = true;
    };
  }, [bottleId]);

  const handleSubmit = async (data) => {
    try {
      if (bottle?.id) {
        await base44.entities.Bottle.update(bottle.id, data);
        navigate(`/BottleDetail?id=${encodeURIComponent(bottle.id)}`);
      } else {
        const created = await base44.entities.Bottle.create(data);
        navigate(`/BottleDetail?id=${encodeURIComponent(created.id)}`);
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