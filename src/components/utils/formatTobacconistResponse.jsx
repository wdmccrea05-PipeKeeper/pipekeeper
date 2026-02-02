/**
 * Format agent responses with SAFE paragraph reflow
 * - No regex lookbehind (prevents Safari/WKWebView crashes)
 * - Strips common markdown artifacts
 * - Reflows long paragraphs into 2–3 sentence chunks
 * - Preserves bullet sections
 *
 * IMPORTANT:
 * - Do not hardcode dark text colors here (caused dark-on-dark + light-on-light bugs).
 *   Let the parent container decide text color (theme-safe).
 */

// De-duplicate repeated responses (agent bug workaround)
function deduplicateResponse(text) {
  if (!text || typeof text !== "string") return text;
  
  const paras = text.split("\n\n").filter(Boolean);
  if (paras.length < 2) return text;
  
  // Check if first paragraph is repeated
  const first = paras[0].trim();
  const rest = paras.slice(1);
  
  // Remove first paragraph if it appears again in rest
  const filtered = rest.filter((p) => {
    const similarity = first.slice(0, 200) === p.trim().slice(0, 200);
    return !similarity;
  });
  
  return [first, ...filtered].join("\n\n");
}

export function formatTobacconistResponse(text) {
  if (!text || typeof text !== "string") return "";

  // De-duplicate first
  let deduplicated = deduplicateResponse(text);

  let cleaned = (deduplicated || "")
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/_([\s\S]+?)_/g, "$1")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\[([\s\S]+?)\]\(.*?\)/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/> /gm, "")
    .replace(/---+/g, "")
    .replace(/\n\n\n+/g, "\n\n")
    .trim();

  const paragraphs = cleaned.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const finalParas = [];
  for (const para of paragraphs) {
    const looksLikeBullets =
      para.startsWith("- ") || para.includes("\n- ") || para.startsWith("• ") || para.includes("\n• ");

    if (!para || para.length === 0) {
      continue;
    }

    if (looksLikeBullets) {
      finalParas.push(para);
      continue;
    }

    if (para.length > 320) {
      finalParas.push(...reflowParagraph(para, 380, 3));
    } else {
      finalParas.push(para);
    }
  }

  return finalParas.join("\n\n").trim();
}

function splitIntoSentences(paragraph) {
  const s = (paragraph || "").trim();
  if (!s) return [];

  const sentences = [];
  let buf = "";

  for (let i = 0; i < s.length; i++) {
    buf += s[i];

    if (s[i] === "." || s[i] === "?" || s[i] === "!") {
      const nextChar = s[i + 1];
      if (nextChar === undefined || nextChar === " " || nextChar === "\n") {
        const out = buf.trim();
        if (out) sentences.push(out);
        buf = "";
        while ((s[i + 1] || "") === " ") i++;
      }
    }
  }

  if (buf.trim()) {
    sentences.push(buf.trim());
  }

  return sentences;
}

function reflowParagraph(para, targetChars = 380, maxSentences = 3) {
  const sentences = splitIntoSentences(para);
  if (sentences.length <= maxSentences) return [para.trim()];

  const out = [];
  let chunk = [];
  let chunkLen = 0;

  for (const sentence of sentences) {
    const addLen = sentence.length + (chunk.length ? 1 : 0);
    if (chunkLen + addLen > targetChars && chunk.length) {
      out.push(chunk.join(" ").trim());
      chunk = [sentence];
      chunkLen = sentence.length;
    } else {
      chunk.push(sentence);
      chunkLen += addLen;
    }

    if (chunk.length >= maxSentences) {
      out.push(chunk.join(" ").trim());
      chunk = [];
      chunkLen = 0;
    }
  }

  if (chunk.length) out.push(chunk.join(" ").trim());
  return out.filter(Boolean);
}

export function FormattedTobacconistResponse({ content, style = "light_structure", className = "" }) {
  if (!content) return null;

  const formatted = formatTobacconistResponse(typeof content === "string" ? content : String(content));
  const paras = formatted.split("\n\n").map((p) => p.trim()).filter(Boolean);

  return (
    <div className={className}>
      {paras.map((para, idx) => {
        const isBulletSection = para.startsWith("- ") || para.includes("\n- ");

        if (isBulletSection && (style === "light_structure" || style === "structured")) {
          const lines = para.split("\n").filter(Boolean);
          const intro = lines[0].startsWith("- ") ? "" : lines[0];
          const bullets = (intro ? lines.slice(1) : lines).map((l) => l.replace(/^\-\s*/, "").trim());

          return (
            <div key={idx}>
              {intro && (
                <p className={`text-sm leading-relaxed ${style === "structured" ? "font-semibold mb-2" : "mb-2"} whitespace-pre-wrap`}>
                  {intro}
                </p>
              )}
              <ul className="space-y-1 ml-5 list-disc">
                {bullets.map((b, bIdx) => (
                  <li key={bIdx} className="text-sm leading-relaxed whitespace-pre-wrap">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        return (
          <p key={idx} className="text-sm leading-relaxed mb-3 last:mb-0 whitespace-pre-wrap">
            {para}
          </p>
        );
      })}
    </div>
  );
}