import { describe, expect, it } from 'vitest';
import { translate } from '@/components/i18n/index.jsx';

describe('i18n merge order', () => {
  it('lets locale overlays override critical English fallback values', () => {
    expect(translate('nav.quickAccess', {}, 'en')).toBe('Quick Access');
    expect(translate('nav.quickAccess', {}, 'es')).toBe('Acceso rápido');
    expect(translate('nav.quickAccess', {}, 'es')).not.toBe(translate('nav.quickAccess', {}, 'en'));
  });
});
