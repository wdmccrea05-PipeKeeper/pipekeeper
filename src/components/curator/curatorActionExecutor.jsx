import { base44 } from "@/api/base44Client";
import parseCuratorActionResponse from "./parseCuratorActionResponse";
import {
  buildSafeCollectionContext,
  buildPromptBlock,
} from "./collectionContextBudget";

function buildSharedInstruction(context) {
  const safeContext = buildSafeCollectionContext({
    pipes: context?.pipes || [],
    blends: context?.blends || [],
    bottles: context?.bottles || [],
    smokingLogs: context?.smokingLogs || [],
    tastingLogs: context?.tastingLogs || [],
    userProfile: context?.userProfile || null,
  });

  const compressedCollectionBlock = buildPromptBlock(safeContext);
  const tasteProfile = context?.tasteProfile || null;

  return `
You are the in-app curator for a collector app.

Return VALID JSON only.
Do not return markdown.
Do not return prose outside JSON.
Do not invent records or record IDs.
Use only the provided collection context.
If no valid result exists, return:
{
  "summary": "No actionable recommendations right now.",
  "items": []
}

Allowed item.type values:
- specialization
- reclassification
- measurement_update
- rotation_optimization
- redundancy_flag
- pairing_recommendation
- session_builder

Allowed recordType values:
- pipe
- blend
- bottle

Schema:
{
  "summary": "string",
  "items": [
    {
      "id": "string",
      "type": "specialization | reclassification | measurement_update | rotation_optimization | redundancy_flag | pairing_recommendation | session_builder",
      "title": "string",
      "explanation": "string",
      "rationale": "string",
      "confidence": 0.0,
      "recordType": "pipe | blend | bottle",
      "recordId": "string",
      "recordName": "string",
      "proposedChanges": {},
      "followUpPrompt": "string"
    }
  ]
}

Collection context:
${compressedCollectionBlock}

Taste profile:
${JSON.stringify(tasteProfile || {}, null, 2)}
`;
}

function buildSessionBuilderPrompt(context) {
  const hasPipes = Array.isArray(context?.pipes) && context.pipes.length > 0;
  const hasBlends = Array.isArray(context?.blends) && context.blends.length > 0;
  const hasBottles = Array.isArray(context?.bottles) && context.bottles.length > 0;

  return `
${buildSharedInstruction(context)}

TASK:
Generate exactly 3 curated session experiences from the user's real collection.

A session may combine:
- a pipe
- a tobacco blend
- a whiskey bottle

The 3 sessions must cover these intents:
1. Mood / relaxed evening
2. Rotation / underused item recovery
3. Discovery / something different

STRICT RULES:
- item.type must be "session_builder"
- recordType must be "pipe"
- recordId must be the actual id of the pipe anchoring the session
- recordName must be the actual pipe name
- proposedChanges must be {}
- Use human-readable text only
- No snake_case in title/explanation/rationale
- Return exactly 3 items when at least one pipe exists
- If no pipes exist, return zero items

WHISKEY RULE:
${hasBottles ? `Because whiskey bottles are available in this scope, at least 2 of the 3 sessions MUST include a specific whiskey bottle from the collection.` : `No whiskey bottles are available in this scope, so sessions should use pipe + tobacco only.`}

TOBACCO RULE:
${hasBlends ? `Use actual tobacco blends from the collection.` : `If no tobacco blends are available, explain the session using the pipe alone.`}

PIPE RULE:
${hasPipes ? `You must anchor every session to a real pipe record from the collection.` : `If no pipes exist, return zero items.`}

Return JSON only.
`;
}

function buildOptimizeCollectionPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Return only the top 3 highest-confidence optimization recommendations for this collection.

Allowed recommendation focus:
- underused pipes
- redundant blends
- specialization opportunities
- obvious collection gaps

STRICT OUTPUT RULES:
- Return at most 3 items
- Each item must be directly actionable on an existing record
- Do not return broad strategy
- Do not return acquisition advice
- Do not return cross-module essays
- Keep summary to one sentence
- Use short, user-facing titles
- Use human-readable values, not snake_case
`;
}

function buildRecommendSpecializationsPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Recommend concrete specialization assignments or refinements for the user's existing pipes.

Use actual evidence such as:
- smoking frequency
- blend pairings
- existing specialization overlap
- shape/material/role patterns
- rotation balance

OUTPUT REQUIREMENTS:
- item.type must be "specialization"
- recordType must be "pipe"
- proposedChanges must contain direct writable fields such as:
  {
    "specialization": "Outdoor Rotation"
  }
- Titles must be user-facing and natural language
- Good example: "Assign Boswell Jumbo to Rich Aromatic Rotation"
- Bad example: "Specialization for Boswell Jumbo"

Only return actionable specialization cards for actual pipe records.
Return at most 5 items.
`;
}

function buildUpdatePipeMeasurementsPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Find pipe records with missing, clearly incomplete, or weak geometric measurement data and propose practical updates.

OUTPUT REQUIREMENTS:
- item.type must be "measurement_update"
- recordType must be "pipe"
- proposedChanges may include:
  - length_mm
  - bowl_height_mm
  - bowl_width_mm
  - bowl_diameter_mm
  - weight_g

Return at most 5 items.
Use human-readable titles and explanations.
`;
}

function buildReclassifyTobaccoBlendsPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Return only the top 5 highest-confidence tobacco blend reclassification or normalization recommendations.

Allowed fields in proposedChanges:
- blend_type
- family
- subtype
- components
- strength

STRICT OUTPUT RULES:
- item.type must be "reclassification"
- recordType must be "blend"
- Return at most 5 items
- Each item must target a real existing blend record
- Use short, user-facing titles
- Use human-readable values, not snake_case
- Do not return general cellar commentary
- Do not return recommendations unless a direct field update is justified
`;
}

function buildUpdateBottleDataPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Identify whiskey bottles with incomplete or missing metadata and return enrichment recommendations.

Allowed fields in proposedChanges:
- distillery
- region
- age
- abv
- type (whiskey_type)
- retail_price
- aftermarket_price
- collector_value

STRICT OUTPUT RULES:
- item.type must be "measurement_update" (reuse for data enrichment)
- recordType must be "bottle"
- Return at most 5 items
- Each item must target a real existing bottle record
- proposedChanges must only include fields that are clearly incomplete or missing
- Use short, user-facing titles
- Use human-readable values, not snake_case
- Include confidence level in explanation if estimating market values
- Prioritize bottles with highest collection value impact
`;
}

function getActionPrompt(actionType, context) {
  switch (actionType) {
    case "optimize_collection":
      return buildOptimizeCollectionPrompt(context);
    case "recommend_specializations":
      return buildRecommendSpecializationsPrompt(context);
    case "update_pipe_measurements":
      return buildUpdatePipeMeasurementsPrompt(context);
    case "reclassify_tobacco_blends":
      return buildReclassifyTobaccoBlendsPrompt(context);
    case "update_bottle_data":
      return buildUpdateBottleDataPrompt(context);
    case "pairing_recommendation":
    case "session_builder":
      return buildSessionBuilderPrompt(context);
    default:
      throw new Error(`Unsupported curator action type: ${actionType}`);
  }
}

async function invokeCuratorLLM({ prompt, actionType, requestId }) {
  try {
    const response = await base44.functions.invoke("invokeCuratorLLM", {
      prompt,
      actionType,
      requestId,
    });

    if (typeof response === "string") return response;
    if (response?.result) return response.result;
    if (response?.data) return response.data;
    if (response?.content) return response.content;
    if (response && typeof response === "object") return JSON.stringify(response);

    return response;
  } catch (err) {
    if (!base44?.integrations?.Core?.InvokeLLM) {
      throw err;
    }

    return base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });
  }
}

export default async function curatorActionExecutor({
  actionType,
  context,
  requestId,
}) {
  const prompt = getActionPrompt(actionType, context);

  const responseText = await invokeCuratorLLM({
    prompt,
    actionType,
    requestId,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Curator raw action response:", {
      actionType,
      requestId,
      responseText,
    });
  }

  if (!responseText) {
    throw new Error("Curator returned no response.");
  }

  const parsed = parseCuratorActionResponse(
    typeof responseText === "string" ? responseText : JSON.stringify(responseText)
  );

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Curator returned unusable structured data.");
  }

  return parsed;
}