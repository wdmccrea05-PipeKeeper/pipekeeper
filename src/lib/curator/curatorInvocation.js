/**
 * curatorInvocation.js
 *
 * One place that calls the Curator model, so no surface can await a backend
 * forever. The call is bounded by a timeout and always resolves to a result
 * object — the chat can then report a timeout honestly instead of freezing.
 */

export const CURATOR_TIMEOUT_MS = 45000;

/** Pull assistant text out of the shapes invokeCuratorLLM can return. */
export function extractCuratorReply(response) {
  const data = response?.data ?? response;
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  const candidate = data.result || data.text || data.content || data.reply || '';
  if (typeof candidate === 'string') return candidate.trim();
  if (candidate && typeof candidate === 'object') {
    const nested = candidate.text || candidate.content || candidate.reply || '';
    if (typeof nested === 'string') return nested.trim();
  }
  return '';
}

/**
 * Invoke Curator with a hard timeout.
 *
 * @returns {Promise<{ok: boolean, text?: string, error?: string, timedOut: boolean, durationMs: number}>}
 */
export async function invokeCuratorWithTimeout({
  prompt,
  invoke,
  timeoutMs = CURATOR_TIMEOUT_MS,
} = {}) {
  const startedAt = Date.now();
  if (typeof invoke !== 'function') {
    return { ok: false, timedOut: false, error: 'No Curator endpoint available', durationMs: 0 };
  }

  let timer;
  try {
    const response = await Promise.race([
      invoke(prompt),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error('Curator request timed out');
          error.code = 'CURATOR_TIMEOUT';
          reject(error);
        }, timeoutMs);
      }),
    ]);

    const text = extractCuratorReply(response);
    const durationMs = Date.now() - startedAt;
    if (!text) return { ok: false, timedOut: false, error: 'Empty response', durationMs };
    return { ok: true, text, timedOut: false, durationMs };
  } catch (error) {
    return {
      ok: false,
      timedOut: error?.code === 'CURATOR_TIMEOUT',
      error: error?.message || 'Curator request failed',
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Plain-language message for a failed Curator call. */
export function describeCuratorFailure(result) {
  if (result?.timedOut) {
    return 'That took longer than expected, so I stopped waiting rather than leaving you hanging. Ask again and I will retry — your question was not lost.';
  }
  return 'I could not complete that answer just now. Nothing in your collection was changed. Ask again, or narrow it to one item and I will work from that record.';
}