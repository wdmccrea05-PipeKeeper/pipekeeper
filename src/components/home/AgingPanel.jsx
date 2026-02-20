// components/home/AgingPanel.jsx
import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function AgingPanel({ blends, cellarLogs }) {
  const { t } = useTranslation();

  if (!cellarLogs || cellarLogs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.agingEmpty")}
      </p>
    );
  }

  const blendMap = new Map(blends.map(b => [b.id, b]));

  const byBlend = new Map();
  for (const log of cellarLogs) {
    if (!log.blend_id) continue;
    const current = byBlend.get(log.blend_id) || {
      totalOz: 0,
      firstDate: null,
    };
    const amount = Number(log.amount_oz || 0);
    const date = new Date(log.cellared_date || log.created_date || 0);
    current.totalOz += amount;
    if (!current.firstDate || date < current.firstDate) {
      current.firstDate = date;
    }
    byBlend.set(log.blend_id, current);
  }

  const rows = [...byBlend.entries()]
    .map(([blendId, info]) => {
      const blend = blendMap.get(blendId);
      if (!blend) return null;
      const years =
        info.firstDate
          ? (Date.now() - info.firstDate.getTime()) /
            (365 * 24 * 60 * 60 * 1000)
          : 0;
      return {
        id: blendId,
        name: blend.name,
        totalOz: info.totalOz,
        years,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.years - a.years)
    .slice(0, 20);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.agingEmpty")}
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {rows.map(row => (
        <div
          key={row.id}
          className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2 text-sm"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{row.name}</div>
            <div className="text-xs text-muted-foreground">
              {t("home.agingYears", { years: row.years.toFixed(1) })}
            </div>
          </div>
          <div className="ml-3 text-xs text-muted-foreground whitespace-nowrap">
            {row.totalOz.toFixed(1)} oz
          </div>
        </div>
      ))}
    </div>
  );
}