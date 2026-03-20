/**
 * Upgrade Trigger Engine
 * Coordinates when/where to show upgrade prompts
 * Prevents trigger spam via cooldowns + dismissal tracking
 */

const TRIGGER_KEY = 'ck_upgrade_triggers';
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const DISMISSAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_MAX = 2;
const SESSION_RESET_MS = 30 * 60 * 1000; // 30 minutes

export class UpgradeTriggerEngine {
  static getState() {
    try {
      const stored = localStorage.getItem(TRIGGER_KEY);
      if (!stored) {
        return this.newState();
      }
      return JSON.parse(stored);
    } catch {
      return this.newState();
    }
  }

  static newState() {
    return {
      sessionStart: Date.now(),
      sessionCount: 0,
      lastTriggerTime: null,
      dismissedTriggers: {}, // { triggerId: timestamp }
    };
  }

  static saveState(state) {
    try {
      localStorage.setItem(TRIGGER_KEY, JSON.stringify(state));
    } catch {
      // quota exceeded, ignore
    }
  }

  static resetIfSessionExpired(state) {
    const elapsed = Date.now() - state.sessionStart;
    if (elapsed > SESSION_RESET_MS) {
      return this.newState();
    }
    return state;
  }

  static canShowTrigger(triggerId, priority = 'low') {
    const state = this.resetIfSessionExpired(this.getState());

    // Check dismissal
    const dismissed = state.dismissedTriggers[triggerId];
    if (dismissed && Date.now() - dismissed < DISMISSAL_COOLDOWN_MS) {
      console.log(`[Trigger] ${triggerId} dismissed, cooling down`, {
        elapsed: Date.now() - dismissed,
        cooldown: DISMISSAL_COOLDOWN_MS,
      });
      return false;
    }

    // Check session max
    if (state.sessionCount >= SESSION_MAX) {
      console.log(`[Trigger] Session max (${SESSION_MAX}) reached`);
      return false;
    }

    // Check global cooldown (2min between triggers)
    if (state.lastTriggerTime && Date.now() - state.lastTriggerTime < COOLDOWN_MS) {
      console.log(`[Trigger] Global cooldown active`, {
        elapsed: Date.now() - state.lastTriggerTime,
        cooldown: COOLDOWN_MS,
      });
      return false;
    }

    // Locked triggers bypass cooldown
    if (priority === 'locked') {
      return true;
    }

    return true;
  }

  static recordTriggerShown(triggerId) {
    const state = this.resetIfSessionExpired(this.getState());
    state.sessionCount += 1;
    state.lastTriggerTime = Date.now();
    this.saveState(state);

    console.log(`[Trigger] Recorded: ${triggerId}`, {
      sessionCount: state.sessionCount,
    });
  }

  static recordTriggerDismissed(triggerId) {
    const state = this.getState();
    state.dismissedTriggers[triggerId] = Date.now();
    this.saveState(state);

    console.log(`[Trigger] Dismissed: ${triggerId}`);
  }

  static resetTriggerState() {
    localStorage.removeItem(TRIGGER_KEY);
  }
}

/**
 * Trigger priority system
 * Higher priority = shown first if multiple available
 */
export const TRIGGER_PRIORITY = {
  LOCKED_MODULE: 1,
  LOCKED_FEATURE: 2,
  EXPANSION: 3,
  POST_ACTION: 4,
  EMPTY_STATE: 5,
  PASSIVE: 6,
};

/**
 * Trigger definitions with metadata
 */
export const TRIGGERS = {
  DASHBOARD_EMPTY: {
    id: 'dashboard_empty',
    priority: TRIGGER_PRIORITY.EMPTY_STATE,
    cooldown: DISMISSAL_COOLDOWN_MS,
    condition: (context) => context.itemCount === 0,
  },
  MODULE_DASHBOARD: {
    id: 'module_dashboard',
    priority: TRIGGER_PRIORITY.PASSIVE,
    cooldown: SESSION_RESET_MS,
    condition: (context) => context.activeModules?.length === 1,
    delay: 3000,
  },
  INSIGHTS_UPGRADE: {
    id: 'insights_upgrade',
    priority: TRIGGER_PRIORITY.PASSIVE,
    cooldown: DISMISSAL_COOLDOWN_MS,
    condition: (context) => context.activeModules?.length === 1,
    delay: 2000,
  },
  POST_ACTION: {
    id: 'post_action',
    priority: TRIGGER_PRIORITY.POST_ACTION,
    cooldown: DISMISSAL_COOLDOWN_MS,
    condition: (context) =>
      context.itemCount >= 5 || context.sessionItemCount >= 3,
  },
  RETURN_VISIT: {
    id: 'return_visit',
    priority: TRIGGER_PRIORITY.PASSIVE,
    cooldown: 48 * 60 * 60 * 1000, // 48 hours
    condition: (context) => context.lastVisitMs > 24 * 60 * 60 * 1000,
    delay: 5000,
  },
  LOCKED_MODULE: {
    id: 'locked_module',
    priority: TRIGGER_PRIORITY.LOCKED_MODULE,
    cooldown: 0, // No cooldown for locked
    condition: () => true, // Always show immediately
  },
  LOCKED_FEATURE: {
    id: 'locked_feature',
    priority: TRIGGER_PRIORITY.LOCKED_FEATURE,
    cooldown: 0,
    condition: () => true,
  },
};

/**
 * Evaluate which trigger to show
 * Returns highest priority trigger that passes conditions
 */
export function evaluateTriggers(context) {
  const applicable = Object.values(TRIGGERS)
    .filter((t) => t.condition(context))
    .filter((t) => UpgradeTriggerEngine.canShowTrigger(t.id, 'locked'))
    .sort((a, b) => a.priority - b.priority);

  return applicable[0] || null;
}