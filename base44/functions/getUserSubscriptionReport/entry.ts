type Row = Record<string, any>;

function monthlyValue(amount: number, interval: string) {
  if (!amount) return 0;
  const i = (interval || '').toLowerCase();
  if (i.includes('year')) return amount / 12;
  return amount;
}

function uniq<T>(arr: T[]) {
  return [...new Set(arr)];
}

export default async function handler(_: any, { entities }: any) {
  const users = await entities.User.list();
  const subs = await entities.Subscription.list();

  const activeSubs = subs.filter((s: Row) =>
    ['active', 'trialing', 'paid'].includes((s.status || '').toLowerCase())
  );

  // BILLING CONTRACTS = one row per active contract
  const contracts = activeSubs.map((s: Row) => {
    const product = s.product || s.plan || s.plan_key || s.price_id || 'Unknown';

    const modules =
      s.modules ||
      (String(product).toLowerCase().includes('bundle')
        ? ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']
        : String(product).toLowerCase().includes('pipe')
          ? ['pipekeeper']
          : String(product).toLowerCase().includes('whiskey')
            ? ['whiskeykeeper']
            : String(product).toLowerCase().includes('cigar')
              ? ['cigarkeeper']
              : []);

    const amount = Number(s.amount || s.price || 0);

    return {
      id: s.id,
      user_id: s.user_id,
      provider: s.provider || 'unknown',
      product,
      modules,
      interval: s.interval || s.billing_interval || 'month',
      amount,
      monthly_value: monthlyValue(amount, s.interval || s.billing_interval),
      renewal_date: s.renewal_date || null,
    };
  });

  // ACCOUNTS = one row per user
  const paidUserIds = uniq(contracts.map((c: Row) => c.user_id));
  const totalAccounts = users.length;
  const paidAccounts = paidUserIds.length;
  const freeAccounts = totalAccounts - paidAccounts;

  // ENTITLEMENTS
  const entitlementUsers = {
    pipekeeper: new Set(),
    whiskeykeeper: new Set(),
    cigarkeeper: new Set(),
  };

  contracts.forEach((c: Row) => {
    const contractModules = Array.isArray(c.modules) ? c.modules : [];
    contractModules.forEach((m: string) => {
      if (m in entitlementUsers) {
        entitlementUsers[m as keyof typeof entitlementUsers].add(c.user_id);
      }
    });
  });

  const mrr = contracts.reduce((sum: number, c: Row) => sum + c.monthly_value, 0);
  const arr = mrr * 12;
  const unknownContracts = contracts.filter((c: Row) => c.product === 'Unknown').length;

  return {
    summary: {
      totalAccounts,
      paidAccounts,
      freeAccounts,
      paidPct: totalAccounts ? ((paidAccounts / totalAccounts) * 100).toFixed(1) : '0.0',
      activeContracts: contracts.length,
      mrr: Number(mrr.toFixed(2)),
      arr: Number(arr.toFixed(2)),
      unknownContracts,
    },
    modules: {
      pipekeeper: entitlementUsers.pipekeeper.size,
      whiskeykeeper: entitlementUsers.whiskeykeeper.size,
      cigarkeeper: entitlementUsers.cigarkeeper.size,
      totalEntitlements:
        entitlementUsers.pipekeeper.size +
        entitlementUsers.whiskeykeeper.size +
        entitlementUsers.cigarkeeper.size,
    },
    contracts,
  };
}
