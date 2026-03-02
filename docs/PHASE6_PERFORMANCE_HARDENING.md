# Phase 6: Performance + Production Hardening
## Startup Speed, API Robustness, Caching, & Error Observability

**Status:** READY FOR EXECUTION  
**Target Exit:** Sub-2s Home load, stable nav, zero white screens, actionable error logs

---

## SECTION A: Startup Performance

### Current State Analysis
- **Home page bundle:** TBD (measure in Phase 6 testing)
- **Initial route load time:** TBD
- **Time to interactive (TTI):** TBD

### Code-Splitting Opportunities (Heavy Pages)

#### Phase 1: Heavy AI/Report Pages (Low priority in critical path)
```js
// Lazy load AI panels to avoid blocking Home
const ExpertTobacconist = lazy(() => import('@/components/ai/ExpertTobacconist'));
const CollectionOptimizer = lazy(() => import('@/components/ai/CollectionOptimizer'));
const TrendsReport = lazy(() => import('@/components/tobacco/TrendsReport'));

// Fallback UI while loading
<Suspense fallback={<Skeleton />}>
  <ExpertTobacconist />
</Suspense>
```

**Impact:** Reduce Home bundle by ~50KB  
**Test target:** Home TTI < 2.5s (from current TBD)

#### Phase 2: Help Center / FAQ (Static content, lazy load)
```js
const FAQPage = lazy(() => import('@/pages/FAQ'));
```

#### Phase 3: Admin Pages (Only loaded if admin)
```js
const AdminReports = lazy(() => import('@/pages/AdminReports'));
```

### Route-Level Code Splitting
- [x] AI/Reports lazy-loaded (to implement)
- [ ] Monitor build size post-split
- [ ] Confirm route transitions don't show white screen

---

## SECTION B: API Robustness

### Safe Timeouts & Error States

#### Pattern: Timeouts on Long-Running Queries
```js
const { data: blends, isLoading, error } = useQuery({
  queryKey: ['blends', user?.email],
  queryFn: async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      return await base44.entities.TobaccoBlend.filter(/* ... */, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  },
});
```

**Apply to:**
- [ ] Pipes list query (10s timeout)
- [ ] Blends list query (10s timeout)
- [ ] Home overview queries (8s timeout)
- [ ] Reports/AI queries (15s timeout - user-triggered)

#### Pattern: Graceful Empty States
```js
if (error && !isLoading) {
  return <ErrorFallback error={error} onRetry={() => refetch()} />;
}

if (isLoading) return <LoadingSkeleton />;
if (!data || data.length === 0) return <EmptyState />;
```

**Apply to:**
- [x] Pipe list (already has EmptyState)
- [x] Tobacco list (already has EmptyState)
- [ ] Home (add error boundary)
- [ ] Reports (add timeout + error UI)
- [ ] AI pages (add timeout + loading states)

#### Pattern: Retry Logic (Selective)
```js
queryFn: async () => { /* ... */ },
retry: 2, // Automatic retry on network error
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
```

**Apply to:**
- [ ] Critical list queries (Pipes, Blends)
- [ ] Home overview queries
- ❌ NOT to user-triggered AI/Reports (user controls retry via "Try Again" button)

---

## SECTION C: Caching & Invalidation Sanity

### Query Key Consistency
**Audit:** Ensure no stale data or infinite refetch loops

#### Pipes Cache
```js
queryKey: ['pipes', user?.email]
// Invalidate on create/update/delete
invalidateQueries({ queryKey: ['pipes', user?.email] })
```

#### Blends Cache
```js
queryKey: ['blends', user?.email, sortBy]
// Include sortBy to prevent mis-sorting on invalidation
// Invalidate on create/update/delete/bulk
invalidateQueries({ queryKey: ['blends', user?.email] }) // Invalidates all sorts
```

#### Home Overview
```js
queryKey: ['pipes', user?.email] // Reuses Pipes query
queryKey: ['blends', user?.email] // Reuses Blends query
// No separate "home" cache - avoids duplication
```

**Checks:**
- [ ] Blends list re-sorts after invalidation
- [ ] Pipes count updates after add/delete
- [ ] Home doesn't refetch unnecessarily on nav
- [ ] Smoking logs don't stale after adding entry

### Prevent Infinite Refetch Loops
**Pattern:** staleTime + refetchOnMount: false
```js
staleTime: 30000, // Data fresh for 30s
refetchOnMount: false, // Don't refetch on navigation back
```

**Apply to:**
- [ ] Pipes list (staleTime: 30s)
- [ ] Blends list (staleTime: 30s)
- [ ] Smoking logs (staleTime: 60s)
- [ ] Home overview (staleTime: 60s)

---

## SECTION D: Image Performance

### Lazy Loading
```jsx
<img 
  src={photo} 
  alt="pipe photo" 
  loading="lazy" // Native lazy load
  decoding="async"
/>
```

**Apply to:**
- [ ] Pipe photos in cards (already lazy from HTML native)
- [ ] Tobacco logos in cards (check if missing)
- [ ] Photos in detail pages (batch defer)
- [ ] User avatars (if added)

### Image Sizing & Layout Shift Prevention
```css
img {
  width: 100%;
  height: auto;
  aspect-ratio: 4/5; /* Prevent layout shift while loading */
}
```

**Check:**
- [ ] Pipe card photos use aspect-ratio
- [ ] Tobacco card logos use fixed container size
- [ ] Detail page photos sized before load
- [ ] No layout shift while images load

### Correct Sizing (Avoid Oversized Images)
**Current state:** TBD (audit in Phase 6)

**Target:**
- Thumbnails: < 100KB
- Detail photos: < 300KB
- Logos: < 50KB

---

## SECTION E: Observability & Error Logging

### Client Error Logging (Implemented Phase 4)

**Setup in Layout.js:**
```jsx
useEffect(() => {
  setupErrorHandlers(); // Attach global error listeners
}, []);
```

**Usage in catch blocks:**
```jsx
try {
  await savePipe(data);
} catch (error) {
  logError(error, { label: 'savePipe', pipeId: pipe.id });
  toast.error('Failed to save pipe');
}
```

**Logged data:**
- Timestamp, route, language, user email
- Error message (sanitized, no URLs/emails)
- Stack trace (first 5000 chars)
- User context (what were they doing)

**Backend:** `logClientError` function stores in console logs + optional entity

### Key Metrics to Monitor
- [ ] Routes with highest error rates
- [ ] Language-specific issues (e.g., JA users hitting certain errors)
- [ ] Patterns (e.g., "Stripe checkout fails on iOS")
- [ ] Error frequency over time

---

## SECTION F: Release Checks (Pre-Production)

### Stripe Flow Validation
- [ ] Checkout button triggers Stripe modal
- [ ] Subscription status updates after payment
- [ ] Trial countdown displays correctly
- [ ] Upgrade prompt appears after trial end
- [ ] Cancellation flow works

**Test in sandbox:**
- [ ] Free → Premium upgrade
- [ ] Existing Premium upgrade to Pro
- [ ] Subscription renewal (fake date if possible)

### Admin Tools Stability
- [ ] Admin reports page loads without errors
- [ ] User report requests don't break UI
- [ ] Subscription queue doesn't stale
- [ ] No admin-only leaks in regular app (feature gates work)

### Navigation Stability
- [ ] Back button works across all pages
- [ ] Route changes don't show white screen
- [ ] Auth guard redirects properly
- [ ] Language switch doesn't break route

### Mobile-First Checks (Spot)
- [ ] Home loads fast on slow 3G (Chrome throttle)
- [ ] Forms submit on mobile keyboard
- [ ] No horizontal overflow on narrow screens

---

## SECTION G: Risk Mitigation Patterns

### White Screen Prevention
**Pattern:** Always show skeleton or empty state while loading
```jsx
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorFallback />;
if (!data) return <EmptyState />;
```

### Null/Undefined Safety
**Already in place (Phase 3 review + safe translation wrapper)**
- Use optional chaining: `pipe?.id`
- Use nullish coalescing: `value ?? fallback`
- Defensive filters: `.filter(Boolean)`

### Transaction Safety (Optimistic Updates)
**Current pattern (SmokingLogPanel.js):**
```jsx
onMutate: async (newData) => {
  // Revert on error
  return { previousData };
}
onError: (err, vars, context) => {
  queryClient.setQueryData(queryKey, context.previousData);
}
```

**Audit:**
- [ ] Favorite toggles are optimistic
- [ ] Bulk updates are optimistic with fallback
- [ ] Form submits show optimistic state or spinner

---

## Performance Checklist

- [ ] Home page < 2s load time (baseline measure, then optimize)
- [ ] Code-split AI/Reports modules (lazy load)
- [ ] Timeout + error handling on all queries
- [ ] Graceful empty/error states on all pages
- [ ] Retry logic on network queries (but not user-triggered)
- [ ] Image lazy loading + aspect ratio set
- [ ] staleTime configured to prevent infinite refetch
- [ ] Global error handlers attached + logging active
- [ ] Stripe flows working in sandbox
- [ ] Admin tools don't crash app
- [ ] No white screens on route transitions
- [ ] Mobile (3G throttle) Home loads within 3s

---

## Post-Launch Monitoring

**Week 1:** Watch error logs for new patterns  
**Week 2:** Analyze performance metrics, identify slow routes  
**Week 3+:** Iterate on high-error pages, optimize slow routes  

**Error log queries (once implemented):**
```sql
-- Most common errors
SELECT message, COUNT(*) as count 
FROM client_errors 
GROUP BY message 
ORDER BY count DESC 
LIMIT 10;

-- Errors by language
SELECT language, COUNT(*) as count 
FROM client_errors 
GROUP BY language;

-- Errors by route
SELECT route, COUNT(*) as count 
FROM client_errors 
GROUP BY route 
ORDER BY count DESC;
```

---

## Next: Execute Phase 6
1. Measure current Home load time
2. Apply code-splitting to AI/Report modules
3. Add timeouts to queries
4. Verify Stripe sandbox flow
5. Enable error logging
6. Test on mobile (3G throttle)
7. Sign-off when targets met