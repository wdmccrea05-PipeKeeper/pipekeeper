import { base44 } from "@/api/base44Client";

const FREE_LIMITS = { pipes: 5, tobaccos: 10 };

export async function ensureFreeGrandfatherFlag(user) {
  if (!user?.id) return;

  // Only for non-paid users
  if (user.isPaidSubscriber || user.hasPremium) return;

  // Already flagged
  if (user.isFreeGrandfathered) return;

  try {
    // Count current items
    const pipes = await base44.entities.Pipe.filter({ created_by: user.email });
    const tobaccos = await base44.entities.TobaccoBlend.filter({ created_by: user.email });

    const pipeCount = pipes?.length || 0;
    const tobaccoCount = tobaccos?.length || 0;

    const overLimit = pipeCount > FREE_LIMITS.pipes || tobaccoCount > FREE_LIMITS.tobaccos;

    if (!overLimit) return;

    // Flag them to preserve existing data
    await base44.auth.updateMe({
      isFreeGrandfathered: true,
      freeGrandfatheredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to check grandfather status:", err);
  }
}