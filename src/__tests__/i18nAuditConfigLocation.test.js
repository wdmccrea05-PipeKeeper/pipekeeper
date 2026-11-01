import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
describe('i18n audit configuration is loaded from its real location', () => {
  it('uses the checked-in proper noun allowlist rather than silently falling back', () => {
    const script = readFileSync('scripts/i18n-check.js', 'utf8');
    const config = JSON.parse(readFileSync('docs/i18n/auditConfig.json', 'utf8'));
    expect(existsSync('docs/i18n/auditConfig.json')).toBe(true);
    expect(config.properNounAllowlist.length).toBeGreaterThan(10);
    expect(script).toContain("join(ROOT, 'docs/i18n/auditConfig.json')");
    expect(script).not.toContain("join(ROOT, 'src/components/i18n/auditConfig.json.jsx')");
  });
});
