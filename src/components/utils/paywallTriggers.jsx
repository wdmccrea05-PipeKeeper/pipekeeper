// Smart paywall trigger system based on value moments
// Shows paywall only after user has experienced value

const PAYWALL_STATE_KEY = 'pk_paywall_state';
const REMINDER_SHOWN_KEY = 'pk_day5_reminder_shown';

function getState() {
  try {
    const raw = localStorage.getItem(PAYWALL_STATE_KEY);
    if (!raw) return { shownCount: 0, lastShown: null, triggers: [] };
    return JSON.parse(raw);
  } catch {
    return { shownCount: 0, lastShown: null, triggers: [] };
  }
}

function setState(state) {
  try {
    localStorage.setItem(PAYWALL_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export function getTrialDayNumber(user) {
  if (!user?.created_at && !user?.createdAt) return 0;
  
  const createdAt = new Date(user.created_at || user.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  return Math.min(diffDays + 1, 7); // Days 1-7
}

export function shouldShowPaywall(user, triggerEvent) {
  const state = getState();
  const dayNumber = getTrialDayNumber(user);
  
  // Never show on Day 1
  if (dayNumber === 1) return false;
  
  // Don't spam - max once per session
  if (state.shownCount > 0 && state.lastShown) {
    const lastShownDate = new Date(state.lastShown).toDateString();
    const today = new Date().toDateString();
    if (lastShownDate === today) return false;
  }
  
  // After Day 3: Show on value triggers
  if (dayNumber >= 3 && dayNumber <= 6) {
    const validTriggers = [
      'insights_opened',
      'export_clicked',
      'ai_tool_opened',
      'collection_size_5'
    ];
    return validTriggers.includes(triggerEvent);
  }
  
  // Day 7: Always show (gentle reminder)
  if (dayNumber >= 7) {
    return true;
  }
  
  return false;
}

export function markPaywallShown(triggerEvent) {
  const state = getState();
  state.shownCount += 1;
  state.lastShown = new Date().toISOString();
  state.triggers.push({ event: triggerEvent, date: new Date().toISOString() });
  setState(state);
}

export function shouldShowDay5Reminder(user) {
  const dayNumber = getTrialDayNumber(user);
  
  // Show reminder on days 5-6
  if (dayNumber < 5 || dayNumber > 6) return false;
  
  // Only show once
  try {
    const shown = localStorage.getItem(REMINDER_SHOWN_KEY);
    return !shown;
  } catch {
    return false;
  }
}

export function markReminderShown() {
  try {
    localStorage.setItem(REMINDER_SHOWN_KEY, 'true');
  } catch {}
}

export function checkCollectionSizeTrigger(itemCount) {
  // Trigger when user adds their 5th item
  return itemCount === 5;
}