import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LogTastingModal from '@/components/whiskey/LogTastingModal';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export default function BottleDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showTastingModal, setShowTastingModal] = useState(false);

  const bottleId = useMemo(() => {
    return searchParams.get('id') || searchParams.get('bottleId') || '';
  }, [searchParams]);

  const { data: bottle, isLoading: bottleLoading } = useQuery({
    queryKey: ['bottle', bottleId],
    queryFn: async () => {
      if (!bottleId) return null;
      try {
        return await base44.entities.Bottle.get(bottleId);
      } catch {
        const found = await base44.entities.Bottle.filter({ id: bottleId });
        return found?.[0] || null;
      }
    },
    enabled: !!bottleId,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ['tasting-logs-bottle', bottleId],
    queryFn: async () => {
      if (!bottleId) return [];
      const result = await base44.entities.TastingLog.filter(
        { bottle_id: bottleId },
        '-tasting_date'
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!bottleId,
  });

  const photo = useMemo(() => {
    if (!bottle) return null;
    return (
      bottle?.photos?.[0] ||
      bottle?.photo ||
      bottle?.image ||
      bottle?.image_url ||
      null
    );
  }, [bottle]);

  const avgRating = useMemo(() => {
    if (!tastings.length) return null;
    const sum = tastings.reduce((acc, t) => acc + (Number(t.rating) || 0), 0);
    return (sum / tastings.length).toFixed(1);
  }, [tastings]);

  if (bottleLoading) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!bottle) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Bottle not found</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 text-[#F5F1E7] max-w-4xl mx-auto">
      {/* IMAGE */}
      <div className="mb-6 flex justify-center">
        {photo ? (
          <img
            src={photo}
            alt={bottle?.name}
            className="h-[320px] object-contain"
          />
        ) : (
          <div className="h-[320px] w-[200px] bg-gradient-to-b from-[#2c1f16] to-[#1a120d] rounded-lg flex items-center justify-center text-sm opacity-60">
            No photo
          </div>
        )}
      </div>

      {/* TITLE & META */}
      <h1 className="text-3xl font-bold mb-2 break-words">{bottle?.name}</h1>

      <p className="text-sm opacity-70 mb-6">
        {[bottle?.distillery, bottle?.region, bottle?.country]
          .filter(Boolean)
          .join(' • ')}
      </p>

      {/* ACTIONS */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <Button onClick={() => setShowTastingModal(true)} className="bg-[#A35C5C]">
          Record Tasting
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>

      {/* RATING SUMMARY */}
      <div className="mb-8 p-4 rounded-lg bg-[#2c1f16] border border-[#3a2a1f]">
        <h2 className="text-lg font-semibold mb-2">Tasting Summary</h2>
        {avgRating ? (
          <p className="text-base">
            ⭐ {avgRating} / 5.0 ({tastings.length}{' '}
            {tastings.length === 1 ? 'tasting' : 'tastings'})
          </p>
        ) : (
          <p className="opacity-60">No tastings yet</p>
        )}
      </div>

      {/* BOTTLE INFO */}
      {(bottle?.type || bottle?.age || bottle?.abv) && (
        <div className="mb-8 p-4 rounded-lg bg-[#2c1f16] border border-[#3a2a1f]">
          <h2 className="text-lg font-semibold mb-3">Bottle Info</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bottle?.type && (
              <div>
                <p className="text-xs opacity-60 uppercase">Type</p>
                <p className="text-sm">{bottle.type}</p>
              </div>
            )}
            {bottle?.age && (
              <div>
                <p className="text-xs opacity-60 uppercase">Age</p>
                <p className="text-sm">{bottle.age}</p>
              </div>
            )}
            {bottle?.abv && (
              <div>
                <p className="text-xs opacity-60 uppercase">ABV</p>
                <p className="text-sm">{bottle.abv}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TASTING HISTORY */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Tasting History</h2>

        {tastings.length === 0 && (
          <p className="opacity-60">No tasting history yet</p>
        )}

        <div className="space-y-3">
          {tastings.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-lg bg-[#2c1f16] border border-[#3a2a1f]"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">⭐ {t.rating || 0} / 5</span>
                <span className="text-xs opacity-60">
                  {new Date(t.tasting_date || t.date).toLocaleDateString(
                    'en-US'
                  )}
                </span>
              </div>
              {t.notes && <p className="text-sm break-words">{t.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {showTastingModal && (
        <LogTastingModal
          bottle={bottle}
          onClose={() => setShowTastingModal(false)}
        />
      )}
    </div>
  );
}