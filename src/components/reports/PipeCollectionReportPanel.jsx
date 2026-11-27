import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { buildPipeCollectionReports, cellarAgeBuckets } from '@/lib/reports/pipeCollectionReports';
import { createPipeCollectionReportsPdf, pipeCollectionReportsFilename } from '@/lib/reports/pipeCollectionReportPdf';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION } from '@/lib/theme/tokens';

/**
 * PipeKeeper and cellar reports with drill-down.
 *
 * Every row is a link into the records behind it, so a number on a report is
 * never a dead end. The same report objects feed the printable PDF.
 */
export default function PipeCollectionReportPanel({ pipes = [], blends = [], isLoading = false }) {
  const { user } = useCurrentUser();
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activeKey, setActiveKey] = useState('specialization');
  const [drill, setDrill] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.email) return undefined;
    Promise.all([
      base44.entities.PipeMaintenanceLog.filter({ created_by: user.email }, { sort: '-date', limit: 500 }).catch(() => ({ items: [] })),
      base44.entities.StorageLocation.filter({ created_by: user.email }, { sort: 'name', limit: 100 }).catch(() => ({ items: [] })),
    ]).then(([logs, places]) => {
      if (cancelled) return;
      setMaintenanceLogs(logs?.items || []);
      setLocations(places?.items || []);
    });
    return () => { cancelled = true; };
  }, [user?.email]);

  const reports = useMemo(
    () => buildPipeCollectionReports({ pipes, blends, maintenanceLogs, locations }),
    [pipes, blends, maintenanceLogs, locations],
  );

  const cellarAges = useMemo(() => cellarAgeBuckets(blends), [blends]);
  const active = reports.find((report) => report.key === activeKey) || reports[0];
  const tables = active?.tables?.length ? active.tables : [active?.table].filter(Boolean);

  const handleExport = async () => {
    setExporting(true);
    try {
      const doc = createPipeCollectionReportsPdf(reports, { owner: user?.email });
      doc.save(pipeCollectionReportsFilename());
    } catch (error) {
      toast.error('Could not build the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#D4A574' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {reports.map((report) => (
            <button
              key={report.key}
              type="button"
              onClick={() => setActiveKey(report.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={report.key === active?.key
                ? { background: 'rgba(180,140,75,0.18)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.4)' }
                : { background: 'transparent', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {report.title}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
          Print all reports
        </Button>
      </div>

      {active && (
        <div className="rounded-2xl p-4 space-y-4" style={{ border: '1px solid rgba(180,140,75,0.18)' }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>{active.title}</h3>
            <p className="text-sm mt-1" style={{ color: TEXT_CAPTION }}>{active.description}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {active.summary.map((item) => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-lg font-semibold" style={{ color: TEXT_PRIMARY }}>{item.value}</p>
                <p className="text-[11px]" style={{ color: TEXT_CAPTION }}>{item.label}</p>
              </div>
            ))}
          </div>

          {active.key === 'cellar' && (
            <div className="flex flex-wrap gap-2">
              {cellarAges.map((bucket) => (
                <button
                  key={bucket.label}
                  type="button"
                  onClick={() => bucket.records.length && setDrill({ title: `${bucket.label} in the cellar`, records: bucket.records })}
                  className="px-3 py-2 rounded-lg text-xs text-left"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: TEXT_SECONDARY }}
                >
                  <span className="block font-semibold" style={{ color: TEXT_PRIMARY }}>{bucket.value}</span>
                  {bucket.label}
                </button>
              ))}
            </div>
          )}

          {tables.map((table, tableIndex) => (
            <div key={table.title || tableIndex} className="space-y-1.5">
              {table.title && <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_CAPTION }}>{table.title}</p>}
              {table.rows.length === 0 ? (
                <p className="text-sm" style={{ color: TEXT_CAPTION }}>Nothing recorded yet.</p>
              ) : (
                table.rows.map((row) => (
                  <button
                    key={`${table.title || 'main'}-${row.label}`}
                    type="button"
                    onClick={() => row.records?.length && setDrill({ title: row.label, records: row.records })}
                    className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-sm break-words" style={{ color: TEXT_SECONDARY }}>{row.label}</span>
                    <span className="text-sm font-semibold shrink-0" style={{ color: '#D4A574' }}>{row.value}</span>
                  </button>
                ))
              )}
            </div>
          ))}

          {(active.gaps || []).map((gap) => (
            <div key={gap.label} className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                type="button"
                onClick={() => setDrill({ title: gap.label, records: gap.records })}
                className="text-sm font-semibold"
                style={{ color: '#E4C88A' }}
              >
                {gap.label} ({gap.records.length})
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(drill)} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{drill?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
            {(drill?.records || []).map((record) => (
              <Link
                key={`${record.id}-${record.name}`}
                to={record.href}
                className="block rounded-lg px-3 py-2 text-sm break-words"
                style={{ background: 'rgba(255,255,255,0.04)', color: TEXT_SECONDARY }}
              >
                {record.name || 'Untitled record'}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}