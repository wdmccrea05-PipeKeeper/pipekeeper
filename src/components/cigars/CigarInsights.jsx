import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Cigarette,
  DollarSign,
  Layers,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  Clock3,
  Heart,
  Shield,
  Activity,
} from 'lucide-react';
import { useCurrency } from '@/lib/currency/useCurrency';
import CigarInsuranceExporter from '@/components/export/CigarInsuranceExporter';
import {
  getPortfolioSummary,
  getValuationSections,
  getCollectorAnalytics,
  getTrendFoundation,
  getCigarDisplayName,
  getCigarQuantity,
} from '@/components/cigars/cigarReports';

const GOLD_PALETTE = ['#D4A574', '#B48C4B', '#8C6B3F', '#6B4F2E', '#F5D4A0', '#C4904A', '#A07840', '#E3B97A'];

function SectionCard({ title, subtitle, children }) {
  return (
    <section
      className="rounded-2xl p-4 sm:p-5 space-y-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,140,75,0.15)',
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-[#F5F1E7]">{title}</h3>
        {subtitle ? <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.58)' }}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.14)' }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: '#D4A574' }} />
        <span className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold mt-2 text-[#F5F1E7]">{value}</p>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ color: 'rgba(224,216,200,0.68)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(180,140,75,0.22)' }}>
      {children}
    </div>
  );
}

function ChartBlock({ title, data, dataKey = 'value', color = '#D4A574' }) {
  if (!data?.length) return null;

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
      <p className="text-sm font-semibold text-[#F5F1E7] mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(180,140,75,0.14)" />
          <XAxis dataKey="name" tick={{ fill: 'rgba(224,216,200,0.72)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(224,216,200,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'rgba(26,18,12,0.96)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
            formatter={(value) => [value, 'Count']}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompactRowCards({ rows, renderTitle, renderDetail, emptyText }) {
  if (!rows?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row, idx) => (
        <div key={row?.id || row?.cigar?.id || `${idx}`} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
          <p className="text-sm font-semibold text-[#F5F1E7]">{renderTitle(row)}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.62)' }}>{renderDetail(row)}</p>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows, emptyText }) {
  if (!rows?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(180,140,75,0.15)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'rgba(180,140,75,0.08)' }}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.72)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row?.id || row?.cigar?.id || idx} style={{ borderTop: '1px solid rgba(180,140,75,0.08)' }}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-[#F5F1E7]">{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CigarInsights({ user, cigars = [], sessions = [], humidors = [], snapshots = [] }) {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const { formatFromBase } = useCurrency();

  const portfolio = React.useMemo(
    () => getPortfolioSummary(cigars, humidors, sessions, today),
    [cigars, humidors, sessions, today]
  );

  const valuation = React.useMemo(
    () => getValuationSections(cigars, humidors, today),
    [cigars, humidors, today]
  );

  const analytics = React.useMemo(
    () => getCollectorAnalytics(cigars, sessions, humidors, today),
    [cigars, sessions, humidors, today]
  );

  const trend = React.useMemo(
    () => getTrendFoundation(cigars, sessions, snapshots, today),
    [cigars, sessions, snapshots, today]
  );

  const summaryCards = [
    { icon: Cigarette, label: 'Total Cigars', value: portfolio.totalCigars },
    { icon: Layers, label: 'Unique Cigars', value: portfolio.totalUniqueCigars },
    { icon: DollarSign, label: 'Collection Value', value: formatFromBase(portfolio.totalEstimatedCollectionValue) },
    { icon: TrendingUp, label: 'Avg Value / Cigar', value: formatFromBase(portfolio.averageValuePerCigar) },
    { icon: Warehouse, label: 'Humidors', value: portfolio.humidorCount },
    { icon: AlertTriangle, label: 'Need Valuation', value: portfolio.cigarsNeedingValuation },
    { icon: Heart, label: 'Low-Stock Favorites', value: portfolio.lowStockFavorites },
    { icon: Shield, label: 'Ready Now', value: portfolio.readyNow },
    { icon: Clock3, label: 'Resting', value: portfolio.resting },
    { icon: Activity, label: 'Overdue to Smoke', value: portfolio.overdueToSmoke },
  ];

  return (
    <div className="space-y-6">
      <SectionCard
        title="Cigar Portfolio Dashboard"
        subtitle="At-a-glance collection intelligence for value, readiness, and restock pressure."
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Valuation Intelligence"
        subtitle="Where your value lives, what is stale, and what needs updated pricing."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.6)' }}>Highest Value Brands</p>
            <div className="space-y-1.5 mt-2">
              {valuation.highestValueBrands.slice(0, 5).map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#F5F1E7] truncate">{row.name}</span>
                  <span style={{ color: '#D4A574' }}>{formatFromBase(row.value)}</span>
                </div>
              ))}
              {valuation.highestValueBrands.length === 0 ? <EmptyState>Add values to unlock portfolio reports.</EmptyState> : null}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.6)' }}>Value by Humidor</p>
            <div className="space-y-1.5 mt-2">
              {valuation.valueByHumidor.slice(0, 5).map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#F5F1E7] truncate">{row.name}</span>
                  <span style={{ color: '#D4A574' }}>{formatFromBase(row.value)}</span>
                </div>
              ))}
              {valuation.valueByHumidor.length === 0 ? <EmptyState>Assign humidors to see storage analytics.</EmptyState> : null}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.6)' }}>Low-Stock High Value</p>
            <div className="space-y-1.5 mt-2">
              {valuation.lowStockHighValue.slice(0, 5).map((row) => (
                <div key={row.cigar.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#F5F1E7] truncate">{getCigarDisplayName(row.cigar)}</span>
                  <span style={{ color: '#D4A574' }}>{formatFromBase(row.remainingValue)}</span>
                </div>
              ))}
              {valuation.lowStockHighValue.length === 0 ? <EmptyState>No low-stock high-value cigars detected.</EmptyState> : null}
            </div>
          </div>
        </div>

        <CompactRowCards
          rows={valuation.highestValueCigars.slice(0, 10)}
          renderTitle={(row) => getCigarDisplayName(row.cigar)}
          renderDetail={(row) => `${getCigarQuantity(row.cigar)} cigars · ${formatFromBase(row.remainingValue)}`}
          emptyText="Add values to unlock portfolio reports."
        />
        <DataTable
          rows={valuation.highestValueCigars.slice(0, 10)}
          emptyText="Add values to unlock portfolio reports."
          columns={[
            { key: 'name', label: 'Highest Value Cigars', render: (row) => getCigarDisplayName(row.cigar) },
            { key: 'qty', label: 'Qty', render: (row) => getCigarQuantity(row.cigar) },
            { key: 'unit', label: 'Unit Value', render: (row) => formatFromBase(row.remainingValue / Math.max(1, getCigarQuantity(row.cigar))) },
            { key: 'total', label: 'Remaining Value', render: (row) => formatFromBase(row.remainingValue) },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <CompactRowCards
              rows={valuation.missingValuation}
              renderTitle={(row) => getCigarDisplayName(row.cigar)}
              renderDetail={(row) => `${row.quantity} cigars · Missing estimated and purchase value`}
              emptyText="All tracked cigars have valuation inputs."
            />
            <DataTable
              rows={valuation.missingValuation}
              emptyText="All tracked cigars have valuation inputs."
              columns={[
                { key: 'name', label: 'Missing Valuation', render: (row) => getCigarDisplayName(row.cigar) },
                { key: 'qty', label: 'Qty', render: (row) => row.quantity },
                { key: 'humidor', label: 'Humidor', render: (row) => humidors.find((h) => h.id === row.cigar.humidor_id)?.name || 'Unassigned' },
              ]}
            />
          </div>
          <div>
            <CompactRowCards
              rows={valuation.staleValuation}
              renderTitle={(row) => getCigarDisplayName(row.cigar)}
              renderDetail={(row) => `${row.staleDays} days stale · ${formatFromBase(row.remainingValue)}`}
              emptyText="No stale valuations found in the current window."
            />
            <DataTable
              rows={valuation.staleValuation}
              emptyText="No stale valuations found in the current window."
              columns={[
                { key: 'name', label: 'Stale Valuation', render: (row) => getCigarDisplayName(row.cigar) },
                { key: 'days', label: 'Days Stale', render: (row) => row.staleDays },
                { key: 'value', label: 'Remaining Value', render: (row) => formatFromBase(row.remainingValue) },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Collector Analytics"
        subtitle="Inventory concentration, smoking behavior, readiness, and acquisition posture."
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <ChartBlock title="Inventory by Brand" data={analytics.inventory.byBrand.slice(0, 8)} color={GOLD_PALETTE[0]} />
          <ChartBlock title="Inventory by Country" data={analytics.inventory.byCountry.slice(0, 8)} color={GOLD_PALETTE[2]} />
          <ChartBlock title="Inventory by Humidor" data={analytics.inventory.byHumidor.slice(0, 8)} color={GOLD_PALETTE[4]} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <CompactRowCards
              rows={analytics.smoking.mostSmoked}
              renderTitle={(row) => row.name}
              renderDetail={(row) => `Smoked ${row.value} time${row.value === 1 ? '' : 's'}`}
              emptyText="Log sessions to unlock smoking analytics."
            />
            <DataTable
              rows={analytics.smoking.mostSmoked}
              emptyText="Log sessions to unlock smoking analytics."
              columns={[
                { key: 'name', label: 'Most Smoked Cigars', render: (row) => row.name },
                { key: 'count', label: 'Sessions', render: (row) => row.value },
              ]}
            />

            <CompactRowCards
              rows={analytics.smoking.avgSessionRatingByBrand}
              renderTitle={(row) => row.name}
              renderDetail={(row) => `Avg ${row.value}/5 over ${row.samples} sessions`}
              emptyText="Log rated sessions to unlock brand rating analytics."
            />
            <DataTable
              rows={analytics.smoking.avgSessionRatingByBrand}
              emptyText="Log rated sessions to unlock brand rating analytics."
              columns={[
                { key: 'brand', label: 'Average Session Rating by Brand', render: (row) => row.name },
                { key: 'rating', label: 'Avg Rating', render: (row) => `${row.value}/5` },
                { key: 'samples', label: 'Sessions', render: (row) => row.samples },
              ]}
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard icon={Shield} label="Ready Now" value={analytics.readiness.readyNow.length} />
              <SummaryCard icon={Clock3} label="Ready Soon" value={analytics.readiness.readySoon.length} />
              <SummaryCard icon={TrendingUp} label="Long-Term Aging" value={analytics.readiness.longTermAging.length} />
              <SummaryCard icon={AlertTriangle} label="Neglected Gems" value={analytics.readiness.neglectedGems.length} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <SummaryCard icon={Layers} label="Wishlist" value={analytics.acquisition.wishlist} />
              <SummaryCard icon={Layers} label="Shopping List" value={analytics.acquisition.shopping} />
              <SummaryCard icon={Heart} label="Restock" value={analytics.acquisition.restock} />
              <SummaryCard icon={AlertTriangle} label="Not for Me" value={analytics.acquisition.notForMe} />
            </div>

            <CompactRowCards
              rows={analytics.smoking.recentlyEnjoyed}
              renderTitle={(row) => row.displayName}
              renderDetail={(row) => `${row.date || 'Unknown date'} · ${row.score}/5`}
              emptyText="Log sessions to unlock recently enjoyed tracking."
            />
            <DataTable
              rows={analytics.smoking.recentlyEnjoyed}
              emptyText="Log sessions to unlock recently enjoyed tracking."
              columns={[
                { key: 'name', label: 'Recently Enjoyed', render: (row) => row.displayName },
                { key: 'date', label: 'Date', render: (row) => row.date || '—' },
                { key: 'score', label: 'Enjoyment', render: (row) => `${row.score}/5` },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Timeline & Trend Foundation"
        subtitle="Monthly value snapshots, smoking activity, and acquisition movement over the last 12 months."
      >
        {trend.hasSnapshotValueTrend || trend.hasActivity ? (
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend.timeline} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(180,140,75,0.14)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'rgba(224,216,200,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(224,216,200,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(26,18,12,0.96)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
                  formatter={(value, key) => {
                    if (key === 'collectionValue') return [formatFromBase(value), 'Collection Value'];
                    return [value, key === 'acquired' ? 'Acquired' : key === 'smoked' ? 'Smoked' : 'Cellar Delta'];
                  }}
                />
                <Legend />
                <Line yAxisId="right" type="monotone" dataKey="collectionValue" name="Value" stroke="#D4A574" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="acquired" name="Acquired" stroke="#6FCF97" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="smoked" name="Smoked" stroke="#E07060" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="cellarDelta" name="Cellar Delta" stroke="#8AA8D6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState>
            Add values to unlock portfolio reports. Log sessions to unlock smoking analytics. Trend snapshots will appear as valuation history grows.
          </EmptyState>
        )}
      </SectionCard>

      <SectionCard
        title="Insurance / Export Reports"
        subtitle="Generate insurer-ready exports with values, quantities, storage locations, and generated date."
      >
        <CigarInsuranceExporter user={user} cigars={cigars} humidors={humidors} />
      </SectionCard>
    </div>
  );
}
