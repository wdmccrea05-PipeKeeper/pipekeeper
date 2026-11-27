import React, { useState } from 'react';
import { FileText, Download, Eye, Table, Loader2 } from 'lucide-react';
import { REPORT_CATALOG, buildValuationReport, buildReportCsv } from '@/lib/valuation/valuationReports';
import { openValuationReportPreview, downloadValuationReport } from '@/lib/valuation/valuationReportPdf';

function downloadCsv(model) {
  const csv = buildReportCsv(model);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${model.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * The eight printable reports of the Valuation and Documentation Center.
 *
 * Each report carries the generation date, source attribution and the
 * uncertainty disclosures inside the document itself, so a printed or exported
 * copy cannot be separated from the caveats that belong to it.
 */
export default function ValuationReportPanel({ items = [], valuations = [], summary, rates = {}, ownerLabel = 'Collection owner' }) {
  const [busy, setBusy] = useState(null);

  function buildModel(reportId) {
    return buildValuationReport(reportId, { items, valuations, summary, rates, ownerLabel });
  }

  async function handle(reportId, action) {
    setBusy(`${reportId}:${action}`);
    try {
      const model = buildModel(reportId);
      if (action === 'preview') openValuationReportPreview(model);
      if (action === 'pdf') downloadValuationReport(model);
      if (action === 'csv') downloadCsv(model);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: '#F5F1E7' }}>Reports</h2>
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
          Every report carries its generation date, source attribution and uncertainty disclosures.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CATALOG.map((report) => (
          <div
            key={report.id}
            className="rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(180,140,75,0.2)' }}
          >
            <p className="flex items-start gap-1.5 text-sm font-semibold" style={{ color: '#F5F1E7' }}>
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: '#D4A574' }} />
              <span className="min-w-0 break-words">{report.title}</span>
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'rgba(224,216,200,0.6)' }}>{report.purpose}</p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handle(report.id, 'preview')}
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px]"
                style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574', minHeight: 36 }}
              >
                {busy === `${report.id}:preview` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Preview
              </button>
              <button
                type="button"
                onClick={() => handle(report.id, 'pdf')}
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,140,75,0.22)', color: '#E0D8C8', minHeight: 36 }}
              >
                {busy === `${report.id}:pdf` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} PDF
              </button>
              <button
                type="button"
                onClick={() => handle(report.id, 'csv')}
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,140,75,0.22)', color: '#E0D8C8', minHeight: 36 }}
              >
                {busy === `${report.id}:csv` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Table className="h-3 w-3" />} CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}