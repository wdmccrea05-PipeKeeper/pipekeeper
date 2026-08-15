/**
 * Server-side canonical full-entity fetcher for Base44 backend functions.
 *
 * Paginates through all records of an entity type using skip/limit, overcoming
 * the Base44 SDK's default page-size cap. Use this in any backend function that
 * needs the COMPLETE dataset (exports, reports, analytics, reconciliation).
 *
 * Usage:
 *   import { fetchAllEntitiesServer } from '../../shared/fetchAllEntitiesServer.ts';
 *   const allPipes = await fetchAllEntitiesServer(base44.asServiceRole.entities.Pipe, { created_by: email });
 */

const DEFAULT_PAGE_SIZE = 5000;
const MAX_PAGES = 200; // 5000 * 200 = 1,000,000 records max

export async function fetchAllEntitiesServer<T = any>(
  entityClient: any,
  filter: Record<string, any>,
  sort?: string,
  pageSize: number = DEFAULT_PAGE_SIZE,
  maxPages: number = MAX_PAGES,
  logTag?: string
): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;
  let pages = 0;

  while (pages < maxPages) {
    let batch: any[];
    try {
      batch = await entityClient.filter(filter, sort, pageSize, skip);
    } catch (err) {
      console.error(`[fetchAllEntitiesServer${logTag ? ':' + logTag : ''}] Error at skip=${skip}:`, err);
      throw err;
    }

    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);
    pages++;

    if (batch.length < pageSize) break;

    skip += pageSize;
  }

  if (pages >= maxPages) {
    console.warn(`[fetchAllEntitiesServer${logTag ? ':' + logTag : ''}] Reached max pages (${maxPages}). ${all.length} records fetched. There may be more.`);
  }

  return all;
}