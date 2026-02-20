// components/home/TrendsPanel.jsx
import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TrendsPanel({ cellarLogs }) {
  const { t } = useTranslation();

  if (!cellarLogs || cellarLogs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.trendsEmpty")}
      </p>
    );
  }

  const countsByDay = new Map();
  for (const log of cellarLogs) {
    const d = new Date(log.smoked_at || log.created_date || 0);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
  }

  const rows = [...countsByDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-30); // last 30 days

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto">
      {rows.map(row => (
        <div key={row.date} className="flex items-center gap-3 text-sm">
          <div className="w-28 text-xs text-muted-foreground">
            {row.date}
          </div>
          <div className="flex-1 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(100, row.count * 10)}%`,
              }}
            />
          </div>
          <div className="w-8 text-right text-xs text-muted-foreground">
            {row.count}
          </div>
        </div>
      ))}
    </div>
  );
}
