import { describe, expect, it, vi } from 'vitest';
import { translate } from '@/components/i18n/index.jsx';

describe('i18n missing key logger', () => {
  it('logs missing locale/global keys once at runtime', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const value1 = translate('nonexistent.missing.key', {}, 'ja');
    const value2 = translate('nonexistent.missing.key', {}, 'ja');

    expect(value1).toBe('nonexistent.missing.key');
    expect(value2).toBe('nonexistent.missing.key');
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('locale');
    expect(warnSpy.mock.calls[1][0]).toContain('global');

    warnSpy.mockRestore();
  });
});
