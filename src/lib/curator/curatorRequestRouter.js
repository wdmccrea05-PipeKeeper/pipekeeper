/**
 * curatorRequestRouter.js
 *
 * Decides what an incoming Curator message is asking for before any model call:
 * a reversal, a product-boundary refusal, a report, or a concrete record change
 * with a preview. Everything it returns is either grounded in the collector's
 * records or an honest statement that it could not resolve the request.
 */

import {
  BOUNDARY_REFUSAL,
  buildConversationalReport,
  detectPurchaseBoundaryRequest,
  detectReportRequest,
} from './curatorGrounding.js';
import {
  buildChangeProposal,
  buildChangeProposals,
  detectRecordChangeRequest,
  detectUndoRequest,
  formatAmbiguity,
  formatProposalSet,
} from './curatorRecordChanges.js';
import { appGuidance } from './curatorAppGuidance.js';

const REASON_MESSAGES = {
  module_locked: 'That module is not enabled on this account, so I cannot change its records. Turn it on and I will show you the change first.',
  unknown_storage: 'I could not match that to a storage location you have recorded. Tell me the exact name of the location and I will use it.',
  no_match: 'I could not find that item in your collection. Give me the name exactly as it appears on the record and I will show you the change before anything is written.',
  unsupported_field: 'I can change storage location, tags, specialization, condition, classification, notes and provenance fields. Tell me which of those you want changed.',
  no_records: 'I do not have your collection records loaded, so I will not guess at a change.',
  merge_entity_mismatch: 'Those two records live in different modules, so they cannot be merged.',
  no_change: 'That record already reads the way you described, so there is nothing to change.',
  unparsed: null,
};

/**
 * @returns {{kind: 'none'|'undo'|'proposal'|'message', content?: string, proposal?: object, report?: object}}
 */
export function routeCuratorRequest({
  text,
  collections = {},
  storageLocations = [],
  enabledModules = {},
  context = {},
} = {}) {
  if (detectUndoRequest(text)) return { kind: 'undo' };

  const boundary = detectPurchaseBoundaryRequest(text);
  if (boundary) return { kind: 'message', content: BOUNDARY_REFUSAL, boundary: true };

  const guidance = appGuidance(text, enabledModules);
  if (guidance) return { kind: 'message', ...guidance };

  const report = detectReportRequest(text);
  if (report) return { kind: 'message', content: buildConversationalReport(context, report), report };

  if (!detectRecordChangeRequest(text)) return { kind: 'none' };

  // A message that asks for several separate changes becomes several
  // independent actions, each accepted or left on its own.
  const batch = buildChangeProposals({ text, collections, storageLocations, enabledModules });
  if (batch.length > 0) {
    const proposals = batch.map((entry) => entry.proposal);
    return {
      kind: 'proposal',
      proposal: proposals[0],
      proposals,
      content: formatProposalSet(proposals),
    };
  }

  const result = buildChangeProposal({ text, collections, storageLocations, enabledModules });

  if (result.reason === 'ambiguous') {
    return {
      kind: 'message',
      content: formatAmbiguity(result.candidates || []) || REASON_MESSAGES.no_match,
    };
  }

  const message = REASON_MESSAGES[result.reason];
  if (!message) return { kind: 'none' };
  return { kind: 'message', content: message };
}