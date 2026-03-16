import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function ModuleCard({ module, icon, itemCount, summary, action, isComingSoon, stats = [], bgImage = null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleOpen = () => {
    if (!isComingSoon) {
      navigate(`/${action}`);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden transition-all duration-300 relative',
        isComingSoon
          ? 'opacity-60 cursor-default'
          : 'cursor-pointer hover:shadow-xl'
      )}
      style={{
        background: 'linear-gradient(145deg, rgba(50, 35, 22, 0.92), rgba(32, 22, 14, 0.97))',
        border: isComingSoon ? '1px solid rgba(139,98,57,0.2)' : '1px solid rgba(139,98,57,0.4)',
        boxShadow: isComingSoon ? 'none' : '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,164,116,0.08)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        if (!isComingSoon) {
          e.currentTarget.style.borderColor = 'rgba(212,164,116,0.6)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,164,116,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isComingSoon) {
          e.currentTarget.style.borderColor = 'rgba(139,98,57,0.4)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,164,116,0.08)';
        }
      }}
    >
      {/* Art background image treatment */}
      {bgImage && (
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px)',
          }}
        />
      )}
      {/* Warm vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(212,164,116,0.04) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div className="p-6 space-y-4 relative z-10">
        {/* Icon and Title */}
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: 'rgba(139,98,57,0.2)',
                border: '1px solid rgba(212,164,116,0.2)',
              }}
            >
              {typeof icon === 'string' && icon.startsWith('http') ? (
                <img src={icon} alt={module} className="w-full h-full object-cover" style={{ mixBlendMode: 'screen' }} />
              ) : typeof icon === 'function' ? (
                React.createElement(icon, { className: 'w-6 h-6', style: { color: 'rgba(212,164,116,0.9)' } })
              ) : (
                <span className="text-2xl">{icon}</span>
              )}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{module}</h3>
            {isComingSoon && (
              <p className="text-xs font-medium mt-1" style={{ color: '#D4A574' }}>{t('hub.comingSoonLabel')}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {!isComingSoon && (
          <div
            className="space-y-1.5 rounded-lg p-3"
            style={{
              background: 'rgba(15,10,6,0.5)',
              border: '1px solid rgba(139,98,57,0.2)',
            }}
          >
            {stats.length > 0 ? (
              stats.map((stat, i) => (
                <div key={i} className={cn('flex items-center justify-between', i > 0 && 'pt-1.5 border-t border-[#8b6239]/20')}>
                  <span className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>{stat.label}</span>
                  <span className={cn('font-semibold', i === 0 ? 'text-lg' : 'text-sm')} style={{ color: i === 0 ? '#D4A574' : '#E0D8C8' }}>{stat.value}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>{t('hub.items')}</span>
                <span className="text-lg font-semibold" style={{ color: '#D4A574' }}>{itemCount}</span>
              </div>
            )}
          </div>
        )}

        {isComingSoon && (
          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('hub.expandingEcosystem')}
          </p>
        )}

        {!isComingSoon && (
          <Button
            onClick={handleOpen}
            className="w-full justify-between group"
            style={{
              background: 'linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))',
              border: '1px solid rgba(139,98,57,0.4)',
              color: '#E0D8C8',
            }}
          >
            <span>{t('hub.openModule')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>
    </div>
  );
}