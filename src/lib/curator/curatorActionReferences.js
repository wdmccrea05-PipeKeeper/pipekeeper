/**
 * curatorActionReferences.js
 *
 * Resolves what the collector means when they answer a proposal in words:
 * "apply the second option", "keep the existing classification", "make those
 * three changes", "apply everything except the storage change", "explain the
 * third option", "show me the affected records", "undo the last change".
 *
 * The reference is resolved against the actions Curator last presented, so a
 * conversational reply maps onto the same structured action identifiers the
 * card already holds. When the words genuinely fit more than one action the
 * resolver asks a short question instead of guessing, and when nothing matches
 * it returns `none` so the message goes on to be answered normally.
 */

const ORDINAL_WORDS = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

const FIELD_GROUPS = [
  { label: 'storage', test: /\b(storage|cellar|humidor|shelf|location)\b/i, fields: ['storage_location_id', 'humidor_id'], types: ['storage_assign'] },
  { label: 'tags', test: /\btags?\b/i, fields: ['tags'] },
  { label: 'condition', test: /\bcondition\b/i, fields: ['condition', 'condition_notes', 'packaging_condition'] },
  { label: 'specialization', test: /\b(specializ\w*|focus|dedicat\w*)\b/i, fields: ['focus'] },
  { label: 'classification', test: /\b(classif\w*|blend type|category)\b/i, fields: ['blend_type'] },
  { label: 'notes', test: /\bnotes?\b/i, fields: ['notes', 'personal_notes', 'provenance_notes'] },
  { label: 'merge', test: /\b(merge|duplicate)\b/i, fields: [], types: ['record_merge'] },
];

export function parseOrdinal(text) {
  const value = String(text || '').toLowerCase();
  const word = value.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/);
  if (word) return ORDINAL_WORDS[word[1]];
  const numbered = value.match(/\b(?:option|choice|number|no\.?)\s*(\d{1,2})\b/);
  if (numbered) return Number(numbered[1]);
  const suffixed = value.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/);
  if (suffixed) return Number(suffixed[1]);
  return null;
}

export function actionFields(action) {
  const fields = new Set();
  for (const target of action?.targets || []) {
    for (const field of Object.keys(target?.patch || {})) fields.add(field);
  }
  return [...fields];
}

function matchesGroup(action, group) {
  if (group.types?.includes(action?.type)) return true;
  const fields = actionFields(action);
  return group.fields.some((field) => fields.includes(field));
}

function titles(actions = []) {
  return actions.map((action) => action.title || action.type).join('; ');
}

function recordNames(actions = []) {
  const names = [];
  for (const action of actions) {
    for (const target of action.targets || []) {
      if (target?.name) names.push(target.name);
      else if (target?.recordId) names.push(target.recordId);
    }
  }
  return [...new Set(names)];
}

function explainAction(action, alternative) {
  if (alternative) {
    return [
      `${alternative.label} — ${alternative.description || 'one of the options here'}.`,
      alternative.rationale || '',
    ].filter(Boolean).join(' ');
  }
  const parts = [];
  if (action?.rationale) parts.push(action.rationale);
  if (action?.evidence?.length) parts.push(`Evidence: ${action.evidence.slice(0, 3).join('; ')}.`);
  if (action?.confidence) parts.push(`Confidence: ${action.confidence}.`);
  if (parts.length === 0) {
    return `${action?.description || 'I built that from the values already recorded on the record.'} Nothing has been changed.`;
  }
  return `${parts.join(' ')} Nothing has been changed.`;
}

function recordsMessage(actions) {
  const names = recordNames(actions);
  if (names.length === 0) return 'These changes do not point at a specific record yet.';
  const shown = names.slice(0, 8).join(', ');
  const more = names.length > 8 ? ` and ${names.length - 8} more` : '';
  return `These changes touch ${names.length} record${names.length === 1 ? '' : 's'}: ${shown}${more}.`;
}

/**
 * @returns {{kind: 'none'|'undo'|'clarify'|'explain'|'records'|'select'|'reject'|'apply', message?: string, actionIds?: string[], alternativeId?: string, selections?: object}}
 */
export function resolveActionReference(text, { actions = [], selections = {}, alternatives = {} } = {}) {
  const raw = String(text || '').trim();
  if (!raw || !Array.isArray(actions) || actions.length === 0) return { kind: 'none' };

  const value = raw.toLowerCase();

  if (/\b(undo|revert|roll ?back|take that back|reverse (that|the) change)\b/.test(value)) {
    return { kind: 'undo' };
  }

  const ordinal = parseOrdinal(value);
  const wantsExplain = /\b(explain|why|reason)\b/.test(value);
  const wantsRecords = /\baffected records?\b/.test(value)
    || (/\b(show|list|which|what)\b/.test(value) && /\b(records?|items?)\b/.test(value));
  const wantsKeep = /\b(keep|leave|retain)\b/.test(value)
    && /\b(existing|current|as (it )?is|unchanged|same)\b/.test(value);
  const wantsReject = wantsKeep
    || /\b(don'?t|do not) change\b/.test(value)
    || /\b(reject|dismiss|skip (that|it|this)|not that one)\b/.test(value);
  const wantsApply = /^(apply|accept|confirm|do it|go ahead|yes)\b/.test(value)
    || /\b(apply|accept)\b[^.!?]*\b(them|those|these|all|it|everything|changes?)\b/.test(value);
  const wantsSelect = /\b(select|choose|pick|go with)\b/.test(value);
  const wantsEverything = /\b(everything|all of them|all of it|them all|all changes|all the changes)\b/.test(value);
  const negation = /\b(except|but not|other than|apart from|leave out|excluding)\b/.test(value);

  const single = actions.length === 1 ? actions[0] : null;
  const singleOptions = single?.alternatives?.length > 1 ? single.alternatives : [];

  const pick = () => {
    if (ordinal !== null && singleOptions.length > 0) {
      const option = singleOptions[ordinal - 1];
      if (!option) {
        return { clarify: `There ${singleOptions.length === 1 ? 'is' : 'are'} only ${singleOptions.length} option${singleOptions.length === 1 ? '' : 's'} here — which one do you mean?` };
      }
      return { actionIds: [single.id], alternativeId: option.id, label: option.label };
    }
    if (ordinal !== null) {
      const action = actions[ordinal - 1];
      if (!action) {
        return { clarify: `I only see ${actions.length} proposed change${actions.length === 1 ? '' : 's'} here — which one do you mean?` };
      }
      return { actionIds: [action.id], label: action.title };
    }

    const groups = FIELD_GROUPS.filter((group) => group.test.test(value));
    if (groups.length > 0) {
      const matched = actions.filter((action) => groups.some((group) => matchesGroup(action, group)));
      if (matched.length === 0) {
        return { clarify: `None of these changes touches ${groups[0].label}. They are: ${titles(actions)}.` };
      }
      if (matched.length > 1) {
        return { clarify: `More than one of these changes touches ${groups[0].label}: ${titles(matched)}. Which one do you mean?` };
      }
      return { actionIds: [matched[0].id], label: matched[0].title };
    }

    return { actionIds: actions.map((action) => action.id) };
  };

  const allSelections = () => {
    const next = { ...selections };
    for (const action of actions) next[action.id] = true;
    return next;
  };

  if (wantsExplain) {
    const target = pick();
    if (target.clarify) return { kind: 'clarify', message: target.clarify };

    const targetActions = actions.filter((action) => target.actionIds.includes(action.id));
    const option = target.alternativeId
      ? (targetActions[0]?.alternatives || []).find((entry) => entry.id === target.alternativeId)
      : null;

    if (targetActions.length === 1) {
      return { kind: 'explain', actionIds: target.actionIds, alternativeId: target.alternativeId || null, message: explainAction(targetActions[0], option) };
    }
    return {
      kind: 'explain',
      actionIds: target.actionIds,
      message: targetActions
        .map((action) => `${action.title || action.type}: ${explainAction(action, null)}`)
        .join('\n'),
    };
  }

  if (wantsRecords) {
    const target = pick();
    if (target.clarify) return { kind: 'clarify', message: target.clarify };
    const targetActions = actions.filter((action) => target.actionIds.includes(action.id));
    return { kind: 'records', actionIds: target.actionIds, message: recordsMessage(targetActions) };
  }

  if (wantsReject) {
    const target = pick();
    if (target.clarify) return { kind: 'clarify', message: target.clarify };

    const next = { ...selections };
    for (const id of target.actionIds) next[id] = false;

    const label = target.label || titles(actions.filter((action) => target.actionIds.includes(action.id)));
    return {
      kind: 'reject',
      actionIds: target.actionIds,
      selections: next,
      message: `Left as it is — ${label}. Nothing was changed, and I will not raise it again in this conversation unless you ask.`,
    };
  }

  if (wantsApply) {
    if (negation) {
      const excluded = pick();
      if (excluded.clarify) return { kind: 'clarify', message: excluded.clarify };

      const next = allSelections();
      for (const id of excluded.actionIds) next[id] = false;

      const applied = actions.filter((action) => next[action.id]);
      const label = excluded.label || titles(actions.filter((action) => excluded.actionIds.includes(action.id)));
      return {
        kind: 'apply',
        actionIds: applied.map((action) => action.id),
        selections: next,
        message: `Applying ${applied.length} change${applied.length === 1 ? '' : 's'}, and leaving ${label} as it is.`,
      };
    }

    const target = pick();
    if (target.clarify) return { kind: 'clarify', message: target.clarify };

    // "Apply it" with several unrelated changes is genuinely ambiguous.
    if (!target.alternativeId && target.actionIds.length > 1 && !wantsEverything && ordinal === null) {
      return {
        kind: 'clarify',
        message: `There are ${actions.length} changes here: ${titles(actions)}. Should I apply all of them, or a specific one?`,
      };
    }

    const next = { ...selections };
    for (const action of actions) next[action.id] = target.actionIds.includes(action.id);

    const count = target.actionIds.length;
    return {
      kind: 'apply',
      actionIds: target.actionIds,
      alternativeId: target.alternativeId || null,
      selections: next,
      message: target.alternativeId
        ? `Applying ${target.label}.`
        : `Applying ${count} change${count === 1 ? '' : 's'}.`,
    };
  }

  if (wantsSelect || ordinal !== null) {
    const target = pick();
    if (target.clarify) return { kind: 'clarify', message: target.clarify };

    const next = { ...selections };
    for (const action of actions) next[action.id] = target.actionIds.includes(action.id);

    return {
      kind: 'select',
      actionIds: target.actionIds,
      alternativeId: target.alternativeId || null,
      selections: next,
      message: target.alternativeId
        ? `Selected ${target.label}. Nothing has been changed yet — press Accept when you are ready.`
        : `Selected. Review the card and accept when you are ready.`,
    };
  }

  return { kind: 'none' };
}