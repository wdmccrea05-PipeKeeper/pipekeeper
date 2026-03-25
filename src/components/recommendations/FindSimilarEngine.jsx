import { base44 } from "@/api/base44Client";

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
function buildBlendSimilarPrompt(anchor, context, mode) {
  const { blends = [], smokingLogs = [], userProfile = null } = context;
  const ownedNames = blends.map(b => b.name).filter(Boolean).slice(0, 40);
  const limit = mode === "curator" ? 6 : 3;

  const anchorDetails = [
    anchor.blend_type && `Type: ${anchor.blend_type}`,
    anchor.strength && `Strength: ${anchor.strength}`,
    anchor.cut && `Cut: ${anchor.cut}`,
    anchor.room_note && `Room Note: ${anchor.room_note}`,
    anchor.tobacco_components?.length && `Components: ${anchor.tobacco_components.join(", ")}`,
    anchor.flavor_notes?.length && `Flavor Notes: ${anchor.flavor_notes.join(", ")}`,
    anchor.aging_potential && `Aging Potential: ${anchor.aging_potential}`,
    anchor.notes && `Personal Notes: ${anchor.notes}`,
  ].filter(Boolean).join("\n");

  const recentLogs = (smokingLogs || []).filter(l => l.blend_name === anchor.name).slice(0, 5);
  const prefStr = userProfile ? [
    userProfile.strength_preference && `Preferred strength: ${userProfile.strength_preference}`,
    userProfile.preferred_blend_types?.length && `Preferred types: ${userProfile.preferred_blend_types.join(", ")}`,
    userProfile.notes && `Collector notes: ${userProfile.notes}`,
  ].filter(Boolean).join("\n") : "";

  const groupInstruction = mode === "curator"
    ? `Group results using the "group" field:
- closest_match: most similar in profile
- adjacent_exploration: slightly different direction worth trying
- premium_step_up: higher-end version or evolution
- value_pick: excellent value for similar taste
- collection_gap: fills a gap in this style
Return ${limit} items distributed across groups.`
    : `Return exactly ${limit} items. Do not include a "group" field.`;

  return `You are a world-class tobacco curator AI. Return VALID JSON only — no markdown, no prose outside JSON.

⚠️ CRITICAL INSTRUCTION: The ONLY reference blend you must use is "${anchor.name}" by ${anchor.manufacturer || "Unknown"}. Do NOT use any other blend from the collection as the reference — not even the most frequently used one. The user explicitly selected this blend. Ignore all usage frequency data when choosing the anchor.

TASK: Recommend ${limit} tobacco blends NOT already in the user's collection that are similar to the anchor blend.

ANCHOR BLEND (USE THIS AND ONLY THIS AS YOUR REFERENCE):
Name: ${anchor.name}
Manufacturer: ${anchor.manufacturer || "Unknown"}
${anchorDetails}

OWNED BLENDS (EXCLUDE ALL — never recommend any of these or close variants):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RECENT SESSIONS WITH THIS BLEND:
${recentLogs.length > 0 ? recentLogs.map(l => `- ${l.date || ""} using ${l.pipe_name || "unknown pipe"}`).join("\n") : "None logged"}

RULES:
- Never recommend owned blends
- Recommend only real, commercially available tobacco blends
- Each recommendation must be distinct
- Be specific and concrete — no generic filler
- Explain the similarity concretely
${groupInstruction}

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
      "whyFitsYou": "Personalized note based on user preferences or history",
      "group": "closest_match"
    }
  ]
}`;
}

function buildPipeSimilarPrompt(anchor, context, mode) {
  const { pipes = [], smokingLogs = [], userProfile = null } = context;
  const ownedNames = pipes.map(p => p.name).filter(Boolean).slice(0, 40);
  const limit = mode === "curator" ? 6 : 3;

  const anchorDetails = [
    anchor.shape && `Shape: ${anchor.shape}`,
    anchor.maker && `Maker: ${anchor.maker}`,
    anchor.bowl_material && `Material: ${anchor.bowl_material}`,
    anchor.finish && `Finish: ${anchor.finish}`,
    anchor.sizeClass && `Size class: ${anchor.sizeClass}`,
    anchor.chamber_volume && `Chamber volume: ${anchor.chamber_volume}`,
    anchor.bend && `Bend: ${anchor.bend}`,
    anchor.stem_material && `Stem: ${anchor.stem_material}`,
    anchor.length_mm && `Length: ${anchor.length_mm}mm`,
    anchor.usage_characteristics && `Smoking character: ${anchor.usage_characteristics}`,
    anchor.notes && `Notes: ${anchor.notes}`,
  ].filter(Boolean).join("\n");

  const prefStr = userProfile ? [
    userProfile.preferred_shapes?.length && `Preferred shapes: ${userProfile.preferred_shapes.join(", ")}`,
    userProfile.pipe_size_preference && `Size preference: ${userProfile.pipe_size_preference}`,
    userProfile.clenching_preference && `Clenching: ${userProfile.clenching_preference}`,
    userProfile.smoke_duration_preference && `Session duration: ${userProfile.smoke_duration_preference}`,
    userProfile.notes && `Collector notes: ${userProfile.notes}`,
  ].filter(Boolean).join("\n") : "";

  const groupInstruction = mode === "curator"
    ? `Group results using the "group" field:
- closest_match: nearly identical shape/character/maker family
- adjacent_exploration: different shape or maker worth exploring
- premium_step_up: higher artisan tier or prestigious maker
- value_pick: excellent quality at lower price
- collection_gap: fills a gap (different bend, material, size)
Return ${limit} items distributed across groups.`
    : `Return exactly ${limit} items. Do not include a "group" field.`;

  return `You are a world-class pipe curator AI. Return VALID JSON only — no markdown, no prose outside JSON.

⚠️ CRITICAL INSTRUCTION: The ONLY reference pipe you must use is "${anchor.name}". Do NOT use any other pipe from the collection as the reference. The user explicitly selected this pipe.

TASK: Recommend ${limit} pipes NOT already in the user's collection that are similar to the anchor pipe.

ANCHOR PIPE (USE THIS AND ONLY THIS AS YOUR REFERENCE):
Name: ${anchor.name}
${anchorDetails}

OWNED PIPES (EXCLUDE ALL — never recommend these or obvious variants):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RULES:
- Never recommend owned pipes
- Recommend real, commercially available pipes from real makers
- Each recommendation must be distinct
- Ground recommendations in the anchor pipe's actual attributes
${groupInstruction}

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
      "whyFitsYou": "Personalized note",
      "group": "closest_match"
    }
  ]
}`;
}

function buildBottleSimilarPrompt(anchor, context, mode) {
  const { bottles = [], tastingLogs = [], userProfile = null } = context;
  const ownedNames = bottles.map(b => b.name).filter(Boolean).slice(0, 40);
  const limit = mode === "curator" ? 6 : 3;

  const anchorDetails = [
    anchor.type && `Type: ${anchor.type}`,
    anchor.distillery && `Distillery: ${anchor.distillery}`,
    anchor.region && `Region: ${anchor.region}`,
    anchor.country && `Country: ${anchor.country}`,
    anchor.age && `Age: ${anchor.age} years`,
    anchor.abv && `ABV: ${anchor.abv}%`,
    anchor.bottle_type && `Bottle type: ${anchor.bottle_type}`,
    anchor.tasting_notes && `Tasting notes: ${anchor.tasting_notes}`,
    anchor.finish && `Finish: ${anchor.finish}`,
  ].filter(Boolean).join("\n");

  const myTastings = (tastingLogs || []).filter(l => l.bottle_id === anchor.id).slice(0, 3);
  const tastingNotesSummary = myTastings.map(t => t.notes).filter(Boolean).join("; ");

  const prefStr = userProfile ? [
    userProfile.whiskey_preferences?.types?.length && `Preferred types: ${userProfile.whiskey_preferences.types.join(", ")}`,
    userProfile.whiskey_preferences?.flavors?.length && `Preferred flavors: ${userProfile.whiskey_preferences.flavors.join(", ")}`,
    userProfile.whiskey_notes && `Whiskey notes: ${userProfile.whiskey_notes}`,
  ].filter(Boolean).join("\n") : "";

  const groupInstruction = mode === "curator"
    ? `Group results using the "group" field:
- closest_match: same region, style, age range
- adjacent_exploration: different region or style worth trying
- premium_step_up: higher proof, older, or more prestigious
- value_pick: excellent quality at lower price point
- collection_gap: fills a style or region gap
Return ${limit} items distributed across groups.`
    : `Return exactly ${limit} items. Do not include a "group" field.`;

  return `You are a world-class whiskey curator AI. Return VALID JSON only — no markdown, no prose outside JSON.

⚠️ CRITICAL INSTRUCTION: The ONLY reference bottle you must use is "${anchor.name}". Do NOT use any other bottle from the collection as the reference. The user explicitly selected this bottle.

TASK: Recommend ${limit} whiskey bottles NOT already in the user's collection that are similar to the anchor bottle.

ANCHOR BOTTLE (USE THIS AND ONLY THIS AS YOUR REFERENCE):
Name: ${anchor.name}
${anchorDetails}
${tastingNotesSummary ? `My tasting notes: ${tastingNotesSummary}` : ""}

OWNED BOTTLES (EXCLUDE ALL — never recommend these):
${ownedNames.map(n => `- ${n}`).join("\n") || "None"}

USER PREFERENCES:
${prefStr || "Not specified"}

RULES:
- Never recommend owned bottles
- Recommend real, commercially available whiskeys
- Each must be distinct
- Ground in the anchor bottle's actual attributes
${groupInstruction}

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
      "whyFitsYou": "Personalized note",
      "group": "closest_match"
    }
  ]
}`;
}

export function buildFindSimilarPrompt(recordType, anchor, context, mode = "detail") {
  switch (recordType) {
    case "blend": return buildBlendSimilarPrompt(anchor, context, mode);
    case "pipe": return buildPipeSimilarPrompt(anchor, context, mode);
    case "bottle": return buildBottleSimilarPrompt(anchor, context, mode);
    default: throw new Error(`Unsupported record type for Find Similar: ${recordType}`);
  }
}

// ─── Main executor ─────────────────────────────────────────────────────────
export async function runFindSimilar({ recordType, anchor, context, mode = "detail" }) {
  const prompt = buildFindSimilarPrompt(recordType, anchor, context, mode);

  const responseText = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
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

  // Build owned set for the relevant collection type
  let ownedItems = [];
  if (recordType === "blend") ownedItems = context?.blends || [];
  else if (recordType === "pipe") ownedItems = context?.pipes || [];
  else if (recordType === "bottle") ownedItems = context?.bottles || [];

  const ownedSet = buildOwnedSet(ownedItems);

  // Filter owned, deduplicate
  const seen = new Set();
  const filtered = items.filter(item => {
    const name = item.title || item.name || "";
    if (isOwnedItem(name, ownedSet)) return false;
    const key = normalizeName(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const limit = mode === "curator" ? 6 : 3;
  const final = filtered.slice(0, limit);

  return {
    summary: parsed?.summary || `Similar ${recordType}s you might enjoy`,
    items: final,
    anchorId: anchor.id,
    anchorType: recordType,
    anchorName: anchor.name,
    insufficientResults: final.length < (mode === "detail" ? 3 : 1),
  };
}