import { base44 } from "@/api/base44Client";
import parseCuratorActionResponse from "./parseCuratorActionResponse";

/**
 * CURATOR ACTION EXECUTOR
 * 
 * Deterministic state machine for expert actions with 8s hard timeout.
 * 
 * Execution flow:
 * 1. Build action prompt + collection context
 * 2. Invoke LLM with timeout
 * 3. Parse response to structured JSON
 * 4. Normalize items
 * 5. Return result or error
 * 
 * States:
 * - success: { actionType, summary, items[] }
 * - empty: { actionType, summary, items: [] }
 * - error: throws with visible message
 * - timeout: throws timeout error
 */

const ACTION_EXECUTION_TIMEOUT = 8000;
const ACTION_PROMPTS = {
  optimize_collection: `Analyze this pipe and tobacco collection for optimization opportunities. Return ONLY valid JSON with this structure:
{
  "actionType": "optimize_collection",
  "summary": "X optimization opportunities found",
  "items": [
    {
      "id": "opt_1",
      "type": "reclassification" | "redundancy" | "rotation_fit" | "value_gap",
      "title": "Specific recommendation",
      "explanation": "Why this matters",
      "recordType": "pipe" | "blend",
      "recordId": "id of the record",
      "recordName": "name of the record",
      "proposedChanges": { field changes object },
      "rationale": "Why this change is good",
      "confidence": 0.0 to 1.0
    }
  ]
}

If no optimization opportunities exist, return {"items": [], "summary": "No optimization opportunities at this time"}.`,

  recommend_specializations: `Review these pipes and recommend specialized focus areas or rotation categories. Return ONLY valid JSON:
{
  "actionType": "recommend_specializations",
  "summary": "X specialization recommendations",
  "items": [
    {
      "id": "spec_1",
      "type": "specialization",
      "title": "Assign [Pipe Name] to [Specialization]",
      "explanation": "Why this fit is good",
      "recordType": "pipe",
      "recordId": "pipe id",
      "recordName": "pipe name",
      "proposedChanges": { "specializations": ["specialization"] },
      "rationale": "...",
      "confidence": 0.0 to 1.0
    }
  ]
}

If no recommendations exist, return {"items": [], "summary": "No specialization recommendations at this time"}.`,

  update_pipe_measurements: `Analyze these pipes and identify missing measurements. For each pipe with gaps, propose measurement values based on shape/size. Return ONLY valid JSON:
{
  "actionType": "update_pipe_measurements",
  "summary": "X pipes have measurable gaps",
  "items": [
    {
      "id": "meas_1",
      "type": "measurements",
      "title": "Add measurements to [Pipe Name]",
      "explanation": "Identified missing dimensions",
      "recordType": "pipe",
      "recordId": "pipe id",
      "recordName": "pipe name",
      "proposedChanges": { "length_mm": 150, "weight_grams": 40, "bowl_width_mm": 25 },
      "rationale": "Based on [shape/maker] reference data",
      "confidence": 0.0 to 1.0
    }
  ]
}

Return {"items": [], "summary": "All pipes have sufficient measurement data"} if none need updates.`,

  reclassify_tobacco: `Review these tobacco blends and suggest classification improvements (type, strength, room note). Return ONLY valid JSON:
{
  "actionType": "reclassify_tobacco",
  "summary": "X blends suggest reclassification",
  "items": [
    {
      "id": "reclass_1",
      "type": "reclassification",
      "title": "Reclassify [Blend Name] as [New Type]",
      "explanation": "Why current classification is incorrect",
      "recordType": "blend",
      "recordId": "blend id",
      "recordName": "blend name",
      "proposedChanges": { "blend_type": "English" },
      "rationale": "Based on [characteristics]",
      "confidence": 0.0 to 1.0
    }
  ]
}

Return {"items": [], "summary": "Blend classifications look accurate"} if no changes needed.`,
};

/**
 * Execute a curator expert action with timeout, error handling, and structured results.
 * 
 * @param {Object} params
 * @param {string} params.actionId - Action type (optimize_collection, recommend_specializations, etc)
 * @param {string} params.executionId - Unique execution ID
 * @param {string} params.displayLabel - User-facing label
 * @param {string} params.userPrompt - Additional instructions
 * @param {Object} params.collectionContext - Pipes, blends, bottles, logs
 * @param {Object} params.user - Current user
 * @param {Object} params.launchContext - Routed context from action launch
 * @returns {Promise<{result: Object, executionId: string, actionId: string}>}
 */
export async function executeCuratorAction({
  actionId,
  executionId,
  displayLabel,
  userPrompt,
  collectionContext,
  user,
  launchContext,
}) {
  if (!actionId) throw new Error("No actionId provided");
  if (!user?.email) throw new Error("User not authenticated");
  if (!collectionContext) throw new Error("No collection context");

  let result = null;
  let parseError = null;
  let normalizeError = null;

  try {
    // 1. Build action prompt
    const actionPrompt = ACTION_PROMPTS[actionId] || ACTION_PROMPTS.optimize_collection;
    const collectionSummary = buildCollectionSummary(collectionContext);
    const fullPrompt = `${actionPrompt}

COLLECTION DATA:
${collectionSummary}

ADDITIONAL INSTRUCTIONS:
${userPrompt || "Provide your best recommendations"}`;

    // 2. Invoke LLM with timeout wrapper
    result = await promiseWithTimeout(
      invokeAI(fullPrompt, actionId, executionId),
      ACTION_EXECUTION_TIMEOUT,
      "Expert action took too long to complete. Please try again."
    );

    if (!result || typeof result !== "string") {
      throw new Error("AI returned invalid response format");
    }

    // 3. Parse response
    try {
      const parsed = parseCuratorActionResponse(result);
      
      // 4. Normalize
      const normalized = normalizeExecutorResult(parsed, actionId);
      
      return {
        result: normalized,
        executionId,
        actionId,
      };
    } catch (parseErr) {
      parseError = parseErr;
      throw parseErr;
    }
  } catch (err) {
    // Timeout errors should not be re-wrapped
    if (err.message && err.message.includes("took too long")) {
      throw err;
    }
    
    // Parse errors should be wrapped but visible
    if (parseError || normalizeError) {
      throw new Error(
        `Curator could not produce usable results. ${parseError?.message || normalizeError?.message || "Please try again."}`
      );
    }
    
    throw err;
  }
}

/**
 * Promise wrapper with hard timeout
 */
function promiseWithTimeout(promise, ms, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    ),
  ]);
}

/**
 * Invoke AI with proper error handling
 */
async function invokeAI(prompt, actionId, executionId) {
  try {
    // Use the base44 integration for LLM invocation
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          actionType: { type: "string" },
          summary: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                title: { type: "string" },
                explanation: { type: "string" },
                recordType: { type: "string" },
                recordId: { type: "string" },
                recordName: { type: "string" },
                proposedChanges: { type: "object" },
                rationale: { type: "string" },
                confidence: { type: "number" },
              },
            },
          },
        },
        required: ["actionType", "summary", "items"],
      },
    });

    // Response is JSON when schema is provided
    if (typeof response === "object" && response !== null) {
      return JSON.stringify(response);
    }
    
    return response || "";
  } catch (err) {
    console.error("[curatorActionExecutor] AI invocation failed", err);
    throw new Error(`AI service error: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Build text summary of collection for context
 */
function buildCollectionSummary({ pipes = [], blends = [], bottles = [] }) {
  let summary = "";
  
  if (pipes.length > 0) {
    summary += `\nPIPES (${pipes.length} total):\n`;
    pipes.slice(0, 10).forEach((p, i) => {
      summary += `${i + 1}. ${p.name || 'Unnamed'} (${p.shape || 'Unknown'}, ${p.condition || 'Unknown condition'})\n`;
    });
    if (pipes.length > 10) summary += `... and ${pipes.length - 10} more\n`;
  }
  
  if (blends.length > 0) {
    summary += `\nTOBACCO BLENDS (${blends.length} total):\n`;
    blends.slice(0, 10).forEach((b, i) => {
      summary += `${i + 1}. ${b.name || 'Unnamed'} (${b.blend_type || 'Unknown'}, ${b.strength || 'Unknown'})\n`;
    });
    if (blends.length > 10) summary += `... and ${blends.length - 10} more\n`;
  }
  
  if (bottles.length > 0) {
    summary += `\nWHISKEY (${bottles.length} total)\n`;
  }
  
  return summary || "Empty collection";
}

/**
 * Normalize executor result to standard schema
 */
function normalizeExecutorResult(raw, actionId) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid response structure");
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  
  // Filter to valid items only
  const validItems = items.filter((item) => {
    return (
      item &&
      item.recordId &&
      item.title &&
      item.type &&
      item.recordType
    );
  });

  return {
    actionType: actionId || raw.actionType || "unknown",
    summary: raw.summary || `${validItems.length} recommendations found`,
    items: validItems.map((item, idx) => ({
      id: item.id || `${actionId}_${idx}`,
      type: item.type,
      title: item.title,
      explanation: item.explanation || "",
      recordType: item.recordType,
      recordId: item.recordId,
      recordName: item.recordName || "",
      proposedChanges: item.proposedChanges || {},
      rationale: item.rationale || "",
      confidence: typeof item.confidence === "number" ? item.confidence : null,
    })),
  };
}