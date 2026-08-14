import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { classifyIntegrationError } from '../../shared/integrationTelemetry.ts';

const RESPONSE_CACHE = new Map<string, { text: string; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 250;

function approximateTokens(text: string) {
  // Lightweight heuristic for observability only (not billing-grade tokenization).
  return Math.max(0, Math.ceil(String(text || '').length / 4));
}

function approximateCredits(promptTokens: number, completionTokens: number) {
  // Coarse credit model for trend/forecast analytics (1 credit ~ 900 tokens combined).
  const totalTokens = promptTokens + completionTokens;
  return Math.max(1, Math.ceil(totalTokens / 900));
}

function normalizePrompt({ prompt, actionType, contextBlock }: { prompt?: string; actionType?: string; contextBlock?: string }) {
  const directPrompt = String(prompt || '').trim();
  if (directPrompt) return directPrompt;

  const compactContext = String(contextBlock || '').trim();
  if (!compactContext) return '';

  return `Action type: ${actionType || 'curator_action'}\n\n${compactContext}`;
}

function getCacheKey({ userEmail, actionType, prompt }: { userEmail: string; actionType?: string; prompt: string }) {
  const normalizedPrompt = String(prompt || '');
  return `${userEmail}|${actionType || 'default'}|${normalizedPrompt}`;
}

function pruneCache() {
  const now = Date.now();
  for (const [key, value] of RESPONSE_CACHE.entries()) {
    if (now - value.cachedAt > CACHE_TTL_MS) {
      RESPONSE_CACHE.delete(key);
    }
  }

  if (RESPONSE_CACHE.size <= MAX_CACHE_ENTRIES) return;
  const sorted = [...RESPONSE_CACHE.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
  const removeCount = RESPONSE_CACHE.size - MAX_CACHE_ENTRIES;
  for (let i = 0; i < removeCount; i += 1) {
    RESPONSE_CACHE.delete(sorted[i][0]);
  }
}

async function resolveUserTier(base44: any, user: any) {
  if (user?.role === 'admin') return 'admin';
  if (String(user?.subscription_level || '').toLowerCase() === 'paid') return 'paid';

  try {
    const activeSubs = await base44.entities.Subscription.filter({
      user_email: String(user?.email || '').toLowerCase(),
      status: 'active',
    });
    return activeSubs?.length ? 'paid' : 'free';
  } catch {
    return 'unknown';
  }
}

async function trackUsage(base44: any, payload: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.SubscriptionIntegrationEvent.create({
      event_source: 'curator',
      event_type: 'invokeCuratorLLM',
      success: Boolean(payload.success),
      error: payload.error ? String(payload.error) : null,
      user_id: payload.user_id ? String(payload.user_id) : null,
      email: payload.email ? String(payload.email) : null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      payload_json: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('invokeCuratorLLM usage tracking failed:', error);
  }
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, actionType, contextBlock, requestId } = await req.json();
    const resolvedPrompt = normalizePrompt({ prompt, actionType, contextBlock });

    if (!resolvedPrompt) {
      return Response.json({ error: 'No prompt provided' }, { status: 400 });
    }

    pruneCache();
    const cacheKey = getCacheKey({
      userEmail: String(user.email || '').toLowerCase(),
      actionType,
      prompt: resolvedPrompt,
    });
    const cached = RESPONSE_CACHE.get(cacheKey);
    const userTier = await resolveUserTier(base44, user);
    const baseUsagePayload = {
      endpoint: 'invokeCuratorLLM',
      function_name: 'invokeCuratorLLM',
      feature: 'curator.question',
      feature_area: 'curator',
      module: 'shared_shell',
      frequency_bucket: 'per_request',
      request_id: requestId || null,
      action_type: actionType || null,
      user_tier: userTier,
      is_admin_usage: user?.role === 'admin',
      user_id: user?.id || null,
      email: user?.email || null,
    };

    if (cached && Date.now() - cached.cachedAt <= CACHE_TTL_MS) {
      const promptTokens = approximateTokens(resolvedPrompt);
      const completionTokens = approximateTokens(cached.text);
      const estimatedCredits = approximateCredits(promptTokens, completionTokens);
      await trackUsage(base44, {
        ...baseUsagePayload,
        success: true,
        cached: true,
        estimated_prompt_tokens: promptTokens,
        estimated_completion_tokens: completionTokens,
        estimated_credits: estimatedCredits,
        billable_credits: 0,
        latency_ms: Date.now() - startedAt,
      });
      return Response.json({ result: cached.text, cached: true, request_id: requestId || null });
    }

    // Call the LLM integration — use claude_sonnet_4_6 for collector-grade domain knowledge
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: resolvedPrompt,
      add_context_from_internet: false,
      model: 'claude_sonnet_4_6',
    });

    // Normalize: InvokeLLM without response_json_schema returns a string directly
    const text = typeof result === 'string' ? result : (result?.text || result?.content || result?.result || JSON.stringify(result));
    RESPONSE_CACHE.set(cacheKey, { text, cachedAt: Date.now() });

    const promptTokens = approximateTokens(resolvedPrompt);
    const completionTokens = approximateTokens(text);
    await trackUsage(base44, {
      ...baseUsagePayload,
      success: true,
      cached: false,
      estimated_prompt_tokens: promptTokens,
      estimated_completion_tokens: completionTokens,
      estimated_credits: approximateCredits(promptTokens, completionTokens),
      billable_credits: approximateCredits(promptTokens, completionTokens),
      latency_ms: Date.now() - startedAt,
    });

    return Response.json({ result: text, cached: false, request_id: requestId || null });
  } catch (error) {
    console.error('invokeCuratorLLM error:', error);
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me().catch(() => null);
      const userTier = user ? await resolveUserTier(base44, user) : 'unknown';
      const errorCategory = classifyIntegrationError(error);
      await trackUsage(base44, {
        endpoint: 'invokeCuratorLLM',
        function_name: 'invokeCuratorLLM',
        feature: 'curator.question',
        feature_area: 'curator',
        module: 'shared_shell',
        frequency_bucket: 'per_request',
        request_id: null,
        action_type: null,
        user_tier: userTier,
        is_admin_usage: user?.role === 'admin',
        user_id: user?.id || null,
        email: user?.email || null,
        success: false,
        cached: false,
        error: error?.message || 'Failed to invoke curator model',
        error_category: errorCategory,
        latency_ms: Date.now() - startedAt,
      });
    } catch {
      // swallow secondary telemetry errors
    }
    return Response.json(
      { error: error?.message || 'Failed to invoke curator model' },
      { status: 500 }
    );
  }
});