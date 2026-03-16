import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import {
  buildCuratorHubContext,
  prepareCuratorNavigationState,
  buildCuratorEntryText,
} from '@/components/keeper-core';

export default function CuratorHub({ summary = null, recentActivities = [] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Build curator context from summary using Keeper Core service
  const curatorContext = useMemo(() => {
    return buildCuratorHubContext(summary, recentActivities);
  }, [summary, recentActivities]);

  const entryText = useMemo(() => {
    return buildCuratorEntryText(curatorContext);
  }, [curatorContext]);

  const handleCuratorClick = () => {
    // Use Keeper Core service to prepare navigation state
    const navigationState = prepareCuratorNavigationState(curatorContext);
    navigate('/Curator', { state: navigationState });
  };

  return (
    <div className="bg-gradient-to-r from-[#8b6239]/20 to-[#D4A574]/10 border border-[#D4A574]/30 rounded-2xl p-8 flex items-center justify-between gap-6">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-12 h-12 rounded-lg bg-[#D4A574]/20 flex items-center justify-center flex-shrink-0">
          <Target className="w-6 h-6 text-[#D4A574]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#E0D8C8]">
            {t('hub.curatorTitle')}
          </h3>
          <p className="text-sm text-[#E0D8C8]/70 mt-1">
            {t('hub.curatorDescription')}
          </p>
          <p className="text-xs text-[#D4A574] mt-2">
            {entryText}
          </p>
        </div>
      </div>

      <Button
        onClick={handleCuratorClick}
        className="flex items-center gap-2 flex-shrink-0 bg-[#D4A574] hover:bg-[#C99A66] text-[#1a1410]"
      >
        {t('hub.curatorAction')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}