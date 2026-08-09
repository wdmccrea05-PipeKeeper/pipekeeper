export function runReportingParityChecks({ userReport, reconciliationReport }) {
  const checks = [];

  const reportUsers = Number(userReport?.subscriptionStatus?.currentPayingUsers || 0);
  const reconUsers = Number(reconciliationReport?.reconciliationTotals?.matched_subscriptions || 0);
  const delta = Math.abs(reportUsers - reconUsers);
  const allowedDelta = Math.max(1, Math.floor(reportUsers * 0.25));
  checks.push({
    key: 'paying_users_vs_matched_subscriptions',
    left: reportUsers,
    right: reconUsers,
    pass: delta <= allowedDelta,
    message: delta <= allowedDelta
      ? 'Paying user and matched subscription counts are within parity bounds.'
      : 'Paying user and matched subscription counts are outside parity bounds.',
  });

  const unmatchedPaid = Number(reconciliationReport?.reliability?.unmatchedPaidTransactions || 0);
  const unmatchedTotals = Number(reconciliationReport?.reconciliationTotals?.unmatched_payments || 0);
  checks.push({
    key: 'unmatched_paid_consistency',
    left: unmatchedPaid,
    right: unmatchedTotals,
    pass: unmatchedPaid === unmatchedTotals,
    message: unmatchedPaid === unmatchedTotals
      ? 'Unmatched paid totals are consistent.'
      : 'Unmatched paid totals differ between reliability and totals.',
  });

  return {
    status: checks.every((check) => check.pass) ? 'pass' : 'warn',
    checks,
  };
}

export function findIntegrityFindings({ userReport }) {
  const findings = [];
  const dataQuality = userReport?.dataQuality || {};

  if ((dataQuality.unmatchedSubscriptions || 0) > 0) {
    findings.push('unmatched_subscriptions_present');
  }
  if ((dataQuality.syntheticIdentities || 0) > 0) {
    findings.push('synthetic_identities_present');
  }
  if ((dataQuality.duplicateContracts || 0) > 0) {
    findings.push('duplicate_contracts_present');
  }

  return findings;
}
