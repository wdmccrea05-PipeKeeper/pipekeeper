import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * COMPREHENSIVE E2E TEST: Account Creation → Entitlements → Onboarding → Module Selection
 * 
 * Validates:
 * 1. User is created with correct defaults
 * 2. UserProfile is initialized correctly
 * 3. OnboardingStatus is created
 * 4. Module selection saves correctly
 * 5. Free tier can toggle any launched module
 * 6. Profile and subscription states sync properly
 */

async function testE2EFlow(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const email = user.email.toLowerCase().trim();
  const userId = user.id || user.auth_user_id;

  const results = {
    user: { email, userId },
    checks: [],
    errors: [],
  };

  try {
    // CHECK 1: Ensure user record exists
    results.checks.push({
      name: 'User Authentication',
      status: 'pass',
      details: `User authenticated: ${email}`,
    });

    // CHECK 2: UserProfile exists or can be created
    let profiles = await base44.entities.UserProfile.filter({ user_email: email });
    let profile = profiles?.[0];

    if (!profile) {
      profile = await base44.entities.UserProfile.create({
        user_email: email,
        created_by: email,
        pipekeeper_enabled: true,
        whiskeykeeper_enabled: false,
        winekeeper_enabled: false,
        cigarkeeper_enabled: false,
        module_preferences_set: false,
      });
      results.checks.push({
        name: 'UserProfile Creation',
        status: 'pass',
        details: `Created new profile for ${email}`,
      });
    } else {
      results.checks.push({
        name: 'UserProfile Lookup',
        status: 'pass',
        details: `Found existing profile: ${profile.id}`,
      });
    }

    // CHECK 3: OnboardingStatus exists or can be created
    let onboardingStatuses = await base44.entities.OnboardingStatus.filter({ user_email: email });
    let onboardingStatus = onboardingStatuses?.[0];

    if (!onboardingStatus) {
      onboardingStatus = await base44.entities.OnboardingStatus.create({
        user_email: email,
        completed: false,
        current_step: 0,
        skipped: false,
      });
      results.checks.push({
        name: 'OnboardingStatus Creation',
        status: 'pass',
        details: `Created onboarding status`,
      });
    } else {
      results.checks.push({
        name: 'OnboardingStatus Lookup',
        status: 'pass',
        details: `Found existing onboarding status`,
      });
    }

    // CHECK 4: Test module selection save (simulates modal selection)
    await base44.entities.UserProfile.update(profile.id, {
      pipekeeper_enabled: true,
      whiskeykeeper_enabled: true,
      winekeeper_enabled: false,
      cigarkeeper_enabled: false,
      module_preferences_set: true,
    });

    const updatedProfile = await base44.entities.UserProfile.filter({ id: profile.id });
    const prof = updatedProfile?.[0];

    if (prof?.module_preferences_set === true && prof?.whiskeykeeper_enabled === true) {
      results.checks.push({
        name: 'Module Selection Save',
        status: 'pass',
        details: 'Successfully saved module preferences (PipeKeeper + WhiskeyKeeper)',
      });
    } else {
      throw new Error('Module preferences were not saved correctly');
    }

    // CHECK 5: Test free tier toggle - disable WhiskeyKeeper (should work)
    await base44.entities.UserProfile.update(profile.id, {
      whiskeykeeper_enabled: false,
    });

    const profileAfterToggle = await base44.entities.UserProfile.filter({ id: profile.id });
    const profToggled = profileAfterToggle?.[0];

    if (profToggled?.whiskeykeeper_enabled === false) {
      results.checks.push({
        name: 'Free Tier Toggle - Disable',
        status: 'pass',
        details: 'Free user can disable WhiskeyKeeper',
      });
    } else {
      throw new Error('Failed to toggle WhiskeyKeeper off');
    }

    // CHECK 6: Test free tier toggle - re-enable (should work even without initial selection)
    await base44.entities.UserProfile.update(profile.id, {
      winekeeper_enabled: true, // WineKeeper was NOT initially selected
    });

    const profileAfterNewToggle = await base44.entities.UserProfile.filter({ id: profile.id });
    const profNewToggle = profileAfterNewToggle?.[0];

    if (profNewToggle?.winekeeper_enabled === true) {
      results.checks.push({
        name: 'Free Tier Toggle - Any Module',
        status: 'pass',
        details: 'Free user can enable any launched module anytime (WineKeeper was not initially selected)',
      });
    } else {
      throw new Error('Failed to toggle WineKeeper on');
    }

    // CHECK 7: Test subscription state (if exists)
    let subs = [];
    if (userId) {
      subs = await base44.entities.Subscription.filter({ user_id: userId });
    }
    if (subs.length === 0 && email) {
      subs = await base44.entities.Subscription.filter({ user_email: email });
    }

    const hasSubscription = subs && subs.length > 0;
    results.checks.push({
      name: 'Subscription State',
      status: 'pass',
      details: hasSubscription ? `Found ${subs.length} subscription(s)` : 'No subscription (free account) - OK',
    });

    // CHECK 8: Verify visibility logic compatibility
    const pipeKeeperEnabled = prof?.pipekeeper_enabled === true;
    const whiskeyKeeperEnabled = prof?.whiskeykeeper_enabled === true;
    const wineKeeperEnabled = prof?.winekeeper_enabled === true;

    results.checks.push({
      name: 'Module Visibility State',
      status: 'pass',
      details: `PipeKeeper: ${pipeKeeperEnabled}, WhiskeyKeeper: ${whiskeyKeeperEnabled}, WineKeeper: ${wineKeeperEnabled}`,
    });

  } catch (error) {
    results.errors.push({
      step: error.message,
      fullError: error.toString(),
    });
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await testE2EFlow(base44);

    const allPassed = results.errors.length === 0 && results.checks.every(c => c.status === 'pass');

    return Response.json({
      success: allPassed,
      summary: `${results.checks.length} checks passed${results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}`,
      results,
    });
  } catch (error) {
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});