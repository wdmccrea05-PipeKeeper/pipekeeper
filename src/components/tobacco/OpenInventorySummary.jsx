import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function OpenInventorySummary({ blend }) {
  const { t } = useTranslation();
  const tinOpen = blend.tin_tins_open || 0;
  const tinSize = blend.tin_size_oz || 0;
  const bulkOpen = blend.bulk_open || 0;
  const pouchOpen = blend.pouch_pouches_open || 0;
  const pouchSize = blend.pouch_size_oz || 0;

  const tinOpenOz = (tinOpen * tinSize).toFixed(2);
  const pouchOpenOz = (pouchOpen * pouchSize).toFixed(2);
  
  const totalOpenOz = parseFloat(tinOpenOz) + parseFloat(bulkOpen || 0) + parseFloat(pouchOpenOz);

  const hasOpenInventory = tinOpen > 0 || bulkOpen > 0 || pouchOpen > 0;

  if (!hasOpenInventory) {
    return (
      <div className="text-center py-8 bg-white rounded-lg p-4">
        <Package className="w-12 h-12 mx-auto mb-3 text-[#1a2c42]/40" />
        <p className="text-sm font-semibold text-[#1a2c42]">{t("tobaccoExtended.noOpenTobaccoYet")}</p>
        <p className="text-xs mt-1 text-[#1a2c42]/80">{t("tobaccoExtended.updateInventoryTab")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white rounded-lg p-4">
      {/* Summary Card */}
      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-amber-700" />
          <h3 className="font-semibold text-amber-900">{t("inventory.totalOpen")}</h3>
        </div>
        <p className="text-3xl font-bold text-amber-900">{totalOpenOz.toFixed(2)} oz</p>
        <p className="text-sm text-amber-700 mt-1">{t("inventory.readyToSmoke")}</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#1a2c42] uppercase tracking-wide mb-3">{t("inventory.openInventory")}</p>
        
        {tinOpen > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[#1a2c42]/20">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Tins
                </Badge>
                <span className="text-sm font-medium text-[#1a2c42]">
                  {tinOpen} {tinOpen === 1 ? 'tin' : 'tins'} open
                </span>
              </div>
              {tinSize > 0 && (
                <p className="text-xs text-[#1a2c42]/70 mt-1">
                  {tinSize} oz per tin
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#1a2c42]">{tinOpenOz} oz</p>
              <p className="text-xs text-[#1a2c42]/60">{(tinOpenOz * 28.35).toFixed(2)}g</p>
            </div>
          </div>
        )}

        {bulkOpen > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[#1a2c42]/20">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Bulk
                </Badge>
                <span className="text-sm font-medium text-[#1a2c42]">Open quantity</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#1a2c42]">{parseFloat(bulkOpen).toFixed(2)} oz</p>
              <p className="text-xs text-[#1a2c42]/60">{(bulkOpen * 28.35).toFixed(2)}g</p>
            </div>
          </div>
        )}

        {pouchOpen > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[#1a2c42]/20">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Pouches
                </Badge>
                <span className="text-sm font-medium text-[#1a2c42]">
                  {pouchOpen} {pouchOpen === 1 ? 'pouch' : 'pouches'} open
                </span>
              </div>
              {pouchSize > 0 && (
                <p className="text-xs text-[#1a2c42]/70 mt-1">
                  {pouchSize} oz per pouch
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#1a2c42]">{pouchOpenOz} oz</p>
              <p className="text-xs text-[#1a2c42]/60">{(pouchOpenOz * 28.35).toFixed(2)}g</p>
            </div>
          </div>
        )}
      </div>

      {/* Note about automatic reductions */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>{t("common.note")}:</strong> {t("inventory.autoDeductNote")}
        </p>
      </div>
    </div>
  );
}