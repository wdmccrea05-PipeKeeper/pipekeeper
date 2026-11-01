const DEFAULT_APP_ORIGIN = 'https://pipekeeper.app';

function normalizeOrigin(value: unknown): string | null {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getConfiguredAppOrigin(appUrl: unknown): string {
  return normalizeOrigin(appUrl) || DEFAULT_APP_ORIGIN;
}

function getAllowedOrigins(appUrl: unknown, additionalOrigins: unknown): Set<string> {
  const allowed = new Set([getConfiguredAppOrigin(appUrl)]);
  for (const origin of String(additionalOrigins || '').split(',')) {
    const normalized = normalizeOrigin(origin);
    if (normalized) allowed.add(normalized);
  }
  return allowed;
}

export function getSafeRedirectOrigin(
  requestOrigin: unknown,
  appUrl: unknown,
  additionalOrigins: unknown = '',
): string {
  const configuredOrigin = getConfiguredAppOrigin(appUrl);
  const candidate = normalizeOrigin(requestOrigin);
  return candidate && getAllowedOrigins(appUrl, additionalOrigins).has(candidate)
    ? candidate
    : configuredOrigin;
}

export function areAllowedRedirectUrls(
  successUrl: unknown,
  cancelUrl: unknown,
  appUrl: unknown,
  additionalOrigins: unknown = '',
): boolean {
  try {
    const success = new URL(String(successUrl || '').trim());
    const cancel = new URL(String(cancelUrl || '').trim());
    const allowedOrigins = getAllowedOrigins(appUrl, additionalOrigins);
    return (
      ['http:', 'https:'].includes(success.protocol) &&
      ['http:', 'https:'].includes(cancel.protocol) &&
      !success.username &&
      !success.password &&
      !cancel.username &&
      !cancel.password &&
      success.origin === cancel.origin &&
      allowedOrigins.has(success.origin)
    );
  } catch {
    return false;
  }
}

export function isAllowedRedirectUrl(
  redirectUrl: unknown,
  appUrl: unknown,
  additionalOrigins: unknown = '',
): boolean {
  try {
    const url = new URL(String(redirectUrl || '').trim());
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      getAllowedOrigins(appUrl, additionalOrigins).has(url.origin)
    );
  } catch {
    return false;
  }
}
