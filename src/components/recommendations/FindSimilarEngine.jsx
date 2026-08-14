import { base44 } from "@/api/base44Client";
import { trackedInvokeLLM } from '@/lib/integrationTelemetry';

// ─── Name normalization ────────────────────────────────────────────────────
export function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function buildOwnedSet(items) {
  return new Set((items || []).map(i => normalizeName(i.name)).filter(Boolean));
}

export function isOwnedItem(name, ownedSet) {
  return ownedSet.has(normalizeName(name));
}

// ─── Prompt builders ───────────────────────────────────────────────────────
function buildBlendSimilarPrompt(anchor, context) {
  const { blends = [], smokingLogs = [], userProfile = null } = context;
  const ownedNames = blends.map(b => b.name).filter(Boolean);
  const recentLogs = smokingLogs.filter(l => l.blend_name === anchor.name).slice(0, 3);

  const anchorDetails = [
    anchor.blend_type && `Type: ${anchor.blend_type}`,
    anchor.strength && `Strength: ${anchor.strength}`,
    anchor.cut && `Cut: ${anchor.cut}`,
    anchor.flavor_notes?.length && `Flavor notes: ${anchor.flavor_notes.join(", ")}`,
    anchor.manufacturer && `Manufacturer: ${anchor.manufacturer}`,
  ].filter(Boolean).join("\n");

  const prefStr = userProfile ? [
    userProfile.strength_preference && `Preferred strength: ${userProfile.strength_preference}`,
    userProfile.preferred_blend_types?.length && `Preferred types: ${userProfile.preferred_blend_types.join(", ")}`,
    userProfile.notes && `Collector notes: ${userProfile.notes}`,
  ].filter(Boolean).join("\n") : "";

  return `You are a world-class tobacco curator AI. Return VALID JSON only - no markdown, no prose outside JSON.

TASK: Recommend exactly 3 tobacco blends NOT in the user's collection that are similar to the anchor blend.

ANCHOR BLEND:
Name: ${anchor.name}
${anchorDetails}

OWNED BLENDS (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RECENT SESSIONS WITH THIS BLEND:
${recentLogs.length > 0 ? recentLogs.map(l => `- ${l.date || ""} using ${l.pipe_name || "unknown pipe"}`).join("\n") : "None logged"}

RULES:
- Return exactly 3 items
- Never recommend owned blends
- Only real, commercially available tobacco blends
- Each must be distinct
- Explain the similarity concretely

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "blend",
      "title": "Blend Name by Manufacturer",
      "category": "Blend type / style",
      "explanation": "Why this is similar to ${anchor.name}",
      "characteristics": ["trait 1", "trait 2", "trait 3"],
      "whyFitsYou": "Personalized note"
    }
  ]
}`;
}

function buildPipeSimilarPrompt(anchor, context) {
  const { userProfile = null } = context;
  const ownedNames = (context.pipes || []).map(p => p.name).filter(Boolean);

  const anchorDetails = [
    anchor.maker && `Maker: ${anchor.maker}`,
    anchor.shape && `Shape: ${anchor.shape}`,
    anchor.bowl_material && `Material: ${anchor.bowl_material}`,
    anchor.finish && `Finish: ${anchor.finish}`,
    anchor.sizeClass && `Size: ${anchor.sizeClass}`,
    anchor.bend && `Bend: ${anchor.bend}`,
  ].filter(Boolean).join("\n");

  const prefStr = userProfile ? [
    userProfile.preferred_shapes?.length && `Preferred shapes: ${userProfile.preferred_shapes.join(", ")}`,
    userProfile.pipe_size_preference && `Size preference: ${userProfile.pipe_size_preference}`,
    userProfile.clenching_preference && `Clenching: ${userProfile.clenching_preference}`,
    userProfile.smoke_duration_preference && `Session duration: ${userProfile.smoke_duration_preference}`,
    userProfile.notes && `Collector notes: ${userProfile.notes}`,
  ].filter(Boolean).join("\n") : "";

  return `You are a world-class pipe curator AI. Return VALID JSON only - no markdown, no prose outside JSON.

TASK: Recommend exactly 3 pipes NOT in the user's collection that are similar to the anchor pipe.

ANCHOR PIPE:
Name: ${anchor.name}
${anchorDetails}

OWNED PIPES (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RULES:
- Return exactly 3 items
- Never recommend owned pipes
- Only real, commercially available pipes
- Each must be distinct
- Ground recommendations in the anchor pipe's actual attributes

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "pipe",
      "title": "Pipe Name by Maker",
      "category": "Shape / Style",
      "explanation": "Why this is similar to ${anchor.name}",
      "characteristics": ["trait 1", "trait 2"],
      "whyFitsYou": "Personalized note"
    }
  ]
}`;
}

function buildBottleSimilarPrompt(anchor, context) {
  const { tastingLogs = [], userProfile = null } = context;
  const ownedNames = (context.bottles || []).map(b => b.name).filter(Boolean);
  const myTastings = tastingLogs.filter(l => l.bottle_id === anchor.id).slice(0, 3);
  const tastingNotesSummary = myTastings.map(t => t.notes).filter(Boolean).join("; ");

  const anchorDetails = [
    anchor.type && `Type: ${anchor.type}`,
    anchor.region && `Region: ${anchor.region}`,
    anchor.age && `Age: ${anchor.age} years`,
    anchor.abv && `ABV: ${anchor.abv}%`,
    anchor.distillery && `Distillery: ${anchor.distillery}`,
  ].filter(Boolean).join("\n");

  const prefStr = userProfile ? [
    userProfile.whiskey_preferences?.types?.length && `Preferred types: ${userProfile.whiskey_preferences.types.join(", ")}`,
    userProfile.whiskey_preferences?.flavors?.length && `Preferred flavors: ${userProfile.whiskey_preferences.flavors.join(", ")}`,
    userProfile.whiskey_notes && `Whiskey notes: ${userProfile.whiskey_notes}`,
  ].filter(Boolean).join("\n") : "";

  return `You are a world-class whiskey curator AI. Return VALID JSON only - no markdown, no prose outside JSON.

TASK: Recommend exactly 3 whiskey bottles NOT in the user's collection that are similar to the anchor bottle.

ANCHOR BOTTLE:
Name: ${anchor.name}
${anchorDetails}
${tastingNotesSummary ? `My tasting notes: ${tastingNotesSummary}` : ""}

OWNED BOTTLES (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RULES:
- Return exactly 3 items
- Never recommend owned bottles
- Only real, commercially available whiskeys
- Each must be distinct
- Ground in the anchor bottle's actual attributes

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "bottle",
      "title": "Bottle Name",
      "category": "Whiskey type / region",
      "explanation": "Why this is similar to ${anchor.name}",
      "characteristics": ["trait 1", "trait 2"],
      "whyFitsYou": "Personalized note"
    }
  ]
}`;
}

function buildWineSimilarPrompt(anchor, context) {
  const { tastings = [], userProfile = null } = context;
  const ownedNames = (context.wines || []).map((wine) => wine.name).filter(Boolean);
  const myTastings = tastings.filter((entry) => entry.wine_id === anchor.id).slice(0, 3);
  const tastingNotesSummary = myTastings.map((entry) => entry.notes).filter(Boolean).join("; ");

  const anchorDetails = [
    anchor.style && `Style: ${anchor.style}`,
    anchor.region && `Region: ${anchor.region}`,
    anchor.country && `Country: ${anchor.country}`,
    anchor.appellation && `Appellation: ${anchor.appellation}`,
    anchor.varietal && `Varietal: ${anchor.varietal}`,
    anchor.vintage && `Vintage: ${anchor.vintage}`,
    anchor.producer && `Producer: ${anchor.producer}`,
  ].filter(Boolean).join("\n");

  const prefStr = userProfile ? [
    userProfile.wine_preferences?.styles?.length && `Preferred styles: ${userProfile.wine_preferences.styles.join(", ")}`,
    userProfile.wine_preferences?.regions?.length && `Preferred regions: ${userProfile.wine_preferences.regions.join(", ")}`,
    userProfile.wine_notes && `Wine notes: ${userProfile.wine_notes}`,
  ].filter(Boolean).join("\n") : "";

  return `You are a world-class wine curator AI. Return VALID JSON only - no markdown, no prose outside JSON.

TASK: Recommend exactly 3 wines NOT in the user's collection that are similar to the anchor wine.

ANCHOR WINE:
Name: ${anchor.name}
${anchorDetails}
${tastingNotesSummary ? `My tasting notes: ${tastingNotesSummary}` : ""}

OWNED WINES (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RULES:
- Return exactly 3 items
- Never recommend owned wines
- Only real, commercially available wines
- Each must be distinct
- Ground in the anchor wine's actual attributes

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "wine",
      "title": "Wine Name",
      "category": "Style / region",
      "explanation": "Why this is similar to ${anchor.name}",
      "characteristics": ["trait 1", "trait 2"],
      "whyFitsYou": "Personalized note"
    }
  ]
}`;
}

function buildCigarSimilarPrompt(anchor, context) {
  const { userProfile = null } = context;
  const ownedNames = (context.cigars || []).map((cigar) => [cigar.brand, cigar.name].filter(Boolean).join(' ')).filter(Boolean);

  const anchorDetails = [
    anchor.brand && `Brand: ${anchor.brand}`,
    anchor.line && `Line: ${anchor.line}`,
    anchor.vitola && `Vitola: ${anchor.vitola}`,
    anchor.wrapper && `Wrapper: ${anchor.wrapper}`,
    anchor.country_of_origin && `Origin: ${anchor.country_of_origin}`,
    anchor.strength && `Strength: ${anchor.strength}`,
  ].filter(Boolean).join("\n");

  const prefStr = userProfile ? [
    userProfile.cigar_preferences?.wrappers?.length && `Preferred wrappers: ${userProfile.cigar_preferences.wrappers.join(", ")}`,
    userProfile.cigar_preferences?.origins?.length && `Preferred origins: ${userProfile.cigar_preferences.origins.join(", ")}`,
    userProfile.cigar_notes && `Cigar notes: ${userProfile.cigar_notes}`,
  ].filter(Boolean).join("\n") : "";

  return `You are a world-class cigar curator AI. Return VALID JSON only - no markdown, no prose outside JSON.

TASK: Recommend exactly 3 cigars NOT in the user's collection that are similar to the anchor cigar.

ANCHOR CIGAR:
Name: ${anchor.name}
${anchorDetails}

OWNED CIGARS (NEVER recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RULES:
- Return exactly 3 items
- Never recommend owned cigars
- Only real, commercially available cigars
- Each must be distinct
- Ground in the anchor cigar's actual attributes

Return JSON:
{
  "summary": "Brief intro sentence",
  "items": [
    {
      "id": "sim_1",
      "type": "similar_item",
      "recordType": "cigar",
      "title": "Cigar Name",
      "category": "Wrapper / origin / vitola",
      "explanation": "Why this is similar to ${anchor.name}",
      "characteristics": ["trait 1", "trait 2"],
      "whyFitsYou": "Personalized note"
    }
  ]
}`;
}

export function buildFindSimilarPrompt(recordType, anchor, context) {
  switch (recordType) {
    case "blend": return buildBlendSimilarPrompt(anchor, context);
    case "pipe": return buildPipeSimilarPrompt(anchor, context);
    case "bottle": return buildBottleSimilarPrompt(anchor, context);
    case "wine": return buildWineSimilarPrompt(anchor, context);
    case "cigar": return buildCigarSimilarPrompt(anchor, context);
    default: throw new Error(`Unsupported record type for Find Similar: ${recordType}`);
  }
}

// ─── Main executor ─────────────────────────────────────────────────────────
export async function runFindSimilar({ recordType, anchor, context }) {
  const prompt = buildFindSimilarPrompt(recordType, anchor, context);

  const responseText = await trackedInvokeLLM({
    prompt,
    add_context_from_internet: false,
  }, {
    feature: 'recommendation.find_similar',
  });

  const raw = typeof responseText === "string" ? responseText : JSON.stringify(responseText);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      throw new Error("Could not parse AI response.");
    }
  }

  const items = Array.isArray(parsed?.items) ? parsed.items : [];

  let ownedItems = [];
  if (recordType === "blend") ownedItems = context?.blends || [];
  else if (recordType === "pipe") ownedItems = context?.pipes || [];
  else if (recordType === "bottle") ownedItems = context?.bottles || [];
  else if (recordType === "wine") ownedItems = context?.wines || [];
  else if (recordType === "cigar") ownedItems = context?.cigars || [];

  const ownedSet = buildOwnedSet(ownedItems);

  const seen = new Set();
  const filtered = items.filter(item => {
    const name = item.title || item.name || "";
    // Also check just the blend name portion (title may be "Name by Manufacturer")
    const nameOnly = name.split(/ by /i)[0].trim();
    if (isOwnedItem(name, ownedSet)) return false;
    if (isOwnedItem(nameOnly, ownedSet)) return false;
    // Also check if any owned item name appears inside the normalized title
    const normalizedTitle = normalizeName(name);
    if ([...ownedSet].some(owned => normalizedTitle.includes(owned) || owned.includes(normalizeName(nameOnly)))) return false;
    const key = normalizeName(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const final = filtered.slice(0, 3);

  return {
    summary: parsed?.summary || `Similar ${recordType}s you might enjoy`,
    items: final,
    anchorId: anchor.id,
    anchorType: recordType,
    anchorName: anchor.name,
    insufficientResults: final.length < 3,
  };
}