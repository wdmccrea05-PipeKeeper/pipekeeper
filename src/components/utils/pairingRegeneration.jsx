
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

  // Hard cleanup: ensure only one active artifact exists
  const actives = await base44.entities.PairingMatrix.filter(
    { created_by: user.email, is_active: true },
    "-created_date",
    50
  );

  for (const a of actives || []) {
    await safeUpdate("PairingMatrix", a.id, { is_active: false }, user.email);
  }

  // Deactivate current active if provided (defensive; may already be handled above)
  if (activePairings?.id) {
    await safeUpdate("PairingMatrix", activePairings.id, { is_active: false }, user.email);
  }

  // Create new active artifact (fast + consistent)
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
