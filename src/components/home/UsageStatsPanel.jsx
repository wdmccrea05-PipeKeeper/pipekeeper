import React, { useMemo } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function UsageStatsPanel({ smokingLogs = [] }) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    if (smokingLogs.length === 0) {
      return {
        totalSessions: 0,
        totalBowls: 0,
        averageBowls: 0,
        mostUsedPipe: 'N/A',
        mostUsedBlend: 'N/A',
      };
    }

    const totalSessions = smokingLogs.length;
    const totalBowls = smokingLogs.reduce((sum, log) => sum + (log.bowls_used || 1), 0);
    const averageBowls = (totalBowls / totalSessions).toFixed(1);

    // Find most used pipe and blend
    const pipeCount = {};
    const blendCount = {};
    
    smokingLogs.forEach((log) => {
      pipeCount[log.pipe_name] = (pipeCount[log.pipe_name] || 0) + 1;
      blendCount[log.blend_name] = (blendCount[log.blend_name] || 0) + 1;
    });

    const mostUsedPipe = Object.entries(pipeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const mostUsedBlend = Object.entries(blendCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalSessions,
      totalBowls,
      averageBowls,
      mostUsedPipe,
      mostUsedBlend,
    };
  }, [smokingLogs]);

  const chartData = useMemo(() => {
    const monthCounts = {};
    
    smokingLogs.forEach((log) => {
      const date = new Date(log.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, sessions: count }));
  }, [smokingLogs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label={t("insights.stats.totalSessions", { defaultValue: "Total Sessions" })}
          value={stats.totalSessions}
        />
        <StatCard
          label={t("insights.stats.totalBowls", { defaultValue: "Total Bowls" })}
          value={stats.totalBowls}
        />
        <StatCard
          label={t("insights.stats.averageBowls", { defaultValue: "Avg/Session" })}
          value={stats.averageBowls}
        />
        <StatCard
          label={t("insights.stats.mostUsedPipe", { defaultValue: "Top Pipe" })}
          value={stats.mostUsedPipe}
          isText
        />
        <StatCard
          label={t("insights.stats.mostUsedBlend", { defaultValue: "Top Blend" })}
          value={stats.mostUsedBlend}
          isText
        />
      </div>

      {chartData.length > 0 && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="month" stroke="#E0D8C8" />
              <YAxis stroke="#E0D8C8" />
              <Tooltip contentStyle={{ backgroundColor: '#1a2c42', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="sessions" fill="#A35C5C" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, isText = false }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <p className="text-xs text-[#E0D8C8]/60 mb-1">{label}</p>
      <p className={`font-bold ${isText ? 'text-sm truncate' : 'text-lg'} text-[#E0D8C8]`}>
        {value}
      </p>
    </div>
  );
}