/**
 * Canonical acquisition item state normalization.
 * 
 * Live AcquisitionItem schema uses dual fields:
 * - status: enum of lifecycle state (archived, active, etc.)
 * - category: semantic category (wishlist, shopping_list, restock, etc.)
 * 
 * This helper normalizes the actual stored state into a canonical form.
 */

/**
 * Normalize an AcquisitionItem to its canonical semantic state.
 * 
 * Rules in order:
 * 1. If status === "archived" → "archived"
 * 2. If status is a semantic state → use it
 * 3. If status === "active" → use category || list_type as semantic state
 * 4. If status === null → use category || list_type
 * 5. If still empty → default to "wishlist"
 * 6. Alias: "want_list" → "wishlist"
 * 
 * @param {object} item - AcquisitionItem record
 * @returns {string} - normalized state: "archived", "wishlist", "shopping_list", "restock", "tried_not_owned", "do_not_buy_again"
 */
export function normalizeAcquisitionState(item) {
  if (!item) return "wishlist";

  const semanticStates = new Set([
    "wishlist",
    "shopping_list",
    "restock",
    "tried_not_owned",
    "do_not_buy_again",
  ]);

  // Rule 1: archived is terminal
  if (String(item.status || "").trim().toLowerCase() === "archived") {
    return "archived";
  }

  // Rule 2: if status is already a semantic state, use it
  const statusLower = String(item.status || "").trim().toLowerCase();
  if (semanticStates.has(statusLower)) {
    return statusLower;
  }

  // Rule 3: if status === "active", semantic state is in category/list_type
  if (statusLower === "active") {
    const categoryLower = String(item.category || item.list_type || "").trim().toLowerCase();
    if (categoryLower === "want_list") return "wishlist"; // alias
    if (semanticStates.has(categoryLower)) return categoryLower;
    return "wishlist"; // default for active items
  }

  // Rule 4: if status is null/empty, try category/list_type
  const fallbackLower = String(item.category || item.list_type || "").trim().toLowerCase();
  if (fallbackLower === "want_list") return "wishlist"; // alias
  if (semanticStates.has(fallbackLower)) return fallbackLower;

  // Rule 5: default
  return "wishlist";
}

/**
 * Check if an AcquisitionItem is active (not archived).
 * 
 * @param {object} item - AcquisitionItem record
 * @returns {boolean} - true if not archived
 */
export function isActiveAcquisitionItem(item) {
  return normalizeAcquisitionState(item) !== "archived";
}

/**
 * Check if an AcquisitionItem matches a specific semantic state.
 * 
 * @param {object} item - AcquisitionItem record
 * @param {string} state - target state
 * @returns {boolean}
 */
export function acquisitionStateIs(item, state) {
  return normalizeAcquisitionState(item) === state;
}