import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Wind, Leaf, BookOpen, FlaskConical, TrendingUp, GlassWater, Sparkles } from 'lucide-react';

export default function QuickLaunch() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const pipeActions = [
    { label: t('pipekeeper.addPipe') || 'Add Pipe', icon: Wind, path: '/Pipes', accent: '#D4A574' },
    { label: t('pipekeeper.addBlend') || 'Add Blend', icon: Leaf, path: '/Tobacco', accent: '#5A7C5A' },
    { label: t('pipekeeper.logSession') || 'Log Session', icon: BookOpen, path: '/Home', accent: '#C87941' },
    { label: t('nav.insights') || 'Insights', icon: TrendingUp, path: '/Insights', accent: '#8B5CF6' },
  ];

  const whiskeyActions = [
    { label: t('whiskeykeeper.addBottle') || 'Add Bottle', icon: Wine, path: '/Whiskey', accent: '#D4A574' },
    { label: t('whiskeykeeper.logTasting') || 'Log Tasting', icon: BookOpen, path: '/Whiskey', accent: '#C87941' },
    { label: t('nav.bottles') || 'Bottles', icon: Wine, path: '/Whiskey', accent: '#B48C4B' },
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
                <action.icon className="w-5 h-5 mb-2 transition-transform group-hover:scale-110" style={{ color: action.accent }} />
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