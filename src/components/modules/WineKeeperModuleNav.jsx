import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wine, BookOpen, BarChart3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function WineKeeperModuleNav({ currentPageName }) {
  const location = useLocation();
  const { t } = useTranslation();

  const tabs = [
    { path: '/WineKeeper', label: t('winekeeper.overview', 'Overview'), icon: Wine },
    { path: '/Wines', label: t('wine.collection', 'Collection'), icon: Wine },
    { path: '/WineInsights', label: t('nav.insights', 'Insights'), icon: BarChart3 },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path || (currentPageName && path.includes(currentPageName));
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-[rgba(139,58,58,0.35)] border border-[rgba(139,58,58,0.55)]'
                : 'border border-transparent hover:bg-white/6 hover:border-[rgba(139,58,58,0.2)]'
            )}
            style={{ color: isActive ? '#F5F1E7' : 'rgba(224,216,200,0.72)' }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: isActive ? '#C47070' : 'rgba(180,140,75,0.65)' }} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}