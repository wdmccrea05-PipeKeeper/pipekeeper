import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatWeight, formatNumber } from "@/components/utils/localeFormatters";

const panel = "rounded-xl border border-[rgba(154,118,76,0.18)] bg-[linear-gradient(180deg,rgba(59,41,29,0.94),rgba(29,21,15,0.98))] text-[#F3E8D4] shadow-[0_10px_24px_rgba(0,0,0,0.28)]";

export default function OpenInventorySummary({ blend }) {
  const { t } = useTranslation();
  const tinOpen = blend.tin_tins_open || 0;
  const tinSize = blend.tin_size_oz || 0;
  const bulkOpen = blend.bulk_open || 0;
  const pouchOpen = blend.pouch_pouches_open || 0;
  const pouchSize = blend.pouch_size_oz || 0;

  const tinOpenOz = tinOpen * tinSize;
  const pouchOpenOz = pouchOpen * pouchSize;
  const totalOpenOz = tinOpenOz + parseFloat(bulkOpen || 0) + pouchOpenOz;
  const hasOpenInventory = tinOpen > 0 || bulkOpen > 0 || pouchOpen > 0;

  if (!hasOpenInventory) {
    return (
      <div className={`${panel} text-center py-8 p-4`}>
        <Package className="w-12 h-12 mx-auto mb-3 text-[#CFA86A]/55" />
        <p className="text-sm font-semibold text-[#F3E8D4]">{t("tobaccoExtended.noOpenTobaccoYet")}</p>
        <p className="text-xs mt-1 text-[#D7C4A7]/72">{t("tobaccoExtended.updateInventoryTab")}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-4 ${panel}`}>
      <div className="p-4 rounded-xl border border-[#8B6B45]/30 bg-[radial-gradient(circle_at_top_left,rgba(207,168,106,0.18),transparent_42%),linear-gradient(180deg,rgba(64,45,31,0.94),rgba(34,24,17,0.98))]">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-[#CFA86A]" />
          <h3 className="font-semibold text-[#F3E8D4]">{t("inventory.totalOpen")}</h3>
        </div>
        <p className="text-3xl font-bold text-[#F3E8D4]">{formatWeight(totalOpenOz)}</p>
        <p className="text-sm text-[#D7C4A7]/78 mt-1">{t("inventory.readyToSmoke")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#CFA86A] uppercase tracking-wide mb-3">{t("inventory.openInventory")}</p>

        {tinOpen > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#8B6B45]/25 bg-[rgba(255,255,255,0.03)]">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#4B3929] text-[#E6D2B2] border-[#8B6B45]/40">{t("units.tinPlural", "Tins")}</Badge>
                <span className="text-sm font-medium text-[#F3E8D4]">
                  {tinOpen} {tinOpen === 1 ? t("units.tin", "tin") : t("units.tinPlural", "tins")} {t("common.open", "open")}
                </span>
              </div>
              {tinSize > 0 && <p className="text-xs text-[#D7C4A7]/70 mt-1">{formatWeight(tinSize)} {t("inventory.perTin", "per tin")}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#F3E8D4]">{formatWeight(tinOpenOz)}</p>
              <p className="text-xs text-[#D7C4A7]/60">{formatNumber(tinOpenOz * 28.35, 2)}g</p>
            </div>
          </div>
        )}

        {bulkOpen > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#8B6B45]/25 bg-[rgba(255,255,255,0.03)]">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#324233] text-[#DCE6C5] border-[#5F7A58]/40">{t("units.bulkLabel", "Bulk")}</Badge>
                <span className="text-sm font-medium text-[#F3E8D4]">{t("inventory.openQuantity", "Open quantity")}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#F3E8D4]">{formatWeight(parseFloat(bulkOpen))}</p>
              <p className="text-xs text-[#D7C4A7]/60">{formatNumber(bulkOpen * 28.35, 2)}g</p>
            </div>
          </div>
        )}

        {pouchOpen > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#8B6B45]/25 bg-[rgba(255,255,255,0.03)]">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#3B342D] text-[#E6D2B2] border-[#8B6B45]/40">{t("units.pouchesLabel", "Pouches")}</Badge>
                <span className="text-sm font-medium text-[#F3E8D4]">
                  {pouchOpen} {pouchOpen === 1 ? t("units.pouch", "pouch") : t("units.pouchesLabel", "pouches")} {t("common.open", "open")}
                </span>
              </div>
              {pouchSize > 0 && <p className="text-xs text-[#D7C4A7]/70 mt-1">{formatWeight(pouchSize)} {t("inventory.perPouch", "per pouch")}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#F3E8D4]">{formatWeight(pouchOpenOz)}</p>
              <p className="text-xs text-[#D7C4A7]/60">{formatNumber(pouchOpenOz * 28.35, 2)}g</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl border border-[#8B6B45]/25 bg-[rgba(255,255,255,0.035)]">
        <AlertCircle className="w-4 h-4 text-[#CFA86A] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#D7C4A7]/82">
          <strong>{t("common.note", "Note")}:</strong> {t("inventory.autoDeductNote", "Smoking sessions automatically deduct from your open inventory.")}
        </p>
      </div>
    </div>
  );
}
