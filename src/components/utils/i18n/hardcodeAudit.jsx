/**
 * Runtime hardcoded string audit tool (dev-only)
 * Call window.__i18nAuditScan() from console to detect untranslated UI text
 */

const PLACEHOLDER_PATTERNS = [
  "Title",
  "Subtitle",
  "Page Title",
  "Page Subtitle",
  "Reports Subtitle",
  "Identification Title",
  "Identification Subtitle",
  "Optional",
  "Description",
  "Label",
  "Info",
  "Placeholder"
];

const PLACEHOLDER_REGEX = new RegExp(
  `^(${PLACEHOLDER_PATTERNS.map(p => p.replace(/\s+/g, "\\s+")).join("|")})$`,
  "i"
);

function getSelector(el) {
  if (el.id) return `#${el.id}`;
  const path = [];
  let current = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.className) {
      const classes = String(current.className)
        .split(/\s+/)
        .filter(c => c && !c.startsWith("dark"))
        .slice(0, 2)
        .join(".");
      if (classes) selector += `.${classes}`;
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.slice(-3).join(" > ");
}

function isLikelyHardcodedUI(text) {
  const trimmed = String(text).trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (PLACEHOLDER_REGEX.test(trimmed)) return true;
  // All-caps short text that looks like a label (but not units)
  if (/^[A-Z ]{2,20}$/.test(trimmed) && !/^(MM|CM|G|OZ|IN|LB)$/.test(trimmed)) {
    return trimmed.split(/\s+/).length <= 3;
  }
  return false;
}

export function installAuditTool() {
  if (typeof window === "undefined") return;
  
  window.__i18nAuditScan = () => {
    const found = new Map();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      const parent = node.parentElement;

      if (
        !parent ||
        parent.tagName === "SCRIPT" ||
        parent.tagName === "STYLE" ||
        parent.offsetParent === null
      ) {
        continue;
      }

      if (isLikelyHardcodedUI(text)) {
        const selector = getSelector(parent);
        if (!found.has(text)) {
          found.set(text, []);
        }
        found.get(text).push(selector);
      }
    }

    if (found.size === 0) {
      console.log("✅ No obvious hardcoded UI strings detected");
      return {};
    }

    const result = {};
    found.forEach((selectors, text) => {
      result[text] = [...new Set(selectors)];
    });

    console.warn(
      `⚠️ Found ${found.size} potential hardcoded strings:\n`,
      result
    );
    return result;
  };

  window.__i18nAuditDump = () => {
    const missing = window.__i18nMissingKeys;
    if (!missing || missing.size === 0) {
      console.log("✅ No missing i18n keys");
      return [];
    }
    const keys = Array.from(missing).sort();
    console.warn(`⚠️ Missing keys (${keys.length}):`, keys);
    return keys;
  };
}