# CollectionKeeper-First Onboarding + Subscription Refactor
## Implementation Guide & Architecture

**Status**: PHASE 1 COMPLETE (Canonical Access System Created)

---

## COMPLETED IN PHASE 1 ✅

### 1. **Canonical Access System** (NEW)
- **File**: `src/components/access/accessSummary.ts`
- **Exports**: `buildAccessSummary()`, types for `AccessSummary` and `ModuleKey`
- **Purpose**: Single source of truth for user access rights
- **Key Features**:
  - Maps Stripe products → modules (CRITICAL)
  - Handles founding members
  - Resolves tier, provider, status, modules from user + subscription

### 2. **Access Selectors** (NEW)
- **File**: `src/components/access/accessSelectors.ts`
- **Exports**: Query functions (hasPaidAccess, hasModuleAccess, canUseFeature, etc.)
- **Purpose**: Pure functions to query AccessSummary
- **Key Functions**:
  - `hasPaidAccess(summary)` → boolean
  - `hasModuleAccess(summary, moduleKey)` → boolean
  - `canUseFeature(summary, featureKey)` → boolean
  - `getVisibleModules(summary, hiddenModules)` → ModuleKey[]
  - `getLockedModules(summary)` → ModuleKey[] (for upsell)

### 3. **Access Index + Hook** (NEW)
- **File**: `src/components/access/index.ts` - main export
- **File**: `src/components/hooks/useAccessSummary.ts` - React hook
- **Purpose**: Easy access to canonical system from React components
- **Usage**:
  ```typescript
  const access = useAccessSummary()
  if (hasModuleAccess(access, 'pipekeeper')) { ... }
  ```

### 4. **Onboarding State Management** (NEW)
- **File**: `src/components/onboarding/onboardingState.ts`
- **Exports**: localStorage getters/setters for onboarding state
- **Persists**: Current step, selected modules, completion flag

---

## PHASE 2: ONBOARDING REFACTOR (NEXT)

### Goal
Replace PipeKeeper-first onboarding with CollectionKeeper-first.
Integrate module selection with new subscription pricing.

### Steps

#### 2a. Update ModuleSelectionStep
- **File to Update**: `src/components/onboarding/ModuleSelectionStep.jsx`
- **Changes**:
  - Make module selection bidirectional (not defaulting pipekeeper+whiskeykeeper)
  - Show only enabled modules (pipekeeper, whiskeykeeper) as selectable
  - Show upcoming modules (cigarkeeper, winekeeper) as "coming soon"
  - Update UI to say "At least one module required"
  - Use new onboardingState for persistence

#### 2b. Reorder OnboardingFlow Steps
- **File to Update**: `src/components/onboarding/OnboardingFlow.jsx`
- **Current order**: Welcome → Modules → Preferences → Priorities → Help → Features → Success
- **NO CHANGE NEEDED** - already in correct order
- **BUT**: Connect flow to subscription pricing
  - After module selection, determine if upgrade needed
  - If free + multi-module → show paywall
  - If pro → continue to preferences
  - Preserve selected modules across paywall

#### 2c. Create OnboardingPaywallBridge Component
- **File to Create**: `src/components/onboarding/OnboardingPaywallBridge.jsx`
- **Purpose**: Intelligently route users based on module selection
- **Logic**:
  ```
  selectedModules count:
    1 module → offer: free OR single module pro ($2.99)
    2 modules → suggest 3-module bundle
    3 modules → offer: free OR 3-module bundle
    4 modules → offer: free OR 4-module bundle
  ```
- **Behavior**:
  - If user selects modules, show upgrade modal
  - If they subscribe, return to onboarding
  - If they decline, allow free with fewer modules
  - Preserve selectedModules in state

#### 2d. Update OnboardingFlow to Call Bridge
- When module selection completes, check if free user
- If free + multi-module → show bridge
- Bridge handles upgrade flow
- Return to onboarding on success

---

## PHASE 3: PAYWALL REFACTOR (NEXT)

### Goal
Align paywall with new Stripe pricing model.

### Steps

#### 3a. Create PricingTier Component System
- **Files to Create**:
  - `src/components/subscription/PricingCard.jsx`
  - `src/components/subscription/PricingComparison.jsx`
  - `src/components/subscription/PricingCalculator.jsx` (optional UI helper)

- **Logic**:
  - Show user's current selection (e.g., "You selected 2 modules")
  - Show available plans for that selection
  - Example for 2 modules:
    ```
    Option 1: Free (limited)
    Option 2: Single Module Pro - $2.99/mo
    Option 3: 3-Module Bundle - $7.99/mo (recommended)
    ```

#### 3b. Update SubscriptionPage
- **File to Update**: `src/pages/Subscription.jsx`
- **Changes**:
  - Use new access system (buildAccessSummary)
  - Show current plan (from accessSummary.planKey)
  - Show upgrade paths based on current plan
  - Remove old tier comparisons
  - Add module-based comparison

#### 3c. Create UpgradeModal Component
- **File to Create**: `src/components/subscription/UpgradeModal.jsx`
- **Purpose**: Intelligent upgrade suggestions
- **Logic**:
  ```
  Current state:
    Free, 1 module → suggest: Single Module Pro ($2.99)
    Free, 2 modules → suggest: 3-Module Bundle ($7.99)
    Pro, Single Module → suggest: 3-Module or 4-Module Bundle
    Pro, 3 Modules → suggest: 4-Module Bundle ($8.99)
  ```

---

## PHASE 4: MODULE VISIBILITY REFACTOR (NEXT)

### Goal
Update module visibility logic to use canonical access system.

### Steps

#### 4a. Update useModuleVisibility Hook
- **File to Update**: `src/components/hooks/useModuleVisibility.js`
- **Changes**:
  - Receive `access: AccessSummary` as input
  - Use `getVisibleModules(access, userProfile.hiddenModules)`
  - Remove hardcoded module lists
  - Return: { visible: ModuleKey[], hidden: ModuleKey[], all: ModuleKey[] }

#### 4b. Update Module Guard Components
- **Files to Update**:
  - `src/components/modules/LockedModuleGuard.jsx`
  - `src/components/modules/ModuleQuickLaunch.jsx`
  - Any component checking `isModuleEnabled` or similar

- **Changes**:
  - Import `useAccessSummary` hook
  - Use `hasModuleAccess(access, moduleKey)` instead of old checks
  - Show proper upsell UI for locked modules

#### 4c. Update Navigation to Reflect Module Access
- **File to Update**: `src/layout` (the Layout component)
- **Changes**:
  - Build access summary from user + subscription
  - Filter nav items based on `getVisibleModules()`
  - Show only accessible modules in sidebar/nav
  - Show upsell buttons for locked modules

---

## PHASE 5: REMOVE DUPLICATE ENTITLEMENT LOGIC (NEXT)

### Goal
Delete or deprecate old entitlement resolvers.

### Steps

#### 5a. Deprecate Old Files (Don't Delete Yet)
- **Files to Mark Deprecated**:
  - `src/components/utils/premiumAccess.js` → shim that calls new access system
  - `src/components/utils/resolveEntitlementTier.js` → delete
  - `src/components/utils/moduleEntitlements.js` → shim only

- **Action**:
  - Add `@deprecated` comments
  - Redirect imports to new access system
  - Keep for 1-2 deploy cycles for safety

#### 5b. Update All Imports
- **Process**: Global find/replace
  - Find: `import { hasPaidAccess } from '@/components/utils/premiumAccess'`
  - Replace: `import { hasPaidAccess } from '@/components/access'`
  - Find: `import { getModulesWithProAccess } from '@/components/utils/moduleEntitlements'`
  - Replace: `import { getActiveModules } from '@/components/access'` (or use hook)

#### 5c. Update buildCanonicalEntitlements
- **File**: `src/components/utils/premiumAccess.js` (line 137+)
- **Change**: Return object should now use access system
  ```typescript
  export function buildCanonicalEntitlements(user, subscription) {
    const access = buildAccessSummary(user, subscription);
    return {
      tier: access.tier,
      hasPro: access.tier === 'pro',
      isFree: access.tier === 'free',
      activeModules: access.activeModules,
      paidModules: access.activeModules,
      // ... other fields
    };
  }
  ```

---

## PHASE 6: UPDATE HOOKS (INTEGRATION)

### Goal
Update hooks that check user access to use canonical system.

### Steps

#### 6a. Update useCurrentUser Hook
- **File**: `src/components/hooks/useCurrentUser.js`
- **NO CHANGES** - already returns user + subscription
- **Just ensure** it exposes both fields

#### 6b. Create useCanAccess Hook (Optional)
- **File**: `src/components/hooks/useCanAccess.ts` (optional convenience)
- **Purpose**: Combine useAccessSummary + selector functions
- **Usage**:
  ```typescript
  const { hasPaid, hasModule, canUse } = useCanAccess()
  if (canUse('pipe_specialization')) { ... }
  ```

---

## PHASE 7: TESTING & QA

### Checklist

#### Onboarding
- [ ] CollectionKeeper-first welcome (not PipeKeeper)
- [ ] Module selection works (at least 1 required)
- [ ] Can select only WhiskeyKeeper (no PipeKeeper)
- [ ] Can select both modules
- [ ] Coming soon modules disabled
- [ ] State survives refresh
- [ ] Paywall appears for multi-module free users
- [ ] Paywall closes without upgrade → continue with selected modules
- [ ] Upgrade completes → return to onboarding

#### Subscription
- [ ] AccessSummary built correctly from user + subscription
- [ ] Single-module pro unlocks ONLY that module
- [ ] 3-module bundle unlocks correct modules (from metadata)
- [ ] 4-module bundle unlocks all modules
- [ ] Founders bundle unlocks all modules
- [ ] Tier correctly resolved (free/pro)
- [ ] Provider correctly resolved (stripe/apple)

#### Module Access
- [ ] Free user: no module access
- [ ] Pro user, single module: can access 1 module only
- [ ] Pro user, 3-module: can access exactly 3 modules
- [ ] Upsell shown for locked modules
- [ ] Navigation reflects accessible modules
- [ ] Hidden modules respected (user preferences)
- [ ] Whiskey-only user works cleanly

#### Feature Gating
- [ ] Free: basic features only (SMOKING_LOG_VIEW, BASIC_PIPEKEEPER, etc.)
- [ ] Pro: all features unlocked
- [ ] Feature check uses `canUseFeature()` selector
- [ ] No hardcoded tier checks in components

#### Entitlement System
- [ ] No imports from premiumAccess.js (except shims)
- [ ] No duplicate logic
- [ ] All access checks use canonical system
- [ ] No "if (hasPaid) return allModules" bugs

---

## DELIVERABLES

When complete:
1. CollectionKeeper-first onboarding (users see it first, not PipeKeeper)
2. Module selection during onboarding (required, at least 1)
3. Stripe pricing exactly matched (single, 3-bundle, 4-bundle)
4. Canonical access system (single source of truth)
5. Proper module access enforcement (not "pro = all")
6. Working paywall/upgrade flow
7. No duplicate entitlement logic
8. All tests passing

---

## FILE SUMMARY

### Created
- ✅ `src/components/access/accessSummary.ts`
- ✅ `src/components/access/accessSelectors.ts`
- ✅ `src/components/access/index.ts`
- ✅ `src/components/hooks/useAccessSummary.ts`
- ✅ `src/components/onboarding/onboardingState.ts`

### To Create (Phase 2+)
- `src/components/onboarding/OnboardingPaywallBridge.jsx`
- `src/components/subscription/PricingCard.jsx`
- `src/components/subscription/PricingComparison.jsx`
- `src/components/subscription/UpgradeModal.jsx`
- `src/components/hooks/useCanAccess.ts` (optional)

### To Update (Phase 2+)
- `src/components/onboarding/ModuleSelectionStep.jsx`
- `src/components/onboarding/OnboardingFlow.jsx`
- `src/pages/Subscription.jsx`
- `src/components/hooks/useModuleVisibility.js`
- `src/components/modules/LockedModuleGuard.jsx`
- `src/layout` (Layout.jsx)
- `src/components/utils/premiumAccess.js` (shim only)

### To Delete/Deprecate (Phase 5+)
- `src/components/utils/resolveEntitlementTier.js`

---

## KEY METRICS

- **Canonical Access System**: ✅ Complete
- **Onboarding Refactor**: ⏳ Ready (Phase 2)
- **Subscription Refactor**: ⏳ Ready (Phase 3)
- **Module Visibility**: ⏳ Ready (Phase 4)
- **Entitlement Cleanup**: ⏳ Ready (Phase 5)

---

## NEXT IMMEDIATE STEPS

1. Review and test new access system
2. Start Phase 2: Update ModuleSelectionStep + OnboardingFlow
3. Create OnboardingPaywallBridge
4. Test onboarding → paywall → subscription flow
5. Verify module access enforcement