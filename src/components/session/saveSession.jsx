import { base44 } from "@/api/base44Client";

const OMIT_IF_EMPTY = [
  "pipe_id",
  "blend_id",
  "container_id",
  "bowl_variant_id",
  "bowl_name",
  "notes",
];

function cleanPayload(payload) {
  const cleaned = { ...payload };

  for (const key of OMIT_IF_EMPTY) {
    const value = cleaned[key];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "__none__"
    ) {
      delete cleaned[key];
    }
  }

  return cleaned;
}

export function buildSmokingLogPayload({ user, session }) {
  if (!user?.email) {
    throw new Error("No authenticated user");
  }

  if (!session || typeof session !== "object") {
    throw new Error("Invalid session payload");
  }

  return cleanPayload({
    created_by: user.email,
    user_email: user.email,
    pipe_id: session.pipe_id,
    blend_id: session.blend_id,
    container_id: session.container_id,
    bowl_variant_id: session.bowl_variant_id,
    pipe_name: session.pipe_name,
    blend_name: session.blend_name,
    bowl_name: session.bowl_name,
    bowls_used: Number(session.bowls_used || 1),
    bowls_smoked: Number(session.bowls_used || 1),
    date: session.date,
    is_break_in: !!session.is_break_in,
    notes: session.notes || "",
  });
}

export async function saveSession({ user, session }) {
  const payload = buildSmokingLogPayload({ user, session });

  const result = await base44.entities.SmokingLog.create(payload);

  if (!result) {
    throw new Error("SmokingLog.create returned empty response");
  }

  return result;
}