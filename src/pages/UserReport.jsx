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
  DollarSign, Package
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/components/i18n/safeTranslation";

// ─── Small reusable components ────────────────────────────────────────────────

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

  // ── Single canonical report query ─────────────────────────────────────────
  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['user-report'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserReportSafe');
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const accounts      = report?.accounts      || {};
  const counts        = report?.counts        || {};
  const products      = report?.products      || {};
  const renewals      = report?.renewals      || {};
  const revenue       = report?.revenue       || {};
  const subscriptions = report?.subscriptions || {};
  const conversion    = report?.conversion    || {};
  const usage         = report?.usage         || {};
  const meta          = report?.meta          || {};
  const validation    = report?.validation    || {};
  const trialMetrics  = subscriptions.trialMetrics || {};

  // DATA ERROR: report loaded but validation failed — financial metrics must not be shown
  const hasDataError = !!report && validation.passed === false;

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

  if (report.validation?.passed === false) {
    const errMsg =
      report.validation?.errors?.length
        ? report.validation.errors.join(", ")
        : t("userReport.errorLoadingReport");

    return (
      <div className="p-6">
        <ErrorCard message={errMsg} onRetry={refetch} />
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

  // ── CSV export — same canonical data as the page ──────────────────────────
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
      ['New Accounts (This Week)',         accounts.newAccounts?.week          ?? ''],
      ['New Accounts (This Month)',        accounts.newAccounts?.month         ?? ''],
      ['New Accounts (This Quarter)',      accounts.newAccounts?.quarter       ?? ''],
      ['New Accounts (This Year)',         accounts.newAccounts?.year          ?? ''],
      // Subscriptions
      ['--- SUBSCRIPTIONS ---', ''],
      ['Total Paid Subscriptions',                  counts.totalSubscriptions                  ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Unique Paying Users',                       counts.uniquePayingUsers                   ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Monthly Subscriptions',                     counts.monthlySubscriptions                ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Annual Subscriptions',                      counts.annualSubscriptions                 ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Paid Subs — PipeKeeper',                    products.pipekeeper                        ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Paid Subs — WhiskeyKeeper',                 products.whiskeykeeper                     ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Paid Subs — CigarKeeper',                   products.cigarkeeper                       ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Paid Subs — WineKeeper',                    products.winekeeper                        ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Paid Subs — Bundles',                       products.bundle                            ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Paid Bundles — Founders',                   subscriptions.paidByBundle?.founders       ?? ''],
      ['Paid Bundles — 3-Module',                   subscriptions.paidByBundle?.threeModules   ?? ''],
      ['Paid Bundles — 4-Module',                   subscriptions.paidByBundle?.fourModules    ?? ''],
      ['Renewing Customers (This Week)',             renewals.thisWeek?.customers               ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Customers (This Month)',            renewals.thisMonth?.customers              ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Customers (This Quarter)',          renewals.thisQuarter?.customers            ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Customers (This Year)',             renewals.thisYear?.customers               ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Subscriptions (This Week)',         renewals.thisWeek?.subscriptions           ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Subscriptions (This Month)',        renewals.thisMonth?.subscriptions          ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Subscriptions (This Quarter)',      renewals.thisQuarter?.subscriptions        ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Renewing Subscriptions (This Year)',         renewals.thisYear?.subscriptions           ?? (hasDataError ? 'DATA ERROR' : '')],
      ['Trials — Currently on Trial',               trialMetrics.currentlyOnTrial   ?? ''],
      ['Trials — Ending in 3 Days',                 trialMetrics.endingIn3Days      ?? ''],
      ['Trials — Ending in 7 Days',                 trialMetrics.endingIn7Days      ?? ''],
      ['Trials — Converted (30d)',                  trialMetrics.convertedLast30d   ?? ''],
      ['Trials — Drop-offs (30d)',                  trialMetrics.dropoffLast30d     ?? ''],
      // Revenue
      ['--- REVENUE ---', ''],
      ['Renewal Revenue (This Week)',             hasDataError ? 'DATA ERROR' : `$${(renewals.thisWeek?.revenue    ?? 0).toFixed(2)}`],
      ['Renewal Revenue (This Month)',            hasDataError ? 'DATA ERROR' : `$${(renewals.thisMonth?.revenue   ?? 0).toFixed(2)}`],
      ['Renewal Revenue (This Quarter)',          hasDataError ? 'DATA ERROR' : `$${(renewals.thisQuarter?.revenue ?? 0).toFixed(2)}`],
      ['Renewal Revenue (This Year)',             hasDataError ? 'DATA ERROR' : `$${(renewals.thisYear?.revenue    ?? 0).toFixed(2)}`],
      ['Current MRR',                             hasDataError ? 'DATA ERROR' : `$${(revenue.mrr ?? 0).toFixed(2)}`],
      ['Current ARR',                             hasDataError ? 'DATA ERROR' : `$${(revenue.arr ?? 0).toFixed(2)}`],
      ['Revenue by Product — PipeKeeper',            hasDataError ? 'DATA ERROR' : `$${(revenue.byProduct?.pipekeeper    ?? 0).toFixed(2)}`],
      ['Revenue by Product — WhiskeyKeeper',         hasDataError ? 'DATA ERROR' : `$${(revenue.byProduct?.whiskeykeeper ?? 0).toFixed(2)}`],
      ['Revenue by Product — CigarKeeper',           hasDataError ? 'DATA ERROR' : `$${(revenue.byProduct?.cigarkeeper   ?? 0).toFixed(2)}`],
      ['Revenue by Product — WineKeeper',            hasDataError ? 'DATA ERROR' : `$${(revenue.byProduct?.winekeeper    ?? 0).toFixed(2)}`],
      ['Revenue by Product — Bundle',                hasDataError ? 'DATA ERROR' : `$${(revenue.byProduct?.bundle        ?? 0).toFixed(2)}`],
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

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — ACCOUNT METRICS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Account Metrics" icon={Users}>
        {/* Top-level counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${viewFilter === 'all'  ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('all');  setShowPaidTable(true);  setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Users className="w-4 h-4" />Total Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.totalUsers ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('paid'); setShowPaidTable(true);  setShowFreeTable(false); }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Crown className="w-4 h-4" />Paid Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paidUsers ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('free'); setShowPaidTable(false); setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><UserX className="w-4 h-4" />Free Accounts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.freeUsers ?? 0}</p></CardContent>
          </Card>
          <Card>
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
      <SectionCard title="Subscription Metrics" icon={Package}>
        {/* DATA ERROR guard — shown when validation fails */}
        {hasDataError && (
          <div className="mb-4 p-4 rounded-lg border border-red-700/60 bg-red-900/20">
            <p className="text-red-300 font-bold text-sm mb-2">⚠ DATA ERROR — Subscription data failed validation</p>
            <p className="text-red-300/80 text-xs mb-2">
              Financial metrics cannot be displayed because one or more subscriptions could not be fully classified.
              Displaying partial or defaulted numbers would be misleading.
            </p>
            {validation.errors?.length > 0 && (
              <ul className="list-disc list-inside text-xs text-red-300/70 space-y-1 max-h-40 overflow-y-auto">
                {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        {!hasDataError && (
          <>
            {/* Total + billing interval */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <MetricCard label="Total Active Paid Subscriptions" value={counts.totalSubscriptions} sub="Subscription records — not deduped by account" />
              <MetricCard label="Unique Paying Users"   value={counts.uniquePayingUsers}    sub="Deduplicated by user identity" />
              <MetricCard label="Monthly Subscriptions" value={counts.monthlySubscriptions} sub="Active subs billed monthly" />
              <MetricCard label="Annual Subscriptions"  value={counts.annualSubscriptions}  sub="Active subs billed annually" />
            </div>

            {/* By product */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-2">Paid Subscriptions by Product</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard label="PipeKeeper"    value={products.pipekeeper}    />
              <MetricCard label="WhiskeyKeeper" value={products.whiskeykeeper} />
              <MetricCard label="CigarKeeper"   value={products.cigarkeeper}   />
              <MetricCard label="WineKeeper"    value={products.winekeeper}    />
              <MetricCard label="Bundles (all)" value={products.bundle}        />
            </div>

            {/* By bundle */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-2">Paid Subscriptions by Bundle</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <MetricCard label="Founders Bundle"  value={subscriptions.paidByBundle?.founders     ?? 0} />
              <MetricCard label="3-Module Bundle"  value={subscriptions.paidByBundle?.threeModules ?? 0} />
              <MetricCard label="4-Module Bundle"  value={subscriptions.paidByBundle?.fourModules  ?? 0} />
            </div>

            {/* Renewals */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-sm font-medium text-[#E0D8C8]">Renewing (upcoming in calendar period)</p>
                <div className="flex flex-wrap gap-1">
                  {['week', 'month', 'quarter', 'year'].map((p) => (
                    <Button key={p} variant={renewalsPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setRenewalsPeriod(p)} className="text-xs">
                      {periodLabels[p]}
                    </Button>
                  ))}
                </div>
              </div>
              {(() => {
                const periodKey = { week: 'thisWeek', month: 'thisMonth', quarter: 'thisQuarter', year: 'thisYear' }[renewalsPeriod];
                const periodData = renewals[periodKey] || {};
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <MetricCard label="Renewing Customers"     value={periodData.customers}     sub="Unique accounts" />
                    <MetricCard label="Renewing Subscriptions" value={periodData.subscriptions} sub="Subscription records" />
                    <MetricCard label="Renewal Revenue"        value={`$${(periodData.revenue ?? 0).toFixed(2)}`} sub="Upcoming charges" />
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* Trials — not part of strict financial pipeline, always shown */}
        <p className="text-sm font-medium text-[#E0D8C8] mb-2">Trial Metrics</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
      <SectionCard title="Revenue" icon={DollarSign}>
        {hasDataError ? (
          <div className="p-4 rounded-lg border border-red-700/60 bg-red-900/20">
            <p className="text-red-300 font-bold text-sm">⚠ DATA ERROR</p>
            <p className="text-red-300/80 text-xs mt-1">
              Revenue figures are unavailable because subscription data failed validation.
              See the Subscription Metrics section for details.
            </p>
          </div>
        ) : (
          <>
            {/* Renewal Revenue (Calendar Period) */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-1">
              Renewal Revenue (Calendar Period)
            </p>
            <p className="text-xs text-[#E0D8C8]/50 mb-3">
              Sum of amounts for subscriptions renewing before end of each calendar period. This is upcoming charges, not run-rate.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Renewal Revenue — This Week"    value={`$${(renewals.thisWeek?.revenue    ?? 0).toFixed(2)}`} />
              <MetricCard label="Renewal Revenue — This Month"   value={`$${(renewals.thisMonth?.revenue   ?? 0).toFixed(2)}`} />
              <MetricCard label="Renewal Revenue — This Quarter" value={`$${(renewals.thisQuarter?.revenue ?? 0).toFixed(2)}`} />
              <MetricCard label="Renewal Revenue — This Year"    value={`$${(renewals.thisYear?.revenue    ?? 0).toFixed(2)}`} />
            </div>

            {/* Current Run Rate (MRR / ARR) — separate concept from renewal revenue */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-1">Current Run Rate</p>
            <p className="text-xs text-[#E0D8C8]/50 mb-3">
              MRR = all active subscriptions normalized to a monthly amount. ARR = MRR × 12. Independent of calendar renewal amounts above.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <MetricCard label="Current MRR" value={`$${(revenue.mrr ?? 0).toFixed(2)}`} sub="Monthly Recurring Revenue" />
              <MetricCard label="Current ARR" value={`$${(revenue.arr ?? 0).toFixed(2)}`} sub="Annual Recurring Revenue (MRR × 12)" />
            </div>

            {/* By product */}
            <p className="text-sm font-medium text-[#E0D8C8] mb-2">
              Revenue by Product <span className="opacity-60 text-xs font-normal">(raw billing amounts; bundles attributed to bundle category)</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard label="PipeKeeper"    value={`$${(revenue.byProduct?.pipekeeper    ?? 0).toFixed(2)}`} />
              <MetricCard label="WhiskeyKeeper" value={`$${(revenue.byProduct?.whiskeykeeper ?? 0).toFixed(2)}`} />
              <MetricCard label="CigarKeeper"   value={`$${(revenue.byProduct?.cigarkeeper   ?? 0).toFixed(2)}`} />
              <MetricCard label="WineKeeper"    value={`$${(revenue.byProduct?.winekeeper    ?? 0).toFixed(2)}`} />
              <MetricCard label="Bundles"       value={`$${(revenue.byProduct?.bundle        ?? 0).toFixed(2)}`} />
            </div>
          </>
        )}
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — CONVERSION
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Conversion Metrics" icon={TrendingUp}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <SectionCard title="Usage Metrics" icon={Zap}>
        <div className="mb-3 p-3 rounded-lg border border-amber-800/30 bg-amber-900/10">
          <p className="text-xs text-amber-200/70">
            Per-module activity events are not tracked in the current data model.
            Daily / weekly active user counts by module are unavailable and will not be estimated.
          </p>
        </div>
        <p className="text-sm font-medium text-[#E0D8C8] mb-2">Daily Active Users by Module</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {['PipeKeeper', 'WhiskeyKeeper', 'CigarKeeper', 'WineKeeper'].map((m) => (
            <MetricCard key={m} label={m} value="N/A" sub="Not available" />
          ))}
        </div>
        <p className="text-sm font-medium text-[#E0D8C8] mb-2">Weekly Active Users by Module</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
