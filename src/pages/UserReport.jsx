import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle, Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search,
  ChevronDown, ChevronUp, Zap, Download,
  DollarSign, Package
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/components/i18n/safeTranslation";

// ─── Small reusable components ────────────────────────────────────────────────

/**
 * MetricCard — renders a labelled metric tile.
 * value MUST be a string or number from verified data.
 * Never pass undefined/null here — callers must supply a meaningful display value.
 */
function MetricCard({ label, value, sub }) {
  return (
    <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50 min-w-0">
      <p className="text-xs text-[#E0D8C8]/70 font-medium break-words">{label}</p>
      <p className="text-2xl font-bold text-[#F5F1E7]">{value}</p>
      {sub && <p className="text-xs text-[#E0D8C8]/50 mt-0.5 break-words">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = "" }) {
  return (
    <Card className={`bg-transparent mb-6 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-[#E0D8C8]/70" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * DataErrorBanner — shown whenever the backend returns validation.passed === false.
 * Prevents the user from seeing any financial numbers when data integrity failed.
 */
function DataErrorBanner({ errors }) {
  return (
    <div className="mb-6 rounded-lg border-2 border-rose-500 bg-rose-950/60 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-rose-200 font-bold text-lg">DATA ERROR — Report Unavailable</p>
          <p className="text-rose-300/80 text-sm mt-1">
            One or more subscriptions could not be classified or reconciliation checks failed.
            No financial metrics are displayed to prevent misleading data.
          </p>
          {errors && errors.length > 0 && (
            <ul className="mt-3 space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="text-rose-300 text-xs font-mono bg-rose-900/40 rounded px-2 py-1 break-all">{e}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserReport() {
  const { t } = useTranslation();

  const [viewFilter, setViewFilter]           = useState('all');
  const [searchQuery, setSearchQuery]         = useState('');
  const [showPaidTable, setShowPaidTable]     = useState(true);
  const [showFreeTable, setShowFreeTable]     = useState(true);
  const [sortColumn, setSortColumn]           = useState('created_date');
  const [sortDirection, setSortDirection]     = useState('desc');
  const [isSyncing, setIsSyncing]             = useState(false);
  const [newAccountsPeriod, setNewAccountsPeriod] = useState('month');
  const [renewalsPeriod, setRenewalsPeriod]   = useState('month');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn:  () => base44.auth.me(),
    retry: false,
  });

  const isAdmin = user?.role === 'admin';

  // ── Report query ─────────────────────────────────────────────────────────
  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['user-report'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserReport', {});
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Validate pipeline output ──────────────────────────────────────────────
  // Report is unusable if the backend returned a DATA_ERROR (validation failed)
  // or if the validation field is explicitly marked as failed.
  const dataError = report?.error === 'DATA_ERROR' || report?.error === 'INTERNAL_ERROR'
    ? { errors: report?.classificationErrors || report?.reconciliationErrors || report?.validation?.errors || [report?.message || 'Unknown error'] }
    : (!report?.validation?.passed && report?.validation !== undefined)
    ? { errors: report?.validation?.errors || ['Validation failed'] }
    : null;

  // ── Derived data — only read from validated report ────────────────────────
  const counts      = report?.counts      || null;
  const revenue     = report?.revenue     || null;
  const products    = report?.products    || null;
  const renewals    = report?.renewals    || null;
  const renewalRevenue = report?.renewalRevenue || null;
  const trialMetrics   = report?.trialMetrics   || null;
  const accounts    = report?.accounts    || null;
  const conversion  = report?.conversion  || null;
  const meta        = report?.meta        || null;

  // ── fmt helpers — never show 0 for financial data; show "—" when absent ──
  const fmt$ = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);
  const fmtN = (v) => (v == null ? '—' : String(Number(v)));
  const fmtPct = (v) => (v == null ? '—' : `${v}%`);

  // ── Filtered user detail lists ────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!report) return { paid: [], free: [] };
    let paid = [...(report.paid_users || [])];
    let free = [...(report.free_users || [])];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      paid = paid.filter((u) => String(u.email || '').toLowerCase().includes(q) || String(u.full_name || '').toLowerCase().includes(q));
      free = free.filter((u) => String(u.email || '').toLowerCase().includes(q) || String(u.full_name || '').toLowerCase().includes(q));
    }
    const sortFn = (a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (sortColumn === 'created_date' || sortColumn === 'subscription_end') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ?  1 : -1;
      return 0;
    };
    paid.sort(sortFn);
    free.sort(sortFn);
    return { paid, free };
  }, [report, searchQuery, sortColumn, sortDirection]);

  // ── Early returns (after all hooks) ──────────────────────────────────────
  if (isLoadingUser) return <LoadingSpinner />;
  if (userError)     return <ErrorCard message={`${t("userReport.errorLoadingUser")}: ${userError.message}`} />;
  if (!isAdmin) return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="bg-white/95 border-rose-200">
        <CardContent className="p-6">
          <p className="text-rose-800 font-semibold">{t("userReport.unauthorized")}</p>
          <p className="text-rose-700 text-sm mt-2">{t("userReport.adminAccessRequired")}</p>
        </CardContent>
      </Card>
    </div>
  );
  if (isLoading) return <LoadingSpinner />;
  if (error)     return <ErrorCard message={`${t("userReport.errorLoadingReport")}: ${error.message}`} />;

  const handleSort = (column) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('desc'); }
  };

  const lastUpdated = meta?.generatedAt
    ? new Date(meta.generatedAt).toLocaleString()
    : new Date().toLocaleString();

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    if (dataError) {
      toast.error('Cannot export CSV — report contains data errors');
      return;
    }

    const metricRows = [
      ['Metric', 'Value'],
      // Accounts
      ['--- ACCOUNTS ---', ''],
      ['Total Accounts',              fmtN(accounts?.totalUsers)],
      ['Paid Accounts',               fmtN(accounts?.paidUsers)],
      ['Free Accounts',               fmtN(accounts?.freeUsers)],
      ['Paid %',                      fmtPct(accounts?.paidPercentage)],
      ['Signup Source — Web',         fmtN(accounts?.signupSources?.web)],
      ['Signup Source — Apple',       fmtN(accounts?.signupSources?.apple)],
      ['Signup Source — Google Play', fmtN(accounts?.signupSources?.googlePlay)],
      ['New Accounts (This Week)',    fmtN(accounts?.newAccounts?.week)],
      ['New Accounts (This Month)',   fmtN(accounts?.newAccounts?.month)],
      ['New Accounts (This Quarter)', fmtN(accounts?.newAccounts?.quarter)],
      ['New Accounts (This Year)',    fmtN(accounts?.newAccounts?.year)],
      // Subscriptions
      ['--- SUBSCRIPTIONS ---', ''],
      ['Total Active Paid Subscriptions',    fmtN(counts?.totalSubscriptions)],
      ['Unique Paying Users',                fmtN(counts?.uniquePayingUsers)],
      ['Monthly Subscriptions',              fmtN(counts?.monthlySubscriptions)],
      ['Annual Subscriptions',               fmtN(counts?.annualSubscriptions)],
      ['PipeKeeper Subscriptions',           fmtN(products?.counts?.pipekeeper)],
      ['WhiskeyKeeper Subscriptions',        fmtN(products?.counts?.whiskeykeeper)],
      ['CigarKeeper Subscriptions',          fmtN(products?.counts?.cigarkeeper)],
      ['WineKeeper Subscriptions',           fmtN(products?.counts?.winekeeper)],
      ['Bundle Subscriptions',               fmtN(products?.counts?.bundle)],
      // Renewals (upcoming in calendar period)
      ['--- RENEWALS (upcoming) ---', ''],
      ['Renewing This Week (count)',         fmtN(renewals?.thisWeek?.count)],
      ['Renewing This Week (unique customers)', fmtN(renewals?.thisWeek?.uniqueCustomers)],
      ['Renewing This Month (count)',        fmtN(renewals?.thisMonth?.count)],
      ['Renewing This Month (unique customers)', fmtN(renewals?.thisMonth?.uniqueCustomers)],
      ['Renewing This Quarter (count)',      fmtN(renewals?.thisQuarter?.count)],
      ['Renewing This Quarter (unique customers)', fmtN(renewals?.thisQuarter?.uniqueCustomers)],
      ['Renewing This Year (count)',         fmtN(renewals?.thisYear?.count)],
      ['Renewing This Year (unique customers)', fmtN(renewals?.thisYear?.uniqueCustomers)],
      // Renewal Revenue (actual cash from renewing subs)
      ['--- RENEWAL REVENUE (actual cash from renewing subs) ---', ''],
      ['Renewal Revenue This Week',    fmt$(renewalRevenue?.thisWeek)],
      ['Renewal Revenue This Month',   fmt$(renewalRevenue?.thisMonth)],
      ['Renewal Revenue This Quarter', fmt$(renewalRevenue?.thisQuarter)],
      ['Renewal Revenue This Year',    fmt$(renewalRevenue?.thisYear)],
      // MRR / ARR Run Rate
      ['--- RUN RATE (extrapolated from MRR) ---', ''],
      ['MRR',  fmt$(revenue?.mrr)],
      ['ARR',  fmt$(revenue?.arr)],
      // Product Revenue (MRR-share)
      ['--- PRODUCT REVENUE (MRR share) ---', ''],
      ['PipeKeeper MRR',    fmt$(revenue?.byProduct?.pipekeeper)],
      ['WhiskeyKeeper MRR', fmt$(revenue?.byProduct?.whiskeykeeper)],
      ['CigarKeeper MRR',   fmt$(revenue?.byProduct?.cigarkeeper)],
      ['WineKeeper MRR',    fmt$(revenue?.byProduct?.winekeeper)],
      ['Bundle MRR',        fmt$(revenue?.byProduct?.bundle)],
      // Conversion
      ['--- CONVERSION ---', ''],
      ['Free → Paid (%)',               fmtPct(conversion?.freeToPaidPct)],
      ['Paid → Additional Modules (%)', fmtPct(conversion?.paidToAdditionalModulesPct)],
      ['Paid → Free / Monthly Churn (%)', fmtPct(conversion?.paidToFreePct)],
      // Trials
      ['--- TRIALS ---', ''],
      ['Currently on Trial',   fmtN(trialMetrics?.currentlyOnTrial)],
      ['Ending in 3 Days',     fmtN(trialMetrics?.endingIn3Days)],
      ['Ending in 7 Days',     fmtN(trialMetrics?.endingIn7Days)],
      ['Avg Days Remaining',   fmtN(trialMetrics?.avgDaysRemaining)],
      ['Converted (30d)',      fmtN(trialMetrics?.convertedLast30d)],
      ['Drop-offs (30d)',      fmtN(trialMetrics?.dropoffLast30d)],
      // Usage
      ['--- USAGE ---', ''],
      ['DAU / WAU by module', 'Not tracked in current data model'],
      // User detail
      ['', ''],
      ['--- USER DETAIL ---', ''],
      ['tier', 'name', 'email', 'subscription_status', 'billing_interval', 'subscription_end', 'joined'],
    ];

    (report?.paid_users || []).forEach((u) => {
      metricRows.push([
        'paid', u.full_name || '', u.email || '',
        u.subscription_status || '', u.billing_interval || '',
        u.subscription_end ? new Date(u.subscription_end).toLocaleDateString() : '',
        u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
      ]);
    });
    (report?.free_users || []).forEach((u) => {
      metricRows.push([
        'free', u.full_name || '', u.email || '',
        u.subscription_status || '', '', '',
        u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
      ]);
    });

    const csv = metricRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `user-report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  const periodLabels = { week: 'This Week', month: 'This Month', quarter: 'This Quarter', year: 'This Year' };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e8d5b7]">{t("userReport.title")}</h1>
          <p className="text-xs text-[#e8d5b7]/60 mt-1">
            {t("userReport.lastUpdated")}: {lastUpdated}
            {meta?.dateRangeDefinition && (
              <span className="ml-2 opacity-60">· Date ranges: {meta.dateRangeDefinition}</span>
            )}
            {meta?.activeSubscriptionsClassified != null && (
              <span className="ml-2 opacity-60">· {meta.activeSubscriptionsClassified} active subs classified</span>
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            onClick={async () => {
              try {
                setIsSyncing(true);
                const res = await base44.functions.invoke('backfillStripeCustomers', {});
                if (res?.data?.ok) {
                  toast.success(t("userReport.backfillComplete", { created: res.data.createdUsers ?? res.data.created ?? 0, updated: res.data.updatedUsers ?? res.data.updated ?? 0 }));
                } else {
                  toast.error(res?.data?.error || t("userReport.backfillFailed"));
                }
                await refetch();
              } catch (e) {
                toast.error(e?.message || t("userReport.backfillFailed"));
              } finally {
                setIsSyncing(false);
              }
            }}
            variant="default"
            className="w-full gap-2 sm:w-auto"
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? t("userReport.syncing") : t("userReport.backfillFromStripe")}
          </Button>

          <Button onClick={exportCSV} variant="outline" className="w-full gap-2 sm:w-auto" disabled={!report || !!dataError}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          <Button
            onClick={() => { refetch(); toast.success(t("userReport.reportRefreshed")); }}
            variant="outline"
            className="w-full gap-2 sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── DATA ERROR banner — blocks all financial sections ─────────────── */}
      {dataError && <DataErrorBanner errors={dataError.errors} />}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — ACCOUNT METRICS  (user-level; shown even on data error)
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Account Metrics" icon={Users}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${viewFilter === 'all'  ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('all');  setShowPaidTable(true);  setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Users className="w-4 h-4" />Total Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{fmtN(accounts?.totalUsers)}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('paid'); setShowPaidTable(true);  setShowFreeTable(false); }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Crown className="w-4 h-4" />Paid Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{fmtN(accounts?.paidUsers)}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('free'); setShowPaidTable(false); setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><UserX className="w-4 h-4" />Free Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{fmtN(accounts?.freeUsers)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Paid %</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{fmtPct(accounts?.paidPercentage)}</p></CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[#E0D8C8]">New Accounts</p>
            <div className="flex flex-wrap gap-1">
              {['week', 'month', 'quarter', 'year'].map((p) => (
                <Button key={p} variant={newAccountsPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setNewAccountsPeriod(p)} className="text-xs">
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50 flex items-end gap-3">
            <p className="text-3xl font-bold text-[#F5F1E7]">{fmtN(accounts?.newAccounts?.[newAccountsPeriod])}</p>
            <p className="text-sm text-[#E0D8C8]/60 mb-1">new accounts {periodLabels[newAccountsPeriod].toLowerCase()}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-[#E0D8C8] mb-2">Signup Sources</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="Web"         value={fmtN(accounts?.signupSources?.web)} />
            <MetricCard label="Apple / iOS" value={fmtN(accounts?.signupSources?.apple)} />
            <MetricCard label="Google Play" value={fmtN(accounts?.signupSources?.googlePlay)} />
          </div>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTIONS 2–5 — FINANCIAL / SUBSCRIPTION DATA
          Hidden behind DATA ERROR guard — never show partial metrics
      ═══════════════════════════════════════════════════════════════════ */}
      {!dataError && (
        <>
          {/* ── SECTION 2 — SUBSCRIPTION METRICS ────────────────────────── */}
          <SectionCard title="Subscription Metrics" icon={Package}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <MetricCard label="Total Active Paid" value={fmtN(counts?.totalSubscriptions)} sub="Subscription records" />
              <MetricCard label="Unique Paying Users" value={fmtN(counts?.uniquePayingUsers)} />
              <MetricCard label="Monthly Subs" value={fmtN(counts?.monthlySubscriptions)} />
              <MetricCard label="Annual Subs" value={fmtN(counts?.annualSubscriptions)} />
            </div>

            <p className="text-sm font-medium text-[#E0D8C8] mb-2">Paid Subscriptions by Product</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
              <MetricCard label="PipeKeeper"    value={fmtN(products?.counts?.pipekeeper)} />
              <MetricCard label="WhiskeyKeeper" value={fmtN(products?.counts?.whiskeykeeper)} />
              <MetricCard label="CigarKeeper"   value={fmtN(products?.counts?.cigarkeeper)} />
              <MetricCard label="WineKeeper"    value={fmtN(products?.counts?.winekeeper)} />
              <MetricCard label="Bundles"       value={fmtN(products?.counts?.bundle)} />
            </div>

            {/* Renewals */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-sm font-medium text-[#E0D8C8]">Upcoming Renewals (by renewalDate in calendar period)</p>
                <div className="flex flex-wrap gap-1">
                  {['week', 'month', 'quarter', 'year'].map((p) => (
                    <Button key={p} variant={renewalsPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setRenewalsPeriod(p)} className="text-xs">
                      {periodLabels[p]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const key = renewalsPeriod === 'week'    ? 'thisWeek'
                            : renewalsPeriod === 'month'   ? 'thisMonth'
                            : renewalsPeriod === 'quarter' ? 'thisQuarter'
                            : 'thisYear';
                  return (
                    <>
                      <MetricCard label="Renewing Subs"       value={fmtN(renewals?.[key]?.count)} sub="Subscription records" />
                      <MetricCard label="Renewing Customers"  value={fmtN(renewals?.[key]?.uniqueCustomers)} sub="Unique accounts" />
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Trials */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-2">Trial Metrics</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <MetricCard label="On Trial"          value={fmtN(trialMetrics?.currentlyOnTrial)} />
              <MetricCard label="Avg Days Left"     value={fmtN(trialMetrics?.avgDaysRemaining)} />
              <MetricCard label="Ending in 3 Days"  value={fmtN(trialMetrics?.endingIn3Days)} />
              <MetricCard label="Ending in 7 Days"  value={fmtN(trialMetrics?.endingIn7Days)} />
              <MetricCard label="Converted (30d)"   value={fmtN(trialMetrics?.convertedLast30d)} />
              <MetricCard label="Drop-offs (30d)"   value={fmtN(trialMetrics?.dropoffLast30d)} />
            </div>
          </SectionCard>

          {/* ── SECTION 3 — REVENUE ──────────────────────────────────────── */}
          <SectionCard title="Revenue" icon={DollarSign}>
            {/* MRR / ARR Run Rate */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-2">
              Current Run Rate <span className="opacity-60 text-xs font-normal">(monthly(MRR) and annual(ARR) extrapolations from live subscription data)</span>
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard label="MRR" value={fmt$(revenue?.mrr)} sub="Monthly Recurring Revenue" />
              <MetricCard label="ARR" value={fmt$(revenue?.arr)} sub="Annual Run Rate = MRR × 12" />
            </div>

            {/* Renewal Revenue — clearly labelled as distinct from MRR */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-1">
              Renewal Revenue <span className="opacity-60 text-xs font-normal">(actual cash expected from subscriptions renewing before end of period — NOT extrapolated)</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {['week', 'month', 'quarter', 'year'].map((p) => {
                const key = p === 'week' ? 'thisWeek' : p === 'month' ? 'thisMonth' : p === 'quarter' ? 'thisQuarter' : 'thisYear';
                return <MetricCard key={p} label={periodLabels[p]} value={fmt$(renewalRevenue?.[key])} />;
              })}
            </div>

            {/* Product Revenue (MRR share) */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-2">
              Revenue by Product <span className="opacity-60 text-xs font-normal">(each sub's monthly contribution to MRR)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <MetricCard label="PipeKeeper"    value={fmt$(revenue?.byProduct?.pipekeeper)} />
              <MetricCard label="WhiskeyKeeper" value={fmt$(revenue?.byProduct?.whiskeykeeper)} />
              <MetricCard label="CigarKeeper"   value={fmt$(revenue?.byProduct?.cigarkeeper)} />
              <MetricCard label="WineKeeper"    value={fmt$(revenue?.byProduct?.winekeeper)} />
              <MetricCard label="Bundles"       value={fmt$(revenue?.byProduct?.bundle)} />
            </div>
          </SectionCard>

          {/* ── SECTION 4 — CONVERSION ───────────────────────────────────── */}
          <SectionCard title="Conversion Metrics" icon={TrendingUp}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Free → Paid"
                value={fmtPct(conversion?.freeToPaidPct)}
                sub="% of all accounts currently paid"
              />
              <MetricCard
                label="Paid → Additional Modules"
                value={fmtPct(conversion?.paidToAdditionalModulesPct)}
                sub="% of paid accounts with bundle subscription"
              />
              <MetricCard
                label="Paid → Free (Monthly Churn)"
                value={fmtPct(conversion?.paidToFreePct)}
                sub="Cancellations in past 30 days / active subscriptions"
              />
            </div>
          </SectionCard>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — USAGE  (always shown, always N/A)
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Usage Metrics" icon={Zap}>
        <div className="mb-3 p-3 rounded-lg border border-amber-800/30 bg-amber-900/10">
          <p className="text-xs text-amber-200/70">
            Per-module activity events are not tracked in the current data model.
            Daily / weekly active user counts by module are unavailable and will not be estimated.
          </p>
        </div>
        <p className="text-sm font-medium text-[#E0D8C8] mb-2">Daily Active Users by Module</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {['PipeKeeper', 'WhiskeyKeeper', 'CigarKeeper', 'WineKeeper'].map((m) => (
            <MetricCard key={m} label={m} value="N/A" sub="Not available" />
          ))}
        </div>
        <p className="text-sm font-medium text-[#E0D8C8] mb-2">Weekly Active Users by Module</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['PipeKeeper', 'WhiskeyKeeper', 'CigarKeeper', 'WineKeeper'].map((m) => (
            <MetricCard key={m} label={m} value="N/A" sub="Not available" />
          ))}
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — USER DETAIL TABLES
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder={t("userReport.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Paid users table */}
      {(viewFilter === 'all' || viewFilter === 'paid') && (
        <Collapsible open={showPaidTable} onOpenChange={setShowPaidTable}>
          <Card className="bg-transparent mb-6">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-[#2a1f18]/40">
                <CardTitle className="text-[#F5F1E7] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#E0D8C8]/70" />
                    {t("userReport.paidUsersCount", { count: filteredData.paid.length })}
                  </div>
                  {showPaidTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <UserTable
                  rows={filteredData.paid}
                  columns={['full_name', 'email', 'subscription_status', 'billing_interval', 'subscription_end', 'created_date']}
                  headers={[t("userReport.name"), t("userReport.email"), t("userReport.status"), t("userReport.billing"), t("userReport.periodEnd"), t("userReport.joined")]}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  emptyMessage={searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noPaidUsersFound")}
                  renderCell={(col, user) => {
                    if (col === 'subscription_status') return <Badge className="bg-[#B48C4B]/20 text-[#F5F1E7] border border-[#B48C4B]/40">{user.subscription_status}</Badge>;
                    if (col === 'billing_interval')    return <span className="capitalize">{user.billing_interval || '—'}</span>;
                    if (col === 'subscription_end')    return user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : '—';
                    if (col === 'created_date')        return new Date(user.created_date).toLocaleDateString();
                    return user[col] || '—';
                  }}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Free users table */}
      {(viewFilter === 'all' || viewFilter === 'free') && (
        <Collapsible open={showFreeTable} onOpenChange={setShowFreeTable}>
          <Card className="bg-transparent">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-[#2a1f18]/40">
                <CardTitle className="text-[#F5F1E7] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-[#E0D8C8]/70" />
                    {t("userReport.freeUsersCount", { count: filteredData.free.length })}
                  </div>
                  {showFreeTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <UserTable
                  rows={filteredData.free}
                  columns={['full_name', 'email', 'subscription_status', 'created_date']}
                  headers={[t("userReport.name"), t("userReport.email"), t("userReport.status"), t("userReport.joined")]}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  emptyMessage={searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noFreeUsersFound")}
                  renderCell={(col, user) => {
                    if (col === 'subscription_status') return <Badge variant="outline" className="text-[#E0D8C8]/70 border-[#8b6239]/40">{user.subscription_status}</Badge>;
                    if (col === 'created_date')        return new Date(user.created_date).toLocaleDateString();
                    return user[col] || '—';
                  }}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#8b3a3a]" />
      </div>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="p-6">
          <p className="text-rose-800">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UserTable({ rows, columns, headers, sortColumn, sortDirection, onSort, emptyMessage, renderCell }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#8b6239]/30">
            {columns.map((col, i) => (
              <th
                key={col}
                className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                onClick={() => onSort(col)}
              >
                {headers[i]} {sortColumn === col && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-[#E0D8C8]/50">{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((user) => (
              <tr key={user.email} className="border-b border-[#8b6239]/20 hover:bg-[#2a1f18]/40">
                {columns.map((col) => (
                  <td key={col} className="py-3 px-4 text-sm text-[#E0D8C8]">
                    {renderCell(col, user)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
