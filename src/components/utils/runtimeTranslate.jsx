import { base44 } from "@/api/base44Client";

// In-memory translation cache: { "en->es": { "Hello": "Hola" } }
const translationCache = {};

// Language names for display
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "sv", label: "Svenska" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

// Check if text should be translated
function shouldTranslate(text) {
  if (!text || text.length === 0) return false;
  if (text.length > 200) return false; // Skip very long text
  
  // Skip numbers only
  if (/^\d+(\.\d+)?$/.test(text)) return false;
  
  // Skip currency
  if (/^[\$€£¥]/.test(text)) return false;
  
  // Skip dates (ISO format or common patterns)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  
  // Skip single characters
  if (text.length === 1) return false;
  
  // Skip only punctuation/symbols
  if (/^[^\w\s]+$/.test(text)) return false;
  
  return true;
}

// Check if element should be skipped
function shouldSkipElement(element) {
  if (!element || !element.tagName) return true;
  
  const tag = element.tagName.toLowerCase();
  
  // Skip code, script, style, inputs
  if (['script', 'style', 'code', 'pre', 'input', 'textarea', 'select'].includes(tag)) {
    return true;
  }
  
  // Skip elements with data-no-translate attribute
  if (element.hasAttribute('data-no-translate')) {
    return true;
  }
  
  // Skip elements with contenteditable
  if (element.isContentEditable) {
    return true;
  }
  
  return false;
}

// Collect all translatable text nodes from DOM
function collectTextNodes(root = document.body) {
  const textNodes = [];
  
  function walk(node) {
    if (shouldSkipElement(node)) return;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (shouldTranslate(text)) {
        textNodes.push({ node, text });
      }
    } else {
      node.childNodes.forEach(child => walk(child));
    }
  }
  
  walk(root);
  return textNodes;
}

// Batch translate texts using LLM
async function batchTranslate(texts, targetLang) {
  if (texts.length === 0) return {};
  
  const cacheKey = `en->${targetLang}`;
  if (!translationCache[cacheKey]) {
    translationCache[cacheKey] = {};
  }
  
  // Filter out already cached
  const uncached = texts.filter(text => !translationCache[cacheKey][text]);
  
  if (uncached.length === 0) {
    // All cached, return immediately
    const result = {};
    texts.forEach(text => {
      result[text] = translationCache[cacheKey][text];
    });
    return result;
  }
  
  // Translate uncached texts
  try {
    const langNames = {
      es: "Spanish",
      fr: "French", 
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      ja: "Japanese",
      zh: "Chinese (Simplified)",
    };
    
    const targetLangName = langNames[targetLang] || targetLang;
    
    const prompt = `Translate the following English UI text strings to ${targetLangName}. 
Preserve any HTML tags, placeholders like {{variable}}, and formatting.
Return a JSON object mapping each English string to its translation.

Strings to translate:
${uncached.map((text, i) => `${i + 1}. "${text}"`).join('\n')}`;

    const translations = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          translations: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        }
      }
    });
    
    // Cache new translations
    if (translations?.translations) {
      Object.assign(translationCache[cacheKey], translations.translations);
    }
    
    // Return all translations (cached + new)
    const result = {};
    texts.forEach(text => {
      result[text] = translationCache[cacheKey][text] || text;
    });
    return result;
    
  } catch (error) {
    console.error('Translation failed:', error);
    // Return original texts as fallback
    const result = {};
    texts.forEach(text => {
      result[text] = text;
    });
    return result;
  }
}

// Main translation function
export async function translateDOM(targetLang) {
  if (!targetLang || targetLang === 'en') {
    // Reload page to reset to English
    window.location.reload();
    return;
  }
  
  // Show loading indicator
  const loadingEl = document.createElement('div');
  loadingEl.id = 'translation-loading';
  loadingEl.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.8);color:white;padding:12px 20px;border-radius:8px;z-index:999999;font-size:14px;';
  loadingEl.textContent = 'Translating...';
  document.body.appendChild(loadingEl);
  
  try {
    // Collect all text nodes
    const textNodes = collectTextNodes();
    
    if (textNodes.length === 0) {
      return;
    }
    
    // Get unique texts
    const uniqueTexts = [...new Set(textNodes.map(n => n.text))];
    
    // Batch translate (max 50 at a time to avoid huge prompts)
    const batchSize = 50;
    const translations = {};
    
    for (let i = 0; i < uniqueTexts.length; i += batchSize) {
      const batch = uniqueTexts.slice(i, i + batchSize);
      const batchTranslations = await batchTranslate(batch, targetLang);
      Object.assign(translations, batchTranslations);
    }
    
    // Apply translations to DOM
    textNodes.forEach(({ node, text }) => {
      if (translations[text]) {
        node.textContent = translations[text];
      }
    });
    
    // Save language preference
    localStorage.setItem('pk_language', targetLang);
    
  } catch (error) {
    console.error('DOM translation failed:', error);
  } finally {
    // Remove loading indicator
    setTimeout(() => {
      const el = document.getElementById('translation-loading');
      if (el) el.remove();
    }, 500);
  }
}

// Get stored language preference
export function getStoredLanguage() {
  return localStorage.getItem('pk_language') || 'en';
}