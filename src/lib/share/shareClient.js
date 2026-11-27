import { base44 } from "@/api/base44Client";

export const SHARE_MODULES = [
  { key: "pipe", entity: "Pipe", label: "Pipes" },
  { key: "tobacco", entity: "TobaccoBlend", label: "Tobacco" },
  { key: "whiskey", entity: "Bottle", label: "Whiskey" },
  { key: "wine", entity: "Wine", label: "Wine" },
  { key: "cigar", entity: "Cigar", label: "Cigars" },
];

export const SHARE_KINDS = [
  { key: "record", label: "One item" },
  { key: "category", label: "Selected items" },
  { key: "showcase", label: "Showcase presentation" },
];

export function generateShareToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function shareUrl(moduleType, token) {
  return `${window.location.origin}/share/${moduleType}/${token}`;
}

export function expiryDateFromDays(days) {
  if (!days) return null;
  const next = new Date();
  next.setDate(next.getDate() + Number(days));
  return next.toISOString();
}

export function shareStatus(share) {
  if (!share) return { key: "missing", label: "Missing" };
  if (share.revoked_at || share.is_active === false) return { key: "revoked", label: "Revoked" };
  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    return { key: "expired", label: "Expired" };
  }
  return { key: "live", label: "Live" };
}

export async function fetchShareCatalog() {
  const response = await base44.functions.invoke("publicShare", { action: "catalog" });
  return response?.data || null;
}

export async function fetchSharePayload(token, { preview = false } = {}) {
  const response = await base44.functions.invoke("publicShare", { token, preview });
  return response?.data || null;
}

export async function listMyShares() {
  const rows = await base44.entities.SharedRecord.list("-created_date", 100);
  return Array.isArray(rows) ? rows : rows?.items || [];
}

export async function loadModuleRecords(entityName) {
  const rows = await base44.entities[entityName].list("-created_date", 200);
  return Array.isArray(rows) ? rows : rows?.items || [];
}

export async function revokeShare(shareId) {
  return base44.entities.SharedRecord.update(shareId, {
    is_active: false,
    revoked_at: new Date().toISOString(),
  });
}

export async function copyShareLink(moduleType, token) {
  const url = shareUrl(moduleType, token);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}