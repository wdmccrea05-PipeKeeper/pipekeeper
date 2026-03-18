import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Leaf, BookOpen, TrendingUp } from 'lucide-react';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

function ImageIcon({ src, alt, className = 'w-5 h-5 mb-2' }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-contain bg-transparent transition-transform group-hover:scale-110`}
      style={{
        backgroundColor: 'transparent',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.22))',
      }}
      draggable={false}
    />
  );
}

function PipeImgIcon({ className }) {
  return <ImageIcon src={MODULE_ICONS.pipekeeper} alt="PipeKeeper" className={className || 'w-5 h-5 mb-2'} />;
}

function WhiskeyImgIcon({ className }) {
  return <ImageIcon src={MODULE_ICONS.whiskeykeeper} alt="WhiskeyKeeper" className={className || 'w-5 h-5 mb-2'} />;
}

export default function QuickLaunch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModuleVisibility();

  const pipeActions = [
    { label: t('quickActions.addPipe'), icon: PipeImgIcon, path: '/Pipes', accent: '#D4A574' },
    { label: t('quickActions.addBlend'), icon: Leaf, path: '/Tobacco', accent: '#5A7C5A' },
    { label: t('quickActions.logSession'), icon: BookOpen, path: '/Home', accent: '#C87941' },
    { label: t('nav.insights'), icon: TrendingUp, path: '/Insights', accent: '#8B5CF6' },
  ];

  const whiskeyActions = [
    { label: t('quickActions.addBottle'), icon: WhiskeyImgIcon, path: '/Whiskey?action=add', accent: '#D4A574' },
    { label: t('quickActions.quickSearchBottle'), icon: WhiskeyImgIcon, path: '/WhiskeyKeeper', accent: '#B48C4B' },
    { label: t('quickActions.logTasting'), icon: BookOpen, path: '/Tastings', accent: '#C87941' },
    { label: t('nav.insights'), icon: TrendingUp, path: '/WhiskeyInsights', accent: '#8B5CF6' },
  ];

  const ActionCard = ({ action }) => (
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
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('hub.quickLaunch')}
        </h2>

        <div>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
            {t('nav.pipekeeper')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipeActions.map((action) => <ActionCard key={action.path + action.label} action={action} />)}
          </div>
        </div>

        {isModuleEnabled('whiskeykeeper') && (
          <div>
            <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('nav.whiskeykeeper')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {whiskeyActions.map((action) => <ActionCard key={action.path + action.label} action={action} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
