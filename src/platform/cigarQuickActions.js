export const NOT_FOR_ME_FLAGS_PATCH = { not_for_me: false, ai_excluded: false };

const HUMIDOR_LOCATION_CLEAR_PATCH = {
  humidor_id: null,
  humidor_tray: null,
  humidor_shelf: null,
  humidor_drawer: null,
  humidor_section: null,
};

export function normalizeCigarQuickAction(action) {
  if (typeof action === 'string') return action;
  return action?.type || null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getPackageSize(cigar) {
  const packageSize = toNumber(cigar?.cigars_per_package, 0);
  if (packageSize > 0) return packageSize;
  return 1;
}

export function getCigarQuickActionPatch(cigar, action) {
  if (!cigar?.id) return null;
  const normalizedAction = normalizeCigarQuickAction(action);
  if (!normalizedAction) return null;

  if (normalizedAction === 'smoked_one') {
    const packageSize = getPackageSize(cigar);
    const quantity = toNumber(cigar.quantity, 0);
    const hasValidSinglesEquivalent = typeof cigar.singles_equivalent === 'number' && Number.isFinite(cigar.singles_equivalent);
    const currentSingles = hasValidSinglesEquivalent
      ? toNumber(cigar.singles_equivalent, 0)
      : (cigar.unit_type === 'single' ? quantity : quantity * packageSize);
    const patch = { singles_equivalent: Math.max(0, currentSingles - 1) };
    if (cigar.unit_type === 'single') patch.quantity = Math.max(0, quantity - 1);
    return patch;
  }

  if (normalizedAction === 'bought_more') {
    const packageSize = getPackageSize(cigar);
    const baseSingles = toNumber(cigar.singles_equivalent ?? (toNumber(cigar.quantity, 0) * packageSize), 0);
    return {
      quantity: toNumber(cigar.quantity, 0) + 1,
      singles_equivalent: baseSingles + packageSize,
    };
  }

  if (normalizedAction === 'toggle_wishlist') return { wishlist: !cigar.wishlist };
  if (normalizedAction === 'toggle_shopping') return { shopping_list: !cigar.shopping_list };
  if (normalizedAction === 'toggle_restock') return { restock_flag: !cigar.restock_flag };
  if (normalizedAction === 'toggle_favorite') return { is_favorite: !cigar.is_favorite };
  if (normalizedAction === 'toggle_not_for_me') {
    return cigar.not_for_me ? NOT_FOR_ME_FLAGS_PATCH : { not_for_me: true, ai_excluded: true };
  }
  if (normalizedAction === 'assign_humidor') {
    const humidorId = action?.humidorId || null;
    return humidorId ? { humidor_id: humidorId } : { ...HUMIDOR_LOCATION_CLEAR_PATCH };
  }
  if (normalizedAction === 'unassign_humidor') return { ...HUMIDOR_LOCATION_CLEAR_PATCH };

  return null;
}

export function getCigarQuickActionLabels(cigar = {}) {
  return {
    smoked_one: 'Smoked One',
    bought_more: 'Bought More',
    toggle_wishlist: cigar.wishlist ? 'Remove from Wishlist' : 'Add to Wishlist',
    toggle_shopping: cigar.shopping_list ? 'Remove from Shopping List' : 'Move to Shopping List',
    toggle_restock: cigar.restock_flag ? 'Clear Restock' : 'Mark Restock',
    toggle_not_for_me: cigar.not_for_me ? 'Remove Not For Me' : 'Not For Me',
    toggle_favorite: cigar.is_favorite ? 'Unfavorite' : 'Favorite',
    unassign_humidor: 'Unassigned',
  };
}

export function getCigarQuickActionSuccessMessage(action, cigar = {}, patch = {}) {
  const normalizedAction = normalizeCigarQuickAction(action);
  if (normalizedAction === 'smoked_one') return 'Logged one smoked';
  if (normalizedAction === 'bought_more') return 'Inventory increased';
  if (normalizedAction === 'toggle_wishlist') return patch.wishlist ? 'Added to wishlist' : 'Removed from wishlist';
  if (normalizedAction === 'toggle_shopping') return patch.shopping_list ? 'Added to shopping list' : 'Removed from shopping list';
  if (normalizedAction === 'toggle_restock') return patch.restock_flag ? 'Marked for restock' : 'Restock cleared';
  if (normalizedAction === 'toggle_not_for_me') return patch.not_for_me ? 'Marked not for me' : 'Removed not-for-me flag';
  if (normalizedAction === 'toggle_favorite') return patch.is_favorite ? 'Added to favorites' : 'Removed from favorites';
  if (normalizedAction === 'assign_humidor') return patch.humidor_id ? 'Assigned to humidor' : 'Unassigned from humidor';
  if (normalizedAction === 'unassign_humidor') return 'Unassigned from humidor';
  return cigar?.name ? `Updated ${cigar.name}` : 'Updated';
}
