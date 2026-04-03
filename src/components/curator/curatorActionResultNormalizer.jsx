/**
 * CURATOR ACTION RESULT NORMALIZER
 *
 * Canonical output:
 * {
 *   summary: string,
 *   groups: [{ title, description, items: [...] }],
 *   items: [],  // flat mirror of all grouped items
 *   metadata: {},
 * }
 */

export function normalizeCuratorActionResult(raw) {
  if (!raw) {
    return { summary: "", groups: [], items: [], metadata: {} };
  }

  const metadata = raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {};

  // Input has groups
  if (Array.isArray(raw.groups) && raw.groups.length > 0) {
    const groups = raw.groups
      .filter((g) => g && typeof g === "object")
      .map((g) => ({
        ...g,
        title: g.title || g.groupTitle || "",
        items: Array.isArray(g.items) ? g.items : [],
      }));

    const items = groups.flatMap((g) => g.items);

    // If there are also flat items, include them in a group
    if (Array.isArray(raw.items) && raw.items.length > 0) {
      const flatGroup = { title: "Items", items: raw.items };
      return {
        summary: raw.summary || "",
        groups: [...groups, flatGroup],
        items: [...items, ...raw.items],
        metadata,
      };
    }

    return {
      summary: raw.summary || "",
      groups,
      items,
      metadata,
    };
  }

  // Input has only flat items — wrap in a single group
  const flatItems = Array.isArray(raw.items) ? raw.items : [];
  if (flatItems.length > 0) {
    const group = { title: "Items", items: flatItems };
    return {
      summary: raw.summary || "",
      groups: [group],
      items: flatItems,
      metadata,
    };
  }

  return { summary: raw.summary || "", groups: [], items: [], metadata };
}

export default normalizeCuratorActionResult;
