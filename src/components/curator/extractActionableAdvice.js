export default function extractActionableAdvice(responseText) {
  if (!responseText || typeof responseText !== "string") {
    return { cleanedText: responseText || "", items: [] };
  }

  const fenced = responseText.match(/```json\s*([\s\S]*?)```/i);
  if (!fenced?.[1]) {
    return { cleanedText: responseText, items: [] };
  }

  try {
    const parsed = JSON.parse(fenced[1].trim());
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const cleanedText = responseText.replace(fenced[0], "").trim();
    return { cleanedText, items };
  } catch {
    return { cleanedText: responseText, items: [] };
  }
}
