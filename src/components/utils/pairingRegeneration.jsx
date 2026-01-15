import { generatePairingsAI } from "./aiGenerators";
import { buildArtifactFingerprint } from "./fingerprint";
import { safeUpdate } from "./safeUpdate";
import { invalidateAIQueries } from "./cacheInvalidation";
import { base44 } from "@/api/base44Client";

/**
 * Single source of truth for PairingMatrix regeneration.
 * Ensures BOTH the Pairing Grid refresh and AI Updates regenerate produce identical outputs
 * given the same pipes/blends/profile.
 */
export async function regeneratePairingsConsistent({
  pipes,
  blends,
  profile,
  user,
  queryClient,
  activePairings,
  skipIfUpToDate = true,
}) {
  if (!user?.email) throw new Error("Missing user.email");
  const currentFingerprint = buildArtifactFingerprint({ pipes, blends, profile });

  if (
    skipIfUpToDate &&
    activePairings?.is_active &&
    activePairings?.input_fingerprint &&
    activePairings.input_fingerprint === currentFingerprint
  ) {
    return { skipped: true, fingerprint: currentFingerprint };
  }

  const { pairings: newPairings } = await generatePairingsAI({ pipes, blends, profile });
  if (!newPairings || newPairings.length === 0) {
    throw new Error("No pairings generated.");
  }

  // Deactivate the previously active artifact
  if (activePairings?.id) {
    await safeUpdate("PairingMatrix", activePairings.id, { is_active: false }, user.email);
  }

  // Defensive: ensure there is only one active matrix (in case older builds left extras)
  const otherActives = await base44.entities.PairingMatrix.filter(
    { created_by: user.email, is_active: true },
    "-created_date",
    25
  );
  for (const a of otherActives || []) {
    if (String(a.id) !== String(activePairings?.id)) {
      await safeUpdate("PairingMatrix", a.id, { is_active: false }, user.email);
    }
  }

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

  return { skipped: false, fingerprint: currentFingerprint };
}