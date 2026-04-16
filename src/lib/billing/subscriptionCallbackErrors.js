export function parseSubscriptionCallbackError(searchParams) {
  const raw =
    searchParams.get('error_description') ||
    searchParams.get('error_message') ||
    searchParams.get('error') ||
    searchParams.get('detail') ||
    '';

  const value = String(raw || '').trim();
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (
    normalized.includes('app not found') ||
    normalized.includes('entitlement grant failed')
  ) {
    return 'We could not activate your subscription yet. Please retry once from the app, and contact support if this continues.';
  }

  return 'We could not complete subscription activation. Please retry once or contact support.';
}
