import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function UserReport() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('getUserSubscriptionReportV3', {});
      setData(response?.data ?? response);
    } catch (err) {
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportRows = useMemo(() => data?.payingUsersList || [], [data]);

  if (loading) return <div className="p-8 text-[#E0D8C8]">{t("auto.pages_UserReport.loading_user_report_1vmfno")}</div>;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-4">
        <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-4 text-red-300">
          {t("auto.pages_UserReport.failed_to_load_report_tcpc03")} {error}
        </div>
        <button onClick={load} className="px-4 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20">
          {t("auto.pages_UserReport.retry_3w08rf")}
        </button>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-[#E0D8C8]">{t("auto.pages_UserReport.no_report_data_returned_188n0t")}</div>;

  const accounts = data.accounts || {};
  const subscriptions = data.subscriptions || {};
  const revenue = data.revenue || {};
  const moduleCoverage = data.moduleCoverage || {};
  const renewals = data.renewals || {};
  const reconciliation = data.reconciliation || {};
  const forecast = data.forecast || {};
  const forecastAssumptions = forecast.assumptions || {};
  const forecastCommitted = forecast.committed || {};
  const forecastExpectedRenewal = forecast.expectedRenewal || {};
  const forecastNew = forecast.newRevenue || {};
  const forecastTotal = forecast.totalExpected || {};
  const reasonCounts = reconciliation.reasonCounts || {};
  const signupSources = accounts.signupSources || {};
  const newUsers = accounts.newUsers || {};

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <Header generatedAt={data.meta?.generatedAt} onRefresh={load} onExport={() => exportCsv(exportRows)} />

      <Section title={t("auto.pages_UserReport.a_accounts_1ht3uo")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title={t("auto.pages_UserReport.total_users_118p81")} value={accounts.totalUsers ?? 0} />
          <Card title={t("auto.pages_UserReport.paid_users_1rrawh")} value={accounts.paidUsers ?? 0} />
          <Card title={t("auto.pages_UserReport.free_users_5znd2x")} value={accounts.freeUsers ?? 0} />
          <Card title={t("auto.pages_UserReport.paid_1jxftr")} value={`${accounts.paidPercentage ?? 0}%`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Card title={t("auto.pages_UserReport.web_376ueb")} value={signupSources.web ?? 0} />
          <Card title={t("auto.pages_UserReport.apple_ios_1ox4jg")} value={signupSources.apple ?? 0} />
          <Card title={t("auto.pages_UserReport.google_play_18lrmk")} value={signupSources.google ?? 0} />
          <Card title={t("auto.pages_UserReport.unknown_source_tn0ojq")} value={signupSources.unknown ?? 0} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <Card title={t("auto.pages_UserReport.new_today_1h1bol")} value={newUsers.today ?? 0} />
          <Card title={t("auto.pages_UserReport.new_this_week_hu6xrn")} value={newUsers.week ?? 0} />
          <Card title={t("auto.pages_UserReport.new_this_month_k8m92l")} value={newUsers.month ?? 0} />
          <Card title={t("auto.pages_UserReport.new_this_quarter_135b4x")} value={newUsers.quarter ?? 0} />
          <Card title={t("auto.pages_UserReport.new_this_year_hu8h4o")} value={newUsers.year ?? 0} />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.b_run_rate_metrics_not_a_1xt13i")}>
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">{t("auto.pages_UserReport.mrr_and_arr_are_annualized_run_zgvp3x")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title={t("auto.pages_UserReport.active_paid_contracts_1wlj6p")} value={subscriptions.activePaidContracts ?? 0} />
          <Card title={t("auto.pages_UserReport.monthly_subs_1xmw3w")} value={subscriptions.monthly ?? 0} />
          <Card title={t("auto.pages_UserReport.annual_subs_1ead8h")} value={subscriptions.annual ?? 0} />
          <Card title="MRR" value={`$${formatMoney(revenue.mrr)}`} />
          <Card title={t("auto.pages_UserReport.arr_run_rate_1phl60")} value={`$${formatMoney(revenue.arr)}`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Card title={t("auto.pages_UserReport.known_revenue_rows_1277aa")} value={revenue.knownRevenueRows ?? 0} />
          <Card title={t("auto.pages_UserReport.unknown_product_1rgxgy")} value={reconciliation.unknownProductCount ?? 0} warn={(reconciliation.unknownProductCount ?? 0) > 0} />
          <Card title={t("auto.pages_UserReport.missing_interval_1hndpa")} value={reconciliation.missingIntervalCount ?? 0} warn={(reconciliation.missingIntervalCount ?? 0) > 0} />
          <Card title={t("auto.pages_UserReport.missing_amount_nt4zhv")} value={reconciliation.missingAmountCount ?? 0} warn={(reconciliation.missingAmountCount ?? 0) > 0} />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.b2_committed_renewal_revenue_8jm251")}>
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          {t("auto.pages_UserReport.exact_renewal_amounts_from_financially_eligible_q17nay")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ForecastCard title={t("auto.pages_UserReport.committed_next_30_days_18ctt5")} amount={forecastCommitted.next30?.revenue} sub={`${forecastCommitted.next30?.customers ?? 0} customers · ${forecastCommitted.next30?.subscriptions ?? 0} subs`} color="blue" />
          <ForecastCard title={t("auto.pages_UserReport.committed_next_90_days_ug1jko")} amount={forecastCommitted.next90?.revenue} sub={`${forecastCommitted.next90?.customers ?? 0} customers · ${forecastCommitted.next90?.subscriptions ?? 0} subs`} color="blue" />
          <ForecastCard title={t("auto.pages_UserReport.committed_next_12_months_4k424a")} amount={forecastCommitted.next365?.revenue} sub={`${forecastCommitted.next365?.customers ?? 0} customers · ${forecastCommitted.next365?.subscriptions ?? 0} subs`} color="blue" />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.b3_expected_revenue_forecast_115aif")}>
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          {t("auto.pages_UserReport.weighted_by_retention_probability_monthly_hpi1pz")} {(forecastAssumptions.monthlyRetention * 100).toFixed(0)}{t("auto.pages_UserReport.annual_12x29m")} {(forecastAssumptions.annualRetention * 100).toFixed(0)}{t("auto.pages_UserReport.plus_forecasted_new_subscription_revenue_1k71t4")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ForecastCard title={t("auto.pages_UserReport.expected_total_next_30_days_1ea6b4")} amount={forecastTotal.next30} color="green" />
          <ForecastCard title={t("auto.pages_UserReport.expected_total_next_90_days_10de1k")} amount={forecastTotal.next90} color="green" />
          <ForecastCard title={t("auto.pages_UserReport.expected_total_next_12_months_1tj38w")} amount={forecastTotal.next365} color="green" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <ForecastCard title={t("auto.pages_UserReport.expected_renewals_30d_54cw0j")} amount={forecastExpectedRenewal.next30} sub="weighted by retention" color="amber" />
          <ForecastCard title={t("auto.pages_UserReport.expected_renewals_90d_54d121")} amount={forecastExpectedRenewal.next90} sub="weighted by retention" color="amber" />
          <ForecastCard title={t("auto.pages_UserReport.expected_renewals_12m_54cue4")} amount={forecastExpectedRenewal.next365} sub="weighted by retention" color="amber" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <ForecastCard title={t("auto.pages_UserReport.new_revenue_30d_6k9v8k")} amount={forecastNew.next30} sub="new subs forecast" color="purple" />
          <ForecastCard title={t("auto.pages_UserReport.new_revenue_90d_6ka0a2")} amount={forecastNew.next90} sub="new subs forecast" color="purple" />
          <ForecastCard title={t("auto.pages_UserReport.new_revenue_12m_6k9tm5")} amount={forecastNew.next365} sub="new subs forecast" color="purple" />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.b4_forecast_assumptions_1bmfya")}>
        <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 text-xs text-[#E0D8C8]/80 space-y-1.5">
          <p><span className="text-[#D4A574] font-semibold">{t("auto.pages_UserReport.monthly_retention_x2crsy")}</span> {(forecastAssumptions.monthlyRetention * 100).toFixed(0)}{t("auto.pages_UserReport.probability_a_monthly_subscriber_renews_each_6ij47")}</p>
          <p><span className="text-[#D4A574] font-semibold">{t("auto.pages_UserReport.annual_retention_1o8elo")}</span> {(forecastAssumptions.annualRetention * 100).toFixed(0)}{t("auto.pages_UserReport.probability_an_annual_subscriber_renews_17qv2b")}</p>
          <p><span className="text-[#D4A574] font-semibold">{t("auto.pages_UserReport.new_revenue_method_bgk4is")}</span> {forecastAssumptions.newPaidMethod}</p>
          <p><span className="text-[#D4A574] font-semibold">{t("auto.pages_UserReport.new_paid_users_last_90d_thtizv")}</span> {forecastAssumptions.newPaidPer90Days}</p>
          <p><span className="text-[#D4A574] font-semibold">{t("auto.pages_UserReport.avg_new_paid_per_30d_600d77")}</span> {forecastAssumptions.newPaidPerDayLabel ?? forecastAssumptions.newPaidPer30Days ?? forecastAssumptions.newPaidPerDay}</p>
          <p><span className="text-[#D4A574] font-semibold">{t("auto.pages_UserReport.avg_first_billing_amount_zeau8q")}</span> ${formatMoney(forecastAssumptions.avgFirstBillingAmount)}</p>
          <p className="pt-1 text-[#E0D8C8]/40 italic">{t("auto.pages_UserReport.retention_assumptions_are_conservative_defaults__1fwf0a")}</p>
        </div>
        <BillingAuditPanel audit={forecastAssumptions.billingAudit} />
      </Section>

      <Section title={t("auto.pages_UserReport.c_product_mix_trusted_contracts_only_1wv9cd")}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title={t("auto.pages_UserReport.pipekeeper_1dclxa")} value={revenue.byProduct?.pipekeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.whiskeykeeper_1kgmc1")} value={revenue.byProduct?.whiskeykeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.cigarkeeper_1oz7i9")} value={revenue.byProduct?.cigarkeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.winekeeper_1w5l9t")} value={revenue.byProduct?.winekeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.bundle_1b9gsr")} value={revenue.byProduct?.bundle ?? 0} />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.d_module_coverage_uux1gp")}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title={t("auto.pages_UserReport.pipekeeper_access_11tf4n")} value={moduleCoverage.pipekeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.whiskeykeeper_access_qy9ws7")} value={moduleCoverage.whiskeykeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.cigarkeeper_access_ux8a7t")} value={moduleCoverage.cigarkeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.winekeeper_access_jc6286")} value={moduleCoverage.winekeeper ?? 0} />
          <Card title={t("auto.pages_UserReport.total_entitlements_4wqsg5")} value={moduleCoverage.totalModuleEntitlements ?? 0} />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.e_upcoming_renewals_15o0cn")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <RenewalCard title={t("auto.pages_UserReport.this_week_1j83it")} data={renewals.week} />
          <RenewalCard title={t("auto.pages_UserReport.this_month_1agkm9")} data={renewals.month} />
          <RenewalCard title={t("auto.pages_UserReport.this_quarter_13cmg0")} data={renewals.quarter} />
          <RenewalCard title={t("auto.pages_UserReport.this_year_1j8526")} data={renewals.year} />
        </div>
      </Section>

      <Section title={t("auto.pages_UserReport.f_exceptions_reconciliation_1uavix")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title={t("auto.pages_UserReport.duplicates_merged_1iuti9")} value={reconciliation.duplicatesMerged ?? 0} />
          <Card title={t("auto.pages_UserReport.manual_admin_no_contract_1amwbi")} value={reconciliation.manualAdminCount ?? 0} warn={(reconciliation.manualAdminCount ?? 0) > 0} />
          <Card title={t("auto.pages_UserReport.paid_accounts_locygz")} value={reconciliation.totalPaidAccounts ?? 0} />
          <Card title={t("auto.pages_UserReport.discrepancy_1tqafa")} value={reconciliation.discrepancy ?? 0} warn={(reconciliation.discrepancy ?? 0) > 0} />
        </div>
        <ExceptionTable
          title={`Unknown Product Rows (${reconciliation.unresolvedSamples?.unknownProduct?.length || 0} shown)`}
          rows={reconciliation.unresolvedSamples?.unknownProduct || []}
        />
        <ExceptionTable
          title={`Missing Interval Rows (${reconciliation.unresolvedSamples?.missingInterval?.length || 0} shown)`}
          rows={reconciliation.unresolvedSamples?.missingInterval || []}
        />
        <ExceptionTable
          title={`Missing Amount Rows (${reconciliation.unresolvedSamples?.missingAmount?.length || 0} shown)`}
          rows={reconciliation.unresolvedSamples?.missingAmount || []}
        />
      </Section>

      <Section title={`G. Paying Users (${exportRows.length})`}>
        <PayingUserTable rows={exportRows} />
      </Section>
    </div>
  );
}

function Header({ generatedAt, onRefresh, onExport }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F1E7]">{t("auto.pages_UserReport.user_subscription_report_1ehhg7")}</h1>
        {generatedAt ? (
          <p className="text-xs text-[#E0D8C8]/50 mt-1">{t("auto.pages_UserReport.generated_yyi5h0")} {new Date(generatedAt).toLocaleString()}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">
          {t("auto.pages_UserReport.refresh_183tk5")}
        </button>
        <button onClick={onExport} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">
          {t("auto.pages_UserReport.export_csv_1eliec")}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-[#D4A574] border-b border-[#8b6239]/25 pb-1">{title}</h2>
      {children}
    </div>
  );
}

function Card({ title, value, warn = false }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : 'text-[#F5F1E7]'}`}>{value}</p>
    </div>
  );
}

const FORECAST_COLORS = {
  blue:   'border-blue-700/40 bg-blue-900/10 text-blue-200',
  green:  'border-emerald-700/40 bg-emerald-900/10 text-emerald-200',
  amber:  'border-amber-700/40 bg-amber-900/10 text-amber-200',
  purple: 'border-purple-700/40 bg-purple-900/10 text-purple-200',
};

function ForecastCard({ title, amount, sub, color = 'blue' }) {
  const cls = FORECAST_COLORS[color] || FORECAST_COLORS.blue;
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-xs uppercase tracking-wider opacity-70">{title}</p>
      <p className="text-2xl font-semibold mt-1">${formatMoney(amount)}</p>
      {sub ? <p className="text-xs mt-1 opacity-60">{sub}</p> : null}
    </div>
  );
}

function RenewalCard({ title, data = {} }) {
  return (
    <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4">
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className="text-xl font-semibold text-[#F5F1E7] mt-1">${formatMoney(data.revenue)}</p>
      <p className="text-xs text-[#E0D8C8]/50 mt-1">{data.customers ?? 0} customers · {data.subscriptions ?? 0} subs</p>
    </div>
  );
}

function ExceptionTable({ title, rows }) {
  if (!rows || rows.length === 0) return null;
  const columns = ['id', 'user_id', 'user_email', 'provider', 'product_kind', 'price_id', 'billing_interval', 'amount', 'status'];
  return (
    <div className="space-y-2 mt-3">
      <p className="text-sm font-semibold text-yellow-300">{title}</p>
      <div className="rounded-xl border border-yellow-800/30 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#2a1f18]">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[#8b6239]/15">
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono max-w-[160px] truncate" title={String(row[c] ?? '')}>
                    {String(row[c] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayingUserTable({ rows }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#2a1f18]">
          <tr>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">{t("auto.pages_UserReport.email_3mzikt")}</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">{t("auto.pages_UserReport.product_9yz486")}</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">{t("auto.pages_UserReport.modules_es240u")}</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">{t("auto.pages_UserReport.status_1m8lgy")}</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">{t("auto.pages_UserReport.subs_yk33r6")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-[#E0D8C8]/50 text-center">{t("auto.pages_UserReport.no_paying_users_found_15j5dj")}</td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-[#E0D8C8]/90 font-mono text-xs">{row.email || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90">{row.canonicalProduct || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90 text-xs">{(row.modules || []).join(', ') || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90">{row.status || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90 text-center">{row.subscriptionCount ?? 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function BillingAuditPanel({ audit }) {
  const { t } = useTranslation();
  if (!audit) return null;
  return (
    <div className="rounded-xl border border-[#8b6239]/20 bg-[#1a1108]/60 p-4 mt-3 text-xs space-y-2">
      <p className="text-[#D4A574] font-semibold text-sm">{t("auto.pages_UserReport.avg_first_billing_audit_qwdnsz")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.unique_paying_users_67hihi")}</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">{audit.uniquePayingUsers}</p>
          <p className="text-[#E0D8C8]/40 mt-0.5">of {audit.totalEligibleRows} eligible rows</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.standard_price_rows_tk9hkk")}</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">{audit.standardPriceCount}</p>
          <p className="text-[#E0D8C8]/40 mt-0.5">&gt; ${audit.introPriceThreshold} threshold</p>
        </div>
        <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-3">
          <p className="text-yellow-300/70 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.intro_trial_price_rows_vahod6")}</p>
          <p className="text-yellow-200 text-lg font-semibold mt-0.5">{audit.introPriceCount}</p>
          <p className="text-yellow-300/40 mt-0.5">≤ ${audit.introPriceThreshold} {t("auto.pages_UserReport.excluded_from_avg_eji1g6")}</p>
        </div>
        <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-3">
          <p className="text-red-300/70 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.malformed_excluded_p0yxfd")}</p>
          <p className="text-red-200 text-lg font-semibold mt-0.5">{audit.excludedMalformedCount}</p>
          <p className="text-red-300/40 mt-0.5">no amount / interval / provider</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.avg_billing_amount_15r3fi")}</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.avgFirstBillingAmount)}</p>
          <p className="text-[#E0D8C8]/40 mt-0.5">{audit.avgSourceNote}</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.min_amount_1wjl4t")}</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.minAmount)}</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.max_amount_13blop")}</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.maxAmount)}</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">{t("auto.pages_UserReport.median_amount_ipgayv")}</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.medianAmount)}</p>
        </div>
      </div>
      {audit.introAmounts?.length > 0 && (
        <p className="text-yellow-300/60">{t("auto.pages_UserReport.intro_promo_amounts_found_sr0imi")} {audit.introAmounts.map((a) => `$${a}`).join(', ')}</p>
      )}
      {audit.excludedSamples?.length > 0 && (
        <div className="mt-2">
          <p className="text-red-300/70 font-semibold mb-1">{t("auto.pages_UserReport.excluded_malformed_samples_1no13s")}</p>
          <div className="space-y-0.5">
            {audit.excludedSamples.map((s, i) => (
              <p key={i} className="text-[#E0D8C8]/50 font-mono">
                {s.email || '(no email)'} · {s.provider} {t("auto.pages_UserReport.amt_1ea6u1")}{s.amount ?? 'null'} {t("auto.pages_UserReport.interval_1qvtev")}{s.interval ?? 'null'} · {s.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function exportCsv(rows) {
  const headers = ['email', 'canonicalProduct', 'modules', 'status', 'subscriptionCount'];
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        csvValue(row.email),
        csvValue(row.canonicalProduct),
        csvValue((row.modules || []).join('|')),
        csvValue(row.status),
        csvValue(row.subscriptionCount),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'user-subscription-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvValue(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}