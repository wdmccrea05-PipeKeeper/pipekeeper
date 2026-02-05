import { base44 } from "@/api/base44Client";

const FREE_LIMITS = { pipes: 5, tobaccos: 10 };

export async function ensureFreeGrandfatherFlag(user) {
  if (!user?.id || !user?.email) return;

  // Called only when hasPaid === false in useCurrentUser,
  // so we do not need extra "paid" checks here.
  if (user.isFreeGrandfathered) return;

  try {
    const pipes = await base44.entities.Pipe.filter({ created_by: user.email });
    const tobaccos = await base44.entities.TobaccoBlend.filter({ created_by: user.email });

    const pipeCount = pipes?.length || 0;
    const tobaccoCount = tobaccos?.length || 0;

    const overLimit =
      pipeCount > FREE_LIMITS.pipes || tobaccoCount > FREE_LIMITS.tobaccos;

    if (!overLimit) return;

    // Update the User ENTITY record (not auth profile)
    await base44.entities.User.update(user.id, {
      isFreeGrandfathered: true,
      freeGrandfatheredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to check grandfather status:", err);
  }
}