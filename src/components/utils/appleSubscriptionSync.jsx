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

/**
 * Resolve the original transaction ID from the native payload.
 *
 * StoreKit 2 (Swift) exposes this as `Transaction.originalID` — see Apple's docs:
 *   "To get the original transaction identifier from your app, use the originalID
 *    property of the Transaction object."
 * The native iOS wrapper should serialize it as `originalTransactionId`.
 *
 * However, some native builds may use alternative key names. We accept the
 * canonical name first, then common alternatives. `transactionId` / `id` are
 * last-resort fallbacks: for the FIRST purchase in a subscription lifecycle,
 * `originalID == id`, so they're equivalent. For renewals they differ, but
 * having a non-empty value is still better than blocking the sync entirely.
 */
function resolveOriginalTransactionId(payload) {
  // Canonical (per bridge spec)
  const canonical = safeString(payload.originalTransactionId);
  if (canonical) return { value: canonical, source: 'originalTransactionId' };

  // StoreKit 2 Swift property name (if native code passes it through verbatim)
  const sk2OriginalID = safeString(payload.originalID);
  if (sk2OriginalID) return { value: sk2OriginalID, source: 'originalID' };

  // Snake_case variant
  const snake = safeString(payload.original_transaction_id);
  if (snake) return { value: snake, source: 'original_transaction_id' };

  // Camel-case variant without "original" prefix
  const camel = safeString(payload.originalTransactionID);
  if (camel) return { value: camel, source: 'originalTransactionID' };

  // Last-resort: current transaction ID (equivalent to originalID for first purchase)
  const txnId = safeString(payload.transactionId) || safeString(payload.transaction_id);
  if (txnId) return { value: txnId, source: 'transactionId_fallback' };

  return { value: '', source: 'missing' };
}

export function normalizeNativeAppleStatus(payload = {}) {
  const productId = safeString(payload.productId);
  const resolved = resolveOriginalTransactionId(payload);
  const originalTransactionId = resolved.value;
  const verificationProof = payload.verificationProof || null;
  const expiresAt = payload.expiresAt ? String(payload.expiresAt) : null;
  const active = !!payload.active;
  const pendingProductId = safeString(payload.pendingProductId) || null;
  const pendingUpgradeEffectiveDate = payload.pendingUpgradeEffectiveDate
    ? String(payload.pendingUpgradeEffectiveDate)
    : null;

  // Diagnostic: log when the transaction ID was resolved from a fallback or is
  // missing entirely. This helps the native iOS team identify which builds need
  // to be updated to read Transaction.originalID correctly.
  if (resolved.source === 'missing' && active) {
    console.warn(
      '[appleSubscriptionSync] Active Apple subscription payload is missing originalTransactionId entirely. ' +
      'The native iOS wrapper must read Transaction.originalID (StoreKit 2) and serialize it as "originalTransactionId". ' +
      'Falling back to unverified sync. Payload keys received:',
      Object.keys(payload).join(', ')
    );
  } else if (resolved.source === 'transactionId_fallback') {
    console.warn(
      '[appleSubscriptionSync] originalTransactionId missing — used transactionId as fallback. ' +
      'Native iOS wrapper should serialize Transaction.originalID as "originalTransactionId" for correct subscription lifecycle tracking.'
    );
  }

  return {
    active,
    tier: normalizeTier(payload.tier, productId),
    productId,
    expiresAt,
    originalTransactionId,
    originalTransactionIdSource: resolved.source,
    verificationProof,
    pendingProductId,
    pendingUpgradeEffectiveDate,
  };
}

export async function syncAppleSubscriptionStatus(payload = {}, options = {}) {
  const normalized = normalizeNativeAppleStatus(payload);
  const invoke =
    options.invoke ||
    ((body) => base44.functions.invoke("syncAppleSubscriptionForMe", body));

  // Previously skipped the sync entirely when originalTransactionId was missing.
  // This caused users whose iOS wrapper didn't send the transaction ID to never
  // get a backend Subscription record — they'd see local StoreKit access but the
  // backend showed "free". Now we always call the backend; it handles unverified
  // claims by using apple_unverified_${userId} as the provider_subscription_id.

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