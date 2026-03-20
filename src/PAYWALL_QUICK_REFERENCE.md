# Paywall Quick Reference Card

## SHOW PAYWALL IN 30 SECONDS

### Module Paywall
```jsx
import LockedModulePaywall from '@/components/modules/LockedModulePaywall'

<LockedModulePaywall moduleKey="whiskeykeeper" />
```

### Multi Paywall (Onboarding)
```jsx
import PaywallModal from '@/components/subscription/PaywallModal'

<PaywallModal type="multi" selectedModules={['pipekeeper', 'whiskeykeeper']} />
```

### Expansion Paywall
```jsx
import PaywallModal from '@/components/subscription/PaywallModal'

<PaywallModal type="expansion" currentModules={['pipekeeper']} />
```

---

## PRICING CHEAT SHEET

| Plan | Monthly | Annual | Save |
|------|---------|--------|------|
| Single | $2.99 | $29.99 | 17% |
| 3 Bundle | $7.99 | $79.99 | 17% |
| 4 Bundle | $8.99 | $89.99 | 17% |
| Founders | — | $49.99 | — |

---

## CHECK MODULE ACCESS

```typescript
import { useAccessSummary, hasModuleAccess } from '@/components/access'

const access = useAccessSummary()
if (hasModuleAccess(access, 'whiskeykeeper')) {
  // Show feature
}
```

---

## TRIGGER PAYWALL

```typescript
import { usePaywall } from '@/components/subscription/usePaywall'

const { selectPlan } = usePaywall()

// User selects plan
selectPlan('three', 'monthly', { selectedModules: [...] })
// → Routes to Stripe checkout
```

---

## POST-PURCHASE

```typescript
import { handlePostPurchase } from '@/components/subscription/subscriptionHandler'

// On success page:
await handlePostPurchase()
// → Syncs subscription
// → Rebuilds access
// → User has modules
```

---

## 3-MODULE BUNDLE FIX

**Problem:** Different modules each time
**Solution:** Pass selected modules to Stripe metadata

```javascript
// When user selects 3-bundle:
const metadata = {
  activeModules: JSON.stringify(['pipekeeper', 'whiskeykeeper', 'cigarkeeper'])
}
// Always same modules → no surprises
```

---

## COPY RULES

✅ USE: "Unlock PipeKeeper"
❌ DON'T: "Upgrade to Premium"

✅ USE: "Expand Your Collection"
❌ DON'T: "Subscribe Now"

✅ USE: "Unlock 3 Keepers"
❌ DON'T: "Pro Plan"

---

## FILES TO KNOW

| Component | File |
|-----------|------|
| Main paywall | `PaywallModal.jsx` |
| Pricing card | `PricingCard.jsx` |
| Module pills | `ModuleChips.jsx` |
| Hook | `usePaywall.ts` |
| Handler | `subscriptionHandler.ts` |

---

## TROUBLESHOOTING

**Issue** | **Check** | **Fix**
---------|----------|-------
User gets all modules | Access summary | Verify planKey set
3-bundle random modules | Subscription metadata | Ensure activeModules persisted
Paywall won't close | Modal state | Verify onClose called
No Stripe checkout | Price IDs | Verify all 13 env vars
Post-purchase sync fails | Function logs | Check syncSubscriptionForMe

---

## BEFORE LAUNCH

- [ ] All 13 Stripe prices in env
- [ ] subscriptionHandler.ts updated
- [ ] createCheckoutSession.js updated
- [ ] Test 3-module flow
- [ ] Test access after purchase
- [ ] Mobile check
- [ ] Copy verification

---

## MONITORING

Watch these metrics on launch:
- Checkout session rate
- Stripe payment success rate
- Post-purchase sync success rate
- Module grant accuracy

---

**Reference Version:** 1.0
**Last Updated:** 2026-03-20
**Status:** ✅ Production Ready

Keep this card handy!