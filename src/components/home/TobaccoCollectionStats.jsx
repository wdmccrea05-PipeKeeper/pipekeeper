import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { scopedEntities } from "@/components/api/scopedEntities";
import { BarChart3, Leaf, Star, TrendingUp, ChevronRight, AlertTriangle, ChevronDown } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCellaredOzFromLogs, calculateCellaredOzFromBlend } from "@/components/utils/tobaccoQuantityHelpers";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatWeight } from "@/components/utils/localeFormatters";

export default function TobaccoCollectionStats({ user: userProp }) {
  const { t } = useTranslation();
  const [drillDown, setDrillDown] = useState(null);
  const [lowInventoryThreshold, setLowInventoryThreshold] = useState(() => {
    return parseFloat(localStorage.getItem('lowInventoryThreshold')) || 2.0;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  const { user: currentUser } = useCurrentUser();
  const user = userProp || currentUser;

  const { data: blends = [] } = useQuery({
    queryKey: ['tobacco-blends', user?.email],
    queryFn: () => scopedEntities.TobaccoBlend.listForUser(user?.email),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs-all', user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });



  // Calculate statistics (safe from null/undefined)
  const totalBlends = (blends || []).length;
  const uniqueBrands = [...new Set((blends || []).map(b => b?.manufacturer).filter(Boolean))].length;
  const favoriteBlends = (blends || []).filter(b => b?.is_favorite);
  
  // Use canonical quantity helpers (SOURCE OF TRUTH)
  const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);
  
  // Tin statistics
  const totalTins = (blends || []).reduce((sum, b) => sum + (Number(b?.tin_total_tins) || 0), 0);
  const tinWeightOz = (blends || []).reduce((sum, b) => sum + (Number(b?.tin_total_quantity_oz) || 0), 0);
  const tinOpenOz = (blends || []).reduce((sum, b) => {
    const open = Number(b?.tin_tins_open) || 0;
    const size = Number(b?.tin_size_oz) || 0;
    return sum + (open * size);
  }, 0);

  // Bulk statistics
  const bulkWeightOz = (blends || []).reduce((sum, b) => sum + (Number(b?.bulk_total_quantity_oz) || 0), 0);
  const bulkOpenOz = (blends || []).reduce((sum, b) => sum + (Number(b?.bulk_open) || 0), 0);

  // Pouch statistics
  const totalPouches = (blends || []).reduce((sum, b) => sum + (Number(b?.pouch_total_pouches) || 0), 0);
  const pouchWeightOz = (blends || []).reduce((sum, b) => sum + (Number(b?.pouch_total_quantity_oz) || 0), 0);
  const pouchOpenOz = (blends || []).reduce((sum, b) => {
    const open = Number(b?.pouch_pouches_open) || 0;
    const size = Number(b?.pouch_size_oz) || 0;
    return sum + (open * size);
  }, 0);
  
  // Overall totals (from entity fields)
  const totalWeight = tinWeightOz + bulkWeightOz + pouchWeightOz;
  const totalOpenOz = tinOpenOz + bulkOpenOz + pouchOpenOz;

  // Brand breakdown (safe from null/undefined)
  const brandBreakdown = (blends || []).reduce((acc, b) => {
    if (!b) return acc;
    const brand = b.manufacturer || 'Unknown';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(b);
    return acc;
  }, {});

  // Blend type breakdown
  const blendTypes = (blends || []).reduce((acc, b) => {
    if (!b) return acc;
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
    const cellared = calculateCellaredOzFromBlend(b);
    return cellared > 0 && cellared <= lowInventoryThreshold;
  });

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card style={{
          background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
          border: "1px solid rgba(140,105,65,0.35)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
        }}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
              <BarChart3 className="w-6 h-6" style={{ color: "rgba(180,140,75,0.9)" }} />
              {t("stats.tobaccoCollectionStats")}
              <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: "rgba(180,140,75,0.6)" }} />
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 mb-3" style={{ color: "#F5F1E7" }}>
              <Leaf className="w-4 h-4" style={{ color: "rgba(90,124,90,0.8)" }} />
              {t("stats.quickStats")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 px-3 rounded-lg" style={{
                background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                border: "1px solid rgba(140,105,65,0.2)",
                color: "#E0D8C8"
              }}>
                <span style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.totalBlends")}</span>
                <span className="font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{totalBlends}</span>
              </div>
              <button
                onClick={() => handleDrillDown('brands', brandBreakdown)}
                className="w-full flex justify-between items-center py-1.5 px-3 rounded-lg transition-colors group"
                style={{
                  background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                  border: "1px solid rgba(140,105,65,0.2)",
                  color: "#E0D8C8"
                }}
              >
                <span style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.uniqueBrands")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{uniqueBrands}</span>
                  <ChevronRight className="w-4 h-4" style={{ color: "rgba(180,140,75,0.6)" }} />
                </div>
              </button>
              <button
                onClick={() => handleDrillDown('favorites', favoriteBlends)}
                className="w-full flex justify-between items-center py-1.5 px-3 rounded-lg transition-colors group"
                style={{
                  background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                  border: "1px solid rgba(140,105,65,0.2)",
                  color: "#E0D8C8"
                }}
              >
                <span style={{ color: "rgba(224,216,200,0.7)" }} className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {t("stats.favorites")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{favoriteBlends.length}</span>
                  <ChevronRight className="w-4 h-4" style={{ color: "rgba(180,140,75,0.6)" }} />
                </div>
              </button>
              <div className="space-y-2 rounded-lg p-2" style={{
                background: "rgba(180,140,75,0.1)",
                border: "1px solid rgba(180,140,75,0.25)"
              }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(180,140,75,0.9)" }}>{t("stats.tins")}</p>
                <button
                  onClick={() => handleDrillDown('tinInventory', { blends: blends.filter(b => (b.tin_total_tins || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                 style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.totalTins")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{totalTins}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('tinInventory', { blends: blends.filter(b => (b.tin_total_quantity_oz || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.total")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(tinWeightOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('tinOpen', { blends: blends.filter(b => (b.tin_tins_open || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.open")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(tinOpenOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>

              </div>
              
              <div className="space-y-2 rounded-lg p-2" style={{
                  background: "rgba(120, 100, 80, 0.1)",
                  border: "1px solid rgba(140, 115, 90, 0.25)"
                }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(160, 135, 110, 0.9)" }}>{t("stats.bulk")}</p>
                <button
                  onClick={() => handleDrillDown('bulkInventory', { blends: blends.filter(b => (b.bulk_total_quantity_oz || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.total")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(bulkWeightOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('bulkOpen', { blends: blends.filter(b => (b.bulk_open || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.open")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(bulkOpenOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>

              </div>
              
              <div className="space-y-2 rounded-lg p-2" style={{
                background: "rgba(100, 80, 120, 0.1)",
                border: "1px solid rgba(130, 100, 150, 0.25)"
              }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(160, 130, 180, 0.9)" }}>{t("stats.pouches")}</p>
                <button
                  onClick={() => handleDrillDown('pouchInventory', { blends: blends.filter(b => (b.pouch_total_pouches || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.totalPouches")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{totalPouches}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('pouchInventory', { blends: blends.filter(b => (b.pouch_total_quantity_oz || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.total")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(pouchWeightOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('pouchOpen', { blends: blends.filter(b => (b.pouch_pouches_open || 0) > 0) })}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.open")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(pouchOpenOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>

              </div>
              
              <div className="space-y-2 rounded-lg p-2" style={{
                background: "rgba(120, 100, 80, 0.1)",
                border: "1px solid rgba(140, 115, 90, 0.25)"
              }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(160, 135, 110, 0.9)" }}>{t("stats.overall")}</p>
                <button
                  onClick={() => handleDrillDown('allInventory', { blends: blends.filter(b => 
                    (b.tin_total_quantity_oz || 0) > 0 || (b.bulk_total_quantity_oz || 0) > 0 || (b.pouch_total_quantity_oz || 0) > 0
                  )})}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.totalWeight")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(totalWeight, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <button
                  onClick={() => handleDrillDown('allOpen', { blends: blends.filter(b => 
                    (b.tin_tins_open || 0) > 0 || (b.bulk_open || 0) > 0 || (b.pouch_pouches_open || 0) > 0
                  )})}
                  className="w-full flex justify-between items-center py-1 px-2 rounded transition-colors group"
                  style={{ background: "rgba(50,40,30,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>{t("stats.totalOpen")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(totalOpenOz, 'oz')}</span>
                    <ChevronRight className="w-3 h-3" style={{ color: "rgba(140,105,65,0.6)" }} />
                  </div>
                </button>
                <div className="w-full flex justify-between items-center py-1 px-2 rounded" style={{
                  background: "rgba(140,105,65,0.15)",
                  border: "1px solid rgba(140,105,65,0.3)"
                }}>
                  <span className="text-xs font-medium" style={{ color: "rgba(224,216,200,0.8)" }}>{t("stats.totalCellared")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: "rgba(180,140,75,0.9)" }}>{formatWeight(totalCellaredOz, 'oz')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Blend Type Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 mb-3" style={{ color: "#F5F1E7" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "rgba(180,140,75,0.8)" }} />
              {t("stats.blendTypeBreakdown")}
            </h3>
            {lowInventoryBlends.length > 0 && (
              <button
                onClick={() => handleDrillDown('lowInventory', lowInventoryBlends)}
                className="w-full flex justify-between items-center py-2 px-3 rounded-lg transition-colors"
             style={{ background: "rgba(120,80,30,0.25)", border: "1px solid rgba(180,130,50,0.35)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "rgba(220,170,80,0.9)" }}>⚠ {t("stats.lowInventoryAlert")} ({lowInventoryBlends.length} {lowInventoryBlends.length > 1 ? t("stats.blends") : t("stats.blend")})</span>
                <ChevronRight className="w-4 h-4" style={{ color: "rgba(180,140,75,0.7)" }} />
              </button>
            )}
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
                      <span style={{ color: "rgba(224,216,200,0.8)" }}>{type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: "rgba(180,140,75,0.9)" }}>{count}</span>
                        <ChevronRight className="w-4 h-4" style={{ color: "rgba(140,105,65,0.5)" }} />
                      </div>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ background: "rgba(60,45,30,0.5)" }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${(count / totalBlends) * 100}%`, background: "linear-gradient(to right, rgba(140,105,65,0.7), rgba(180,140,75,0.9))" }}
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
              {drillDown?.type === 'brands' && t("stats.brandsBreakdown")}
              {drillDown?.type === 'favorites' && t("stats.favoriteBlends")}
              {drillDown?.type === 'opened' && t("stats.openedBlends")}
              {drillDown?.type === 'blendType' && `${drillDown.data.type} ${t("common.tobacco.title")}`}
              {drillDown?.type === 'tinInventory' && t("stats.tinInventory")}
              {drillDown?.type === 'tinOpen' && t("stats.openedTins")}
              {drillDown?.type === 'tinCellared' && t("stats.cellaredTins")}
              {drillDown?.type === 'bulkInventory' && t("stats.bulkInventory")}
              {drillDown?.type === 'bulkOpen' && t("stats.openedBulk")}
              {drillDown?.type === 'bulkCellared' && t("stats.cellaredBulk")}
              {drillDown?.type === 'pouchInventory' && t("stats.pouchInventory")}
              {drillDown?.type === 'pouchOpen' && t("stats.openedPouches")}
              {drillDown?.type === 'pouchCellared' && t("stats.cellaredPouches")}
              {drillDown?.type === 'allInventory' && t("stats.allInventory")}
              {drillDown?.type === 'allOpen' && t("stats.allOpenedTobacco")}
              {drillDown?.type === 'allCellared' && t("stats.allCellaredTobacco")}
              {drillDown?.type === 'lowInventory' && t("stats.lowInventoryAlert")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {drillDown?.type === 'brands' && (
              <>
                {Object.entries(drillDown.data)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([brand, brandBlends]) => (
                    <div key={brand} className="rounded-lg p-4" style={{
                      background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                      border: "1px solid rgba(140,105,65,0.2)"
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold" style={{ color: "#E0D8C8" }}>{brand}</h3>
                        <Badge style={{ background: "rgba(140,105,65,0.3)", color: "#E0D8C8", borderColor: "rgba(140,105,65,0.5)" }}>
                          {brandBlends.length} {brandBlends.length > 1 ? t("stats.blends") : t("stats.blend")}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {brandBlends.map(blend => (
                         <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                            <div className="flex items-center justify-between p-2 rounded transition-colors" style={{
                              background: "rgba(40,30,20,0.5)",
                              border: "1px solid rgba(140,105,65,0.15)"
                            }}>
                                 <span className="text-sm" style={{ color: "rgba(224,216,200,0.85)" }}>{blend.name}</span>
                              {blend.quantity_owned > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {blend.quantity_owned} {blend.quantity_owned > 1 ? t("units.tinPlural") : t("units.tin")}
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
                    <div className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{
                      background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                      border: "1px solid rgba(140,105,65,0.2)"
                    }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{
                        background: "linear-gradient(135deg, rgba(60,50,35,0.5), rgba(50,38,25,0.7))"
                      }}>
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6" style={{ color: "rgba(140,105,65,0.7)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: "#E0D8C8" }}>{blend.name}</p>
                        <p className="text-sm truncate" style={{ color: "rgba(224,216,200,0.6)" }}>{blend.manufacturer || blend.blend_type}</p>
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
                    <div className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{
                      background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                      border: "1px solid rgba(140,105,65,0.2)"
                    }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{
                        background: "linear-gradient(135deg, rgba(60,50,35,0.5), rgba(50,38,25,0.7))"
                      }}>
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6" style={{ color: "rgba(140,105,65,0.7)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: "#E0D8C8" }}>{blend.name}</p>
                        <p className="text-sm truncate" style={{ color: "rgba(224,216,200,0.6)" }}>
                          {blend.manufacturer || blend.blend_type}
                          {blend.cellared_amount && ` • ${formatWeight(blend.cellared_amount, 'oz')} cellared`}
                          {blend.quantity_owned > 0 && ` • ${blend.quantity_owned} tin${blend.quantity_owned > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <Badge style={{ background: "rgba(140,105,65,0.3)", color: "#E0D8C8", borderColor: "rgba(140,105,65,0.4)" }}>{t("stats.opened")}</Badge>
                    </div>
                  </a>
                ))}
              </>
            )}

            {drillDown?.type === 'blendType' && (
              <>
                {drillDown.data.blends.map(blend => (
                <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                  <div className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{
                    background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                    border: "1px solid rgba(140,105,65,0.2)"
                  }}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{
                      background: "linear-gradient(135deg, rgba(60,50,35,0.5), rgba(50,38,25,0.7))"
                    }}>
                      {blend.logo || blend.photo ? (
                        <img 
                          src={blend.logo || blend.photo} 
                          alt="" 
                          className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                        />
                      ) : (
                        <Leaf className="w-6 h-6" style={{ color: "rgba(140,105,65,0.7)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: "#E0D8C8" }}>{blend.name}</p>
                      <p className="text-sm truncate" style={{ color: "rgba(224,216,200,0.6)" }}>
                        {blend.manufacturer}
                        {blend.quantity_owned > 0 && ` • ${blend.quantity_owned} ${blend.quantity_owned > 1 ? t("units.tinPlural") : t("units.tin")}`}
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
                    quantityText = drillDown.type === 'tinOpen' ? `${formatWeight(open, 'oz')} ${t("stats.ozOpen")}` :
                                   drillDown.type === 'tinCellared' ? `${formatWeight(cellared, 'oz')} ${t("stats.ozCellared")}` :
                                   `${tins} ${tins > 1 ? t("units.tinPlural") : t("units.tin")} • ${formatWeight(oz, 'oz')}`;
                  } else if (drillDown.type.startsWith('bulk')) {
                    const total = blend.bulk_total_quantity_oz || 0;
                    const open = blend.bulk_open || 0;
                    const cellared = blend.bulk_cellared || 0;
                    quantityText = drillDown.type === 'bulkOpen' ? `${formatWeight(open, 'oz')} ${t("stats.ozOpen")}` :
                                   drillDown.type === 'bulkCellared' ? `${formatWeight(cellared, 'oz')} ${t("stats.ozCellared")}` :
                                   `${formatWeight(total, 'oz')} ${t("stats.ozBulk")}`;
                  } else if (drillDown.type.startsWith('pouch')) {
                    const pouches = blend.pouch_total_pouches || 0;
                    const oz = blend.pouch_total_quantity_oz || 0;
                    const open = (blend.pouch_pouches_open || 0) * (blend.pouch_size_oz || 0);
                    const cellared = (blend.pouch_pouches_cellared || 0) * (blend.pouch_size_oz || 0);
                    quantityText = drillDown.type === 'pouchOpen' ? `${formatWeight(open, 'oz')} ${t("stats.ozOpen")}` :
                                   drillDown.type === 'pouchCellared' ? `${formatWeight(cellared, 'oz')} ${t("stats.ozCellared")}` :
                                   `${pouches} ${pouches > 1 ? t("units.pouchPlural") : t("units.pouch")} • ${formatWeight(oz, 'oz')}`;
                  } else {
                    const tinOz = blend.tin_total_quantity_oz || 0;
                    const bulkOz = blend.bulk_total_quantity_oz || 0;
                    const pouchOz = blend.pouch_total_quantity_oz || 0;
                    const total = tinOz + bulkOz + pouchOz;
                    quantityText = `${formatWeight(total, 'oz')} ${t("stats.ozTotal")}`;
                  }
                  
                  return (
                    <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                      <div className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(50,40,30,0.4), rgba(40,30,20,0.6))",
                        border: "1px solid rgba(140,105,65,0.2)"
                      }}>
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{
                          background: "linear-gradient(135deg, rgba(60,50,35,0.5), rgba(50,38,25,0.7))"
                        }}>
                          {blend.logo || blend.photo ? (
                            <img 
                              src={blend.logo || blend.photo} 
                              alt="" 
                              className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                            />
                          ) : (
                            <Leaf className="w-6 h-6" style={{ color: "rgba(140,105,65,0.7)" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: "#E0D8C8" }}>{blend.name}</p>
                          <p className="text-sm truncate" style={{ color: "rgba(224,216,200,0.6)" }}>
                            {blend.manufacturer}
                          </p>
                        </div>
                        <Badge style={{ background: "rgba(140,105,65,0.3)", color: "#E0D8C8", borderColor: "rgba(140,105,65,0.4)" }} className="flex-shrink-0">
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
                    <div className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{
                      background: "rgba(120,80,30,0.2)",
                      border: "1px solid rgba(180,130,50,0.3)"
                    }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{
                        background: "linear-gradient(135deg, rgba(60,50,35,0.5), rgba(50,38,25,0.7))"
                      }}>
                        {blend.logo || blend.photo ? (
                          <img 
                            src={blend.logo || blend.photo} 
                            alt="" 
                            className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                          />
                        ) : (
                          <Leaf className="w-6 h-6" style={{ color: "rgba(140,105,65,0.7)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: "#E0D8C8" }}>{blend.name}</p>
                        <p className="text-sm" style={{ color: "rgba(220,170,80,0.8)" }}>
                          {formatWeight(calculateCellaredOzFromBlend(blend), 'oz')} {t("stats.ozRemaining")}
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stats.inventoryAlertSettings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("stats.lowInventoryThreshold")}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={lowInventoryThreshold}
                onChange={(e) => setLowInventoryThreshold(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-stone-500">
                {t("stats.notifyWhenDrops")}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                {t("forms.cancel")}
              </Button>
              <Button onClick={handleThresholdSave} className="flex-1">
                {t("stats.saveSettings")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}