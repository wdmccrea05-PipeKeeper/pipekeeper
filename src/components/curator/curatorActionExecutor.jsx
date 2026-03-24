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
import { normalizeCuratorActionResult } from "./normalizeCuratorActionResult";
import {
  translateToEnglish,
  translateFromEnglish,
  getCurrentLocale,
} from "@/components/utils/aiTranslation";
import {
  buildSafeCollectionContext,
  buildPromptBlock,
  validateCandidateIds,
} from "./collectionContextBudget";
import {
  buildCoverageAudit,
  validateCompressionCoverage,
} from "./curatorCoverageAudit";
import {
  buildNoveltyPromptAddendum,
  buildBroadenPromptAddendum,
  recordRecommendationsShown,
} from "./curatorRecommendationHistory";

// System prompt — enforces JSON-only structured output (no explanatory text)
const CURATOR_SYSTEM_PROMPT = `You are a collection analysis expert. Return ONLY valid JSON. No explanations, markdown, code blocks, or text outside JSON. All results must be inside groups[].items[].`;

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
        smoking_logs_count: (collectionContext.smokingLogs || collectionContext.logs || []).length,
        tasting_logs_count: (collectionContext.tastingLogs || []).length,
      },
    });
  } catch (err) {
    console.error("Failed to create action run audit:", err);
    // Continue anyway — audit logging is non-blocking
  }

  try {
    // Build English prompt (translate user prompt if needed)
    const englishPrompt = await translateToEnglish(userPrompt, locale);

    // --- Coverage Audit (pre-AI) ---
    const preAudit = buildCoverageAudit(collectionContext);

    // Build full AI prompt with collection context
    const isBroaden = launchContext?.regenerateMode === 'broaden';
    const fullPrompt = buildCuratorPrompt(actionId, englishPrompt, collectionContext, {
      noveltyAddendum: buildNoveltyPromptAddendum(actionId, collectionContext),
      broadenAddendum: isBroaden ? buildBroadenPromptAddendum(actionId, collectionContext) : '',
    });

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

    // Build safe context for post-AI validation
    const safeCtx = buildSafeCollectionContext({
      pipes: collectionContext.pipes || [],
      blends: collectionContext.blends || [],
      bottles: collectionContext.bottles || [],
      smokingLogs: collectionContext.smokingLogs || collectionContext.logs || [],
      tastingLogs: collectionContext.tastingLogs || [],
    });

    // Validate AI-returned item IDs against the actual eligible candidate pool
    // This prevents hallucinated IDs from reaching the UI
    if (rawResult.groups) {
      rawResult.groups = rawResult.groups.map(group => ({
        ...group,
        items: (group.items || []).map(item => {
          if (item.itemId) {
            const isValid = validateCandidateIds([item.itemId], safeCtx).length > 0;
            if (!isValid) {
              // Keep the recommendation but clear the invalid itemId so apply actions don't break
              return { ...item, itemId: null, _idValidationFailed: true };
            }
          }
          return item;
        }),
      }));
    }

    // --- Coverage Audit (post-AI) ---
    const postAudit = buildCoverageAudit(collectionContext, rawResult);

    // Validate compression didn't lose any candidates
    validateCompressionCoverage(safeCtx, postAudit);

    // Attach coverage metadata to result for debugging/display
    rawResult._coverage = safeCtx.candidateStats;
    rawResult._contextMode = safeCtx.mode;
    rawResult._audit = postAudit;

    const normalizedResult = normalizeCuratorActionResult(rawResult, {
      actionId,
      executionId,
      collectionContext,
    });

    // Record recommendations shown (for anti-repetition)
    const allRecs = (normalizedResult.groups || []).flatMap(g => g.items || []);
    recordRecommendationsShown(actionId, allRecs);

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

    // Log recommendations to audit — fire-and-forget (non-blocking)
    // This ensures result UI appears immediately, even if persistence fails
    if (actionRun) {
      (async () => {
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
          console.error("Failed to log recommendations (non-fatal):", err);
          // Non-blocking — persistence failures do not block result UI
        }
      })();
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
 * Build the full prompt for AI with safe, budget-aware collection context.
 * No silent truncation — all items are accounted for via the budget manager.
 */
function buildCuratorPrompt(actionId, userPrompt, context, options = {}) {
  const { noveltyAddendum = '', broadenAddendum = '' } = options;
  // Build safe context (handles small/standard/large/huge modes automatically)
  const safeCtx = buildSafeCollectionContext({
    pipes: context.pipes || [],
    blends: context.blends || [],
    bottles: context.bottles || [],
    smokingLogs: context.smokingLogs || context.logs || [],
    tastingLogs: context.tastingLogs || [],
    userProfile: context.userProfile || null,
  });

  const collectionBlock = buildPromptBlock(safeCtx);

  const ACTION_INSTRUCTIONS = {
    optimize_collection: `TASK: Analyze collection for optimization opportunities.
Use the statistics above to identify specific issues. Reference actual item names from the lists.
Return:
1. Structural imbalances (gaps, redundancies, weaknesses) — cite actual counts from stats
2. Item-level actions (reclassifications, specializations, updates)
3. Rotation/usage improvements based on neglected/never-used counts
4. Acquisition opportunities if relevant
Each recommendation must include: current issue, proposed change, reasoning, confidence.`,

    recommend_specializations: `TASK: Recommend pipe specializations based on collection analysis.
Use the pipe stats (unfocused count, shape distribution) to ground recommendations.
Return:
1. Current specialization pattern assessment
2. Top 3 specialization opportunities with specific pipe names
3. Which tobacco types align with each recommended specialization
4. Priority ordering with reasoning`,

    reclassify_tobacco: `TASK: Identify tobacco classification issues.
Review the blends list for missing or inconsistent blend_type values.
Return recommendations for: missing classifications, inconsistent labels, misclassified blends.
Use only canonical types: Virginia, Va/Per, English, Balkan, Aromatic, Burley, Oriental, Cavendish`,

    update_pipe_measurements: `TASK: Identify pipes with missing or inconsistent measurements.
Return: pipes needing measurements, priority order for updates, measurement best practices.`,

    update_bottle_data: `TASK: Identify whiskey bottle data gaps.
Use the bottle stats (untasted count, type distribution) to prioritize.
Return: missing metadata by priority, valuation gaps, tasting note opportunities.`,
  };

  const actionInstructions = ACTION_INSTRUCTIONS[actionId] || `TASK: Analyze the collection and provide actionable recommendations based on the data above.`;

  return `${CURATOR_SYSTEM_PROMPT}

${actionInstructions}

${collectionBlock}
${noveltyAddendum}
${broadenAddendum}

USER REQUEST:
${userPrompt}

IMPORTANT: Base ALL factual claims on the statistics provided above. Do not invent numbers.
When referencing items, use names from the lists above.
When itemId is available from the list, include it in the JSON.

REQUIRED OUTPUT FORMAT:
{
  "actionId": "${actionId}",
  "title": "string",
  "summary": "string",
  "status": "completed",
  "executionId": "string",
  "groups": [
    {
      "groupKey": "string",
      "groupTitle": "string",
      "priority": "high|medium|low|info",
      "itemCount": number,
      "items": [
        {
          "id": "string",
          "type": "pipe|tobacco|bottle|collection",
          "itemId": "string or null",
          "itemName": "string",
          "issue": "string",
          "recommendation": "string",
          "proposedChange": { "type": "string", "payload": {} },
          "confidence": "high|medium|low"
        }
      ]
    }
  ]
}

Return ONLY valid JSON. No additional text.`;
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