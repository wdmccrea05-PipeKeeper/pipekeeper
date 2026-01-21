import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wine, Clock, TrendingUp, Package } from "lucide-react";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function CellarAgingDashboard({ user }) {
  const navigate = useNavigate();
  
  const { data: blends = [], isLoading } = useQuery({
    queryKey: ["tobacco-blends", user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ["cellar-logs", user?.email],
    queryFn: async () => {
      const logs = await base44.entities.CellarLog.filter({ created_by: user?.email });
      return Array.isArray(logs) ? logs : [];
    },
    enabled: !!user?.email,
  });

  // Map blend IDs to their net cellared amount and oldest date from logs
  const getCellarDataFromLogs = (blendId) => {
    const logs = cellarLogs.filter(l => l.blend_id === blendId);
    const added = logs
      .filter(l => l.transaction_type === 'added')
      .reduce((sum, l) => sum + (l.amount_oz || 0), 0);
    const removed = logs
      .filter(l => l.transaction_type === 'removed')
      .reduce((sum, l) => sum + (l.amount_oz || 0), 0);
    const net = Math.max(0, added - removed);
    
    const addedLogs = logs.filter(l => l.transaction_type === 'added' && l.date);
    const oldestDate = addedLogs.length > 0 
      ? addedLogs.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date
      : null;
    
    return { net, oldestDate };
  };

  const cellarBlends = blends.filter(b => {
    const logData = getCellarDataFromLogs(b.id);
    const hasCellared = (b.tin_tins_cellared || 0) > 0 || 
                        (b.bulk_cellared || 0) > 0 || 
                        (b.pouch_pouches_cellared || 0) > 0 ||
                        (b.bulk_cellared_date && (b.bulk_cellared || 0) > 0) ||
                        logData.net > 0;
    return hasCellared;
  });

  const getAgingInfo = (blend) => {
    const logData = getCellarDataFromLogs(blend.id);
    const dates = [
      blend.tin_cellared_date,
      blend.bulk_cellared_date,
      blend.pouch_cellared_date,
      logData.oldestDate
    ].filter(Boolean);
    
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null;
    
    if (!oldestDate) return { months: 0, days: 0, oldestDate: null };
    
    const now = new Date();
    const months = differenceInMonths(now, oldestDate);
    const days = differenceInDays(now, oldestDate);
    
    return { months, days, oldestDate };
  };

  const getAgingRecommendation = (blend) => {
    const aging = getAgingInfo(blend);
    const potential = blend.aging_potential;
    
    if (!potential) return { status: "unknown", message: "No aging potential set", color: "gray" };
    
    const months = aging.months;
    
    if (potential === "Excellent") {
      if (months < 6) return { status: "young", message: "Just beginning - best after 1-2 years", color: "blue" };
      if (months < 24) return { status: "developing", message: "Developing nicely - continue aging", color: "yellow" };
      return { status: "peak", message: "Peak aging achieved!", color: "green" };
    }
    
    if (potential === "Good") {
      if (months < 3) return { status: "young", message: "Early stage - best after 6-12 months", color: "blue" };
      if (months < 12) return { status: "developing", message: "Coming along well", color: "yellow" };
      return { status: "peak", message: "Ready to enjoy!", color: "green" };
    }
    
    if (potential === "Fair") {
      if (months < 3) return { status: "young", message: "Brief aging may help", color: "blue" };
      return { status: "ready", message: "Ready - minimal aging benefit", color: "green" };
    }
    
    return { status: "ready", message: "Best smoked fresh", color: "green" };
  };

  const getTotalCellarWeight = () => {
    let total = 0;
    cellarBlends.forEach(b => {
      const logData = getCellarDataFromLogs(b.id);
      const tinOz = (b.tin_tins_cellared || 0) * (b.tin_size_oz || 0);
      const bulkOz = b.bulk_cellared || 0;
      const pouchOz = (b.pouch_pouches_cellared || 0) * (b.pouch_size_oz || 0);
      const logOz = logData.net;
      total += tinOz + bulkOz + pouchOz + logOz;
    });
    return total;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#E0D8C8]/60">Loading cellar data...</div>
      </div>
    );
  }

  if (cellarBlends.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Wine className="w-12 h-12 mx-auto text-[#A35C5C]/40" />
        <h3 className="text-lg font-semibold text-[#E0D8C8]">No Cellared Tobacco Yet</h3>
        <p className="text-sm text-[#E0D8C8]/70 max-w-md mx-auto">
          Start cellaring tobacco to track aging progress and get recommendations for optimal aging times.
        </p>
      </div>
    );
  }

  const totalWeight = getTotalCellarWeight();
  const avgMonths = cellarBlends.length > 0 
    ? cellarBlends.reduce((sum, b) => sum + getAgingInfo(b).months, 0) / cellarBlends.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#5a6a7a]/90 border-[#A35C5C]/30 p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-[#E0D8C8]" />
            <div>
              <div className="text-2xl font-bold text-white">{cellarBlends.length}</div>
              <div className="text-xs text-white/90 font-medium">Cellared Blends</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#5a6a7a]/90 border-[#A35C5C]/30 p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#E0D8C8]" />
            <div>
              <div className="text-2xl font-bold text-white">{totalWeight.toFixed(1)} oz</div>
              <div className="text-xs text-white/90 font-medium">Total Cellared</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#5a6a7a]/90 border-[#A35C5C]/30 p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#E0D8C8]" />
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(avgMonths)}m</div>
              <div className="text-xs text-white/90 font-medium">Avg Age</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Aging Progress List */}
      <div className="space-y-3">
        {cellarBlends
          .sort((a, b) => getAgingInfo(b).days - getAgingInfo(a).days)
          .map(blend => {
            const aging = getAgingInfo(blend);
            const recommendation = getAgingRecommendation(blend);
            const logData = getCellarDataFromLogs(blend.id);
            
            const tinOz = (blend.tin_tins_cellared || 0) * (blend.tin_size_oz || 0);
            const bulkOz = blend.bulk_cellared || 0;
            const pouchOz = (blend.pouch_pouches_cellared || 0) * (blend.pouch_size_oz || 0);
            const logOz = logData.net;
            const totalOz = tinOz + bulkOz + pouchOz + logOz;
            
            const maxMonths = blend.aging_potential === "Excellent" ? 24 : 
                             blend.aging_potential === "Good" ? 12 : 6;
            const progress = Math.min((aging.months / maxMonths) * 100, 100);
            
            return (
              <Card key={blend.id} className="bg-[#5a6a7a]/70 border-[#A35C5C]/30 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{blend.name}</h4>
                    <div className="flex flex-wrap gap-2 items-center text-xs text-white/80 font-medium">
                      <span>{totalOz.toFixed(1)} oz cellared</span>
                      {aging.oldestDate && (
                        <>
                          <span>•</span>
                          <span>Since {format(aging.oldestDate, 'MMM yyyy')}</span>
                          <span>•</span>
                          <span className="font-medium">{aging.months}m {aging.days % 30}d</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Badge 
                    className={
                      recommendation.color === "green" ? "bg-green-500/20 text-black border-green-500/30" :
                      recommendation.color === "yellow" ? "bg-yellow-500/20 text-black border-yellow-500/30" :
                      recommendation.color === "blue" ? "bg-blue-500/20 text-black border-blue-500/30" :
                      "bg-gray-500/20 text-black border-gray-500/30"
                    }
                  >
                    {recommendation.message}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/80 font-medium">
                    <span>Aging Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}