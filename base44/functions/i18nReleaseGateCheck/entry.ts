import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Release gate check - fails build if validation fails
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        passed: false, 
        errors: ['Unauthorized - admin required'] 
      }, { status: 403 });
    }

    // Invoke the validator
    const validateRes = await base44.asServiceRole.functions.invoke('i18nReleaseGateValidator', {
      runCheck: true
    });

    if (!validateRes?.data?.success) {
      return Response.json({
        passed: false,
        errors: validateRes?.data?.errors || ['Validation failed']
      }, { status: 400 });
    }

    return Response.json({ 
      passed: true, 
      message: 'Release gate check passed' 
    });
  } catch (error) {
    return Response.json({ 
      passed: false,
      errors: [error.message] 
    }, { status: 500 });
  }
});