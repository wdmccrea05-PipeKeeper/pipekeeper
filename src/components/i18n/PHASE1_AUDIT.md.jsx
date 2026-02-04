# Phase 1: Stability Fixes - Audit in Progress

**Status:** Scanning for import errors and runtime crashes

## Fixes Applied So Far
- [x] Created `components/i18n/index.js` (single source of truth)
- [x] Created `components/utils/formatters.js` (centralized formatters)
- [x] Verified `safeTranslation.js` has defensive wrapper
- [x] Verified `localeFormatters.js` exports all formatters

## Known Issues (Being Scanned)
- useTranslation imports - verify all use safe wrapper
- formatCurrency imports - verify all use formatters module
- Filter dropdowns showing keys (tobacco.allTypes, pipes.allShapes)
- Template interpolation issues ({{total}}, {{breakIn}})

## Next Steps
1. Scan entire codebase for broken imports
2. Fix all useTranslation → safe import
3. Fix all formatCurrency → centralized import
4. Fix dropdown value/label mapping
5. Test Home/Pipes/Tobacco load with no errors