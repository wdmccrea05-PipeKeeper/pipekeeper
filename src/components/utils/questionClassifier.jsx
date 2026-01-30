/**
 * @typedef {"brand_opinion" | "recommendation" | "optimization_remove_replace" | "comparison" | "how_to" | "troubleshooting" | "collection_query" | "other"} QuestionType
 * @typedef {"simple_paragraphs" | "light_structure" | "structured"} ResponseStyle
 * @typedef {{type: QuestionType, confidence: number, reasons: string[], shouldUseExpert: boolean, responseStyle: ResponseStyle}} ClassifierResult
 */

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, phrases) {
  return phrases.some((p) => text.includes(p));
}

function countMatches(text, patterns) {
  let c = 0;
  for (const re of patterns) if (re.test(text)) c++;
  return c;
}

export function classifyQuestion(input) {
  const q = norm(input);
  const reasons = [];

  if (!q) {
    return {
      type: "other",
      confidence: 0.2,
      reasons: ["empty_input"],
      shouldUseExpert: false,
      responseStyle: "simple_paragraphs",
    };
  }

  // Pattern libraries
  const BRAND_TERMS = [
    "what have you heard",
    "are they good",
    "is it good",
    "worth it",
    "worth buying",
    "reputable",
    "quality",
    "reviews",
    "consensus",
    "any thoughts",
    "opinion on",
    "experience with",
    "reliability",
  ];

  const RECOMMEND_TERMS = [
    "what should i buy",
    "what should i get",
    "recommend",
    "suggest",
    "what pipe should i buy",
    "what tobacco should i buy",
    "what should i smoke",
    "what should i try",
    "next pipe",
    "next tobacco",
    "what would you pick",
  ];

  const REMOVE_REPLACE_TERMS = [
    "get rid of",
    "replace",
    "sell",
    "trade",
    "redundant",
    "overlap",
    "lowest scoring",
    "worst",
    "remove",
    "cut",
    "downsize",
    "declutter",
    "which one should go",
  ];

  const COMPARISON_TERMS = [
    "vs ",
    "versus",
    "compare",
    "difference between",
    "better than",
    "which is better",
  ];

  const HOWTO_TERMS = [
    "how do i",
    "how to",
    "tips for",
    "best way to",
    "clean",
    "break in",
    "pack",
    "light",
    "cadence",
    "dry",
    "ghosting",
    "tongue bite",
    "relights",
  ];

  const TROUBLE_TERMS = [
    "doesn't work",
    "not working",
    "error",
    "bug",
    "missing",
    "stuck",
    "spins",
    "timeout",
    "failed",
    "can't",
    "cannot",
  ];

  const COLLECTION_TERMS = [
    "my collection",
    "in my cellar",
    "in my rack",
    "in my pipes",
    "in my tobaccos",
    "pairing grid",
    "scores",
    "rank",
    "usage",
    "ghost",
    "dedicated",
  ];

  // Regex patterns for stronger signals
  const BRAND_RE = [
    /\b(are|is)\b.+\b(good|reputable|worth)\b/,
    /\bwhat have you heard\b/,
    /\b(opinion|thoughts|reviews|consensus)\b/,
  ];

  const REMOVE_RE = [
    /\b(get rid of|replace|sell|trade|redundant|overlap)\b/,
    /\b(lowest|worst)\b.+\b(pipe|blend|tobacco)\b/,
  ];

  const RECOMMEND_RE = [
    /\bwhat\b.+\b(should i buy|should i get|should i smoke|should i try)\b/,
    /\b(recommend|suggest)\b/,
    /\bnext (pipe|tobacco)\b/,
  ];

  const COMPARISON_RE = [
    /\b(vs|versus|compare|difference)\b/,
    /\bwhich is better\b/,
  ];

  const HOWTO_RE = [
    /\bhow (do i|to)\b/,
    /\b(best way|tips)\b/,
    /\b(clean|pack|light|cadence|ghosting|tongue bite)\b/,
  ];

  const TROUBLE_RE = [
    /\b(not working|doesn't work|error|bug|stuck|timeout|failed)\b/,
  ];

  const COLLECTION_RE = [
    /\bmy (collection|cellar|rack)\b/,
    /\b(pairing grid|score|rank|usage)\b/,
  ];

  // Scoring
  const scores = {
    brand_opinion: 0,
    recommendation: 0,
    optimization_remove_replace: 0,
    comparison: 0,
    how_to: 0,
    troubleshooting: 0,
    collection_query: 0,
    other: 0.1,
  };

  // Term-based boosts
  if (hasAny(q, BRAND_TERMS)) scores.brand_opinion += 2;
  if (hasAny(q, RECOMMEND_TERMS)) scores.recommendation += 2;
  if (hasAny(q, REMOVE_REPLACE_TERMS)) scores.optimization_remove_replace += 3;
  if (hasAny(q, COMPARISON_TERMS)) scores.comparison += 2;
  if (hasAny(q, HOWTO_TERMS)) scores.how_to += 2;
  if (hasAny(q, TROUBLE_TERMS)) scores.troubleshooting += 3;
  if (hasAny(q, COLLECTION_TERMS)) scores.collection_query += 1;

  // Regex boosts (stronger signals)
  scores.brand_opinion += countMatches(q, BRAND_RE) * 3;
  scores.optimization_remove_replace += countMatches(q, REMOVE_RE) * 4;
  scores.recommendation += countMatches(q, RECOMMEND_RE) * 3;
  scores.comparison += countMatches(q, COMPARISON_RE) * 3;
  scores.how_to += countMatches(q, HOWTO_RE) * 2;
  scores.troubleshooting += countMatches(q, TROUBLE_RE) * 4;
  scores.collection_query += countMatches(q, COLLECTION_RE) * 2;

  // If it references the user's stuff, it's more likely expert-worthy
  const collectionSignal = scores.collection_query > 0;

  // Pick best type
   let bestType = "other";
   let bestScore = scores.other;

   Object.keys(scores).forEach((t) => {
    if (scores[t] > bestScore) {
      bestScore = scores[t];
      bestType = t;
    }
  });

  // Confidence
  const confidence = Math.max(
    0.25,
    Math.min(0.98, bestScore / 10 + (collectionSignal ? 0.1 : 0))
  );

  // Reasons (for debug)
  reasons.push(`bestType=${bestType}`, `score=${bestScore.toFixed(1)}`);
  if (collectionSignal) reasons.push("collection_signal=true");

  // Should use expert agent?
  const shouldUseExpert =
    collectionSignal ||
    bestType === "recommendation" ||
    bestType === "optimization_remove_replace" ||
    bestType === "comparison" ||
    bestType === "brand_opinion" ||
    bestType === "how_to";

  // Response style mapping
  let responseStyle = "simple_paragraphs";

  if (bestType === "brand_opinion") responseStyle = "simple_paragraphs";
  else if (bestType === "recommendation" || bestType === "how_to")
    responseStyle = "light_structure";
  else if (bestType === "optimization_remove_replace" || bestType === "comparison")
    responseStyle = "structured";
  else if (bestType === "troubleshooting") responseStyle = "light_structure";
  else responseStyle = "simple_paragraphs";

  return {
    type: bestType,
    confidence,
    reasons,
    shouldUseExpert,
    responseStyle,
  };
}