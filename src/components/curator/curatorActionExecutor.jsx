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

// Execute the curator model by invoking a backend function
async function runCuratorModel({ actionType, context, requestId }) {
  // Extract the prompt from the context passed by the executor caller
  const prompt = context?.initialPrompt;
  
  if (!prompt) {
    throw new Error("No prompt found for curator action execution.");
  }

  // Invoke backend function to call the LLM
  if (!window?.base44?.functions?.invoke) {
    throw new Error("Backend function invocation is unavailable.");
  }

  const response = await window.base44.functions.invoke('invokeCuratorLLM', {
    prompt,
    actionType,
    requestId,
  });

  return response?.data;
}