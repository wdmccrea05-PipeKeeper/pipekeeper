import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Flame, Calendar } from 'lucide-react';
import { PkCard, PkCardContent, PkCardHeader, PkCardTitle } from '@/components/ui/PkCard';
import { formatISO, parseISO, isAfter, isBefore } from 'date-fns';

export default function SmokingLogReport({ user }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.SmokingLog.filter({ created_by: user?.email });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('SmokingLogReport: load error', err);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const filteredLogs = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    end.setHours(23, 59, 59, 999);

    return logs.filter(log => {
      const logDate = parseISO(log.date);
      return isAfter(logDate, start) && isBefore(logDate, end);
    });
  }, [logs, startDate, endDate]);

  const stats = useMemo(() => {
    const byBlend = {};
    const byPipe = {};
    let totalBowls = 0;

    filteredLogs.forEach(log => {
      totalBowls += log.bowls_smoked || 1;

      if (log.blend_id) {
        if (!byBlend[log.blend_id]) {
          byBlend[log.blend_id] = { name: log.blend_name, bowls: 0, sessions: 0 };
        }
        byBlend[log.blend_id].bowls += log.bowls_smoked || 1;
        byBlend[log.blend_id].sessions += 1;
      }

      if (log.pipe_id) {
        if (!byPipe[log.pipe_id]) {
          byPipe[log.pipe_id] = { name: log.pipe_name, bowls: 0, sessions: 0 };
        }
        byPipe[log.pipe_id].bowls += log.bowls_smoked || 1;
        byPipe[log.pipe_id].sessions += 1;
      }
    });

    return { byBlend, byPipe, totalBowls, totalSessions: filteredLogs.length };
  }, [filteredLogs]);

  const topBlends = Object.entries(stats.byBlend)
    .sort((a, b) => b[1].bowls - a[1].bowls)
    .slice(0, 5);

  const topPipes = Object.entries(stats.byPipe)
    .sort((a, b) => b[1].bowls - a[1].bowls)
    .slice(0, 5);

  return (
    <PkCard>
      <PkCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <PkCardTitle>Smoking Log Report</PkCardTitle>
          </div>
        </div>
      </PkCardHeader>
      <PkCardContent>
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-[#E0D8C8]/70 block mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#1A2B3A] border-[#A35C5C]/40"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-[#E0D8C8]/70 block mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#1A2B3A] border-[#A35C5C]/40"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
            >
              Last 7 Days
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1A2B3A] rounded-lg p-4 border border-[#A35C5C]/20">
              <p className="text-sm text-[#E0D8C8]/70">Sessions</p>
              <p className="text-2xl font-bold text-[#E0D8C8]">{stats.totalSessions}</p>
            </div>
            <div className="bg-[#1A2B3A] rounded-lg p-4 border border-[#A35C5C]/20">
              <p className="text-sm text-[#E0D8C8]/70">Bowls</p>
              <p className="text-2xl font-bold text-[#E0D8C8]">{stats.totalBowls}</p>
            </div>
            <div className="bg-[#1A2B3A] rounded-lg p-4 border border-[#A35C5C]/20">
              <p className="text-sm text-[#E0D8C8]/70">Avg/Session</p>
              <p className="text-2xl font-bold text-[#E0D8C8]">
                {stats.totalSessions > 0 ? (stats.totalBowls / stats.totalSessions).toFixed(1) : '0'}
              </p>
            </div>
          </div>

          {/* Top Blends */}
          {topBlends.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#E0D8C8] mb-3">Top Blends</h4>
              <div className="space-y-2">
                {topBlends.map(([blendId, blend]) => (
                  <div key={blendId} className="flex items-center justify-between p-2 bg-[#1A2B3A] rounded-lg">
                    <span className="text-sm truncate">{blend.name}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{blend.bowls} bowls</Badge>
                      <Badge variant="secondary" className="text-xs">{blend.sessions} sessions</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Pipes */}
          {topPipes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#E0D8C8] mb-3">Top Pipes</h4>
              <div className="space-y-2">
                {topPipes.map(([pipeId, pipe]) => (
                  <div key={pipeId} className="flex items-center justify-between p-2 bg-[#1A2B3A] rounded-lg">
                    <span className="text-sm truncate">{pipe.name}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{pipe.bowls} bowls</Badge>
                      <Badge variant="secondary" className="text-xs">{pipe.sessions} sessions</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredLogs.length === 0 && (
            <p className="text-center text-[#E0D8C8]/60 py-8">No smoking logs in this date range</p>
          )}
        </div>
      </PkCardContent>
    </PkCard>
  );
}