/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Firestore Repository Layer
 * Acts as the authoritative data access point across all services.
 * Integrates:
 * - Deterministic Document & Query Caching
 * - Concurrent In-Flight Request Deduplication
 * - Automatic Cache Invalidation on Mutations
 * - Detailed Performance Logging & Quota Tracking
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  DocumentReference,
  Query,
  SetOptions,
  UpdateData,
} from "firebase/firestore";
import { db } from "./config";
import { FirestoreCache, firestoreMetrics, DEFAULT_TTL_MS } from "./firestoreCache";
import { logDocRead, logQueryRead, logDocWrite } from "../../utils/firestoreLogger";

export interface RepositoryOptions {
  ttlMs?: number;
  forceRefresh?: boolean;
  purpose?: string;
}

export const FirestoreRepository = {
  /**
   * Retrieves a document by collection and ID with automatic caching and deduplication.
   */
  async getDocument<T = any>(
    collectionName: string,
    docId: string,
    options: RepositoryOptions = {}
  ): Promise<T | null> {
    const key = `doc:${collectionName}:${docId}`;
    const ttl = options.ttlMs ?? DEFAULT_TTL_MS;

    return FirestoreCache.getOrFetch<T | null>(
      key,
      async () => {
        const t0 = performance.now();
        firestoreMetrics.reads++;
        const docRef = doc(db, collectionName, docId);
        const snap = await getDoc(docRef);
        const durationMs = performance.now() - t0;

        logDocRead(collectionName, docId, snap.exists(), durationMs, options.purpose);

        if (!snap.exists()) {
          return null;
        }

        return { id: snap.id, ...snap.data() } as T;
      },
      ttl,
      options.forceRefresh
    );
  },

  /**
   * Executes a Firestore Query with caching and deduplication.
   * Requires a deterministic queryCacheKey (e.g. `exams:user_123:page_1`).
   */
  async getQuery<T = any>(
    queryCacheKey: string,
    queryRef: Query,
    options: RepositoryOptions & { collectionName?: string; limitApplied?: number } = {}
  ): Promise<T[]> {
    const key = `query:${queryCacheKey}`;
    const ttl = options.ttlMs ?? DEFAULT_TTL_MS;

    return FirestoreCache.getOrFetch<T[]>(
      key,
      async () => {
        const t0 = performance.now();
        const snap = await getDocs(queryRef);
        const durationMs = performance.now() - t0;
        firestoreMetrics.reads += snap.size;

        logQueryRead(
          options.collectionName || queryCacheKey,
          snap.size,
          options.limitApplied,
          durationMs,
          options.purpose
        );

        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      },
      ttl,
      options.forceRefresh
    );
  },

  /**
   * Saves or overwrites a document, automatically updating memory cache and invalidating dependent queries.
   */
  async setDocument<T extends Record<string, any>>(
    collectionName: string,
    docId: string,
    data: T,
    setOptions: SetOptions = {},
    options: { purpose?: string; ttlMs?: number } = {}
  ): Promise<void> {
    const t0 = performance.now();
    firestoreMetrics.writes++;
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, setOptions);
    const durationMs = performance.now() - t0;

    logDocWrite(collectionName, docId, (setOptions as any).merge ? "MERGE_SET" : "SET", durationMs, options.purpose);

    // Update in-memory cache with new state
    const key = `doc:${collectionName}:${docId}`;
    FirestoreCache.set(key, { id: docId, ...data }, options.ttlMs ?? DEFAULT_TTL_MS);

    // Invalidate any cached queries on this collection
    FirestoreCache.invalidate(new RegExp(`^query:${collectionName}`));
  },

  /**
   * Updates specific fields of an existing document, automatically invalidating stale caches.
   */
  async updateDocument(
    collectionName: string,
    docId: string,
    updates: UpdateData<any>,
    options: { purpose?: string } = {}
  ): Promise<void> {
    const t0 = performance.now();
    firestoreMetrics.writes++;
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, updates);
    const durationMs = performance.now() - t0;

    logDocWrite(collectionName, docId, "UPDATE", durationMs, options.purpose);

    // Invalidate document and related query caches
    const key = `doc:${collectionName}:${docId}`;
    FirestoreCache.invalidate(key);
    FirestoreCache.invalidate(new RegExp(`^query:${collectionName}`));
  },

  /**
   * Deletes a document from Firestore and clears related caches.
   */
  async deleteDocument(
    collectionName: string,
    docId: string,
    options: { purpose?: string } = {}
  ): Promise<void> {
    const t0 = performance.now();
    firestoreMetrics.writes++;
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    const durationMs = performance.now() - t0;

    logDocWrite(collectionName, docId, "DELETE", durationMs, options.purpose);

    // Invalidate document and query caches
    const key = `doc:${collectionName}:${docId}`;
    FirestoreCache.invalidate(key);
    FirestoreCache.invalidate(new RegExp(`^query:${collectionName}`));
  },

  /**
   * Invalidate cache directly
   */
  invalidateCache(keyOrPattern: string | RegExp): void {
    FirestoreCache.invalidate(keyOrPattern);
  },

  /**
   * Get fresh batch write instance
   */
  createBatch() {
    return writeBatch(db);
  },
};
