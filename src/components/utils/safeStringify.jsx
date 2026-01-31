// src/components/utils/safeStringify.js
export function safeStringify(obj, maxChars = 8000) {
  try {
    const str = JSON.stringify(obj);
    if (!str) return "";
    return str.length > maxChars ? str.slice(0, maxChars) + "…[truncated]" : str;
  } catch (e) {
    return "";
  }
}