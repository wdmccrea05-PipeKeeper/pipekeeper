export function missingKeyHandler(key, lang = "en", where = "") {
  const msg = `Missing translation: ${key}`;
  console.warn(msg);
  return key; // Return the key as fallback
}

export default missingKeyHandler;