import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Leaf, BookOpen, TrendingUp } from 'lucide-react';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';

const PIPE_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

function PipeImgIcon({ className, style }) {
  return (
    <img
      src={PIPE_ICON_URL}
      alt="pipe"
      className={className}
      style={{ ...style, filter: 'brightness(0) invert(1) sepia(0.6) saturate(2) hue-rotate(20deg) brightness(0.95)' }}
    />
  );
}

function WhiskeyBottleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function QuickLaunch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModuleVisibility();

  const pipeActions = [
    { label: t('quickActions.addPipe') || 'Add Pipe', icon: PipeImgIcon, path: '/Pipes', accent: '#D4A574' },
    { label: t('quickActions.addBlend') || 'Add Blend', icon: Leaf, path: '/Tobacco', accent: '#5A7C5A' },
    { label: t('quickActions.logSession') || 'Log Session', icon: BookOpen, path: '/Insights', accent: '#C87941' },
    { label: t('nav.insights') || 'Insights', icon: TrendingUp, path: '/Insights', accent: '#8B5CF6' },
  ];

  const whiskeyActions = [
    { label: t('quickActions.addBottle') || 'Add Bottle', icon: WhiskeyBottleIcon, path: '/Whiskey?action=add', accent: '#D4A574' },
    { label: t('quickActions.quickSearchBottle') || 'Quick Add', icon: WhiskeyBottleIcon, path: '/WhiskeyKeeper', accent: '#B48C4B' },
    { label: t('quickActions.logTasting') || 'Log Tasting', icon: BookOpen, path: '/Tastings', accent: '#C87941' },
    { label: t('nav.insights') || 'Insights', icon: TrendingUp, path: '/WhiskeyInsights', accent: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('hub.quickLaunch')}
        </h2>
        
        {/* PipeKeeper Quick Actions */}
        <div>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
            {t('nav.pipekeeper')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipeActions.map((action) => (
              <button
                key={action.path + action.label}
                onClick={() => navigate(action.path)}
                className="group p-4 rounded-xl text-left transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.7))',
                  border: '1px solid rgba(180, 140, 75, 0.15)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(180, 140, 75, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <action.icon className="w-5 h-5 mb-2 transition-transform group-hover:scale-110 object-contain" style={{ color: action.accent }} />
                <p className="text-sm font-semibold text-[#E0D8C8]">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* WhiskeyKeeper Quick Actions */}
        <div>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
            {t('nav.whiskeykeeper')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {whiskeyActions.map((action) => (
              <button
                key={action.path + action.label}
                onClick={() => navigate(action.path)}
                className="group p-4 rounded-xl text-left transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.7))',
                  border: '1px solid rgba(180, 140, 75, 0.15)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(180, 140, 75, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <action.icon className="w-5 h-5 mb-2 transition-transform group-hover:scale-110" style={{ color: action.accent }} />
                <p className="text-sm font-semibold text-[#E0D8C8]">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}