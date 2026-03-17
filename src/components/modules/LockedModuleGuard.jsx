/**
 * LockedModuleGuard
 * Wraps a page that belongs to a specific module.
 * If the module is disabled (hidden), redirects to Hub with a message.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { Layers } from 'lucide-react';

export default function LockedModuleGuard({ moduleType, children }) {
  const { isModuleEnabled, isLoading } = useEnabledModules();
  const navigate = useNavigate();

  const enabled = isModuleEnabled(moduleType);

  useEffect(() => {
    if (!isLoading && !enabled) {
      // Redirect to Hub after a brief moment so the message is visible
      const t = setTimeout(() => navigate(createPageUrl('CollectionHub')), 2000);
      return () => clearTimeout(t);
    }
  }, [isLoading, enabled, navigate]);

  if (isLoading) return null;

  if (!enabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-4">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.3)' }}
          >
            <Layers className="w-8 h-8" style={{ color: 'rgba(180,140,75,0.8)' }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7' }}>
            Module Hidden
          </h2>
          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>
            This module is currently hidden in your preferences. You can re-enable it anytime in Profile → Active Modules.
          </p>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.4)' }}>
            Redirecting to Hub…
          </p>
        </div>
      </div>
    );
  }

  return children;
}