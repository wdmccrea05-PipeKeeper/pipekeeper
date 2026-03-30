import { base44 } from "@/api/base44Client";

export async function saveSession({
  user,
  session,
  moduleKey,
  onSuccess,
  onError,
}) {
  try {
    if (!user) throw new Error("No user");

    const payload = {
      ...session,
      module: moduleKey,
      user_email: user.email,
      created_at: new Date().toISOString(),
    };

    const result = await base44.insert("sessions", payload);

    if (!result) throw new Error("Session save failed");

    if (onSuccess) onSuccess(result);

    return result;
  } catch (err) {
    console.error("SESSION SAVE ERROR:", err);
    if (onError) onError(err);
    throw err;
  }
}
