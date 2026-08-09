/**
 * curatorChatIntent.js
 *
 * Intent classification for Curator Console chat.
 *
 * Extracted from ExpertTobacconistChat.jsx so it can be unit-tested
 * independently of the React component (which triggers @vitejs/plugin-react
 * preamble detection issues in the test runner).
 *
 * Priority order:
 *   1. Constraint detection (context-sensitive — qualifiers are only
 *      constraints when NOT part of a recommendation request)
 *   2. Next-candidate follow-up
 *   3. User correction
 *   4. Generic follow-up / comparison
 *   5. Collection impact / replacement
 *   6. Explain pairing
 *   7. Pairing score query
 *   8. Direct recommendation
 *   9. Session recommendation
 *  10. Restock / gap / redundancy / reassignment / evaluate / value / inventory
 *  11. Purchase budget / lineup / sleeper / unused
 *  12. UNKNOWN
 */

import { isRecommendationRequest } from './conversationState.js';

/**
 * Classify the intent of a user message in the Curator Console.
 *
 * @param {string} message — Raw user message
 * @returns {string} — Intent label (e.g., 'DIRECT_RECOMMENDATION', 'FOLLOW_UP_CONSTRAINT')
 */
export function classifyIntent(message) {
  const t = message.toLowerCase().trim();

  // CONSTRAINT DETECTION — context-sensitive
  //
  // Qualifier words like "non-aromatic" are only constraints when they modify
  // a pipe/item the user wants to restrict (e.g., "keep it non-aromatic").
  // When they describe what the user wants to take/smoke (e.g., "an aromatic
  // and a non-aromatic blend"), they are part of the recommendation criteria,
  // not standalone constraints.
  //
  // Rule: if the message is a recommendation request, skip constraint
  // classification — the qualifiers are criteria, not constraints.
  if (!isRecommendationRequest(message)) {
    const constraintPatterns = [
      /\b(i want to|i don't want to|i don't want|i prefer|i prefer to|i use it for|i keep it for|i only use|it's only for|only for|never for|never used for|leave it|keep it as)\b/i,
      /\b(non-aromatic|aromatic-only|english-only|virginia-only|burley-only|constraint|exclude|don't suggest)\b/i,
    ];
    if (constraintPatterns.some((p) => p.test(t))) return 'FOLLOW_UP_CONSTRAINT';
  }

  const nextCandidatePatterns = [
    /\b(what is the next|what's the next|what's next|next best|next one|next strongest|next candidate|second.?best|after that|who's next|what comes after)\b/i,
    /^(and )?next[?.]?$/i,
    /\bwhat about the next\b/i,
  ];
  if (nextCandidatePatterns.some((p) => p.test(t))) return 'FOLLOW_UP_NEXT_CANDIDATE';

  const correctionPatterns = [
    /\bbut (i have it|i use it|i don't|it never|it isn't|it is not|i already)\b/i,
    /\b(that'?s? not right|that'?s? wrong|that'?s? incorrect|that'?s? not accurate)\b/i,
    /\bit never (smoked|seen|had|been used for|been assigned)\b/i,
    /\bi (use|have|keep) it (for|as) (only|exclusively|just|aromatic|english|virginia|burley)/i,
    /\b(never smoked|never used|never had)\b/i,
    /\b(already on my (list|shopping list|want list|wishlist)|already (tracked|listed|owned|in my|classified|specialized|assigned))\b/i,
    /\bi already (have|own|have it|own it|tracked|added|listed)\b/i,
    /\b(that bottle is already|that blend is already|that pipe is already)\b/i,
    /\bactually[,.]? (it|that|i|no)\b/i,
    /^(no[,.]|nope[,.]|not quite[,.]|that'?s? not|but it|but i|but that)\b/i,
    /\bi don't use it that way\b/i,
  ];
  if (correctionPatterns.some((p) => p.test(t))) return 'USER_CORRECTION';

  const followUpPattern = /\b(it|that|this one|this pipe|that pipe|this blend|that blend|this bottle|that bottle|the one|how does it|how does that|how does this|where does it|is it redundant|what would you do with it|how does it compare|why that one|what about the other)\b/i;
  const comparisonPattern = /\b(compare|redundant|overlap|where does it sit|how does it fit)\b/i;
  if (followUpPattern.test(t) || comparisonPattern.test(t)) return 'FOLLOW_UP';

  // Collection impact / replacement queries — always go to LLM
  if (/\b(replacing|replace|swap|switching|removing|adding|substitut)\b/i.test(t) &&
      /\b(effect|impact|change|affect|difference|collection|cellar|profile|gap|coverage)\b/i.test(t)) return 'COLLECTION_IMPACT';

  if (/\b(pairing|pair with|pair together|combine|combination|explain why .+ work together)\b/i.test(t)) return 'EXPLAIN_PAIRING';

  // PAIRING_SCORE_QUERY — questions about pairing scores, ratings, best/worst pairings
  const pairingScorePatterns = [
    /\b(pairing.*(score|rating|rated|rank)|score.*(pairing|pair)|rating.*(pairing|pair))\b/i,
    /\b(best|worst|highest|lowest|top|weakest|strongest).*(pairing|pair|match|compatibility)\b/i,
    /\b(pairing|pair).*(best|worst|highest|lowest|top|weakest|strongest)\b/i,
    /\b(score|scored|rating|rated).*(under|below|above|higher|lower|greater|less than|at least|or (lower|higher))\b/i,
    /\b(under|below|above|higher|lower).*(score|scored|rating|rated)\b/i,
    /\b(show|list|find|what).*(pairing|pair).*(score|rated|rating|low|high)\b/i,
    /\b(low|high|weak|poor|best|top).*(rated|scored).*(pairing|pair)\b/i,
    /\b(compatibility|compatible|goes with|smoke with|pipe for|tobacco for)\b/i,
  ];
  if (pairingScorePatterns.some((p) => p.test(t))) return 'PAIRING_SCORE_QUERY';

  // DIRECT RECOMMENDATION — explicit ask for a suggestion/recommendation (must come before SESSION_RECOMMENDATION)
  const directRecPatterns = [
    /\b(what (is|would be|should i|do you recommend|would you recommend)|which (blend|tobacco|pipe|bottle)|recommend (a|an|some|the best)|good (blend|tobacco|pipe|bottle)|suggest (a|an)|what.*(good|smooth|mild|full|strong|light).*(blend|tobacco|smoke|pipe|bottle)|good.*to smoke|good.*with (coffee|tea|whiskey|beer|food|meal)|what.*go(es)? with|pair with coffee|pair with tea|what.*for (morning|evening|night|afternoon|after dinner|mid-morning|bedtime))\b/i,
    /\bwhat (blend|tobacco|pipe|bottle|whiskey|smoke) (should|would|do you|can you|could you)\b/i,
    /\b(is there a|are there any|any (good|recommended|suggestions for)) (blend|tobacco|pipe|bottle|whiskey)\b/i,
  ];
  if (directRecPatterns.some((p) => p.test(t))) return 'DIRECT_RECOMMENDATION';

  if (/\b(tonight|enjoy|smoke|drink|open next|session|use|revisit|rediscover|haven.?t used|haven.?t had)\b/i.test(t)) return 'SESSION_RECOMMENDATION';
  if (/\b(restock|running low|running out|buy next|replenish)\b/i.test(t)) return 'RESTOCK_ADVICE';
  if (/\b(gap|missing|biggest gap|collection gap)\b/i.test(t)) return 'GAP_ANALYSIS';
  if (/\b(redundant|most redundant|overlap)\b/i.test(t)) return 'COLLECTION_ANALYSIS';

  const reassignPatterns = [
    /\b(reassign|reassignment|respecializ|re-specializ)\b/i,
    /\b(change (specialization|focus|role)|new role|different role|better suited elsewhere|better specialization)\b/i,
    /\b(no longer fits|doesn.?t fit).*(specializ|focus|role|lane)/i,
    /\b(benefit.*(reassign|respecializ|new role|different role))/i,
    /\b(strongest|best).*(reassignment|respecializ|candidate)/i,
    /\b(which|what) pipe.*(reassign|respecializ|should change|new specializ|no longer fits)/i,
  ];
  if (reassignPatterns.some((p) => p.test(t))) return 'PIPE_REASSIGNMENT_ANALYSIS';

  if (/\b(evaluate|assess|how does .+ fit|where does .+ sit|role of)\b/i.test(t)) return 'EVALUATE_OWNED_ITEM';

  if (/\b(how much|what.*(worth|value|valued|valuable|price)|value of|most valuable|least valuable|insure|insurance)\b/i.test(t)) return 'VALUE_QUERY';
  if (/\b(what do i (own|have)|how many|list (my|all)|show me|inventory|do i have any|which (blends|pipes|bottles) do i)\b/i.test(t)) return 'INVENTORY_QUERY';
  if (/\b(budget|under \$|spend|afford|price range|best.*for \$|cheap|expensive|bang for|worth the money)\b/i.test(t)) return 'PURCHASE_BUDGET';
  if (/\b(weekend|week lineup|lineup|schedule|plan (for|my|a)|rotation plan|week.*smoke|smoke.*week)\b/i.test(t)) return 'LINEUP_PLANNING';
  if (/\b(sleeper|underrated|hidden gem|overlooked|not enough credit|underappreciated|undervalued)\b/i.test(t)) return 'SLEEPER_QUERY';
  if (/\b(haven.?t (touched|used|smoked|opened|had)|not used|sitting untouched|sitting idle|collecting dust|unopened)\b/i.test(t)) return 'UNUSED_QUERY';

  return 'UNKNOWN';
}

export default classifyIntent;