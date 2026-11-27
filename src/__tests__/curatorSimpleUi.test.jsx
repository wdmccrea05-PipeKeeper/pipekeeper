import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { splitMessageBlocks } from '@/components/curator/CuratorMessageContent.jsx';
import { groupConversations } from '@/lib/curator/conversationHistory.js';

const CHAT = readFileSync('src/components/agent/ExpertTobacconistChat.jsx', 'utf8');
const PAGE = readFileSync('src/pages/Curator.jsx', 'utf8');

describe('curator simple conversation surface', () => {
  it('keeps the direct answer visible and pushes the rest behind disclosure', () => {
    const content = [
      'Your best pipe for this blend is the Savinelli Trevi.',
      '',
      '## Why',
      'The chamber matches the cut and your last four sessions agreed.',
      '',
      '## Supporting sessions',
      '- 12 Nov, 45 minutes',
      '- 04 Nov, 50 minutes',
    ].join('\n');

    const blocks = splitMessageBlocks(content);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0].lines[0]).toContain('Savinelli Trevi');
  });

  it('reads tables without sideways scrolling', () => {
    const content = ['| Item | Score |', '| --- | --- |', '| Trevi | 9 |', '| Bing | 7 |'].join('\n');
    const blocks = splitMessageBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    expect(blocks[0].headers).toEqual(['Item', 'Score']);
    expect(blocks[0].rows).toEqual([['Trevi', '9'], ['Bing', '7']]);
  });

  it('splits prose around a table into separate blocks', () => {
    const content = ['Short answer: the Bing.', '', '| Item | Score |', '| --- | --- |', '| Bing | 8 |', '', 'Next step: log it.'].join('\n');
    const blocks = splitMessageBlocks(content);

    expect(blocks.map((block) => block.type)).toEqual(['text', 'table', 'text']);
  });

  it('titles conversations by their opening question, newest first', () => {
    const grouped = groupConversations([
      { session_id: 'b', role: 'assistant', content: 'Answer', message_index: 1, timestamp: '2026-11-20T10:05:00Z' },
      { session_id: 'b', role: 'user', content: 'What should I smoke tonight?', message_index: 0, timestamp: '2026-11-20T10:00:00Z' },
      { session_id: 'a', role: 'user', content: 'Which pipe is redundant?', message_index: 0, timestamp: '2026-11-25T09:00:00Z' },
    ]);

    expect(grouped.map((session) => session.id)).toEqual(['a', 'b']);
    expect(grouped[0].title).toBe('Which pipe is redundant?');
    expect(grouped[1].title).toBe('What should I smoke tonight?');
  });

  it('opens on the conversation, not on a configuration screen', () => {
    expect(PAGE).toContain("return s && ALL_VALID_KEYS.has(s) ? s : 'chat';");
    expect(PAGE).toContain('curatorPage.moreTools');
    expect(PAGE).toContain('curatorPage.backToChat');
  });

  it('offers at most three suggested questions on an empty conversation', () => {
    expect(CHAT).toContain('starterPrompts.slice(0, 3)');
  });

  it('exposes new conversation, history, stop and retry controls', () => {
    expect(CHAT).toContain('startNewConversation');
    expect(CHAT).toContain('CuratorHistorySheet');
    expect(CHAT).toContain('stopSending');
    expect(CHAT).toContain('retryMessage');
    expect(CHAT).toContain('CuratorMessageContent');
  });

  it('keeps the input above the mobile keyboard and the thread scrolling on its own', () => {
    expect(CHAT).toContain('env(safe-area-inset-bottom)');
    expect(CHAT).toContain('overscrollBehavior');
    expect(CHAT).toContain("overflow-x-hidden");
  });
});