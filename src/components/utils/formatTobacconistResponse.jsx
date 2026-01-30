/**
 * Format agent responses with paragraph reflow that is SAFE in all runtimes.
 * - No regex lookbehind (prevents Safari/WKWebView white screens)
 * - Strips markdown artifacts
 * - Reflows long paragraphs into 2–3 sentence chunks
 * - Preserves bullets when present
 */



// --- helpers ----------------------------------------------------

function stripMarkdownArtifacts(text) {
  return (text || "")
    // Remove bold/italic markers
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1")
    // Remove inline code ticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown headings/dividers
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    // Normalize excessive spaces
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Sentence splitter WITHOUT lookbehind.
 * Splits on punctuation followed by whitespace.
 * Keeps punctuation with the sentence.
 */
function splitIntoSentences(paragraph) {
  const s = (paragraph || "").trim();
  if (!s) return [];

  const sentences = [];
  let buf = "";

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;

    const isEndPunct = ch === "." || ch === "!" || ch === "?";
    if (!isEndPunct) continue;

    // Peek next char(s) to see if this is a likely sentence boundary
    const next = s[i + 1] || "";
    const next2 = s[i + 2] || "";

    // Boundary if punctuation followed by space/newline/end.
    // (This avoids lookbehind entirely.)
    const boundary =
      next === "" ||
      next === " " ||
      next === "\n" ||
      (next === "\r" && next2 === "\n");

    if (boundary) {
      const trimmed = buf.trim();
      if (trimmed) sentences.push(trimmed);
      buf = "";
      // Skip extra whitespace after boundary
      while (i + 1 < s.length && (s[i + 1] === " " || s[i + 1] === "\n")) i++;
    }
  }

  const tail = buf.trim();
  if (tail) sentences.push(tail);

  return sentences;
}

/**
 * Reflow a paragraph into chunks of 2–3 sentences for readability.
 */
function reflowParagraph(paragraph, maxChars = 380, maxSentences = 3) {
  const sentences = splitIntoSentences(paragraph);

  // If we couldn't split into sentences reliably, fallback to original
  if (sentences.length <= 1) return [paragraph.trim()].filter(Boolean);

  const chunks = [];
  let current = "";
  let count = 0;

  for (const sent of sentences) {
    const next = current ? `${current} ${sent}` : sent;
    const nextCount = count + 1;

    // Start new chunk if too many sentences or too long
    if (
      (nextCount > maxSentences && current) ||
      (next.length > maxChars && current)
    ) {
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

// --- main formatter ---------------------------------------------

export function formatTobacconistResponse(text) {
  if (!text || typeof text !== "string") return "";

  const cleaned = stripMarkdownArtifacts(text);

  // Split on explicit blank lines first
  const initialParas = cleaned
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const finalParas = [];

  for (const para of initialParas) {
    // Keep bullet blocks together (don’t reflow line-by-line)
    const looksLikeBullets =
      para.includes("\n- ") || para.startsWith("- ") || para.includes("\n• ");

    if (looksLikeBullets) {
      // Normalize bullet markers to "- "
      const normalized = para
        .replace(/\n•\s+/g, "\n- ")
        .replace(/^•\s+/g, "- ")
        .trim();
      finalParas.push(normalized);
      continue;
    }

    // Reflow long paragraphs
    if (para.length > 320) {
      finalParas.push(...reflowParagraph(para));
    } else {
      finalParas.push(para);
    }
  }

  return finalParas.join("\n\n").trim();
}

/**
 * React renderer. Uses formatTobacconistResponse and renders paragraphs cleanly.
 */
export function FormattedTobacconistResponse({
  content,
  style = "light_structure",
}) {
  if (!content) return null;

  const formatted = formatTobacconistResponse(
    typeof content === "string" ? content : String(content)
  );

  const paragraphs = formatted
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={style === "structured" ? "space-y-4" : "space-y-3"}>
      {paragraphs.map((para, idx) => {
        const hasBullets =
          para.includes("\n- ") || para.startsWith("- ");

        if (hasBullets && (style === "light_structure" || style === "structured")) {
          const lines = para.split("\n").filter(Boolean);
          const intro =
            lines[0].startsWith("- ") ? "" : lines[0];

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
                  <li key={bIdx} className="text-sm leading-relaxed">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Simple paragraph
        return (
          <p key={idx} className="text-sm leading-relaxed">
            {para}
          </p>
        );
      })}
    </div>
  );
}