/**
 * CURATOR ELITE TIER VOICE LAYER
 * 
 * Governs HOW Curator communicates:
 * - Response structure (Direct → Reasoning → Insight → Next Step)
 * - Phrase rotation (no templates, natural variation)
 * - Confidence calibration (tone matches evidence)
 * - Collection-first personalization (real items, not abstractions)
 * - Anti-template enforcement (no sentence structure repetition)
 */

// ─────────────────────────────────────────────────────────────────────────────
// PHRASE BANKS — ROTATIONAL
// ─────────────────────────────────────────────────────────────────────────────

const directIntroductors = {
  strong: [
    'The clear standout here is',
    'What emerges from the pattern is',
    'The strongest signal points to',
    'This is where the data settles on',
    'The obvious choice, given the pattern, is',
  ],
  moderate: [
    'The pattern starting to develop is',
    'What shows up consistently is',
    'The evidence leans toward',
    'This is beginning to crystallize as',
    'The lean here is toward',
  ],
  weak: [
    'An early signal emerging is',
    'One possibility worth watching is',
    'The initial read suggests',
    'A direction to keep an eye on is',
    'The early indicator points to',
  ],
  contextual: [
    'Looking at your collection, what stands out is',
    'In your case, this comes down to',
    'Given what you own, the signal is',
    'The picture here is shaped by',
    'What this looks like in your collection is',
  ],
};

const reasoningTransitions = {
  standard: [
    'The reason is straightforward:',
    'Here\'s why:',
    'This is because:',
    'The underlying pattern:',
    'This stems from:',
  ],
  evidence: [
    'The data backs this up:',
    'Session history shows:',
    'Your usage pattern confirms:',
    'The logs reveal:',
    'The signal is consistent:',
  ],
  contrast: [
    'What makes this stand out is',
    'What distinguishes this from the rest is',
    'The difference here is',
    'Where this pulls away from the others is',
    'What sets this apart is',
  ],
};

const insightFramers = {
  strategic: [
    'For the collection, this means',
    'Strategically, this suggests',
    'The implication for your lineup is',
    'What this points to in your collection is',
    'The strategic angle here is',
  ],
  tactical: [
    'Tactically, the move is',
    'Practically, this means',
    'In terms of next steps, this positions you to',
    'What this opens up for you is',
    'This puts you in a position to',
  ],
  balancing: [
    'In terms of balance, this would',
    'For the bigger picture, this fills',
    'In the context of what you have, this',
    'When you look at coverage, this',
    'In terms of the broader lineup, this',
  ],
};

const nextStepPhrases = {
  immediate: [
    'The immediate move is',
    'The next action to take is',
    'What makes sense right now is',
    'The logical next step is',
    'What I\'d prioritize is',
  ],
  conditional: [
    'If you want to act, the play is',
    'If the pattern holds, the move becomes',
    'When you\'re ready, the candidate is',
    'If this resonates, the direction is',
    'Should you decide to move, the next one is',
  ],
  observational: [
    'For now, keep watching',
    'The thing to track is',
    'What\'s worth observing next is',
    'The signal to stay tuned on is',
    'Where to focus attention next is',
  ],
};

const confidenceQualifiers = {
  high: {
    prefix: '',
    suffix: '',
    examples: ['clear signal', 'strong pattern', 'solid candidate', 'this is the move'],
  },
  moderate: {
    prefix: 'The picture here is developing, but ',
    suffix: ' — though the signal isn\'t airtight yet.',
    examples: ['emerging pattern', 'starting to lean', 'probable candidate'],
  },
  weak: {
    prefix: 'Too early to be confident, but ',
    suffix: ' — more logging will sharpen the picture.',
    examples: ['early signal', 'worth watching', 'not something I\'d act on yet'],
  },
};

const noDataResponses = {
  empty: 'Start logging items and sessions — patterns reveal themselves once the foundation is built.',
  sparse: 'With only a few records, the picture is still forming. A few more sessions will clarify the direction.',
  incomplete: 'Your collection exists, but it\'s not fully classified yet. Once metadata settles, the gaps become clearer.',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildDirectAnswer(statement, confidence = 'moderate') {
  const introductors = directIntroductors[confidence] || directIntroductors.moderate;
  return `${pick(introductors)} ${statement}.`;
}

function buildReasoning(reason, type = 'standard') {
  const transitions = reasoningTransitions[type] || reasoningTransitions.standard;
  return `${pick(transitions)} ${reason}`;
}

function buildInsight(insight, type = 'strategic') {
  const framers = insightFramers[type] || insightFramers.strategic;
  return `${pick(framers)} ${insight}.`;
}

function buildNextStep(action, type = 'immediate') {
  const phrases = nextStepPhrases[type] || nextStepPhrases.immediate;
  return `${pick(phrases)} ${action}.`;
}

function buildConfidenceQualifier(evidence) {
  if (!evidence) return '';
  const { prefix, suffix } = confidenceQualifiers[evidence] || confidenceQualifiers.moderate;
  return { prefix, suffix };
}

function structureResponse(parts) {
  const { direct, reasoning, insight, nextStep } = parts;
  let response = direct || '';
  
  if (reasoning) {
    response += ` ${reasoning}`;
  }
  
  if (insight) {
    response += ` ${insight}`;
  }
  
  if (nextStep) {
    response += ` ${nextStep}`;
  }
  
  return response.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIZED RESPONSE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildSessionRecommendation(primary, secondary, reason) {
  const direct = buildDirectAnswer(primary.title || primary.name, 'strong');
  const insight = secondary 
    ? `If you want a different angle, ${secondary.title || secondary.name} also shows promise.`
    : null;
  
  return {
    direct,
    reasoning: reason || null,
    insight,
  };
}

function buildPairingExplanation(pipe, blend, bottle, validationType) {
  const validation = validationType === 'proven'
    ? 'This is one of your proven combinations — the session history backs it up.'
    : validationType === 'never_tried'
    ? 'These two have not been logged together yet, so think of this as a plausible fit rather than a confirmed one.'
    : 'There is some history here, though the signal isn\'t quite firm enough to call it confirmed.';
  
  return {
    validation,
    interaction: null, // To be filled by caller with pairing-specific logic
  };
}

function buildGapAnalysis(gapDescription, direction) {
  if (!gapDescription) {
    return noDataResponses.empty;
  }
  
  return gapDescription;
}

function buildReassignmentCandidate(pipe, dominantFamily, currentFocus, evidence) {
  const mismatch = currentFocus && dominantFamily && !dominantFamily.includes(currentFocus);
  
  const direct = buildDirectAnswer(
    `${pipe.name} for a specialization adjustment`,
    evidence === 'STRONG' ? 'strong' : evidence === 'MODERATE' ? 'moderate' : 'weak'
  );
  
  const reasoning = mismatch
    ? `Sessions are pulling consistently toward ${dominantFamily}, drifting away from its current ${currentFocus} designation.`
    : `The usage pattern clusters heavily in ${dominantFamily} — a sustained signal.`;
  
  const action = mismatch
    ? `review those sessions directly to confirm the shift`
    : `log a few more intentional sessions to cement the direction`;
  
  const nextStep = buildNextStep(action, 'immediate');
  
  return { direct, reasoning, nextStep };
}

function buildRedundancyFinding(pipe, shape, sessionCount, evidence) {
  const direct = buildDirectAnswer(
    `${pipe.name} as the least-active candidate in the ${shape} lane`,
    evidence === 'STRONG' ? 'moderate' : 'weak'
  );
  
  const reasoning = `With only ${sessionCount} session${sessionCount !== 1 ? 's' : ''} logged, it\'s not pulling its weight in a crowded shape grouping.`;
  
  const action = `intentional rotation through your ${shape} pipes to clarify whether this one earns its place`;
  const nextStep = buildNextStep(action, 'observational');
  
  return { direct, reasoning, nextStep };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECTION HANDLING
// ─────────────────────────────────────────────────────────────────────────────

const correctionFrames = {
  specialization: 'That constraint changes the assessment. If it\'s only been used for [constraint], then the earlier signal was working from incomplete or mis-tagged data.',
  ownership: 'That shifts the frame entirely. If you already own [item], the question becomes fit within the collection, not acquisition.',
  tracking: 'Understood — if it\'s already on the list, the focus moves from discovery to prioritization.',
  usage: 'That resets the baseline. If [item] is already [usage], then the prior conclusion was based on stale data.',
  pairing: 'That invalidates the pairing logic. Tell me how you actually experience it, and I can reconstruct the reasoning.',
};

function buildCorrection(correctionType, subject, detail) {
  const frame = correctionFrames[correctionType] || correctionFrames.usage;
  return frame.replace('[item]', subject?.name || 'that').replace('[constraint]', detail || 'that').replace('[usage]', detail || 'that');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  pick,
  buildDirectAnswer,
  buildReasoning,
  buildInsight,
  buildNextStep,
  buildConfidenceQualifier,
  structureResponse,
  buildSessionRecommendation,
  buildPairingExplanation,
  buildGapAnalysis,
  buildReassignmentCandidate,
  buildRedundancyFinding,
  buildCorrection,
  confidenceQualifiers,
  noDataResponses,
  directIntroductors,
  reasoningTransitions,
  insightFramers,
  nextStepPhrases,
};