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
  const { pipes = [] } = context;
  const pool = anchorItems?.length ? anchorItems : pipes;
  if (pool.length === 0) throw new Error("No pipes in collection to base recommendations on.");
  if (pool.length === 1) {
    return buildFindSimilarPrompt("pipe", pool[0], context, "detail");
  }
  // Multi-anchor: 2 results per anchor
  const ownedNames = pipes.map(p => p.name).filter(Boolean);
  const anchorsBlock = pool.map((p, i) => {
    const details = [
      p.shape && `Shape: ${p.shape}`,
      p.maker && `Maker: ${p.maker}`,
      p.bowl_material && `Material: ${p.bowl_material}`,
      p.finish && `Finish: ${p.finish}`,
      p.sizeClass && `Size: ${p.sizeClass}`,
      p.bend && `Bend: ${p.bend}`,
    ].filter(Boolean).join(", ");
    return `Anchor ${i + 1}: "${p.name}" (${details})`;
  }).join("\n");
  return `You are a world-class pipe curator AI. Return VALID JSON only — no markdown, no prose outside JSON.

⚠️ CRITICAL: You have ${pool.length} reference pipes below. Return EXACTLY 2 recommendations for EACH anchor pipe — ${pool.length * 2} total items. Each item MUST include an "anchorRef" field with the anchor pipe name it was inspired by.

ANCHOR PIPES:
${anchorsBlock}

OWNED PIPES (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

RULES:
- Never recommend owned pipes
- Recommend real, commercially available pipes
- Each recommendation must be distinct
- Distribute exactly 2 results per anchor

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "pipe",
      "title": "Pipe Name by Maker",
      "category": "Shape / Style",
      "explanation": "Why this is similar to the anchor pipe",
      "characteristics": ["trait 1", "trait 2"],
      "whyFitsYou": "Personalized note",
      "anchorRef": "Anchor pipe name this is based on",
      "group": "closest_match"
    }
  ]
}`;
}

function buildFindSimilarBlendsCuratorPrompt(context, anchorItems) {
  const { blends = [] } = context;
  const pool = anchorItems?.length ? anchorItems : blends;
  if (pool.length === 0) throw new Error("No blends in collection to base recommendations on.");
  if (pool.length === 1) {
    return buildFindSimilarPrompt("blend", pool[0], context, "detail");
  }
  const ownedNames = blends.map(b => b.name).filter(Boolean);
  const anchorsBlock = pool.map((b, i) => {
    const details = [
      b.blend_type && `Type: ${b.blend_type}`,
      b.strength && `Strength: ${b.strength}`,
      b.cut && `Cut: ${b.cut}`,
      b.flavor_notes?.length && `Flavors: ${b.flavor_notes.join(", ")}`,
    ].filter(Boolean).join(", ");
    return `Anchor ${i + 1}: "${b.name}" by ${b.manufacturer || "Unknown"} (${details})`;
  }).join("\n");
  return `You are a world-class tobacco curator AI. Return VALID JSON only — no markdown, no prose outside JSON.

⚠️ CRITICAL: You have ${pool.length} reference blends below. Return EXACTLY 2 recommendations for EACH anchor blend — ${pool.length * 2} total items. Each item MUST include an "anchorRef" field with the anchor blend name it was inspired by.

ANCHOR BLENDS:
${anchorsBlock}

OWNED BLENDS (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

RULES:
- Never recommend owned blends
- Recommend only real, commercially available tobacco blends
- Each recommendation must be distinct
- Distribute exactly 2 results per anchor

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "blend",
      "title": "Blend Name by Manufacturer",
      "category": "Blend type / style",
      "explanation": "Why this is similar to the anchor blend",
      "characteristics": ["trait 1", "trait 2", "trait 3"],
      "whyFitsYou": "Personalized note",
      "anchorRef": "Anchor blend name this is based on",
      "group": "closest_match"
    }
  ]
}`;
}

function buildFindSimilarBottlesCuratorPrompt(context, anchorItems) {
  const { bottles = [] } = context;
  const pool = anchorItems?.length ? anchorItems : bottles;
  if (pool.length === 0) throw new Error("No bottles in collection to base recommendations on.");
  if (pool.length === 1) {
    return buildFindSimilarPrompt("bottle", pool[0], context, "detail");
  }
  const ownedNames = bottles.map(b => b.name).filter(Boolean);
  const anchorsBlock = pool.map((b, i) => {
    const details = [
      b.type && `Type: ${b.type}`,
      b.region && `Region: ${b.region}`,
      b.age && `Age: ${b.age}yr`,
      b.abv && `ABV: ${b.abv}%`,
    ].filter(Boolean).join(", ");
    return `Anchor ${i + 1}: "${b.name}" (${details})`;
  }).join("\n");
  return `You are a world-class whiskey curator AI. Return VALID JSON only — no markdown, no prose outside JSON.

⚠️ CRITICAL: You have ${pool.length} reference bottles below. Return EXACTLY 2 recommendations for EACH anchor bottle — ${pool.length * 2} total items. Each item MUST include an "anchorRef" field with the anchor bottle name it was inspired by.

ANCHOR BOTTLES:
${anchorsBlock}

OWNED BOTTLES (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

RULES:
- Never recommend owned bottles
- Recommend real, commercially available whiskeys
- Each must be distinct
- Distribute exactly 2 results per anchor

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "bottle",
      "title": "Bottle Name",
      "category": "Whiskey type / region",
      "explanation": "Why this is similar to the anchor bottle",
      "characteristics": ["trait 1", "trait 2"],
      "whyFitsYou": "Personalized note",
      "anchorRef": "Anchor bottle name this is based on",
      "group": "closest_match"
    }
  ]
}`;
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