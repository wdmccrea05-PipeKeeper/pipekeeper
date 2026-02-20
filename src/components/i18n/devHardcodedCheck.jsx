export function scanForHardcodedText() {
  if (import.meta.env.PROD) return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const suspicious = [];

  while (walker.nextNode()) {
    const text = walker.currentNode.nodeValue?.trim();
    if (!text) continue;
    if (text.length < 3) continue;
    if (/^\d+$/.test(text)) continue;
    if (/^[\W_]+$/.test(text)) continue;

    // crude filter — catches obvious English strings
    if (/[A-Za-z]{3,}/.test(text)) {
      suspicious.push(text);
    }
  }

  if (suspicious.length) {
    console.warn("⚠️ Possible hardcoded UI text detected:");
    console.table([...new Set(suspicious)].slice(0, 20));
  }
}