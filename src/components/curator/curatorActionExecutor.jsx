import { base44 } from "@/api/base44Client";
import { CURATOR_ACTIONS } from "./curatorActions";
import { buildSafeCollectionContext, buildPromptBlock } from "./collectionContextBudget";
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

function parseRawResponse(raw) {
  if (!raw) throw new Error("Empty response from LLM");

  // Already an object
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (Array.isArray(raw)) return { items: raw };

  if (typeof raw === "string") {
    // Strip fenced code blocks
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
    const jsonStr = fenced ? fenced[1].trim() : raw.trim();
    try {
      return JSON.parse(jsonStr);
    } catch {
      throw new Error("Curator response could not be parsed as JSON");
    }
  }

  throw new Error("Unexpected response format from LLM");
}

async function handleFindSimilar({ actionType, context, anchorOverrides }) {
  const recordType = RECORD_TYPE_MAP[actionType];

  const anchors = Array.isArray(anchorOverrides)
    ? anchorOverrides.filter(Boolean)
    : Array.isArray(anchorOverrides?.anchors)
    ? anchorOverrides.anchors.filter(Boolean)
    : anchorOverrides && typeof anchorOverrides === "object" && !Array.isArray(anchorOverrides)
    ? [anchorOverrides]
    : [];

  if (anchors.length === 0) {
    throw new Error("Find Similar requires at least one anchor item");
  }

  // Run find-similar for each anchor, merge and dedupe
  const allResults = [];
  const seen = new Set();

  for (const anchor of anchors) {
    try {
      const result = await runFindSimilar({
        recordType,
        anchor,
        context,
        mode: "detail",
      });

      const items = result?.items || result?.recommendations || [];
      for (const item of items) {
        const key = (item.name || item.title || "").toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          allResults.push(item);
        }
      }
    } catch (err) {
      console.warn("[CuratorExecutor] find-similar failed for anchor", anchor?.name, err?.message);
    }
  }

  // Return top 3
  return { items: allResults.slice(0, 3) };
}

async function handleGenericAction({ actionType, context, requestId }) {
  const action = (CURATOR_ACTIONS || []).find(
    (a) => a.id === actionType || a.type === actionType
  );

  if (!action) {
    throw new Error(`Unknown curator action type: ${actionType}`);
  }

  const safeContext = buildSafeCollectionContext(context);
  const contextBlock = buildPromptBlock(safeContext);
  const actionPrompt =
    typeof action.buildPrompt === "function"
      ? action.buildPrompt(context)
      : action.prompt || action.description || actionType;

  const prompt = `${contextBlock}\n\n${actionPrompt}`;

  // Primary: invokeCuratorLLM backend function
  try {
    const response = await base44.functions.invoke("invokeCuratorLLM", {
      prompt,
      actionType,
      requestId,
    });
    const raw = response?.data ?? response;
    return parseRawResponse(raw);
  } catch (primaryErr) {
    console.warn("[CuratorExecutor] invokeCuratorLLM failed, falling back to InvokeLLM", primaryErr?.message);
  }

  // Fallback: Core InvokeLLM integration
  const fallbackRaw = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });
  return parseRawResponse(fallbackRaw);
}

export async function executeCuratorAction({ actionType, context, requestId, anchorOverrides }) {
  if (FIND_SIMILAR_TYPES.has(actionType)) {
    return handleFindSimilar({ actionType, context, anchorOverrides });
  }
  return handleGenericAction({ actionType, context, requestId });
}

export default executeCuratorAction;