import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const endpoint = readFileSync('base44/functions/expireReferralEarnedAccess/entry.ts','utf8');
const workflow = readFileSync('.github/workflows/expire-referral-access.yml','utf8');
describe('referral expiry cron authorization', () => {
 it('rejects anonymous callers instead of treating them as automation', () => {
  expect(endpoint).toContain("if (!user) return Response.json({ error: 'Authentication required' }");
  expect(endpoint).not.toContain('assume automation invocation');
 });
 it('requires a configured token in both deployment and scheduler', () => {
  expect(endpoint).toContain("Deno.env.get('REFERRAL_EXPIRY_CRON_TOKEN')");
  expect(endpoint).toContain('!expectedToken || suppliedToken !== expectedToken');
  expect(workflow).toContain('secrets.REFERRAL_EXPIRY_CRON_TOKEN');
  expect(workflow).toContain('x-referral-expiry-token:');
 });
});
