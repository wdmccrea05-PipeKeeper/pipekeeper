/**
 * fetchAllEntities.js
 *
 * Skip-based pagination helper for Base44 entity queries.
 *
 * The Base44 SDK `.filter(filterObj, sortOrder, limit, skip)` defaults to 50
 * records per call. To retrieve a user's complete history, callers must page
 * through results with increasing `skip` values until a partial page is
 * returned (indicating the final page).
 *
 * This helper:
 *  - Pages through until all records are collected.
 *  - Deduplicates by `id` so duplicate rows from unstable ordering do not
 *    inflate the result set.
 *  - Treats an empty page or a page shorter than `pageSize` as the end of
 *    the data, even if the cursor would theoretically advance further.
 *  - Enforces a hard safety cap (`maxPages`) to prevent runaway loops caused
 *    by a repeated cursor or an API bug returning the same page indefinitely.
 *  - When a `label` is provided, emits `console.info` diagnostics at start
 *    and completion to help trace platform-specific fetch behaviour.
 *
 * @param {Object}  entity             Base44 entity object (e.g. base44.entities.Pipe)
 * @param {Object}  filterObj          Filter criteria forwarded to entity.filter()
 * @param {string}  [sortOrder]        Sort specifier, e.g. '-updated_date'. Consistent
 *                                     ordering across pages reduces duplicate risk.
 * @param {number}  [pageSize=5000]    Records requested per API call. The SDK honours
 *                                     values up to 5 000 per request.
 * @param {number}  [maxPages=200]     Hard upper bound on the number of pages fetched.
 *                                     200 × 5 000 = 1 000 000 records before the cap.
 * @param {string}  [label]            Optional caller label (e.g. component name +
 *                                     entity) used in diagnostic console.info logs.
 *                                     Omit in production-silent code paths.
 * @returns {Promise<Array>}           All matching records, deduplicated by id.
 */
export async function fetchAllEntities(
  entity,
  filterObj,
  sortOrder = '-updated_date',
  pageSize = 5000,
  maxPages = 200,
  label = undefined,
) {
  if (label) {
    console.info('[PK:fetch:start]', {
      label,
      helper: 'fetchAllEntities',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      sortOrder,
      pageSize,
    });
  }

  const seen = new Set();
  const results = [];
  let skip = 0;
  let pagesRead = 0;

  while (pagesRead < maxPages) {
    let page;
    try {
      page = await entity.filter(filterObj, sortOrder, pageSize, skip);
    } catch {
      // Surface errors from the final completed pages, not a mid-stream retry
      break;
    }

    if (!Array.isArray(page) || page.length === 0) break;

    for (const row of page) {
      const id = row?.id;
      if (id != null) {
        if (!seen.has(id)) {
          seen.add(id);
          results.push(row);
        }
        // Duplicate id — already collected from a previous page; skip.
      } else {
        // No id field — include unconditionally (e.g. aggregate/computed rows).
        results.push(row);
      }
    }

    pagesRead += 1;

    // Partial page means we've reached the end of the dataset.
    if (page.length < pageSize) break;

    skip += pageSize;
  }

  if (label) {
    console.info('[PK:fetch:done]', {
      label,
      helper: 'fetchAllEntities',
      recordsReturned: results.length,
      pageCount: pagesRead,
      finalSessionCount: results.length,
    });
  }

  return results;
}
