import { describe, expect, it } from 'vitest';
import { translate } from '@/components/i18n/index.jsx';

describe('i18n merge order', () => {
  it('lets locale overlays override critical English fallback values', () => {
    const enLoading = translate('common.loading', {}, 'en');
    const esLoading = translate('common.loading', {}, 'es');
    expect(enLoading).toBe('Loading...');
    expect(esLoading).toMatch(/Cargando/);
    expect(esLoading).not.toBe(enLoading);
  });
});
