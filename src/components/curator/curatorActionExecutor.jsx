import parseCuratorActionResponse from "./parseCuratorActionResponse";

export default async function curatorActionExecutor({
  actionType,
  context,
  requestId,
}) {
  const responseText = await runCuratorModel({
    actionType,
    context,
    requestId,
  });

  console.log("Curator raw action response:", responseText);

  if (!responseText) {
    throw new Error("Curator returned no response.");
  }

  const parsed = parseCuratorActionResponse(responseText);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Curator returned unusable structured data.");
  }

  return parsed;
}

// Execute the curator model using the LLM integration
async function runCuratorModel({ actionType, context, requestId }) {
  // Extract the prompt from the context passed by the executor caller
  const prompt = context?.initialPrompt;
  
  if (!prompt) {
    throw new Error("No prompt found for curator action execution.");
  }

  // Use the base44 LLM integration to invoke the model
  if (!window?.base44?.integrations?.Core?.InvokeLLM) {
    throw new Error("Curator LLM integration is unavailable.");
  }

  const response = await window.base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false, // Expert actions use only collection context
  });

  return response;
}