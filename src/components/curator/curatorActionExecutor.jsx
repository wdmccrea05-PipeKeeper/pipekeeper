/**
 * Curator Action Executor
 * 
 * Standalone action execution path (does NOT use sendMessage)
 * - Calls AI with strict JSON schema requirements
 * - Normalizes + validates response
 * - Logs execution to audit entities
 * - Returns structured ActionResult for UI
 */

import { base44 } from "@/api/base44Client";
import { curatorActionResultNormalizer } from "./curatorActionResultNormalizer";
import {
  translateToEnglish,
  translateFromEnglish,
  getCurrentLocale,
} from "@/components/utils/aiTranslation";

// System prompt — enforces JSON-only structured output (no explanatory text)
const CURATOR_SYSTEM_PROMPT = `You are a collection analysis engine. Return ONLY valid JSON. No explanations, markdown, or text outside JSON.`;

/**
 * Execute a curator action independently
 * Does NOT use sendMessage() or create chat messages
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
  if (!user?.email) {
    throw new Error("User email required to execute action");
  }

  const locale = getCurrentLocale();

  // Start audit logging
  let actionRun = null;
  try {
    actionRun = await base44.entities.CuratorActionRun.create({
      action_id: actionId,
      execution_id: executionId,
      user_email: user.email,
      status: "running",
      started_at: new Date().toISOString(),
      collection_snapshot: {
        pipes_count: collectionContext.pipes?.length || 0,
        blends_count: collectionContext.blends?.length || 0,
        bottles_count: collectionContext.bottles?.length || 0,
      },
    });
  } catch (err) {
    console.error("Failed to create action run audit:", err);
    // Continue anyway — audit logging is non-blocking
  }

  try {
    // Build English prompt (translate user prompt if needed)
    const englishPrompt = await translateToEnglish(userPrompt, locale);

    // Build full AI prompt with collection context
    const fullPrompt = buildCuratorPrompt(actionId, englishPrompt, collectionContext);

    // Call AI with JSON schema enforcement
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: false, // Collection analysis is local-only
      response_json_schema: {
        type: "object",
        properties: {
          actionId: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          status: { type: "string" },
          executionId: { type: "string" },
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                groupKey: { type: "string" },
                groupTitle: { type: "string" },
                priority: { type: "string" },
                itemCount: { type: "number" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      type: { type: "string" },
                      itemId: { type: "string" },
                      itemName: { type: "string" },
                      issue: { type: "string" },
                      recommendation: { type: "string" },
                      proposedChange: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          payload: { type: "object" },
                        },
                      },
                      confidence: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        required: ["actionId", "title", "summary", "groups"],
      },
    });

    // Parse + normalize response
    // When response_json_schema is provided, InvokeLLM returns the parsed object directly
    let rawResult = aiResponse?.data || aiResponse;

    // Handle string response (for older API versions or edge cases)
    if (typeof rawResult === "string") {
      console.log("[executeCuratorAction] AI returned string, parsing JSON...");
      try {
        rawResult = JSON.parse(rawResult);
      } catch (parseErr) {
        // If it looks like wrapped text, extract JSON from it
        console.log("[executeCuratorAction] Direct parse failed, extracting JSON...");
        const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            rawResult = JSON.parse(jsonMatch[0]);
            console.log("[executeCuratorAction] Extracted JSON successfully");
          } catch (extractErr) {
            console.error("[executeCuratorAction] Failed to parse extracted JSON:", extractErr);
            throw new Error(`Failed to parse AI response: ${parseErr.message}`);
          }
        } else {
          console.error("[executeCuratorAction] No JSON found in response:", rawResult.slice(0, 200));
          throw new Error(`AI response is not valid JSON: ${rawResult.slice(0, 200)}`);
        }
      }
    }

    // Validate result is an object with required structure
    if (!rawResult || typeof rawResult !== "object") {
      console.error("[executeCuratorAction] Invalid result type:", typeof rawResult, rawResult);
      throw new Error("AI returned invalid response format — expected JSON object");
    }

    // Validate required top-level fields
    if (!rawResult.actionId && !rawResult.title && !rawResult.groups) {
      console.warn("[executeCuratorAction] Missing required JSON fields, attempting fallback...");
      // Try to salvage response by treating it as a general recommendation
      rawResult = {
        actionId: actionId,
        title: "Collection Insights",
        summary: typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult).slice(0, 500),
        groups: [],
      };
    }

    const normalizedResult = curatorActionResultNormalizer(rawResult, {
      actionId,
      executionId,
      collectionContext,
    });

    // Translate result back to user's locale
    const translatedResult = await translateActionResult(normalizedResult, locale);

    // Log success
    if (actionRun) {
      try {
        await base44.entities.CuratorActionRun.update(actionRun.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          result_summary: {
            title: translatedResult.title,
            summary: translatedResult.summary,
            groupCount: translatedResult.groups?.length || 0,
            itemCount: translatedResult.groups?.reduce(
              (s, g) => s + (g.items?.length || 0),
              0
            ) || 0,
          },
        });
      } catch (err) {
        console.error("Failed to update action run:", err);
      }
    }

    // Log recommendations to audit
    if (actionRun) {
      try {
        for (const group of translatedResult.groups || []) {
          for (const item of group.items || []) {
            await base44.entities.CuratorRecommendation.create({
              action_run_id: actionRun.id,
              execution_id: executionId,
              recommendation_id: item.id,
              group_key: group.groupKey,
              item_type: item.type,
              item_id: item.itemId,
              item_name: item.itemName,
              issue: item.issue,
              recommendation: item.recommendation,
              proposed_change: item.proposedChange,
              confidence: item.confidence,
              status: "pending",
            });
          }
        }
      } catch (err) {
        console.error("Failed to log recommendations:", err);
        // Non-blocking — continue
      }
    }

    return {
      success: true,
      actionId,
      executionId,
      actionRun,
      result: translatedResult,
    };
  } catch (err) {
    console.error("[executeCuratorAction] Error:", err);

    // Log failure
    if (actionRun) {
      try {
        await base44.entities.CuratorActionRun.update(actionRun.id, {
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: err?.message || String(err),
        });
      } catch (updateErr) {
        console.error("Failed to log action failure:", updateErr);
      }
    }

    throw err;
  }
}

/**
 * Build the full prompt for AI with collection context
 */
function buildCuratorPrompt(actionId, userPrompt, context) {
  const pipesList = (context.pipes || [])
    .map((p) => `- ${p.name || "Unknown"} (${p.maker || "unknown"}, ${p.shape || "unknown"})`)
    .join("\n");

  const blendsList = (context.blends || [])
    .map((b) => `- ${b.name || "Unknown"} (${b.manufacturer || "unknown"}, ${b.blend_type || "unknown"})`)
    .join("\n");

  const bottlesList = (context.bottles || [])
    .slice(0, 20)
    .map((b) => `- ${b.name || "Unknown"} (${b.distillery || "unknown"}, ${b.whiskey_type || "unknown"})`)
    .join("\n");

  let actionSpecificInstructions = "";

  if (actionId === "optimize_collection") {
    actionSpecificInstructions = `
TASK: Analyze collection for optimization opportunities

Return:
1. Structural imbalances (gaps, redundancies, weaknesses)
2. Item-level actions (reclassifications, updates, specializations)
3. Bottle addition opportunities (based on user whiskey preferences)

Be specific. Each recommendation must include:
- Current issue
- Proposed change
- Why (reasoning)
- Confidence level`;
  } else if (actionId === "recommend_specializations") {
    actionSpecificInstructions = `
TASK: Recommend pipe specializations based on collection analysis

Return:
1. Current specialization assessment
2. Target specialization strategy
3. Specific pipe reclassifications with focus areas

Each pipe recommendation must include what tobacco types it should be designated for.`;
  } else if (actionId === "reclassify_tobacco") {
    actionSpecificInstructions = `
TASK: Identify tobacco classification issues

Return recommendations for:
1. Missing classifications
2. Inconsistent labels
3. Misclassified blends

Use only these canonical types: Virginia, Va/Per, English, Balkan, Aromatic, Burley, Oriental, Cavendish`;
  } else if (actionId === "update_pipe_measurements") {
    actionSpecificInstructions = `
TASK: Identify pipes with missing or inconsistent measurements

Return:
1. Pipes with missing length/weight
2. Pipes with inconsistent dimensions
3. Measurement estimation recommendations`;
  } else if (actionId === "update_bottle_data") {
    actionSpecificInstructions = `
TASK: Identify bottle data gaps

Return:
1. Missing metadata (proof, age, bottling info)
2. Valuation gaps
3. Tasting note opportunities`;
  }

  return `${CURATOR_SYSTEM_PROMPT}

${actionSpecificInstructions}

COLLECTION DATA:

PIPES (${context.pipes?.length || 0} total):
${pipesList || "None"}

TOBACCOS (${context.blends?.length || 0} total):
${blendsList || "None"}

WHISKEY BOTTLES (${context.bottles?.length || 0} total):
${bottlesList || "None"}

USER REQUEST:
${userPrompt}

Return ONLY valid JSON matching the required schema.`;
}

/**
 * Translate translatable fields in action result
 */
async function translateActionResult(result, locale) {
  if (locale === "en") return result; // Already in English

  const translated = { ...result };

  // Translate group titles and item text
  if (translated.groups) {
    translated.groups = await Promise.all(
      translated.groups.map(async (group) => ({
        ...group,
        groupTitle: await translateFromEnglish(group.groupTitle, locale),
        items: await Promise.all(
          (group.items || []).map(async (item) => ({
            ...item,
            issue: await translateFromEnglish(item.issue, locale),
            recommendation: await translateFromEnglish(item.recommendation, locale),
          }))
        ),
      }))
    );
  }

  return translated;
}