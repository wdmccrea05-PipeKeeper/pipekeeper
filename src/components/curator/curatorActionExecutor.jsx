import { base44 } from "@/api/base44Client";
import parseCuratorActionResponse from "./parseCuratorActionResponse";
import { buildFindSimilarPrompt } from "@/components/recommendations/FindSimilarEngine.jsx";
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
      "confidence": 0.85,
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
- confidence must be a float between 0.70 and 0.95 reflecting how well-suited the pairing is (never 0)
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

// ─── LIGHTWEIGHT FIND SIMILAR PROMPTS ────────────────────────────────────

function buildLightweightFindSimilarBlendPrompt(anchor, context) {
  const blends = Array.isArray(context?.blends) ? context.blends : [];
  const ownedNames = blends.map(b => b.name).filter(Boolean);

  const anchorDetails = [
    anchor.blend_type && `Type: ${anchor.blend_type}`,
    anchor.strength && `Strength: ${anchor.strength}`,
    anchor.cut && `Cut: ${anchor.cut}`,
    anchor.flavor_notes?.length && `Flavors: ${anchor.flavor_notes.slice(0, 3).join(", ")}`,
  ].filter(Boolean).join(" | ");

  return `You are a tobacco curator. Return VALID JSON only - no markdown, no prose.

TASK: Recommend exactly 3 tobacco blends NOT in the user's collection, similar to the anchor blend.

ANCHOR BLEND (PRIMARY REFERENCE): "${anchor.name}" by ${anchor.manufacturer || "Unknown"}
${anchorDetails}

IMPORTANT RULE:
All recommendations must be based ONLY on this specific anchor blend: "${anchor.name}".
Do NOT use any other blend as a comparison basis.
Focus entirely on matching the characteristics of "${anchor.name}".

OWNED BLENDS (NEVER recommend):
${ownedNames.map(n => `- ${n}`).join("\n")}

USER PREFERENCES:
${context?.userProfile?.strength_preference ? `Strength: ${context.userProfile.strength_preference}` : "Not specified"}

RETURN EXACTLY 3 ITEMS. Each in 1-2 sentences. No long explanations.

{
  "summary": "Three blends you might enjoy",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "blend",
      "title": "Blend Name by Maker",
      "category": "Blend type",
      "explanation": "Why similar (1 sentence max)",
      "characteristics": ["trait1", "trait2"],
      "whyFitsYou": "Personal note (1 sentence)",
      "anchorRef": "${anchor.name}"
    }
  ]
}`;
}

function buildLightweightFindSimilarPipePrompt(anchor, context) {
  const pipes = Array.isArray(context?.pipes) ? context.pipes : [];
  const ownedNames = pipes.map(p => p.name).filter(Boolean);

  const anchorDetails = [
    anchor.shape && `Shape: ${anchor.shape}`,
    anchor.maker && `Maker: ${anchor.maker}`,
    anchor.sizeClass && `Size: ${anchor.sizeClass}`,
  ].filter(Boolean).join(" | ");

  return `You are a pipe curator. Return VALID JSON only - no markdown, no prose.

TASK: Recommend exactly 3 pipes NOT in the user's collection, similar to the anchor pipe.

ANCHOR PIPE (PRIMARY REFERENCE): "${anchor.name}" by ${anchor.maker || "Unknown"}
${anchorDetails}

IMPORTANT RULE:
All recommendations must be based ONLY on this specific anchor pipe: "${anchor.name}".
Do NOT use any other pipe as a comparison basis.
Focus entirely on matching the characteristics of "${anchor.name}".

OWNED PIPES (NEVER recommend):
${ownedNames.map(n => `- ${n}`).join("\n")}

RETURN EXACTLY 3 ITEMS. Each in 1-2 sentences. No long explanations.

{
  "summary": "Three pipes you might enjoy",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "pipe",
      "title": "Pipe Name by Maker",
      "category": "Shape",
      "explanation": "Why similar (1 sentence max)",
      "characteristics": ["trait1", "trait2"],
      "whyFitsYou": "Personal note (1 sentence)",
      "anchorRef": "${anchor.name}"
    }
  ]
}`;
}

function buildLightweightFindSimilarBottlePrompt(anchor, context) {
  const bottles = Array.isArray(context?.bottles) ? context.bottles : [];
  const ownedNames = bottles.map(b => b.name).filter(Boolean);

  const anchorDetails = [
    anchor.type && `Type: ${anchor.type}`,
    anchor.region && `Region: ${anchor.region}`,
    anchor.age && `Age: ${anchor.age}yr`,
  ].filter(Boolean).join(" | ");

  return `You are a whiskey curator. Return VALID JSON only - no markdown, no prose.

TASK: Recommend exactly 3 whiskey bottles NOT in the user's collection, similar to the anchor bottle.

ANCHOR BOTTLE (PRIMARY REFERENCE): "${anchor.name}"
${anchorDetails}

IMPORTANT RULE:
All recommendations must be based ONLY on this specific anchor bottle: "${anchor.name}".
Do NOT use any other bottle as a comparison basis.
Focus entirely on matching the characteristics of "${anchor.name}".

OWNED BOTTLES (NEVER recommend):
${ownedNames.map(n => `- ${n}`).join("\n")}

RETURN EXACTLY 3 ITEMS. Each in 1-2 sentences. No long explanations.

{
  "summary": "Three bottles you might enjoy",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "bottle",
      "title": "Bottle Name",
      "category": "Type / Region",
      "explanation": "Why similar (1 sentence max)",
      "characteristics": ["trait1", "trait2"],
      "whyFitsYou": "Personal note (1 sentence)",
      "anchorRef": "${anchor.name}"
    }
  ]
}`;
}

function getActionPrompt(actionType, context, anchorOverrides) {
  // Normalize anchorOverrides: support both legacy array and new structured object
  const anchors = Array.isArray(anchorOverrides)
    ? anchorOverrides
    : anchorOverrides?.anchors || [];
  const anchorMode = Array.isArray(anchorOverrides)
    ? (anchors.length > 1 ? "top3" : "single")
    : (anchorOverrides?.mode || (anchors.length > 1 ? "top3" : "single"));

  if (import.meta.env.DEV) { console.log("[FindSimilar] anchorOverrides received:", { actionType, anchorMode, anchors: anchors.map(a => a?.name) }); }

  // FAST PATHS: Use lightweight prompts for find_similar actions
  if (actionType === "find_similar_blends") {
    if (anchors.length === 0) throw new Error("No anchor blend selected for similar blend recommendations.");
    if (anchorMode === "top3" && anchors.length > 1) {
      // Multi-anchor: build a combined prompt that references all anchors
      if (import.meta.env.DEV) { console.log("[FindSimilar] Multi-anchor blends:", anchors.map(a => a.name)); }
      const anchorLines = anchors.map((a, i) => {
        const details = [
          a.blend_type && `Type: ${a.blend_type}`,
          a.strength && `Strength: ${a.strength}`,
          a.cut && `Cut: ${a.cut}`,
          a.flavor_notes?.length && `Flavors: ${a.flavor_notes.slice(0, 3).join(", ")}`,
        ].filter(Boolean).join(" | ");
        return `${i + 1}. "${a.name}" by ${a.manufacturer || "Unknown"} — ${details}`;
      }).join("\n");
      const ownedNames = (context?.blends || []).map(b => b.name).filter(Boolean);
      return `You are a tobacco curator. Return VALID JSON only - no markdown, no prose.

TASK: Recommend exactly 3 tobacco blends NOT in the user's collection that complement or are similar to the following anchors.

ANCHOR BLENDS:
${anchorLines}

OWNED BLENDS (NEVER recommend):
${ownedNames.map(n => `- ${n}`).join("\n")}

RETURN EXACTLY 3 ITEMS spanning diversity across the anchors.

{"summary":"Three blends you might enjoy","items":[{"id":"sim_1","type":"similar_item","recordType":"blend","title":"Blend Name by Maker","category":"Blend type","explanation":"Why recommended","characteristics":["trait1","trait2"],"whyFitsYou":"Personal note","anchorRef":"Anchor blend name"}]}`;
    }
    if (import.meta.env.DEV) { console.log("[FindSimilar] Single anchor blend:", anchors[0].name); }
    return buildLightweightFindSimilarBlendPrompt(anchors[0], context);
  }

  if (actionType === "find_similar_pipes") {
    if (anchors.length === 0) throw new Error("No anchor pipe selected for similar pipe recommendations.");
    if (anchorMode === "top3" && anchors.length > 1) {
      if (import.meta.env.DEV) { console.log("[FindSimilar] Multi-anchor pipes:", anchors.map(a => a.name)); }
      const anchorLines = anchors.map((a, i) => {
        const details = [
          a.shape && `Shape: ${a.shape}`,
          a.maker && `Maker: ${a.maker}`,
          a.sizeClass && `Size: ${a.sizeClass}`,
        ].filter(Boolean).join(" | ");
        return `${i + 1}. "${a.name}" — ${details}`;
      }).join("\n");
      const ownedNames = (context?.pipes || []).map(p => p.name).filter(Boolean);
      return `You are a pipe curator. Return VALID JSON only - no markdown, no prose.

TASK: Recommend exactly 3 pipes NOT in the user's collection that complement or are similar to the following anchors.

ANCHOR PIPES:
${anchorLines}

OWNED PIPES (NEVER recommend):
${ownedNames.map(n => `- ${n}`).join("\n")}

RETURN EXACTLY 3 ITEMS spanning diversity across the anchors.

{"summary":"Three pipes you might enjoy","items":[{"id":"sim_1","type":"similar_item","recordType":"pipe","title":"Pipe Name by Maker","category":"Shape","explanation":"Why recommended","characteristics":["trait1","trait2"],"whyFitsYou":"Personal note","anchorRef":"Anchor pipe name"}]}`;
    }
    if (import.meta.env.DEV) { console.log("[FindSimilar] Anchor pipe:", anchors[0].name); }
    return buildLightweightFindSimilarPipePrompt(anchors[0], context);
  }

  if (actionType === "find_similar_bottles") {
    if (anchors.length === 0) throw new Error("No anchor bottle selected for similar bottle recommendations.");
    if (anchorMode === "top3" && anchors.length > 1) {
      if (import.meta.env.DEV) { console.log("[FindSimilar] Multi-anchor bottles:", anchors.map(a => a.name)); }
      const anchorLines = anchors.map((a, i) => {
        const details = [
          a.type && `Type: ${a.type}`,
          a.region && `Region: ${a.region}`,
          a.age && `Age: ${a.age}yr`,
        ].filter(Boolean).join(" | ");
        return `${i + 1}. "${a.name}" — ${details}`;
      }).join("\n");
      const ownedNames = (context?.bottles || []).map(b => b.name).filter(Boolean);
      return `You are a whiskey curator. Return VALID JSON only - no markdown, no prose.

TASK: Recommend exactly 3 whiskey bottles NOT in the user's collection that complement or are similar to the following anchors.

ANCHOR BOTTLES:
${anchorLines}

OWNED BOTTLES (NEVER recommend):
${ownedNames.map(n => `- ${n}`).join("\n")}

RETURN EXACTLY 3 ITEMS spanning diversity across the anchors.

{"summary":"Three bottles you might enjoy","items":[{"id":"sim_1","type":"similar_item","recordType":"bottle","title":"Bottle Name","category":"Type / Region","explanation":"Why recommended","characteristics":["trait1","trait2"],"whyFitsYou":"Personal note","anchorRef":"Anchor bottle name"}]}`;
    }
    if (import.meta.env.DEV) { console.log("[FindSimilar] Anchor bottle:", anchors[0].name); }
    return buildLightweightFindSimilarBottlePrompt(anchors[0], context);
  }

  // Standard actions
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
    default:
      throw new Error(`Unsupported curator action type: ${actionType}`);
  }
}

async function invokeCuratorLLM({
  prompt,
  actionType,
  requestId,
}) {
  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  if (typeof response === "string") return response;
  if (typeof response === "object" && response !== null) {
    return JSON.stringify(response);
  }
  return String(response);
}

export default async function curatorActionExecutor({
  actionType,
  context,
  requestId,
  anchorOverrides,
}) {
  const isSimilarAction = actionType.startsWith("find_similar");
  
  const anchorList = Array.isArray(anchorOverrides) ? anchorOverrides : (anchorOverrides?.anchors || []);
  if (import.meta.env.DEV) { console.log(`[Curator] ${actionType} start`, { isSimilar: isSimilarAction, hasAnchors: anchorList.length > 0, anchorCount: anchorList.length, anchorNames: anchorList.map(a => a?.name) }); }

  const prompt = getActionPrompt(actionType, context, anchorOverrides);
  const promptSize = JSON.stringify(prompt).length;
  if (import.meta.env.DEV) { console.log(`[Curator] Prompt size: ${promptSize} bytes`); }

  const responseText = await invokeCuratorLLM({
    prompt,
    actionType,
    requestId,
  });

  if (import.meta.env.DEV) { console.log("[Curator] Response received", { length: responseText?.length, isString: typeof responseText === "string" }); }

  if (!responseText) {
    throw new Error("Curator returned no response.");
  }

  const parsed = parseCuratorActionResponse(
    typeof responseText === "string" ? responseText : JSON.stringify(responseText)
  );

  if (import.meta.env.DEV) { console.log("[Curator] Parsed successfully", { hasSummary: !!parsed?.summary, itemCount: parsed?.items?.length || 0 }); }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Curator returned unusable structured data.");
  }

  return parsed;
}