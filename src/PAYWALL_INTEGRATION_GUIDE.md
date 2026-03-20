# Paywall Integration Guide - Developer Quick Start

## 5-MINUTE SETUP

### 1. Set Environment Variables
```bash
# .env or dashboard secrets
VITE_STRIPE_PIPEKEEPER_MONTHLY=price_...
VITE_STRIPE_PIPEKEEPER_ANNUAL=price_...
VITE_STRIPE_WHISKEYKEEPER_MONTHLY=price_...
VITE_STRIPE_WHISKEYKEEPER_ANNUAL=price_...
# ... (all 13 prices from Stripe dashboard)
```

### 2. Update Price Mapping
File: `components/subscription/subscriptionHandler.ts`

Replace the placeholders with your Stripe price IDs:
```typescript
export const PLAN_CONFIG = {
  pipekeeper_pro_monthly: {
    type: 'single',
    modules: ['pipekeeper'],
    priceId: 'price_1234...',  // ← UPDATE WITH YOUR ID
    displayPrice: '$2.99',
    displayPeriod: '/month',
  },
  // ... update all 13 entries
};
```

### 3. Update Backend Functions
File: `functions/createCheckoutSession.js`

Replace the mapping:
```javascript
const PLAN_TO_STRIPE_PRICE = {
  'pipekeeper_pro_monthly': 'price_1234...',  // ← UPDATE
  'pipekeeper_pro_annual': 'price_5678...',   // ← UPDATE
  // ... all 13 prices
};
```

### 4. Test Flow
```typescript
// In your test component:
import { usePaywall } from '@/components/subscription/usePaywall'
import PaywallModal from '@/components/subscription/PaywallModal'

const { selectPlan } = usePaywall()

// Show paywall
<PaywallModal type="module" lockedModule="whiskeykeeper" />

// User selects plan
// → Routes to Stripe checkout
// → Success page shows
// → syncSubscriptionForMe called
// → User has module access
```

Done! ✅

---

## SHOWING PAYWALLS

### Show When User Accesses Locked Module

File: `components/modules/LockedModuleGuard.jsx`

```typescript
import LockedModulePaywall from '@/components/modules/LockedModulePaywall'

export default function LockedModuleGuard({ moduleKey, children }) {
  const { hasModuleAccess } = useAccessSummary()
  const [showPaywall, setShowPaywall] = useState(false)

  if (!hasModuleAccess(access, moduleKey)) {
    return (
      <>
        <LockedModulePaywall
          moduleKey={moduleKey}
          onClose={() => navigate('/')}
        />
        {showPaywall && <PaywallModal type="module" lockedModule={moduleKey} />}
      </>
    )
  }

  return children
}
```

### Show During Onboarding

Already integrated! File: `components/onboarding/OnboardingFlow.jsx`

- ✅ Triggers after module selection (2+)
- ✅ Uses "multi" type
- ✅ Preserves selections
- ✅ Returns to onboarding on close

### Show for Existing User (Expansion)

```typescript
import PaywallModal from '@/components/subscription/PaywallModal'
import { usePaywall } from '@/components/subscription/usePaywall'

const { selectPlan } = usePaywall()

<button onClick={() => setShowExpansion(true)}>
  Add Module
</button>

{showExpansion && (
  <PaywallModal
    type="expansion"
    currentModules={access.activeModules}
    selectedModules={['whiskeykeeper']}
    onClose={() => setShowExpansion(false)}
    onSelectPlan={(plan, period) => selectPlan(plan, period)}
  />
)}
```

---

## HANDLING PURCHASES

### After Successful Stripe Payment

User is redirected to `successUrl` from checkout session.

That page should:
1. Show success modal
2. Sync subscription
3. Rebuild access
4. Navigate to dashboard

```typescript
import SuccessModal from '@/components/subscription/SuccessModal'
import { handlePostPurchase } from '@/components/subscription/subscriptionHandler'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    handlePostPurchase().then(() => {
      setSyncing(false)
    })
  }, [])

  return (
    <SuccessModal
      onContinue={() => navigate('/CollectionHub')}
      heading="Subscription Complete!"
      body="Your modules are now active. Enjoy!"
    />
  )
}
```

---

## CHECKING MODULE ACCESS

### In Components

```typescript
import { useAccessSummary } from '@/components/hooks/useAccessSummary'
import { hasModuleAccess, canUseFeature } from '@/components/access'

export default function MyComponent() {
  const access = useAccessSummary()

  if (!access) return <Loading />

  // Check if user has module
  if (!hasModuleAccess(access, 'whiskeykeeper')) {
    return <LockedFeature module="whiskeykeeper" />
  }

  // Check if user can use specific feature
  if (!canUseFeature(access, 'bottle_valuation')) {
    return <UpgradePrompt />
  }

  return <FeatureContent />
}
```

### In Backend Functions

```javascript
import { buildAccessSummary } from '@/components/access'

const { user, subscription } = await fetchUserAndSub()
const access = buildAccessSummary(user, subscription)

if (!access.activeModules.includes('whiskeykeeper')) {
  return forbidden('User does not have WhiskeyKeeper access')
}
```

---

## 3-MODULE BUNDLE SELECTION

### Critical: Preserving Selection

When user selects 3-module bundle with selected modules:

```typescript
// User selected PipeKeeper + WhiskeyKeeper in onboarding
const selectedModules = ['pipekeeper', 'whiskeykeeper']

// They select 3-bundle in paywall
await selectPlan('three', 'monthly', {
  selectedModules, // ← PASS THE SELECTION
})

// This sends to Stripe:
metadata.activeModules = JSON.stringify(['pipekeeper', 'whiskeykeeper', 'cigarkeeper'])
```

### After Purchase

Backend syncs subscription:
```javascript
const metadata = subscription.metadata
const activeModules = JSON.parse(metadata.activeModules)
// activeModules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']

// User gets EXACTLY those 3 modules
```

**NEVER randomize or modify the bundle modules!**

---

## DEBUGGING

### Check User's Access

```typescript
const access = useAccessSummary()
console.log('Access:', access)

// Should see:
{
  tier: "pro",
  status: "active",
  activeModules: ["pipekeeper", "whiskeykeeper"],
  planKey: "three_module_bundle_monthly",
  provider: "stripe"
}
```

### Check Stripe Subscription

```bash
# Get customer
stripe customers list --email user@example.com

# Get subscription
stripe subscriptions list --customer cus_...

# Check metadata
stripe subscriptions retrieve sub_... --expand="items.data.price"
```

### Monitor Post-Purchase Sync

Logs should show:
```
✓ User synced from Stripe
✓ Subscription created: sub_...
✓ Plan key: three_module_bundle_monthly
✓ Active modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"]
```

If missing:
```
✗ Subscription sync failed
✗ User missing plan key
✗ Module mismatch
```

---

## TESTING SCENARIOS

### Test 1: Single Module Flow
1. Free user clicks WhiskeyKeeper module
2. Module paywall shows (default: single)
3. Click "Unlock WhiskeyKeeper"
4. Stripe checkout with $2.99/mo
5. Success page
6. User only has WhiskeyKeeper access
7. PipeKeeper still locked ✓

### Test 2: Multi-Module from Onboarding
1. User selects PipeKeeper + WhiskeyKeeper
2. Multi paywall shows automatically
3. Select 3-bundle option
4. Stripe checkout with $7.99/mo
5. Success page
6. User has PipeKeeper + WhiskeyKeeper + CigarKeeper
7. WineKeeper still locked ✓

### Test 3: Expansion for Pro User
1. User is pro (has PipeKeeper)
2. Clicks WhiskeyKeeper module
3. Expansion paywall shows
4. Select "Upgrade to 3 Keepers"
5. Stripe checkout with $7.99/mo
6. Success page
7. User now has 3 modules ✓

### Test 4: Verify Module Selection Preserved
1. Onboarding: select Wine + Cigar (not Pipe, not Whiskey)
2. 3-bundle selected
3. After purchase, user should have Wine + Cigar + something else
4. NOT randomly selected modules
5. Same selection every time ✓

---

## COMMON ISSUES

### Issue: User gets all modules after purchase
**Cause:** Fallback logic in access resolver
**Fix:** Ensure planKey is set and subscription.metadata correct

### Issue: 3-module bundle gives different modules each refresh
**Cause:** Not persisting activeModules in subscription metadata
**Fix:** Verify createCheckoutSession stores metadata

### Issue: Post-purchase paywall still shows
**Cause:** Sync failed or access not rebuilt
**Fix:** Check syncSubscriptionForMe logs

### Issue: Onboarding selection lost
**Cause:** Not passed to paywall or Stripe
**Fix:** Verify getSelectedModules() returns correct array

### Issue: Module paywall shows for user who has access
**Cause:** Access summary not rebuilt after purchase
**Fix:** Ensure useAccessSummary() refetch on route change

---

## PRODUCTION SAFETY CHECKS

Before launch, verify:

- [ ] All 13 Stripe prices in environment
- [ ] subscriptionHandler.ts fully configured
- [ ] createCheckoutSession.js price mapping complete
- [ ] syncSubscriptionForMe.js functional
- [ ] OnboardingFlow paywall integration tested
- [ ] LockedModuleGuard paywall integration tested
- [ ] 3-module selections preserved (not randomized)
- [ ] Copy language all correct (no "Premium")
- [ ] Mobile responsive
- [ ] Dark theme compliant
- [ ] All CTAs route to checkout

---

## SUPPORT

**PaywallModal component**: `components/subscription/PaywallModal.jsx`
**Integration hooks**: `components/subscription/usePaywall.ts`
**Backend functions**: `functions/createCheckoutSession.js`, `functions/syncSubscriptionForMe.js`
**Documentation**: `PAYWALL_IMPLEMENTATION_COMPLETE.md`
**QA Checklist**: `PAYWALL_QA_CHECKLIST.md`

---

**Status:** ✅ READY FOR PRODUCTION

Follow this guide and your paywall system will be revenue-generating within hours.