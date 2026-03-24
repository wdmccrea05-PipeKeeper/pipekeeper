import parseCuratorActionResponse from "./parseCuratorActionResponse";

function buildSharedInstruction(context) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];
  const tastingLogs = context?.tastingLogs || [];
  const userProfile = context?.userProfile || null;
  const tasteProfile = context?.tasteProfile || null;

  return `
You are the in-app curator for a collector app.

Your job is to review the user's actual collection records and activity logs and return structured, actionable recommendations.

HARD RULES:
1. Return VALID JSON only.
2. Do not return markdown.
3. Do not return prose outside JSON.
4. Do not explain your chain of thought.
5. Do not invent records or IDs.
6. Every recommendation must target a real recordId from the provided data.
7. Every recommendation must include proposedChanges that can actually be applied.
8. If there is not enough evidence for an actionable change, do not fake one.
9. If no actionable changes exist, return an empty items array.

Allowed item.type values:
- specialization
- reclassification
- measurement_update
- rotation_optimization
- redundancy_flag

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
      "type": "specialization | reclassification | measurement_update | rotation_optimization | redundancy_flag",
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
${JSON.stringify(
  {
    pipes,
    blends,
    bottles,
    smokingLogs,
    tastingLogs,
    userProfile,
    tasteProfile,
  },
  null,
  2
)}
`;
}

function buildOptimizeCollectionPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Analyze the user's collection for practical optimization opportunities.

Focus on:
- underused pipes that should be rotated in
- redundant blends that overlap too heavily
- holes in the cellar or rotation
- pipe/blend mismatches
- specialization opportunities
- collection balance strengths and weak points

OUTPUT REQUIREMENTS:
- Return only the most actionable 3 to 8 recommendations
- Every item must be specific and practical
- Use actual collection and log evidence
- Proposed changes must be record-level changes, not vague advice

GOOD examples:
- update a pipe specialization
- reclassify a blend family
- flag a pipe for rotation usage notes
- normalize a classification field

BAD examples:
- “consider smoking more Virginias”
- “your collection is balanced”
- “maybe buy another pipe”
unless tied to a concrete actionable record recommendation
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
- proposedChanges must contain fields that can be written directly, for example:
  {
    "specialization": "Outdoor Rotation"
  }

Do NOT return generic strategy text.
Only return actionable specialization cards for actual pipe records.
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
- only suggest fields when there is a reasonable basis
- proposedChanges may include:
  - length_mm
  - bowl_height_mm
  - bowl_width_mm
  - bowl_diameter_mm
  - weight_g

If measurement support is weak, do not invent precise values.
Prefer fewer, higher-confidence recommendations over guessing.
`;
}

function buildReclassifyTobaccoBlendsPrompt(context) {
  return `
${buildSharedInstruction(context)}

TASK:
Review actual tobacco blend records and propose classification normalization or correction.

Focus on:
- blend_type
- family
- subtype
- components
- strength
- normalization consistency across similar blends

OUTPUT REQUIREMENTS:
- item.type must be "reclassification"
- recordType must be "blend"
- proposedChanges must contain direct field updates

Do not output generic cellar advice.
Return only field-level actionable recommendations for specific blend records.
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
    default:
      throw new Error(`Unsupported curator action type: ${actionType}`);
  }
}

export default async function curatorActionExecutor({
  actionType,
  context,
  requestId,
}) {
  const prompt = getActionPrompt(actionType, context);

  if (!window?.base44?.integrations?.Core?.InvokeLLM) {
    throw new Error("Curator LLM integration is unavailable.");
  }

  const responseText = await window.base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Curator raw action response:", responseText);
  }

  if (!responseText) {
    throw new Error("Curator returned no response.");
  }

  const parsed = parseCuratorActionResponse(responseText);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Curator returned unusable structured data.");
  }

  return parsed;
}
