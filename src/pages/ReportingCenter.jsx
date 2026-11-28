import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEnabledModules } from "@/components/hooks/useEnabledKeeperModules";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { InsightsHeader, InsightsPageShell } from "@/components/insights/InsightsShell";
import useReportCenterData from "@/components/reports/useReportCenterData";
import ReportCatalogGrid from "@/components/reports/ReportCatalogGrid";
import ReportFiltersBar from "@/components/reports/ReportFiltersBar";
import ReportResultView from "@/components/reports/ReportResultView";
import ReportDrilldownDialog from "@/components/reports/ReportDrilldownDialog";
import SavedReportConfigs from "@/components/reports/SavedReportConfigs";
import FindingsReviewPanel from "@/components/actions/FindingsReviewPanel";
import useFindingStates from "@/hooks/useFindingStates";
import { restoreScrollPosition, saveScrollPosition } from "@/lib/navigation/returnTo";
import { buildFindings } from "@/lib/actions/collectionFindings";
import CuratorReportPrompt from "@/components/reports/CuratorReportPrompt";
import { buildReportContext, runReport, getReport } from "@/lib/reports/reportCatalog";
import { downloadReportCsv, downloadReportPdf } from "@/lib/reports/reportExport";
import { buildCollectionReport } from "@/lib/reports/pairingInsightsEngine";
import { DEFAULT_FILTERS } from "@/lib/reports/reportModel";
import { filtersForModuleParam } from "@/lib/reports/reportModuleScope";
import { TEXT_CAPTION, TEXT_SECONDARY } from "@/lib/theme/tokens";
import "@/components/reports/reportPrint.css";

function initialFilters(module) {
  const base = { ...DEFAULT_FILTERS, year: String(new Date().getFullYear()), curatorQuestion: "" };
  return filtersForModuleParam(module, base);
}

export default function ReportingCenter() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { enabled, isLoading: modulesLoading } = useEnabledModules();
  const entitlements = useEntitlements();
  const { states: findingStates, setState: setFindingState, error: findingStateError } = useFindingStates(user);

  const [params, setParams] = useSearchParams();
  const requestedReportId = params.get("report");
  const activeReportId = requestedReportId && getReport(requestedReportId).id === requestedReportId
    ? requestedReportId
    : null;
  const [filters, setFilters] = useState(() => initialFilters(params.get("module")));
  const [exporting, setExporting] = useState(null);
  const [drill, setDrill] = useState({ open: false, title: "", ids: [] });
  const catalogScrollSaved = useRef(false);

  useEffect(() => {
    if (activeReportId) {
      const scroller = document.querySelector("main") || document.scrollingElement;
      if (scroller) scroller.scrollTop = 0;
    } else if (catalogScrollSaved.current) {
      restoreScrollPosition("report-catalog");
    }
  }, [activeReportId]);

  const selectReport = (id) => {
    if (!activeReportId) {
      saveScrollPosition("report-catalog");
      catalogScrollSaved.current = true;
    }
    setDrill({ open: false, title: "", ids: [] });
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("report", id);
      return next;
    });
  };

  const catalogParams = new URLSearchParams(params);
  catalogParams.delete("report");
  const catalogUrl = catalogParams.size ? `?${catalogParams}` : "/ReportingCenter";

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
      pipe: Boolean(enabled.pipekeeper && filters.modules.pipe),
      whiskey: Boolean(enabled.whiskeykeeper && filters.modules.whiskey),
      cigar: Boolean(enabled.cigarkeeper && filters.modules.cigar),
      wine: Boolean(enabled.winekeeper && filters.modules.wine),
    }),
    [enabled, filters.modules]
  );

  const data = useReportCenterData({ user, modules: effectiveModules });

  /** Server-side authorization: export rights are confirmed by the backend, not only in the browser. */
  const access = useQuery({
    queryKey: ["report-center-access", user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke("reportCenter", { action: "authorize" });
      return response.data;
    },
    enabled: Boolean(user?.email),
    staleTime: 300_000,
    retry: false,
  });

  const canExport = Boolean(entitlements.canUse("EXPORT_REPORTS")) && access.data?.canExport === true;
  const currency = user?.currency || "USD";

  const pairing = useMemo(() => {
    if (activeReportId !== "pairing") return null;
    return buildCollectionReport({
      data: {
        pipes: data.pipes,
        blends: data.blends,
        smokingLogs: data.smokingLogs,
        bottles: [],
        tastingLogs: [],
        cigars: [],
        cigarSessions: [],
        wines: [],
        wineTastings: [],
        userProfile: user,
      },
      options: { modules: effectiveModules, blendsPerPipe: 5, includePhotos: false, includeExplanations: true },
    });
  }, [activeReportId, data.pipes, data.blends, data.smokingLogs, effectiveModules, user]);

  const context = useMemo(
    () =>
      buildReportContext({
        data,
        filters,
        pairing,
        currency,
        curatorQuestion: filters.curatorQuestion || "",
      }),
    [data, filters, pairing, currency]
  );

  const result = useMemo(() => runReport(activeReportId || "overview", context), [activeReportId, context]);

  // Findings for the records this report is showing, from the same builder the
  // Collection Health review uses, scoped by the report's own filters. A change
  // made here recalculates the report from the stored records.
  const reportFindings = useMemo(() => {
    const inScope = new Set((context.items || []).map((item) => item.id));
    const scoped = (records) => (records || []).filter((record) => inScope.has(record.id));
    const collections = [];

    if (effectiveModules.pipe) {
      collections.push({ moduleKey: "pipekeeper", records: scoped(data.pipes) });
      collections.push({ moduleKey: "tobacco", records: scoped(data.blends) });
    }
    if (effectiveModules.cigar) collections.push({ moduleKey: "cigarkeeper", records: scoped(data.cigars) });
    if (effectiveModules.whiskey) collections.push({ moduleKey: "whiskeykeeper", records: scoped(data.bottles) });
    if (effectiveModules.wine) collections.push({ moduleKey: "winekeeper", records: scoped(data.wines) });

    return buildFindings({
      collections,
      locations: data.locations,
      humidors: data.humidors,
      valuations: data.valuations,
    });
  }, [
    context,
    effectiveModules,
    data.pipes,
    data.blends,
    data.cigars,
    data.bottles,
    data.wines,
    data.locations,
    data.humidors,
    data.valuations,
  ]);

  const drillItems = useMemo(
    () => context.items.filter((item) => drill.ids.includes(item.id)),
    [context.items, drill.ids]
  );

  const handleExport = async (kind) => {
    setExporting(kind);
    try {
      const response = await base44.functions.invoke("reportCenter", { action: "authorize" });
      if (!response.data?.canExport) {
        toast.error(t("reporting.exportDenied", "Exporting reports requires Pro. Your records stay available to view."));
        return;
      }
      if (kind === "csv") downloadReportCsv(result);
      else downloadReportPdf(result);
      toast.success(t("reporting.exported", "Report exported."));
    } catch (error) {
      console.error("Report export failed:", error);
      toast.error(t("reporting.exportFailed", "Could not build that export. Please try again."));
    } finally {
      setExporting(null);
    }
  };

  const handleLoadConfig = (config) => {
    if (config.report_id) selectReport(config.report_id);
    setFilters({ ...DEFAULT_FILTERS, year: String(new Date().getFullYear()), ...(config.filters || {}) });
    toast.success(t("reporting.configLoaded", "Saved view loaded."));
  };

  const isLoading = modulesLoading || data.isLoading;

  return (
    <InsightsPageShell>
      {!activeReportId ? <>
      <InsightsHeader
        title={t("reporting.title", "Collection Intelligence and Reporting Center")}
        subtitle={t(
          "reporting.subtitle",
          "Twenty reports built from your own records: composition, documentation, preservation, history and value, with filters, drill-downs and exports."
        )}
      />

      <p className="text-xs mb-4" style={{ color: TEXT_CAPTION }}>
        {t("reporting.legacyLink", "Looking for the printable pairing chart and top matches?")}{" "}
        <Link to="/CollectionReports" className="underline decoration-dotted underline-offset-2" style={{ color: "#D4A574" }}>
          {t("reporting.legacyCta", "Open Collection Reports")}
        </Link>
      </p>

      <ReportCatalogGrid onSelect={selectReport} />
      <SavedReportConfigs user={user} filters={filters} onLoad={handleLoadConfig} />
      </> : <>
      <Link to={catalogUrl} className="no-print inline-flex min-h-11 items-center font-semibold text-[#e0c99b] underline underline-offset-4">
        <span aria-hidden="true" className="mr-2">←</span>{t("nav.reports")}
      </Link>

      {data.isError && (
        <p role="alert" className="mb-4 text-sm" style={{ color: "#E0A0A0" }}>
          {t("reporting.loadError", "Some report data could not be loaded. Counts below may be incomplete until you reload.")}
        </p>
      )}
      {findingStateError && (
        <p role="alert" className="mb-4 text-sm" style={{ color: "#E0A0A0" }}>
          Finding decisions could not be loaded. Please reload before reviewing them.
        </p>
      )}

      <div className="min-w-0 space-y-4">
          <div className="no-print">
            <ReportFiltersBar
              filters={filters}
              onChange={setFilters}
              options={context.options}
              availableModules={availableModules}
              showCuratorQuestion={activeReportId === "custom-curator"}
              disabled={isLoading}
              onReset={() => setFilters({ ...DEFAULT_FILTERS, year: String(new Date().getFullYear()), curatorQuestion: "" })}
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
              <div className="w-8 h-8 border-4 border-[rgba(180,140,75,0.25)] border-t-[#D4A574] rounded-full animate-spin" />
              <span className="sr-only">{t("reporting.loading", "Building your report")}</span>
            </div>
          ) : context.allItems.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ border: "1px solid rgba(180,140,75,0.18)" }}>
              <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
                {t("reporting.noRecords", "No collection records are loaded yet. Add or import records, then open a report.")}
              </p>
            </div>
          ) : (
            <>
              <ReportResultView
                result={result}
                onDrill={(payload) => setDrill({ open: true, title: payload.title, ids: payload.ids })}
                onExportCsv={() => handleExport("csv")}
                onExportPdf={() => handleExport("pdf")}
                onPrint={() => window.print()}
                exporting={exporting}
                canExport={canExport}
              />
              {reportFindings.some((finding) => finding.actions?.length > 0) && (
                <div className="no-print">
                  <FindingsReviewPanel
                    title={t("reporting.actionsTitle", "Actions for these findings")}
                    description={t(
                      "reporting.actionsBody",
                      "Fix what a finding points to without leaving the report. The report recalculates from your records afterwards."
                    )}
                    findings={reportFindings.filter((finding) => finding.actions?.length > 0)}
                    states={findingStates}
                    onStateChange={setFindingState}
                    emptyMessage=""
                  />
                </div>
              )}
              <CuratorReportPrompt result={result} onOpenReport={selectReport} />
            </>
          )}

          <div className="no-print"><SavedReportConfigs user={user} reportId={activeReportId} filters={filters} onLoad={handleLoadConfig} /></div>

          {!isLoading && access.data && !access.data.canExport && (
            <p className="text-xs no-print" style={{ color: TEXT_CAPTION }}>
              {t(
                "reporting.authorizationNote",
                "The server confirmed this account can view reports but not export them. Exporting is a Pro capability; complimentary Pro and administrator access resolve to the same right."
              )}
            </p>
          )}
      </div>

      <ReportDrilldownDialog
        open={drill.open}
        onOpenChange={(open) => setDrill((current) => ({ ...current, open }))}
        title={drill.title}
        items={drillItems}
      />
      </>}
    </InsightsPageShell>
  );
}