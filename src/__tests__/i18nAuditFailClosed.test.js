import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
describe('i18n release gate baseline integrity', () => {
  it('fails loudly if the allowlist config disappears or becomes invalid', () => {
    const src = readFileSync('scripts/i18n-check.js', 'utf8');
    expect(src).toContain("JSON.parse(readFileSync(configPath, 'utf8'))");
    expect(src).toContain("throw new Error('Invalid i18n audit config");
    expect(src).not.toContain('return { properNounAllowlist: [], excludePatterns: [] }');
  });
});
