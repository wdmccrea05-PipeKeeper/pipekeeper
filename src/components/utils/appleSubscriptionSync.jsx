import { base44 } from "@/api/base44Client";

function safeString(value) {
  return String(value || "").trim();
}

function normalizeTier(rawTier, productId) {
  const tier = safeString(rawTier).toLowerCase();
  const product = safeString(productId).toLowerCase();
  if (tier === "premium" || tier === "pro") return "pro";
  if (product.includes("pro")) return "pro";
  return "pro";
}

export function normalizeNativeAppleStatus(payload = {}) {
  const productId = safeString(payload.productId);
  const originalTransactionId = safeString(payload.originalTransactionId);
  const verificationProof = payload.verificationProof || null;
  const expiresAt = payload.expiresAt ? String(payload.expiresAt) : null;
  const active = !!payload.active;

  return {
    active,
    tier: normalizeTier(payload.tier, productId),
    productId,
    expiresAt,
    originalTransactionId,
    verificationProof,
  };
}

export async function syncAppleSubscriptionStatus(payload = {}, options = {}) {
  const normalized = normalizeNativeAppleStatus(payload);
  const invoke =
    options.invoke ||
    ((body) => base44.functions.invoke("syncAppleSubscriptionForMe", body));

  if (normalized.active && !normalized.originalTransactionId) {
    return { ok: false, skipped: true, reason: "missing_original_transaction_id" };
  }

  const response = await invoke(normalized);
  const data = response?.data || response || {};

  if (data?.ok === false || data?.error) {
    throw new Error(data?.error || "Failed to sync Apple subscription");
  }

  if (options.queryClient) {
    await Promise.all([
      options.queryClient.invalidateQueries({ queryKey: ["current-user"] }),
      options.queryClient.invalidateQueries({ queryKey: ["subscription"] }),
    ]);
  }

  if (typeof options.refetch === "function") {
    await options.refetch();
  }

  return data;
}
