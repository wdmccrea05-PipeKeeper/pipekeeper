import { base44 } from "@/api/base44Client";

/**
 * Canonical saveSession helper for direct PipeKeeper smoking-log saves.
 * Omits nullable string id fields instead of sending null.
 */

function omitEmptyStringIds(payload) {
  const cleaned = { ...payload };

  ["pipe_id", "blend_id", "container_id", "bowl_variant_id"].forEach((key) => {
    if (
      cleaned[key] === undefined ||
      cleaned[key] === null ||
      cleaned[key] === "" ||
      cleaned[key] === "__none__"
    ) {
      delete cleaned[key];
    }
  });

  return cleaned;
}

export function buildSmokingLogPayload({
  user,
  session,
  moduleKey,
}) {
  if (!user?.email) throw new Error("No user authenticated");
  if (!session || typeof session !== "object") throw new Error("Invalid session data");

  const payload = omitEmptyStringIds({
    ...session,
    module: moduleKey || "pipekeeper",
    user_email: user.email,
    created_at: new Date().toISOString(),
  });

  return payload;
}

export async function saveSession({
  user,
  session,
  moduleKey,
  onSuccess,
  onError,
}) {
  try {
    const payload = buildSmokingLogPayload({ user, session, moduleKey });
    const result = await base44.entities.SmokingLog.create(payload);

    if (!result) throw new Error("Session save returned no result");

    if (onSuccess) onSuccess(result);
    return result;
  } catch (err) {
    console.error("[saveSession] SESSION SAVE ERROR:", err);
    if (onError) onError(err);
    throw err;
  }
}
