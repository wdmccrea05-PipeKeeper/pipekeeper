import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { getRecentCrossModuleActivity, formatActivityDate } from '@/components/keeper-core';

export default function RecentActivity({ onActivitiesLoaded = null }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const recentActivities = await getRecentCrossModuleActivity();
        if (!cancelled) {
          setActivities(recentActivities);
        }
      } catch (error) {
        console.warn('[RecentActivity] Error loading activities:', error);
        if (!cancelled) {
          setActivities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#3a2f26]/60 to-[#2a2020]/60 border border-[#8b6239]/30 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[#E0D8C8] mb-4">{t('hub.recentActivity')}</h3>
        <div className="text-center py-8">
          <p className="text-sm text-[#E0D8C8]/60">{t('hub.loading')}</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gradient-to-br from-[#3a2f26]/60 to-[#2a2020]/60 border border-[#8b6239]/30 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[#E0D8C8] mb-4">{t('hub.recentActivity')}</h3>
        <div className="text-center py-8">
          <p className="text-sm text-[#E0D8C8]/60">{t('hub.noRecentActivity')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#3a2f26]/60 to-[#2a2020]/60 border border-[#8b6239]/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-[#E0D8C8] mb-4">{t('hub.recentActivity')}</h3>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-[#1a1410]/60 rounded-lg border border-[#8b6239]/15 hover:border-[#8b6239]/30 transition-colors"
          >
            <div className="text-2xl flex-shrink-0">{activity.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#E0D8C8] truncate">{activity.title}</p>
              <p className="text-xs text-[#E0D8C8]/60 truncate">{activity.subtitle}</p>
              <p className="text-xs text-[#8b6239] mt-1">{formatActivityDate(activity.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}