/* eslint-disable */
/**
 * Collector appreciation campaign — redemption deadline.
 *
 * Covers the deadline instant, time-zone consistency, boundary behaviour,
 * duplicate protection, continued access after the campaign closes, and the
 * backend wiring that enforces the deadline (not just the UI).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  APPRECIATION_REDEMPTION_DEADLINE_ISO,
  APPRECIATION_DEADLINE_TIME_ZONE,
  APPRECIATION_CAMPAIGN_ID,
  resolveRedemptionWindow,
  formatRedemptionDeadline,
  resolveAppreciationGrant,
} from '../components/utils/appreciationGrant';
import { resolveModuleAccess } from '../components/utils/resolveModuleAccess';

const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 24 * HOUR;
const DEADLINE_MS = Date.parse('2026-12-01T04:59:00.000Z'); // Nov 30, 2026 11:59 p.m. EST

// A collector who redeemed before the deadline.
const ACTIVATED_AT = '2026-11-30T03:00:00.000Z';
const PRE_DEADLINE_COLLECTOR = {
  id: 'u-deadline',
  email: 'collector@example.com',
  role: 'user',
  created_date: '2026-01-01T00:00:00.000Z',
  appreciation_campaign_id: APPRECIATION_CAMPAIGN_ID,
  appreciation_grant_activated_at: ACTIVATED_AT,
  appreciation_grant_expires_at: new Date(Date.parse(ACTIVATED_AT) + 168 * HOUR).toISOString(),
  appreciation_grant_status: 'active',
};

describe('redemption deadline instant', () => {
  it('is Monday, November 30, 2026 at 11:59 p.m. Eastern', () => {
    expect(APPRECIATION_REDEMPTION_DEADLINE_ISO).toBe('2026-12-01T04:59:00.000Z');
    expect(APPRECIATION_DEADLINE_TIME_ZONE).toBe('America/New_York');

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: APPRECIATION_DEADLINE_TIME_ZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'long',
    }).formatToParts(new Date(APPRECIATION_REDEMPTION_DEADLINE_ISO));
    const get = (type) => parts.find((p) => p.type === type)?.value;

    expect(get('weekday')).toBe('Monday');
    expect(get('year')).toBe('2026');
    expect(get('month')).toBe('11');
    expect(get('day')).toBe('30');
    expect(get('hour')).toBe('23');
    expect(get('minute')).toBe('59');
  });

  it('matches the server constant exactly', () => {
    const server = read('base44/shared/appreciationCampaign.ts');
    const match = server.match(/CAMPAIGN_REDEMPTION_DEADLINE_ISO\s*=\s*"([^"]+)"/);
    expect(match?.[1]).toBe(APPRECIATION_REDEMPTION_DEADLINE_ISO);
  });
});

describe('deadline is enforced at the boundary', () => {
  it('is open one minute before the deadline', () => {
    const window = resolveRedemptionWindow(DEADLINE_MS - MINUTE);
    expect(window.open).toBe(true);
    expect(window.closed).toBe(false);
    expect(window.msRemaining).toBe(MINUTE);
  });

  it('is still open at the final millisecond of the deadline', () => {
    expect(resolveRedemptionWindow(DEADLINE_MS).closed).toBe(false);
    expect(resolveRedemptionWindow(DEADLINE_MS).open).toBe(true);
  });

  it('is closed one millisecond after the deadline', () => {
    const window = resolveRedemptionWindow(DEADLINE_MS + 1);
    expect(window.closed).toBe(true);
    expect(window.open).toBe(false);
    expect(window.msRemaining).toBe(0);
  });

  it('stays closed a week later', () => {
    expect(resolveRedemptionWindow(DEADLINE_MS + 7 * DAY).closed).toBe(true);
  });
});

describe('deadline is rendered in the collector language but always in Eastern Time', () => {
  const LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

  it('shows November 30 and 11:59 p.m. Eastern for every supported language', () => {
    for (const lang of LANGS) {
      const label = formatRedemptionDeadline(lang);
      expect(label).toContain('30');
      // English uses a 12-hour clock, the others 24-hour; the instant is the same.
      expect(label.includes('11:59') || label.includes('23:59')).toBe(true);
      expect(label.length).toBeGreaterThan(10);
    }
  });

  it('does not depend on the viewer time zone', () => {
    // Formatting pins America/New_York, so a viewer in any zone reads the same instant.
    const label = formatRedemptionDeadline('en');
    expect(label).toContain('Monday');
    expect(label).toContain('November');
    expect(label).toContain('EST');
  });
});

describe('access continues after the campaign closes', () => {
  it('a pre-deadline grant runs its full 168 hours past the deadline', () => {
    const state = resolveAppreciationGrant(PRE_DEADLINE_COLLECTOR, DEADLINE_MS + 2 * DAY);
    expect(state.active).toBe(true);
    expect(state.endsAt).toBe(new Date(Date.parse(ACTIVATED_AT) + 168 * HOUR).toISOString());
    // The window closes on December 7, well after the campaign's November 30 deadline.
    expect(new Date(state.endsAt).getTime()).toBeGreaterThan(DEADLINE_MS);
  });

  it('the campaign being closed does not shorten an active grant', () => {
    const justAfterDeadline = DEADLINE_MS + 60 * MINUTE;
    expect(resolveRedemptionWindow(justAfterDeadline).closed).toBe(true);
    expect(resolveAppreciationGrant(PRE_DEADLINE_COLLECTOR, justAfterDeadline).active).toBe(true);
  });

  it('Pro modules stay unlocked after the deadline', () => {
    const decision = resolveModuleAccess(PRE_DEADLINE_COLLECTOR, 'pipekeeper', null);
    expect(decision.has_access).toBe(true);
    expect(decision.source_type).toBe('promotional_grant');
  });

  it('the grant still expires on schedule once its 168 hours run out', () => {
    const after = Date.parse(ACTIVATED_AT) + 168 * HOUR + 1000;
    expect(resolveAppreciationGrant(PRE_DEADLINE_COLLECTOR, after).active).toBe(false);
  });
});

describe('duplicate redemption protection is unchanged by the deadline', () => {
  it('resolves the same single window on every read', () => {
    const a = resolveAppreciationGrant(PRE_DEADLINE_COLLECTOR, DEADLINE_MS + HOUR);
    const b = resolveAppreciationGrant(PRE_DEADLINE_COLLECTOR, DEADLINE_MS + 2 * HOUR);
    expect(b.startedAt).toBe(a.startedAt);
    expect(b.endsAt).toBe(a.endsAt);
  });

  it('never restarts a window from a later read', () => {
    const state = resolveAppreciationGrant(PRE_DEADLINE_COLLECTOR, DEADLINE_MS + 3 * DAY);
    expect(state.startedAt).toBe(ACTIVATED_AT);
  });
});

describe('backend enforcement wiring', () => {
  it('the shared campaign module owns the deadline and defaults to it', () => {
    const src = read('base44/shared/appreciationCampaign.ts');
    expect(src).toContain('export const CAMPAIGN_REDEMPTION_DEADLINE_ISO');
    expect(src).toContain('export function resolveRedemptionWindow');
    // The default config carries the deadline even when no record exists.
    expect(src).toMatch(/redemption_deadline:\s*CAMPAIGN_REDEMPTION_DEADLINE_ISO/);
    // A stored config without a deadline still falls back to it.
    expect(src).toMatch(/record\.redemption_deadline \|\| base\.redemption_deadline/);
  });

  it('eligibility rejects redemption after the deadline', () => {
    const src = read('base44/shared/appreciationCampaign.ts');
    expect(src).toContain('resolveRedemptionWindow(config, nowMs).closed');
    expect(src).toContain('"redemption_deadline_passed"');
  });

  it('the activation endpoint refuses with 410 and keeps existing grants idempotent', () => {
    const src = read('base44/functions/activateAppreciationCampaign/entry.ts');
    expect(src).toContain('resolveRedemptionWindow(config)');
    expect(src).toContain('status: 410');
    expect(src).toContain('"redemption_deadline_passed"');
    // An already-active grant resolves before the deadline gate is evaluated.
    const alreadyActive = src.indexOf('already_active');
    const deadlineGate = src.indexOf('resolveRedemptionWindow(config)');
    expect(alreadyActive).toBeGreaterThan(-1);
    expect(alreadyActive).toBeLessThan(deadlineGate);
  });

  it('the status endpoint reports the redemption window to the client', () => {
    const src = read('base44/functions/getAppreciationCampaign/entry.ts');
    expect(src).toContain('resolveRedemptionWindow');
    expect(src).toContain('redemption:');
  });

  it('the UI hides the banner and the activation button once closed', () => {
    const hook = read('src/components/campaign/useAppreciationCampaign.jsx');
    expect(hook).toContain('redemptionClosed');
    expect(hook).toContain('!redemptionClosed');
    expect(hook).toContain('deadlineLabel');
    // Activation is blocked client-side as well as server-side.
    expect(hook).toMatch(/if \(redemptionClosed\)/);
  });

  it('the banner and the offer card show the deadline copy', () => {
    expect(read('src/components/campaign/AppreciationBanner.jsx')).toContain("appreciation.deadlineHeadline");
    expect(read('src/components/campaign/AppreciationOfferCard.jsx')).toContain("appreciation.deadlineHeadline");
  });

  it('all ten languages carry the deadline copy', () => {
    const src = read('src/components/i18n/locales/appreciationOverrides.jsx');
    const headlineCount = (src.match(/deadlineHeadline:/g) || []).length;
    const lineCount = (src.match(/deadlineLine:/g) || []).length;
    const closedCount = (src.match(/deadlineClosed:/g) || []).length;
    expect(headlineCount).toBe(10);
    expect(lineCount).toBe(10);
    expect(closedCount).toBe(10);
  });
});