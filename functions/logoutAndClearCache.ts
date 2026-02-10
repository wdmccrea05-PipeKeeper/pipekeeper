import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Sign out the user
    await base44.auth.logout();
    
    return Response.json({ 
      success: true,
      message: 'Logged out successfully. Please refresh the page and clear browser cache (Ctrl+Shift+R or Cmd+Shift+R).'
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});