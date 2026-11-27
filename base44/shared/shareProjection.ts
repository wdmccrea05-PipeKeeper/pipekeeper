/**
 * Canonical collection-share projection.
 *
 * Every public share is built here, on the server, from the stored record.
 * The recipient never receives a record the owner did not choose to show, and
 * never receives a field that is not on this catalogue — so a field added to a
 * collection entity later cannot leak through a share automatically.
 */

export type ShareModule = "pipe" | "tobacco" | "whiskey" | "wine" | "cigar";

export const SHARE_MODULE_META: Record<ShareModule, { entity: string; label: string; plural: string }> = {
  pipe: { entity: "Pipe", label: "Pipe", plural: "Pipes" },
  tobacco: { entity: "TobaccoBlend", label: "Tobacco blend", plural: "Tobacco" },
  whiskey: { entity: "Bottle", label: "Whiskey", plural: "Whiskey" },
  wine: { entity: "Wine", label: "Wine", plural: "Wine" },
  cigar: { entity: "Cigar", label: "Cigar", plural: "Cigars" },
};

export type ShareField = { key: string; label: string; group: string };

export const SHARE_FIELDS: Record<ShareModule, ShareField[]> = {
  pipe: [
    { key: "name", label: "Name", group: "identity" },
    { key: "maker", label: "Maker", group: "identity" },
    { key: "shape", label: "Shape", group: "characteristics" },
    { key: "bend", label: "Bend", group: "characteristics" },
    { key: "bowl_material", label: "Bowl material", group: "characteristics" },
    { key: "stem_material", label: "Stem material", group: "characteristics" },
    { key: "finish", label: "Finish", group: "characteristics" },
    { key: "country_of_origin", label: "Country of origin", group: "identity" },
    { key: "year_made", label: "Year made", group: "identity" },
    { key: "sizeClass", label: "Size class", group: "characteristics" },
    { key: "length_mm", label: "Length (mm)", group: "characteristics" },
    { key: "weight_grams", label: "Weight (g)", group: "characteristics" },
    { key: "chamber_volume", label: "Chamber volume", group: "characteristics" },
    { key: "condition", label: "Condition", group: "condition" },
    { key: "usage_characteristics", label: "Usage characteristics", group: "condition" },
    { key: "focus", label: "Specialization", group: "characteristics" },
  ],
  tobacco: [
    { key: "name", label: "Name", group: "identity" },
    { key: "manufacturer", label: "Manufacturer", group: "identity" },
    { key: "blend_type", label: "Blend type", group: "characteristics" },
    { key: "cut", label: "Cut", group: "characteristics" },
    { key: "strength", label: "Strength", group: "characteristics" },
    { key: "room_note", label: "Room note", group: "characteristics" },
    { key: "tobacco_components", label: "Components", group: "characteristics" },
    { key: "flavor_notes", label: "Flavor notes", group: "characteristics" },
    { key: "production_status", label: "Production status", group: "identity" },
    { key: "aging_potential", label: "Aging potential", group: "condition" },
    { key: "is_aromatic", label: "Aromatic", group: "characteristics" },
  ],
  whiskey: [
    { key: "name", label: "Name", group: "identity" },
    { key: "distillery", label: "Distillery", group: "identity" },
    { key: "type", label: "Type", group: "characteristics" },
    { key: "region", label: "Region", group: "identity" },
    { key: "country", label: "Country", group: "identity" },
    { key: "age", label: "Age", group: "characteristics" },
    { key: "abv", label: "ABV", group: "characteristics" },
    { key: "bottle_size", label: "Bottle size", group: "characteristics" },
    { key: "flavor_notes", label: "Flavor notes", group: "characteristics" },
  ],
  wine: [
    { key: "name", label: "Name", group: "identity" },
    { key: "producer", label: "Producer", group: "identity" },
    { key: "region", label: "Region", group: "identity" },
    { key: "appellation", label: "Appellation", group: "identity" },
    { key: "varietal", label: "Varietal", group: "characteristics" },
    { key: "vintage", label: "Vintage", group: "identity" },
    { key: "style", label: "Style", group: "characteristics" },
    { key: "country_of_origin", label: "Country of origin", group: "identity" },
    { key: "abv", label: "ABV", group: "characteristics" },
    { key: "bottle_size", label: "Bottle size", group: "characteristics" },
  ],
  cigar: [
    { key: "name", label: "Name", group: "identity" },
    { key: "brand", label: "Brand", group: "identity" },
    { key: "line", label: "Line", group: "identity" },
    { key: "vitola", label: "Vitola", group: "characteristics" },
    { key: "wrapper", label: "Wrapper", group: "characteristics" },
    { key: "binder", label: "Binder", group: "characteristics" },
    { key: "filler", label: "Filler", group: "characteristics" },
    { key: "country_of_origin", label: "Country of origin", group: "identity" },
    { key: "body", label: "Body", group: "characteristics" },
    { key: "strength", label: "Strength", group: "characteristics" },
    { key: "length_inches", label: "Length (in)", group: "characteristics" },
    { key: "ring_gauge", label: "Ring gauge", group: "characteristics" },
    { key: "flavor_notes", label: "Flavor notes", group: "characteristics" },
  ],
};

/**
 * Never shared, whatever the owner selects. These carry money paid, private
 * notes, provenance, attachments, contact details or storage positions.
 */
export const NEVER_SHARED = new Set([
  "purchase_price",
  "purchase_date",
  "purchase_source",
  "purchase_location",
  "purchase_type",
  "cost_basis",
  "original_owner",
  "provenance_notes",
  "documents",
  "notes",
  "condition_notes",
  "serial_number",
  "batch_number",
  "created_by",
  "storage_location_id",
  "storage_notes",
  "humidor_id",
  "estimated_value",
  "manual_market_value",
  "ai_estimated_value",
  "retail_price",
  "aftermarket_price",
  "collector_value",
  "average_market_value",
  "owner_email",
  "email",
  "user_email",
]);

export const SHARE_DISCLOSURE =
  "Shared by its owner for viewing only. Acquisition costs, provenance, private notes and documents are not included. Values shown, if any, are the owner's own estimate and not a market price.";

export const VALUE_DISCLOSURE =
  "The value shown is the owner's own estimate. It is not an appraisal and not a market price.";

export function shareState(share: any, now: Date = new Date()) {
  if (!share) return { active: false, reason: "not_found" as const };
  if (share.revoked_at) return { active: false, reason: "revoked" as const };
  if (share.is_active === false) return { active: false, reason: "inactive" as const };
  if (share.expires_at) {
    const expiry = new Date(share.expires_at);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
      return { active: false, reason: "expired" as const };
    }
  }
  return { active: true, reason: "ok" as const };
}

function valueFor(moduleKey: ShareModule, record: any): number | null {
  if (moduleKey === "pipe" || moduleKey === "wine" || moduleKey === "cigar") {
    return typeof record.estimated_value === "number" ? record.estimated_value : null;
  }
  if (moduleKey === "whiskey") {
    if (typeof record.collector_value === "number") return record.collector_value;
    if (typeof record.aftermarket_price === "number") return record.aftermarket_price;
    return null;
  }
  if (moduleKey === "tobacco") {
    return typeof record.manual_market_value === "number" ? record.manual_market_value : null;
  }
  return null;
}

/** Build the recipient-facing view of one record. Only catalogue fields can pass. */
export function projectShareRecord(moduleKey: ShareModule, record: any, options: any = {}) {
  const catalog = SHARE_FIELDS[moduleKey] || [];
  const chosen = Array.isArray(options.visible_fields) && options.visible_fields.length > 0
    ? new Set(options.visible_fields.filter((k: string) => !NEVER_SHARED.has(k)))
    : null;

  const fields: { key: string; label: string; value: any }[] = [];
  for (const field of catalog) {
    if (NEVER_SHARED.has(field.key)) continue;
    if (chosen && !chosen.has(field.key)) continue;
    const value = record?.[field.key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    fields.push({ key: field.key, label: field.label, value });
  }

  const photos = options.include_photos !== false && Array.isArray(record?.photos)
    ? record.photos.filter((p: unknown) => typeof p === "string" && p.length > 0).slice(0, 5)
    : [];

  const item: any = {
    id: record?.id,
    module: moduleKey,
    title: typeof record?.name === "string" && record.name ? record.name : "Untitled",
    fields,
    photos,
  };

  if (options.include_rating === true && typeof record?.rating === "number") {
    item.rating = record.rating;
  }
  if (options.include_notes === true && typeof record?.notes === "string" && record.notes.trim()) {
    item.notes = record.notes.trim().slice(0, 400);
  }
  if (options.include_value === true) {
    const value = valueFor(moduleKey, record || {});
    if (value !== null) item.value = value;
  }
  if (options.include_inventory === true && typeof record?.quantity === "number") {
    item.quantity = record.quantity;
  }

  return item;
}

function displayName(profile: any) {
  if (profile?.is_public && profile?.display_name) return profile.display_name;
  return "A Collector";
}

/** Build the whole recipient-facing payload for a share. */
export function buildSharePayload(share: any, records: any[], profile: any = null) {
  const moduleKey = share.module_type as ShareModule;
  const items = (records || [])
    .filter(Boolean)
    .map((record) => projectShareRecord(moduleKey, record, share));

  const includesValue = items.some((item) => typeof item.value === "number");

  return {
    kind: share.share_kind || "record",
    module: moduleKey,
    module_label: SHARE_MODULE_META[moduleKey]?.plural || "Collection",
    title: share.title || items[0]?.title || "Shared collection",
    description: share.description || "",
    shared_by: displayName(profile),
    generated_at: new Date().toISOString(),
    expires_at: share.expires_at || null,
    count: items.length,
    items,
    disclosures: includesValue ? [SHARE_DISCLOSURE, VALUE_DISCLOSURE] : [SHARE_DISCLOSURE],
  };
}