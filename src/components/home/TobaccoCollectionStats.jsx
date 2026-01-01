import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, Leaf, Package, Star, TrendingUp, ChevronRight, AlertTriangle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TobaccoCollectionStats() {
  const [drillDown, setDrillDown] = useState(null);
  const [lowInventoryThreshold, setLowInventoryThreshold] = useState(() => {
    return parseFloat(localStorage.getItem('lowInventoryThreshold')) || 2.0;
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['tobacco-blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  // Calculate statistics
  const totalBlends = blends.length;
  const uniqueBrands = [...new Set(blends.map(b => b.manufacturer).filter(Boolean))].length;
  const favoriteBlends = blends.filter(b => b.is_favorite);
  
  // Tin statistics
  const totalTins = blends.reduce((sum, b) => sum + (b.tin_total_tins || 0), 0);
  const tinWeightOz = blends.reduce((sum, b) => sum + (b.tin_total_quantity_oz || 0), 0);
  const tinOpenOz = blends.reduce((sum, b) => {
    const open = b.tin_tins_open || 0;
    const size = b.tin_size_oz || 0;
    return sum + (open * size);
  }, 0);
  const tinCellaredOz = blends.reduce((sum, b) => {
    const cellared = b.tin_tins_cellared || 0;
    const size = b.tin_size_oz || 0;
    return sum + (cellared * size);
  }, 0);
  
  // Bulk statistics
  const bulkWeightOz = blends.reduce((sum, b) => sum + (b.bulk_total_quantity_oz || 0), 0);
  const bulkOpenOz = blends.reduce((sum, b) => sum + (b.bulk_open || 0), 0);
  const bulkCellaredOz = blends.reduce((sum, b) => sum + (b.bulk_cellared || 0), 0);
  
  // Pouch statistics
  const totalPouches = blends.reduce((sum, b) => sum + (b.pouch_total_pouches || 0), 0);
  const pouchWeightOz = blends.reduce((sum, b) => sum + (b.pouch_total_quantity_oz || 0), 0);
  const pouchOpenOz = blends.reduce((sum, b) => {
    const open = b.pouch_pouches_open || 0;
    const size = b.pouch_size_oz || 0;
    return sum + (open * size);
  }, 0);
  const pouchCellaredOz = blends.reduce((sum, b) => {
    const cellared = b.pouch_pouches_cellared || 0;
    const size = b.pouch_size_oz || 0;
    return sum + (cellared * size);
  }, 0);
  
  // Overall totals
  const totalWeight = tinWeightOz + bulkWeightOz + pouchWeightOz;
  const totalOpenOz = tinOpenOz + bulkOpenOz + pouchOpenOz;
  const totalCellaredOz = tinCellaredOz + bulkCellaredOz + pouchCellaredOz;

  // Brand breakdown
  const brandBreakdown = blends.reduce((acc, b) => {
    const brand = b.manufacturer || 'Unknown';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(b);
    return acc;
  }, {});

  // Blend type breakdown
  const blendTypes = blends.reduce((acc, b) => {
    const type = b.blend_type || 'Unassigned';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const sortedBlendTypes = Object.entries(blendTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const handleDrillDown = (type, data) => {
    setDrillDown({ type, data });
  };

  const handleThresholdSave = () => {
    localStorage.setItem('lowInventoryThreshold', lowInventoryThreshold.toString());
    setShowSettings(false);
  };

  // Check for low inventory blends
  const lowInventoryBlends = blends.filter(b => {
    const cellared = b.cellared_amount || 0;
    return cellared > 0 && cellared <= lowInventoryThreshold;
  });

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
              <button
                onClick={() => handleDrillDown('brands', brandBreakdown)}
                className="w-full flex justify-between items-center py-1.5 px-3 bg-white rounded-lg hover:bg-emerald-50 transition-colors group"
              >
                <span className="text-stone-600">Unique Brands</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-700">{uniqueBrands}</span>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600" />
                </div>
              </button>
              <button
                onClick={() => handleDrillDown('favorites', favoriteBlends)}
                className="w-full flex justify-between items-center py-1.5 px-3 bg-white rounded-lg hover:bg-emerald-50 transition-colors group"
              >
                <span className="text-stone-600 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Favorites
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-700">{favoriteBlends.length}</span>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600" />
                </div>
              </button>
              <div className="space-y-2 bg-amber-50/50 rounded-lg p-2 border border-amber-200/50">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Tins</p>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total Tins</span>
                  <span className="text-xs font-semibold text-emerald-700">{totalTins}</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total</span>
                  <span className="text-xs font-semibold text-emerald-700">{tinWeightOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Open</span>
                  <span className="text-xs font-semibold text-sky-600">{tinOpenOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Cellared</span>
                  <span className="text-xs font-semibold text-emerald-600">{tinCellaredOz.toFixed(1)} oz</span>
                </div>
              </div>
              
              <div className="space-y-2 bg-blue-50/50 rounded-lg p-2 border border-blue-200/50">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Bulk</p>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total</span>
                  <span className="text-xs font-semibold text-emerald-700">{bulkWeightOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Open</span>
                  <span className="text-xs font-semibold text-sky-600">{bulkOpenOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Cellared</span>
                  <span className="text-xs font-semibold text-emerald-600">{bulkCellaredOz.toFixed(1)} oz</span>
                </div>
              </div>
              
              <div className="space-y-2 bg-purple-50/50 rounded-lg p-2 border border-purple-200/50">
                <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Pouches</p>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total Pouches</span>
                  <span className="text-xs font-semibold text-emerald-700">{totalPouches}</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total</span>
                  <span className="text-xs font-semibold text-emerald-700">{pouchWeightOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Open</span>
                  <span className="text-xs font-semibold text-sky-600">{pouchOpenOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Cellared</span>
                  <span className="text-xs font-semibold text-emerald-600">{pouchCellaredOz.toFixed(1)} oz</span>
                </div>
              </div>
              
              <div className="space-y-2 bg-stone-50 rounded-lg p-2 border border-stone-200">
                <p className="text-xs font-semibold text-stone-800 uppercase tracking-wide">Overall</p>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total Weight</span>
                  <span className="text-xs font-bold text-emerald-700">{totalWeight.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total Open</span>
                  <span className="text-xs font-bold text-sky-600">{totalOpenOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-xs text-stone-600">Total Cellared</span>
                  <span className="text-xs font-bold text-emerald-600">{totalCellaredOz.toFixed(1)} oz</span>
                </div>
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
              {sortedBlendTypes.map(([type, count]) => {
                const typeBlends = blends.filter(b => (b.blend_type || 'Unassigned') === type);
                return (
                  <button
                    key={type}
                    onClick={() => handleDrillDown('blendType', { type, blends: typeBlends })}
                    className="w-full space-y-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-600">{type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-700">{count}</span>
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      </div>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${(count / totalBlends) * 100}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Drill-Down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drillDown?.type === 'brands' && 'Brands Breakdown'}
              {drillDown?.type === 'favorites' && 'Favorite Blends'}
              {drillDown?.type === 'opened' && 'Opened Blends'}
              {drillDown?.type === 'blendType' && `${drillDown.data.type} Blends`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {drillDown?.type === 'brands' && (
              <>
                {Object.entries(drillDown.data)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([brand, brandBlends]) => (
                    <div key={brand} className="bg-stone-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-stone-800">{brand}</h3>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {brandBlends.length} blend{brandBlends.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {brandBlends.map(blend => (
                          <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                            <div className="flex items-center justify-between p-2 bg-white rounded hover:bg-stone-100 transition-colors">
                              <span className="text-sm text-stone-700">{blend.name}</span>
                              {blend.quantity_owned > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {blend.quantity_owned} tin{blend.quantity_owned > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            )}

            {drillDown?.type === 'favorites' && (
              <>
                {drillDown.data.map(blend => (
                  <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{blend.name}</p>
                        <p className="text-sm text-stone-500 truncate">{blend.manufacturer || blend.blend_type}</p>
                      </div>
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </>
            )}

            {drillDown?.type === 'opened' && (
              <>
                {drillDown.data.map(blend => (
                  <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{blend.name}</p>
                        <p className="text-sm text-stone-500 truncate">
                          {blend.manufacturer || blend.blend_type}
                          {blend.cellared_amount && ` • ${blend.cellared_amount.toFixed(1)} oz cellared`}
                          {blend.quantity_owned > 0 && ` • ${blend.quantity_owned} tin${blend.quantity_owned > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Opened</Badge>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {drillDown?.type === 'blendType' && (
              <>
                {drillDown.data.blends.map(blend => (
                  <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{blend.name}</p>
                        <p className="text-sm text-stone-500 truncate">
                          {blend.manufacturer}
                          {blend.quantity_owned > 0 && ` • ${blend.quantity_owned} tin${blend.quantity_owned > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {drillDown?.type === 'lowInventory' && (
              <>
                {drillDown.data.map(blend => (
                  <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200">
                      <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{blend.name}</p>
                        <p className="text-sm text-amber-700">
                          {blend.cellared_amount?.toFixed(2)} oz remaining
                        </p>
                      </div>
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory Alert Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Low Inventory Threshold (oz)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={lowInventoryThreshold}
                onChange={(e) => setLowInventoryThreshold(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-stone-500">
                You'll be notified when cellared tobacco drops to or below this amount
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleThresholdSave} className="flex-1">
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}