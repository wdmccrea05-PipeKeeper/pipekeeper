// Get RemoteConfig value - callable function
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const { key, environment = "live" } = await req.json();
    
    if (!key) {
      return Response.json({ error: "key required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;

    const recs = await srv.entities.RemoteConfig.filter({
      key,
      environment,
      is_active: true
    });

    const rec0 = Array.isArray(recs) ? recs[0] : null;
    const value = rec0?.value ? String(rec0.value).trim() : "";

    return Response.json({ 
      value,
      source: value ? "remote" : "missing",
      found: !!value
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});