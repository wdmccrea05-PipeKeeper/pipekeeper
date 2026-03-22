/**
 * LockedModuleGuard — wraps a module page and redirects if the module is hidden.
 *
 * Usage:
 *   <LockedModuleGuard moduleKey="whiskeykeeper">
 *     <WhiskeyKeeperContent />
 *   </LockedModuleGuard>
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { WHISKEYKEEPER_BLOCKED } from '@/components/utils/releaseConfig';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { EyeOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MODULE_LABELS = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  winekeeper: 'WineKeeper',
  cigarkeeper: 'CigarKeeper',
};

export default function LockedModuleGuard({ moduleKey, children }) {
  const { isModuleEnabled, isLoading } = useModuleVisibility();
  const navigate = useNavigate();

  // While loading, render nothing (prevents flash)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E0D8C8]/20 border-t-[#E0D8C8]/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isModuleEnabled(moduleKey)) {
    const label = MODULE_LABELS[moduleKey] || moduleKey;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="rounded-2xl p-8 text-center max-w-sm w-full"
          style={{
            background: 'linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,18,12,0.95))',
            border: '1px solid rgba(180,140,75,0.2)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}
          >
            <EyeOff className="w-8 h-8" style={{ color: 'rgba(180,140,75,0.6)' }} />
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {label} is Hidden
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>
            This module is currently hidden in your preferences. Your data is safe and intact.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate(createPageUrl('Profile'))}
              style={{
                background: 'linear-gradient(135deg, rgba(180,140,75,0.85), rgba(140,100,60,0.95))',
                border: '1px solid rgba(180,140,75,0.4)',
                color: '#F5F1E7',
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Modules in Profile
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('CollectionHub'))}
              className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
            >
              Back to Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}