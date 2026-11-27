/**
 * src/lib/curator/specializationReview.js
 *
 * A specialization review answers a different question from a pairing question.
 *
 *   Pairing question        → how well does this pipe suit these blends (scores)
 *   Specialization question → what should this pipe be dedicated to, why, and
 *                             how sure can we be, given its recorded
 *                             characteristics and its own session history
 *
 * So this module never reads or restates pairing scores. It builds a structured,
 * descriptive review from two things only: the pipe's recorded physical
 * characteristics and the sessions actually logged with that pipe. Each
 * alternative carries its own rationale and confidence, and an alternative with
 * no session evidence is labelled as characteristic-based rather than dressed up
 * as a conclusion.
 */

const FAMILY_RULES = [
  { family: 'English/Balkan', test: /balkan|latakia/i },
  { family: 'English', test: /english|scottish/i },
  { family: 'Virginia/Perique', test: /perique|vaper|v\.?p\b/i },
  { family: 'Virginia/Burley', test: /virginia\/burley|va\/bur|burley\/virginia/i },
  { family: 'Virginia/Oriental', test: /virginia\/oriental/i },
  { family: 'Aromatic', test: /aromatic|danish|cavendish/i },
  { family: 'Burley', test: /burley|kentucky|dark fired/i },
  { family: 'Virginia', test: /virginia|flake/i },
];

/** Canonical tobacco family for a blend record, or null. */
export function familyOf(blend = {}) {
  const raw = String(blend.blend_family || blend.blend_type || '').trim();
  if (!raw) return null;
  const match = FAMILY_RULES.find((rule) => rule.test.test(raw));
  return match ? match.family : raw;
}

const CHAMBER_LABELS = {
  small: 'small chamber',
  medium: 'medium chamber',
  large: 'large chamber',
  'extra large': 'extra-large chamber',
  'extra-large': 'extra-large chamber',
};

function recordedCharacteristics(pipe = {}) {
  const rows = [];
  const push = (label, value, unit = '') => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: unit ? `${value} ${unit}` : String(value) });
  };
  push('Shape', pipe.shape && pipe.shape !== 'Unknown' ? pipe.shape : null);
  push('Bend', pipe.bend && pipe.bend !== 'Unknown' ? pipe.bend : null);
  push('Bowl material', pipe.bowl_material);
  push('Finish', pipe.finish);
  push('Stem material', pipe.stem_material);
  push('Chamber volume', CHAMBER_LABELS[String(pipe.chamber_volume || '').toLowerCase()] || pipe.chamber_volume);
  push('Chamber depth', pipe.bowl_depth_mm, 'mm');
  push('Chamber diameter', pipe.bowl_diameter_mm, 'mm');
  push('Weight', pipe.weight_grams, 'g');
  push('Length', pipe.length_mm, 'mm');
  push('Filter', pipe.filter_type);
  push('Condition', pipe.condition);
  return rows;
}

/** Sessions logged against this pipe, resolved to their blend family. */
export function pipeSessionEvidence(pipe = {}, smokingLogs = [], blends = []) {
  const blendById = new Map(blends.map((blend) => [blend.id, blend]));
  const logs = (smokingLogs || []).filter((log) => {
    const id = log.pipe_id || log.pipeId || log.pipe?.id;
    return id && id === pipe.id;
  });

  const familyCounts = new Map();
  const blendsByFamily = new Map();
  logs.forEach((log) => {
    const blendId = log.blend_id || log.blendId || log.blend?.id;
    const blend = blendById.get(blendId) || log.blend || null;
    const family = blend ? familyOf(blend) : null;
    if (!family) return;
    familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
    if (!blendsByFamily.has(family)) blendsByFamily.set(family, new Set());
    if (blend?.name) blendsByFamily.get(family).add(blend.name);
  });

  const total = logs.length;
  const ranked = [...familyCounts.entries()].sort((a, b) => b[1] - a[1]);
  const dominant = ranked[0] || null;
  return {
    sessionCount: total,
    families: ranked.map(([family, count]) => ({
      family,
      count,
      ratio: total ? count / total : 0,
      blends: [...(blendsByFamily.get(family) || [])],
    })),
    dominantFamily: dominant ? dominant[0] : null,
    dominanceRatio: dominant && total ? dominant[1] / total : 0,
  };
}

function confidenceFor({ sessionCount, ratio }) {
  if (sessionCount >= 5 && ratio >= 0.6) return 'high';
  if (sessionCount >= 2 && ratio >= 0.45) return 'medium';
  return 'low';
}

function characteristicRationale(family, pipe = {}) {
  const chamber = String(pipe.chamber_volume || '').toLowerCase();
  const wide = chamber === 'large' || chamber === 'extra large';
  const narrow = chamber === 'small';
  const bent = /bent|s-bend/i.test(String(pipe.bend || ''));
  const briar = /briar/i.test(String(pipe.bowl_material || ''));
  const notes = [];

  if (family === 'English/Balkan') {
    if (wide) notes.push('its generous chamber lets a Latakia-heavy blend spread and burn cooler');
    else notes.push('English mixtures reward a chamber deep enough to hold a full fill without crowding');
  } else if (family === 'Virginia' || family === 'Virginia/Perique') {
    if (briar) notes.push('briar holds a Virginia cake that sweetens with consistent use');
    if (narrow) notes.push('a narrower chamber keeps a fine-cut Virginia from burning hot');
  } else if (family === 'Burley') {
    if (bent) notes.push('a bent shape hangs comfortably, which suits a blend that needs little attention');
    notes.push('Burley burns dry and leaves a neutral cake');
  } else if (family === 'Aromatic') {
    notes.push('aromatic toppings carry into the cake, so a pipe used this way stays in that lane');
  } else if (family === 'Virginia/Oriental') {
    notes.push('Oriental-forward mixtures stay expressive in a chamber that does not overheat');
  }

  if (!notes.length) notes.push('no recorded characteristic argues strongly either way');
  return notes.join('; ');
}

/**
 * Build the review.
 *
 * @param {{ pipe: object, smokingLogs: object[], blends: object[] }} input
 */
export function buildSpecializationReview({ pipe = {}, smokingLogs = [], blends = [] } = {}) {
  const evidence = pipeSessionEvidence(pipe, smokingLogs, blends);
  const current = Array.isArray(pipe.focus) ? pipe.focus.filter(Boolean) : [];
  const characteristics = recordedCharacteristics(pipe);
  const alternatives = [];
  const seen = new Set();

  const MAX_ALTERNATIVES = 4;

  // 1. Every family the pipe's own sessions actually used, strongest first.
  //    Each one carries its own session count, so a family that has been smoked
  //    is never later described as having no sessions.
  evidence.families.forEach((entry) => {
    alternatives.push({
      classification: entry.family,
      confidence: confidenceFor({ sessionCount: entry.count, ratio: entry.ratio }),
      basis: 'session history',
      rationale: `${entry.count} of ${evidence.sessionCount} logged sessions used ${entry.family} blends${
        entry.blends.length ? ` (${entry.blends.slice(0, 3).join(', ')})` : ''
      }. ${characteristicRationale(entry.family, pipe)}.`,
      characteristics: characteristics.map((row) => row.label),
    });
    seen.add(entry.family);
  });

  // 2. Families in the cellar this pipe has genuinely never been used with.
  const unusedFamilies = [...new Set(blends.map(familyOf).filter(Boolean))]
    .filter((family) => !seen.has(family))
    .slice(0, Math.max(0, MAX_ALTERNATIVES - alternatives.length));

  unusedFamilies.forEach((family) => {
    alternatives.push({
      classification: family,
      confidence: 'low',
      basis: 'pipe characteristics only',
      rationale: `No sessions with ${family} blends are recorded for this pipe. ${characteristicRationale(family, pipe)}.`,
      characteristics: characteristics.map((row) => row.label),
    });
    seen.add(family);
  });

  const topAlternative = alternatives[0] || null;
  const proposed = topAlternative
    && topAlternative.basis === 'session history'
    && topAlternative.confidence !== 'low'
    && !current.includes(topAlternative.classification)
    ? { focus: [topAlternative.classification], confidence: topAlternative.confidence }
    : null;

  return {
    pipeId: pipe.id,
    pipeName: pipe.name || 'Pipe',
    current,
    characteristics,
    evidence,
    alternatives,
    proposed,
    evidenceClass: evidence.sessionCount === 0
      ? 'none'
      : confidenceFor({ sessionCount: evidence.families[0]?.count || 0, ratio: evidence.dominanceRatio }),
    pairingScoresUsed: false,
  };
}

/** Grounding text handed to the LLM so the reply cannot drift into scores. */
export function reviewToPromptBlock(review) {
  if (!review) return '';
  const alternatives = review.alternatives
    .map((alt, index) => `${index + 1}. ${alt.classification} — confidence ${alt.confidence} (${alt.basis}). ${alt.rationale}`)
    .join('\n');
  return `SPECIALIZATION REVIEW (grounded data — do not recompute or quote pairing scores):
Pipe: ${review.pipeName}
Current dedication: ${review.current.length ? review.current.join(', ') : 'none recorded'}
Recorded characteristics: ${review.characteristics.map((row) => `${row.label}: ${row.value}`).join(', ') || 'none recorded'}
Session evidence: ${review.evidence.sessionCount} logged sessions${review.evidence.dominantFamily ? `, dominant family ${review.evidence.dominantFamily} (${Math.round(review.evidence.dominanceRatio * 100)}%)` : ''}
Candidate classifications:
${alternatives || 'No candidates — record more characteristics or sessions.'}
Explain these alternatives and their rationale in your own words. State each confidence level. Do not describe these as pairing scores and do not promise an outcome.`;
}