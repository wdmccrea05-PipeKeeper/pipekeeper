# CollectionKeeper Master Pass — Deployment Guide

## PRE-DEPLOYMENT (5 minutes)

### 1. Environment Variables
Add to your `.env` or Base44 secrets:

```env
STRIPE_PRICE_ID_FOUNDERS_ANNUAL=price_1Ny...  # Stripe Founders Bundle annual price
STRIPE_PRICE_ID_FOUNDERS_MONTHLY=price_1Nz...  # Optional, not recommended for offer
```

### 2. Stripe Configuration
1. Create product "Founders Bundle"
2. Create price: $49.99/year → copy price ID to `STRIPE_PRICE_ID_FOUNDERS_ANNUAL`
3. Test in Stripe Dashboard → Test Mode

---

## DEPLOYMENT (Automatic)

All 5 backend functions auto-deploy on save:

```
✅ functions/generateSessionRecommendation.js
✅ functions/generateCollectionStory.js
✅ functions/checkFoundersEligibility.js
✅ functions/createFoundersCheckoutSession.js
✅ functions/upgradesCuratorContext.js
```

---

## POST-DEPLOYMENT (10 minutes)

### 1. Test Session Engine
1. Go to Hub
2. Check "Tonight's Session" appears with mode selector
3. Change modes → new recommendation generates
4. Click "Record Session" → SmokingLog created
5. Check toast notification appears

### 2. Test Collection Story
1. Go to Hub
2. Scroll to "Collection Story" card
3. Verify narrative generates
4. Check metrics display (pipes, blends, bottles, value)
5. Click "Refresh" → story regenerates

### 3. Test Founders Bundle (if eligible)
1. Go to Subscription page
2. If eligible → Founders Bundle offer appears
3. Click "Claim Founders Bundle"
4. Stripe checkout opens
5. Complete test transaction

### 4. Monitor Logs
```bash
base44 logs functions:generateSessionRecommendation
base44 logs functions:generateCollectionStory
base44 logs functions:checkFoundersEligibility
```

---

## ROLLBACK (if needed)

1. Delete function deployments from Base44 Dashboard
2. Revert file changes:
   - `components/hub/TonightSessionCard.jsx`
   - `pages/CollectionHub`

---

## MONITORING (Production)

Watch for errors in:
- Function execution logs
- Error rate spikes
- User feedback on Session Engine

---

## QUICK REFERENCE

| Component | Status | Notes |
|-----------|--------|-------|
| Session Engine | ✅ Ready | 5 modes, intelligent scoring |
| Collection Story | ✅ Ready | Dynamic narrative generation |
| Founders Bundle | ✅ Ready | Eligibility-gated |
| Curator Context | ✅ Ready | Cross-module support |

---

**Estimated Total Deploy Time:** 15 minutes  
**Rollback Difficulty:** Easy (single function removals)  
**Risk Level:** Low (non-breaking changes)