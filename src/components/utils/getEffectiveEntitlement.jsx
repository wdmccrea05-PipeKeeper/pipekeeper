export function getEffectiveEntitlement(user) {
  const tier = String(user?.entitlement_tier || "").trim().toLowerCase();
  if (tier === "pro") return "pro";
  if (tier === "premium") return "premium";
  return "free";
}