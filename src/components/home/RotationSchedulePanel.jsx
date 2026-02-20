import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import EmptyState from '@/components/EmptyState';
import { CalendarClock } from 'lucide-react';

export default function RotationSchedulePanel({
  pipes = [],
  blends = [],
  cellarLogs = [],
  user = null,
}) {
  const { t } = useTranslation();

  // Sort pipes by last-smoked date (oldest first = next to smoke)
  const pipesByLastSmoked = pipes.map((pipe) => {
    const lastLog = (cellarLogs || [])
      .filter((log) => log.pipe_id === pipe.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return {
      ...pipe,
      lastSmoked: lastLog?.date || null,
    };
  }).sort((a, b) => {
    const dateA = a.lastSmoked ? new Date(a.lastSmoked).getTime() : 0;
    const dateB = b.lastSmoked ? new Date(b.lastSmoked).getTime() : 0;
    return dateA - dateB;
  });

  if (pipesByLastSmoked.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title={t('insights.noRotationData')}
        description={t('insights.rotationEmptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#E0D8C8]/70 mb-4">
        {t('insights.rotationDesc')}
      </p>
      <div className="space-y-2">
        {pipesByLastSmoked.slice(0, 20).map((pipe) => (
          <div
            key={pipe.id}
            className="p-3 rounded-lg bg-[#0F1C2E]/60 border border-[#A35C5C]/20 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-[#E0D8C8]">{pipe.name}</p>
              <p className="text-xs text-[#E0D8C8]/60">
                {pipe.lastSmoked
                  ? `${t('insights.lastSmoked')}: ${new Date(pipe.lastSmoked).toLocaleDateString()}`
                  : t('insights.neverSmoked')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}