/**
 * Keeper Intelligence: Pipes Module
 * Advanced rotation and stewardship analysis
 */

export const PipesModule = {
  analyzeCollection(data) {
    const { pipes = [], logs = [] } = data;

    // Analyze pipe usage patterns
    const pipeUsage = {};
    const logsByPipe = {};
    const lastUsedDate = {};
    
    logs.forEach(log => {
      if (log?.pipe_id) {
        pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + (log.bowls_used || 1);
        if (!logsByPipe[log.pipe_id]) logsByPipe[log.pipe_id] = [];
        logsByPipe[log.pipe_id].push(log);
        
        try {
          const logDate = new Date(log.date).getTime();
          if (!lastUsedDate[log.pipe_id] || logDate > lastUsedDate[log.pipe_id]) {
            lastUsedDate[log.pipe_id] = logDate;
          }
        } catch {
          // ignore
        }
      }
    });

    // Categorize pipes by usage
    const underusedPipes = pipes.filter(p => !pipeUsage[p.id] || pipeUsage[p.id] < 3);
    const regularPipes = pipes.filter(p => {
      const usage = pipeUsage[p.id] || 0;
      return usage >= 3 && usage <= 10;
    });
    const mostUsedPipe = pipes.length > 0
      ? pipes.reduce((max, p) => (pipeUsage[p.id] || 0) > (pipeUsage[max.id] || 0) ? p : max)
      : null;

    // Calculate rotation balance
    const totalUsage = Object.values(pipeUsage).reduce((a, b) => a + b, 0);
    const avgUsage = totalUsage / (pipes.length || 1);
    const isBalanced = pipes.length > 0 && regularPipes.length >= pipes.length * 0.6;

    // Analyze pipe shapes
    const shapeCount = new Set(pipes.map(p => p.shape).filter(Boolean)).size;

    return {
      pipeCount: pipes.length,
      totalLogs: logs.length,
      underusedPipes,
      regularPipes,
      mostUsedPipe,
      pipeUsage,
      isBalanced,
      avgUsage,
      shapeCount,
      pipes
    };
  },

  generateInsights(analysis) {
    const insights = [];
    const { pipeCount, underusedPipes, regularPipes, mostUsedPipe, isBalanced, shapeCount, pipeUsage } = analysis;

    // ROTATION: Balanced Rotation
    if (pipeCount >= 5 && isBalanced) {
      insights.push({
        title: "keeper.pipes.balancedRotationTitle",
        insight: "keeper.pipes.balancedRotationInsight",
        action: "keeper.pipes.balancedRotationAction",
        icon: "Target",
        category: "Rotation",
        priority: "low"
      });
    }

    // ROTATION: Overused Pipe
    if (mostUsedPipe && pipeUsage[mostUsedPipe.id] > 10) {
      insights.push({
        title: "keeper.pipes.overusedTitle",
        insight: "keeper.pipes.overusedInsight",
        action: "keeper.pipes.overusedAction",
        cta: "keeper.pipes.overusedCTA",
        ctaLink: "PipeDetail?id=" + mostUsedPipe.id,
        icon: "Clock",
        category: "Rotation",
        priority: "high",
        vars: { pipeName: mostUsedPipe.name }
      });
    }

    // ROTATION: Collection Foundation
    if (pipeCount > 0 && pipeCount < 5 && !insights.some(i => i.category === "Rotation")) {
      insights.push({
        title: "keeper.pipes.foundationTitle",
        insight: "keeper.pipes.foundationInsight",
        action: "keeper.pipes.foundationAction",
        cta: "keeper.pipes.foundationCTA",
        ctaLink: "Pipes",
        icon: "TrendingUp",
        category: "Rotation",
        priority: "low",
        vars: { count: pipeCount }
      });
    }

    // DISCOVERY: Pipe Shape Variety
    if (pipeCount >= 5 && shapeCount <= 2) {
      insights.push({
        title: "keeper.pipes.shapeVarietyTitle",
        insight: "keeper.pipes.shapeVarietyInsight",
        action: "keeper.pipes.shapeVarietyAction",
        icon: "Leaf",
        category: "Discovery",
        priority: "medium"
      });
    }

    // STEWARDSHIP: Proper Resting
    if (pipeCount >= 3 && mostUsedPipe && pipeUsage[mostUsedPipe.id] > 8) {
      insights.push({
        title: "keeper.pipes.restingTitle",
        insight: "keeper.pipes.restingInsight",
        action: "keeper.pipes.restingAction",
        icon: "Clock",
        category: "Stewardship",
        priority: "medium"
      });
    }

    return insights;
  }
};