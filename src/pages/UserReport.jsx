import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search,
  ChevronDown, ChevronUp, Zap, Download,
  DollarSign, Package, AlertTriangle, Info
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
  const [newAccountsPeriod, setNewAccountsPeriod] = useState('month');
  const [renewalsPeriod, setRenewalsPeriod]   = useState('month');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn:  () => base44.auth.me(),
    retry: false,
  });

  const isAdmin = user?.role === 'admin';

  // ── Single canonical report query (V2) ───────────────────────────────────
  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['user-report-v2'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserSubscriptionReportV2');
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Derived data (V2 schema) ──────────────────────────────────────────────
  const accounts      = report?.accounts      || {};
  const subscriptions = report?.subscriptions || {};
  const revenue       = report?.revenue       || {};
  const renewals      = report?.renewals      || {};
  const conversion    = report?.conversion    || {};
  const _usage        = report?.usage         || {};
  const meta          = report?.meta          || {};
  const warnings      = report?.warnings      || {};
  const trialMetrics  = subscriptions.trialMetrics || {};

  // V2 subscription counts live under `subscriptions`, not `counts`
  const counts = {
    totalSubscriptions:   subscriptions.totalActivePaidSubscriptions,
    uniquePayingUsers:    subscriptions.uniquePayingUsers,
    monthlySubscriptions: subscriptions.monthlySubscriptions,
    annualSubscriptions:  subscriptions.annualSubscriptions,
  };

  // V2 product counts live under `subscriptions.byProduct`
  const products = subscriptions.byProduct || {};

  const hasDataWarning =
    !!report &&
    (
      (Array.isArray(warnings.messages) && warnings.messages.length > 0) ||
      (warnings.unclassifiedSubscriptions > 0) ||
      (warnings.unknownIntervals > 0) ||
      (warnings.missingAmounts > 0) ||
      (warnings.recordsExcluded > 0)
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

  // ── CSV export — V2 canonical schema ─────────────────────────────────────
  function exportCSV() {
    const metricRows = [
      // Accounts
      ['Metric', 'Value'],
      ['--- ACCOUNTS ---', ''],
      ['Total Accounts',                  accounts.totalUsers     ?? ''],
      ['Paid Accounts',                   accounts.paidUsers      ?? ''],
      ['Free Accounts',                   accounts.freeUsers      ?? ''],
      ['Paid %',                          `${accounts.paidPercentage ?? 0}%`],
      ['Signup Source — Web',             accounts.signupSources?.web         ?? ''],
      ['Signup Source — Apple',           accounts.signupSources?.apple       ?? ''],
      ['Signup Source — Google Play',     accounts.signupSources?.googlePlay  ?? ''],
      ['Signup Source — Unknown',         accounts.signupSources?.unknown     ?? ''],
      ['New Accounts (This Week)',         accounts.newAccounts?.week          ?? ''],
      ['New Accounts (This Month)',        accounts.newAccounts?.month         ?? ''],
      ['New Accounts (This Quarter)',      accounts.newAccounts?.quarter       ?? ''],
      ['New Accounts (This Year)',         accounts.newAccounts?.year          ?? ''],
      // Subscriptions — V2: from report.subscriptions
      ['--- SUBSCRIPTIONS ---', ''],
      ['Total Active Paid Subscriptions',           subscriptions.totalActivePaidSubscriptions ?? ''],
      ['Unique Paying Users',                       subscriptions.uniquePayingUsers            ?? ''],
      ['Monthly Subscriptions',                     subscriptions.monthlySubscriptions         ?? ''],
      ['Annual Subscriptions',                      subscriptions.annualSubscriptions          ?? ''],
      ['Paid Subs — PipeKeeper',                    subscriptions.byProduct?.pipekeeper        ?? ''],
      ['Paid Subs — WhiskeyKeeper',                 subscriptions.byProduct?.whiskeykeeper     ?? ''],
      ['Paid Subs — CigarKeeper',                   subscriptions.byProduct?.cigarkeeper       ?? ''],
      ['Paid Subs — WineKeeper',                    subscriptions.byProduct?.winekeeper        ?? ''],
      ['Paid Bundles — Founders',                   subscriptions.byBundle?.founders           ?? ''],
      ['Paid Bundles — 3-Module',                   subscriptions.byBundle?.threeModules       ?? ''],
      ['Paid Bundles — 4-Module',                   subscriptions.byBundle?.fourModules        ?? ''],
      // Renewals — V2: from report.renewals.{week,month,quarter,year}
      ['Renewing Customers (This Week)',             renewals.week?.customers                  ?? ''],
      ['Renewing Customers (This Month)',            renewals.month?.customers                 ?? ''],
      ['Renewing Customers (This Quarter)',          renewals.quarter?.customers               ?? ''],
      ['Renewing Customers (This Year)',             renewals.year?.customers                  ?? ''],
      ['Renewing Subscriptions (This Week)',         renewals.week?.subscriptions              ?? ''],
      ['Renewing Subscriptions (This Month)',        renewals.month?.subscriptions             ?? ''],
      ['Renewing Subscriptions (This Quarter)',      renewals.quarter?.subscriptions           ?? ''],
      ['Renewing Subscriptions (This Year)',         renewals.year?.subscriptions              ?? ''],
      ['Trials — Currently on Trial',               trialMetrics.currentlyOnTrial             ?? ''],
      ['Trials — Ending in 3 Days',                 trialMetrics.endingIn3Days                ?? ''],
      ['Trials — Ending in 7 Days',                 trialMetrics.endingIn7Days                ?? ''],
      ['Trials — Converted (30d)',                  trialMetrics.convertedLast30d             ?? ''],
      ['Trials — Drop-offs (30d)',                  trialMetrics.dropoffLast30d               ?? ''],
      // Revenue — V2: revenue.renewalRevenue, revenue.mrr/arr, revenue.byProduct/byBundle
      ['--- REVENUE ---', ''],
      ['Renewal Revenue (This Week)',             `$${(revenue.renewalRevenue?.week    ?? 0).toFixed(2)}`],
      ['Renewal Revenue (This Month)',            `$${(revenue.renewalRevenue?.month   ?? 0).toFixed(2)}`],
      ['Renewal Revenue (This Quarter)',          `$${(revenue.renewalRevenue?.quarter ?? 0).toFixed(2)}`],
      ['Renewal Revenue (This Year)',             `$${(revenue.renewalRevenue?.year    ?? 0).toFixed(2)}`],
      ['Current MRR',                             `$${(revenue.mrr ?? 0).toFixed(2)}`],
      ['Current ARR',                             `$${(revenue.arr ?? 0).toFixed(2)}`],
      ['Revenue by Product — PipeKeeper',            `$${(revenue.byProduct?.pipekeeper    ?? 0).toFixed(2)}`],
      ['Revenue by Product — WhiskeyKeeper',         `$${(revenue.byProduct?.whiskeykeeper ?? 0).toFixed(2)}`],
      ['Revenue by Product — CigarKeeper',           `$${(revenue.byProduct?.cigarkeeper   ?? 0).toFixed(2)}`],
      ['Revenue by Product — WineKeeper',            `$${(revenue.byProduct?.winekeeper    ?? 0).toFixed(2)}`],
      ['Revenue by Bundle — Founders',               `$${(revenue.byBundle?.founders       ?? 0).toFixed(2)}`],
      ['Revenue by Bundle — 3-Module',               `$${(revenue.byBundle?.threeModules   ?? 0).toFixed(2)}`],
      ['Revenue by Bundle — 4-Module',               `$${(revenue.byBundle?.fourModules    ?? 0).toFixed(2)}`],
      // Conversion
      ['--- CONVERSION ---', ''],
      ['Free → Paid (%)',                            `${conversion.freeToPaidPct              ?? 0}%`],
      ['Paid → Additional Modules (%)',              `${conversion.paidToAdditionalModulesPct ?? 0}%`],
      ['Paid → Free / Monthly Churn (%)',            `${conversion.paidToFreePct              ?? 0}%`],
      // Usage
      ['--- USAGE ---', ''],
      ['DAU — PipeKeeper',    'Not available'],
      ['DAU — WhiskeyKeeper', 'Not available'],
      ['DAU — CigarKeeper',   'Not available'],
      ['DAU — WineKeeper',    'Not available'],
      ['WAU — PipeKeeper',    'Not available'],
      ['WAU — WhiskeyKeeper', 'Not available'],
      ['WAU — CigarKeeper',   'Not available'],
      ['WAU — WineKeeper',    'Not available'],
      // User detail separator
      ['', ''],
      ['--- USER DETAIL ---', ''],
      ['tier', 'name', 'email', 'subscription_status', 'billing_interval', 'subscription_end', 'joined'],
    ];

    // Paid users
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
    // Free users
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
            {meta.dateRangeDefinition && (
              <span className="ml-2 opacity-60">· Date ranges: {meta.dateRangeDefinition}</span>
            )}
            {meta.reportVersion && (
              <span className="ml-2 opacity-60">· Report: {meta.reportVersion}</span>
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
        <WarningsPanel warnings={warnings} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — ACCOUNT METRICS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Accounts" icon={Users} accentColor="#60A5FA">
        {/* Top-level counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'all'  ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('all');  setShowPaidTable(true);  setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Users className="w-4 h-4" />Total Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.totalUsers ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('paid'); setShowPaidTable(true);  setShowFreeTable(false); }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Crown className="w-4 h-4" />Paid Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paidUsers ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('free'); setShowPaidTable(false); setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><UserX className="w-4 h-4" />Free Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.freeUsers ?? 0}</p></CardContent>
          </Card>
          <Card className="min-w-0 break-words whitespace-normal">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Paid %</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paidPercentage ?? 0}%</p></CardContent>
          </Card>
        </div>

        {/* New accounts by calendar period */}
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
            <p className="text-3xl font-bold text-[#F5F1E7]">{accounts.newAccounts?.[newAccountsPeriod] ?? 0}</p>
            <p className="text-sm text-[#E0D8C8]/60 mb-1">new accounts {periodLabels[newAccountsPeriod].toLowerCase()}</p>
          </div>
        </div>

        {/* Signup sources */}
        <div>
          <p className="text-sm font-medium text-[#E0D8C8] mb-2">Signup Sources</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="Web"         value={accounts.signupSources?.web         ?? 0} />
            <MetricCard label="Apple / iOS" value={accounts.signupSources?.apple       ?? 0} />
            <MetricCard label="Google Play" value={accounts.signupSources?.googlePlay  ?? 0} />
          </div>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — SUBSCRIPTION METRICS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Subscriptions" icon={Package} accentColor="#A78BFA">
        <>
            {/* Total counts + billing interval visual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <MetricCard label="Total Active Paid Subscriptions" value={counts.totalSubscriptions ?? 0} sub="Subscription records — not deduped by account" />
              <MetricCard label="Unique Paying Users" value={counts.uniquePayingUsers ?? 0} sub="Deduplicated by user identity" />
            </div>
            <div className="mb-4">
              <BillingIntervalBar monthly={counts.monthlySubscriptions} annual={counts.annualSubscriptions} />
            </div>

            <SectionDivider label="By Product" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <MetricCard label="PipeKeeper"    value={products.pipekeeper    ?? 0} />
              <MetricCard label="WhiskeyKeeper" value={products.whiskeykeeper ?? 0} />
              <MetricCard label="CigarKeeper"   value={products.cigarkeeper   ?? 0} />
              <MetricCard label="WineKeeper"    value={products.winekeeper    ?? 0} />
              <MetricCard label="Bundles (all)" value={subscriptions.byBundle
                ? (subscriptions.byBundle.founders + subscriptions.byBundle.threeModules + subscriptions.byBundle.fourModules)
                : 0}
              />
            </div>

            <SectionDivider label="By Bundle" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <MetricCard label="Founders Bundle"  value={subscriptions.byBundle?.founders     ?? 0} />
              <MetricCard label="3-Module Bundle"  value={subscriptions.byBundle?.threeModules ?? 0} />
              <MetricCard label="4-Module Bundle"  value={subscriptions.byBundle?.fourModules  ?? 0} />
            </div>

            <SectionDivider label="Renewals" />
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-sm font-medium text-[#E0D8C8]">Upcoming Renewals</p>
                <div className="flex flex-wrap gap-1">
                  {['week', 'month', 'quarter', 'year'].map((p) => (
                    <Button key={p} variant={renewalsPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setRenewalsPeriod(p)} className="text-xs">
                      {periodLabels[p]}
                    </Button>
                  ))}
                </div>
              </div>
              {(() => {
                // V2 schema: renewals.{week,month,quarter,year}
                const periodData = renewals[renewalsPeriod] || {};
                const renewalRevenue = revenue.renewalRevenue?.[renewalsPeriod] ?? 0;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <MetricCard label="Renewing Customers"     value={periodData.customers}     sub="Unique accounts" />
                    <MetricCard label="Renewing Subscriptions" value={periodData.subscriptions} sub="Subscription records" />
                    <MetricCard label="Renewal Revenue"        value={`$${renewalRevenue.toFixed(2)}`} sub="Upcoming charges" />
                  </div>
                );
              })()}
            </div>
        </>

        <SectionDivider label="Trials" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <MetricCard label="On Trial"           value={trialMetrics.currentlyOnTrial  ?? 0} />
          <MetricCard label="Avg Days Left"      value={trialMetrics.avgDaysRemaining  ?? 0} />
          <MetricCard label="Ending in 3 Days"   value={trialMetrics.endingIn3Days     ?? 0} />
          <MetricCard label="Ending in 7 Days"   value={trialMetrics.endingIn7Days     ?? 0} />
          <MetricCard label="Converted (30d)"    value={trialMetrics.convertedLast30d  ?? 0} />
          <MetricCard label="Drop-offs (30d)"    value={trialMetrics.dropoffLast30d    ?? 0} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — REVENUE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Revenue" icon={DollarSign} accentColor="#34D399">
            {/* MRR / ARR — run rate, most prominent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <MetricCard label="Current MRR" value={`$${(revenue.mrr ?? 0).toFixed(2)}`} sub="Monthly Recurring Revenue — classified subs only" uncertain={hasDataWarning} />
              <MetricCard label="Current ARR" value={`$${(revenue.arr ?? 0).toFixed(2)}`} sub="MRR × 12" uncertain={hasDataWarning} />
            </div>

            <SectionDivider label="Renewal Revenue" />
            <p className="text-xs text-[#E0D8C8]/50 mb-3">
              Sum of amounts for subscriptions renewing within each calendar period. Upcoming charges — not run-rate.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Renewal Revenue — This Week"    value={`$${(revenue.renewalRevenue?.week    ?? 0).toFixed(2)}`} />
              <MetricCard label="Renewal Revenue — This Month"   value={`$${(revenue.renewalRevenue?.month   ?? 0).toFixed(2)}`} />
              <MetricCard label="Renewal Revenue — This Quarter" value={`$${(revenue.renewalRevenue?.quarter ?? 0).toFixed(2)}`} />
              <MetricCard label="Renewal Revenue — This Year"    value={`$${(revenue.renewalRevenue?.year    ?? 0).toFixed(2)}`} />
            </div>

            <SectionDivider label="By Product" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <MetricCard label="PipeKeeper"    value={`$${(revenue.byProduct?.pipekeeper    ?? 0).toFixed(2)}`} />
              <MetricCard label="WhiskeyKeeper" value={`$${(revenue.byProduct?.whiskeykeeper ?? 0).toFixed(2)}`} />
              <MetricCard label="CigarKeeper"   value={`$${(revenue.byProduct?.cigarkeeper   ?? 0).toFixed(2)}`} />
              <MetricCard label="WineKeeper"    value={`$${(revenue.byProduct?.winekeeper    ?? 0).toFixed(2)}`} />
            </div>

            <SectionDivider label="By Bundle" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard label="Founders Bundle" value={`$${(revenue.byBundle?.founders     ?? 0).toFixed(2)}`} />
              <MetricCard label="3-Module Bundle"  value={`$${(revenue.byBundle?.threeModules ?? 0).toFixed(2)}`} />
              <MetricCard label="4-Module Bundle"  value={`$${(revenue.byBundle?.fourModules  ?? 0).toFixed(2)}`} />
            </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — CONVERSION
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Conversion" icon={TrendingUp} accentColor="#F59E0B">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            label="Free → Paid"
            value={`${conversion.freeToPaidPct ?? 0}%`}
            sub="% of all accounts currently paid"
          />
          <MetricCard
            label="Paid → Additional Modules"
            value={`${conversion.paidToAdditionalModulesPct ?? 0}%`}
            sub="% of paid accounts with multi-module subscription"
          />
          <MetricCard
            label="Paid → Free (Monthly Churn)"
            value={`${conversion.paidToFreePct ?? 0}%`}
            sub="Cancellations in past 30 days / active subscriptions"
          />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — USAGE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Usage" icon={Zap} accentColor="#94A3B8">
        <div className="flex items-start gap-3 p-4 rounded-lg border border-[#8b6239]/20 bg-[#2a1f18]/40">
          <Info className="w-4 h-4 text-[#E0D8C8]/40 shrink-0 mt-0.5" />
          <p className="text-sm text-[#E0D8C8]/55 leading-relaxed">
            Per-module activity events (DAU / WAU) are not tracked in the current data model.
            These metrics are intentionally omitted rather than estimated.
          </p>
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

function WarningsPanel({ warnings }) {
  const [expanded, setExpanded] = useState(false);
  const items = [
    warnings.unclassifiedSubscriptions > 0 && `${warnings.unclassifiedSubscriptions} subscription(s) unclassified — excluded from product and revenue metrics`,
    warnings.unknownIntervals > 0 && `${warnings.unknownIntervals} subscription(s) have unresolvable billing interval — excluded from MRR/ARR`,
    warnings.missingAmounts > 0 && `${warnings.missingAmounts} subscription(s) have missing/zero amount — contributing $0 to revenue`,
    warnings.recordsExcluded > 0 && `${warnings.recordsExcluded} record(s) excluded: no user identity found`,
    ...(Array.isArray(warnings.messages) ? warnings.messages : []),
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
          <p className="text-xs text-amber-200/50 pt-3 pb-1">Revenue and product metrics only include confidently classified records. Counts reflect all active subscriptions.</p>
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