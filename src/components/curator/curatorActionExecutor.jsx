import { base44 } from "@/api/base44Client";
import parseCuratorActionResponse from "./parseCuratorActionResponse";
import { buildFindSimilarPrompt } from "@/components/recommendations/FindSimilarEngine";
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
      "blendId": "string (optional, for session_builder)",
      "blendName": "string (optional, for session_builder)",
      "bottleId": "string (optional, for session_builder)",
      "bottleName": "string (optional, for session_builder)",
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
- You MUST populate blendId and blendName with a real tobacco blend from the collection if any blends exist
- You MUST populate bottleId and bottleName with a real whiskey bottle from the collection if any bottles exist
- The explanation MUST name the specific tobacco blend and whiskey bottle being recommended (e.g. "Pair your [PIPE NAME] with [BLEND NAME] and a pour of [BOTTLE NAME]")
- The rationale MUST explain why this specific combination works
- Use human-readable text only
- No snake_case in title/explanation/rationale
- Return exactly 3 items when at least one pipe exists
- If no pipes exist, return zero items
- Each session must use DIFFERENT pipes, blends, and bottles — do not repeat the same item

WHISKEY RULE:
${hasBottles ? `Because whiskey bottles are available in this scope, at least 2 of the 3 sessions MUST include a specific whiskey bottle from the collection. Populate bottleId and bottleName.` : `No whiskey bottles are available in this scope, so sessions should use pipe + tobacco only.`}

TOBACCO RULE:
${hasBlends ? `Use actual tobacco blends from the collection. Always populate blendId and blendName.` : `If no tobacco blends are available, explain the session using the pipe alone.`}

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
- item.type must be "bottle_data_update"
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

function buildOptimizeWhiskeyCollectionPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Return only the top 3 highest-confidence whiskey collection optimization recommendations.

Focus on:
- redundancy across bottle types, regions, age, and proof
- untasted or neglected bottles
- high-value bottles missing tasting data
- obvious balance gaps in the whiskey collection

STRICT OUTPUT RULES:
- item.type must be one of:
  - metadata_update
  - valuation_update
  - reclassification
- recordType must be "bottle"
- Return at most 3 items
- Each item must target a real existing bottle record
- Use short, user-facing titles
- Use human-readable values, not snake_case
- Do not return general collecting advice
- Do not return recommendations unless they can be tied to an existing bottle record
`;
}

function buildFindSimilarPipesCuratorPrompt(context, anchorItems) {
  const { pipes = [], smokingLogs = [] } = context;
  const pool = anchorItems?.length ? anchorItems : pipes;
  if (pool.length === 0) throw new Error("No pipes in collection to base recommendations on.");
  if (pool.length === 1) {
    return buildFindSimilarPrompt("pipe", pool[0], context, "curator");
  }
  // Multi-anchor: combine into one prompt asking for items similar to ANY of the anchors
  const anchorNames = pool.map(p => `"${p.name}"`).join(", ");
  return buildFindSimilarPrompt("pipe", pool[0], {
    ...context,
    _multiAnchorNote: `Base recommendations on similarity to ANY of these pipes: ${anchorNames}`,
  }, "curator");
}

function buildFindSimilarBlendsCuratorPrompt(context, anchorItems) {
  const { blends = [], smokingLogs = [] } = context;
  const pool = anchorItems?.length ? anchorItems : blends;
  if (pool.length === 0) throw new Error("No blends in collection to base recommendations on.");
  if (pool.length === 1) {
    return buildFindSimilarPrompt("blend", pool[0], context, "curator");
  }
  const anchorNames = pool.map(b => `"${b.name}"`).join(", ");
  return buildFindSimilarPrompt("blend", pool[0], {
    ...context,
    _multiAnchorNote: `Base recommendations on similarity to ANY of these blends: ${anchorNames}`,
  }, "curator");
}

function buildFindSimilarBottlesCuratorPrompt(context, anchorItems) {
  const { bottles = [], tastingLogs = [] } = context;
  const pool = anchorItems?.length ? anchorItems : bottles;
  if (pool.length === 0) throw new Error("No bottles in collection to base recommendations on.");
  if (pool.length === 1) {
    return buildFindSimilarPrompt("bottle", pool[0], context, "curator");
  }
  const anchorNames = pool.map(b => `"${b.name}"`).join(", ");
  return buildFindSimilarPrompt("bottle", pool[0], {
    ...context,
    _multiAnchorNote: `Base recommendations on similarity to ANY of these bottles: ${anchorNames}`,
  }, "curator");
}

function getActionPrompt(actionType, context, anchorOverrides) {
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
    case "optimize_whiskey_collection":
      return buildOptimizeWhiskeyCollectionPrompt(context);
    case "pairing_recommendation":
    case "session_builder":
      return buildSessionBuilderPrompt(context);
    case "find_similar_pipes":
      return buildFindSimilarPipesCuratorPrompt(context, anchorOverrides);
    case "find_similar_blends":
      return buildFindSimilarBlendsCuratorPrompt(context, anchorOverrides);
    case "find_similar_bottles":
      return buildFindSimilarBottlesCuratorPrompt(context, anchorOverrides);
    default:
      throw new Error(`Unsupported curator action type: ${actionType}`);
  }
}

async function invokeCuratorLLM({ prompt }) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });
}

export default async function curatorActionExecutor({
  actionType,
  context,
  requestId,
  anchorOverrides,
}) {
  const prompt = getActionPrompt(actionType, context, anchorOverrides);

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