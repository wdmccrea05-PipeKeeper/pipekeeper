/**
 * eslint-plugin-i18n-guard
 *
 * Custom ESLint plugin that flags hardcoded user-facing English strings in JSX.
 * Provides IDE-level (editor) feedback while coding so issues are caught before
 * they ever reach the pre-commit hook or CI gate.
 *
 * Rules exposed:
 *   i18n-guard/no-hardcoded-text          – JSXText nodes with raw English
 *   i18n-guard/no-hardcoded-attr-string   – placeholder/aria-label/title/alt
 *                                            attributes with raw string values
 *
 * Consumed by eslint.config.js.
 */

// ─── Allow-list ──────────────────────────────────────────────────────────────
// Strings that are safe to leave untranslated.
// Keep this list minimal and intentional.
const PROPER_NOUNS = new Set([
  'CollectionKeeper', 'PipeKeeper', 'WhiskeyKeeper', 'WineKeeper', 'CigarKeeper',
  'Base44', 'Supabase', 'GitHub', 'Google', 'Apple', 'iOS', 'iPad', 'iPhone',
  'PDF', 'CSV', 'JSON', 'URL', 'API', 'UI', 'AI', 'ABV', 'OG', 'ID',
  'Pro', 'Premium',
]);

// Very short strings, punctuation-only, numbers, and single words that are
// likely CSS class fragments or technical IDs are skipped by length checks.
const MIN_WORDS = 2;   // must contain at least 2 whitespace-separated words
const MIN_LENGTH = 5;  // must be at least 5 characters

// Attributes whose string values are always user-visible
const USER_FACING_ATTRS = new Set([
  'placeholder', 'aria-label', 'aria-placeholder', 'aria-description',
  'title', 'alt', 'label',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isAllowlisted(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < MIN_LENGTH) return true;

  // All-caps: likely a constant (STATUS, TYPE_A, etc.)
  if (/^[A-Z0-9_\s]+$/.test(trimmed)) return true;

  // URL or route
  if (/^https?:\/\/|^\/[a-zA-Z]/.test(trimmed)) return true;

  // Template literal placeholder: {variable}
  if (/^\{[^}]+\}$/.test(trimmed)) return true;

  // Looks like a CSS class string
  if (/^[a-z][-a-z0-9:/_[\] .]+$/.test(trimmed)) return true;

  // Proper noun or brand
  if (PROPER_NOUNS.has(trimmed)) return true;

  // Too few words
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return true;

  // Does not start with uppercase (likely variable/expression)
  if (!/^[A-Z]/.test(trimmed)) return true;

  return false;
}

function isInsideTranslationCall(node) {
  // Walk up the AST to see if we're already inside a t() call
  let current = node.parent;
  while (current) {
    if (
      current.type === 'CallExpression' &&
      current.callee &&
      (current.callee.name === 't' ||
        (current.callee.type === 'MemberExpression' &&
          current.callee.property?.name === 't'))
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

// ─── Rule: no-hardcoded-text ──────────────────────────────────────────────────
const noHardcodedText = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded user-facing text in JSX. Use t("namespace.key") instead.',
      category: 'i18n',
      recommended: true,
      url: 'https://github.com/wdmccrea05-PipeKeeper/pipekeeper/blob/main/docs/i18n-check.md',
    },
    schema: [],
    messages: {
      hardcodedText:
        'Hardcoded string "{{ text }}" — use t("namespace.key") from useTranslation() instead. ' +
        'Add the key to src/components/i18n/locales/en.ui.jsx and all locale files.',
    },
  },
  create(context) {
    return {
      JSXText(node) {
        const text = node.value.trim();
        if (!text) return;
        if (isAllowlisted(text)) return;
        if (isInsideTranslationCall(node)) return;

        context.report({
          node,
          messageId: 'hardcodedText',
          data: { text: text.length > 60 ? text.slice(0, 60) + '…' : text },
        });
      },
    };
  },
};

// ─── Rule: no-hardcoded-attr-string ──────────────────────────────────────────
const noHardcodedAttrString = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded string values in user-facing JSX attributes (placeholder, aria-label, title, alt).',
      category: 'i18n',
      recommended: true,
      url: 'https://github.com/wdmccrea05-PipeKeeper/pipekeeper/blob/main/docs/i18n-check.md',
    },
    schema: [],
    messages: {
      hardcodedAttr:
        'Hardcoded "{{ attr }}" value "{{ value }}" — use {t("namespace.key")} instead.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const attrName =
          node.name?.type === 'JSXIdentifier' ? node.name.name : null;
        if (!attrName || !USER_FACING_ATTRS.has(attrName)) return;

        const value = node.value;
        if (!value || value.type !== 'Literal') return;
        const str = String(value.value).trim();

        if (isAllowlisted(str)) return;

        context.report({
          node,
          messageId: 'hardcodedAttr',
          data: {
            attr: attrName,
            value: str.length > 60 ? str.slice(0, 60) + '…' : str,
          },
        });
      },
    };
  },
};

// ─── Plugin export ────────────────────────────────────────────────────────────
export const plugin = {
  meta: {
    name: 'i18n-guard',
    version: '1.0.0',
  },
  rules: {
    'no-hardcoded-text': noHardcodedText,
    'no-hardcoded-attr-string': noHardcodedAttrString,
  },
};

export default plugin;
