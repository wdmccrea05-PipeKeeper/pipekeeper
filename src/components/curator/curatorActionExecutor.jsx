import { base44 } from "@/api/base44Client";
import parseCuratorActionResponse from "./parseCuratorActionResponse";

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
      "confidence": 0.0 to 1.0,
      "followUpPrompt": "Why is this recommendation appropriate?"
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
      "proposedChanges": { "focus": ["specialization"] },
      "rationale": "...",
      "confidence": 0.0 to 1.0,
      "followUpPrompt": "Why is this specialization a good fit?"
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
      "type": "measurement_update",
      "title": "Add measurements to [Pipe Name]",
      "explanation": "Identified missing dimensions",
      "recordType": "pipe",
      "recordId": "pipe id",
      "recordName": "pipe name",
      "proposedChanges": { "length_mm": 150, "weight_grams": 40, "bowl_width_mm": 25 },
      "rationale": "Based on [shape/maker] reference data",
      "confidence": 0.0 to 1.0,
      "followUpPrompt": "How were these measurements estimated?"
    }
  ]
}

Return {"items": [], "summary": "All pipes have sufficient measurement data"} if none need updates.`,

  reclassify_tobacco_blends: `Review these tobacco blends and suggest classification improvements (type, strength, room note). Return ONLY valid JSON:
{
  "actionType": "reclassify_tobacco_blends",
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
      "confidence": 0.0 to 1.0,
      "followUpPrompt": "What characteristics suggest this reclassification?"
    }
  ]
}

Return {"items": [], "summary": "Blend classifications look accurate"} if no changes needed.`,
};

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

export default async function curatorActionExecutor({
  actionType,
  context,
  requestId,
}) {
  const actionPrompt = ACTION_PROMPTS[actionType] || ACTION_PROMPTS.optimize_collection;
  const collectionSummary = buildCollectionSummary(context);
  
  const fullPrompt = `${actionPrompt}

COLLECTION DATA:
${collectionSummary}

ADDITIONAL INSTRUCTIONS:
Provide your best recommendations based on the collection data.`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
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
                followUpPrompt: { type: "string" },
              },
            },
          },
        },
        required: ["actionType", "summary", "items"],
      },
    });

    if (typeof response === "object" && response !== null) {
      return response;
    }
    
    return parseCuratorActionResponse(response);
  } catch (err) {
    console.error("[curatorActionExecutor] AI invocation failed", err);
    throw new Error(`AI service error: ${err?.message || "Unknown error"}`);
  }
}