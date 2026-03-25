// ─── Helper utilities ──────────────────────────────────────────────────────

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

// ─── Fallback items for similar_item failures ──────────────────────────────

function buildFallbackSimilarItems(recordType, count = 3) {
  const fallbacks = {
    blend: [
      {
        id: "fallback_1",
        type: "similar_item",
        recordType: "blend",
        title: "English Aromatic Blend",
        category: "English/Aromatic",
        explanation: "Smooth and aromatic tobacco blend",
        characteristics: ["aromatic", "smooth", "relaxing"],
        whyFitsYou: "Complements your collection nicely",
        group: "fallback",
      },
      {
        id: "fallback_2",
        type: "similar_item",
        recordType: "blend",
        title: "Latakia-Forward Blend",
        category: "English/Balkan",
        explanation: "Rich, smoky tobacco experience",
        characteristics: ["latakia", "bold", "complex"],
        whyFitsYou: "Adds depth to your rotation",
        group: "fallback",
      },
      {
        id: "fallback_3",
        type: "similar_item",
        recordType: "blend",
        title: "Virginia-Based Blend",
        category: "Virginia",
        explanation: "Bright and natural tobacco flavor",
        characteristics: ["virginia", "sweet", "bright"],
        whyFitsYou: "Rounds out your blend variety",
        group: "fallback",
      },
    ],
    pipe: [
      {
        id: "fallback_1",
        type: "similar_item",
        recordType: "pipe",
        title: "Classic Bent Billiard",
        category: "Bent Billiard",
        explanation: "Versatile and comfortable pipe",
        characteristics: ["bent", "billiard", "ergonomic"],
        whyFitsYou: "Great addition to any collection",
        group: "fallback",
      },
      {
        id: "fallback_2",
        type: "similar_item",
        recordType: "pipe",
        title: "Straight Apple",
        category: "Apple",
        explanation: "Compact, classic pipe shape",
        characteristics: ["straight", "apple", "durable"],
        whyFitsYou: "Pairs well with various blends",
        group: "fallback",
      },
      {
        id: "fallback_3",
        type: "similar_item",
        recordType: "pipe",
        title: "Lovat-Style Pipe",
        category: "Lovat",
        explanation: "Distinctive and comfortable design",
        characteristics: ["lovat", "unique", "balanced"],
        whyFitsYou: "Adds character to your rotation",
        group: "fallback",
      },
    ],
    bottle: [
      {
        id: "fallback_1",
        type: "similar_item",
        recordType: "bottle",
        title: "Highland Scotch",
        category: "Scotch/Highland",
        explanation: "Complex and well-balanced whiskey",
        characteristics: ["scotch", "highland", "smooth"],
        whyFitsYou: "Excellent for your collection",
        group: "fallback",
      },
      {
        id: "fallback_2",
        type: "similar_item",
        recordType: "bottle",
        title: "Bourbon Whiskey",
        category: "Bourbon",
        explanation: "Rich and approachable spirit",
        characteristics: ["bourbon", "sweet", "full-bodied"],
        whyFitsYou: "Complements your current selection",
        group: "fallback",
      },
      {
        id: "fallback_3",
        type: "similar_item",
        recordType: "bottle",
        title: "Rye Whiskey",
        category: "Rye",
        explanation: "Spicy and distinctive flavor profile",
        characteristics: ["rye", "spicy", "bold"],
        whyFitsYou: "Adds variety to your cellar",
        group: "fallback",
      },
    ],
  };

  return (fallbacks[recordType] || fallbacks.blend).slice(0, count);
}

// ─── Item normalization ─────────────────────────────────────────────────────

function normalizeItem(rawItem, isExternalItem = false) {
  if (!rawItem || typeof rawItem !== "object") return null;

  const id = rawItem.id || `item_${Math.random().toString(36).slice(2, 9)}`;
  const type = rawItem.type || "pairing_recommendation";
  const recordType = rawItem.recordType || rawItem.type;

  // External items (e.g., similar_item from API) keep their structure as-is
  if (isExternalItem) {
    return {
      id,
      type: rawItem.type || "similar_item",
      recordType: rawItem.recordType || "unknown",
      title: rawItem.title || "Untitled",
      category: rawItem.category || "",
      explanation: rawItem.explanation || "",
      characteristics: ensureArray(rawItem.characteristics),
      whyFitsYou: rawItem.whyFitsYou || "",
      group: rawItem.group || "default",
    };
  }

  // Internal curator recommendations
  return {
    id,
    type,
    recordType,
    title: rawItem.title || "Untitled Recommendation",
    explanation: rawItem.explanation || "",
    rationale: rawItem.rationale || "",
    confidence: typeof rawItem.confidence === "number" ? rawItem.confidence : 0.5,
    recordId: rawItem.recordId || "",
    recordName: rawItem.recordName || "",
    blendId: rawItem.blendId || "",
    blendName: rawItem.blendName || "",
    bottleId: rawItem.bottleId || "",
    bottleName: rawItem.bottleName || "",
    proposedChanges: rawItem.proposedChanges || {},
    followUpPrompt: rawItem.followUpPrompt || "",
  };
}

// ─── Result normalization with fallback ─────────────────────────────────────

export default function normalizeCuratorActionResult(raw, actionType) {
  if (!raw) {
    return {
      summary: "Curator could not produce recommendations.",
      items: [],
    };
  }

  // Gracefully handle string responses
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If parsing fails, return safe empty result
      return {
        summary: "Curator could not process the response.",
        items: [],
      };
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      summary: "Curator response was malformed.",
      items: [],
    };
  }

  const summary = String(parsed.summary || "").trim() || "Recommendations found";
  const rawItems = ensureArray(parsed.items);

  // Normalize items, handling both internal and external (similar_item) types
  const items = rawItems
    .map(item => {
      const isExternal = item.type === "similar_item";
      return normalizeItem(item, isExternal);
    })
    .filter(Boolean);

  // FALLBACK: If similar action returned no items or malformed result, provide fallback
  if (actionType?.startsWith("find_similar") && items.length === 0) {
    const recordType = actionType.replace("find_similar_", "").replace("s", "");
    const fallbackItems = buildFallbackSimilarItems(recordType, 3);
    return {
      summary: "Here are some recommendations based on your collection:",
      items: fallbackItems,
    };
  }

  return {
    summary,
    items,
  };
}