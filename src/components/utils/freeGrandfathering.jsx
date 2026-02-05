import { base44 } from "@/api/base44Client";

/**
 * If you are using “legacy premium / grandfathering”, store it on UserProfile.
 * Do NOT write to entities.User (schema does not exist).
 */

export async function ensureFreeGrandfatherFlag(email) {
  const userEmail = (email || "").trim().toLowerCase();
  if (!userEmail) return { ok: false, reason: "missing_email" };

  const rows = await base44.entities.UserProfile.filter({ user_email: userEmail });
  const profile = rows?.[0];

  // If no profile exists, create one (safe)
  if (!profile) {
    const created = await base44.entities.UserProfile.create({
      user_email: userEmail,
      legacy_premium: true,
      subscription_tier: "premium",
    });
    return { ok: true, created: true, id: created?.id || null };
  }

  // If already flagged, no-op
  if (profile?.legacy_premium) {
    return { ok: true, already: true, id: profile?.id || null };
  }

  // Update existing profile
  await base44.entities.UserProfile.update(profile.id, {
    legacy_premium: true,
    subscription_tier: profile?.subscription_tier || "premium",
  });

  return { ok: true, updated: true, id: profile?.id || null };
}