import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, Leaf, Package, Star, TrendingUp } from "lucide-react";

export default function TobaccoCollectionStats() {
  const { data: blends = [] } = useQuery({
    queryKey: ['tobacco-blends'],
    queryFn: () => base44.entities.TobaccoBlend.list(),
    initialData: [],
  });

  // Calculate statistics
  const totalBlends = blends.length;
  const uniqueBrands = [...new Set(blends.map(b => b.manufacturer).filter(Boolean))].length;
  const favorites = blends.filter(b => b.is_favorite).length;
  const totalTins = blends.reduce((sum, b) => sum + (b.quantity_owned || 0), 0);
  const totalWeight = blends.reduce((sum, b) => {
    const tins = b.quantity_owned || 0;
    const sizeOz = b.tin_size_oz || 0;
    return sum + (tins * sizeOz);
  }, 0);
  const opened = blends.filter(b => b.quantity_owned > 0 && b.cellared_amount).length;

  // Blend type breakdown
  const blendTypes = blends.reduce((acc, b) => {
    const type = b.blend_type || 'Unassigned';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const sortedBlendTypes = Object.entries(blendTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Tobacco Collection Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-700 flex items-center gap-2 mb-3">
              <Leaf className="w-4 h-4 text-emerald-600" />
              Quick Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg">
                <span className="text-stone-600">Total Blends</span>
                <span className="font-semibold text-emerald-700">{totalBlends}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg">
                <span className="text-stone-600">Unique Brands</span>
                <span className="font-semibold text-emerald-700">{uniqueBrands}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg">
                <span className="text-stone-600 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Favorites
                </span>
                <span className="font-semibold text-emerald-700">{favorites}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg">
                <span className="text-stone-600 flex items-center gap-1">
                  <Package className="w-3 h-3 text-stone-500" />
                  Total Tins
                </span>
                <span className="font-semibold text-emerald-700">{totalTins}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg">
                <span className="text-stone-600">Total Weight</span>
                <span className="font-semibold text-emerald-700">{totalWeight.toFixed(2)} oz</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg">
                <span className="text-stone-600">Opened</span>
                <span className="font-semibold text-emerald-700">{opened}</span>
              </div>
            </div>
          </div>

          {/* Blend Type Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-700 flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Blend Type Breakdown
            </h3>
            <div className="space-y-2">
              {sortedBlendTypes.map(([type, count]) => (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-600">{type}</span>
                    <span className="font-semibold text-emerald-700">{count}</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${(count / totalBlends) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}