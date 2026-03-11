/**
 * Keeper Intelligence Engine
 * Core system for multi-module collection analysis
 * Supports: Pipes, Tobacco, Whiskey, Cigars, Coffee
 */

export class KeeperIntelligenceEngine {
  constructor() {
    this.modules = {};
    this.activeModules = new Set();
  }

  /**
   * Register a module
   * @param {string} moduleName - e.g., "pipes", "tobacco"
   * @param {object} moduleInstance - { analyzeCollection(), generateInsights() }
   */
  registerModule(moduleName, moduleInstance) {
    if (!moduleInstance.analyzeCollection || !moduleInstance.generateInsights) {
      throw new Error(`Module ${moduleName} must implement analyzeCollection() and generateInsights()`);
    }
    this.modules[moduleName] = moduleInstance;
  }

  /**
   * Activate module for analysis
   */
  activateModule(moduleName) {
    if (!this.modules[moduleName]) {
      console.warn(`Module ${moduleName} not registered`);
      return;
    }
    this.activeModules.add(moduleName);
  }

  /**
   * Deactivate module
   */
  deactivateModule(moduleName) {
    this.activeModules.delete(moduleName);
  }

  /**
   * Get active modules
   */
  getActiveModules() {
    return Array.from(this.activeModules);
  }

  /**
   * Analyze all active modules and generate insights
   * @returns {array} Sorted array of insights by priority
   */
  async analyzeCollections(data) {
    const insights = [];

    for (const moduleName of this.activeModules) {
      const module = this.modules[moduleName];
      if (!module) continue;

      try {
        // Analyze collection
        const analysis = module.analyzeCollection(data);
        
        // Generate insights
        const moduleInsights = module.generateInsights(analysis);
        
        // Add module tag to each insight
        moduleInsights.forEach(insight => {
          insights.push({
            module: moduleName,
            ...insight
          });
        });
      } catch (error) {
        console.error(`Error analyzing ${moduleName}:`, error);
      }
    }

    // Sort by priority: high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 3;
      const bPriority = priorityOrder[b.priority] ?? 3;
      return aPriority - bPriority;
    });

    return insights;
  }
}

// Singleton instance
let instance = null;

export function getKeeperIntelligence() {
  if (!instance) {
    instance = new KeeperIntelligenceEngine();
  }
  return instance;
}