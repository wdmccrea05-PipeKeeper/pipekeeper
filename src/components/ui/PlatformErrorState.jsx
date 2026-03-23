/**
 * PlatformErrorState — canonical CollectionKeeper branded error/unavailable screen.
 * Use this for all generic platform-level errors, blocked routes, fallback states.
 */
import React from 'react';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/branding/BrandLogo';

export default function PlatformErrorState({
  icon: Icon = AlertCircle,
  title = 'Something went wrong',
  detail,
  primaryAction,
  primaryLabel = 'Go to Hub',
  secondaryAction,
  secondaryLabel,
  fullScreen = true,
}) {
  return (
    <div
      className={`flex items-center justify-center p-6 ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'}`}
      style={{ background: fullScreen ? 'linear-gradient(135deg, #0f0b08 0%, #1a1410 50%, #0f0b08 100%)' : undefined }}
    >
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center"
        style={{
          background: 'linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))',
          border: '1px solid rgba(120,90,65,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <BrandLogo
          compact
          showWordmark={false}
          imageClassName="w-10 h-10 mx-auto mb-4 opacity-80"
        />

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}
        >
          <Icon className="w-6 h-6" style={{ color: 'rgba(180,140,75,0.7)' }} />
        </div>

        <p className="text-xs uppercase tracking-[0.12em] font-bold mb-1" style={{ color: '#B48C4B' }}>
          CollectionKeeper
        </p>

        <h2
          className="text-xl font-bold mb-3"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          {title}
        </h2>

        {detail && (
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {detail}
          </p>
        )}

        <div className="flex flex-col gap-2 mt-6">
          {primaryAction && (
            <Button
              onClick={primaryAction}
              style={{
                background: 'linear-gradient(135deg, rgba(180,140,75,0.85), rgba(140,100,60,0.95))',
                border: '1px solid rgba(180,140,75,0.4)',
                color: '#F5F1E7',
              }}
            >
              <Home className="w-4 h-4 mr-2" />
              {primaryLabel}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction}
              className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}