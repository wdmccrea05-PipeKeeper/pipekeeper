/**
 * ModuleReleaseDebug — Admin-only debug panel showing module release states.
 * Renders only in DEV or for admin users. Not visible to production users.
 */
import React, { useState } from 'react';
import {
  MODULE_RELEASE_STATES,
  getModuleReleaseState,
  canUserAccessModule,
  shouldFetchModuleData,
  shouldShowModuleInNav,
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';

const STATE_COLORS = {
  launched:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#10B981' },
  internal:  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#F59E0B' },
  blocked:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#EF4444' },
};

export default function ModuleReleaseDebug({ user }) {
  const [open, setOpen] = useState(false);
  const modules = Object.keys(MODULE_RELEASE_STATES);
  const isInternal = isInternalModuleTester(user);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-[99999] text-xs px-2 py-1 rounded opacity-40 hover:opacity-80 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', color: '#E0D8C8', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        🔬 Modules
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-20 left-4 z-[99999] rounded-xl p-4 text-xs space-y-2 max-w-[280px]"
      style={{ background: 'rgba(10,6,4,0.97)', border: '1px solid rgba(180,140,75,0.3)', color: '#E0D8C8' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-[#D4A574]">Module Release States</span>
        <button onClick={() => setOpen(false)} className="opacity-50 hover:opacity-100 text-sm">✕</button>
      </div>

      <div className="space-y-1 text-[10px] opacity-60 mb-2">
        <div>User: {user?.email || 'unknown'}</div>
        <div>Role: {user?.role || 'user'} | Internal: {isInternal ? '✅' : '❌'}</div>
      </div>

      {modules.map((key) => {
        const state = getModuleReleaseState(key);
        const colors = STATE_COLORS[state] || STATE_COLORS.blocked;
        const access = canUserAccessModule(key, user, true);
        const fetch_ = shouldFetchModuleData(key, user);
        const nav = shouldShowModuleInNav(key, user);
        return (
          <div
            key={key}
            className="rounded-lg p-2"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">{key}</span>
              <span className="font-bold" style={{ color: colors.text }}>{state}</span>
            </div>
            <div className="flex gap-2 mt-1 opacity-70">
              <span>access:{access ? '✅' : '❌'}</span>
              <span>fetch:{fetch_ ? '✅' : '❌'}</span>
              <span>nav:{nav ? '✅' : '❌'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}