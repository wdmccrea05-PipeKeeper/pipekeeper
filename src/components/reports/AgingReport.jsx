import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, Calendar } from 'lucide-react';
import { PkCard, PkCardContent, PkCardHeader, PkCardTitle } from '@/components/ui/PkCard';
import { parseISO, differenceInMonths, differenceInDays, isAfter, isBefore } from 'date-fns';

export default function AgingReport({ user }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs-report', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.CellarLog.filter({ created_by: user?.email });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('AgingReport: load error', err);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends-report', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('AgingReport: blends load error', err);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const filteredLogs = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    end.setHours(23, 59, 59, 999);

    return cellarLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isAfter(logDate, start) && isBefore(logDate, end);
    });
  }, [cellarLogs, startDate, endDate]);

  const agingData = useMemo(() => {
    const blendsMap = {};
    blends.forEach(b => {
      blendsMap[b.id] = b;
    });

    const byBlend = {};
    const now = new Date();

    filteredLogs.forEach(log => {
      if (log.transaction_type !== 'added') return;

      if (!byBlend[log.blend_id]) {
        const blend = blendsMap[log.blend_id];
        byBlend[log.blend_id] = {
          blend_name: log.blend_name,
          aging_potential: blend?.aging_potential,
          oldest_date: log.date,
          total_oz: 0,
          entries: 0
        };
      }

      const existing = byBlend[log.blend_id];
      existing.total_oz += log.amount_oz || 0;
      existing.entries += 1;

      // Track oldest cellaring date
      if (new Date(log.date) < new Date(existing.oldest_date)) {
        existing.oldest_date = log.date;
      }
    });

    // Calculate aging months for each blend
    const results = Object.entries(byBlend)
      .map(([blendId, data]) => {
        const agingMonths = differenceInMonths(now, parseISO(data.oldest_date));
        const agingDays = differenceInDays(now, parseISO(data.oldest_date));
        return {
          blend_id: blendId,
          ...data,
          agingMonths,
          agingDays,
          agingDisplay: agingMonths > 0 ? `${agingMonths}m ${agingDays % 30}d` : `${agingDays}d`
        };
      })
      .sort((a, b) => b.agingMonths - a.agingMonths);

    return results;
  }, [filteredLogs, blends]);

  const agingPotentialColors = {
    'Excellent': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Good': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Fair': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Poor': 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };

  return (
    <PkCard>
      <PkCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <PkCardTitle>Aging Report</PkCardTitle>
          </div>
        </div>
      </PkCardHeader>
      <PkCardContent>
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-[#E0D8C8]/70 block mb-2">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#1A2B3A] border-[#A35C5C]/40"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-[#E0D8C8]/70 block mb-2">To Date</label>
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
                d.setFullYear(d.getFullYear() - 1);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
            >
              Last Year
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A2B3A] rounded-lg p-4 border border-[#A35C5C]/20">
              <p className="text-sm text-[#E0D8C8]/70">Cellared Blends</p>
              <p className="text-2xl font-bold text-[#E0D8C8]">{agingData.length}</p>
            </div>
            <div className="bg-[#1A2B3A] rounded-lg p-4 border border-[#A35C5C]/20">
              <p className="text-sm text-[#E0D8C8]/70">Total Aged (oz)</p>
              <p className="text-2xl font-bold text-[#E0D8C8]">
                {agingData.reduce((sum, d) => sum + d.total_oz, 0).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Aged Blends List */}
          {agingData.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#E0D8C8] mb-3">Cellared Blends</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {agingData.map((item) => (
                  <div key={item.blend_id} className="p-3 bg-[#1A2B3A] rounded-lg border border-[#A35C5C]/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#E0D8C8] truncate">{item.blend_name}</p>
                        <p className="text-xs text-[#E0D8C8]/60 mt-1">Cellared: {item.oldest_date}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        <div className="flex gap-2">
                          <Badge className="text-xs whitespace-nowrap">{item.agingDisplay}</Badge>
                          {item.aging_potential && (
                            <Badge 
                              className={`text-xs whitespace-nowrap border ${agingPotentialColors[item.aging_potential] || 'bg-gray-500/20 text-gray-300'}`}
                            >
                              {item.aging_potential}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#E0D8C8]/70">{item.total_oz.toFixed(1)} oz</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {agingData.length === 0 && (
            <p className="text-center text-[#E0D8C8]/60 py-8">No tobacco cellared in this date range</p>
          )}
        </div>
      </PkCardContent>
    </PkCard>
  );
}