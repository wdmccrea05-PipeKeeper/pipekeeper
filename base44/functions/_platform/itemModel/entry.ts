// functions/_platform/itemModel.ts
// Shared item model for the CollectionKeeper platform (backend).
//
// Provides helpers for normalizing raw module records into the shared
// platform item shape without rewriting any existing schema.

import { isValidModuleType, MODULE_TYPES } from "./moduleTypes.ts";

export interface PlatformItem {
  id: string;
  module_type: string | null;
  name: string | null;
  estimated_value: number | null;
  purchase_price: number | null;
  favorite: boolean;
  ai_excluded: boolean;
  public_visibility: boolean;
  _raw: Record<string, unknown>;
}

/**
 * Normalize a raw item record into the shared platform item shape.
 *
 * @param rawItem - Original record from the database.
 * @param moduleType - Module type override; falls back to rawItem.module_type.
 */
export function normalizeItem(
  rawItem: Record<string, unknown>,
  moduleType?: string
): PlatformItem {
  const resolvedModuleType =
    typeof rawItem.module_type === "string" && isValidModuleType(rawItem.module_type)
      ? rawItem.module_type
      : moduleType && isValidModuleType(moduleType)
        ? moduleType
        : null;

  return {
    id: String(rawItem.id ?? ""),
    module_type: resolvedModuleType,
    name: (rawItem.name ?? rawItem.brand ?? null) as string | null,
    estimated_value: (rawItem.estimated_value ?? null) as number | null,
    purchase_price: (rawItem.purchase_price ?? null) as number | null,
    favorite: Boolean(rawItem.is_favorite ?? rawItem.favorite ?? false),
    ai_excluded: Boolean(rawItem.ai_excluded ?? false),
    public_visibility: rawItem.public_visibility !== false,
    _raw: rawItem,
  };
}

/**
 * Normalize an array of raw items.
 */
export function normalizeItems(
  rawItems: Record<string, unknown>[],
  moduleType?: string
): PlatformItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => normalizeItem(item, moduleType));
}

/**
 * Normalize mixed PipeKeeper pipes and tobacco blends into a unified array.
 */
export function normalizePipeKeeperItems({
  pipes = [],
  blends = [],
}: {
  pipes?: Record<string, unknown>[];
  blends?: Record<string, unknown>[];
}): PlatformItem[] {
  return [
    ...normalizeItems(pipes, MODULE_TYPES.PIPE),
    ...normalizeItems(blends, MODULE_TYPES.TOBACCO),
  ];
}
