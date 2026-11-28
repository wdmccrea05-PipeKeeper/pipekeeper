const TYPES = [
  { pattern: /\b(blends?|tobacco)\b/i, entity: 'TobaccoBlend', module: 'pipekeeper', importType: 'pipekeeper_blends', label: 'blends' },
  { pattern: /\bpipes?\b/i, entity: 'Pipe', module: 'pipekeeper', importType: 'pipekeeper_pipes', label: 'pipes' },
  { pattern: /\bcigars?\b/i, entity: 'Cigar', module: 'cigarkeeper', importType: 'cigarkeeper_cigars', label: 'cigars' },
  { pattern: /\b(whisk(?:e)?y|bourbon|scotch)\b/i, entity: 'Bottle', module: 'whiskeykeeper', importType: 'whiskeykeeper_bottles', label: 'whiskey bottles' },
  { pattern: /\bwines?\b/i, entity: 'Wine', module: 'winekeeper', importType: 'winekeeper_wines', label: 'wines' },
];

export function appGuidance(text, enabledModules = {}) {
  const question = String(text || '').trim();
  if (!/\b(how|where|steps?|help|start|why|troubleshoot|troubleshooting|faq|frequently asked)\b/i.test(question)) return null;
  const duplicate = /\b(duplicate|duplicates)\b/i.test(question) && /\b(merge|review|find|manage)\b/i.test(question);
  const importing = /\b(import|upload)\b/i.test(question) && !duplicate;
  if (/\b(report|export|compare|value|summari[sz]e)\b/i.test(question)) return null;

  if (duplicate || importing) {
    const types = TYPES.filter((type) => type.pattern.test(question));
    if (types.length !== 1) return null;
    const type = types[0];
    if (enabledModules[type.module] === false) {
      return {
        content: `That collection is not enabled. Open your profile to manage available modules before working with ${type.label}.`,
        recordLinks: [{ to: '/Profile', label: 'Open module settings' }],
      };
    }

    if (duplicate) {
      return {
        content: `Open duplicate review for ${type.label}, choose the record to keep, and review the merge before confirming. The other records are archived, not deleted.`,
        recordLinks: [{ to: `/CollectionTools?tab=duplicates&module=${type.entity}`, label: `Review duplicate ${type.label}` }],
      };
    }

    return {
      content: `The import page accepts CSV files. Choose a template or upload a CSV for ${type.label}, review the validation results, then import. Import requires paid access; Excel files must first be saved as CSV.`,
      recordLinks: [{ to: `/Import?type=${type.importType}`, label: `Start ${type.label} import` }],
    };
  }

  if (/\b(troubleshoot|troubleshooting|not working|isn't|is not|doesn't work|not showing|missing|can't|cannot|error|problem|issue)\b/i.test(question)) {
    return {
      content: 'I can help narrow down the cause. Open the troubleshooting guide for verified checks and recovery steps; I cannot inspect account-specific diagnostics from this answer alone.',
      recordLinks: [{ to: '/TroubleshootingFull', label: 'Open troubleshooting' }],
    };
  }

  if (/\bwhere\s+(is|are)\b/i.test(question)) return null;

  if (/\b(faq|frequently asked|where can i find)\b/i.test(question)) {
    return {
      content: 'Open the current FAQ for product guidance. If you share the feature or question, I can narrow down the relevant steps.',
      recordLinks: [{ to: '/FAQFull', label: 'Open FAQs' }],
    };
  }

  if (/\b(how\s+(do|can|to)|where|steps?|help|start)\b/i.test(question)) {
    return {
      content: 'Open the how-to guides for verified instructions. If the task needs a specific form or setting, tell me which feature and I will link to that screen when available.',
      recordLinks: [{ to: '/HowTo', label: 'Open how-to guides' }],
    };
  }

  return null;
}

export function restoreAppGuidance(messages, enabledModules = {}) {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    if (message.role !== 'assistant' || previous?.role !== 'user') return message;
    const guidance = appGuidance(previous.content, enabledModules);
    return guidance?.content === message.content ? { ...message, recordLinks: guidance.recordLinks } : message;
  });
}
