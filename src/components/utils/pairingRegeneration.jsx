import { generatePairingsAI } from "./aiGenerators";
import { buildArtifactFingerprint } from "./fingerprint";
import { safeUpdate } from "./safeUpdate";
import { invalidateAIQueries } from "./cacheInvalidation";
import { base44 } from "@/api/base44Client";

/**
 * Regenerates pairings and updates the ACTIVE PairingMatrix.
 *
 * mode:
 * - "replace": deactivate old active + create new matrix from scratch
 * - "merge": keep existing matrix and replace ONLY the pipes you regenerated
 */
export async function regeneratePairings({
  pipes,
  blends,
  profile,
  user,
  queryClient,
  activePairings,
  mode = "merge",
}) {
  const currentFingerprint = buildArtifactFingerprint({ pipes, blends, profile });
  const { pairings: newPairings } = await generatePairingsAI({ pipes, blends, profile });

  if (!newPairings || newPairings.length === 0) {
    throw new Error("No pairings generated.");
  }

  // If no active matrix exists, always create one
  if (!activePairings?.id) {
    await base44.entities.PairingMatrix.create({
      created_by: user.email,
      is_active: true,
      previous_active_id: null,
      input_fingerprint: currentFingerprint,
      pairings: newPairings,
      generated_date: new Date().toISOString(),
    });

    await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
    invalidateAIQueries(queryClient, user?.email);
    return;
  }

  // Merge mode: replace only regenerated pipes/variants inside the existing active matrix
  if (mode === "merge") {
    const existing = activePairings?.pairings || [];

    // Build a set of (pipe_id, bowl_variant_id) keys coming from the new run
    const newKeys = new Set(
      newPairings.map((p) => `${String(p.pipe_id)}::${p.bowl_variant_id ?? "main"}`)
    );

    // Keep all existing pairings except the ones we regenerated
    const merged = existing.filter((p) => {
      const key = `${String(p.pipe_id)}::${p.bowl_variant_id ?? "main"}`;
      return !newKeys.has(key);
    });

    merged.push(...newPairings);

    await safeUpdate(
      "PairingMatrix",
      activePairings.id,
      {
        // keep matrix active, just update contents
        is_active: true,
        input_fingerprint: currentFingerprint,
        pairings: merged,
        generated_date: new Date().toISOString(),
      },
      user?.email
    );

    await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
    invalidateAIQueries(queryClient, user?.email);
    return;
  }

  // Replace mode: deactivate old + create new
  await safeUpdate("PairingMatrix", activePairings.id, { is_active: false }, user?.email);

  await base44.entities.PairingMatrix.create({
    created_by: user.email,
    is_active: true,
    previous_active_id: activePairings?.id ?? null,
    input_fingerprint: currentFingerprint,
    pairings: newPairings,
    generated_date: new Date().toISOString(),
  });

  await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
  invalidateAIQueries(queryClient, user?.email);
}