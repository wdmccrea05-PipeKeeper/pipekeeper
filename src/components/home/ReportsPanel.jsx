// components/home/ReportsPanel.jsx
import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import {
  calculateCellaredOzFromLogs,
  calculateTobaccoCollectionValue,
} from "@/components/utils/tobaccoQuantityHelpers";

export default function ReportsPanel({ pipes, blends, cellarLogs }) {
  const { t } = useTranslation();

  const totalPipes = pipes?.length || 0;
  const totalBlends = blends?.length || 0;
  const totalCellaredOz = calculateCellaredOzFromLogs(
    cellarLogs || [],
  );
  const totalValue = calculateTobaccoCollectionValue(
    blends || [],
    cellarLogs || [],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t("home.reports.totalPipes")} value={totalPipes} />
      <StatCard label={t("home.reports.totalBlends")} value={totalBlends} />
      <StatCard
        label={t("home.reports.totalCellared")}
        value={`${totalCellaredOz.toFixed(1)} oz`}
      />
      <StatCard
        label={t("home.reports.totalValue")}
        value={
          totalValue > 0 ? `≈ ${totalValue.toFixed(0)}` : t("home.reports.na")
        }
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg bg-background/40 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}