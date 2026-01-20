import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Package } from "lucide-react";

export default function CellarAgingSummary() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  // Calculate aging data
  const cellarData = blends.reduce((acc, blend) => {
    const tinCellared = blend.tin_tins_cellared || 0;
    const tinDate = blend.tin_cellared_date;
    const bulkCellared = blend.bulk_cellared || 0;
    const bulkDate = blend.bulk_cellared_date;
    const pouchCellared = blend.pouch_pouches_cellared || 0;
    const pouchDate = blend.pouch_cellared_date;

    const totalCellared = (tinCellared * (blend.tin_size_oz || 0)) + bulkCellared + (pouchCellared * (blend.pouch_size_oz || 0));

    if (totalCellared > 0) {
      const earliestDate = [tinDate, bulkDate, pouchDate]
        .filter(d => d)
        .sort()[0];

      acc.items.push({
        blend: blend.name,
        amount: totalCellared,
        date: earliestDate,
        agingPotential: blend.aging_potential,
        blendType: blend.blend_type,
      });

      acc.totalOz += totalCellared;
    }

    return acc;
  }, { items: [], totalOz: 0 });

  // Calculate aging time for each blend
  const now = new Date();
  const agingBlends = cellarData.items.map(item => {
    if (!item.date) return { ...item, monthsAged: 0 };
    
    const cellarDate = new Date(item.date);
    const monthsAged = Math.floor((now - cellarDate) / (1000 * 60 * 60 * 24 * 30));
    
    return { ...item, monthsAged };
  }).sort((a, b) => b.monthsAged - a.monthsAged);

  // Calculate statistics
  const excellentAgers = agingBlends.filter(b => b.agingPotential === 'Excellent').length;
  const avgAge = agingBlends.length > 0
    ? Math.floor(agingBlends.reduce((sum, b) => sum + b.monthsAged, 0) / agingBlends.length)
    : 0;

  if (cellarData.totalOz === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No cellared tobacco yet</p>
        <p className="text-xs mt-1">Mark tobacco as cellared to see aging progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto mb-1 text-amber-700" />
            <p className="text-2xl font-bold text-amber-900">{cellarData.totalOz.toFixed(1)}</p>
            <p className="text-xs text-amber-700">oz cellared</p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-700" />
            <p className="text-2xl font-bold text-blue-900">{avgAge}</p>
            <p className="text-xs text-blue-700">avg months</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-700" />
            <p className="text-2xl font-bold text-green-900">{excellentAgers}</p>
            <p className="text-xs text-green-700">excellent agers</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Blends List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <p className="text-sm font-medium text-stone-700 mb-2">Aging Progress</p>
        {agingBlends.map((item, idx) => (
          <Card key={idx} className="border-stone-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{item.blend}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.blendType && (
                      <Badge variant="secondary" className="text-xs">
                        {item.blendType}
                      </Badge>
                    )}
                    {item.agingPotential && (
                      <Badge 
                        className={`text-xs ${
                          item.agingPotential === 'Excellent' ? 'bg-green-100 text-green-800' :
                          item.agingPotential === 'Good' ? 'bg-blue-100 text-blue-800' :
                          item.agingPotential === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {item.agingPotential} aging
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-amber-900">{item.monthsAged}</p>
                  <p className="text-xs text-stone-600">months</p>
                  <p className="text-xs text-stone-500 mt-1">{item.amount.toFixed(1)} oz</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-stone-500 text-center pt-2 border-t border-stone-200">
        Aging times calculated from cellaring date
      </div>
    </div>
  );
}