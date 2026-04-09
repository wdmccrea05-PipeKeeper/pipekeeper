import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import CuratorPairingResults from '@/components/curator/CuratorPairingResults';

const SUB_TABS = [
  { key: 'expert', label: 'Expert Pairing', empty: 'No expert pairings yet.' },
  { key: 'old_favorites', label: 'Old Favorites', empty: 'No old favorites pairings yet.' },
  { key: 'rediscover', label: 'Rediscover', empty: 'No rediscover pairings yet.' },
  { key: 'something_new', label: 'Something New', empty: 'No something new pairings yet.' },
];

const MODULE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pipe', label: 'Pipe' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'whiskey', label: 'Whiskey' },
];

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function groupPairings(pairings = []) {
  const grouped = {
    expert: [],
    old_favorites: [],
    rediscover: [],
    something_new: [],
  };

  for (const pairing of pairings) {
    const key = normalizeKey(pairing?.subTab || pairing?.tab || pairing?.group);
    if (grouped[key]) {
      grouped[key].push(pairing);
    }
  }

  return grouped;
}

function SubTab({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 px-5 rounded-full text-[16px] font-medium"
      style={{
        background: active ? '#C6A15B' : 'transparent',
        color: active ? '#0B0B0C' : '#D8D0C2',
        border: active ? '1px solid #C6A15B' : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {label}
    </button>
  );
}

export default function CuratorPairingsTab({
  pairings = [],
  onAction,
  onRefresh,
  isRefreshing = false,
  activeModules = {},
}) {
  const grouped = useMemo(() => groupPairings(pairings), [pairings]);
  const [activeTab, setActiveTab] = useState('expert');
  const [moduleFilter, setModuleFilter] = useState('all');

  useEffect(() => {
    const hasActiveData = grouped[activeTab]?.length > 0;
    if (hasActiveData) return;

    const firstNonEmpty = SUB_TABS.find((tab) => (grouped[tab.key] || []).length > 0);
    if (firstNonEmpty) {
      setActiveTab(firstNonEmpty.key);
    }
  }, [activeTab, grouped]);

  const activePairings = grouped[activeTab] || [];
  const activeTabMeta = SUB_TABS.find((tab) => tab.key === activeTab) || SUB_TABS[0];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>
            Pairings
          </h2>
          <p className="text-[16px]" style={{ color: '#A1A1AA' }}>
            Pipe & whiskey, cigar & whiskey — based on your collection
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium"
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#D8D0C2',
            opacity: isRefreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          New Pairings
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {(activeModules.pipekeeper && activeModules.whiskeykeeper) && (
          <div className="flex flex-wrap gap-2">
            {MODULE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setModuleFilter(filter.key)}
                className="h-10 px-4 rounded-full text-sm font-medium"
                style={{
                  background: moduleFilter === filter.key ? '#C6A15B' : 'transparent',
                  color: moduleFilter === filter.key ? '#0B0B0C' : '#D8D0C2',
                  border: moduleFilter === filter.key ? '1px solid #C6A15B' : '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {SUB_TABS.map((tab) => (
            <SubTab
              key={tab.key}
              label={tab.label}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>
      </div>

      <div className="text-[15px]" style={{ color: '#7F7F8A' }}>
        Primary pairings based on your collection
      </div>

      {isRefreshing ? (
        <div className="py-16 text-center">
          <div className="text-[18px]" style={{ color: '#A1A1AA' }}>
            Loading pairings…
          </div>
        </div>
      ) : activePairings.length > 0 ? (
        <CuratorPairingResults pairings={activePairings} onAction={onAction} moduleFilter={moduleFilter} />
      ) : (
        <div className="py-20 text-center">
          <div className="text-[42px] mb-4" style={{ color: 'rgba(198,161,91,0.45)' }}>
            ⇄
          </div>
          <div className="text-[18px] mb-2" style={{ color: '#A1A1AA' }}>
            {activeTabMeta.empty}
          </div>
          <div className="text-[15px]" style={{ color: '#6F6F78' }}>
            Pairings require owned pipes, tobacco, and whiskey data.
          </div>
        </div>
      )}
    </div>
  );
}