/**
 * AdminModuleUnlock — generic admin/internal toggle for any internal module.
 *
 * Renders a compact button that lets admin/internal testers locally override
 * the release state of a given internal module (whiskeykeeper, cigarkeeper, etc.)
 * without touching production config.
 *
 * WineKeeper is intentionally excluded from the default INTERNAL_MODULES list;
 * add it explicitly only for dev-only override scenarios.
 */
import React, { useState, useEffect } from 'react';
import { FlaskConical } from 'lucide-react';
import {
  getAdminModuleOverride,
  setAdminModuleOverride,
  clearAdminModuleOverride,
} from '@/components/utils/moduleReleaseState';

// Modules that admin/internal testers may toggle via this control.
// WineKeeper is fully launched app-wide, so it is not included here.
const INTERNAL_MODULES = ['whiskeykeeper', 'cigarkeeper'];

const MODULE_LABELS = {
  whiskeykeeper: 'WK',
  cigarkeeper: 'CK',
};

function ModuleToggleButton({ moduleKey }) {
  const label = MODULE_LABELS[moduleKey] || moduleKey.slice(0, 2).toUpperCase();
  const [unlocked, setUnlocked] = useState(() => {
    const override = getAdminModuleOverride(moduleKey);
    return override === 'internal' || override === 'launched';
  });

  useEffect(() => {
    // Sync state in case localStorage was written externally.
    const override = getAdminModuleOverride(moduleKey);
    const isUnlocked = override === 'internal' || override === 'launched';
    setUnlocked(isUnlocked);
  }, [moduleKey]);

  const toggle = () => {
    const next = !unlocked;
    if (next) {
      setAdminModuleOverride(moduleKey, 'internal');
    } else {
      clearAdminModuleOverride(moduleKey);
    }
    setUnlocked(next);
    // Reload so all gated components re-evaluate release state.
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      title={
        unlocked
          ? `${moduleKey} unlocked (admin) — click to re-lock`
          : `Unlock ${moduleKey} for admin/internal testing`
      }
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
        {label} {unlocked ? '🔓' : '🔒'}
      </span>
    </button>
  );
}

/**
 * Renders a toggle button for each module in INTERNAL_MODULES.
 * Pass `modules` to restrict which modules are shown.
 */
export default function AdminModuleUnlock({ modules = INTERNAL_MODULES }) {
  const targets = modules.filter((m) => INTERNAL_MODULES.includes(m));
  if (targets.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {targets.map((moduleKey) => (
        <ModuleToggleButton key={moduleKey} moduleKey={moduleKey} />
      ))}
    </div>
  );
}