import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search,
  ChevronDown, ChevronUp, Download, Info,
  DollarSign, Package, AlertTriangle, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { buildDiagnosticsSampleGroups } from "@/lib/userReportDiagnostics";
import {
  formatUserReportDate,
  formatUserReportList,
  buildUserReportPlanSummary,
  buildUserReportBillingContextText,
  buildUserReportRenewalContextText,
} from "@/lib/userReportFormatters";

// ─── Small reusable components ────────────────────────────────────────────────

function MetricCard({ label, value, sub, uncertain = false, tooltip }) {
  return (
    <div className="min-w-0 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider break-words flex items-center gap-1.5" style={{ color: 'rgba(224,216,200,0.65)' }}>
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center justify-center">
                <Info className="w-3 h-3 text-[#D4A574]/80" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
        {uncertain && <AlertTriangle className="w-3 h-3 text-amber-400/70 shrink-0" />}
      </p>
      <p className={`text-2xl font-bold mt-1 ${uncertain ? 'opacity-70' : ''}`} style={{ color: '#F5F1E7' }}>{value}</p>
      {sub && <p className="text-xs mt-1 break-words" style={{ color: 'rgba(224,216,200,0.5)' }}>{sub}</p>}
    </div>
  );
}

// Monthly vs annual side-by-side pair
function BillingIntervalBar({ monthly, annual, t }) {
  const total = (monthly || 0) + (annual || 0);
  const monthlyPct = total > 0 ? Math.round((monthly / total) * 100) : 0;
  const annualPct  = total > 0 ? 100 - monthlyPct : 0;
  return (
    <div className="rounded-xl border border-[#8b6239]/30 bg-[#2a1f18]/50 p-4">
      <p className="text-xs font-semibold text-[#E0D8C8]/70 uppercase tracking-wider mb-3">{t("userReport.subscriptions.billingIntervalSplit")}</p>
      <div className="flex gap-4 mb-3">
        <div className="flex-1 rounded-lg bg-[#2563eb]/15 border border-[#2563eb]/25 p-3 text-center">
          <p className="text-2xl font-bold text-[#93C5FD]">{monthly ?? 0}</p>
          <p className="text-xs text-[#93C5FD]/70 mt-0.5">{t("userReport.subscriptions.monthly")}</p>
        </div>
        <div className="flex-1 rounded-lg bg-[#16a34a]/15 border border-[#16a34a]/25 p-3 text-center">
          <p className="text-2xl font-bold text-[#86EFAC]">{annual ?? 0}</p>
          <p className="text-xs text-[#86EFAC]/70 mt-0.5">{t("userReport.subscriptions.annual")}</p>
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
          <span className="text-xs text-[#93C5FD]/60">{t("userReport.subscriptions.monthlyPct", { pct: monthlyPct })}</span>
          <span className="text-xs text-[#86EFAC]/60">{t("userReport.subscriptions.annualPct", { pct: annualPct })}</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, accentColor = '#8b6239', className = '' }) {
  return (
    <div
      className={`mb-8 rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(28,20,15,0.96), rgba(20,15,10,0.98))',
        border: '1px solid rgba(140,98,57,0.2)',
        borderLeft: `3px solid ${accentColor}60`,
      }}
    >
      <div className="px-6 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'rgba(140,98,57,0.15)' }}>
        {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />}
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ck-text)', letterSpacing: '0.08em' }}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
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
  const { t, lang } = useTranslation();

  const [viewFilter, setViewFilter]           = useState('all');
  const [searchQuery, setSearchQuery]         = useState('');
  const [showPaidTable, setShowPaidTable]     = useState(true);
  const [showFreeTable, setShowFreeTable]     = useState(true);
  const [sortColumn, setSortColumn]           = useState('created_date');
  const [sortDirection, setSortDirection]     = useState('desc');
  const [isSyncing, setIsSyncing]             = useState(false);
  const [renewalsPeriod, setRenewalsPeriod]   = useState('month');
  const DATE_COLUMNS = ['created_date', 'subscription_end', 'renewal_date', 'subscribe_date'];

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
  const diagnostics   = report?.diagnostics   || {};
  const meta          = report?.meta          || {};
  const warnings      = report?.warnings      || {};
  const sanityChecks  = report?.sanityChecks  || {};
  const layers        = report?.layers        || {};
  const reconciliation = report?.reconciliation || {};
  const layerAccounts = layers.accounts || {};
  const layerBilling  = layers.billingContracts || {};
  const layerModuleAccess = layers.moduleAccess || {};

  // Show the warnings panel when there are excluded-record counts.
  // warnings contains: missingPrice, missingInterval, missingPlatform, missingPlanKey, duplicatesRemoved.
  // Sanity check failures are internal-only and not surfaced here.
  const hasDataWarning =
    !!report &&
    (
      (warnings.missingPrice    > 0) ||
      (warnings.missingInterval > 0) ||
      (warnings.missingPlatform > 0) ||
      (warnings.missingPlanKey  > 0) ||
      (warnings.unknownProduct  > 0) ||
      (warnings.excludedCoreRecords > 0) ||
      (warnings.duplicatesRemoved > 0)
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
      if (DATE_COLUMNS.includes(sortColumn)) {
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
    <Card style={{ background: 'rgba(180,40,40,0.15)', border: '1px solid rgba(180,40,40,0.3)' }}>
      <CardContent className="p-6">
        <p className="text-[#F5A5A5] font-semibold">{t("userReport.unauthorized")}</p>
        <p className="text-[#F5A5A5]/70 text-sm mt-2">{t("userReport.adminAccessRequired")}</p>
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
    ? new Date(meta.generatedAt).toLocaleString(lang)
    : new Date().toLocaleString(lang);

  // ── CSV export — V3 canonical schema ─────────────────────────────────────
  function exportCSV() {
    const metricRows = [
      [t("userReport.csv.metric"), t("userReport.csv.value")],
      [t("userReport.csv.sections.layerA"), ''],
      [t("userReport.accounts.totalAccounts"), layerAccounts.totalAccounts ?? accounts.total ?? 0],
      [t("userReport.accounts.paidAccounts"), layerAccounts.paidAccounts ?? accounts.paid ?? 0],
      [t("userReport.accounts.freeAccounts"), layerAccounts.freeAccounts ?? accounts.free ?? 0],
      [t("userReport.accounts.paidPct"), `${accounts.paidPct ?? 0}%`],
      [t("userReport.accounts.signupWeb"), accounts.signupSources?.web ?? 0],
      [t("userReport.accounts.signupApple"), accounts.signupSources?.apple ?? 0],
      [t("userReport.accounts.signupGooglePlay"), accounts.signupSources?.googlePlay ?? 0],
      [t("userReport.accounts.signupUnknown"), accounts.signupSources?.unknown ?? 0],
      [t("userReport.newAccounts.today"), accounts.newAccounts?.today ?? 0],
      [t("userReport.newAccounts.week"), accounts.newAccounts?.week ?? 0],
      [t("userReport.newAccounts.month"), accounts.newAccounts?.month ?? 0],
      [t("userReport.newAccounts.quarter"), accounts.newAccounts?.quarter ?? 0],
      [t("userReport.newAccounts.year"), accounts.newAccounts?.year ?? 0],
      [t("userReport.csv.sections.layerB"), ''],
      [t("userReport.subscriptions.totalActivePaid"), layerBilling.activeSubscriptions ?? subscriptions.totalActivePaid ?? 0],
      [t("userReport.subscriptions.monthlySubscriptions"), layerBilling.monthlyContracts ?? subscriptions.monthly ?? 0],
      [t("userReport.subscriptions.annualSubscriptions"), layerBilling.annualContracts ?? subscriptions.annual ?? 0],
      [t("userReport.subscriptions.providerWeb"), layerBilling.providerCounts?.web ?? 0],
      [t("userReport.subscriptions.providerApple"), layerBilling.providerCounts?.ios ?? 0],
      [t("userReport.subscriptions.providerGoogle"), layerBilling.providerCounts?.google ?? 0],
      [t("userReport.subscriptions.pipekeeperSingles"), subscriptions.byProduct?.pipekeeper ?? 0],
      [t("userReport.subscriptions.whiskeykeeperSingles"), subscriptions.byProduct?.whiskeykeeper ?? 0],
      [t("userReport.subscriptions.cigarkeeperSingles"), subscriptions.byProduct?.cigarkeeper ?? 0],
      [t("userReport.subscriptions.winekeeperSingles"), subscriptions.byProduct?.winekeeper ?? 0],
      [t("userReport.subscriptions.bundles"), subscriptions.byProduct?.bundles ?? 0],
      [t("userReport.subscriptions.unknown"), subscriptions.byProduct?.unknown ?? 0],
      [t("userReport.runRate.mrr"), `$${((layerBilling.mrr ?? runRate.mrr ?? 0)).toFixed(2)}`],
      [t("userReport.runRate.arr"), `$${((layerBilling.arr ?? runRate.arr ?? 0)).toFixed(2)}`],
      [t("userReport.renewals.weekCustomers"), layerBilling.renewalRevenue?.week?.customers ?? renewalRevenue.week?.customers ?? 0],
      [t("userReport.renewals.weekSubscriptions"), layerBilling.renewalRevenue?.week?.subscriptions ?? renewalRevenue.week?.subscriptions ?? 0],
      [t("userReport.renewals.weekRevenue"), `$${((layerBilling.renewalRevenue?.week?.revenue ?? renewalRevenue.week?.revenue ?? 0)).toFixed(2)}`],
      [t("userReport.renewals.monthCustomers"), layerBilling.renewalRevenue?.month?.customers ?? renewalRevenue.month?.customers ?? 0],
      [t("userReport.renewals.monthSubscriptions"), layerBilling.renewalRevenue?.month?.subscriptions ?? renewalRevenue.month?.subscriptions ?? 0],
      [t("userReport.renewals.monthRevenue"), `$${((layerBilling.renewalRevenue?.month?.revenue ?? renewalRevenue.month?.revenue ?? 0)).toFixed(2)}`],
      [t("userReport.renewals.quarterCustomers"), layerBilling.renewalRevenue?.quarter?.customers ?? renewalRevenue.quarter?.customers ?? 0],
      [t("userReport.renewals.quarterSubscriptions"), layerBilling.renewalRevenue?.quarter?.subscriptions ?? renewalRevenue.quarter?.subscriptions ?? 0],
      [t("userReport.renewals.quarterRevenue"), `$${((layerBilling.renewalRevenue?.quarter?.revenue ?? renewalRevenue.quarter?.revenue ?? 0)).toFixed(2)}`],
      [t("userReport.renewals.yearCustomers"), layerBilling.renewalRevenue?.year?.customers ?? renewalRevenue.year?.customers ?? 0],
      [t("userReport.renewals.yearSubscriptions"), layerBilling.renewalRevenue?.year?.subscriptions ?? renewalRevenue.year?.subscriptions ?? 0],
      [t("userReport.renewals.yearRevenue"), `$${((layerBilling.renewalRevenue?.year?.revenue ?? renewalRevenue.year?.revenue ?? 0)).toFixed(2)}`],
      [t("userReport.csv.sections.layerC"), ''],
      [t("userReport.subscriptions.moduleEffectivePipekeeper"), layerModuleAccess.pipekeeperUsers ?? subscriptions.byModuleEffective?.pipekeeper ?? 0],
      [t("userReport.subscriptions.moduleEffectiveWhiskeykeeper"), layerModuleAccess.whiskeykeeperUsers ?? subscriptions.byModuleEffective?.whiskeykeeper ?? 0],
      [t("userReport.subscriptions.moduleEffectiveCigarkeeper"), layerModuleAccess.cigarkeeperUsers ?? subscriptions.byModuleEffective?.cigarkeeper ?? 0],
      [t("userReport.subscriptions.moduleEffectiveWinekeeper"), layerModuleAccess.winekeeperUsers ?? subscriptions.byModuleEffective?.winekeeper ?? 0],
      [t("userReport.subscriptions.bundleUsers"), layerModuleAccess.bundleUsers ?? 0],
      [t("userReport.subscriptions.totalModuleEntitlements"), layerModuleAccess.totalModuleEntitlements ?? 0],
      [t("userReport.csv.sections.quarantine"), ''],
      [t("userReport.subscriptions.unknown"), layerBilling.unknownQuarantine?.total ?? subscriptions.byProduct?.unknown ?? 0],
      [t("userReport.csv.sections.excludedRecords"), ''],
      [t("userReport.warnings.missingPrice"), warnings.missingPrice ?? 0],
      [t("userReport.warnings.missingInterval"), warnings.missingInterval ?? 0],
      [t("userReport.warnings.missingPlatform"), warnings.missingPlatform ?? 0],
      [t("userReport.warnings.missingPlanKey"), warnings.missingPlanKey ?? 0],
      [t("userReport.warnings.unknownProduct"), warnings.unknownProduct ?? 0],
      [t("userReport.warnings.excludedCoreRecords"), warnings.excludedCoreRecords ?? 0],
      [t("userReport.warnings.duplicatesRemoved"), warnings.duplicatesRemoved ?? 0],
      [t("userReport.csv.sections.diagnostics"), ''],
      [t("userReport.diagnostics.multipleActiveSubscriptions"), diagnostics.usersWithMultipleActiveSubscriptions ?? 0],
      [t("userReport.diagnostics.activeNoModules"), diagnostics.usersWithActiveSubscriptionNoPaidModules ?? 0],
      [t("userReport.diagnostics.modulesNoActive"), diagnostics.usersWithPaidModulesNoActiveSubscription ?? 0],
      [t("userReport.diagnostics.summaryRuntimeMismatch"), diagnostics.usersWithSummaryRuntimeMismatch ?? 0],
      [t("userReport.diagnostics.legacyFallback"), diagnostics.usersRelyingOnLegacyFallbackAccess ?? 0],
      [t("userReport.diagnostics.staleSync"), diagnostics.usersWithStaleSyncTimestamp ?? 0],
      [t("userReport.diagnostics.failedEntitlementSyncs"), diagnostics.failedEntitlementSyncs ?? 0],
      [t("userReport.diagnostics.failedStripeCallbacks"), diagnostics.failedStripeCallbacks ?? 0],
      [t("userReport.diagnostics.failedRestoreAttempts"), diagnostics.failedRestoreAttempts ?? 0],
      ['', ''],
      [t("userReport.csv.sections.userDetail"), ''],
      [
        t("userReport.csv.tier"),
        t("userReport.name"),
        t("userReport.email"),
        t("userReport.status"),
        t("userReport.userTable.planSummary"),
        t("userReport.userTable.modules"),
        t("userReport.userTable.billingContext"),
        t("userReport.userTable.renewalContext"),
        t("userReport.joined"),
        t("userReport.userTable.effectivePlatform"),
      ],
    ];

    (report?.paid_users || []).forEach((u) => {
      metricRows.push([
        'paid',
        u.full_name || '',
        u.email || '',
        u.subscription_status || '',
        buildUserReportPlanSummary(u, t),
        (u.modules || []).join(', '),
        buildUserReportBillingContextText(u, t),
        buildUserReportRenewalContextText(u, t, lang),
        u.created_date ? formatUserReportDate(u.created_date, '-', lang) : '',
        u.platform || t("userReport.userTable.unknownValue"),
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
        '',
        '',
        u.created_date ? formatUserReportDate(u.created_date, '', lang) : '',
        '',
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
    toast.success(t("userReport.csv.exported"));
  }

  const periodLabels = {
    week: t("userReport.renewals.week"),
    month: t("userReport.renewals.month"),
    quarter: t("userReport.renewals.quarter"),
    year: t("userReport.renewals.year"),
  };
  const paidUserColumns = ['full_name', 'email', 'product', 'modules', 'billing_interval', 'renewal_date', 'subscription_status', 'created_date'];
  const paidUserHeaders = [
    t("userReport.name"),
    t("userReport.email"),
    t("userReport.userTable.planSummary"),
    t("userReport.userTable.modules"),
    t("userReport.userTable.billingContext"),
    t("userReport.userTable.renewalContext"),
    t("userReport.status"),
    t("userReport.joined"),
  ];

  return (
    <TooltipProvider>
    <div className="max-w-7xl mx-auto p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ck-page-title">{t("userReport.title")}</h1>
          <p className="text-xs text-[#e8d5b7]/60 mt-1">
            {t("userReport.lastUpdated")}: {lastUpdated}
            {meta.reportVersion && (
              <span className="ml-2 opacity-60">· {t("userReport.reportVersion")}: {meta.reportVersion}</span>
            )}
            {meta.timezoneNote && (
              <span className="ml-2 opacity-60">· {t("userReport.dateRanges")}: {meta.timezoneNote}</span>
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
            {t("userReport.exportCsv")}
          </Button>

          <Button
            onClick={() => { refetch(); toast.success(t("userReport.reportRefreshed")); }}
            variant="outline"
            className="w-full gap-2 sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            {t("userReport.refresh")}
          </Button>
        </div>
      </div>

      {hasDataWarning && (
        <WarningsPanel warnings={warnings} />
      )}

      <SectionCard title={t("userReport.layers.reconciliation")} icon={RefreshCw} accentColor="#F59E0B">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard label={t("userReport.reconciliation.beforeActiveRows")} value={reconciliation.before?.activePaidRows ?? 0} tooltip={t("userReport.metricTooltips.beforeCounts")} />
          <MetricCard label={t("userReport.reconciliation.beforeDedupedContracts")} value={reconciliation.before?.dedupedContracts ?? 0} tooltip={t("userReport.metricTooltips.beforeCounts")} />
          <MetricCard label={t("userReport.reconciliation.afterPaidAccounts")} value={reconciliation.after?.paidAccountsFromEntitlements ?? 0} tooltip={t("userReport.metricTooltips.afterCounts")} />
          <MetricCard label={t("userReport.reconciliation.afterResolvedContracts")} value={reconciliation.after?.resolvedBillingContracts ?? 0} tooltip={t("userReport.metricTooltips.afterCounts")} />
          <MetricCard label={t("userReport.reconciliation.afterEligibleContracts")} value={reconciliation.after?.financialEligibleContracts ?? 0} tooltip={t("userReport.metricTooltips.afterCounts")} />
          <MetricCard label={t("userReport.reconciliation.afterUnknownContracts")} value={reconciliation.after?.unknownPlanContracts ?? 0} tooltip={t("userReport.metricTooltips.afterCounts")} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — ACCOUNTS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.layers.layerA")} icon={Users} accentColor="#60A5FA">
        {/* Top-level counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'all'  ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('all');  setShowPaidTable(true);  setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Users className="w-4 h-4" />{t("userReport.accounts.totalAccounts")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{layerAccounts.totalAccounts ?? accounts.total ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('paid'); setShowPaidTable(true);  setShowFreeTable(false); }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Crown className="w-4 h-4" />{t("userReport.accounts.paidAccounts")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{layerAccounts.paidAccounts ?? accounts.paid ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('free'); setShowPaidTable(false); setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><UserX className="w-4 h-4" />{t("userReport.accounts.freeAccounts")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{layerAccounts.freeAccounts ?? accounts.free ?? 0}</p></CardContent>
          </Card>
          <Card className="min-w-0 break-words whitespace-normal">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><TrendingUp className="w-4 h-4" />{t("userReport.accounts.paidPct")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paidPct ?? 0}%</p></CardContent>
          </Card>
        </div>

        {/* Signup sources */}
        <div>
           <p className="text-sm font-medium mb-2" style={{ color: '#E0D8C8' }}>{t("userReport.accounts.signupSources")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
             <MetricCard label={t("userReport.accounts.signupWeb")} value={accounts.signupSources?.web ?? 0} tooltip={t("userReport.metricTooltips.signupSource")} />
             <MetricCard label={t("userReport.accounts.signupApple")} value={accounts.signupSources?.apple ?? 0} tooltip={t("userReport.metricTooltips.signupSource")} />
             <MetricCard label={t("userReport.accounts.signupGooglePlay")} value={accounts.signupSources?.googlePlay ?? 0} tooltip={t("userReport.metricTooltips.signupSource")} />
             <MetricCard label={t("userReport.accounts.signupUnknown")} value={accounts.signupSources?.unknown ?? 0} tooltip={t("userReport.metricTooltips.signupSource")} />
            </div>
          </div>
        </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — NEW ACCOUNTS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.layers.layerAAccountsGrowth")} icon={CalendarDays} accentColor="#818CF8">
        <p className="text-xs mb-4" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.newAccounts.description")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <MetricCard label={t("userReport.newAccounts.today")} value={accounts.newAccounts?.today ?? 0} tooltip={t("userReport.metricTooltips.newAccounts")} />
          <MetricCard label={t("userReport.newAccounts.week")} value={accounts.newAccounts?.week ?? 0} tooltip={t("userReport.metricTooltips.newAccounts")} />
          <MetricCard label={t("userReport.newAccounts.month")} value={accounts.newAccounts?.month ?? 0} tooltip={t("userReport.metricTooltips.newAccounts")} />
          <MetricCard label={t("userReport.newAccounts.quarter")} value={accounts.newAccounts?.quarter ?? 0} tooltip={t("userReport.metricTooltips.newAccounts")} />
          <MetricCard label={t("userReport.newAccounts.year")} value={accounts.newAccounts?.year ?? 0} tooltip={t("userReport.metricTooltips.newAccounts")} />
        </div>
      </SectionCard>

      <SectionCard title={t("userReport.layers.layerC")} icon={Package} accentColor="#38BDF8">
        <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.subscriptions.moduleCoverageDescription")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard label={t("userReport.subscriptions.moduleEffectivePipekeeper")} value={layerModuleAccess.pipekeeperUsers ?? subscriptions.byModuleEffective?.pipekeeper ?? 0} tooltip={t("userReport.metricTooltips.moduleUsers")} />
          <MetricCard label={t("userReport.subscriptions.moduleEffectiveWhiskeykeeper")} value={layerModuleAccess.whiskeykeeperUsers ?? subscriptions.byModuleEffective?.whiskeykeeper ?? 0} tooltip={t("userReport.metricTooltips.moduleUsers")} />
          <MetricCard label={t("userReport.subscriptions.moduleEffectiveCigarkeeper")} value={layerModuleAccess.cigarkeeperUsers ?? subscriptions.byModuleEffective?.cigarkeeper ?? 0} tooltip={t("userReport.metricTooltips.moduleUsers")} />
          <MetricCard label={t("userReport.subscriptions.moduleEffectiveWinekeeper")} value={layerModuleAccess.winekeeperUsers ?? subscriptions.byModuleEffective?.winekeeper ?? 0} tooltip={t("userReport.metricTooltips.moduleUsers")} />
          <MetricCard label={t("userReport.subscriptions.bundleUsers")} value={layerModuleAccess.bundleUsers ?? 0} tooltip={t("userReport.metricTooltips.bundleUsers")} />
          <MetricCard label={t("userReport.subscriptions.totalModuleEntitlements")} value={layerModuleAccess.totalModuleEntitlements ?? 0} tooltip={t("userReport.metricTooltips.totalModuleEntitlements")} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — SUBSCRIPTIONS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.layers.layerB")} icon={Package} accentColor="#A78BFA">
        {/* Total counts + billing interval visual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard label={t("userReport.subscriptions.totalActivePaid")} value={layerBilling.activeSubscriptions ?? subscriptions.totalActivePaid ?? 0} sub={t("userReport.subscriptions.totalActivePaidSub")} tooltip={t("userReport.metricTooltips.activeSubscriptions")} />
          <MetricCard label={t("userReport.subscriptions.providerWeb")} value={layerBilling.providerCounts?.web ?? 0} tooltip={t("userReport.metricTooltips.providerCounts")} />
          <MetricCard label={t("userReport.subscriptions.providerApple")} value={layerBilling.providerCounts?.ios ?? 0} tooltip={t("userReport.metricTooltips.providerCounts")} />
          <MetricCard label={t("userReport.subscriptions.providerGoogle")} value={layerBilling.providerCounts?.google ?? 0} tooltip={t("userReport.metricTooltips.providerCounts")} />
        </div>
        <div className="mb-4">
          <BillingIntervalBar monthly={layerBilling.monthlyContracts ?? subscriptions.monthly} annual={layerBilling.annualContracts ?? subscriptions.annual} t={t} />
        </div>

        <SectionDivider label={t("userReport.subscriptions.byProduct")} />
        <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.subscriptions.byProductDescription")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard label={t("userReport.subscriptions.pipekeeperSingles")} value={subscriptions.byProduct?.pipekeeper ?? 0} tooltip={t("userReport.metricTooltips.knownProductCounts")} />
          <MetricCard label={t("userReport.subscriptions.whiskeykeeperSingles")} value={subscriptions.byProduct?.whiskeykeeper ?? 0} tooltip={t("userReport.metricTooltips.knownProductCounts")} />
          <MetricCard label={t("userReport.subscriptions.cigarkeeperSingles")} value={subscriptions.byProduct?.cigarkeeper ?? 0} tooltip={t("userReport.metricTooltips.knownProductCounts")} />
          <MetricCard label={t("userReport.subscriptions.winekeeperSingles")} value={subscriptions.byProduct?.winekeeper ?? 0} tooltip={t("userReport.metricTooltips.knownProductCounts")} />
          <MetricCard label={t("userReport.subscriptions.bundles")} value={subscriptions.byProduct?.bundles ?? 0} tooltip={t("userReport.metricTooltips.knownProductCounts")} />
        </div>

        <SectionDivider label={t("userReport.subscriptions.quarantineSection")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label={t("userReport.subscriptions.unknown")} value={layerBilling.unknownQuarantine?.total ?? subscriptions.byProduct?.unknown ?? 0} tooltip={t("userReport.metricTooltips.unknownQuarantine")} />
          <MetricCard label={t("userReport.subscriptions.quarantineMissingPlan")} value={layerBilling.unknownQuarantine?.byReason?.missingPlanKey ?? 0} tooltip={t("userReport.metricTooltips.unknownQuarantine")} />
          <MetricCard label={t("userReport.subscriptions.quarantineUnknownProduct")} value={layerBilling.unknownQuarantine?.byReason?.unknownProduct ?? 0} tooltip={t("userReport.metricTooltips.unknownQuarantine")} />
          <MetricCard label={t("userReport.subscriptions.quarantineUnmappedPlan")} value={layerBilling.unknownQuarantine?.byReason?.unmappedPlanKey ?? 0} tooltip={t("userReport.metricTooltips.unknownQuarantine")} />
        </div>
      </SectionCard>

      <SectionCard title={t("userReport.diagnostics.sectionTitle")} icon={AlertTriangle} accentColor="#F87171">
        <p className="text-xs mb-4" style={{ color: 'rgba(224,216,200,0.6)' }}>
          Entitlement drift — observational only. These counts do NOT affect KPIs. KPIs derive exclusively from the billing ledger.
        </p>
        <SectionDivider label="Entitlement Drift" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <MetricCard
            label="Active Contract, No Paid Flag"
            value={diagnostics.usersWithActiveContractNoPaidFlag ?? diagnostics.usersWithActiveSubscriptionNoPaidModules ?? 0}
            tooltip="User has an active billing contract but entitlement flags on the user record are not set."
          />
          <MetricCard
            label="Paid Flag, No Active Contract"
            value={diagnostics.usersWithPaidFlagNoActiveContract ?? diagnostics.usersWithPaidModulesNoActiveSubscription ?? 0}
            tooltip="Entitlement flags are set on the user record but no active subscription row exists. These users still have access via their flags but are flagged for sync."
          />
          <MetricCard
            label="Users With Multiple Contracts"
            value={diagnostics.usersWithMultipleContracts ?? diagnostics.usersWithMultipleActiveSubscriptions ?? 0}
            tooltip="User has more than one active trusted contract (e.g. module + bundle overlap)."
          />
        </div>
        {/* Sample anomaly emails */}
        {(() => {
          const groups = [
            { label: 'Active Contract, No Paid Flag', values: diagnostics.samples?.activeContractNoPaidFlag ?? diagnostics.samples?.activeNoModules ?? [] },
            { label: 'Paid Flag, No Active Contract', values: diagnostics.samples?.paidFlagNoActiveContract ?? diagnostics.samples?.modulesNoActiveSubscription ?? [] },
            { label: 'Multiple Contracts', values: diagnostics.samples?.multipleContracts ?? diagnostics.samples?.multipleActiveSubscriptions ?? [] },
          ].filter(g => g.values.length > 0);
          if (groups.length === 0) return (
            <p className="text-sm text-[#E0D8C8]/60">{t("userReport.diagnostics.noSampledAnomalyEmails")}</p>
          );
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {groups.map(g => (
                <div key={g.label} className="rounded-lg border border-[#8b6239]/20 bg-[#2a1f18]/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#E0D8C8]/70 mb-2">{g.label}</p>
                  {g.values.slice(0, 6).map(email => (
                    <p key={email} className="text-xs text-[#E0D8C8]/80 font-mono truncate">{email}</p>
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — CURRENT RUN RATE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.layers.layerBRunRate")} icon={DollarSign} accentColor="#34D399">
        <p className="text-xs mb-4" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.runRate.description")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard label={t("userReport.runRate.mrr")} value={`$${(layerBilling.mrr ?? runRate.mrr ?? 0).toFixed(2)}`} sub={t("userReport.runRate.mrrSub")} uncertain={hasDataWarning} tooltip={t("userReport.metricTooltips.mrr")} />
          <MetricCard label={t("userReport.runRate.arr")} value={`$${(layerBilling.arr ?? runRate.arr ?? 0).toFixed(2)}`} sub={t("userReport.runRate.arrSub")} uncertain={hasDataWarning} tooltip={t("userReport.metricTooltips.arr")} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — RENEWAL REVENUE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.layers.layerBRenewals")} icon={TrendingUp} accentColor="#F59E0B">
        <p className="text-xs mb-4" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.renewals.description")}
        </p>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-sm font-medium" style={{ color: '#E0D8C8' }}>{t("userReport.renewals.period")}</p>
            <div className="flex flex-wrap gap-1">
              {['week', 'month', 'quarter', 'year'].map((p) => (
                <Button key={p} variant={renewalsPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setRenewalsPeriod(p)} className="text-xs">
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
          </div>
          {(() => {
            const pd = layerBilling.renewalRevenue?.[renewalsPeriod] || renewalRevenue[renewalsPeriod] || {};
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard label={t("userReport.renewals.renewingCustomers")} value={pd.customers ?? 0} sub={t("userReport.renewals.uniqueAccounts")} />
                <MetricCard label={t("userReport.renewals.renewingSubscriptions")} value={pd.subscriptions ?? 0} sub={t("userReport.renewals.subscriptionRecords")} />
                <MetricCard label={t("userReport.renewals.renewalRevenue")} value={`$${(pd.revenue ?? 0).toFixed(2)}`} sub={t("userReport.renewals.actualBilledAmounts")} />
              </div>
            );
          })()}
        </div>

        <SectionDivider label={t("userReport.renewals.allPeriods")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label={t("userReport.renewals.weekRevenue")} value={`$${((layerBilling.renewalRevenue?.week?.revenue ?? renewalRevenue.week?.revenue ?? 0)).toFixed(2)}`} tooltip={t("userReport.metricTooltips.renewalRevenue")} />
          <MetricCard label={t("userReport.renewals.monthRevenue")} value={`$${((layerBilling.renewalRevenue?.month?.revenue ?? renewalRevenue.month?.revenue ?? 0)).toFixed(2)}`} tooltip={t("userReport.metricTooltips.renewalRevenue")} />
          <MetricCard label={t("userReport.renewals.quarterRevenue")} value={`$${((layerBilling.renewalRevenue?.quarter?.revenue ?? renewalRevenue.quarter?.revenue ?? 0)).toFixed(2)}`} tooltip={t("userReport.metricTooltips.renewalRevenue")} />
          <MetricCard label={t("userReport.renewals.yearRevenue")} value={`$${((layerBilling.renewalRevenue?.year?.revenue ?? renewalRevenue.year?.revenue ?? 0)).toFixed(2)}`} tooltip={t("userReport.metricTooltips.renewalRevenue")} />
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
                    columns={paidUserColumns}
                    headers={paidUserHeaders}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    emptyMessage={searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noPaidUsersFound")}
                  renderCell={(col, user) => {
                    if (col === 'subscription_status') return <Badge className="bg-[#B48C4B]/20 text-[#F5F1E7] border border-[#B48C4B]/40">{user.subscription_status}</Badge>;
                    if (col === 'billing_interval') return (
                      <div className="space-y-0.5">
                        <p className="text-xs text-[#E0D8C8]/85">{t("userReport.userTable.primaryBillingProduct", { product: user.primary_billing_product || t("userReport.userTable.unknownValue") })}</p>
                        <p className="text-xs text-[#E0D8C8]/70">{t("userReport.userTable.primaryBillingStatus", { status: user.primary_billing_status || t("userReport.userTable.unknownValue") })}</p>
                        <p className="text-xs text-[#E0D8C8]/70">{t("userReport.userTable.effectiveBillingIntervals", { intervals: formatUserReportList(user.active_billing_intervals) })}</p>
                        <p className="text-xs text-[#E0D8C8]/70">{t("userReport.userTable.effectivePlatforms", { platforms: formatUserReportList(user.active_platforms) })}</p>
                      </div>
                    );
                    if (col === 'product') return (
                      <div className="space-y-0.5">
                        <span className="text-[#D4A574] font-medium">
                          {buildUserReportPlanSummary(user, t)}
                        </span>
                        {Array.isArray(user.active_products) && user.active_products.length > 1 && (
                          <p className="text-xs text-[#E0D8C8]/60 truncate">{user.active_products.join(', ')}</p>
                        )}
                      </div>
                    );
                    if (col === 'modules') return Array.isArray(user.modules) && user.modules.length > 0
                      ? <span className="text-xs text-[#E0D8C8]/85">{user.modules.join(', ')}</span>
                      : '-';
                    if (col === 'renewal_date') {
                      const nextDate = user.renewal_next_date || user.renewal_date;
                      const totalAmount = (user.renewal_total_amount ?? user.renewal_amount ?? 0).toFixed(2);
                      return (
                        <div className="space-y-0.5">
                          <p className="text-xs text-[#E0D8C8]/85">
                            {t("userReport.userTable.multiPlanRenewalCount", { count: user.renewal_subscription_count ?? 0 })}
                          </p>
                          <p className="text-xs text-[#E0D8C8]/70">
                              {t("userReport.userTable.nextRenewalAt", { date: nextDate ? formatUserReportDate(nextDate, '-', lang) : t("userReport.userTable.noRenewalDate") })}
                          </p>
                          <p className="text-xs text-[#86EFAC]">
                            {t("userReport.userTable.totalRenewalAmount", { amount: totalAmount })}
                          </p>
                        </div>
                      );
                    }
                    if (col === 'created_date')        return user.created_date ? formatUserReportDate(user.created_date, '-', lang) : '-';
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
                    if (col === 'created_date')        return user.created_date ? formatUserReportDate(user.created_date, '-', lang) : '-';
                    return user[col] || '-';
                  }}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
    </TooltipProvider>
  );
}

// ─── Warnings panel ──────────────────────────────────────────────────────────

function WarningsPanel({ warnings }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Excluded-record counts — source-data quality issues after dedup.
  const dataQualityItems = [
    warnings.missingPrice > 0 && t("userReport.warningPanel.items.missingPrice", { count: warnings.missingPrice }),
    warnings.missingInterval > 0 && t("userReport.warningPanel.items.missingInterval", { count: warnings.missingInterval }),
    warnings.missingPlatform > 0 && t("userReport.warningPanel.items.missingPlatform", { count: warnings.missingPlatform }),
    warnings.missingPlanKey > 0 && t("userReport.warningPanel.items.missingPlanKey", { count: warnings.missingPlanKey }),
    warnings.unknownProduct > 0 && t("userReport.warningPanel.items.unknownProduct", { count: warnings.unknownProduct }),
    warnings.excludedCoreRecords > 0 && t("userReport.warningPanel.items.excludedCoreRecords", { count: warnings.excludedCoreRecords }),
    warnings.duplicatesRemoved > 0 && t("userReport.warningPanel.items.duplicatesRemoved", { count: warnings.duplicatesRemoved }),
  ].filter(Boolean);
  const unresolvedReasonGroups = [
    { key: 'missingPriceBySource', label: t("userReport.warningPanel.missingPriceReasons") },
    { key: 'missingIntervalBySource', label: t("userReport.warningPanel.missingIntervalReasons") },
    { key: 'unknownPlanKeyBySource', label: t("userReport.warningPanel.unknownPlanReasons") },
  ]
    .map((group) => {
      const rows = Object.entries(warnings?.unresolvedReasons?.[group.key] || {});
      return rows.length > 0 ? { ...group, rows } : null;
    })
    .filter(Boolean);
  const unresolvedSamples = Array.isArray(warnings?.unresolvedSamples) ? warnings.unresolvedSamples : [];

  const totalCount = dataQualityItems.length;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-950/20 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-200">{t("userReport.warningPanel.title")}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{totalCount}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-400/60" /> : <ChevronDown className="w-4 h-4 text-amber-400/60" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-amber-500/15">
          {dataQualityItems.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-amber-300/70 uppercase tracking-wider mb-1.5">
                {t("userReport.warningPanel.incompleteSourceRecords")}
              </p>
              <p className="text-xs text-amber-200/40 mb-2">
                {t("userReport.warningPanel.description")}
              </p>
              <div className="space-y-1.5">
                {dataQualityItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400/50 shrink-0" />
                    <p className="text-sm text-amber-200/75">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {unresolvedReasonGroups.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-amber-300/70 uppercase tracking-wider mb-2">
                {t("userReport.warningPanel.unresolvedSourceFailures")}
              </p>
              <div className="space-y-2">
                {unresolvedReasonGroups.map((group) => (
                  <div key={group.key} className="rounded-md border border-amber-500/20 bg-amber-900/10 p-2">
                    <p className="text-xs text-amber-200/75 mb-1">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.rows.slice(0, 4).map(([source, count]) => (
                        <p key={`${group.key}-${source}`} className="text-xs text-amber-200/60 font-mono">
                          {source}: {count}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {unresolvedSamples.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-amber-300/70 uppercase tracking-wider mb-2">
                {t("userReport.warningPanel.exceptionRows")}
              </p>
              <div className="space-y-2">
                {unresolvedSamples.slice(0, 6).map((sample, idx) => (
                  <div key={`${sample.rawId || sample.recordPath || idx}`} className="rounded-md border border-amber-500/20 bg-amber-900/10 p-2">
                    <p className="text-xs text-amber-200/80 font-mono break-all">{sample.recordPath}</p>
                    <p className="text-xs text-amber-200/65 mt-1">
                      {(sample.missingFields || []).join(', ') || t("userReport.warningPanel.unknownReason")}
                    </p>
                    <p className="text-[11px] text-amber-200/55 font-mono mt-1 break-all">
                      {`price=${sample?.failedSources?.price || 'unresolved:none'} | interval=${sample?.failedSources?.billingInterval || 'unresolved:none'} | plan=${sample?.failedSources?.planKey || 'unresolved:none'}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function DiagnosticsSamples({ diagnostics }) {
  const { t } = useTranslation();
  const groups = buildDiagnosticsSampleGroups(diagnostics, { translate: t });
  if (groups.length === 0) {
    return <p className="text-sm text-[#E0D8C8]/60">{t("userReport.diagnostics.noSampledAnomalyEmails")}</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {groups.map((group) => (
        <div key={group.labelKey} className="rounded-lg border border-[#8b6239]/20 bg-[#2a1f18]/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E0D8C8]/70 mb-2">{group.label}</p>
          <div className="space-y-1">
            {group.values.slice(0, 6).map((email) => (
              <p key={`${group.labelKey}-${email}`} className="text-xs text-[#E0D8C8]/80 font-mono truncate">{email}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
      <Card style={{ background: 'rgba(180,40,40,0.15)', border: '1px solid rgba(180,40,40,0.3)' }}>
        <CardContent className="p-6">
          <p className="text-[#F5A5A5]">{message}</p>
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="mt-4 bg-rose-700 hover:bg-rose-800 text-white"
            >
              {t("userReport.retry")}
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