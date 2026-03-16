# Help System Maintenance & Extension Guide

## Quick Reference

### System Architecture

```
documentationRegistry.js (source of truth)
  ├── Hub documentation
  ├── PipeKeeper documentation
  ├── WhiskeyKeeper documentation
  └── Bundle documentation

moduleDetection.js (subscription logic)
  ├── Detect active modules
  ├── Get recommended tutorials
  └── Check module access

UI Components
  ├── TutorialSelector (lists available tutorials)
  ├── TutorialViewer (displays tutorial content)
  ├── DocumentationSearch (full-text search)
  ├── AiHelpAssistant (conversational help)
  └── SelfDiagnosticPanel (system health checks)

Pages
  ├── HelpCenter (central hub page)
  └── TroubleshootingFull (updated with search & diagnostics)
```

---

## How to Add Documentation for a New Module

### Step 1: Add Module to `documentationRegistry.js`

```javascript
// In DOCUMENTATION object:
mymodule: {
  tutorials: [
    {
      id: 'mymodule-getting-started',
      title: 'MyModule Getting Started',
      description: 'Learn the basics of MyModule',
      sections: [
        {
          heading: 'First Heading',
          content: 'Explanation here...'
        },
        {
          heading: 'Second Heading',
          content: 'More details...'
        }
      ]
    }
  ],
  troubleshooting: [
    {
      id: 'mymodule-issue-1',
      title: 'Common Problem',
      solution: 'Here is how to solve it...'
    }
  ],
  features: [
    {
      id: 'mymodule-feature-1',
      title: 'Feature Name',
      description: 'What this feature does',
      keywords: ['keyword1', 'keyword2']
    }
  ]
}
```

### Step 2: Update `moduleDetection.js`

If module requires special logic for detection:

```javascript
// In detectActiveModules():
if (modules.includes('mymodule')) {
  // Add logic to detect if user has access
  const hasMyModule = /* check subscription/entitlements */;
  if (hasMyModule) {
    modules.push('mymodule');
  }
}
```

### Step 3: Add Tutorial to Recommendations (Optional)

If you want it in the recommended tutorials list:

```javascript
// In getRecommendedTutorials():
if (modules.includes('mymodule')) {
  tutorials.push({
    module: 'mymodule',
    id: 'mymodule-getting-started',
    title: 'MyModule Getting Started',
    priority: 4  // After Hub, PipeKeeper, Bundle, WhiskeyKeeper
  });
}
```

### Step 4: Done!
- Documentation automatically searchable
- Tutorials appear in Tutorial Selector
- Self-diagnostic can reference module docs
- AI assistant can answer questions about it

---

## How to Add a Self-Diagnostic Check

### In `SelfDiagnosticPanel.jsx`

```javascript
// In diagnostics array, add:
{
  id: 'my-check',
  name: 'Check Name',
  check: async () => {
    // Your diagnostic logic
    const issue = /* check for problem */;
    
    if (issue) {
      return {
        severity: 'warning', // or 'info'
        message: 'Description of the issue',
        action: 'Button Text',
        actionUrl: '/PageName' // or omit for custom handling
      };
    }
    return null; // No issue found
  }
}
```

---

## How to Update Troubleshooting Content

### Quick Fix: Update `TroubleshootingFull.jsx`

The troubleshooting page now includes:
1. All original troubleshooting items (expandable cards)
2. DocumentationSearch component for searching
3. SelfDiagnosticPanel for automatic checking

To add more troubleshooting items to the page, add more `TroubleshootingItem` components with appropriate i18n keys.

### Better Fix: Add to Documentation Registry

Add to the relevant module's `troubleshooting` array in `documentationRegistry.js`. This makes it:
- Searchable
- Automatically available to AI assistant
- Available for diagnostics to reference

---

## Understanding the Subscription Tiers

### Module Access by Subscription

```
FREE
└─ Hub (always available)

PREMIUM (Monthly/Annual)
├─ Hub
└─ PipeKeeper

PRO (Monthly/Annual) — the Bundle
├─ Hub
├─ PipeKeeper
└─ WhiskeyKeeper

TRIAL (14 days)
├─ Hub
├─ PipeKeeper
└─ WhiskeyKeeper (full access during trial)
```

### How Module Detection Works

```javascript
const tier = subscription?.tier?.toLowerCase(); // 'premium', 'pro', etc.
const status = subscription?.status?.toLowerCase(); // 'active', 'trialing', 'trial', etc.

const isPaid = ['active', 'trialing', 'trial'].includes(status);
```

---

## Common Maintenance Tasks

### Updating a Tutorial

1. Find the tutorial in `documentationRegistry.js`
2. Update the `sections` array
3. Changes are live immediately

### Fixing Search Results

Search automatically includes:
- Tutorial titles and descriptions
- Tutorial section headings and content
- Troubleshooting titles and solutions
- Feature names and descriptions
- Feature keywords

To improve search results, enhance the `keywords` array in feature definitions.

### Testing Diagnostics

Before deploying a new diagnostic:

1. Test in dev environment
2. Ensure check is wrapped in try/catch
3. Verify it returns correct issue format
4. Test the suggested action works

### Localizing Documentation

Documentation strings should use i18n keys:
```javascript
t('help.sampleKey', 'English fallback text')
```

Add translations to `components/i18n/locales/[lang].js`.

---

## Performance Tips

### Search Optimization
- Search runs in memory, very fast
- For large doc sets (1000+ items), consider pagination
- Results are limited to 10 items by default

### AI Assistant Optimization
- AI help uses Gemini Flash (faster, cheaper)
- Searches top 3 relevant docs to provide context
- Consider rate limiting if heavily used

### Diagnostic Optimization
- Diagnostics run asynchronously
- Don't block UI while checking
- Cache results if checking same data repeatedly

---

## Troubleshooting the Help System

### Search not finding my documentation

Check:
1. Documentation is in correct module object
2. Titles/descriptions match search terms
3. Keywords are included in feature definitions
4. Spelling and case match

### Tutorials not appearing

Check:
1. Module is added to `detectActiveModules()`
2. User subscription matches module requirements
3. Tutorial ID matches in selector

### AI Assistant not working

Check:
1. Base44 integrations are available
2. LLM API has quota remaining
3. Documentation search returning results
4. Check browser console for errors

### Diagnostics not running

Check:
1. Each diagnostic is wrapped in try/catch
2. Async functions use await
3. Entity queries work (check network tab)
4. No syntax errors in check logic

---

## Best Practices

### Writing Documentation

1. **Clear Headings** — Use descriptive section titles
2. **Step-by-Step** — Number steps, make them actionable
3. **Examples** — Show what things look like
4. **Keywords** — Include search terms in features
5. **Short Paragraphs** — Easy to scan and read

### Maintaining Content

1. **Review Quarterly** — Keep docs fresh
2. **Track Analytics** — See what users search for
3. **Update with Features** — New features need docs
4. **Test Search** — Ensure docs are findable
5. **Update Tutorials** — When UI changes, update tuts

### Adding to Diagnostics

1. **Clear Error Messages** — User understands the issue
2. **Actionable Solutions** — User can fix it
3. **Safe Checks** — Don't modify data during check
4. **Fast Checks** — < 1 second per check
5. **Error Handling** — Graceful failure if check breaks

---

## Example: Adding CigarKeeper Documentation

```javascript
// Step 1: In documentationRegistry.js
cigarkeeper: {
  tutorials: [
    {
      id: 'cigarkeeper-getting-started',
      title: 'CigarKeeper Getting Started',
      description: 'Build and manage your cigar collection',
      sections: [
        {
          heading: 'Adding Your First Cigar',
          content: 'Go to CigarKeeper and click "Add Cigar"...'
        },
        {
          heading: 'Recording Cigar Details',
          content: 'After creating a cigar...'
        },
        // ... more sections
      ]
    }
  ],
  troubleshooting: [
    {
      id: 'cigar-storage',
      title: 'How do I store cigars?',
      solution: 'Store cigars in a humidor maintained at 65-70% humidity...'
    }
  ],
  features: [
    {
      id: 'humidor-tracking',
      title: 'Humidor Tracking',
      description: 'Track humidity, temperature, and cigar conditions',
      keywords: ['humidor', 'storage', 'conditions']
    }
  ]
}

// Step 2: In moduleDetection.js
// Add to detectActiveModules():
if (tier === 'premium-cigars' || tier === 'pro') {
  modules.push('cigarkeeper');
}

// Step 3: Add to getRecommendedTutorials():
if (modules.includes('cigarkeeper')) {
  tutorials.push({
    module: 'cigarkeeper',
    id: 'cigarkeeper-getting-started',
    title: 'CigarKeeper Getting Started',
    priority: 5
  });
}

// Done! Documentation automatically:
// - Searchable via DocumentationSearch
// - Available in Tutorial Selector
// - Answerable by AI Help Assistant
// - Referenced by Self-Diagnostics
```

---

## Support & Escalation

If you encounter issues:

1. **Search doesn't work** → Check documentationRegistry
2. **Tutorials missing** → Check moduleDetection
3. **AI gives wrong answers** → Improve doc keywords
4. **Diagnostics broken** → Check error handling
5. **Performance slow** → Profile and optimize checks

All components are designed for extensibility and maintainability. Happy documenting!