import { describe, expect, it } from 'vitest';
import { getPaidModuleIds, isModulePaid } from '../moduleAccess';

describe('moduleAccess 4-module parity', () => {
  const paidUser = {
    pipekeeper_paid: true,
    whiskeykeeper_paid: true,
    cigarkeeper_paid: true,
    winekeeper_paid: true,
  };

  it('recognizes all 4 canonical paid flags', () => {
    expect(isModulePaid('pipekeeper', paidUser)).toBe(true);
    expect(isModulePaid('whiskeykeeper', paidUser)).toBe(true);
    expect(isModulePaid('cigarkeeper', paidUser)).toBe(true);
    expect(isModulePaid('winekeeper', paidUser)).toBe(true);
  });

  it('returns all paid modules from canonical flags', () => {
    expect(getPaidModuleIds(paidUser).sort()).toEqual([
      'pipekeeper',
      'whiskeykeeper',
      'cigarkeeper',
      'winekeeper',
    ].sort());
  });
});
