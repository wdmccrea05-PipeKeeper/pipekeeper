import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Card, CardContent } from '@/components/ui/card';

export default function SmokingLogPanel({ userEmail }) {
  const { t } = useTranslation();
  const { data: smokingLogs = [], isLoading } = useQuery({
    queryKey: ['smoking-logs', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      try {
        const results = await base44.entities.SmokingLog.filter(
          { created_by: userEmail },
          '-date',
          100
        );
        return Array.isArray(results) ? results : [];
      } catch (err) {
        console.warn('[SmokingLogPanel] Load error:', err);
        return [];
      }
    },
    enabled: !!userEmail,
    staleTime: 30000,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-[#E0D8C8]/60">{t("common.loading")}</div>;
  }

  if (smokingLogs.length === 0) {
    return (
      <div className="text-center py-8 text-[#E0D8C8]/60">
        {t("insights.noData", { defaultValue: "No data yet" })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {smokingLogs.slice(0, 10).map((log) => (
        <Card key={log.id} className="bg-white/5 border-white/10">
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-[#E0D8C8]">
                  {log.pipe_name}
                </p>
                <p className="text-xs text-[#E0D8C8]/60">
                  {log.blend_name}
                </p>
              </div>
              <span className="text-xs text-[#E0D8C8]/50">
                {new Date(log.date).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}