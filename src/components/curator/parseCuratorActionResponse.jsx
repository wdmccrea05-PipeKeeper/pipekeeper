export default function parseCuratorActionResponse(responseText) {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Curator returned an empty response.");
  }

  const trimmed = responseText.trim();

  if (
    trimmed.toLowerCase().includes("failed to receive") ||
    trimmed.toLowerCase().includes("timed out")
  ) {
    throw new Error("Curator returned an unusable response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim());
    }

    const objectMatch = trimmed.match(/\{[\s\S]*\}$/);
    if (objectMatch?.[0]) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error("Curator response was not valid JSON.");
  }
}
