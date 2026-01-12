import { generatePairingsAI } from "./aiGenerators";
import { buildArtifactFingerprint } from "./fingerprint";
import { safeUpdate } from "./safeUpdate";
import { invalidateAIQueries } from "./cacheInvalidation";
import { base44 } from "@/api/base44Client";

export async function regeneratePairings({ pipes, blends, profile, user, queryClient, activePairings }) {
  const currentFingerprint = buildArtifactFingerprint({ pipes, blends, profile });
  const { pairings } = await generatePairingsAI({ pipes, blends, profile });

  if (!pairings || pairings.length === 0) {
    throw new Error("No pairings generated.");
  }

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

  // Update pipe records with tobacco match scores from pairings
  const pipeUpdates = pipes.map(pipe => {
    const pipeParings = pairings.filter(p => String(p.pipe_id) === String(pipe.id));
    if (pipeParings.length > 0) {
      return {
        id: pipe.id,
        topTobaccoMatches: pipeParings[0].recommendations || pipeParings[0].blend_matches || []
      };
    }
    return null;
  }).filter(Boolean);

  for (const update of pipeUpdates) {
    await safeUpdate('Pipe', update.id, { topTobaccoMatches: update.topTobaccoMatches }, user?.email);
  }

  await queryClient.invalidateQueries({ queryKey: ["activePairings", user?.email] });
  await queryClient.invalidateQueries({ queryKey: ["pipes", user?.email] });
  invalidateAIQueries(queryClient, user?.email);
}