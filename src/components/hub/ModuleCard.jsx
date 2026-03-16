import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function ModuleCard({ module, icon, itemCount, summary, action, isComingSoon, stats = [] }) {
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
        'rounded-2xl overflow-hidden transition-all duration-300',
        isComingSoon
          ? 'bg-gradient-to-br from-[#3a2f26]/50 to-[#2a2020]/50 border border-[#8b6239]/20 opacity-60'
          : 'bg-gradient-to-br from-[#3a2f26] to-[#2a2020] border border-[#8b6239]/40 hover:border-[#D4A574]/60 hover:shadow-lg hover:shadow-[#8b6239]/20 cursor-pointer'
      )}
    >
      <div className="p-6 space-y-4">
        {/* Icon and Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="w-12 h-12 rounded-lg bg-[#8b6239]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {typeof icon === 'string' && icon.startsWith('http') ? (
                  <img src={icon} alt={module} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl">{icon}</span>
                )}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-[#E0D8C8]">{module}</h3>
              {isComingSoon && (
                <p className="text-xs text-[#D4A574] font-medium mt-1">{t('hub.comingSoonLabel')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats — module-specific rows */}
        {!isComingSoon && (
          <div className="space-y-1.5 bg-[#1a1410]/60 rounded-lg p-3">
            {stats.length > 0 ? (
              stats.map((stat, i) => (
                <div key={i} className={cn('flex items-center justify-between', i > 0 && 'pt-1.5 border-t border-[#8b6239]/20')}>
                  <span className="text-sm text-[#E0D8C8]/70">{stat.label}</span>
                  <span className={cn('font-semibold', i === 0 ? 'text-lg text-[#D4A574]' : 'text-sm text-[#E0D8C8]')}>{stat.value}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#E0D8C8]/70">{t('hub.items')}</span>
                  <span className="text-lg font-semibold text-[#D4A574]">{itemCount}</span>
                </div>
                {summary && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#8b6239]/20">
                    <span className="text-sm text-[#E0D8C8]/70">{summary.label}</span>
                    <span className="text-sm font-medium text-[#E0D8C8]">{summary.value}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Description for Coming Soon */}
        {isComingSoon && (
          <p className="text-sm text-[#E0D8C8]/60">
            {t('hub.expandingEcosystem')}
          </p>
        )}

        {/* Action Button */}
        {!isComingSoon && (
          <Button
            onClick={handleOpen}
            variant="secondary"
            className="w-full justify-between group"
          >
            <span>{t('hub.openModule')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>
    </div>
  );
}