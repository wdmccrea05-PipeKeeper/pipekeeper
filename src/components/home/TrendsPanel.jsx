import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import EmptyState from '@/components/EmptyState';
import { BarChart3 } from 'lucide-react';
import ProFeatureLock from '@/components/subscription/ProFeatureLock';

export default function TrendsPanel({
  pipes = [],
  blends = [],
  cellarLogs = [],
  user = null,
  hasPro = false,
}) {
  const { t } = useTranslation();

  if (!hasPro) {
    return (
      <ProFeatureLock
        featureName={t('insights.pro.trendsTitle')}
      >
        <EmptyState
          icon={BarChart3}
          title={t('insights.proFeatureRequired')}
          description={t('insights.trendsProRequired')}
        />
      </ProFeatureLock>
    );
  }

  // Group cellar logs by date and count sessions
  const logsByDate = {};
  (cellarLogs || []).forEach((log) => {
    const dateKey = new Date(log.date).toLocaleDateString();
    logsByDate[dateKey] = (logsByDate[dateKey] || 0) + 1;
  });

  const sortedDates = Object.keys(logsByDate).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  ).slice(-30); // Last 30 days

  if (sortedDates.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t('insights.noTrendsData')}
        description={t('insights.logSessionsForTrends')}
      />
    );
  }

  const maxCount = Math.max(...sortedDates.map((d) => logsByDate[d]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#E0D8C8]/70">
        {t('insights.trendsDesc')}
      </p>
      <div className="space-y-2">
        {sortedDates.map((date) => {
          const count = logsByDate[date];
          const percentage = (count / maxCount) * 100;
          return (
            <div key={date}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#E0D8C8]/70">{date}</span>
                <span className="text-[#E0D8C8]">{count} {t('insights.sessions')}</span>
              </div>
              <div className="w-full h-6 bg-[#0F1C2E]/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}