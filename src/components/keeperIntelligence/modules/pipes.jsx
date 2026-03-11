/**
 * Keeper Intelligence: Pipes Module
 * Analyzes pipe collection for rotation, usage, and health insights
 */

export const PipesModule = {
  analyzeCollection(data) {
    const { pipes = [], logs = [] } = data;

    // Analyze pipe usage
    const pipeUsage = {};
    const logsByPipe = {};
    
    logs.forEach(log => {
      if (log?.pipe_id) {
        pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + (log.bowls_used || 1);
        if (!logsByPipe[log.pipe_id]) logsByPipe[log.pipe_id] = [];
        logsByPipe[log.pipe_id].push(log);
      }
    });

    // Categorize pipes
    const underusedPipes = pipes.filter(p => !pipeUsage[p.id] || pipeUsage[p.id] < 3);
    const mostUsedPipe = pipes.length > 0
      ? pipes.reduce((max, p) => (pipeUsage[p.id] || 0) > (pipeUsage[max.id] || 0) ? p : max)
      : null;

    // Session frequency
    const recentLogs = logs.filter(log => {
      try {
        const logDate = new Date(log.date);
        const daysSinceLog = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLog <= 30;
      } catch {
        return false;
      }
    });

    return {
      pipeCount: pipes.length,
      totalLogs: logs.length,
      recentLogCount: recentLogs.length,
      underusedPipes,
      mostUsedPipe,
      pipeUsage,
      logsByPipe
    };
  },

  generateInsights(analysis) {
    const insights = [];
    const { pipeCount, underusedPipes, mostUsedPipe, recentLogCount } = analysis;

    // Insight 1: Rotation Planning
    if (pipeCount >= 5 && underusedPipes.length >= 3) {
      insights.push({
        title: "keeper.pipes.rotationTitle",
        insight: "keeper.pipes.rotationInsight",
        action: "keeper.pipes.rotationAction",
        cta: "keeper.pipes.rotationCTA",
        ctaLink: "Insights?tab=rotation",
        icon: "Target",
        priority: "medium",
        vars: { count: pipeCount }
      });
    }

    // Insight 2: Overused Pipe
    if (mostUsedPipe && analysis.pipeUsage[mostUsedPipe.id] > 10) {
      insights.push({
        title: "keeper.pipes.restTitle",
        insight: "keeper.pipes.restInsight",
        action: "keeper.pipes.restAction",
        cta: "keeper.pipes.restCTA",
        ctaLink: "PipeDetail?id=" + mostUsedPipe.id,
        icon: "Clock",
        priority: "high",
        vars: { pipeName: mostUsedPipe.name }
      });
    }

    // Insight 3: Early Growth
    if (pipeCount > 0 && pipeCount < 5 && !insights.some(i => i.title.includes("rotation"))) {
      insights.push({
        title: "keeper.pipes.growthTitle",
        insight: "keeper.pipes.growthInsight",
        action: "keeper.pipes.growthAction",
        cta: "keeper.pipes.growthCTA",
        ctaLink: "Insights?tab=rotation",
        icon: "TrendingUp",
        priority: "low",
        vars: { count: pipeCount }
      });
    }

    // Insight 4: Logging Frequency
    if (pipeCount >= 3 && recentLogCount < 5) {
      insights.push({
        title: "keeper.pipes.loggingTitle",
        insight: "keeper.pipes.loggingInsight",
        action: "keeper.pipes.loggingAction",
        cta: "keeper.pipes.loggingCTA",
        ctaLink: "Home?modal=logSession",
        icon: "BookOpen",
        priority: "low"
      });
    }

    return insights;
  }
};