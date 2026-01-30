/**
 * Format agent responses with SAFE paragraph reflow
 * - No regex lookbehind (prevents Safari/WKWebView crashes)
 * - Strips markdown artifacts
 * - Reflows long paragraphs into 2–3 sentence chunks
 * - Preserves bullet sections
 */

export function formatTobacconistResponse(text) {
  if (!text || typeof text !== "string") return "";

  // Strip common markdown artifacts + normalize whitespace
  let cleaned = (text || "")
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = cleaned
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const finalParas = [];
  for (const para of paragraphs) {
    // Preserve bullet blocks
    const looksLikeBullets =
      para.startsWith("- ") || para.includes("\n- ") || para.startsWith("• ") || para.includes("\n• ");

    if (looksLikeBullets) {
      finalParas.push(
        para
          .replace(/\n•\s+/g, "\n- ")
          .replace(/^•\s+/g, "- ")
          .trim()
      );
      continue;
    }

    // Reflow long paragraphs
    if (para.length > 320) {
      finalParas.push(...reflowParagraph(para, 380, 3));
    } else {
      finalParas.push(para);
    }
  }

  return finalParas.join("\n\n").trim();
}

// Sentence splitter WITHOUT lookbehind
function splitIntoSentences(paragraph) {
  const s = (paragraph || "").trim();
  if (!s) return [];

  const sentences = [];
  let buf = "";

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;

    const isEnd = ch === "." || ch === "!" || ch === "?";
    if (!isEnd) continue;

    const next = s[i + 1] || "";
    const boundary = next === "" || next === " " || next === "\n" || next === "\r";

    if (boundary) {
      const out = buf.trim();
      if (out) sentences.push(out);
      buf = "";
      while (i + 1 < s.length && (s[i + 1] === " " || s[i + 1] === "\n")) i++;
    }
  }

  const tail = buf.trim();
  if (tail) sentences.push(tail);

  return sentences;
}

// Reflow into chunks of 2–3 sentences
function reflowParagraph(paragraph, maxChars = 380, maxSentences = 3) {
  const sentences = splitIntoSentences(paragraph);
  if (sentences.length <= 1) return [paragraph.trim()].filter(Boolean);

  const chunks = [];
  let current = "";
  let count = 0;

  for (const sent of sentences) {
    const next = current ? `${current} ${sent}` : sent;
    const nextCount = count + 1;

    if ((nextCount > maxSentences && current) || (next.length > maxChars && current)) {
      chunks.push(current.trim());
      current = sent;
      count = 1;
    } else {
      current = next;
      count = nextCount;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * React component to render formatted tobacconist response.
 * style: "simple_paragraphs" | "light_structure" | "structured"
 */
export function FormattedTobacconistResponse({ content, style = "light_structure", className = "" }) {
  if (!content) return null;

  const formatted = formatTobacconistResponse(
    typeof content === "string" ? content : String(content)
  );

  const paras = formatted
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={`${style === "structured" ? "space-y-4" : "space-y-3"} ${className}`}>
      {paras.map((para, idx) => {
        const isBulletSection = para.startsWith("- ") || para.includes("\n- ");

        if (isBulletSection && (style === "light_structure" || style === "structured")) {
          const lines = para.split("\n").filter(Boolean);
          const intro = lines[0].startsWith("- ") ? "" : lines[0];
          const bullets = (intro ? lines.slice(1) : lines).map((l) =>
            l.replace(/^\-\s*/, "").trim()
          );

          return (
            <div key={idx}>
              {intro && (
                <p className={`text-sm leading-relaxed ${style === "structured" ? "font-semibold mb-2" : "mb-2"}`}>
                  {intro}
                </p>
              )}
              <ul className="space-y-1 ml-4 list-disc">
                {bullets.map((b, bIdx) => (
                  <li key={bIdx} className="text-sm leading-relaxed text-stone-900">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        return (
          <p key={idx} className="text-sm leading-relaxed text-stone-900">
            {para}
          </p>
        );
      })}
    </div>
  );
}