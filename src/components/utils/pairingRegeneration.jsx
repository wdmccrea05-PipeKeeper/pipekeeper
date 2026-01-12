import { generatePairingsAI } from "./aiGenerators";
import { buildArtifactFingerprint } from "./fingerprint";
import { safeUpdate } from "./safeUpdate";
import { invalidateAIQueries } from "./cacheInvalidation";
import { base44 } from "@/api/base44Client";

export async function regeneratePairings({ pipes, blends, profile, user, queryClient, activePairings }) {
  const currentFingerprint = buildArtifactFingerprint({ pipes, blends, profile });
  const { pairings } = await generatePairingsAI({ pipes, blends, profile });

  if (activePairings?.id) {
    await safeUpdate('PairingMatrix', activePairings.id, { is_active: false }, user?.email);
  }

  await base44.entities.PairingMatrix.create({
    created_by: user.email,
    is_active: true,
    previous_active_id: activePairings?.id ?? null,
    input_fingerprint: currentFingerprint,
    pairings,
    generated_date: new Date().toISOString(),
  });

  await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
  invalidateAIQueries(queryClient, user?.email);
}