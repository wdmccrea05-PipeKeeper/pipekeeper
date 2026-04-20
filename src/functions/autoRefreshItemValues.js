/**
 * autoRefreshItemValues
 *
 * Scheduled cloud function for automatic value refresh.
 *
 * This function is designed to be invoked by:
 *   1. A time-based schedule (cron / Base44 scheduled trigger) — weekly or monthly
 *   2. A manual "Run Refresh Now" admin or debug call
 *
 * For each eligible user/module pair, it:
 *   - Checks ValuationSettings to see if a refresh is due
 *   - Iterates over all items in the module
 *   - Skips items that already have a snapshot for today
 *   - Computes current value via buildValuationSnapshot
 *   - Writes a new BottleValueSnapshot (whiskeykeeper) and ItemValueSnapshot
 *   - Updates last_auto_refresh_at on ValuationSettings
 *
 * Architecture notes — reusability:
 *   The core refresh logic lives in valueRefreshService.js (frontend-importable).
 *   This file is a thin cloud-function wrapper that:
 *     - Authenticates via Base44 SDK
 *     - Accepts an optional module_key filter
 *     - Iterates over all users if no specific user_email is provided
 *     - Delegates all logic to runScheduledRefreshForUser()
 *
 * To add PipeKeeper support later:
 *   Just add 'pipekeeper' to the SUPPORTED_MODULES list below and ensure
 *   base44.entities.Pipe and base44.entities.TobaccoBlend are available.
 *   No other changes needed.
 *
 * Cron schedule recommendation:
 *   Run once per day; the service layer decides whether a refresh is due based
 *   on the user's chosen cadence (weekly or monthly).
 *   Suggested cron: 0 6 * * *  (06:00 UTC daily)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { runScheduledRefreshForUser } from '../components/valuation/valueRefreshService.js';

/** Modules supported by the scheduler. Extend to add PipeKeeper, etc. */
const SUPPORTED_MODULES = ['whiskeykeeper', 'pipekeeper', 'cigarkeeper'];

/**
 * Entry point for the scheduled refresh cloud function.
 *
 * Request body (all fields optional):
 * {
 *   user_email?: string,      // limit to a specific user (admin use / testing)
 *   module_key?: string,      // limit to a specific module
 *   dry_run?: boolean,        // if true, compute but do not write
 * }
 *
 * Returns:
 * {
 *   ok: true,
 *   summary: { refreshed, skipped, errors },
 *   details: Array<{ user_email, module_key, refreshed, skipped, errors }>
 * }
 */
export async function autoRefreshItemValues(req, data = {}) {
  const base44 = createClientFromRequest(req);
  const callerUser = await base44.auth.me().catch(() => null);

  // Callers must be authenticated. For cron triggers Base44 provides a
  // service-account token; for manual admin calls the logged-in user is used.
  if (!callerUser) {
    return { error: 'Unauthorized' };
  }

  const {
    user_email: targetUserEmail = null,
    module_key: targetModuleKey = null,
    dry_run: dryRun = false,
  } = data;

  const modulesToProcess = targetModuleKey
    ? SUPPORTED_MODULES.filter((m) => m === targetModuleKey)
    : SUPPORTED_MODULES;

  const summary = { refreshed: 0, skipped: 0, errors: 0 };
  const details = [];

  // Build list of users to process
  let usersToProcess = [];
  if (targetUserEmail) {
    usersToProcess = [targetUserEmail];
  } else {
    // Collect all users who have ValuationSettings with auto_value_refresh_enabled = true
    try {
      const settings = await base44.entities.ValuationSettings.filter(
        { auto_value_refresh_enabled: true },
        null,
        1000
      );
      const emails = [...new Set((settings || []).map((s) => s.created_by).filter(Boolean))];
      usersToProcess = emails;
    } catch {
      // If ValuationSettings doesn't exist yet, fall back to running for the caller only
      usersToProcess = [callerUser.email];
    }
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      users_to_process: usersToProcess.length,
      modules_to_process: modulesToProcess,
    };
  }

  for (const userEmail of usersToProcess) {
    for (const moduleKey of modulesToProcess) {
      try {
        const result = await runScheduledRefreshForUser(userEmail, moduleKey, base44);
        summary.refreshed += result.refreshed;
        summary.skipped += result.skipped;
        summary.errors += result.errors;
        details.push({ user_email: userEmail, module_key: moduleKey, ...result });
      } catch (e) {
        console.error('[autoRefreshItemValues] error for', userEmail, moduleKey, e);
        summary.errors++;
        details.push({ user_email: userEmail, module_key: moduleKey, refreshed: 0, skipped: 0, errors: 1 });
      }
    }
  }

  return { ok: true, summary, details };
}
