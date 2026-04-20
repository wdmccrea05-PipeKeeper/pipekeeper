export function formatUserReportDate(value, fallback = '-', locale) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString(locale);
}

export function formatUserReportList(values, fallback = '-') {
  return Array.isArray(values) && values.length > 0 ? values.join(', ') : fallback;
}

export function buildUserReportPlanSummary(user, t) {
  if (!user) return '-';
  if (user.has_multiple_active_plans) {
    return t('userReport.userTable.multiPlanLabel', { count: user.active_subscription_count ?? 0 });
  }
  return user.product || user.primary_billing_product || '-';
}

export function buildUserReportBillingContextText(user, t) {
  if (!user || (user.active_subscription_count ?? 0) === 0) return '-';
  const primaryProduct = user.primary_billing_product || t('userReport.userTable.unknownValue');
  const primaryStatus = user.primary_billing_status || t('userReport.userTable.unknownValue');
  const intervalSummary = user.billing_interval || t('userReport.userTable.unknownValue');
  const platformSummary = user.platform || t('userReport.userTable.unknownValue');
  return t('userReport.userTable.billingContextCsv', {
    primaryProduct,
    primaryStatus,
    intervalSummary,
    platformSummary,
  });
}

export function buildUserReportRenewalContextText(user, t, locale) {
  if (!user || (user.active_subscription_count ?? 0) === 0) return '-';
  const nextRenewalDate = formatUserReportDate(user.renewal_next_date || user.renewal_date, '-', locale);
  const totalAmount = (user.renewal_total_amount ?? user.renewal_amount ?? 0).toFixed(2);
  const renewalCount = user.renewal_subscription_count ?? 0;
  return t('userReport.userTable.renewalContextCsv', {
    renewalCount,
    nextRenewalDate,
    totalAmount,
  });
}
