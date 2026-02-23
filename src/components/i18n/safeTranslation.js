// Safe translation utility
export function useTranslation() {
  return {
    t: (key) => key,
    i18n: { language: 'en' }
  };
}

export default { useTranslation };
