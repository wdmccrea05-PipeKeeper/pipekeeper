# User Normalization & Deduplication Guide

## Overview

Admin function `adminNormalizeUsers` consolidates duplicate user records created through:
- Apple login vs email/password signup
- Trial gating creating "shadow" accounts  
- Accidental double sign-ups

## Running the Migration

### Step 1: Dry-Run (Always Safe)

Test without changes:
```
https://your-app.base44.app/api/functions/adminNormalizeUsers?dryRun=1
```

Returns JSON report showing what would be merged (no changes made).

### Step 2: Review Report

Check:
- ✅ Correct canonical user (strongest subscription)
- ✅ Provider set correctly (not defaulting to Apple)
- ✅ Stripe customer ID preserved

### Step 3: Execute

Run without `dryRun`:
```
https://your-app.base44.app/api/functions/adminNormalizeUsers
```

This:
1. Consolidates users by email (case-insensitive)
2. Reassigns all Pipes, Tobacco, Logs, Comments to canonical user
3. Marks duplicates with `merged_into_user_id` and `is_disabled=true`
4. Sets authoritative provider and stripe_customer_id

### Step 4: Target Specific Email (Optional)

Test one email first:
```
https://your-app.base44.app/api/functions/adminNormalizeUsers?email=alice@example.com&dryRun=1
```

## Canonical User Selection (Scoring)

1. Active Pro: 1000 pts
2. Active Premium: 800 pts
3. Founding member: 500 pts
4. Has stripe_customer_id: 200 pts
5. Most recent updated_at: 50 pts
6. Oldest created_at: 10 pts (tiebreaker)

## Provider Selection

- If **any** user has `stripe_customer_id` OR `platform="web"` → **"stripe"**
- Else if **any** user has `subscription_provider="apple"` OR `platform="ios"` → **"apple"**
- Else keep existing provider
- Never default to Apple

## What Gets Reassigned

| Entity | Field |
|--------|-------|
| Pipe | user_id |
| TobaccoBlend | user_id |
| SmokingLog | user_id |
| CellarLog | user_id |
| PipeMaintenanceLog | user_id |
| TobaccoContainer | user_email |
| UserConnection | follower_email / following_email |
| Comment | commenter_email |

## Safety

✅ Dry-run mode  
✅ Admin-only access  
✅ Target-specific email testing  
✅ Detailed logging  
✅ Idempotent (safe to run multiple times)