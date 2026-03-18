import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if this is called from automation (no user) or from admin
    const user = await base44.auth.me().catch(() => null);
    
    // If there's a user, they must be admin. If no user, allow (automation context)
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all new data from yesterday
    const [pipes, blends, logs, profiles] = await Promise.all([
      base44.asServiceRole.entities.Pipe.list(),
      base44.asServiceRole.entities.TobaccoBlend.list(),
      base44.asServiceRole.entities.SmokingLog.list(),
      base44.asServiceRole.entities.UserProfile.list()
    ]);

    // Ensure all results are arrays
    const safePipes = Array.isArray(pipes) ? pipes : [];
    const safeBlends = Array.isArray(blends) ? blends : [];
    const safeLogs = Array.isArray(logs) ? logs : [];

    // Filter for records created yesterday
    const filterByDate = (items) => items.filter(item => {
      const created = new Date(item.created_date);
      return created >= yesterday && created < today;
    });

    const newPipes = filterByDate(safePipes);
    const newBlends = filterByDate(safeBlends);
    const newLogs = filterByDate(safeLogs);

    const insights = [];

    // Analyze shape popularity
    if (newPipes.length > 0) {
      const shapeCount = {};
      newPipes.forEach(pipe => {
        if (pipe.shape) {
          shapeCount[pipe.shape] = (shapeCount[pipe.shape] || 0) + 1;
        }
      });
      
      const topShape = Object.entries(shapeCount)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topShape && topShape[1] > 2) {
        insights.push({
          category: "shape_preference",
          topic: `${topShape[0]} popularity`,
          insight: `${topShape[0]} shape added by ${topShape[1]} users in 24h, indicating growing interest`,
          confidence: "medium",
          source_type: "pattern_observed",
          tags: [topShape[0], "shape", "trend"]
        });
      }
    }

    // Analyze blend type preferences
    if (newBlends.length > 0) {
      const blendTypeCount = {};
      newBlends.forEach(blend => {
        if (blend.blend_type) {
          blendTypeCount[blend.blend_type] = (blendTypeCount[blend.blend_type] || 0) + 1;
        }
      });
      
      const topBlendType = Object.entries(blendTypeCount)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topBlendType && topBlendType[1] > 2) {
        insights.push({
          category: "tobacco_characteristic",
          topic: `${topBlendType[0]} preference`,
          insight: `${topBlendType[0]} blends added frequently (${topBlendType[1]} instances), suggesting strong community preference`,
          confidence: "medium",
          source_type: "pattern_observed",
          tags: [topBlendType[0], "blend_type", "preference"]
        });
      }
    }

    // Analyze pairing patterns from smoking logs
    if (newLogs.length > 5) {
      const pairings = {};
      
      for (const log of newLogs) {
        const pipe = safePipes.find(p => p.id === log.pipe_id);
        const blend = safeBlends.find(b => b.id === log.blend_id);
        
        if (pipe?.shape && blend?.blend_type) {
          const key = `${pipe.shape}|${blend.blend_type}`;
          pairings[key] = (pairings[key] || 0) + 1;
        }
      }
      
      const topPairing = Object.entries(pairings)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topPairing && topPairing[1] > 2) {
        const [shape, blendType] = topPairing[0].split('|');
        insights.push({
          category: "pipe_pairing",
          topic: `${shape} with ${blendType}`,
          insight: `${shape} pipes paired with ${blendType} blends ${topPairing[1]} times, suggesting strong compatibility`,
          confidence: "medium",
          source_type: "pattern_observed",
          tags: [shape, blendType, "pairing", "compatibility"]
        });
      }
    }

    // Analyze maintenance patterns
    const maintenancePipes = newPipes.filter(p => 
      p.condition === "Estate - Unrestored" || p.notes?.toLowerCase().includes("restor")
    );
    
    if (maintenancePipes.length > 3) {
      insights.push({
        category: "maintenance_tip",
        topic: "Estate pipe restoration",
        insight: `${maintenancePipes.length} estate pipes acquired in 24h, reflecting active restoration community`,
        confidence: "low",
        source_type: "pattern_observed",
        tags: ["estate", "restoration", "maintenance"]
      });
    }

    // Check for existing knowledge and update or create
    const existingKnowledgeResult = await base44.asServiceRole.entities.TobacconistKnowledge.list();
    const existingKnowledge = Array.isArray(existingKnowledgeResult) ? existingKnowledgeResult : [];
    const created = [];
    const updated = [];

    for (const insight of insights) {
      // Find existing similar knowledge
      const existing = existingKnowledge.find(k => 
        k.category === insight.category && 
        k.topic === insight.topic
      );

      if (existing) {
        // Update validation count
        await base44.asServiceRole.entities.TobacconistKnowledge.update(existing.id, {
          times_validated: (existing.times_validated || 1) + 1,
          last_validated: new Date().toISOString(),
          confidence: (existing.times_validated || 1) > 5 ? "high" : "medium"
        });
        updated.push(insight.topic);
      } else {
        // Create new knowledge
        await base44.asServiceRole.entities.TobacconistKnowledge.create({
          ...insight,
          times_validated: 1,
          last_validated: new Date().toISOString()
        });
        created.push(insight.topic);
      }
    }

    return Response.json({
      success: true,
      period: { from: yesterday.toISOString(), to: today.toISOString() },
      analyzed: {
        pipes: newPipes.length,
        blends: newBlends.length,
        logs: newLogs.length
      },
      insights: {
        created: created.length,
        updated: updated.length,
        topics: [...created, ...updated]
      }
    });

  } catch (error) {
    console.error("Knowledge update failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});