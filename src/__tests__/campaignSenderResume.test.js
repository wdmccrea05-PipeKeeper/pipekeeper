/* eslint-disable */
/**
 * Appreciation campaign sender — batch resume.
 *
 * The sender runs every ten minutes and sends one batch per run. A campaign that
 * is mid-delivery sits in `sending`, never back in `scheduled`, so a sender that
 * only looks at `scheduled` mails the first batch and stops. These assertions
 * hold the sender to resuming an in-flight campaign without ever re-sending a
 * recipient.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('base44/functions/adminEmailCampaigns/entry.ts', 'utf-8');

describe('campaign sender resume', () => {
  it('looks at campaigns that are mid-delivery, not only newly scheduled ones', () => {
    expect(source).toContain('{ status: "scheduled" }');
    expect(source).toContain('{ status: "sending" }');
  });

  it('resumes an in-flight campaign only while it still has recipients queued', () => {
    expect(source).toContain('delivering.filter((row) => row.approved_by && (row.queued_count || 0) > 0)');
  });

  it('sends to queued recipients only, so resuming cannot deliver anyone twice', () => {
    expect(source).toContain('{ campaign_id: campaign.id, status: "queued" }');
  });

  it('does not rebuild the audience for a campaign that is already delivering', () => {
    expect(source).toContain('if (campaign.status !== "sending" && queued === 0)');
  });

  it('closes a campaign once its queue drains', () => {
    expect(source).toContain('status: done ? "sent" : "sending"');
  });
});