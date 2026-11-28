import { describe, expect, it } from 'vitest';
import { ownedCuratorMessages } from '../../base44/shared/curatorMessageOwnership.ts';

describe('Curator message ownership', () => {
  it('keeps only the active owner and requested session even when IDs overlap', () => {
    const rows = [
      { id: 'a', user_email: 'a@example.com', session_id: 'same', message_index: 0 },
      { id: 'b', user_email: 'b@example.com', session_id: 'same', message_index: 0 },
      { id: 'other', user_email: 'a@example.com', session_id: 'other' },
    ];
    expect(ownedCuratorMessages(rows, 'a@example.com', 'same').map((row) => row.id)).toEqual(['a']);
    expect(ownedCuratorMessages(rows, 'empty@example.com')).toEqual([]);
    expect(ownedCuratorMessages(rows, 'b@example.com').map((row) => row.id)).toEqual(['b']);
  });

  it('surfaces invalid responses rather than reporting empty history', () => {
    expect(() => ownedCuratorMessages(null, 'a@example.com')).toThrow('invalid response');
  });
});
