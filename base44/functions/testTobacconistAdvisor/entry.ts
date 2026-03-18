import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's pipes and tobacco blends
    const pipes = await base44.entities.Pipe.filter({ created_by: user.email });
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    const profile = await base44.entities.UserProfile.filter({ user_email: user.email });
    const logs = await base44.entities.SmokingLog.filter({ created_by: user.email });

    // Summarize data
    const pipesSummary = pipes.slice(0, 5).map(p => ({
      name: p.name,
      maker: p.maker,
      shape: p.shape,
      material: p.bowl_material,
      focus: p.focus,
    }));

    const blendsSummary = blends.slice(0, 5).map(b => ({
      name: b.name,
      manufacturer: b.manufacturer,
      blend_type: b.blend_type,
      strength: b.strength,
      is_favorite: b.is_favorite,
    }));

    const totalPipes = pipes.length;
    const totalBlends = blends.length;
    const totalSmokes = logs.length;

    return Response.json({
      user: user.email,
      collection: {
        total_pipes: totalPipes,
        total_blends: totalBlends,
        total_smoking_sessions: totalSmokes,
        sample_pipes: pipesSummary,
        sample_blends: blendsSummary,
      },
      message: `Ready to test! You have ${totalPipes} pipes and ${totalBlends} blends. Ask the expert: "If I had to keep 1 pipe and 1 tobacco blend, what would they be?"`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});