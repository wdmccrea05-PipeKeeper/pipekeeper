import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!url || !anonKey) {
      return Response.json(
        { error: "Supabase config missing from environment" },
        { status: 500 }
      );
    }

    // Validate format
    if (!url.includes("supabase.co")) {
      return Response.json(
        { error: "Invalid SUPABASE_URL format" },
        { status: 500 }
      );
    }

    return Response.json({
      url,
      anonKey,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to get Supabase config" },
      { status: 500 }
    );
  }
});