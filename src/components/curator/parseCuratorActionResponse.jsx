export default function parseCuratorActionResponse(responseText) {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Curator returned an empty response.");
  }

  const trimmed = responseText.trim();

  if (
    trimmed.toLowerCase().includes("failed to receive") ||
    trimmed.toLowerCase().includes("error") ||
    trimmed.toLowerCase().includes("timed out")
  ) {
    throw new Error("Curator returned an unusable response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) {
      throw new Error("Curator response was not valid JSON.");
    }
    return JSON.parse(jsonMatch[0]);
  }
}
