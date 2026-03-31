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

// ─── JSON extraction helpers ────────────────────────────────────────────────

function extractJsonCandidate(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // ```json ... ``` or ``` ... ```
  const fenced =
    trimmed.match(/```json\s*([\s\S]*?)```/i) ||
    trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  // First { ... } block
  const objectMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (objectMatch?.[1]?.trim()) return objectMatch[1].trim();

  // First [ ... ] block
  const arrayMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (arrayMatch?.[1]?.trim()) return arrayMatch[1].trim();

  return null;
}

function parseRawResponse(raw) {
  if (!raw) throw new Error("Curator returned no response");

  if (Array.isArray(raw)) return { items: raw };

  if (typeof raw === "object") {
    // Unwrap common backend payload wrappers
    if (typeof raw.result !== "undefined") return parseRawResponse(raw.result);
    if (typeof raw.output !== "undefined") return parseRawResponse(raw.output);
    if (typeof raw.body !== "undefined") return parseRawResponse(raw.body);
    if (typeof raw.data !== "undefined" && raw.data !== raw) return parseRawResponse(raw.data);

    // Already canonical
    if (Array.isArray(raw.groups) || Array.isArray(raw.items)) return raw;

    return raw;
  }

  const text = String(raw).trim();
  if (!text) throw new Error("Curator returned an empty string");

  // Try plain JSON first
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  // Try extracted candidate (fenced blocks, embedded objects/arrays)
  const candidate = extractJsonCandidate(text);
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
      // fall through
    }
  }

  throw new Error("Curator response could not be parsed as JSON");
}

// ─── Shared utilities ────────────────────────────────────────────────────────

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

function normalizeSimilarItem(item, recordType, anchor) {
  const title = item?.title || item?.name || "Recommendation";
  return {
    id:
      item?.id ||
      `similar_${recordType}_${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    type: item?.type || "similar_item",
    recordType,
    title,
    category: item?.category || "",
    explanation: item?.explanation || "",
    whyFitsYou: item?.whyFitsYou || "",
    characteristics: Array.isArray(item?.characteristics) ? item.characteristics : [],
    anchorId: anchor?.id || null,
    anchorName: anchor?.name || null,
  };
}

// ─── Find Similar ─────────────────────────────────────────────────────────────

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

// ─── Generic Action ───────────────────────────────────────────────────────────

function buildGenericCuratorPrompt(action, context) {
  const safeContext = buildSafeCollectionContext(context || {});
  const contextBlock = buildPromptBlock(safeContext);
  const actionPrompt =
    typeof action?.buildPrompt === "function"
      ? action.buildPrompt(context || {})
      : action?.prompt || action?.description || action?.id || "Curator action";

  return `You are PipeKeeper Curator.

Return VALID JSON ONLY. No markdown. No backticks. No commentary before or after.

COLLECTION CONTEXT:
${contextBlock}

ACTION: ${action?.label || action?.id || "Curator Action"}

TASK:
${actionPrompt}

Return JSON in this exact structure:
{
  "actionId": "${action?.id || "curator_action"}",
  "title": "${action?.label || "Curator Results"}",
  "summary": "Brief summary of findings",
  "groups": [
    {
      "groupKey": "primary_recommendations",
      "groupTitle": "Primary Recommendations",
      "description": "Short description",
      "priority": "medium",
      "items": [
        {
          "id": "rec_1",
          "type": "collection",
          "title": "Recommendation title",
          "itemName": "Optional item name",
          "issue": "What you found",
          "recommendation": "What the user should do",
          "explanation": "Why this matters",
          "confidence": "medium",
          "proposedChange": {
            "type": "advice_only",
            "payload": {}
          }
        }
      ]
    }
  ]
}

If no actionable items exist, return valid JSON with a summary and groups: [].`;
}

async function invokeCuratorModel({ prompt, actionType, requestId }) {
  // Primary: invokeCuratorLLM backend function
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

  // Fallback: Core InvokeLLM integration
  const fallbackRaw = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });
  return parseRawResponse(fallbackRaw);
}

async function handleGenericAction({ actionType, context, requestId }) {
  const action = getActionByType(actionType);
  if (!action) throw new Error(`Unknown curator action type: ${actionType}`);

  const prompt = buildGenericCuratorPrompt(action, context);
  return await invokeCuratorModel({ prompt, actionType, requestId });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function executeCuratorAction({
  actionType,
  context,
  requestId,
  anchorOverrides,
}) {
  if (FIND_SIMILAR_TYPES.has(actionType)) {
    return await handleFindSimilar({ actionType, context, anchorOverrides });
  }
  return await handleGenericAction({ actionType, context, requestId });
}

export default executeCuratorAction;