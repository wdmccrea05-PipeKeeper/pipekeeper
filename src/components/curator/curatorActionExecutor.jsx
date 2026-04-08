/**
 * curatorActionExecutor.jsx
 *
 * Low-level LLM call layer for Curator action workflows.
 *
 * Strategy:
 *   1. Try base44.functions.invoke('invokeCuratorLLM', payload) — the dedicated
 *      server-side function with prompt caching, rate-limiting, and logging.
 *   2. On any failure, fall back to base44.integrations.Core.InvokeLLM directly.
 *
 * The result is always parsed JSON matching:
 *   { summary: string, items: ActionItem[] }
 *
 * Throws with a user-facing message when no usable response is produced.
 */

import { base44 } from '@/api/base44Client';
import { buildSafeCollectionContext, buildPromptBlock } from './collectionContextBudget';

/**
 * Execute a Curator action against the LLM and return the parsed result.
 *
 * @param {{
 *   actionType: string,
 *   context:    object,   // raw collection context { pipes, blends, bottles, ... }
 *   requestId:  string,
 * }} options
 *
 * @returns {Promise<{ summary: string, items: object[] }>}
 */
export default async function curatorActionExecutor({ actionType, context, requestId } = {}) {
  // Build a token-safe compressed context block for the prompt
  const safeContext = buildSafeCollectionContext(context || {});
  const contextBlock = buildPromptBlock(safeContext);

  const payload = {
    actionType,
    contextBlock,
    requestId: requestId || `req_${Date.now()}`,
  };

  let responseText;

  // ── Primary path: dedicated server function ─────────────────────────────
  try {
    const fnResult = await base44.functions.invoke('invokeCuratorLLM', payload);
    responseText = typeof fnResult === 'string' ? fnResult : fnResult?.result;
  } catch {
    // Fall through to direct LLM call
  }

  // ── Fallback: direct InvokeLLM integration ───────────────────────────────
  if (!responseText) {
    try {
      responseText = await base44.integrations.Core.InvokeLLM({
        prompt: `Action type: ${actionType}\n\n${contextBlock}`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            items: { type: 'array' },
          },
        },
      });
    } catch (err) {
      throw new Error(`Curator LLM call failed: ${err?.message || err}`);
    }
  }

  if (!responseText) {
    throw new Error('Curator returned no response.');
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  const text = typeof responseText === 'string' ? responseText.trim() : '';
  if (!text) {
    throw new Error('Curator returned no response.');
  }

  try {
    return JSON.parse(text);
  } catch {
    // Try fenced code block
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    // Try bare object
    const bare = text.match(/\{[\s\S]*\}$/);
    if (bare?.[0]) return JSON.parse(bare[0]);

    throw new Error('Curator response was not valid JSON.');
  }
}
