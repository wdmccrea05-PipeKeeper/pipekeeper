import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, Leaf, Package, Star, TrendingUp, ChevronRight, AlertTriangle, Settings, ChevronDown, Sparkles } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import TrendsReport from "@/components/tobacco/TrendsReport";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function TobaccoCollectionStats() {
  const [drillDown, setDrillDown] = useState(null);
  const [lowInventoryThreshold, setLowInventoryThreshold] = useState(() => {
    return parseFloat(localStorage.getItem('lowInventoryThreshold')) || 2.0;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [showTrends, setShowTrends] = useState(false);
  
  const { user, isPro } = useCurrentUser();

  const { data: blends = [] } = useQuery({
    queryKey: ['tobacco-blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs-all', user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ['smoking-logs-all', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 500),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes-all', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  // Calculate statistics
  const totalBlends = blends.length;
  const uniqueBrands = [...new Set(blends.map(b => b.manufacturer).filter(Boolean))].length;
  const favoriteBlends = blends.filter(b => b.is_favorite);
  
  // Calculate net cellared amount from cellar logs
  const totalCellaredOz = cellarLogs.reduce((sum, log) => {
    if (log.transaction_type === 'added') {
      return sum + (log.amount_oz || 0);
    } else if (log.transaction_type === 'removed') {
      return sum - (log.amount_oz || 0);
    }
    return sum;
  }, 0);
  
  // Tin statistics
  const totalTins = blends.reduce((sum, b) => sum + (b.tin_total_tins || 0), 0);
  const tinWeightOz = blends.reduce((sum, b) => sum + (b.tin_total_quantity_oz || 0), 0);
  const tinOpenOz = blends.reduce((sum, b) => {
    const open = b.tin_tins_open || 0;
    const size = b.tin_size_oz || 0;
    return sum + (open * size);
  }, 0);
  
  // Bulk statistics
  const bulkWeightOz = blends.reduce((sum, b) => sum + (b.bulk_total_quantity_oz || 0), 0);
  const bulkOpenOz = blends.reduce((sum, b) => sum + (b.bulk_open || 0), 0);
  
  // Pouch statistics
  const totalPouches = blends.reduce((sum, b) => sum + (b.pouch_total_pouches || 0), 0);
  const pouchWeightOz = blends.reduce((sum, b) => sum + (b.pouch_total_quantity_oz || 0), 0);
  const pouchOpenOz = blends.reduce((sum, b) => {
    const open = b.pouch_pouches_open || 0;
    const size = b.pouch_size_oz || 0;
    return sum + (open * size);
  }, 0);
  
  // Overall totals
  const totalWeight = tinWeightOz + bulkWeightOz + pouchWeightOz;
  const totalOpenOz = tinOpenOz + bulkOpenOz + pouchOpenOz;

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
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CollapsibleTrigger className="flex-1">
              <CardTitle className="text-xl text-emerald-800 flex items-center gap-2 hover:opacity-70 transition-opacity">
                <BarChart3 className="w-6 h-6" />
                Tobacco Collection Stats
                <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CollapsibleTrigger>
            <Button
              size="sm"
              onClick={() => {
                if (!isPro) {
                  window.location.href = createPageUrl('Subscription');
                  return;
                }
                setShowTrends(true);
              }}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Trends {!isPro && '🔒'}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
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
                <button
                  onClick={() => handleDrillDown('tinInventory', { blends: blends.filter(b => (b.tin_total_tins || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-amber-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total Tins</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700">{totalTins}</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('tinInventory', { blends: blends.filter(b => (b.tin_total_quantity_oz || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-amber-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700">{tinWeightOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('tinOpen', { blends: blends.filter(b => (b.tin_tins_open || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-sky-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Open</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sky-600">{tinOpenOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-sky-600" />
                  </div>
                </button>

              </div>
              
              <div className="space-y-2 bg-blue-50/50 rounded-lg p-2 border border-blue-200/50">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Bulk</p>
                <button
                  onClick={() => handleDrillDown('bulkInventory', { blends: blends.filter(b => (b.bulk_total_quantity_oz || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-blue-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700">{bulkWeightOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-blue-600" />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('bulkOpen', { blends: blends.filter(b => (b.bulk_open || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-sky-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Open</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sky-600">{bulkOpenOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-sky-600" />
                  </div>
                </button>

              </div>
              
              <div className="space-y-2 bg-purple-50/50 rounded-lg p-2 border border-purple-200/50">
                <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Pouches</p>
                <button
                  onClick={() => handleDrillDown('pouchInventory', { blends: blends.filter(b => (b.pouch_total_pouches || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-purple-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total Pouches</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700">{totalPouches}</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-purple-600" />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('pouchInventory', { blends: blends.filter(b => (b.pouch_total_quantity_oz || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-purple-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700">{pouchWeightOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-purple-600" />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('pouchOpen', { blends: blends.filter(b => (b.pouch_pouches_open || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-sky-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Open</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sky-600">{pouchOpenOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-sky-600" />
                  </div>
                </button>

              </div>
              
              <div className="space-y-2 bg-stone-50 rounded-lg p-2 border border-stone-200">
                <p className="text-xs font-semibold text-stone-800 uppercase tracking-wide">Overall</p>
                <button
                  onClick={() => handleDrillDown('allInventory', { blends: blends.filter(b => 
                    (b.tin_total_quantity_oz || 0) > 0 || (b.bulk_total_quantity_oz || 0) > 0 || (b.pouch_total_quantity_oz || 0) > 0
                  )})}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-stone-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total Weight</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700">{totalWeight.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-stone-600" />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('allOpen', { blends: blends.filter(b => 
                    (b.tin_tins_open || 0) > 0 || (b.bulk_open || 0) > 0 || (b.pouch_pouches_open || 0) > 0
                  )})}
                  className="w-full flex justify-between items-center py-1 px-2 bg-white rounded hover:bg-sky-50 transition-colors group"
                >
                  <span className="text-xs text-stone-600">Total Open</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-600">{totalOpenOz.toFixed(1)} oz</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-sky-600" />
                  </div>
                </button>
                <div className="w-full flex justify-between items-center py-1 px-2 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-xs text-stone-600 font-medium">Total Cellared</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700">{totalCellaredOz.toFixed(1)} oz</span>
                  </div>
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
        </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Drill-Down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drillDown?.type === 'brands' && 'Brands Breakdown'}
              {drillDown?.type === 'favorites' && 'Favorite Blends'}
              {drillDown?.type === 'opened' && 'Opened Blends'}
              {drillDown?.type === 'blendType' && `${drillDown.data.type} Blends`}
              {drillDown?.type === 'tinInventory' && 'Tin Inventory'}
              {drillDown?.type === 'tinOpen' && 'Opened Tins'}
              {drillDown?.type === 'tinCellared' && 'Cellared Tins'}
              {drillDown?.type === 'bulkInventory' && 'Bulk Inventory'}
              {drillDown?.type === 'bulkOpen' && 'Opened Bulk'}
              {drillDown?.type === 'bulkCellared' && 'Cellared Bulk'}
              {drillDown?.type === 'pouchInventory' && 'Pouch Inventory'}
              {drillDown?.type === 'pouchOpen' && 'Opened Pouches'}
              {drillDown?.type === 'pouchCellared' && 'Cellared Pouches'}
              {drillDown?.type === 'allInventory' && 'All Inventory'}
              {drillDown?.type === 'allOpen' && 'All Opened Tobacco'}
              {drillDown?.type === 'allCellared' && 'All Cellared Tobacco'}
              {drillDown?.type === 'lowInventory' && 'Low Inventory Alert'}
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
                         <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                            <div className="flex items-center justify-between p-2 bg-white rounded hover:bg-stone-100 transition-colors">
                              <span className="text-sm text-stone-700">{blend.name}</span>
                              {blend.quantity_owned > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {blend.quantity_owned} tin{blend.quantity_owned > 1 ? 's' : ''}
                                </Badge>
                                )}
                              </div>
                            </a>
                          ))}
                      </div>
                    </div>
                  ))}
              </>
            )}

            {drillDown?.type === 'favorites' && (
              <>
                {drillDown.data.map(blend => (
                  <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
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
                  </a>
                ))}
              </>
            )}

            {drillDown?.type === 'opened' && (
              <>
                {drillDown.data.map(blend => (
                  <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
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
                  </a>
                ))}
              </>
            )}

            {drillDown?.type === 'blendType' && (
              <>
                {drillDown.data.blends.map(blend => (
                  <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
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
                  </a>
                ))}
              </>
            )}

            {(drillDown?.type === 'tinInventory' || drillDown?.type === 'tinOpen' || drillDown?.type === 'tinCellared' ||
              drillDown?.type === 'bulkInventory' || drillDown?.type === 'bulkOpen' || drillDown?.type === 'bulkCellared' ||
              drillDown?.type === 'pouchInventory' || drillDown?.type === 'pouchOpen' || drillDown?.type === 'pouchCellared' ||
              drillDown?.type === 'allInventory' || drillDown?.type === 'allOpen' || drillDown?.type === 'allCellared') && (
              <>
                {drillDown.data.blends.map(blend => {
                  let quantityText = '';
                  if (drillDown.type.startsWith('tin')) {
                    const tins = blend.tin_total_tins || 0;
                    const oz = blend.tin_total_quantity_oz || 0;
                    const open = (blend.tin_tins_open || 0) * (blend.tin_size_oz || 0);
                    const cellared = (blend.tin_tins_cellared || 0) * (blend.tin_size_oz || 0);
                    quantityText = drillDown.type === 'tinOpen' ? `${open.toFixed(2)} oz open` :
                                   drillDown.type === 'tinCellared' ? `${cellared.toFixed(2)} oz cellared` :
                                   `${tins} tin${tins > 1 ? 's' : ''} • ${oz.toFixed(2)} oz`;
                  } else if (drillDown.type.startsWith('bulk')) {
                    const total = blend.bulk_total_quantity_oz || 0;
                    const open = blend.bulk_open || 0;
                    const cellared = blend.bulk_cellared || 0;
                    quantityText = drillDown.type === 'bulkOpen' ? `${open.toFixed(2)} oz open` :
                                   drillDown.type === 'bulkCellared' ? `${cellared.toFixed(2)} oz cellared` :
                                   `${total.toFixed(2)} oz bulk`;
                  } else if (drillDown.type.startsWith('pouch')) {
                    const pouches = blend.pouch_total_pouches || 0;
                    const oz = blend.pouch_total_quantity_oz || 0;
                    const open = (blend.pouch_pouches_open || 0) * (blend.pouch_size_oz || 0);
                    const cellared = (blend.pouch_pouches_cellared || 0) * (blend.pouch_size_oz || 0);
                    quantityText = drillDown.type === 'pouchOpen' ? `${open.toFixed(2)} oz open` :
                                   drillDown.type === 'pouchCellared' ? `${cellared.toFixed(2)} oz cellared` :
                                   `${pouches} pouch${pouches > 1 ? 'es' : ''} • ${oz.toFixed(2)} oz`;
                  } else {
                    const tinOz = blend.tin_total_quantity_oz || 0;
                    const bulkOz = blend.bulk_total_quantity_oz || 0;
                    const pouchOz = blend.pouch_total_quantity_oz || 0;
                    const total = tinOz + bulkOz + pouchOz;
                    quantityText = `${total.toFixed(2)} oz total`;
                  }
                  
                  return (
                    <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
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
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 flex-shrink-0">
                          {quantityText}
                        </Badge>
                      </div>
                    </a>
                  );
                })}
              </>
            )}

            {drillDown?.type === 'lowInventory' && (
              <>
                {drillDown.data.map(blend => (
                  <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
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
                  </a>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trends Dialog */}
      <Dialog open={showTrends} onOpenChange={setShowTrends}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Trends Report</DialogTitle>
          </DialogHeader>
          <TrendsReport
            logs={smokingLogs}
            pipes={pipes}
            blends={blends}
            user={user}
          />
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
    </>
  );
}