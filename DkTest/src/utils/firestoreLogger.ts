/**
 * Centralized Firestore Logger & Performance Tracker
 * Provides formatted, colorful, and transparent console logs for every document read, query, and cache hit.
 */

interface ReadStats {
  totalDocsRead: number;
  totalQueries: number;
  cacheHits: number;
  totalWrites: number;
  sessionStartedAt: number;
}

const stats: ReadStats = {
  totalDocsRead: 0,
  totalQueries: 0,
  cacheHits: 0,
  totalWrites: 0,
  sessionStartedAt: Date.now(),
};

/**
 * Log a single document read (1 doc)
 */
export function logDocRead(
  collection: string,
  docId: string,
  arg3?: number | boolean | string,
  arg4?: number | string,
  arg5?: string
): void {
  stats.totalDocsRead += 1;
  let durationMs: number | undefined;
  let purpose: string | undefined;
  let exists: boolean | undefined;

  if (typeof arg3 === "boolean") exists = arg3;
  else if (typeof arg3 === "number") durationMs = arg3;
  else if (typeof arg3 === "string") purpose = arg3;

  if (typeof arg4 === "number") durationMs = arg4;
  else if (typeof arg4 === "string") purpose = arg4;

  if (typeof arg5 === "string") purpose = arg5;

  const timeStr = durationMs !== undefined ? ` [${durationMs.toFixed(0)}ms]` : "";
  const statusStr = exists !== undefined ? ` (${exists ? "found" : "not found"})` : "";
  const purposeStr = purpose ? ` | Mục đích: ${purpose}` : "";

  console.log(
    `%c[Firestore READ: 1 doc]%c ${collection}/${docId}${statusStr}${timeStr}${purposeStr} (Lũy kế: ${stats.totalDocsRead} docs)`,
    "background: #1e40af; color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: bold",
    "color: inherit"
  );
}

/**
 * Log a collection query read (multiple docs)
 * Accepts either:
 * - (collection, count, purpose, limitApplied, durationMs)
 * - (collection, count, limitApplied, durationMs, purpose)
 */
export function logQueryRead(
  collection: string,
  count: number,
  arg3?: number | string,
  arg4?: number | string,
  arg5?: number | string
): void {
  stats.totalDocsRead += count;
  stats.totalQueries += 1;

  let limitApplied: number | undefined;
  let durationMs: number | undefined;
  let purpose: string | undefined;

  if (typeof arg3 === "string") {
    purpose = arg3;
    if (typeof arg4 === "number") limitApplied = arg4;
    if (typeof arg5 === "number") durationMs = arg5;
  } else if (typeof arg3 === "number") {
    limitApplied = arg3;
    if (typeof arg4 === "number") durationMs = arg4;
    else if (typeof arg4 === "string") purpose = arg4;
    if (typeof arg5 === "string") purpose = arg5;
  }

  const timeStr = durationMs !== undefined ? ` [${durationMs.toFixed(0)}ms]` : "";
  const limitStr = limitApplied !== undefined ? ` (limit: ${limitApplied})` : "";
  const purposeStr = purpose ? ` | Mục đích: ${purpose}` : "";

  console.log(
    `%c[Firestore READ_QUERY: ${count} doc(s)]%c ${collection}${limitStr}${timeStr}${purposeStr} (Lũy kế: ${stats.totalDocsRead} docs, ${stats.totalQueries} queries)`,
    "background: #065f46; color: #a7f3d0; padding: 2px 6px; border-radius: 4px; font-weight: bold",
    "color: inherit"
  );
}

/**
 * Log a cache hit (0 document reads!)
 */
export function logCacheHit(key: string, purpose?: string): void {
  stats.cacheHits += 1;
  const purposeStr = purpose ? ` | Mục đích: ${purpose}` : "";

  console.log(
    `%c[Firestore CACHE_HIT: 0 reads]%c ${key}${purposeStr} (Đọc từ RAM / Tiết kiệm 100% quota)`,
    "background: #5b21b6; color: #ede9fe; padding: 2px 6px; border-radius: 4px; font-weight: bold",
    "color: inherit"
  );
}

/**
 * Log a document write / update
 */
export function logDocWrite(
  collection: string,
  docId: string,
  op: string = "SET",
  arg4?: number | string,
  arg5?: string
): void {
  stats.totalWrites += 1;
  let durationMs: number | undefined;
  let purpose: string | undefined;

  if (typeof arg4 === "number") durationMs = arg4;
  else if (typeof arg4 === "string") purpose = arg4;

  if (typeof arg5 === "string") purpose = arg5;

  const timeStr = durationMs !== undefined ? ` [${durationMs.toFixed(0)}ms]` : "";
  const purposeStr = purpose ? ` | Mục đích: ${purpose}` : "";

  console.log(
    `%c[Firestore WRITE: 1 doc (${op.toUpperCase()})]%c ${collection}/${docId}${timeStr}${purposeStr}`,
    "background: #9a3412; color: #ffedd5; padding: 2px 6px; border-radius: 4px; font-weight: bold",
    "color: inherit"
  );
}

/**
 * Get current session read statistics
 */
export function getFirestoreReadStats(): ReadStats & { uptimeSeconds: number } {
  return {
    ...stats,
    uptimeSeconds: Math.floor((Date.now() - stats.sessionStartedAt) / 1000),
  };
}
