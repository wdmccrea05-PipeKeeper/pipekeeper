import { base44 } from "@/api/base44Client";
import { CURATOR_ACTIONS } from "./curatorActions";
import {
  buildSafeCollectionContext,
  buildPromptBlock,
} from "./collectionContextBudget";
import { runFindSimilar } from "@/components/recommendations/FindSimilarEngine";

const FIND_SIMILAR_TYPES = new Set([
  "find_similar_blends",
  "find_similar_pipes",
  "find_similar_bottles",
]);

const RECORD_TYPE_MAP = {
  find_similar_blends: "blend",
  find_similar_pipes: "pipe",
  find_similar_bottles: "bottle",
};

function extractJsonCandidate(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced =
    trimmed.match(/```json\s*([\s\S]*?)```/i) ||
    trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  const objectMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (objectMatch?.[1]?.trim()) return objectMatch[1].trim();

  const arrayMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (arrayMatch?.[1]?.trim()) return arrayMatch[1].trim();

  return null;
}

function parseRawResponse(raw) {
  if (!raw) throw new Error("Curator returned no response.");

  if (Array.isArray(raw)) return { items: raw };

  if (typeof raw === "object") {
    if (typeof raw.result !== "undefined") return parseRawResponse(raw.result);
    if (typeof raw.output !== "undefined") return parseRawResponse(raw.output);
    if (typeof raw.body !== "undefined") return parseRawResponse(raw.body);
    if (typeof raw.data !== "undefined" && raw.data !== raw) return parseRawResponse(raw.data);
    return raw;
  }

  const text = String(raw).trim();
  if (!text) throw new Error("Curator returned no response.");

  try {
    return JSON.parse(text);
  } catch {
    const candidate = extractJsonCandidate(text);
    if (candidate) {
      return JSON.parse(candidate);
    }
  }

  throw new Error("Curator returned unparseable JSON.");
}

function getActionByType(actionType) {
  return (CURATOR_ACTIONS || []).find(
    (a) => a.id === actionType || a.type === actionType
  );
}

function getAnchorList(anchorOverrides) {
  if (Array.isArray(anchorOverrides)) return anchorOverrides.filter(Boolean);
  if (Array.isArray(anchorOverrides?.anchors)) return anchorOverrides.anchors.filter(Boolean);
  if (anchorOverrides && typeof anchorOverrides === "object") return [anchorOverrides];
  return [];
}

function normalizeString(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildRecordIndexes(context = {}) {
  const pipeIndex = new Map();
  const blendIndex = new Map();
  const bottleIndex = new Map();

  for (const pipe of context?.pipes || []) {
    const candidates = [
      pipe?.name,
      `${pipe?.maker || ""} ${pipe?.name || ""}`.trim(),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const key = normalizeString(candidate);
      if (key && !pipeIndex.has(key)) {
        pipeIndex.set(key, pipe);
      }
    }
  }

  for (const blend of context?.blends || []) {
    const candidates = [
      blend?.name,
      `${blend?.manufacturer || ""} ${blend?.name || ""}`.trim(),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const key = normalizeString(candidate);
      if (key && !blendIndex.has(key)) {
        blendIndex.set(key, blend);
      }
    }
  }

  for (const bottle of context?.bottles || []) {
    const candidates = [
      bottle?.name,
      `${bottle?.distillery || bottle?.brand || ""} ${bottle?.name || ""}`.trim(),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const key = normalizeString(candidate);
      if (key && !bottleIndex.has(key)) {
        bottleIndex.set(key, bottle);
      }
    }
  }

  return { pipeIndex, blendIndex, bottleIndex };
}

function inferRecordType(item, fallbackType = null) {
  if (item?.recordType) return item.recordType;
  if (item?.record_type) return item.record_type;
  if (item?.type === "pipe") return "pipe";
  if (item?.type === "bottle") return "bottle";
  if (item?.type === "blend" || item?.type === "tobacco") return "blend";

  const payload = item?.proposedChanges || item?.proposedChange?.payload || {};
  const keys = Object.keys(payload || {});

  const pipeKeys = new Set([
    "length_mm",
    "weight_grams",
    "bowl_height_mm",
    "bowl_width_mm",
    "bowl_diameter_mm",
    "bowl_depth_mm",
    "length",
    "weight",
    "bowlHeight",
    "bowlWidth",
    "bowlDiameter",
    "bowlDepth",
    "shape",
    "bowl_style",
    "bowlStyle",
    "shank_shape",
    "shankShape",
    "bend",
    "sizeClass",
    "size_class",
    "bowl_material",
    "stem_material",
    "finish",
    "filter_type",
    "usage_characteristics",
    "smoking_characteristics",
    "usageCharacteristics",
    "smokingCharacteristics",
    "condition",
  ]);

  const bottleKeys = new Set([
    "retail_price",
    "aftermarket_price",
    "collector_value",
    "abv",
    "region",
    "distillery",
    "age",
    "type",
  ]);

  const blendKeys = new Set([
    "blend_type",
    "manufacturer",
    "cut",
    "strength",
    "flavor_notes",
  ]);

  if (keys.some((k) => pipeKeys.has(k))) return "pipe";
  if (keys.some((k) => bottleKeys.has(k))) return "bottle";
  if (keys.some((k) => blendKeys.has(k))) return "blend";

  return fallbackType;
}

function resolveTargetRecord(item, context = {}, fallbackType = null) {
  if (item?.recordId && item?.recordType) {
    // Already resolved — classify ownership based on whether recordId matches collection
    const isInCollection = isRecordInCollection(item.recordId, context);
    return {
      ...item,
      ownershipStatus: isInCollection ? "owned" : (item.ownershipStatus || "not_owned"),
    };
  }

  const inferredType = inferRecordType(item, fallbackType);
  const { pipeIndex, blendIndex, bottleIndex } = buildRecordIndexes(context);

  const candidates = [
    item?.recordName,
    item?.itemName,
    item?.title,
    item?.anchorName,
    item?.name,
  ].filter(Boolean);

  let matched = null;

  for (const candidate of candidates) {
    const key = normalizeString(candidate);
    if (!key) continue;

    if (inferredType === "pipe" && pipeIndex.has(key)) {
      matched = { type: "pipe", record: pipeIndex.get(key) };
      break;
    }
    if (inferredType === "blend" && blendIndex.has(key)) {
      matched = { type: "blend", record: blendIndex.get(key) };
      break;
    }
    if (inferredType === "bottle" && bottleIndex.has(key)) {
      matched = { type: "bottle", record: bottleIndex.get(key) };
      break;
    }

    if (!matched) {
      if (pipeIndex.has(key)) matched = { type: "pipe", record: pipeIndex.get(key) };
      else if (blendIndex.has(key)) matched = { type: "blend", record: blendIndex.get(key) };
      else if (bottleIndex.has(key)) matched = { type: "bottle", record: bottleIndex.get(key) };
    }

    if (matched) break;
  }

  if (!matched) {
    return {
      ...item,
      recordType: inferredType || item?.recordType || "collection",
      ownershipStatus: item?.ownershipStatus || "not_owned",
    };
  }

  return {
    ...item,
    recordType: inferredType || matched.type,
    recordId: item?.recordId || matched.record?.id || null,
    itemId: item?.itemId || matched.record?.id || null,
    recordName: item?.recordName || matched.record?.name || item?.itemName || item?.title || null,
    itemName: item?.itemName || matched.record?.name || item?.recordName || item?.title || null,
    ownershipStatus: "owned",
  };
}

function isRecordInCollection(recordId, context = {}) {
  if (!recordId) return false;
  const allIds = new Set([
    ...(context?.pipes || []).map((p) => p?.id),
    ...(context?.blends || []).map((b) => b?.id),
    ...(context?.bottles || []).map((b) => b?.id),
  ]);
  return allIds.has(recordId);
}

function deduplicateItems(items) {
  if (!Array.isArray(items)) return items;
  const seen = new Map();
  for (const item of items) {
    const nameKey = normalizeString(
      item?.recordName || item?.itemName || item?.title || ""
    );
    if (!nameKey) continue;
    if (!seen.has(nameKey)) {
      seen.set(nameKey, item);
    } else {
      // Prefer owned items over not_owned ones
      const existing = seen.get(nameKey);
      const incomingIsOwned = item?.ownershipStatus === "owned";
      const existingIsOwned = existing?.ownershipStatus === "owned";
      if (incomingIsOwned && !existingIsOwned) {
        seen.set(nameKey, item);
      } else if (incomingIsOwned === existingIsOwned) {
        // When ownership status is equal, prefer the item with more contextual detail
        const incomingDetail =
          (item?.explanation ? 1 : 0) +
          (item?.recommendation ? 1 : 0) +
          (item?.rationale ? 1 : 0) +
          (item?.proposedChanges ? 1 : 0);
        const existingDetail =
          (existing?.explanation ? 1 : 0) +
          (existing?.recommendation ? 1 : 0) +
          (existing?.rationale ? 1 : 0) +
          (existing?.proposedChanges ? 1 : 0);
        if (incomingDetail > existingDetail) {
          seen.set(nameKey, item);
        }
      }
    }
  }
  return Array.from(seen.values());
}

/** Maximum number of items returned across all groups to avoid oversized payloads. */
const MAX_RESULT_ITEMS = 8;

function enrichCanonicalResult(result, context = {}, fallbackType = null) {
  if (!result || typeof result !== "object") return result;

  if (Array.isArray(result.groups)) {
    let totalItems = 0;
    return {
      ...result,
      groups: result.groups.map((group) => {
        const remaining = Math.max(0, MAX_RESULT_ITEMS - totalItems);
        const resolved = (group.items || [])
          .slice(0, remaining)
          .map((item) => resolveTargetRecord(item, context, fallbackType));
        const items = deduplicateItems(resolved);
        totalItems += items.length;
        return { ...group, items };
      }),
    };
  }

  if (Array.isArray(result.items)) {
    const resolved = result.items
      .slice(0, MAX_RESULT_ITEMS)
      .map((item) => resolveTargetRecord(item, context, fallbackType));
    return {
      ...result,
      items: deduplicateItems(resolved),
    };
  }

  return result;
}

function normalizeSimilarItem(item, recordType, anchor) {
  const title = item?.title || item?.name || "Recommendation";

  return {
    id:
      item?.id ||
      `similar_${recordType}_${String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")}`,
    type: item?.type || "similar_item",
    recordType,
    title,
    itemName: title,
    category: item?.category || "",
    explanation: item?.explanation || "",
    whyFitsYou: item?.whyFitsYou || "",
    characteristics: Array.isArray(item?.characteristics) ? item.characteristics : [],
    anchorId: anchor?.id || null,
    anchorName: anchor?.name || null,
    recordId: item?.recordId || item?.record_id || item?.itemId || item?.item_id || null,
    itemId: item?.itemId || item?.item_id || item?.recordId || item?.record_id || null,
    recordName: item?.recordName || item?.record_name || title,
  };
}

async function handleFindSimilar({ actionType, context, anchorOverrides }) {
  const recordType = RECORD_TYPE_MAP[actionType];
  if (!recordType) throw new Error(`Unsupported find-similar action type: ${actionType}`);

  const anchors = getAnchorList(anchorOverrides);
  if (anchors.length === 0) throw new Error("Find Similar requires at least one anchor item");

  const allResults = [];
  const seen = new Set();

  for (const anchor of anchors) {
    try {
      const result = await runFindSimilar({ recordType, anchor, context });
      const items = result?.items || result?.recommendations || [];
      for (const item of items) {
        const key = String(item?.title || item?.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        allResults.push(normalizeSimilarItem(item, recordType, anchor));
      }
    } catch (err) {
      console.warn("[CuratorExecutor] find-similar failed for anchor", anchor?.name, err?.message);
    }
  }

  const finalItems = allResults.slice(0, 3);
  const anchorNames = anchors.map((a) => a?.name).filter(Boolean);

  return {
    actionId: actionType,
    title: "Curator Similar Recommendations",
    summary:
      finalItems.length > 0
        ? `Found ${finalItems.length} similar ${recordType}${finalItems.length === 1 ? "" : "s"} based on ${anchorNames.join(", ")}.`
        : `No similar ${recordType}s found right now.`,
    groups: [
      {
        groupKey: "similar_items",
        groupTitle: "Similar Recommendations",
        description: `Recommendations based on ${anchorNames.join(", ")}`,
        priority: "medium",
        items: finalItems,
      },
    ],
  };
}

function buildGenericCuratorPrompt(action, context, actionType) {
  const safeContext = buildSafeCollectionContext(context || {});
  const contextBlock = buildPromptBlock(safeContext);

  const actionPrompt =
    typeof action?.buildPrompt === "function"
      ? action.buildPrompt(context || {})
      : action?.prompt || action?.description || action?.id || "Curator action";

  const extraMeasurementInstructions =
    actionType === "update_pipe_measurements"
      ? `
IMPORTANT FOR PIPE MEASUREMENT ACTIONS:
- Every recommendation MUST include:
  - "recordType": "pipe"
  - "recordId": the exact pipe id from the provided collection context
  - "recordName": the exact pipe name from the provided collection context
- If you can confidently infer actual numeric pipe measurements from reliable evidence already present in context, return them in proposedChange.payload using canonical keys:
  - length_mm
  - weight_grams
  - bowl_height_mm
  - bowl_width_mm
  - bowl_diameter_mm
  - bowl_depth_mm
- If you do NOT have reliable numeric values, still include recordId and recordName, and return:
  - "type": "advice_only"
  - a human explanation
  - no fake numeric values
- Never omit the target pipe id when recommending an update for a specific pipe.`
      : `
IMPORTANT:
- Every actionable recommendation must include:
  - "recordType"
  - "recordId"
  - "recordName"
- Use exact record ids from the provided collection context whenever the recommendation targets a specific collection item.`;

  // Ownership rules — prevent the LLM from treating owned items as acquisitions
  const ownershipRules = `
OWNERSHIP RULES (MANDATORY):
- ALL pipes, blends, and bottles listed in COLLECTION CONTEXT are items the user ALREADY OWNS
- For owned items (any item whose name appears in the collection context), you MUST use ownership-appropriate language:
  FORBIDDEN words/phrases for owned items: acquire, prioritize acquisition, add to collection, potential addition, consider adding, explore as an addition, add to want list, consider buying
  REQUIRED language for owned items: revisit, rotate back in, prioritize from your collection, use in your next session, compare against similar items you already own, restock soon if quantity is low, underused, hasn't been used recently
- Acquisition language (acquire, consider buying, add to want list, explore as a potential addition) is ONLY valid for items you suggest that do NOT appear in the provided collection context
- For every recommendation item, include "ownershipStatus": "owned" if the item is from the collection context, or "ownershipStatus": "not_owned" for external suggestions
- NEVER frame an owned item as if it is missing from the collection or needs to be acquired`;

  // Pairing rules — prevent the LLM from generating invalid pairing combinations
  const pairingRules = `
PAIRING RULES (MANDATORY):
- NEVER suggest pipe + cigar simultaneously in the same session
- NEVER suggest tobacco (pipe blend) + cigar simultaneously
- NEVER suggest whiskey + wine simultaneously
- NEVER suggest all modules at once
- Direct pairing: one item from one module paired with one item from another compatible module
- Collection mix & match: recommend the best items from each module independently
- Valid pairings only: cigar+whiskey, cigar+wine, pipe+whiskey, pipe+tobacco
- For pairing items, include "pairingMode": "direct_pairing" for a specific two-item match, or "pairingMode": "collection_mix_match" for a broader collection-wide suggestion`;

  return `You are PipeKeeper Curator. Your job is to provide specific, data-driven recommendations
based solely on the user's actual collection data provided below.

Return VALID JSON ONLY. No markdown. No backticks. No commentary before or after.
Maximum 8 items total across all groups. Be specific — reference real items from the collection by name.

COLLECTION CONTEXT:
${contextBlock}

ACTION: ${action?.label || action?.id || "Curator Action"}

TASK:
${actionPrompt}

${extraMeasurementInstructions}
${ownershipRules}
${pairingRules}

CRITICAL RULES FOR RECOMMENDATIONS:
1. Be specific — reference actual item names from the collection context
2. Never invent items not present in the collection
3. Each recommendation must have a clear "what was found", "why it matters", and "what will happen"
4. Assign the correct recommendationClass:
   - "auto_fix" = safe structured data fix (e.g. missing field that can be filled)
   - "advisory" = insight only, no data change (e.g. rotation opportunity, usage pattern)
   - "review_required" = user must confirm before change is applied
   - "multi_path" = requires user judgment between options (e.g. pipe specialization)
5. Advisory items must NEVER include proposedChange.payload with actual field mutations
6. Limit total items to 8 maximum
7. NEVER return two or more items that refer to the same item name — each item must appear at most once across all groups
8. For owned items, use "ownershipStatus": "owned" and ownership-appropriate language as specified in OWNERSHIP RULES

Return JSON in this exact structure:
{
  "actionId": "${action?.id || "curator_action"}",
  "title": "${action?.label || "Curator Results"}",
  "summary": "Specific summary referencing actual findings from the collection",
  "groups": [
    {
      "groupKey": "primary_recommendations",
      "groupTitle": "Primary Recommendations",
      "description": "Short description of what was found",
      "priority": "medium",
      "items": [
        {
          "id": "rec_1",
          "type": "measurement_update",
          "recommendationClass": "auto_fix",
          "recordType": "pipe",
          "recordId": "exact-record-id",
          "recordName": "Exact record name",
          "itemName": "Optional display title",
          "title": "Specific recommendation title referencing the item",
          "issue": "Exactly what was found about this specific item",
          "recommendation": "Exactly what action the user should take",
          "explanation": "Why this matters for this specific item",
          "confidence": "medium",
          "proposedChange": {
            "type": "field_update",
            "payload": {}
          }
        }
      ]
    }
  ]
}

If no actionable items exist, return valid JSON with a specific summary explaining why and groups: [].`;
}

async function invokeCuratorModel({ prompt, actionType, requestId }) {
  try {
    const response = await base44.functions.invoke("invokeCuratorLLM", {
      prompt,
      actionType,
      requestId,
    });
    return parseRawResponse(response);
  } catch (primaryErr) {
    console.warn(
      "[CuratorExecutor] invokeCuratorLLM failed, falling back to InvokeLLM",
      primaryErr?.message
    );
  }

  const fallbackRaw = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  return parseRawResponse(fallbackRaw);
}

function buildSessionBuilderPrompt(context) {
  const safeContext = buildSafeCollectionContext(context || {});
  const contextBlock = buildPromptBlock(safeContext);

  const hasPipes = (context?.pipes?.length || 0) > 0;
  const hasBlends = (context?.blends?.length || 0) > 0;
  const hasBottles = (context?.bottles?.length || 0) > 0;

  // Determine session scope from available data
  const scope = hasPipes && hasBottles ? 'combined'
    : hasBottles ? 'whiskey_only'
    : 'pipe_only';

  const schemaExample = scope === 'combined'
    ? `{ "type": "session_builder", "id": "session_1", "title": "Evening Pairing", "recordType": "session", "recordName": "Exact pipe name from collection or null", "blendName": "Exact blend name from collection or null", "bottleName": "Exact bottle name from collection or null", "explanation": "Why this session works together", "rationale": "Detailed tasting/smoking rationale", "confidence": "high" }`
    : scope === 'whiskey_only'
    ? `{ "type": "session_builder", "id": "session_1", "title": "Whiskey Tasting Session", "recordType": "session", "recordName": null, "blendName": null, "bottleName": "Exact bottle name from collection", "explanation": "Why this bottle is ideal tonight", "rationale": "Tasting notes and approach", "confidence": "high" }`
    : `{ "type": "session_builder", "id": "session_1", "title": "Pipe Session", "recordType": "session", "recordName": "Exact pipe name from collection", "blendName": "Exact blend name from collection", "bottleName": null, "explanation": "Why this pipe and blend pair well", "rationale": "Smoking rationale", "confidence": "high" }`;

  return `You are CollectionKeeper Curator. Generate a personalized session recommendation.

Return VALID JSON ONLY. No markdown. No backticks. No commentary.

COLLECTION CONTEXT:
${contextBlock}

TASK: Recommend the ideal session for tonight based on the user's collection data, preferences, and usage history.

RULES:
- recordName: use EXACT pipe name from the collection context (or null if whiskey-only)
- blendName: use EXACT tobacco blend name from the collection context (or null if whiskey-only)
- bottleName: use EXACT bottle name from the collection context (or null if pipe-only)
- For combined sessions, include all three fields where applicable
- Only reference items that exist in the provided collection context
- explanation should be 1-2 sentences on why this pairing works
- rationale should provide sensory/experiential detail

SCOPE: ${scope}

Return JSON in this exact structure:
{
  "actionId": "session_builder",
  "title": "Tonight's Session",
  "summary": "Brief description of the recommended session",
  "groups": [
    {
      "groupKey": "session_recommendation",
      "groupTitle": "Recommended Session",
      "description": "Your personalized session for tonight",
      "priority": "high",
      "items": [
        ${schemaExample}
      ]
    }
  ]
}`;
}

async function handleGenericAction({ actionType, context, requestId }) {
  const action = getActionByType(actionType);
  if (!action) throw new Error(`Unknown curator action type: ${actionType}`);

  const prompt = actionType === 'session_builder'
    ? buildSessionBuilderPrompt(context)
    : buildGenericCuratorPrompt(action, context, actionType);

  const raw = await invokeCuratorModel({ prompt, actionType, requestId });

  const fallbackType =
    actionType === "update_pipe_measurements"
      ? "pipe"
      : actionType === "update_bottle_data"
      ? "bottle"
      : null;

  return enrichCanonicalResult(raw, context, fallbackType);
}

// ─── Optimize Collection — staged local + focused LLM ─────────────────────────

const MAX_ITEMS_PER_OPTIMIZE_CATEGORY = 3;

function buildLocalOptimizeItems(context) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const cigars = context?.cigars || [];
  const smokingLogs = context?.smokingLogs || [];
  const tastingLogs = context?.tastingLogs || [];
  const items = [];

  // --- Metadata gaps (pipes) ---
  const pipesNoShape = pipes.filter((p) => !p.shape && !p.pipe_shape);
  if (pipesNoShape.length > 0) {
    items.push({
      id: 'local_pipe_no_shape',
      type: 'data_gap',
      recommendationClass: 'auto_fix',
      recordType: 'pipe',
      category: 'data_metadata',
      title: `${pipesNoShape.length} Pipe${pipesNoShape.length > 1 ? 's' : ''} Missing Shape Classification`,
      issue: `${pipesNoShape.length} pipe${pipesNoShape.length > 1 ? 's' : ''} lack a shape classification.`,
      recommendation: 'Open PipeKeeper and assign a shape to each affected pipe.',
      explanation: 'Shape drives pairing recommendations and session planning.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  // --- Metadata gaps (blends) ---
  const blendsNoType = blends.filter((b) => !b.blend_type && !b.blend_family);
  if (blendsNoType.length > 0) {
    items.push({
      id: 'local_blend_no_type',
      type: 'data_gap',
      recommendationClass: 'auto_fix',
      recordType: 'blend',
      category: 'data_metadata',
      title: `${blendsNoType.length} Blend${blendsNoType.length > 1 ? 's' : ''} Without Family Classification`,
      issue: `${blendsNoType.length} blend${blendsNoType.length > 1 ? 's' : ''} have no blend family.`,
      recommendation: 'Assign a blend family (Virginia, English, Aromatic, Burley) to each blend.',
      explanation: 'Blend family is required for diversity analysis and pairing suggestions.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  // --- Metadata gaps (cigars) ---
  const cigarsNoWrapper = cigars.filter((c) => !c.wrapper && !c.wrapper_country);
  if (cigarsNoWrapper.length > 0) {
    items.push({
      id: 'local_cigar_no_wrapper',
      type: 'data_gap',
      recommendationClass: 'auto_fix',
      recordType: 'cigar',
      category: 'data_metadata',
      title: `${cigarsNoWrapper.length} Cigar${cigarsNoWrapper.length > 1 ? 's' : ''} Missing Wrapper Details`,
      issue: `${cigarsNoWrapper.length} cigar${cigarsNoWrapper.length > 1 ? 's' : ''} are missing wrapper information.`,
      recommendation: 'Open CigarKeeper and add wrapper leaf or wrapper country for each cigar.',
      explanation: 'Wrapper data drives flavor profile analysis and pairing suggestions.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  // --- Restock: low blend stock ---
  const lowBlends = blends.filter((b) => {
    const oz =
      Number(b.tin_total_quantity_oz || 0) +
      Number(b.bulk_total_quantity_oz || 0) +
      Number(b.pouch_total_quantity_oz || 0);
    return oz > 0 && oz < 2;
  });
  if (lowBlends.length > 0) {
    items.push({
      id: 'local_low_blend_stock',
      type: 'restock',
      recommendationClass: 'advisory',
      recordType: 'blend',
      category: 'purchase_restock',
      title: `${lowBlends.length} Blend${lowBlends.length > 1 ? 's' : ''} Running Low (Under 2oz)`,
      issue: `${lowBlends.length} blend${lowBlends.length > 1 ? 's are' : ' is'} below 2oz: ${lowBlends.slice(0, 3).map((b) => b.name).join(', ')}${lowBlends.length > 3 ? ` and ${lowBlends.length - 3} more` : ''}.`,
      recommendation: 'Restock these blends or move backups from the cellar to active rotation.',
      explanation: 'Running out of preferred blends without a backup plan disrupts rotation.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  // --- Restock: cigars running low ---
  const lowCigars = cigars.filter((c) => {
    const qty = Number(c.quantity || 0);
    return qty > 0 && qty <= 3;
  });
  if (lowCigars.length > 0) {
    items.push({
      id: 'local_low_cigar_stock',
      type: 'restock',
      recommendationClass: 'advisory',
      recordType: 'cigar',
      category: 'purchase_restock',
      title: `${lowCigars.length} Cigar${lowCigars.length > 1 ? 's' : ''} Running Low (3 or Fewer)`,
      issue: `${lowCigars.length} cigar${lowCigars.length > 1 ? 's are' : ' is'} down to 3 or fewer: ${lowCigars.slice(0, 3).map((c) => c.name || c.brand || 'Unnamed').join(', ')}${lowCigars.length > 3 ? ` and ${lowCigars.length - 3} more` : ''}.`,
      recommendation: 'Consider restocking these cigars if they are regulars in your rotation.',
      explanation: 'Low-stock cigars are at risk of running out before reorder.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  // --- Utilization: never-used pipes ---
  const pipeUsage = {};
  for (const log of smokingLogs) {
    if (log.pipe_id) pipeUsage[log.pipe_id] = true;
  }
  const neverUsedPipes = pipes.filter((p) => !pipeUsage[p.id]);
  if (neverUsedPipes.length > 0 && pipes.length >= 3) {
    items.push({
      id: 'local_never_used_pipes',
      type: 'utilization',
      recommendationClass: 'advisory',
      recordType: 'pipe',
      category: 'utilization',
      title: `${neverUsedPipes.length} Pipe${neverUsedPipes.length > 1 ? 's' : ''} Never Smoked`,
      issue: `${neverUsedPipes.length} pipe${neverUsedPipes.length > 1 ? 's have' : ' has'} no recorded smoking sessions.`,
      recommendation: 'Schedule a session with one of these pipes to break it in or re-evaluate it.',
      explanation: 'Unsmoked pipes represent uninitiated investments. Early use reveals their character.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  // --- Utilization: never-smoked cigars ---
  const cigarSessionIds = new Set(
    (context?.cigarSessions || []).map((s) => s.cigar_id).filter(Boolean)
  );
  const neverSmokedCigars = cigars.filter((c) => c.id && !cigarSessionIds.has(c.id));
  if (neverSmokedCigars.length > 0 && cigars.length >= 3) {
    items.push({
      id: 'local_never_smoked_cigars',
      type: 'utilization',
      recommendationClass: 'advisory',
      recordType: 'cigar',
      category: 'utilization',
      title: `${neverSmokedCigars.length} Cigar${neverSmokedCigars.length > 1 ? 's' : ''} Never Smoked`,
      issue: `${neverSmokedCigars.length} cigar${neverSmokedCigars.length > 1 ? 's have' : ' has'} no logged sessions.`,
      recommendation: 'Start logging your cigar sessions so Curator can track what you have tried.',
      explanation: 'Unlogged cigars cannot be factored into pairing, rotation, or buy-again suggestions.',
      confidence: 'medium',
      ownershipStatus: 'owned',
    });
  }

  // --- Pipes without specialization ---
  const pipesNoFocus = pipes.filter(
    (p) => !p.focus || (Array.isArray(p.focus) && p.focus.length === 0)
  );
  if (pipesNoFocus.length > 0) {
    items.push({
      id: 'local_pipes_no_focus',
      type: 'specialization',
      recommendationClass: 'multi_path',
      recordType: 'pipe',
      category: 'specialization',
      title: `${pipesNoFocus.length} Pipe${pipesNoFocus.length > 1 ? 's' : ''} Without Specialization`,
      issue: `${pipesNoFocus.length} pipe${pipesNoFocus.length > 1 ? 's have' : ' has'} no tobacco focus assigned.`,
      recommendation: 'Assign a specialization (Aromatic, English, Virginia, etc.) to each pipe based on how you use it.',
      explanation: 'Pipe specialization dramatically improves pairing recommendations and session planning.',
      confidence: 'high',
      ownershipStatus: 'owned',
    });
  }

  return items;
}

function buildOptimizeHealthPrompt(safeContext, contextBlock) {
  return `You are PipeKeeper Curator analyzing collection health and utilization patterns.

Return VALID JSON ONLY. No markdown. No backticks. No commentary.
Maximum ${MAX_ITEMS_PER_OPTIMIZE_CATEGORY * 2} items total. Focus on health and utilization only.

COLLECTION CONTEXT:
${contextBlock}

TASK: Identify the most important collection health and utilization issues.

Focus on:
1. Collection balance and diversity gaps (blend families, pipe shapes, whiskey types, cigar wrappers)
2. Neglected or underused items that should be rotated back in
3. Aging opportunities or rotation imbalances
4. Cross-module synergy gaps (e.g. pipes with no matching blends)

RULES:
- Only reference items from the collection context
- Each item must have a clear "what was found", "why it matters", "what should be done"
- Prefer specific actionable findings over generic advice
- For owned items: "ownershipStatus": "owned"
- Limit to ${MAX_ITEMS_PER_OPTIMIZE_CATEGORY * 2} items across both groups

Return JSON:
{
  "actionId": "optimize_health",
  "summary": "Specific summary of health and utilization findings",
  "groups": [
    {
      "groupKey": "collection_health",
      "groupTitle": "Collection Health",
      "description": "Balance, diversity, and composition findings",
      "priority": "medium",
      "items": []
    },
    {
      "groupKey": "utilization",
      "groupTitle": "Utilization & Rotation",
      "description": "Underused items and rotation gaps",
      "priority": "medium",
      "items": []
    }
  ]
}

If no actionable items exist, return valid JSON with empty items arrays.`;
}

function buildOptimizePairingPrompt(safeContext, contextBlock) {
  const hasCigars = (safeContext.cigarStats?.count || 0) > 0;
  const hasBottles = (safeContext.bottleStats?.count || 0) > 0;

  return `You are PipeKeeper Curator analyzing specialization and pairing opportunities.

Return VALID JSON ONLY. No markdown. No backticks. No commentary.
Maximum ${MAX_ITEMS_PER_OPTIMIZE_CATEGORY * 2} items total. Focus on specialization and pairing only.

COLLECTION CONTEXT:
${contextBlock}

TASK: Identify specialization opportunities and pairing improvements.

Focus on:
1. Pipe specialization suggestions based on blend usage patterns
2. Pairing coverage gaps (pipe+tobacco, ${hasCigars ? 'cigar+whiskey, ' : ''}cross-module pairings)
3. Collection strategy — what to deepen vs diversify
${hasCigars ? '4. Cigar rotation and pairing opportunities with available spirits' : ''}
${hasBottles ? '4. Whiskey and tobacco pairing synergies' : ''}

RULES:
- Only reference items from the collection context
- NEVER suggest pipe + cigar simultaneously in the same session
- NEVER suggest all modules at once — pair exactly two things
- For owned items: "ownershipStatus": "owned"
- Limit to ${MAX_ITEMS_PER_OPTIMIZE_CATEGORY * 2} items across both groups

Return JSON:
{
  "actionId": "optimize_pairing",
  "summary": "Specific summary of specialization and pairing findings",
  "groups": [
    {
      "groupKey": "specialization",
      "groupTitle": "Specialization & Strategy",
      "description": "Pipe focus and collection strategy recommendations",
      "priority": "medium",
      "items": []
    },
    {
      "groupKey": "pairing",
      "groupTitle": "Pairing & Experience",
      "description": "Cross-module pairing opportunities",
      "priority": "medium",
      "items": []
    }
  ]
}

If no actionable items exist, return valid JSON with empty items arrays.`;
}

function deduplicateOptimizeItems(allItems) {
  const seen = new Map();
  for (const item of allItems) {
    const key = (item.id || '').startsWith('local_')
      ? item.id
      : String(item.recordName || item.itemName || item.title || item.id || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      // Prefer items with more detail
      const existing = seen.get(key);
      const inDetail = (item.explanation ? 1 : 0) + (item.recommendation ? 1 : 0) + (item.rationale ? 1 : 0);
      const exDetail = (existing.explanation ? 1 : 0) + (existing.recommendation ? 1 : 0) + (existing.rationale ? 1 : 0);
      if (inDetail > exDetail) seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

function groupOptimizeItemsByCategory(items) {
  const categoryMap = {
    data_metadata: [],
    collection_health: [],
    utilization: [],
    purchase_restock: [],
    specialization: [],
    pairing: [],
  };

  for (const item of items) {
    const cat = item.category || item.groupKey || 'collection_health';
    if (categoryMap[cat]) {
      categoryMap[cat].push(item);
    } else {
      categoryMap.collection_health.push(item);
    }
  }

  const groups = [];
  const groupLabels = {
    data_metadata: { title: 'Data & Metadata', description: 'Missing fields and classification gaps' },
    collection_health: { title: 'Collection Health', description: 'Balance, diversity, and composition' },
    utilization: { title: 'Utilization & Rotation', description: 'Underused items and rotation gaps' },
    purchase_restock: { title: 'Purchase & Restock', description: 'Low stock and acquisition opportunities' },
    specialization: { title: 'Specialization & Strategy', description: 'Focus areas and collection strategy' },
    pairing: { title: 'Pairing & Experience', description: 'Cross-module pairing opportunities' },
  };

  for (const [key, catItems] of Object.entries(categoryMap)) {
    if (catItems.length === 0) continue;
    const capped = catItems.slice(0, MAX_ITEMS_PER_OPTIMIZE_CATEGORY);
    groups.push({
      groupKey: key,
      groupTitle: groupLabels[key]?.title || key,
      description: groupLabels[key]?.description || '',
      priority: key === 'data_metadata' ? 'low' : 'medium',
      items: capped,
    });
  }

  return groups;
}

async function handleOptimizeCollection({ context, requestId }) {
  const safeContext = buildSafeCollectionContext(context || {});
  const contextBlock = buildPromptBlock(safeContext);

  // Step 1: Local cheap checks (instant, no LLM)
  const localItems = buildLocalOptimizeItems(context || {});

  // Step 2: Focused LLM call 1 — collection health + utilization
  let healthItems = [];
  try {
    const healthPrompt = buildOptimizeHealthPrompt(safeContext, contextBlock);
    const healthRaw = await invokeCuratorModel({ prompt: healthPrompt, actionType: 'optimize_health', requestId: `${requestId}_health` });
    const healthResult = enrichCanonicalResult(healthRaw, context || {}, null);
    if (Array.isArray(healthResult?.groups)) {
      for (const group of healthResult.groups) {
        const cat = group.groupKey === 'collection_health' ? 'collection_health' : 'utilization';
        for (const item of (group.items || []).slice(0, MAX_ITEMS_PER_OPTIMIZE_CATEGORY)) {
          healthItems.push({ ...item, category: cat });
        }
      }
    } else if (Array.isArray(healthResult?.items)) {
      healthItems = healthResult.items.slice(0, MAX_ITEMS_PER_OPTIMIZE_CATEGORY * 2).map((i) => ({ ...i, category: i.category || 'collection_health' }));
    }
  } catch (err) {
    console.warn('[CuratorExecutor] optimize health/utilization LLM call failed:', err?.message);
  }

  // Step 3: Focused LLM call 2 — specialization + pairing
  let pairingItems = [];
  try {
    const pairingPrompt = buildOptimizePairingPrompt(safeContext, contextBlock);
    const pairingRaw = await invokeCuratorModel({ prompt: pairingPrompt, actionType: 'optimize_pairing', requestId: `${requestId}_pairing` });
    const pairingResult = enrichCanonicalResult(pairingRaw, context || {}, null);
    if (Array.isArray(pairingResult?.groups)) {
      for (const group of pairingResult.groups) {
        const cat = group.groupKey === 'pairing' ? 'pairing' : 'specialization';
        for (const item of (group.items || []).slice(0, MAX_ITEMS_PER_OPTIMIZE_CATEGORY)) {
          pairingItems.push({ ...item, category: cat });
        }
      }
    } else if (Array.isArray(pairingResult?.items)) {
      pairingItems = pairingResult.items.slice(0, MAX_ITEMS_PER_OPTIMIZE_CATEGORY * 2).map((i) => ({ ...i, category: i.category || 'pairing' }));
    }
  } catch (err) {
    console.warn('[CuratorExecutor] optimize specialization/pairing LLM call failed:', err?.message);
  }

  // Step 4: Merge, deduplicate, group by category
  const allItems = deduplicateOptimizeItems([...localItems, ...healthItems, ...pairingItems]);
  const groups = groupOptimizeItemsByCategory(allItems);
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return {
    actionId: 'optimize_collection',
    title: 'Collection Optimization',
    summary: totalItems > 0
      ? `${totalItems} optimization recommendation${totalItems === 1 ? '' : 's'} across ${groups.length} ${groups.length === 1 ? 'category' : 'categories'}.`
      : 'No immediate optimizations found for your current collection.',
    groups,
  };
}

export async function executeCuratorAction({
  actionType,
  context,
  requestId,
  anchorOverrides,
}) {
  if (FIND_SIMILAR_TYPES.has(actionType)) {
    return await handleFindSimilar({
      actionType,
      context,
      anchorOverrides,
    });
  }

  if (actionType === 'optimize_collection') {
    return await handleOptimizeCollection({ context, requestId });
  }

  return await handleGenericAction({
    actionType,
    context,
    requestId,
  });
}

export default executeCuratorAction;