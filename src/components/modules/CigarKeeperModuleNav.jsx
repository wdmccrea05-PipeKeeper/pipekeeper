import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { TrendingUp, Plus, Cigarette, BookOpen, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddCigarModal from '@/components/cigars/AddCigarModal';

export default function CigarKeeperModuleNav({ currentPageName, onLogSession }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [addCigarOpen, setAddCigarOpen] = useState(false);

  const items = [
    { page: 'Cigars', label: t('cigars.cigars'), Icon: Cigarette },
    { page: 'SessionHistory', label: t('sessionHistory.title', 'Session History'), Icon: CalendarDays },
    { page: 'CigarInsights', label: t('nav.insights'), Icon: TrendingUp },
  ];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {items.map(({ page, label, Icon }) => {
          const active = currentPageName === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              style={{
                color: active ? '#F5F1E7' : 'rgba(224,216,200,0.78)',
                background: active ? 'rgba(107,74,45,0.42)' : 'transparent',
                border: active ? '1px solid rgba(180,140,75,0.35)' : '1px solid transparent',
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: active ? '#D4A574' : 'rgba(180,140,75,0.78)' }}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={() => setAddCigarOpen(true)}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('cigars.addCigar')}
          aria-label={t('cigars.addCigar')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('cigars.addCigar')}</span>
        </Button>
        <Button
          onClick={typeof onLogSession === 'function' ? onLogSession : () => navigate('/CigarKeeper')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('cigars.logSession')}
          aria-label={t('cigars.logSession')}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">{t('cigars.logSession')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Import?type=cigarkeeper_cigars')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('import.bulkImport')}
          aria-label={t('import.bulkImport')}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">{t('import.bulkImport')}</span>
        </Button>
      </div>

      <AddCigarModal open={addCigarOpen} onClose={() => setAddCigarOpen(false)} />
    </div>
  );
}
