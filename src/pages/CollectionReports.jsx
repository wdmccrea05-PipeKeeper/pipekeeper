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
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION } from "@/lib/theme/tokens";
import SmokingLogReportExporter from "@/components/export/SmokingLogReportExporter";
import AgingReportExporter from "@/components/export/AgingReportExporter";
import CollectionReportExporter from "@/components/export/CollectionReportExporter";
import PipeCollectionReportPanel from "@/components/reports/PipeCollectionReportPanel";
import PipeCharacteristicsCompare from "@/components/pipes/PipeCharacteristicsCompare";
import { Link } from "react-router-dom";

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

  const canExport = Boolean(user?.email) && entitlements.canUse("EXPORT_REPORTS");

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
          pipeId: options.pipeId,
          specialization: options.specialization,
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
      options.pipeId,
      options.specialization,
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
      { key: "pipes", label: t("collectionReports.tabPipes", "Pipes & Cellar") },
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

      <p className="text-xs mb-4" style={{ color: TEXT_CAPTION }}>
        {t("collectionReports.centerLink", "Composition, documentation, preservation, history and value reports are in the")}{" "}
        <Link to="/ReportingCenter" className="underline decoration-dotted underline-offset-2" style={{ color: "#D4A574" }}>
          {t("collectionReports.centerCta", "Collection Intelligence and Reporting Center")}
        </Link>
        .
      </p>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr] xl:items-start">
        <div className="xl:sticky xl:top-4">
          <ReportOptionsPanel
            pipes={data.pipes}
            disabled={data.isLoading || data.isError || modulesLoading}
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

          {data.isError ? <p role="alert">Could not load all report data. Please reload before exporting.</p> : modulesLoading || data.isLoading ? (
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
              {activeTab === "pipes" && (
                <div className="space-y-6">
                  <PipeCollectionReportPanel pipes={data.pipes} blends={data.blends} isLoading={data.isLoading} />
                  <PipeCharacteristicsCompare pipes={data.pipes} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: TEXT_PRIMARY }}>
            {t("collectionReports.exportReports", "Export Reports")}
          </h2>
          <p className="text-sm mt-1" style={{ color: TEXT_CAPTION }}>
            {t(
              "collectionReports.exportReportsSubtitle",
              "Usage logs, cellar aging and collection valuations as PDF or Excel/CSV.",
            )}
          </p>
        </div>
        <SmokingLogReportExporter user={user} />
        <AgingReportExporter user={user} />
        <CollectionReportExporter user={user} />
      </section>
    </InsightsPageShell>
  );
}