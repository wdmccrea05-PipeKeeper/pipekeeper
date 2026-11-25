import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEnabledModules } from "@/components/hooks/useEnabledKeeperModules";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { InsightsHeader, InsightsPageShell, InsightsTabBar } from "@/components/insights/InsightsShell";
import useCollectionReportData from "@/components/reports/useCollectionReportData";
import ReportOptionsPanel from "@/components/reports/ReportOptionsPanel";
import PipePairingChartReport from "@/components/reports/PipePairingChartReport";
import TopMatchesReport from "@/components/reports/TopMatchesReport";
import ComplementaryReport from "@/components/reports/ComplementaryReport";
import { buildCollectionReport } from "@/lib/reports/pairingInsightsEngine";
import { createCollectionReportPdf } from "@/lib/reports/collectionReportPdf";
import {
  buildCollectionReportCsv,
  collectionReportFilename,
  downloadCsvFile,
} from "@/lib/reports/collectionReportCsv";
import { TEXT_SECONDARY, TEXT_CAPTION } from "@/lib/theme/tokens";

const DEFAULT_OPTIONS = {
  modules: { pipe: true, whiskey: true, cigar: true, wine: true },
  blendsPerPipe: 5,
  includePhotos: true,
  includeExplanations: true,
};

// Module menu entries link here with ?module=pipekeeper etc. so the report
// opens focused on that module instead of every enabled one.
const MODULE_PARAM_MAP = {
  pipekeeper: "pipe",
  whiskeykeeper: "whiskey",
  cigarkeeper: "cigar",
  winekeeper: "wine",
};

function buildInitialOptions() {
  const param = new URLSearchParams(window.location.search).get("module");
  const key = MODULE_PARAM_MAP[param];
  if (!key) return DEFAULT_OPTIONS;
  return {
    ...DEFAULT_OPTIONS,
    modules: { pipe: key === "pipe", whiskey: key === "whiskey", cigar: key === "cigar", wine: key === "wine" },
  };
}

export default function CollectionReports() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { enabled, isLoading: modulesLoading } = useEnabledModules();
  const entitlements = useEntitlements();

  const [options, setOptions] = useState(buildInitialOptions);
  const [exporting, setExporting] = useState(null);
  const [activeTab, setActiveTab] = useState("pairing");

  const canExport = entitlements.tier === null || entitlements.canUse("EXPORT_REPORTS");

  const availableModules = useMemo(() => {
    const list = [];
    if (enabled.pipekeeper) list.push({ key: "pipe" });
    if (enabled.whiskeykeeper) list.push({ key: "whiskey" });
    if (enabled.cigarkeeper) list.push({ key: "cigar" });
    if (enabled.winekeeper) list.push({ key: "wine" });
    return list;
  }, [enabled]);

  const effectiveModules = useMemo(
    () => ({
      pipe: Boolean(enabled.pipekeeper && options.modules.pipe),
      whiskey: Boolean(enabled.whiskeykeeper && options.modules.whiskey),
      cigar: Boolean(enabled.cigarkeeper && options.modules.cigar),
      wine: Boolean(enabled.winekeeper && options.modules.wine),
    }),
    [enabled, options.modules],
  );

  const data = useCollectionReportData({ user, modules: effectiveModules });

  const report = useMemo(
    () =>
      buildCollectionReport({
        data: {
          pipes: data.pipes,
          blends: data.blends,
          smokingLogs: data.smokingLogs,
          bottles: data.bottles,
          tastingLogs: data.tastingLogs,
          cigars: data.cigars,
          cigarSessions: data.cigarSessions,
          wines: data.wines,
          wineTastings: data.wineTastings,
          userProfile: user,
        },
        options: {
          modules: effectiveModules,
          blendsPerPipe: options.blendsPerPipe,
          includePhotos: options.includePhotos,
          includeExplanations: options.includeExplanations,
        },
      }),
    [
      data.pipes,
      data.blends,
      data.smokingLogs,
      data.bottles,
      data.tastingLogs,
      data.cigars,
      data.cigarSessions,
      data.wines,
      data.wineTastings,
      effectiveModules,
      options.blendsPerPipe,
      options.includePhotos,
      options.includeExplanations,
      user,
    ],
  );

  const tabs = useMemo(
    () => [
      { key: "pairing", label: t("collectionReports.tabPairing", "Pipe Pairing Chart") },
      { key: "top", label: t("collectionReports.tabTop", "Top Matches") },
      { key: "complementary", label: t("collectionReports.tabComplementary", "Complementary") },
    ],
    [t],
  );

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const doc = await createCollectionReportPdf(report);
      doc.save(collectionReportFilename("pdf"));
    } catch (error) {
      console.error("Collection report PDF failed:", error);
      toast.error(t("collectionReports.pdfFailed", "Could not build the PDF. Please try again."));
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = () => {
    setExporting("csv");
    try {
      downloadCsvFile(buildCollectionReportCsv(report), collectionReportFilename("csv"));
    } finally {
      setExporting(null);
    }
  };

  const summaryLine = [
    report.summary.pipes ? `${report.summary.pipes} ${t("collectionReports.pipes", "pipes")}` : null,
    report.summary.blends ? `${report.summary.blends} ${t("collectionReports.blends", "blends")}` : null,
    report.summary.bottles ? `${report.summary.bottles} ${t("collectionReports.bottles", "bottles")}` : null,
    report.summary.cigars ? `${report.summary.cigars} ${t("collectionReports.cigars", "cigars")}` : null,
    report.summary.wines ? `${report.summary.wines} ${t("collectionReports.wines", "wines")}` : null,
    report.summary.sessions ? `${report.summary.sessions} ${t("collectionReports.sessions", "sessions")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasAnyData =
    report.summary.pipes ||
    report.summary.blends ||
    report.summary.bottles ||
    report.summary.cigars ||
    report.summary.wines;

  return (
    <InsightsPageShell>
      <InsightsHeader
        title={t("collectionReports.title", "Collection Reports")}
        subtitle={t(
          "collectionReports.subtitle",
          "Printable pairing insights, top matches and complementary suggestions built from your own collection.",
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[340px_1fr] xl:items-start">
        <div className="xl:sticky xl:top-4">
          <ReportOptionsPanel
            availableModules={availableModules}
            options={options}
            onChange={setOptions}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
            exporting={exporting}
            canExport={canExport}
          />
        </div>

        <div className="min-w-0 space-y-4">
          {summaryLine && (
            <p className="text-sm" style={{ color: TEXT_CAPTION }}>
              {summaryLine}
            </p>
          )}

          <InsightsTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {modulesLoading || data.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[rgba(180,140,75,0.25)] border-t-[#D4A574] rounded-full animate-spin" />
            </div>
          ) : !hasAnyData ? (
            <div className="rounded-2xl p-10 text-center" style={{ border: "1px solid rgba(180,140,75,0.18)" }}>
              <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
                {t("collectionReports.emptyState", "Add items to your collection, or select another module, to build a report.")}
              </p>
            </div>
          ) : (
            <>
              {activeTab === "pairing" && (
                <PipePairingChartReport
                  rows={report.pairingChart}
                  includePhotos={options.includePhotos}
                  includeExplanations={options.includeExplanations}
                />
              )}
              {activeTab === "top" && (
                <TopMatchesReport
                  groups={report.topMatches}
                  includePhotos={options.includePhotos}
                  includeExplanations={options.includeExplanations}
                />
              )}
              {activeTab === "complementary" && <ComplementaryReport groups={report.complementary} />}
            </>
          )}
        </div>
      </div>
    </InsightsPageShell>
  );
}