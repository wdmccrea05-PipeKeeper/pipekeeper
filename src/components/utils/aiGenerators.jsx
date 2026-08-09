import { base44 } from "@/api/base44Client";
import {
  buildPairingsForPipes,
  inferBlendCategory,
  getAromaticIntensity,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
} from "@/components/utils/pairingScoreCanonical";
import { filterAiEligibleItems } from "@/components/platform/aiEligibility";
import { resolveBowlVariant } from "@/components/utils/pipeVariants";

// === Hard Rules Enforcement ===

export async function generatePairingsAI({ pipes, blends, profile }) {
  // Enforce AI exclusion: collector-only or ai_excluded items must not appear in recommendations
  const eligiblePipes = filterAiEligibleItems(pipes || []);
  const eligibleBlends = filterAiEligibleItems(blends || []);

  // Expand pipes to include bowl variants as separate entries.
  // Bowl variants inherit any unspecified value (focus AND geometry) from the
  // parent pipe via resolveBowlVariant(), so a bowl with no focus of its own is
  // scored exactly the same here as it is on the pipe detail screen.
  const toPipeData = (source, { pipeId, pipeName, bowlVariantId }) => ({
    pipe_id: pipeId,
    pipe_name: pipeName,
    bowl_variant_id: bowlVariantId,

    maker: source.maker || null,
    shape: source.shape || null,
    bowlStyle: source.bowlStyle || null,
    shankShape: source.shankShape || null,
    bend: source.bend || null,
    sizeClass: source.sizeClass || null,

    bowl_material: source.bowl_material ?? null,
    chamber_volume: source.chamber_volume ?? null,
    bowl_diameter_mm: source.bowl_diameter_mm ?? null,
    bowl_depth_mm: source.bowl_depth_mm ?? null,
    bowl_height_mm: source.bowl_height_mm ?? null,
    bowl_width_mm: source.bowl_width_mm ?? null,
    filter_type: source.filter_type ?? null,
    usage_characteristics: source.usage_characteristics ?? null,
    smoking_characteristics: source.smoking_characteristics ?? null,

    // Raw focus tags — canonical normalizeFocus()/normalizePipeForPairing() in
    // pairingScoreCanonical is the ONLY place focus is interpreted.
    focus: Array.isArray(source.focus) ? source.focus : [],
    notes: source.notes || "",
  });

  const pipesData = [];
  for (const p of eligiblePipes) {
    const pid = String(p.id);
    const bowls = Array.isArray(p.interchangeable_bowls) ? p.interchangeable_bowls : [];

    if (bowls.length > 0) {
      bowls.forEach((bowl, idx) => {
        const variant = resolveBowlVariant(p, bowl, idx);
        pipesData.push(
          toPipeData(variant, {
            pipeId: pid,
            pipeName: `${p.name} - ${bowl?.name || `Bowl ${idx + 1}`}`,
            bowlVariantId: variant.bowl_variant_id,
          })
        );
      });
    } else {
      pipesData.push(toPipeData(p, { pipeId: pid, pipeName: p.name, bowlVariantId: null }));
    }
  }

  const blendsData = eligibleBlends.map((b) => {
    // Use canonical helpers
    const category = inferBlendCategory(b);
    const intensity = category === "aromatic" ? getAromaticIntensity(b) : null;

    return {
      tobacco_id: String(b.id),
      tobacco_name: b.name,
      manufacturer: b.manufacturer || null,
      blend_type: b.blend_type || null,
      blend_family: b.blend_family || null,
      strength: b.strength || null,
      cut: b.cut || null,
      flavor_notes: b.flavor_notes || null,
      flavor_profile: b.flavor_profile || null,
      tobacco_components: b.tobacco_components || null,
      casing: b.casing || null,
      topping: b.topping || null,
      is_aromatic: typeof b.is_aromatic === "boolean" ? b.is_aromatic : undefined,
      category,
      aromatic_intensity: intensity,
    };
    });

    // Build a profile object in the same shape used by the scorer
    const userProfile = profile
    ? {
        preferred_blend_types: profile.preferred_blend_types || [],
        strength_preference: profile.strength_preference || null,
        pipe_size_preference: profile.pipe_size_preference || null,
        clenching_preference: profile.clenching_preference || null,
        smoke_duration_preference: profile.smoke_duration_preference || null,
        notes: profile.notes || null,
      }
    : null;

    // IMPORTANT: blendsData already contains tobacco_id / tobacco_name in your code above.
    // Ensure it also carries flavor_notes / tobacco_components / aromatic_intensity if present.
    const pairings = buildPairingsForPipes(pipesData, blendsData, userProfile);

    if (!pairings.length) {
    throw new Error("No pairings produced (pipes list empty?)");
    }

    return { pairings };
    }

export async function generateOptimizationAI({ pipes, blends, profile, whatIfText }) {
  // Enforce AI exclusion: collector-only or ai_excluded items must not appear in recommendations
  const eligiblePipes = filterAiEligibleItems(pipes || []);
  const eligibleBlends = filterAiEligibleItems(blends || []);

  const pipesData = [];
  for (const p of eligiblePipes) {
    const pid = String(p.id);
    const bowls = Array.isArray(p.interchangeable_bowls) ? p.interchangeable_bowls : [];

    const toEntry = (source, pipeName, bowlVariantId) => ({
      pipe_id: pid,
      pipe_name: pipeName,
      bowl_variant_id: bowlVariantId,
      maker: source.maker ?? null,
      shape: source.shape ?? null,
      bowlStyle: source.bowlStyle ?? null,
      shankShape: source.shankShape ?? null,
      bend: source.bend ?? null,
      sizeClass: source.sizeClass ?? null,
      bowl_material: source.bowl_material ?? null,
      chamber_volume: source.chamber_volume ?? null,
      bowl_diameter_mm: source.bowl_diameter_mm ?? null,
      bowl_depth_mm: source.bowl_depth_mm ?? null,
      bowl_height_mm: source.bowl_height_mm ?? null,
      bowl_width_mm: source.bowl_width_mm ?? null,
      filter_type: source.filter_type ?? null,
      focus: Array.isArray(source.focus) ? source.focus : [],
      usage_characteristics: source.usage_characteristics ?? null,
      smoking_characteristics: source.smoking_characteristics ?? null,
      condition: source.condition ?? null,
      usage_bowls_count: source.usage_bowls_count ?? null,
    });

    if (bowls.length > 0) {
      bowls.forEach((bowl, idx) => {
        // resolveBowlVariant applies the canonical parent-inheritance rule.
        const variant = resolveBowlVariant(p, bowl, idx);
        pipesData.push(
          toEntry(variant, `${p.name} - ${bowl?.name || `Bowl ${idx + 1}`}`, variant.bowl_variant_id)
        );
      });
    } else {
      pipesData.push(toEntry(p, p.name, null));
    }
  }

  const pipesDataCapped = pipesData.slice(0, 30);
  const blendsDataCapped = eligibleBlends.slice(0, 60).map((b) => ({
    id: b.id,
    name: b.name,
    blend_type: b.blend_type,
    blend_family: b.blend_family || null,
    strength: b.strength,
    cut: b.cut,
    flavor_notes: b.flavor_notes || null,
    flavor_profile: b.flavor_profile || null,
    tobacco_components: b.tobacco_components || null,
    manufacturer: b.manufacturer || null,
    aging_potential: b.aging_potential || null,
    casing: b.casing || null,
    topping: b.topping || null,
    is_aromatic: typeof b.is_aromatic === "boolean" ? b.is_aromatic : undefined,
    aromatic_intensity: b.aromatic_intensity || null,
  }));

  // Structured context for the LLM, derived from the SAME normalization the
  // scorer uses. The prompt must never carry a second, divergent reading of
  // aromatic status / dedication / chamber geometry.
  const pipeProfiles = pipesDataCapped.map((p) => {
    const n = normalizePipeForPairing(p);
    return {
      pipe_id: p.pipe_id,
      bowl_variant_id: p.bowl_variant_id,
      pipe_name: p.pipe_name,
      // This generator recommends focus reassignments, so the LLM still needs
      // the raw tags it would be changing alongside the normalized reading.
      current_focus: p.focus || [],
      maker: p.maker || null,
      shape: p.shape || null,
      dedication: n.dedicationType,
      dedication_strength: n.dedicationStrength,
      named_blend_focus: n.exactBlendFocus,
      chamber_width: n.chamberWidthCategory,
      chamber_depth: n.chamberDepthCategory,
      chamber_diameter_mm: n.chamberDiameterMm,
      chamber_depth_mm: n.chamberDepthMm,
      chamber_volume: n.chamberVolume,
      bowl_material: n.bowlMaterial,
      smoking_character: n.smokingCharacter,
      draw: n.drawCharacter,
      data_confidence: n.confidence,
    };
  });

  const blendProfiles = blendsDataCapped.map((b) => {
    const n = normalizeTobaccoForPairing(b);
    return {
      tobacco_id: b.id,
      tobacco_name: b.name,
      blend_family: n.blendFamily,
      is_aromatic: n.isAromatic,
      aromatic_intensity: n.aromaticIntensity,
      cut: n.cut,
      components: n.tobaccoComponents,
      has_latakia: n.hasLatakia,
      has_perique: n.hasPerique,
      has_black_cavendish: n.hasBlackCavendish,
      is_lakeland: n.isLakeland,
      data_confidence: n.confidence,
    };
  });

  const profileContext = profile
    ? {
        preferred_blend_types: profile.preferred_blend_types || [],
        preferred_shapes: profile.preferred_shapes || [],
        strength_preference: profile.strength_preference || null,
        pipe_size_preference: profile.pipe_size_preference || null,
        clenching_preference: profile.clenching_preference || null,
        smoke_duration_preference: profile.smoke_duration_preference || null,
        notes: profile.notes || null,
      }
    : null;

  const pipesTruncatedNote =
    pipesData.length > 30
      ? `\n[Note: Showing 30 of ${pipesData.length} pipe configurations.]`
      : "";
  const blendsTruncatedNote =
    blends && blends.length > 60
      ? `\n[Note: Showing 60 of ${blends.length} blends.]`
      : "";

  // Pre-compute pairing score summaries using the canonical scorer
  const pairingMatrix = buildPairingsForPipes(pipesDataCapped, blendsDataCapped, profileContext);

  const pipeScoreSummaries = pipesDataCapped.map(pipe => {
    const variantKey = pipe.bowl_variant_id
      ? `${pipe.pipe_id}__${pipe.bowl_variant_id}`
      : pipe.pipe_id;

    const scores = pairingMatrix
      .filter(p => {
        const pk = p.bowl_variant_id ? `${p.pipe_id}__${p.bowl_variant_id}` : p.pipe_id;
        return pk === variantKey;
      })
      .map(p => p.score);

    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highCount = scores.filter(s => s >= 7).length;
    const modCount = scores.filter(s => s >= 5).length;
    const topScore = scores.length ? Math.max(...scores) : 0;

    return {
      pipe_id: pipe.pipe_id,
      bowl_variant_id: pipe.bowl_variant_id || null,
      pipe_name: pipe.pipe_name,
      current_focus: pipe.focus,
      average_pairing_score: Math.round(avg * 10) / 10,
      top_pairing_score: topScore,
      high_compat_blend_count: highCount,
      moderate_compat_blend_count: modCount,
      blend_count_evaluated: scores.length,
    };
  });

  const prompt = `You are an expert pipe collection optimizer specializing in maximizing tobacco blend coverage and pairing satisfaction.

## PRIMARY GOAL: Full Blend Type Coverage
Assign each pipe to one or more preferred blend types from the user's preference list, ensuring:
1. Every blend type the user prefers has at least ONE dedicated pipe
2. Every other blend type has coverage options (pipes capable of handling them well)
3. Pipes are reassigned to eliminate gaps, not just improve redundancy

## Secondary Goals
- Maximize pairing scores for reassigned pipes (score_delta >= 1.0 is ideal)
- Identify redundant specializations (multiple pipes serving identical blend types)
- Suggest purchases only for gaps that cannot be filled by reassignment

## Rules
- User preferred_blend_types are PRIORITY targets for coverage
- Each pipe can support multiple blend types (versatile pipes are valuable)
- bowl_variant_id = null means main pipe; otherwise it's an interchangeable bowl
- Score delta = (estimated new avg score) - (current avg score)
- Include EVERY pipe with a meaningful reassignment (not just high score_delta)
- Provide detailed rationale for why each reassignment addresses user goals

${whatIfText ? `## USER FEEDBACK / CONTEXT\n${String(whatIfText).substring(0, 2500)}` : ""}

## PIPE SCORING SUMMARY
${JSON.stringify(pipeScoreSummaries)}

## PIPE PROFILES (normalized by the canonical pairing scorer)
${JSON.stringify(pipeProfiles)}${pipesTruncatedNote}

## BLEND INVENTORY (normalized by the canonical pairing scorer)
${JSON.stringify(blendProfiles)}${blendsTruncatedNote}

## USER PREFERENCES
${JSON.stringify(profileContext)}

## Analysis Steps

1. **Coverage Assessment**: List all blend types in inventory. For each, identify which pipes currently match well (avg_score >=6).

2. **Priority Coverage**: Ensure each user-preferred blend type has at least one dedicated pipe. Recommend reassignments to fill priority gaps.

3. **Full Coverage**: For remaining blend types (non-preferred), ensure at least one pipe can handle them well. Suggest reassignments if needed.

4. **Redundancy Check**: Identify pipes with identical/overlapping focus that serve the same blends. Mark for consolidation or specialization.

5. **Specific Recommendations**: For EACH pipe that should change:
   - Current blend types it serves
   - Proposed new specialization
   - Which gaps it would fill (preferred / non-preferred blends)
   - Expected score impact
   - Detailed rationale tying to user goals

6. **Purchase Suggestions**: Only recommend purchases if reassignment cannot achieve full coverage.

Respond with detailed JSON:`;


  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      required: ["applyable_changes", "summary"],
      properties: {
        summary: { type: "string" },
        applyable_changes: {
          type: "array",
          items: {
            type: "object",
            required: ["pipe_id", "before_focus", "after_focus", "rationale"],
            properties: {
              pipe_id: { type: "string" },
              bowl_variant_id: { type: ["string", "null"] },
              before_focus: { type: "array", items: { type: "string" } },
              after_focus: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
              score_delta: { type: "number" },
              fills_gap_for: { type: ["string", "null"] },
            },
          },
        },
        collection_gaps: { type: "array", items: { type: "string" } },
        next_additions: { type: "array", items: { type: "string" } },
        redundancies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              blend_type: { type: "string" },
              pipe_names: { type: "array", items: { type: "string" } },
              recommendation: { type: "string" },
            }
          }
        },
        purchase_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              gap_blend_type: { type: "string" },
              suggested_pipe_characteristics: { type: "string" },
              rationale: { type: "string" },
            }
          }
        },
        coverage_summary: {
          type: "object",
          properties: {
            total_blends: { type: "number" },
            blends_with_good_match: { type: "number" },
            blends_with_no_match: { type: "number" },
            coverage_percentage: { type: "number" },
          }
        }
      },
    },
  });

  // Always normalize the shape so downstream UI never crashes
  return {
    summary: result?.summary || "",
    applyable_changes: Array.isArray(result?.applyable_changes) ? result.applyable_changes : [],
    collection_gaps: Array.isArray(result?.collection_gaps) ? result.collection_gaps : [],
    next_additions: Array.isArray(result?.next_additions) ? result.next_additions : [],
    redundancies: Array.isArray(result?.redundancies) ? result.redundancies : [],
    purchase_suggestions: Array.isArray(result?.purchase_suggestions) ? result.purchase_suggestions : [],
    coverage_summary: result?.coverage_summary || null,
  };
}

export async function generateBreakInScheduleAI({ pipe, blends, profile }) {
  const blendsData = (blends || []).map((b) => ({
    id: b.id,
    name: b.name,
    manufacturer: b.manufacturer,
    blend_type: b.blend_type,
    strength: b.strength,
    cut: b.cut,
  }));

  const profileContext = profile
    ? {
        preferred_blend_types: profile.preferred_blend_types || [],
        preferred_shapes: profile.preferred_shapes || [],
        strength_preference: profile.strength_preference || null,
        pipe_size_preference: profile.pipe_size_preference || null,
        clenching_preference: profile.clenching_preference || null,
        smoke_duration_preference: profile.smoke_duration_preference || null,
        notes: profile.notes || null,
      }
    : null;

  const pipeData = {
    id: pipe?.id,
    name: pipe?.name,
    maker: pipe?.maker,
    shape: pipe?.shape,
    bowlStyle: pipe?.bowlStyle,
    shankShape: pipe?.shankShape,
    bend: pipe?.bend,
    sizeClass: pipe?.sizeClass,
    bowl_material: pipe?.bowl_material,
    focus: pipe?.focus || [],
    chamber_volume: pipe?.chamber_volume ?? null,
    bowl_diameter_mm: pipe?.bowl_diameter_mm ?? null,
    bowl_depth_mm: pipe?.bowl_depth_mm ?? null,
  };

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Create a break-in schedule for this pipe.

Rules:
- Stage 1 may include "conditioning bowls" even outside the final focus (mild, forgiving blends).
- Stages 2+ should trend toward the pipe's focus and user preferences.
- Only use blends from the provided list.
- Return JSON only.

PIPE:
${JSON.stringify(pipeData, null, 2)}

BLENDS:
${JSON.stringify(blendsData, null, 2)}

USER_PREFERENCES:
${JSON.stringify(profileContext, null, 2)}

Return JSON:
{ schedule: [{ blend_id, blend_name, suggested_bowls, bowls_completed, reasoning }] }`,
    response_json_schema: {
      type: "object",
      properties: {
        schedule: {
          type: "array",
          items: {
            type: "object",
            properties: {
              blend_id: { type: "string" },
              blend_name: { type: "string" },
              suggested_bowls: { type: "number" },
              bowls_completed: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["blend_id", "blend_name", "suggested_bowls", "bowls_completed", "reasoning"],
          },
        },
      },
      required: ["schedule"],
    }
  });

  return { schedule: result?.schedule || [] };
}