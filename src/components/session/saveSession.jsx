import { base44 } from "@/api/base44Client";

export async function saveSession({
  user,
  session,
  moduleKey,
  onSuccess,
  onError,
}) {
  try {
    if (!user) throw new Error("No user authenticated");
    if (!session || typeof session !== 'object') throw new Error("Invalid session data");

    const payload = {
      ...session,
      module: moduleKey || 'unknown',
      user_email: user.email,
      created_at: new Date().toISOString(),
    };

    const result = await base44.entities.SmokingLog.create(payload);

    if (!result) throw new Error("Session save returned no result");

    if (onSuccess) onSuccess(result);
    return result;
  } catch (err) {
    console.error("SESSION SAVE ERROR:", err);
    if (onError) onError(err);
    throw err;
  }
}