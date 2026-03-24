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

  if (!responseText) {
    throw new Error("Curator returned no response.");
  }

  const parsed = parseCuratorActionResponse(responseText);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Curator returned unusable structured data.");
  }

  return parsed;
}

// Replace only this function body with your actual AI runtime call if needed.
// Keep the return value as raw text.
async function runCuratorModel({ actionType, context, requestId }) {
  if (!window?.base44?.ai?.run) {
    throw new Error("Curator AI runtime is unavailable.");
  }

  return window.base44.ai.run({
    actionType,
    context,
    requestId,
  });
}