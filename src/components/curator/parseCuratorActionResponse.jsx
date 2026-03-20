/**
 * CURATOR ACTION RESPONSE PARSER
 * 
 * Safely extracts JSON from AI responses.
 * Handles:
 * - Valid JSON objects
 * - JSON strings
 * - Fenced code blocks
 * - Accidental surrounding prose
 */

export function parseCuratorActionResponse(rawText) {
  if (!rawText) {
    throw new Error("Empty response from curator AI");
  }

  // If already an object, return it
  if (typeof rawText === "object" && rawText !== null) {
    return rawText;
  }

  const text = String(rawText).trim();

  // ATTEMPT 1: Direct JSON parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // Not valid JSON, continue
  }

  // ATTEMPT 2: Strip markdown code fences
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch (e) {
      // Failed, continue
    }
  }

  // ATTEMPT 3: Extract first { ... } JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Failed, continue
    }
  }

  // ATTEMPT 4: Try to find JSON-like structure and extract
  // Look for anything between { and the last }
  const bracketStart = text.indexOf("{");
  const bracketEnd = text.lastIndexOf("}");

  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    try {
      const potential = text.substring(bracketStart, bracketEnd + 1);
      return JSON.parse(potential);
    } catch (e) {
      // Failed, continue
    }
  }

  // All parsing attempts failed
  throw new Error(
    `Failed to parse curator response as JSON. Raw: ${text.slice(0, 150)}...`
  );
}