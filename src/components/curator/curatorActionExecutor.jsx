import parseCuratorActionResponse from "./parseCuratorActionResponse";

function getActionPrompt(actionType, context) {
  const pipes = context?.pipes || [];
  const blends = context?.blends || [];
  const bottles = context?.bottles || [];
  const smokingLogs = context?.smokingLogs || [];
  const tastingLogs = context?.tastingLogs || [];
  const userProfile = context?.userProfile || null;
  const tasteProfile = context?.tasteProfile || null;

  const contextBlock = JSON.stringify(
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
  );

  const sharedRules = `
Return VALID JSON only.
Do not return markdown.
Do not return explanatory prose outside JSON.

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

Only return actionable items.
If there are no actionable items, return:
{
  "summary": "No actionable recommendations right now.",
  "items": []
}
`;

  switch (actionType) {
    case "optimize_collection":
      return `
${sharedRules}

You are the in-app curator for a collector app.

Task:
Analyze the user's collection and return only actionable optimization recommendations.

Focus on:
- underused pipes
- redundant blends
- rotation opportunities
- cellar gaps
- pairing opportunities
- specialization opportunities

Each item must include a real recordId from the provided data and a proposedChanges object that could actually be applied.

Collection context:
${contextBlock}
`;

    case "recommend_specializations":
      return `
${sharedRules}

You are the in-app curator for a collector app.

Task:
Recommend concrete pipe or blend specialization changes based on actual collection and log patterns.

Only return recommendations that can be applied to a record.
Use type "specialization".

Collection context:
${contextBlock}
`;

    case "update_pipe_measurements":
      return `
${sharedRules}

You are the in-app curator for a collector app.

Task:
Find pipes with missing or weak measurement data and return actionable proposed updates.

Only return measurable, field-level updates for actual pipe records.
Use type "measurement_update".

Suggested fields can include:
- length_mm
- bowl_height_mm
- bowl_width_mm
- bowl_diameter_mm
- weight_g

Collection context:
${contextBlock}
`;

    case "reclassify_tobacco_blends":
      return `
${sharedRules}

You are the in-app curator for a collector app.

Task:
Find tobacco blends that should be reclassified or normalized.

Only return recommendations for actual blend records.
Use type "reclassification".

Suggested fields can include:
- blend_type
- family
- subtype
- components
- strength

Collection context:
${contextBlock}
`;

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
