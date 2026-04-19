import { describe, it, expect } from 'vitest';
import { buildCuratorChatSystemPrompt } from '@/components/curator/chatAdvicePrompting';

describe('buildCuratorChatSystemPrompt', () => {
  it('includes cigar-native guidance and cigar-capable record schema', () => {
    const prompt = buildCuratorChatSystemPrompt();

    expect(prompt).toContain('Treat cigar users as first-class');
    expect(prompt).toContain('recordType": "pipe | blend | bottle | cigar | wine"');
    expect(prompt).toContain('humidor_maintenance');
    expect(prompt).toContain('cigar_restock');
  });
});

