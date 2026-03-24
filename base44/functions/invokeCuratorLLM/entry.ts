import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    // Call the LLM integration
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });

    return Response.json(result);
  } catch (error) {
    console.error('invokeCuratorLLM error:', error);
    return Response.json(
      { error: error?.message || 'Failed to invoke curator model' },
      { status: 500 }
    );
  }
});