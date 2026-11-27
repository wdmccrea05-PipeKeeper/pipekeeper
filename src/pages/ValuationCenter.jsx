import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useCurrency } from '@/lib/currency/useCurrency';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';
import { buildCollectionValuationSummary, normaliseValuations } from '@/lib/valuation/valuationCenter';
import { buildValuationItems, filterItems } from '@/lib/valuation/collectionItems';
import { PRIVACY_NOTICE } from '@/lib/valuation/valuationPrivacy';
import ValuationDashboard from '@/components/valuation/ValuationDashboard';
import ValuationLedger from '@/components/valuation/ValuationLedger';
import ValuationRecordForm from '@/components/valuation/ValuationRecordForm';
import ValuationReportPanel from '@/components/valuation/ValuationReportPanel';

const FILTER_LABELS = {
  moduleKey: 'Module',
  moduleLabel: 'Module',
  maker: 'Maker',
  category: 'Category',
  storageLocationName: 'Location',
  valuedOnly: 'Valuations only',
  needsUpdate: 'Needs updated documentation',
  missingDocs: 'Missing documents',
};

function describeFilter(filter = {}) {
  const entry = Object.entries(filter).find(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entry) return null;
  const [key, value] = entry;
  if (Array.isArray(value) || value === true) return FILTER_LABELS[key] || key;
  if (key === 'moduleKey' || key === 'moduleLabel') return `Module: ${value}`;
  return `${FILTER_LABELS[key] || key}: ${value}`;
}

export default function ValuationCenter() {
  const { user } = useCurrentUser();
  const { formatFromBase, rates } = useCurrency();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({});
  const [formOpen, setFormOpen] = useState(false);

  const email = user?.email || null;

  const { data, isLoading } = useQuery({
    queryKey: ['valuation-center', email],
    enabled: !!email,
    queryFn: async () => {
      const [pipes, blends, cigars, bottles, wines, locations, humidors, valuations] = await Promise.all([
        fetchAllEntities(base44.entities.Pipe, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.TobaccoBlend, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.Cigar, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.Bottle, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.Wine, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.StorageLocation, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.HumidorLocation, { created_by: email }, '-updated_date'),
        fetchAllEntities(base44.entities.ValuationRecord, { created_by: email }, '-valuation_date'),
      ]);
      return { pipes, blends, cigars, bottles, wines, locations: [...locations, ...humidors], valuations };
    },
  });

  const valuations = data?.valuations || [];
  const items = useMemo(
    () => buildValuationItems({ ...(data || {}), valuations }),
    [data, valuations]
  );
  const summary = useMemo(
    () => buildCollectionValuationSummary({ items, valuations, rates }),
    [items, valuations, rates]
  );

  const filteredItems = useMemo(() => filterItems(items, filter), [items, filter]);
  const filteredIds = useMemo(() => new Set(filteredItems.map((item) => item.id)), [filteredItems]);
  const entries = useMemo(() => {
    const list = normaliseValuations(valuations, rates);
    return Object.keys(filter).length ? list.filter((entry) => filteredIds.has(entry.recordId)) : list;
  }, [valuations, rates, filter, filteredIds]);

  const filterLabel = describeFilter(filter);

  async function handleDelete(entry) {
    if (!window.confirm('Delete this valuation entry? The rest of the history stays intact.')) return;
    try {
      await base44.entities.ValuationRecord.delete(entry.id);
      await queryClient.invalidateQueries({ queryKey: ['valuation-center', email] });
      toast.success('Entry deleted.');
    } catch (error) {
      toast.error(error?.message || 'Could not delete the entry.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>Valuation & Documentation Center</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>
            Recorded costs, documented appraisals and owner estimates across every module, with the history and the
            paperwork that supports them.
          </p>
        </div>
      </div>

      <p
        className="flex items-start gap-2 rounded-xl p-2.5 text-[11px] leading-relaxed"
        style={{ background: 'rgba(140,191,158,0.08)', border: '1px solid rgba(140,191,158,0.25)', color: 'rgba(224,216,200,0.75)' }}
      >
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: '#8CBF9E' }} />
        {PRIVACY_NOTICE}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your collection…
        </div>
      ) : (
        <>
          <ValuationDashboard
            summary={summary}
            formatCurrency={formatFromBase}
            onDrilldown={(next) => setFilter(next || {})}
            onBucket={(bucket) => {
              if (bucket?.moduleLabel) {
                const match = items.find((item) => item.moduleLabel === bucket.moduleLabel);
                setFilter(match ? { moduleKey: match.moduleKey } : {});
                return;
              }
              setFilter(bucket || {});
            }}
          />

          <ValuationLedger
            entries={entries}
            formatCurrency={formatFromBase}
            onAdd={() => setFormOpen(true)}
            onDelete={handleDelete}
            filterLabel={filterLabel}
            onClearFilter={() => setFilter({})}
          />

          <ValuationReportPanel
            items={filteredItems}
            valuations={valuations}
            summary={summary}
            rates={rates}
            ownerLabel={user?.full_name || user?.email || 'Collection owner'}
          />
        </>
      )}

      <ValuationRecordForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        items={items}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['valuation-center', email] })}
      />
    </div>
  );
}