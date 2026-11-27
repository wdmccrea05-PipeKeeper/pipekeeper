import React from "react";
import { FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportChart from "./ReportChart";
import ReportTable from "./ReportTable";
import { CARD_BORDER_GOLD, TEXT_CAPTION, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/theme/tokens";

/**
 * Renders one report result: measures, charts, tables, observations and the
 * disclosures that belong with them. Exports always carry the same metadata.
 */
export default function ReportResultView({ result, onDrill, onExportCsv, onExportPdf, onPrint, exporting, canExport }) {
  if (!result) return null;

  const generated = new Date(result.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime()) ? "—" : generated.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <section className="space-y-5 report-print-root" aria-live="polite">
      <header className="rounded-2xl p-5" style={{ border: `1px solid ${CARD_BORDER_GOLD}`, background: "linear-gradient(135deg, rgba(42,31,24,0.55), rgba(31,21,16,0.55))" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold" style={{ color: TEXT_PRIMARY, fontFamily: "'Georgia', serif" }}>{result.title}</h2>
            <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>{result.description}</p>
            <dl className="mt-3 grid gap-1 text-xs" style={{ color: TEXT_CAPTION }}>
              <div><dt className="inline font-semibold">Generated: </dt><dd className="inline">{generatedLabel}</dd></div>
              <div><dt className="inline font-semibold">Filters: </dt><dd className="inline">{result.filtersLabel}</dd></div>
              <div><dt className="inline font-semibold">Records in scope: </dt><dd className="inline">{result.recordCount}</dd></div>
              <div><dt className="inline font-semibold">Calculation basis: </dt><dd className="inline">Your own records, counted after the filters above. Currency: {result.currency}.</dd></div>
            </dl>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" size="sm" onClick={onPrint} style={{ minHeight: 44 }}>
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={onExportCsv} disabled={!canExport || Boolean(exporting)} style={{ minHeight: 44 }}>
              {exporting === "csv" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1.5" />} CSV
            </Button>
            <Button size="sm" onClick={onExportPdf} disabled={!canExport || Boolean(exporting)} style={{ minHeight: 44 }}>
              {exporting === "pdf" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />} PDF
            </Button>
          </div>
        </div>
        {!canExport && (
          <p className="mt-3 text-xs" style={{ color: TEXT_CAPTION }}>
            Viewing is open to every collector. PDF and CSV export require Pro, and the server checks that right again before an export is prepared.
          </p>
        )}
      </header>

      {result.empty ? (
        <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(180,140,75,0.18)" }}>
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>{result.empty}</p>
          <p className="text-xs mt-2" style={{ color: TEXT_CAPTION }}>
            Reports only show recorded data. Widen the filters or add records to see this report.
          </p>
        </div>
      ) : (
        <>
          {result.kpis.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {result.kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-4" style={{ border: "1px solid rgba(180,140,75,0.16)" }}>
                  <p className="text-xs uppercase tracking-wide" style={{ color: TEXT_CAPTION }}>{kpi.label}</p>
                  <p className="text-lg font-semibold mt-1 break-words" style={{ color: TEXT_PRIMARY }}>{kpi.value}</p>
                  {kpi.sub && <p className="text-xs mt-0.5" style={{ color: TEXT_CAPTION }}>{kpi.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {result.charts.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {result.charts.map((chart) => (
                <ReportChart key={chart.id} chart={chart} onDrill={onDrill} />
              ))}
            </div>
          )}

          {result.tables.length > 0 && (
            <div className="space-y-4">
              {result.tables.map((table) => (
                <ReportTable key={table.id} table={table} />
              ))}
            </div>
          )}

          {result.insights.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid rgba(180,140,75,0.16)" }}>
              <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>Observations</h3>
              {result.insights.map((insight) => (
                <div key={insight.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_CAPTION }}>{insight.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: TEXT_SECONDARY }}>{insight.text}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {result.disclosures.length > 0 && (
        <div className="rounded-xl p-4 space-y-1.5" style={{ border: "1px dashed rgba(180,140,75,0.24)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_CAPTION }}>Disclosures</h3>
          {result.disclosures.map((text) => (
            <p key={text} className="text-xs" style={{ color: TEXT_CAPTION }}>{text}</p>
          ))}
        </div>
      )}
    </section>
  );
}