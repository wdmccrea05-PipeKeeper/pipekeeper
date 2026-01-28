export function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function pickPrimarySubscription(subs, preferProvider) {
  const isActive = (s) => {
    const status = String(s?.status || "").toLowerCase();
    return status === "active" || status === "trialing";
  };

  const activeSubs = (Array.isArray(subs) ? subs : []).filter(isActive);
  
  if (!activeSubs.length) return null;

  // If preferProvider exists, pick that provider first
  if (preferProvider) {
    const preferred = activeSubs.find((s) => s.provider === preferProvider);
    if (preferred) return preferred;
  }

  // Pick the one with furthest current_period_end
  const sorted = [...activeSubs].sort((a, b) => {
    const timeA = a?.current_period_end ? Date.parse(a.current_period_end) : 0;
    const timeB = b?.current_period_end ? Date.parse(b.current_period_end) : 0;
    return timeB - timeA;
  });

  return sorted[0] || activeSubs[0];
}