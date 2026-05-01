import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wine, BarChart3, Plus, BookOpen, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import AddFlowModal from '@/components/addflow/AddFlowModal';

export default function WineKeeperModuleNav({ currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);

  const tabs = [
    { path: '/WineKeeper', label: t('winekeeper.overview', 'Overview'), icon: Wine },
    { path: '/Wines', label: t('wine.collection', 'Wine Collection'), icon: Wine },
    { path: '/SessionHistory?module=wine', label: t('sessionHistory.title', 'Tasting History'), icon: CalendarDays },
    { path: '/WineInsights', label: t('nav.insights', 'Insights'), icon: BarChart3 },
  ];

  return (
    <>
    <div className="flex items-center justify-between gap-3">
      {/* ── Left: tabs ── */}
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map(({ path, label, icon: Icon }) => {
          const pathBase = path.split('?')[0];
          const isActive = location.pathname === pathBase || (currentPageName && pathBase.includes(currentPageName));
          return (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              style={{
                color: isActive ? '#F5F1E7' : 'rgba(224,216,200,0.78)',
                background: isActive ? 'rgba(107,58,58,0.42)' : 'transparent',
                border: isActive ? '1px solid rgba(139,58,58,0.35)' : '1px solid transparent',
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: isActive ? '#C47070' : 'rgba(180,140,75,0.78)' }}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Right: action buttons ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('wine.addBottle', 'Add Bottle')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('wine.addBottle', 'Add Bottle')}</span>
        </Button>

        <Button
          onClick={() => navigate('/Wines?action=tasting')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('wine.logTasting', 'Log Tasting')}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">{t('wine.logTasting', 'Log Tasting')}</span>
        </Button>

        <Button
          onClick={() => navigate('/Import?type=winekeeper_wines')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('import.bulkImport', 'Bulk Import')}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">{t('import.bulkImport', 'Bulk Import')}</span>
        </Button>
      </div>
    </div>

    <AddFlowModal
      open={showAddModal}
      onClose={() => setShowAddModal(false)}
      initialItemType="wine"
    />
    </>
  );
}