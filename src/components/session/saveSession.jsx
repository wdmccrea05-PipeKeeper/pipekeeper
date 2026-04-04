import { base44 } from "@/api/base44Client";

function normalizeOptionalString(value) {
  if (value === undefined || value === null || value === "" || value === "__none__") {
    return null;
  }
  return value;
}

export function buildSmokingLogPayload({ user, session }) {
  if (!user?.email) {
    throw new Error("No authenticated user");
  }

  if (!session || typeof session !== "object") {
    throw new Error("Invalid session payload");
  }

  // SmokingLog requires blend_id/pipe_id fields to EXIST.
  // For external items, they must be null, not omitted.
  return {
    created_by: user.email,
    pipe_id: normalizeOptionalString(session.pipe_id),
    pipe_name: session.pipe_name || null,
    blend_id: normalizeOptionalString(session.blend_id),
    blend_name: session.blend_name || null,
    bowl_variant_id: normalizeOptionalString(session.bowl_variant_id),
    bowl_name: normalizeOptionalString(session.bowl_name),
    container_id: normalizeOptionalString(session.container_id),
    bowls_used: Number(session.bowls_used || 1),
    bowls_smoked: Number(session.bowls_used || 1),
    date: session.date,
    is_break_in: !!session.is_break_in,
    notes: session.notes || null,

    // External item support
    external_pipe_name: session.external_pipe_name || null,
    external_pipe_maker: session.external_pipe_maker || null,
    external_pipe_shape: session.external_pipe_shape || null,
    external_blend_name: session.external_blend_name || null,
    external_blend_manufacturer: session.external_blend_manufacturer || null,
    external_blend_type: session.external_blend_type || null,
  };
}

export async function saveSession({ user, session }) {
  const payload = buildSmokingLogPayload({ user, session });

  const result = await base44.entities.SmokingLog.create(payload);

  if (!result) {
    throw new Error("SmokingLog.create returned empty response");
  }

  return result;
}