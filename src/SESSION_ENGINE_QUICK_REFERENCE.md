# Tonight's Session Engine — Quick Reference

## Files
- **Backend:** `functions/generateSessionRecommendation.js` (~11KB, 1 function)
- **Frontend:** `components/hub/TonightSessionCard.jsx` (updated, mode UI + recording)
- **Docs:** `TONIGHT_SESSION_ENGINE_UPGRADE_SUMMARY.md` (complete reference)

---

## 5 Recommendation Modes

| Mode | Use Case | Focus |
|------|----------|-------|
| 🎯 **Balanced** | Default, everyday | Favorites + underused items |
| 🔄 **Rotation** | Neglected pipes | Strongly emphasize underused |
| ⭐ **Favorites** | Best of the best | Highest-rated items only |
| 🔍 **Exploration** | Try new things | Untested combinations |
| 😌 **Relaxed** | Easy evening | Smooth, mild tobacco |

---

## Algorithm Flow

```
1. Score each pipe    → Apply mode adjustments → Avoid recent usage
2. Score each blend   → Apply mode adjustments → Check preferences
3. Score each bottle  → Apply mode adjustments → Match whiskey style
4. Select top 40% from each category
5. Check pairing compatibility
6. Find best match → Generate rationale → Create learning context
7. Return recommendation with explanation
```

---

## User Workflow

```
Hub Page Load
    ↓
Tonight's Session displays
    ↓
User selects mode (default: Balanced)
    ↓
AI generates pipe + blend + whiskey recommendation
    ↓
User can:
    ├─ Click "Record Session" → Creates SmokingLog
    ├─ Click "Curator" → Get detailed explanation
    └─ Click "Refresh" → New recommendation same mode
```

---

## Scoring Rules

**Favorites & Ratings:**
- +30 for favorite
- +5 per rating point (1-5)

**Underuse Factor (mode-dependent):**
- Rotation: +20 × underused_amount
- Balanced: +8 × underused_amount
- Exploration: +15 × underused_amount
- Favorites: -10 × underused_amount (deprioritize)

**Recent Usage Penalty:**
- If used in last 3 days: -15 × (3 - days_since)

**Mode Bonuses:**
- Relaxed mode: +15 for mild strength items
- Exploration mode: +20 for untested pairings

---

## Data Flow

```
Collection Data (Pipes, Blends, Bottles)
    ↓
TasteProfile (Usage history, learned patterns)
    ↓
UserProfile (Preferences, strength/type selection)
    ↓
generateSessionRecommendation() → Score & rank
    ↓
Recommendation object {
  pipe, blend, whiskey,
  flavor_theme, rationale,
  learning_context
}
    ↓
Display in UI
    ↓
User clicks "Record Session"
    ↓
SmokingLog created with pipe_id, blend_id
```

---

## Function Signature

```javascript
await base44.functions.invoke('generateSessionRecommendation', {
  pipes: Array,              // [{ id, name, maker, shape, rating, is_favorite, ... }]
  blends: Array,             // [{ id, name, manufacturer, blend_type, rating, is_favorite, ... }]
  bottles: Array,            // [{ id, name, distillery, type, rating, is_favorite, ... }]
  tasteProfile: Object,      // { session_count, pipe_usage, blend_usage, pairing_patterns, ... }
  userProfile: Object,       // { whiskey_preferences, preferred_blend_types, strength_preference, ... }
  mode: String,              // 'balanced' | 'rotation' | 'favorites' | 'exploration' | 'relaxed'
  previousPairings: Array    // [{ pipe, blend, bottle }, ...] (future feature)
})
```

**Returns:**
```javascript
{
  pipe: "Dunhill Briar XYZ",
  pipe_id: "pipe_123",
  blend: "Samuel Gawith Virginia",
  blend_id: "blend_456",
  whiskey: "Woodford Reserve",
  whiskey_id: "bottle_789",
  flavor_theme: "Warm & Sweet",
  rationale: "Pairing Virginia blend with Bourbon creates a balanced...",
  learning_context: "Adapted from 22 sessions · 5 pairing patterns learned",
  mode: "balanced"
}
```

---

## Session Recording

```javascript
// Automatic when user clicks "Record Session"
await base44.entities.SmokingLog.create({
  pipe_id: recommendation.pipe_id,        // Auto-linked
  pipe_name: recommendation.pipe,         // Auto-filled
  blend_id: recommendation.blend_id,      // Auto-linked
  blend_name: recommendation.blend,       // Auto-filled
  bowls_used: 1,                          // Default
  date: new Date().toISOString().split('T')[0],  // Today
  is_break_in: false,                     // Not a break-in session
  notes: "Recommended session (balanced mode)"   // Auto-note
})
```

---

## Flavor Themes (Auto-Generated)

- **Rich & Smoky** → Peated whiskey + dark tobacco
- **Warm & Sweet** → Bourbon + sweet tobacco (caramel, vanilla)
- **Bright & Smooth** → Virginia blend + light whiskey
- **Complex & Balanced** → English blend + balanced whiskey
- **Personalized Experience** → Default/other combinations

---

## Key Features

✅ **Intelligent scoring** based on ratings, favorites, usage history  
✅ **Multi-mode support** for different occasions and moods  
✅ **Pairing compatibility** checks (avoids flavor clashes)  
✅ **Learning context** shows confidence level and patterns learned  
✅ **One-click recording** creates SmokingLog automatically  
✅ **Refresh capability** generates new combos without changing mode  
✅ **Cache-aware** (4-hour cache to reduce API calls)  
✅ **Future-ready** for historical tracking and pairing prediction  

---

## Common Questions

**Q: What happens if I don't have any bottles?**  
A: Recommendation will suggest pipe + blend only, whiskey field will be null.

**Q: Can I regenerate a recommendation in the same mode?**  
A: Yes, click the refresh button. New pairing will be generated from lower-scored items.

**Q: How does "Exploration" mode differ from "Balanced"?**  
A: Exploration strongly avoids any pairings that have been used together before, encouraging new combinations.

**Q: Are recorded sessions automatically shared?**  
A: No, they're private. You can manually share via Curator if desired.

**Q: How often should I change modes?**  
A: That's up to you. Rotation mode is great for long-term collection care. Favorites for special evenings.

---

## Next Phase Roadmap

1. **Session History Storage** — Track all recommendations & ratings
2. **Adaptive Mode Hints** — "You usually prefer Rotation mode"
3. **Seasonal Logic** — Winter/Summer themed suggestions
4. **Pairing ML Model** — Predict satisfaction score
5. **Collection Freshness** — Alert on stagnant items
6. **Social Sharing** — Share sessions with collectors

---

**Last Updated:** March 16, 2026  
**Status:** Production Ready ✅