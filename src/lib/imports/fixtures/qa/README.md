# Bulk import QA fixtures

This folder contains smoke-test CSVs for each supported bulk import type:

- `*_happy.csv` — fully valid rows for end-to-end success checks
- `*_mixed.csv` — mixed valid/warning/blocking rows for preview and error UX checks
- `*_duplicates.csv` — duplicate-sensitive rows for duplicate mode behavior checks
- `*_normalization.csv` — legacy/alias headers and mixed value formats

These fixtures are intentionally small and realistic for manual QA and quick automated import tests.
