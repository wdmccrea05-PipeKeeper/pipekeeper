import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, actionType, requestId } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'No prompt provided' }, { status: 400 });
    }

    // Call the LLM integration — use claude_sonnet_4_6 for collector-grade domain knowledge
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      model: 'claude_sonnet_4_6',
    });

    // Normalize: InvokeLLM without response_json_schema returns a string directly
    const text = typeof result === 'string' ? result : (result?.text || result?.content || result?.result || JSON.stringify(result));

    return Response.json(text);
  } catch (error) {
    console.error('invokeCuratorLLM error:', error);
    return Response.json(
      { error: error?.message || 'Failed to invoke curator model' },
      { status: 500 }
    );
  }
});