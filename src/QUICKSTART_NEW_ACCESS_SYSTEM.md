# Quick Start: Using the New Canonical Access System

## 30-Second Overview

**Old way** ❌:
```javascript
import { hasPaidAccess } from '@/components/utils/premiumAccess'
if (hasPaidAccess(user, subscription)) { /* do thing */ }
```

**New way** ✅:
```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import { hasPaidAccess } from '@/components/access'

const access = useAccessSummary()
if (hasPaidAccess(access)) { /* do thing */ }
```

---

## Most Common Use Cases

### 1. "Is user pro?"
```typescript
import { useAccessSummary, hasPaidAccess } from '@/components/access'
const access = useAccessSummary()
if (hasPaidAccess(access)) { ... }
```

### 2. "Does user have module X?"
```typescript
import { useAccessSummary, hasModuleAccess } from '@/components/access'
const access = useAccessSummary()
if (hasModuleAccess(access, 'pipekeeper')) { ... }
```

### 3. "Can user use feature X?"
```typescript
import { useAccessSummary, canUseFeature } from '@/components/access'
const access = useAccessSummary()
if (canUseFeature(access, 'pipe_specialization')) { ... }
```

### 4. "What modules does user have?"
```typescript
import { useAccessSummary, getActiveModules } from '@/components/access'
const access = useAccessSummary()
const modules = getActiveModules(access) // ["pipekeeper", "whiskeykeeper"]
```

### 5. "Build nav with module access?"
```typescript
import { useAccessSummary, getVisibleModules } from '@/components/access'
const access = useAccessSummary()
const userProfile = useUserProfile()
const visible = getVisibleModules(access, userProfile?.hiddenModules)

return (
  <nav>
    {['pipekeeper', 'whiskeykeeper'].map(m => (
      <Link key={m} to={`/${m}`} className={visible.includes(m) ? '' : 'locked'}>
        {m}
      </Link>
    ))}
  </nav>
)
```

---

## Complete Example Component

```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import {
  hasPaidAccess,
  hasModuleAccess,
  getVisibleModules,
  getLockedModules,
} from '@/components/access'
import type { AccessSummary } from '@/components/access'

export default function ModuleGuard({ moduleKey, children }) {
  const access = useAccessSummary()

  // While loading
  if (!access) {
    return <div>Loading...</div>
  }

  // User has access
  if (hasModuleAccess(access, moduleKey)) {
    return <>{children}</>
  }

  // User doesn't have access
  const locked = getLockedModules(access)
  return (
    <div className="locked">
      <p>This module is locked.</p>
      <p>Current modules: {getActiveModules(access).join(', ')}</p>
      <p>Locked: {locked.join(', ')}</p>
      <button onClick={() => navigate('/Subscription')}>
        Unlock {moduleKey}
      </button>
    </div>
  )
}
```

---

## In-Depth: Each Selector Function

### hasPaidAccess(access)
**Returns**: boolean
**When**: User is pro tier
```typescript
const access = useAccessSummary()
if (hasPaidAccess(access)) {
  // User subscribed (any module)
}
```

### isFree(access)
**Returns**: boolean
**When**: User is free tier
```typescript
if (isFree(access)) {
  // User is free
}
```

### hasModuleAccess(access, moduleKey)
**Returns**: boolean
**When**: User has access to specific module
```typescript
// Check single module
if (hasModuleAccess(access, 'pipekeeper')) {
  // Can access pipes
}

// Check array
if (['pipekeeper', 'whiskeykeeper'].some(m => hasModuleAccess(access, m))) {
  // Can access at least one
}
```

### getModuleCount(access)
**Returns**: number
**Use**: Count modules user has
```typescript
const count = getModuleCount(access) // 0, 1, 2, 3, or 4
if (count >= 3) {
  // User has 3+ modules
}
```

### getActiveModules(access)
**Returns**: ModuleKey[]
**Use**: Get list of all user's modules
```typescript
const modules = getActiveModules(access)
// ["pipekeeper"] OR ["pipekeeper", "whiskeykeeper"] OR etc
modules.forEach(m => console.log(m))
```

### getVisibleModules(access, hiddenModules)
**Returns**: ModuleKey[]
**Use**: Modules to show in UI (respects user's hide preferences)
```typescript
const visible = getVisibleModules(access, userProfile?.hiddenModules)
// Same as active, but excludes hidden ones
```

### getLockedModules(access)
**Returns**: ModuleKey[]
**Use**: Modules user DOESN'T have (for upsell)
```typescript
const locked = getLockedModules(access)
// All modules minus active modules
if (locked.length > 0) {
  return <UpsellButton modules={locked} />
}
```

### canUseFeature(access, featureKey)
**Returns**: boolean
**Use**: Check if feature available (combines tier + module)
```typescript
if (canUseFeature(access, 'pipe_specialization')) {
  // Can use specializations
}

// Available features:
// - Free: BASIC_PIPEKEEPER, BASIC_WHISKEYKEEPER, SHARE_CARDS
// - Pro: ALL features
```

### isFoundingMember(access)
**Returns**: boolean
**Use**: Check if user is founding member
```typescript
if (isFoundingMember(access)) {
  // Show founding member badge
}
```

### getSubscriptionStatus(access)
**Returns**: "inactive" | "trialing" | "active" | "past_due" | "canceled"
**Use**: Get subscription status
```typescript
const status = getSubscriptionStatus(access)
if (status === 'past_due') {
  return <WarningBanner>Payment past due</WarningBanner>
}
```

### isSubscriptionActive(access)
**Returns**: boolean
**Use**: Is subscription in good standing?
```typescript
if (isSubscriptionActive(access)) {
  // Active or trialing
}
```

### getBillingPeriod(access)
**Returns**: "monthly" | "annual" | null
**Use**: Get billing frequency
```typescript
const period = getBillingPeriod(access)
if (period === 'annual') {
  return <Badge>Annual Plan</Badge>
}
```

### getPlanKey(access)
**Returns**: string | null
**Use**: Get exact Stripe product
```typescript
const plan = getPlanKey(access)
// "pipekeeper_pro_monthly" OR "3_module_bundle_annual" OR null
```

### getProvider(access)
**Returns**: "stripe" | "apple" | null
**Use**: Get subscription provider
```typescript
if (getProvider(access) === 'stripe') {
  return <Link to="/Subscription">Manage on Stripe</Link>
}
```

### formatAccessSummary(access)
**Returns**: string
**Use**: Debug output
```typescript
console.log(formatAccessSummary(access))
// "Pro · 2 Module(s) · Monthly"
```

---

## Common Patterns

### Pattern: Module-Gated Component
```typescript
function PipeKeeper({ children }) {
  const access = useAccessSummary()
  
  if (!access) return <Loading />
  if (!hasModuleAccess(access, 'pipekeeper')) {
    return <LockedModuleGuard module="pipekeeper" />
  }
  
  return <>{children}</>
}
```

### Pattern: Feature-Gated Component
```typescript
function PipeSpecialization() {
  const access = useAccessSummary()
  
  if (!canUseFeature(access, 'pipe_specialization')) {
    return <FeatureLockedBanner feature="pipe_specialization" />
  }
  
  return <PipeSpecializationUI />
}
```

### Pattern: Smart Upgrade Button
```typescript
function UpgradeButton() {
  const access = useAccessSummary()
  const locked = getLockedModules(access)
  
  if (getModuleCount(access) >= 4) {
    return null // Already has all
  }
  
  const suggestion = locked[0] // Suggest first locked
  return (
    <button onClick={() => navigate('/Subscription')}>
      Add {suggestion}
    </button>
  )
}
```

### Pattern: Loading State
```typescript
function MyComponent() {
  const access = useAccessSummary()
  
  // CRITICAL: Always check for null while loading
  if (!access) {
    return <Skeleton />
  }
  
  // Safe to use access now
  return <Content access={access} />
}
```

---

## Debugging

### See full access summary
```typescript
const access = useAccessSummary()
console.log('Access:', access)
// {
//   tier: "pro",
//   status: "active",
//   activeModules: ["pipekeeper", "whiskeykeeper"],
//   planKey: "3_module_bundle_monthly",
//   billingPeriod: "monthly",
//   provider: "stripe",
//   isFoundingMember: false
// }
```

### Check specific access
```typescript
const access = useAccessSummary()
console.log({
  hasPaid: hasPaidAccess(access),
  hasPipe: hasModuleAccess(access, 'pipekeeper'),
  hasWhiskey: hasModuleAccess(access, 'whiskeykeeper'),
  canSpecialize: canUseFeature(access, 'pipe_specialization'),
  modules: getActiveModules(access),
  locked: getLockedModules(access),
})
```

### Verify type safety
```typescript
import type { ModuleKey, AccessSummary } from '@/components/access'

const modules: ModuleKey[] = ['pipekeeper', 'whiskeykeeper'] // ✅
const bad: ModuleKey[] = ['invalid'] // ❌ TypeScript error
```

---

## Cheat Sheet

| Need... | Use... |
|---------|--------|
| Is user pro? | `hasPaidAccess(access)` |
| Is user free? | `isFree(access)` |
| Has module X? | `hasModuleAccess(access, 'pipekeeper')` |
| Count modules? | `getModuleCount(access)` |
| All modules? | `getActiveModules(access)` |
| Visible modules? | `getVisibleModules(access, hidden)` |
| Locked modules? | `getLockedModules(access)` |
| Can use feature? | `canUseFeature(access, 'feature_key')` |
| Is founder? | `isFoundingMember(access)` |
| Sub status? | `getSubscriptionStatus(access)` |
| Billing period? | `getBillingPeriod(access)` |
| Stripe product? | `getPlanKey(access)` |
| Provider? | `getProvider(access)` |
| For debugging? | `formatAccessSummary(access)` |

---

## What NOT to Do ❌

```typescript
// DON'T: Import from old system
import { hasPaidAccess } from '@/components/utils/premiumAccess' // ❌

// DON'T: Check user/subscription directly
if (user.tier === 'pro') { } // ❌

// DON'T: Assume pro = all modules
if (hasPaidAccess(access)) {
  // Show ALL modules
} // ❌

// DON'T: Forget null check
const { hasPipe } = useCanAccess()
if (hasPipe) { } // Crashes if loading! ❌

// DON'T: Hardcode module lists
const MODULES = ['pipekeeper', 'whiskeykeeper'] // ❌

// DON'T: Build custom access logic
const hasAccess = user.paid && selectedModules.includes('pipekeeper') // ❌
```

---

## Helpful Links

- **Full Architecture**: `ARCHITECTURE_COMPLETE_PHASE_1.md`
- **Migration Guide**: `MIGRATION_GUIDE_OLD_TO_NEW_ACCESS.md`
- **Implementation Phases**: `COLLECTIONKEEPER_FIRST_REFACTOR_IMPLEMENTATION.md`
- **QA Checklist**: `QA_CHECKLIST_COLLECTIONKEEPER_REFACTOR.md`
- **Source Code**: `src/components/access/`

---

**Questions?** Check the docs or ask in code review. 🎉