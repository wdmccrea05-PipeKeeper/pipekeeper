/**
 * CURATOR ACTION EXECUTOR
 * 
 * Executes a curator action by:
 * 1. Finding the action definition
 * 2. Building the LLM prompt
 * 3. Calling the invokeCuratorLLM backend function
 * 4. Returning the raw LLM response for normalization
 */

import { base44 } from "@/api/base44Client";
import { CURATOR_ACTIONS } from "./curatorActions";
import { runFindSimilar } from "@/components/recommendations/FindSimilarEngine";

const FIND_SIMILAR_ACTIONS = ["find_similar_blends", "find_similar_pipes", "find_similar_bottles"];

function getRecordTypeForSimilar(actionType) {
  if (actionType === "find_similar_blends") return "blend";
  if (actionType === "find_similar_pipes") return "pipe";
  if (actionType === "find_similar_bottles") return "bottle";
  return null;
}

export async function executeCuratorAction({ actionType, context, requestId, anchorOverrides }) {
  const action = CURATOR_ACTIONS.find((a) => a.id === actionType);
  if (!action) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  // Find Similar actions use FindSimilarEngine directly
  if (FIND_SIMILAR_ACTIONS.includes(actionType)) {
    return await executeFindSimilar({ actionType, context, anchorOverrides });
  }

  // All other actions: build a prompt and call the LLM
  const prompt = action.buildPrompt(context);
  if (!prompt) {
    throw new Error(`Action ${actionType} produced no prompt`);
  }

  const response = await base44.functions.invoke("invokeCuratorLLM", {
    prompt,
    actionType,
    requestId,
  });

  const raw = response?.data;
  if (!raw) {
    throw new Error("No response from curator LLM");
  }

  // The LLM returns a plain text response — wrap it so the normalizer can handle it
  if (typeof raw === "string") {
    return { summary: raw, items: [], groups: [] };
  }

  return raw;
}

async function executeFindSimilar({ actionType, context, anchorOverrides }) {
  const recordType = getRecordTypeForSimilar(actionType);
  const { pipes = [], blends = [], bottles = [], smokingLogs = [], tastingLogs = [] } = context;

  // Extract anchor list from overrides
  let anchors = [];
  if (Array.isArray(anchorOverrides?.anchors)) {
    anchors = anchorOverrides.anchors.filter(Boolean);
  } else if (Array.isArray(anchorOverrides)) {
    anchors = anchorOverrides.filter(Boolean);
  }

  const anchor = anchors.length === 1 ? anchors[0] : anchors;

  const result = await runFindSimilar({
    recordType,
    anchor,
    context: {
      pipes,
      blends,
      bottles,
      smokingLogs,
      tastingLogs,
    },
    mode: anchors.length === 1 ? "detail" : "top3",
  });

  if (!result) {
    return { summary: "No similar items found.", items: [], groups: [] };
  }

  // Wrap results in a normalizable shape
  const items = Array.isArray(result) ? result : (Array.isArray(result?.items) ? result.items : []);

  return {
    summary: `Found ${items.length} similar ${recordType}${items.length !== 1 ? "s" : ""} to explore.`,
    items: items.map((item, idx) => ({
      id: item.id || `similar_${idx}`,
      type: "similar_item",
      itemName: item.name || item.title || `Similar ${recordType}`,
      issue: item.justification || item.rationale || "",
      recommendation: item.description || item.notes || item.justification || "",
      recordType,
      confidence: "medium",
      proposedChanges: {},
    })),
    groups: [],
  };
}