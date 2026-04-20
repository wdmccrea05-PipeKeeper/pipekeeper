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
import { buildDiagnosticsSampleGroups } from "@/lib/userReportDiagnostics";
import {
  formatUserReportDate,
  formatUserReportList,
  buildUserReportPlanSummary,
  buildUserReportBillingContextText,
  buildUserReportRenewalContextText,
} from "@/lib/userReportFormatters";

// ─── Small reusable components ────────────────────────────────────────────────

function MetricCard({ label, value, sub, uncertain = false }) {
  return (
    <div className="min-w-0 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider break-words flex items-center gap-1.5" style={{ color: 'rgba(224,216,200,0.65)' }}>
        {label}
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
      [t("userReport.csv.sections.accounts"), ''],
      [t("userReport.accounts.totalAccounts"), accounts.total ?? 0],
      [t("userReport.accounts.paidAccounts"), accounts.paid ?? 0],
      [t("userReport.accounts.freeAccounts"), accounts.free ?? 0],
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
      [t("userReport.csv.sections.subscriptions"), ''],
      [t("userReport.subscriptions.totalActivePaid"), subscriptions.totalActivePaid ?? 0],
      [t("userReport.subscriptions.monthlySubscriptions"), subscriptions.monthly ?? 0],
      [t("userReport.subscriptions.annualSubscriptions"), subscriptions.annual ?? 0],
      [t("userReport.subscriptions.pipekeeperSingles"), subscriptions.byProduct?.pipekeeper ?? 0],
      [t("userReport.subscriptions.whiskeykeeperSingles"), subscriptions.byProduct?.whiskeykeeper ?? 0],
      [t("userReport.subscriptions.cigarkeeperSingles"), subscriptions.byProduct?.cigarkeeper ?? 0],
      [t("userReport.subscriptions.winekeeperSingles"), subscriptions.byProduct?.winekeeper ?? 0],
      [t("userReport.subscriptions.bundles"), subscriptions.byProduct?.bundles ?? 0],
      [t("userReport.subscriptions.unknown"), subscriptions.byProduct?.unknown ?? 0],
      [t("userReport.subscriptions.moduleEffectivePipekeeper"), subscriptions.byModuleEffective?.pipekeeper ?? 0],
      [t("userReport.subscriptions.moduleEffectiveWhiskeykeeper"), subscriptions.byModuleEffective?.whiskeykeeper ?? 0],
      [t("userReport.subscriptions.moduleEffectiveCigarkeeper"), subscriptions.byModuleEffective?.cigarkeeper ?? 0],
      [t("userReport.subscriptions.moduleEffectiveWinekeeper"), subscriptions.byModuleEffective?.winekeeper ?? 0],
      [t("userReport.csv.sections.runRate"), ''],
      [t("userReport.runRate.mrr"), `$${(runRate.mrr ?? 0).toFixed(2)}`],
      [t("userReport.runRate.arr"), `$${(runRate.arr ?? 0).toFixed(2)}`],
      [t("userReport.csv.sections.renewalRevenue"), ''],
      [t("userReport.renewals.weekCustomers"), renewalRevenue.week?.customers ?? 0],
      [t("userReport.renewals.weekSubscriptions"), renewalRevenue.week?.subscriptions ?? 0],
      [t("userReport.renewals.weekRevenue"), `$${(renewalRevenue.week?.revenue ?? 0).toFixed(2)}`],
      [t("userReport.renewals.monthCustomers"), renewalRevenue.month?.customers ?? 0],
      [t("userReport.renewals.monthSubscriptions"), renewalRevenue.month?.subscriptions ?? 0],
      [t("userReport.renewals.monthRevenue"), `$${(renewalRevenue.month?.revenue ?? 0).toFixed(2)}`],
      [t("userReport.renewals.quarterCustomers"), renewalRevenue.quarter?.customers ?? 0],
      [t("userReport.renewals.quarterSubscriptions"), renewalRevenue.quarter?.subscriptions ?? 0],
      [t("userReport.renewals.quarterRevenue"), `$${(renewalRevenue.quarter?.revenue ?? 0).toFixed(2)}`],
      [t("userReport.renewals.yearCustomers"), renewalRevenue.year?.customers ?? 0],
      [t("userReport.renewals.yearSubscriptions"), renewalRevenue.year?.subscriptions ?? 0],
      [t("userReport.renewals.yearRevenue"), `$${(renewalRevenue.year?.revenue ?? 0).toFixed(2)}`],
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

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — ACCOUNTS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.accounts.sectionTitle")} icon={Users} accentColor="#60A5FA">
        {/* Top-level counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'all'  ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('all');  setShowPaidTable(true);  setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Users className="w-4 h-4" />{t("userReport.accounts.totalAccounts")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.total ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('paid'); setShowPaidTable(true);  setShowFreeTable(false); }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><Crown className="w-4 h-4" />{t("userReport.accounts.paidAccounts")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.paid ?? 0}</p></CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg min-w-0 break-words whitespace-normal ${viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''}`}
            onClick={() => { setViewFilter('free'); setShowPaidTable(false); setShowFreeTable(true);  }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2"><UserX className="w-4 h-4" />{t("userReport.accounts.freeAccounts")}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-[#F5F1E7]">{accounts.free ?? 0}</p></CardContent>
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
             <MetricCard label={t("userReport.accounts.signupWeb")} value={accounts.signupSources?.web ?? 0} />
             <MetricCard label={t("userReport.accounts.signupApple")} value={accounts.signupSources?.apple ?? 0} />
             <MetricCard label={t("userReport.accounts.signupGooglePlay")} value={accounts.signupSources?.googlePlay ?? 0} />
             <MetricCard label={t("userReport.accounts.signupUnknown")} value={accounts.signupSources?.unknown ?? 0} />
           </div>
         </div>
       </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — NEW ACCOUNTS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.newAccounts.sectionTitle")} icon={CalendarDays} accentColor="#818CF8">
        <p className="text-xs mb-4" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.newAccounts.description")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <MetricCard label={t("userReport.newAccounts.today")} value={accounts.newAccounts?.today ?? 0} />
          <MetricCard label={t("userReport.newAccounts.week")} value={accounts.newAccounts?.week ?? 0} />
          <MetricCard label={t("userReport.newAccounts.month")} value={accounts.newAccounts?.month ?? 0} />
          <MetricCard label={t("userReport.newAccounts.quarter")} value={accounts.newAccounts?.quarter ?? 0} />
          <MetricCard label={t("userReport.newAccounts.year")} value={accounts.newAccounts?.year ?? 0} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — SUBSCRIPTIONS
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.subscriptions.sectionTitle")} icon={Package} accentColor="#A78BFA">
        {/* Total counts + billing interval visual */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
          <MetricCard label={t("userReport.subscriptions.totalActivePaid")} value={subscriptions.totalActivePaid ?? 0} sub={t("userReport.subscriptions.totalActivePaidSub")} />
        </div>
        <div className="mb-4">
          <BillingIntervalBar monthly={subscriptions.monthly} annual={subscriptions.annual} t={t} />
        </div>

        <SectionDivider label={t("userReport.subscriptions.byProduct")} />
        <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.subscriptions.byProductDescription")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard label={t("userReport.subscriptions.pipekeeperSingles")} value={subscriptions.byProduct?.pipekeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.whiskeykeeperSingles")} value={subscriptions.byProduct?.whiskeykeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.cigarkeeperSingles")} value={subscriptions.byProduct?.cigarkeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.winekeeperSingles")} value={subscriptions.byProduct?.winekeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.bundles")} value={subscriptions.byProduct?.bundles ?? 0} />
          <MetricCard label={t("userReport.subscriptions.unknown")} value={subscriptions.byProduct?.unknown ?? 0} />
        </div>

        <SectionDivider label={t("userReport.subscriptions.moduleCoverage")} />
        <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.subscriptions.moduleCoverageDescription")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label={t("userReport.subscriptions.moduleEffectivePipekeeper")} value={subscriptions.byModuleEffective?.pipekeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.moduleEffectiveWhiskeykeeper")} value={subscriptions.byModuleEffective?.whiskeykeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.moduleEffectiveCigarkeeper")} value={subscriptions.byModuleEffective?.cigarkeeper ?? 0} />
          <MetricCard label={t("userReport.subscriptions.moduleEffectiveWinekeeper")} value={subscriptions.byModuleEffective?.winekeeper ?? 0} />
        </div>
      </SectionCard>

      <SectionCard title={t("userReport.diagnostics.sectionTitle")} icon={AlertTriangle} accentColor="#F87171">
        <SectionDivider label={t("userReport.diagnostics.integrity")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <MetricCard label={t("userReport.diagnostics.multipleActiveSubscriptions")} value={diagnostics.usersWithMultipleActiveSubscriptions ?? 0} />
          <MetricCard label={t("userReport.diagnostics.activeNoModules")} value={diagnostics.usersWithActiveSubscriptionNoPaidModules ?? 0} />
          <MetricCard label={t("userReport.diagnostics.modulesNoActive")} value={diagnostics.usersWithPaidModulesNoActiveSubscription ?? 0} />
          <MetricCard label={t("userReport.diagnostics.summaryRuntimeMismatch")} value={diagnostics.usersWithSummaryRuntimeMismatch ?? 0} />
          <MetricCard label={t("userReport.diagnostics.legacyFallback")} value={diagnostics.usersRelyingOnLegacyFallbackAccess ?? 0} />
          <MetricCard label={t("userReport.diagnostics.staleSync")} value={diagnostics.usersWithStaleSyncTimestamp ?? 0} />
        </div>
        <SectionDivider label={t("userReport.diagnostics.failuresOps")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard label={t("userReport.diagnostics.failedEntitlementSyncs")} value={diagnostics.failedEntitlementSyncs ?? 0} />
          <MetricCard label={t("userReport.diagnostics.failedStripeCallbacks")} value={diagnostics.failedStripeCallbacks ?? 0} />
          <MetricCard label={t("userReport.diagnostics.failedPurchases")} value={diagnostics.failedPurchases ?? diagnostics.failedCheckoutAttempts ?? 0} />
          <MetricCard label={t("userReport.diagnostics.failedRestoreAttempts")} value={diagnostics.failedRestoreAttempts ?? 0} />
          <MetricCard label={t("userReport.diagnostics.entitlementMismatches")} value={diagnostics.entitlementMismatches ?? diagnostics.usersWithSummaryRuntimeMismatch ?? 0} />
          <MetricCard label={t("userReport.diagnostics.importFailures")} value={diagnostics.importFailures ?? diagnostics.failedImportAttempts ?? 0} />
          <MetricCard label={t("userReport.diagnostics.scannerFailures")} value={diagnostics.scannerFailures ?? diagnostics.failedScannerAttempts ?? 0} />
          <MetricCard label={t("userReport.diagnostics.routeCrashes")} value={diagnostics.routeCrashes ?? diagnostics.failedRouteTransitions ?? 0} />
          <MetricCard label={t("userReport.diagnostics.multiPlanConflicts")} value={diagnostics.multiPlanConflicts ?? diagnostics.usersWithMultipleActiveSubscriptions ?? 0} />
          <MetricCard label={t("userReport.diagnostics.activeModuleStateDrift")} value={diagnostics.activeModuleStateDrift ?? diagnostics.usersWithActiveSubscriptionNoPaidModules ?? 0} />
          <MetricCard
            label={t("userReport.diagnostics.recentSubscriptionStateChanges")}
            value={diagnostics.recentSubscriptionStateChanges?.last7d ?? 0}
            sub={t("userReport.diagnostics.atRisk", { count: diagnostics.recentSubscriptionStateChanges?.atRisk ?? 0 })}
          />
          <MetricCard label={t("userReport.diagnostics.recentAdminOverrides")} value={diagnostics.recentAdminOverrides?.last7d ?? 0} sub={t("userReport.diagnostics.totalManual", { count: diagnostics.recentAdminOverrides?.totalManualSubscriptions ?? 0 })} />
        </div>
        <SectionDivider label={t("userReport.diagnostics.syncOutcomes")} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MetricCard label={t("userReport.diagnostics.syncOk")} value={diagnostics.recentSyncWriteOutcomes?.ok ?? 0} />
          <MetricCard label={t("userReport.diagnostics.syncNeeds")} value={diagnostics.recentSyncWriteOutcomes?.needs_sync ?? 0} />
          <MetricCard label={t("userReport.diagnostics.syncError")} value={diagnostics.recentSyncWriteOutcomes?.error ?? 0} />
          <MetricCard label={t("userReport.diagnostics.syncUnknown")} value={diagnostics.recentSyncWriteOutcomes?.unknown ?? 0} />
        </div>
        <SectionDivider label={t("userReport.diagnostics.sampleAnomalyAccounts")} />
        <DiagnosticsSamples diagnostics={diagnostics} />
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — CURRENT RUN RATE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.runRate.sectionTitle")} icon={DollarSign} accentColor="#34D399">
        <p className="text-xs mb-4" style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("userReport.runRate.description")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard label={t("userReport.runRate.mrr")} value={`$${(runRate.mrr ?? 0).toFixed(2)}`} sub={t("userReport.runRate.mrrSub")} uncertain={hasDataWarning} />
          <MetricCard label={t("userReport.runRate.arr")} value={`$${(runRate.arr ?? 0).toFixed(2)}`} sub={t("userReport.runRate.arrSub")} uncertain={hasDataWarning} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — RENEWAL REVENUE
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard title={t("userReport.renewals.sectionTitle")} icon={TrendingUp} accentColor="#F59E0B">
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
            const pd = renewalRevenue[renewalsPeriod] || {};
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
          <MetricCard label={t("userReport.renewals.weekRevenue")} value={`$${(renewalRevenue.week?.revenue ?? 0).toFixed(2)}`} />
          <MetricCard label={t("userReport.renewals.monthRevenue")} value={`$${(renewalRevenue.month?.revenue ?? 0).toFixed(2)}`} />
          <MetricCard label={t("userReport.renewals.quarterRevenue")} value={`$${(renewalRevenue.quarter?.revenue ?? 0).toFixed(2)}`} />
          <MetricCard label={t("userReport.renewals.yearRevenue")} value={`$${(renewalRevenue.year?.revenue ?? 0).toFixed(2)}`} />
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
