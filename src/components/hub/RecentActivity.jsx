import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { getRecentCrossModuleActivity, formatActivityDate } from '@/components/keeper-core';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

function ActivityIcon({ module }) {
  const src = module === 'whiskey' ? MODULE_ICONS.whiskeykeeper : MODULE_ICONS.pipekeeper;

  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent"
      style={{
        background: 'rgba(139,98,57,0.12)',
        border: '1px solid rgba(212,164,116,0.16)',
      }}
    >
      <img
        src={src}
        alt={module}
        className="w-7 h-7 object-contain bg-transparent"
        style={{
          backgroundColor: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
        }}
        draggable={false}
      />
    </div>
  );
}

export default function RecentActivity({ onActivitiesLoaded = null }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const { base44 } = await import('@/api/base44Client');
        const user = await base44.auth.me();

        if (!user?.email) {
          setActivities([]);
          return;
        }

        const recentActivities = await getRecentCrossModuleActivity(user.email);
        if (!cancelled) {
          setActivities(recentActivities);
          if (onActivitiesLoaded) onActivitiesLoaded(recentActivities);
        }
      } catch (error) {
        console.warn('[RecentActivity] Error loading activities:', error);
        if (!cancelled) {
          setActivities([]);
          if (onActivitiesLoaded) onActivitiesLoaded([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onActivitiesLoaded]);

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
            <ActivityIcon module={activity.module} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#E0D8C8] truncate">{activity.title}</p>
              <p className="text-xs text-[#E0D8C8]/60 truncate">{activity.subtitle}</p>
              <p className="text-xs text-[#8b6239] mt-1">{formatActivityDate(activity.date, t)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
