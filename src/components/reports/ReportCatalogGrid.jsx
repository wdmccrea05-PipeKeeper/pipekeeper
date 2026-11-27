import React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { CARD_BORDER_GOLD, MODULE_GOLD, TEXT_CAPTION, TEXT_PRIMARY } from "@/lib/theme/tokens";
import { REPORTS, REPORT_GROUPS } from "@/lib/reports/reportCatalog";

/** The catalogue of the twenty reports, grouped, in a fixed order. */
export default function ReportCatalogGrid({ activeReportId, onSelect }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("reporting.catalog", "Report catalogue")} className="space-y-4">
      {REPORT_GROUPS.map((group) => {
        const reports = REPORTS.filter((report) => report.group === group);
        if (reports.length === 0) return null;
        return (
          <div key={group}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: TEXT_CAPTION }}>
              {t(`reporting.group.${group.replace(/\s+/g, "-").toLowerCase()}`, group)}
            </p>
            <div className="space-y-1">
              {reports.map((report) => {
                const active = report.id === activeReportId;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onSelect(report.id)}
                    aria-current={active ? "true" : undefined}
                    className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2"
                    style={{
                      minHeight: 44,
                      background: active ? "rgba(180,140,75,0.16)" : "transparent",
                      border: `1px solid ${active ? MODULE_GOLD : CARD_BORDER_GOLD}`,
                    }}
                  >
                    <span className="text-xs font-semibold mt-0.5" style={{ color: TEXT_CAPTION, minWidth: 18 }}>
                      {String(report.order).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium" style={{ color: active ? MODULE_GOLD : TEXT_PRIMARY }}>
                        {t(`reporting.report.${report.id}.title`, report.title)}
                      </span>
                      <span className="block text-xs mt-0.5" style={{ color: TEXT_CAPTION }}>
                        {t(`reporting.report.${report.id}.description`, report.description)}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 mt-1 shrink-0" style={{ color: TEXT_CAPTION }} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}