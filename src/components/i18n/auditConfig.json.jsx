/*
 * i18n audit configuration — consumed by scripts/i18n-check.js.
 *
 * The checker strips this leading comment and parses the first JSON object it
 * finds (the block starting at the first brace below).
 *
 *  • excludePatterns     — RegExp source strings tested against each scanned
 *                          file's repo-relative path. Matching files are
 *                          skipped entirely. Used for test/spec files (whose
 *                          literal strings are intentional assertions) and for
 *                          the canonical locale-formatting helpers (which must
 *                          call Intl/toLocale* directly to implement the very
 *                          helpers everything else delegates to).
 *  • properNounAllowlist — Brand/product names that must never be translated
 *                          and therefore should never be flagged.
 */
{
  "excludePatterns": [
    "__tests__",
    "\\.test\\.",
    "\\.spec\\.",
    "src/components/utils/localeFormatters\\.jsx$",
    "src/lib/currency/"
  ],
  "properNounAllowlist": [
    "CollectionKeeper",
    "PipeKeeper",
    "WhiskeyKeeper",
    "CigarKeeper",
    "WineKeeper",
    "PipeKeeper Insights",
    "WhiskeyKeeper Insights",
    "CigarKeeper Insights",
    "WineKeeper Insights"
  ]
}
