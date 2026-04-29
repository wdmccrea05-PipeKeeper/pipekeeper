/**
 * Tests for curatorIntentClassifier.js
 *
 * Covers:
 * 1. Diagnostic query "Evaluate Wines Without a Drinking Window in my collection" routes to diagnostics.
 * 2. Query does NOT trigger product/blend lookup.
 * 3. Structured issue context from issue card routes correctly.
 * 4. "Wines Without Valuation" detected as diagnostic.
 * 5. "Pipes Missing Photos" detected as diagnostic.
 * 6. Explicit product queries are NOT misclassified as diagnostics.
 * 7. Various phrase variations are all detected.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyDiagnosticIntent,
  isDiagnosticPhrase,
  isExplicitProductQuery,
  DIAGNOSTIC_INTENT,
} from '../curatorIntentClassifier.js';

// ─── classifyDiagnosticIntent: text patterns ──────────────────────────────────

describe('classifyDiagnosticIntent — wine drinking window', () => {
  it('detects "Evaluate Wines Without a Drinking Window in my collection"', () => {
    const result = classifyDiagnosticIntent('Evaluate Wines Without a Drinking Window in my collection');
    expect(result).not.toBeNull();
    expect(result.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
    expect(result.module).toBe('winekeeper');
  });

  it('detects "wines without a drinking window"', () => {
    const result = classifyDiagnosticIntent('wines without a drinking window');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
  });

  it('detects "wine without drinking window" (singular)', () => {
    const result = classifyDiagnosticIntent('wine without drinking window');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
  });

  it('detects "missing drinking window"', () => {
    const result = classifyDiagnosticIntent('missing drinking window');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
  });

  it('detects "wines missing drinking window"', () => {
    const result = classifyDiagnosticIntent('wines missing drinking window');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
  });

  it('is case-insensitive', () => {
    const result = classifyDiagnosticIntent('WINES WITHOUT A DRINKING WINDOW');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
  });
});

describe('classifyDiagnosticIntent — wine valuation', () => {
  it('detects "Wines Without Valuation"', () => {
    const result = classifyDiagnosticIntent('Wines Without Valuation');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_VALUATION);
    expect(result?.module).toBe('winekeeper');
  });

  it('detects "wines missing valuation"', () => {
    const result = classifyDiagnosticIntent('wines missing valuation');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_VALUATION);
  });

  it('detects "wines needing valuation"', () => {
    const result = classifyDiagnosticIntent('wines needing valuation');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_VALUATION);
  });
});

describe('classifyDiagnosticIntent — pipes', () => {
  it('detects "Pipes Missing Photos"', () => {
    const result = classifyDiagnosticIntent('Pipes Missing Photos');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.PIPE_MISSING_PHOTOS);
    expect(result?.module).toBe('pipekeeper');
  });

  it('detects "pipes without photos"', () => {
    const result = classifyDiagnosticIntent('pipes without photos');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.PIPE_MISSING_PHOTOS);
  });
});

describe('classifyDiagnosticIntent — whiskey', () => {
  it('detects "Whiskeys Without Tasting Notes"', () => {
    const result = classifyDiagnosticIntent('Whiskeys Without Tasting Notes');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WHISKEY_MISSING_NOTES);
    expect(result?.module).toBe('whiskeykeeper');
  });

  it('detects "whiskey without tasting notes" (singular)', () => {
    const result = classifyDiagnosticIntent('whiskey without tasting notes');
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WHISKEY_MISSING_NOTES);
  });
});

describe('classifyDiagnosticIntent — returns null for true product queries', () => {
  it('returns null for explicit product lookup', () => {
    expect(classifyDiagnosticIntent('What is a good Virginia flake to try?')).toBeNull();
  });

  it('returns null for session recommendation', () => {
    expect(classifyDiagnosticIntent('What should I smoke tonight?')).toBeNull();
  });

  it('returns null for a pipe brand name', () => {
    expect(classifyDiagnosticIntent('Tell me about Dunhill pipes')).toBeNull();
  });

  it('returns null for a whiskey brand', () => {
    expect(classifyDiagnosticIntent('Tell me about Laphroaig 10yr')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(classifyDiagnosticIntent('')).toBeNull();
  });
});

// ─── classifyDiagnosticIntent: structured issue context ───────────────────────

describe('classifyDiagnosticIntent — structured issue context', () => {
  it('uses structured context over text pattern when source is optimization_issue', () => {
    const ctx = {
      source: 'optimization_issue',
      module: 'winekeeper',
      issue_type: 'missing_drinking_window',
    };
    // Text is deliberately ambiguous/empty — structured context wins
    const result = classifyDiagnosticIntent('Evaluate this', ctx);
    expect(result?.intent).toBe('missing_drinking_window');
    expect(result?.module).toBe('winekeeper');
  });

  it('passes record_ids through for issue tracking', () => {
    const ctx = {
      source: 'optimization_issue',
      module: 'winekeeper',
      issue_type: 'missing_valuation',
      record_ids: ['w1', 'w2'],
    };
    const result = classifyDiagnosticIntent('Wines Without Valuation in my collection', ctx);
    expect(result?.intent).toBe('missing_valuation');
  });

  it('falls back to text matching when structuredIssueContext is null', () => {
    const result = classifyDiagnosticIntent('Wines Without a Drinking Window', null);
    expect(result?.intent).toBe(DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW);
  });

  it('ignores structuredIssueContext with wrong source', () => {
    const ctx = { source: 'other_source', module: 'winekeeper', issue_type: 'missing_drinking_window' };
    // Should still fall through to text matching
    const result = classifyDiagnosticIntent('What should I drink tonight?', ctx);
    // "drink tonight" is not a diagnostic phrase — should return null
    expect(result).toBeNull();
  });
});

// ─── isDiagnosticPhrase ───────────────────────────────────────────────────────

describe('isDiagnosticPhrase', () => {
  it('returns true for "Wines Without a Drinking Window"', () => {
    expect(isDiagnosticPhrase('Wines Without a Drinking Window')).toBe(true);
  });

  it('returns true for "missing drinking window"', () => {
    expect(isDiagnosticPhrase('missing drinking window')).toBe(true);
  });

  it('returns false for "What should I drink tonight?"', () => {
    expect(isDiagnosticPhrase('What should I drink tonight?')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isDiagnosticPhrase('')).toBe(false);
  });
});

// ─── isExplicitProductQuery ───────────────────────────────────────────────────

describe('isExplicitProductQuery', () => {
  it('returns true for "Tell me about Laphroaig 10yr"', () => {
    expect(isExplicitProductQuery('Tell me about Laphroaig 10yr whiskey')).toBe(true);
  });

  it('returns false for "Evaluate Wines Without a Drinking Window in my collection"', () => {
    expect(isExplicitProductQuery('Evaluate Wines Without a Drinking Window in my collection')).toBe(false);
  });

  it('returns false for "What should I drink tonight?"', () => {
    expect(isExplicitProductQuery('What should I drink tonight?')).toBe(false);
  });

  it('returns false for "wines without valuation in my collection"', () => {
    expect(isExplicitProductQuery('wines without valuation in my collection')).toBe(false);
  });
});
