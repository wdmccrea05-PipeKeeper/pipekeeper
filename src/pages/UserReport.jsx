import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search,
  ChevronDown, ChevronUp, Download,
  DollarSign, Package, AlertTriangle, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/components/i18n/safeTranslation";

// ─── Small reusable components ────────────────────────────────────────────────

function MetricCard({ label, value, sub, uncertain = false }) {
  return (
    <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50 min-w-0">
      <p className="text-xs text-[#E0D8C8]/70 font-medium break-words flex items-center gap-1">
        {label}
        {uncertain && <AlertTriangle className="w-3 h-3 text-amber-400/70 shrink-0" />}
      </p>
      <p className={`text-2xl font-bold ${uncertain ? 'text-[#F5F1E7]/70' : 'text-[#F5F1E7]'}`}>{value}</p>
      {sub && <p className="text-xs text-[#E0D8C8]/50 mt-0.5 break-words">{sub}</p>}
    </div>
  );
}

// Monthly vs annual side-by-side pair
function BillingIntervalBar({ monthly, annual }) {
  const total = (monthly || 0) + (annual || 0);
  const monthlyPct = total > 0 ? Math.round((monthly / total) * 100) : 0;
  const annualPct  = total > 0 ? 100 - monthlyPct : 0;
  return (
    <div className="rounded-xl border border-[#8b6239]/30 bg-[#2a1f18]/50 p-4">
      <p className="text-xs font-semibold text-[#E0D8C8]/70 uppercase tracking-wider mb-3">Billing Interval Split</p>
      <div className="flex gap-4 mb-3">
        <div className="flex-1 rounded-lg bg-[#2563eb]/15 border border-[#2563eb]/25 p-3 text-center">
          <p className="text-2xl font-bold text-[#93C5FD]">{monthly ?? 0}</p>
          <p className="text-xs text-[#93C5FD]/70 mt-0.5">Monthly</p>
        </div>
        <div className="flex-1 rounded-lg bg-[#16a34a]/15 border border-[#16a34a]/25 p-3 text-center">
          <p className="text-2xl font-bold text-[#86EFAC]">{annual ?? 0}</p>
          <p className="text-xs text-[#86EFAC]/70 mt-0.5">Annual</p>
        </div>
      </div>
      {total > 0 && (
        <div className="h-2 rounded-full overflow-hidden flex bg-white/10">
          <div className="h-full bg-[#3B82F6] transition-all" style={{ width: `${monthlyPct}%` }} />
          <div className="h-full bg-[#22C55E] transition-all" style={{ width: `${annualPct}%` }} />
        </div>
      )}
      {total > 0 && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[#93C5FD]/60">{monthlyPct}% monthly</span>
          <span className="text-xs text-[#86EFAC]/60">{annualPct}% annual</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, accentColor = '#8b6239', className = '' }) {
  return (
    <div className={`mb-6 rounded-xl border border-[#8b6239]/25 bg-[#1a1208]/60 overflow-hidden ${className}`}
         style={{ borderLeft: `3px solid ${accentColor}55` }}>
      <div className="px-5 py-4 border-b border-[#8b6239]/20 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" style={{ color: accentColor }} />}
        <h2 className="text-sm font-bold text-[#F5F1E7] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div className="h-px flex-1 bg-[#8b6239]/20" />
      <span className="text-xs text-[#E0D8C8]/40 font-semibold uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[#8b6239]/20" />
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
  const [renewalsPeriod, setRenewalsPeriod]   = useState('month');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn:  () => base44.auth.me(),
    retry: false,
  });

  const isAdmin = user?.role === 'admin';

  // ── Single canonical report query (V3) ───────────────────────────────────
  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['user-report-v3'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserSubscriptionReportV3');
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Derived data (V3 schema) ──────────────────────────────────────────────
  const accounts      = report?.accounts      || {};
  const subscriptions = report?.subscriptions || {};
  const runRate       = report?.runRate       || {};
  const renewalRevenue = report?.renewalRevenue || {};
  const meta          = report?.meta          || {};
  const warnings      = report?.warnings      || {};
  const sanityChecks  = report?.sanityChecks  || {};

  const hasDataWarning =
    !!report &&
    (
      (Array.isArray(warnings.messages) && warnings.messages.length > 0) ||
      (warnings.missingPrice    > 0) ||
      (warnings.missingInterval > 0) ||
      (warnings.missingRenewal  > 0) ||
      (sanityChecks.passed === false)
    );

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
  if (userError) return <ErrorCard message={`${t("userReport.errorLoadingUser")}: ${userError.message}`} />;
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
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-white/10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 rounded bg-white/10" />
            <div className="h-24 rounded bg-white/10" />
            <div className="h-24 rounded bg-white/10" />
            <div className="h-24 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorCard message={t("userReport.errorLoadingReport")} onRetry={refetch} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <ErrorCard message={t("userReport.errorLoadingReport")} onRetry={refetch} />
      </div>
    );
  }

  const handleSort = (column) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('desc'); }
  };

  const lastUpdated = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleString()
    : new Date().toLocaleString();

  // ── CSV export — V3 canonical schema ─────────────────────────────────────
  function exportCSV() {
    const metricRows = [
      ['Metric', 'Value'],
      // Accounts
      ['--- ACCOUNTS ---', ''],
      ['Total Accounts',           accounts.total    ?? 0],
      ['Paid Accounts',            accounts.paid     ?? 0],
      ['Free Accounts',            accounts.free     ?? 0],
      ['Paid %',                   `${accounts.paidPct ?? 0}%`],
      ['Signup Source — Web',      accounts.signupSources?.web         ?? 0],
      ['Signup Source — Apple',    accounts.signupSources?.apple       ?? 0],
      ['Signup Source — Google Play', accounts.signupSources?.googlePlay ?? 0],
      ['Signup Source — Unknown',  accounts.signupSources?.unknown     ?? 0],
      ['New Accounts — Today',     accounts.newAccounts?.today   ?? 0],
      ['New Accounts — This Week', accounts.newAccounts?.week    ?? 0],
      ['New Accounts — This Month', accounts.newAccounts?.month  ?? 0],
      ['New Accounts — This Quarter', accounts.newAccounts?.quarter ?? 0],
      ['New Accounts — This Year', accounts.newAccounts?.year    ?? 0],
      // Subscriptions
      ['--- SUBSCRIPTIONS ---', ''],
      ['Total Active Paid Subscriptions', subscriptions.totalActivePaid ?? 0],
      ['Monthly Subscriptions',          subscriptions.monthly ?? 0],
      ['Annual Subscriptions',           subscriptions.annual  ?? 0],
      ['PipeKeeper',                     subscriptions.byProduct?.pipekeeper    ?? 0],
      ['WhiskeyKeeper',                  subscriptions.byProduct?.whiskeykeeper ?? 0],
      ['CigarKeeper',                    subscriptions.byProduct?.cigarkeeper   ?? 0],
      ['WineKeeper',                     subscriptions.byProduct?.winekeeper    ?? 0],
      ['Bundles',                        subscriptions.byProduct?.bundles       ?? 0],
      // Run Rate
      ['--- RUN RATE ---', ''],
      ['MRR',  `$${(runRate.mrr ?? 0).toFixed(2)}`],
      ['ARR',  `$${(runRate.arr ?? 0).toFixed(2)}`],
      // Renewal Revenue
      ['--- RENEWAL REVENUE ---', ''],
      ['Renewal Revenue — This Week (customers)',      renewalRevenue.week?.customers     ?? 0],
      ['Renewal Revenue — This Week (subs)',           renewalRevenue.week?.subscriptions ?? 0],
      ['Renewal Revenue — This Week ($)',             `$${(renewalRevenue.week?.revenue    ?? 0).toFixed(2)}`],
      ['Renewal Revenue — This Month (customers)',     renewalRevenue.month?.customers     ?? 0],
      ['Renewal Revenue — This Month (subs)',          renewalRevenue.month?.subscriptions ?? 0],
      ['Renewal Revenue — This Month ($)',            `$${(renewalRevenue.month?.revenue   ?? 0).toFixed(2)}`],
      ['Renewal Revenue — This Quarter (customers)',   renewalRevenue.quarter?.customers     ?? 0],
      ['Renewal Revenue — This Quarter (subs)',        renewalRevenue.quarter?.subscriptions ?? 0],
      ['Renewal Revenue — This Quarter ($)',          `$${(renewalRevenue.quarter?.revenue  ?? 0).toFixed(2)}`],
      ['Renewal Revenue — This Year (customers)',      renewalRevenue.year?.customers     ?? 0],
      ['Renewal Revenue — This Year (subs)',           renewalRevenue.year?.subscriptions ?? 0],
      ['Renewal Revenue — This Year ($)',             `$${(renewalRevenue.year?.revenue   ?? 0).toFixed(2)}`],
      // User detail
      ['', ''],
      ['--- USER DETAIL ---', ''],
      ['tier', 'name', 'email', 'subscription_status', 'billing_interval', 'subscription_end', 'joined'],
    ];

    (report?.paid_users || []).forEach((u) => {
      metricRows.push([
        'paid',
        u.full_name || '',
        u.email || '',
        u.subscription_status || '',
        u.billing_interval || '',
        u.subscription_end ? new Date(u.subscription_end).toLocaleDateString() : '',
        u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
      ]);
    });
    (report?.free_users || []).forEach((u) => {
      metricRows.push([
        'free',
        u.full_name || '',
        u.email || '',
        u.subscription_status || '',
        '',
        '',
        u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
      ]);
    });

    const csv = metricRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `user-report-v3_${new Date().toISOString().slice(0, 10)}.csv`;
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
            {meta.reportVersion && (
              <span className="ml-2 opacity-60">· Report: {meta.reportVersion}</span>
            )}
            {meta.timezoneNote && (
              <span className="ml-2 opacity-60">· Date ranges: {meta.timezoneNote}</span>
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
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

          <Button onClick={exportCSV} variant="outline" className="w-full gap-2 sm:w-auto" disabled={!report}>
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

      {hasDataWarning && (
        <WarningsPanel warnings={warnings} sanityChecks={sanityChecks} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — ACCOUNTS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Accounts" icon={Users} accentColor="#60A5FA">
        {/* Top-level counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'all'  ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('all');  setShowPaidTable(true);  setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Users className="w-4 h-4" />Total Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.total ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('paid'); setShowPaidTable(true);  setShowFreeTable(false); }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Crown className="w-4 h-4" />Paid Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paid ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('free'); setShowPaidTable(false); setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><UserX className="w-4 h-4" />Free Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.free ?? 0}</p></CardContent>
          </Card>
          <Card className="min-w-0 break-words whitespace-normal">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Paid %</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paidPct ?? 0}%</p></CardContent>
          </Card>
        </div>

        {/* Signup sources */}
        <div>
          <p className="text-sm font-medium text-[#E0D8C8] mb-2">Signup Sources</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <MetricCard label="Web"         value={accounts.signupSources?.web         ?? 0} />
            <MetricCard label="Apple / iOS" value={accounts.signupSources?.apple       ?? 0} />
            <MetricCard label="Google Play" value={accounts.signupSources?.googlePlay  ?? 0} />
            <MetricCard label="Unknown"     value={accounts.signupSources?.unknown     ?? 0} />
          </div>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — NEW ACCOUNTS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="New Accounts" icon={CalendarDays} accentColor="#818CF8">
        <p className="text-xs text-[#E0D8C8]/50 mb-4">
          Based on account <code className="text-[#E0D8C8]/70">created_at</code> only.
          Each period is an independent UTC calendar window — counts are not necessarily cumulative.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <MetricCard label="Today"        value={accounts.newAccounts?.today   ?? 0} />
          <MetricCard label="This Week"    value={accounts.newAccounts?.week    ?? 0} />
          <MetricCard label="This Month"   value={accounts.newAccounts?.month   ?? 0} />
          <MetricCard label="This Quarter" value={accounts.newAccounts?.quarter ?? 0} />
          <MetricCard label="This Year"    value={accounts.newAccounts?.year    ?? 0} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — SUBSCRIPTIONS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Subscriptions" icon={Package} accentColor="#A78BFA">
        {/* Total counts + billing interval visual */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
          <MetricCard label="Total Active Paid Subscriptions" value={subscriptions.totalActivePaid ?? 0} sub="PipeKeeper only — all active paid records" />
        </div>
        <div className="mb-4">
          <BillingIntervalBar monthly={subscriptions.monthly} annual={subscriptions.annual} />
        </div>

        <SectionDivider label="By Product" />
        <p className="text-xs text-[#E0D8C8]/50 mb-3">
          PipeKeeper is the only active paid module. All other products show 0.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard label="PipeKeeper"    value={subscriptions.byProduct?.pipekeeper    ?? 0} />
          <MetricCard label="WhiskeyKeeper" value={subscriptions.byProduct?.whiskeykeeper ?? 0} />
          <MetricCard label="CigarKeeper"   value={subscriptions.byProduct?.cigarkeeper   ?? 0} />
          <MetricCard label="WineKeeper"    value={subscriptions.byProduct?.winekeeper    ?? 0} />
          <MetricCard label="Bundles"       value={subscriptions.byProduct?.bundles       ?? 0} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — CURRENT RUN RATE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Current Run Rate" icon={DollarSign} accentColor="#34D399">
        <p className="text-xs text-[#E0D8C8]/50 mb-4">
          MRR = sum(monthly prices) + sum(annual prices ÷ 12). ARR = MRR × 12.
          Only subs with known billing interval and non-zero price are included.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard label="MRR" value={`$${(runRate.mrr ?? 0).toFixed(2)}`} sub="Monthly Recurring Revenue" uncertain={hasDataWarning} />
          <MetricCard label="ARR" value={`$${(runRate.arr ?? 0).toFixed(2)}`} sub="MRR × 12"                  uncertain={hasDataWarning} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — RENEWAL REVENUE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Renewal Revenue" icon={TrendingUp} accentColor="#F59E0B">
        <p className="text-xs text-[#E0D8C8]/50 mb-4">
          Actual billed price for subscriptions whose renewal date falls in each calendar period.
          This is upcoming charges — not run-rate.
        </p>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-sm font-medium text-[#E0D8C8]">Period</p>
            <div className="flex flex-wrap gap-1">
              {['week', 'month', 'quarter', 'year'].map((p) => (
                <Button key={p} variant={renewalsPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setRenewalsPeriod(p)} className="text-xs">
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
          </div>
          {(() => {
            const pd = renewalRevenue[renewalsPeriod] || {};
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard label="Renewing Customers"     value={pd.customers     ?? 0} sub="Unique accounts" />
                <MetricCard label="Renewing Subscriptions" value={pd.subscriptions ?? 0} sub="Subscription records" />
                <MetricCard label="Renewal Revenue"        value={`$${(pd.revenue ?? 0).toFixed(2)}`} sub="Actual billed amounts" />
              </div>
            );
          })()}
        </div>

        <SectionDivider label="All Periods" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Renewal Rev — This Week"    value={`$${(renewalRevenue.week?.revenue    ?? 0).toFixed(2)}`} />
          <MetricCard label="Renewal Rev — This Month"   value={`$${(renewalRevenue.month?.revenue   ?? 0).toFixed(2)}`} />
          <MetricCard label="Renewal Rev — This Quarter" value={`$${(renewalRevenue.quarter?.revenue ?? 0).toFixed(2)}`} />
          <MetricCard label="Renewal Rev — This Year"    value={`$${(renewalRevenue.year?.revenue    ?? 0).toFixed(2)}`} />
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
                    if (col === 'billing_interval')    return <span className="capitalize">{user.billing_interval || '-'}</span>;
                    if (col === 'subscription_end')    return user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : '-';
                    if (col === 'created_date')        return new Date(user.created_date).toLocaleDateString();
                    return user[col] || '-';
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
                    return user[col] || '-';
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

// ─── Warnings panel ──────────────────────────────────────────────────────────

function WarningsPanel({ warnings, sanityChecks }) {
  const [expanded, setExpanded] = useState(false);

  const items = [
    warnings.missingPrice    > 0 && `${warnings.missingPrice} paid sub(s) missing price — excluded from revenue`,
    warnings.missingInterval > 0 && `${warnings.missingInterval} paid sub(s) missing billing interval — excluded from MRR/ARR`,
    warnings.missingRenewal  > 0 && `${warnings.missingRenewal} paid sub(s) missing renewal date — excluded from renewal metrics`,
    ...(sanityChecks?.failures ?? []),
  ].filter(Boolean);

  return (
    <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-950/20 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-200">Data quality warnings</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{items.length}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-400/60" /> : <ChevronDown className="w-4 h-4 text-amber-400/60" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-amber-500/15">
          <p className="text-xs text-amber-200/50 pt-3 pb-1">
            Subs with missing price are counted but excluded from revenue.
            Subs with missing interval are counted but excluded from MRR/ARR.
          </p>
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400/50 shrink-0" />
              <p className="text-sm text-amber-200/75">{item}</p>
            </div>
          ))}
        </div>
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

function ErrorCard({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="p-6">
          <p className="text-rose-800">{message}</p>
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="mt-4 bg-rose-700 hover:bg-rose-800 text-white"
            >
              {t("userReport.retry", { defaultValue: "Retry" })}
            </Button>
          )}
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