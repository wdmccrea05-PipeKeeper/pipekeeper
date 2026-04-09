import React, { useMemo, useState, useCallback } from 'react';
import CuratorWorkspace from '@/components/curator/CuratorWorkspace';

const CURATOR_ICON = 'https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png';

const SURFACES = [
  { key: 'record_optimization', label: 'Record Optimization' },
  { key: 'collection_optimization', label: 'Collection Optimization' },
  { key: 'purchase_restock', label: 'Purchase & Restock' },
  { key: 'pairings', label: 'Pairings' },
  { key: 'grow_expand', label: 'Grow & Expand' },
  { key: 'chat', label: 'Chat' },
];

function SurfaceTab({ active, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[58px] px-7 rounded-[18px] inline-flex items-center gap-3 text-[16px] font-medium transition"
      style={{
        background: active ? 'rgba(198,161,91,0.18)' : 'transparent',
        color: active ? '#F5F5F7' : '#C8B898',
        border: active ? '1px solid rgba(198,161,91,0.35)' : '1px solid transparent',
      }}
    >
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 ? (
        <span
          className="min-w-[24px] h-[24px] px-2 rounded-full text-[12px] inline-flex items-center justify-center"
          style={{
            background: 'rgba(154,67,67,0.45)',
            color: '#F3C7C7',
            border: '1px solid rgba(154,67,67,0.28)',
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function CuratorPage() {
  const [surface, setSurface] = useState('record_optimization');
  const [counts, setCounts] = useState({
    record_optimization: 0,
    collection_optimization: 0,
    purchase_restock: 0,
    pairings: 0,
    grow_expand: 0,
    chat: 0,
  });

  const handleCountsChange = useCallback((nextCounts) => {
    setCounts((prev) => ({ ...prev, ...nextCounts }));
  }, []);

  const progressWidth = useMemo(() => {
    const index = SURFACES.findIndex((s) => s.key === surface);
    return `${((index + 1) / SURFACES.length) * 100}%`;
  }, [surface]);

  return (
    <div className="min-h-screen" style={{ background: '#0B0B0C' }}>
      <div className="max-w-[1440px] mx-auto px-10 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <img src={CURATOR_ICON} alt="" className="w-9 h-9 object-cover rounded" style={{ filter: 'hue-rotate(35deg) saturate(0.8) brightness(1.1)' }} aria-hidden="true" />
            <h1
              className="text-[32px] leading-none font-semibold"
              style={{ color: '#F5F5F7', letterSpacing: '-0.5px' }}
            >
              Collection Curator
            </h1>
          </div>
          <p className="text-[18px] leading-8" style={{ color: '#9C968C' }}>
            Operational intelligence across your collection — fix, optimize, pair, and grow.
          </p>
        </header>

        <div
          className="rounded-[22px] p-3 mb-9"
          style={{
            background: 'linear-gradient(145deg, rgba(23,23,26,0.92) 0%, rgba(17,17,19,0.92) 100%)',
            border: '1px solid rgba(140,105,65,0.16)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex flex-wrap gap-3">
            {SURFACES.map((tab) => (
              <SurfaceTab
                key={tab.key}
                label={tab.label}
                badge={counts[tab.key]}
                active={surface === tab.key}
                onClick={() => setSurface(tab.key)}
              />
            ))}
          </div>

          <div
            className="h-[10px] rounded-full mt-3 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: progressWidth,
                background: 'linear-gradient(90deg, rgba(198,161,91,0.65) 0%, rgba(198,161,91,0.35) 100%)',
              }}
            />
          </div>
        </div>

        <CuratorWorkspace
          activeSurface={surface}
          onSurfaceChange={setSurface}
          onCountsChange={handleCountsChange}
        />
      </div>
    </div>
  );
}