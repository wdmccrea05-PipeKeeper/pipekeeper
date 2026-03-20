# MIGRATION GUIDE: Old Entitlement System → New Canonical Access System

## OVERVIEW

The app is transitioning from fragmented entitlement logic to a single, canonical access system.

**Old System** (BAD ❌):
- Multiple entitlement resolvers (premiumAccess.js, resolveEntitlementTier, moduleEntitlements)
- Duplicate logic scattered across app
- Assumption: "pro = all modules"
- No per-module tracking
- Hard to test

**New System** (GOOD ✅):
- Single source of truth: `AccessSummary`
- All checks through canonical selectors
- Proper module-by-module access
- Stripe pricing exactly matched
- Easy to test and maintain

---

## BEFORE & AFTER EXAMPLES

### Example 1: Check if user has paid access

**BEFORE** ❌
```typescript
import { hasPaidAccess } from '@/components/utils/premiumAccess'
const { user, subscription } = useCurrentUser()
if (hasPaidAccess(user, subscription)) {
  // User is pro
}
```

**AFTER** ✅
```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import { hasPaidAccess } from '@/components/access'

const access = useAccessSummary()
if (hasPaidAccess(access)) {
  // User is pro
}
```

---

### Example 2: Check if user has specific module

**BEFORE** ❌
```typescript
import { getModulesWithProAccess } from '@/components/utils/moduleEntitlements'
const { user } = useCurrentUser()
const modules = getModulesWithProAccess(user)
if (modules.includes('pipekeeper')) {
  // User can access pipekeeper
  // BUT: This returned ALL modules for pro users — very wrong!
}
```

**AFTER** ✅
```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import { hasModuleAccess } from '@/components/access'

const access = useAccessSummary()
if (hasModuleAccess(access, 'pipekeeper')) {
  // User can access pipekeeper
  // Correctly checks user's actual modules
}
```

---

### Example 3: Check if user can use a feature

**BEFORE** ❌
```typescript
import { hasPaidAccess } from '@/components/utils/premiumAccess'
const { user, subscription } = useCurrentUser()
if (hasPaidAccess(user, subscription)) {
  // Assume all features unlocked
  return <PipeSpecialization />
}
```

**AFTER** ✅
```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import { canUseFeature } from '@/components/access'

const access = useAccessSummary()
if (canUseFeature(access, 'pipe_specialization')) {
  return <PipeSpecialization />
}
```

---

### Example 4: Show module nav items

**BEFORE** ❌
```typescript
import { getModulesWithProAccess } from '@/components/utils/moduleEntitlements'
const { user } = useCurrentUser()

const modules = getModulesWithProAccess(user)
return (
  <nav>
    {['pipekeeper', 'whiskeykeeper'].map(m => (
      <Link key={m} to={`/${m}`}>
        {modules.includes(m) ? 'Unlock' : m}
      </Link>
    ))}
  </nav>
)
```

**AFTER** ✅
```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import { getVisibleModules } from '@/components/access'

const access = useAccessSummary()
const userProfile = useUserProfile() // Loads hidden preferences
const visible = getVisibleModules(access, userProfile?.hiddenModules)

return (
  <nav>
    {['pipekeeper', 'whiskeykeeper'].map(m => (
      <Link 
        key={m} 
        to={`/${m}`}
        className={visible.includes(m) ? '' : 'locked'}
      >
        {m}
      </Link>
    ))}
  </nav>
)
```

---

### Example 5: Build entitlements object for backend

**BEFORE** ❌
```typescript
import { buildCanonicalEntitlements } from '@/components/utils/premiumAccess'
const { user, subscription } = useCurrentUser()

const ents = buildCanonicalEntitlements(user, subscription)
// Returns tier, hasPro, limits, canUse, etc.
// Assumes "pro = all modules"
```

**AFTER** ✅
```typescript
import { buildAccessSummary } from '@/components/access'
const { user, subscription } = useCurrentUser()

const access = buildAccessSummary(user, subscription)
// Returns tier, status, modules, planKey, etc.
// Exactly matches Stripe products
```

---

## COMMON PATTERNS

### Pattern 1: Check Free Tier Only

**BEFORE** ❌
```typescript
if (!hasPaidAccess(user, subscription)) {
  // User is free
}
```

**AFTER** ✅
```typescript
if (isFree(access)) {
  // User is free
}
```

---

### Pattern 2: Block Free Users from Feature

**BEFORE** ❌
```typescript
if (!hasPaidAccess(user, subscription)) {
  return <UpgradePrompt />
}
```

**AFTER** ✅
```typescript
if (!canUseFeature(access, 'pipe_specialization')) {
  return <UpgradePrompt module="pipekeeper" />
}
```

---

### Pattern 3: Show Module-Specific Upgrade

**BEFORE** ❌
```typescript
// Not supported in old system
// Had to show generic "upgrade to pro" message
```

**AFTER** ✅
```typescript
const lockedModules = getLockedModules(access)
return (
  <UpgradeModal
    currentModules={access.activeModules}
    suggestedAddOns={lockedModules}
    estimatedCost={calculateBundlePrice(access.activeModules.length + 1)}
  />
)
```

---

## MIGRATION CHECKLIST

### Step 1: Identify Old Imports
- [ ] Find all imports from `premiumAccess.js`
- [ ] Find all imports from `resolveEntitlementTier.js`
- [ ] Find all imports from `moduleEntitlements.js`
- [ ] Document which functions are used

### Step 2: Create Access Summary
For each component/page that uses old system:
- [ ] Import `useAccessSummary` hook
- [ ] Call `const access = useAccessSummary()`
- [ ] Replace old function calls with new selectors

### Step 3: Update Logic
- [ ] Replace `hasPaidAccess(user, sub)` with `hasPaidAccess(access)`
- [ ] Replace module checks with `hasModuleAccess(access, moduleKey)`
- [ ] Replace feature checks with `canUseFeature(access, featureKey)`

### Step 4: Test
- [ ] Verify free user sees appropriate UI
- [ ] Verify pro user sees correct modules
- [ ] Verify single-module pro doesn't see other modules
- [ ] Verify module-based upsells work

### Step 5: Clean Up
- [ ] Remove old imports
- [ ] Delete old function calls
- [ ] Verify no console warnings

---

## FUNCTION MAPPING

| Old Function | New Function | Notes |
|---|---|---|
| `hasPaidAccess(user, sub)` | `hasPaidAccess(access)` | Now takes AccessSummary |
| `hasPro(user, sub)` | `hasPro(access)` | Alias for hasPaidAccess |
| `hasProAccess(user, sub)` | `hasPaidAccess(access)` | Replaced |
| `isFree(user, sub)` | `isFree(access)` | Now takes AccessSummary |
| `getModulesWithProAccess(user)` | `getActiveModules(access)` | Returns correct modules |
| `hasModuleProAccess(user, mod)` | `hasModuleAccess(access, mod)` | More accurate |
| `buildCanonicalEntitlements(user, sub)` | `buildAccessSummary(user, sub)` | Returns AccessSummary |
| N/A | `canUseFeature(access, feature)` | NEW: Feature-level gating |
| N/A | `getVisibleModules(access, hidden)` | NEW: Respects preferences |
| N/A | `getLockedModules(access)` | NEW: For upsell messaging |

---

## FILE-BY-FILE MIGRATION

### `src/pages/Subscription.jsx`
```typescript
// OLD
const { user, subscription } = useCurrentUser()
const tier = getEntitlementTier(user, subscription)

// NEW
const access = useAccessSummary()
// Use access.tier, access.activeModules, access.planKey directly
```

### `src/components/modules/LockedModuleGuard.jsx`
```typescript
// OLD
const { user } = useCurrentUser()
const modules = getModulesWithProAccess(user)
if (!modules.includes(moduleKey)) return <Locked />

// NEW
const access = useAccessSummary()
if (!hasModuleAccess(access, moduleKey)) return <Locked />
```

### `src/layout/Layout.jsx`
```typescript
// OLD
const { user, subscription } = useCurrentUser()
const hasPaid = hasPaidAccess(user, subscription)
const visibleModules = hasPaid ? ALL_MODULES : []

// NEW
const access = useAccessSummary()
const visibleModules = getVisibleModules(access, userProfile?.hiddenModules)
```

---

## TROUBLESHOOTING

### Issue: "access is null"
**Solution**: Check loading state
```typescript
if (!access) return <Loading />
// Components should never see null access after loading
```

### Issue: "Module access not working"
**Solution**: Verify subscription has correct product
```typescript
// Check in console:
console.log(buildAccessSummary(user, subscription))
// Verify: activeModules array is correct, planKey matches Stripe
```

### Issue: "Free users still see pro features"
**Solution**: Use `canUseFeature()` instead of `hasPaidAccess()`
```typescript
// BAD
if (hasPaidAccess(access)) return <Feature />

// GOOD
if (canUseFeature(access, 'advanced_pairing')) return <Feature />
```

### Issue: "Type errors with ModuleKey"
**Solution**: Import type
```typescript
import type { ModuleKey } from '@/components/access'
const modules: ModuleKey[] = ['pipekeeper']
```

---

## QUESTIONS?

See: `COLLECTIONKEEPER_FIRST_REFACTOR_IMPLEMENTATION.md` for full architecture details.