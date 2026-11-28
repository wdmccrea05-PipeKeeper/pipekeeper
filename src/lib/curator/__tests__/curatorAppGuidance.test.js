import { describe, expect, it } from 'vitest';
import { appGuidance, restoreAppGuidance } from '@/lib/curator/curatorAppGuidance';

describe('Curator app guidance', () => {
  it('routes troubleshooting questions to the current troubleshooting guide', () => {
    const answer = appGuidance("Why isn't my label photo showing in inventory?");

    expect(answer.recordLinks).toEqual([
      { to: '/TroubleshootingFull', label: 'Open troubleshooting' },
    ]);
    expect(answer.content).toContain('cannot inspect account-specific diagnostics');
  });

  it('routes FAQs and general how-to questions to their verified help pages', () => {
    expect(appGuidance('Where can I find the FAQ?').recordLinks[0].to).toBe('/FAQFull');
    expect(appGuidance('How do I change dashboard settings?').recordLinks[0].to).toBe('/HowTo');
  });

  it('preserves direct help actions when restoring the conversation', () => {
    const restored = restoreAppGuidance([
      { role: 'user', content: 'Why is my photo not showing?' },
      { role: 'assistant', content: 'I can help narrow down the cause. Open the troubleshooting guide for verified checks and recovery steps; I cannot inspect account-specific diagnostics from this answer alone.' },
    ]);

    expect(restored[1].recordLinks[0].to).toBe('/TroubleshootingFull');
  });

  it('does not divert report requests or unclear multi-record import requests', () => {
    expect(appGuidance('How do I compare reports?')).toBeNull();
    expect(appGuidance('How do I import pipes and cigars?')).toBeNull();
    expect(appGuidance('Where are my pipes stored?')).toBeNull();
    expect(appGuidance('What is a Nording pipe?')).toBeNull();
  });
});
