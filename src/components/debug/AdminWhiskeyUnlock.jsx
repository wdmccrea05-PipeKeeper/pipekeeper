import React, { useState, useEffect } from 'react';
import { isAdminWhiskeyUnlocked, setAdminWhiskeyUnlock } from '@/components/utils/releaseConfig';
import { FlaskConical } from 'lucide-react';

export default function AdminWhiskeyUnlock() {
  const [unlocked, setUnlocked] = useState(() => isAdminWhiskeyUnlocked());

  // Sync: if legacy key says unlocked but canonical override key isn't set, fix and reload
  useEffect(() => {
    const LOCAL_OVERRIDE_KEY = 'ck_module_override_whiskeykeeper';
    if (isAdminWhiskeyUnlocked() && localStorage.getItem(LOCAL_OVERRIDE_KEY) !== 'launched') {
      setAdminWhiskeyUnlock(true); // writes both keys
      window.location.reload();
    }
  }, []);

  const toggle = () => {
    const next = !unlocked;
    setAdminWhiskeyUnlock(next);
    setUnlocked(next);
    // Reload so all gated components re-evaluate the release config
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      title={unlocked ? 'WhiskeyKeeper unlocked (admin) — click to re-lock' : 'Unlock WhiskeyKeeper for admin testing'}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{
        background: unlocked
          ? 'rgba(212, 165, 116, 0.18)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${unlocked ? 'rgba(212,165,116,0.45)' : 'rgba(255,255,255,0.1)'}`,
        color: unlocked ? '#D4A574' : 'rgba(224,216,200,0.5)',
      }}
    >
      <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="hidden lg:inline whitespace-nowrap">
        WK {unlocked ? '🔓' : '🔒'}
      </span>
    </button>
  );
}