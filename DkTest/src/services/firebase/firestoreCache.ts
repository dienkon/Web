/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Firestore Cache, Request Deduplicator & Subscription Manager
 * Implements architectural directives from TODO.md:
 * - Deterministic In-Memory Cache with TTL
 * - In-flight Request Deduplication (eliminates concurrent duplicate reads)
 * - Reference-counted Firestore Subscription Manager (single listener shared across components)
 * - Cache Invalidation by deterministic key or regex pattern
 * - Dev-only Metrics Instrumentation
 */

import { logCacheHit } from "../../utils/firestoreLogger";

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface FirestoreMetrics {
  reads: number;
  writes: number;
  cacheHits: number;
  cacheMisses: number;
  dedupedRequests: number;
  listenerStarts: number;
  listenerStops: number;
  activeListeners: number;
}

export const firestoreMetrics: FirestoreMetrics = {
  reads: 0,
  writes: 0,
  cacheHits: 0,
  cacheMisses: 0,
  dedupedRequests: 0,
  listenerStarts: 0,
  listenerStops: 0,
  activeListeners: 0,
};

// In-Memory Document & Query Cache
const cache = new Map<string, CacheEntry>();

// In-Flight Promise Map for Concurrent Request Deduplication
const inFlightRequests = new Map<string, Promise<any>>();

// Shared Listener Subscriptions with Reference Counting
interface SharedSubscription {
  refCount: number;
  unsubscribe: () => void;
  lastData: any;
  callbacks: Set<(data: any) => void>;
}
const sharedSubscriptions = new Map<string, SharedSubscription>();

export const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds default

export const FirestoreCache = {
  /**
   * Retrieves an item from memory cache if fresh.
   */
  get<T = any>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) {
      firestoreMetrics.cacheMisses++;
      return null;
    }
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      cache.delete(key);
      firestoreMetrics.cacheMisses++;
      return null;
    }
    firestoreMetrics.cacheHits++;
    logCacheHit(key, "Retrieved from centralized FirestoreCache");
    return entry.data as T;
  },

  /**
   * Stores an item into cache with a specific TTL.
   */
  set<T = any>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    if (data === undefined) return;
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  },

  /**
   * Checks whether a non-expired entry exists in cache.
   */
  has(key: string): boolean {
    const entry = cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return false;
    }
    return true;
  },

  /**
   * Invalidate a single key or all keys matching a regex or prefix.
   */
  invalidate(keyOrPattern: string | RegExp): void {
    if (typeof keyOrPattern === "string") {
      cache.delete(keyOrPattern);
      // Also invalidate any query keys prefixed with this string
      for (const k of cache.keys()) {
        if (k.startsWith(`${keyOrPattern}:`) || k.startsWith(`${keyOrPattern}?`)) {
          cache.delete(k);
        }
      }
    } else {
      for (const k of cache.keys()) {
        if (keyOrPattern.test(k)) {
          cache.delete(k);
        }
      }
    }
  },

  /**
   * Invalidate all keys starting with a given prefix.
   */
  invalidatePrefix(prefix: string): void {
    for (const k of cache.keys()) {
      if (k.startsWith(prefix)) {
        cache.delete(k);
      }
    }
  },

  /**
   * Completely clear the cache.
   */
  clear(): void {
    cache.clear();
  },

  /**
   * Request Deduplication wrapper:
   * If a request with the same deterministic key is already in flight, return the running promise.
   * If not, invoke fetcher and cache the promise until resolved.
   */
  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (inFlightRequests.has(key)) {
      firestoreMetrics.dedupedRequests++;
      return inFlightRequests.get(key)! as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        return result;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, promise);
    return promise;
  },

  /**
   * Fetch with cache and deduplication:
   * 1. If cache hit -> return cached data immediately (0 reads).
   * 2. If in-flight -> await existing promise (0 extra reads).
   * 3. Else -> fetch, save to cache, and return.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS,
    forceRefresh: boolean = false
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = FirestoreCache.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    return FirestoreCache.dedupe<T>(key, async () => {
      const data = await fetcher();
      if (data !== undefined && data !== null) {
        FirestoreCache.set(key, data, ttlMs);
      }
      return data;
    });
  },

  /**
   * Reference-Counted Shared Subscription Manager:
   * Allows multiple components to subscribe to the same Firestore query or document.
   * Only ONE active listener is attached to Firestore.
   * When all components unmount, the Firestore listener is cleanly torn down.
   */
  subscribe<T>(
    key: string,
    listenerFactory: (emit: (data: T) => void) => () => void,
    callback: (data: T) => void
  ): () => void {
    let sub = sharedSubscriptions.get(key);

    if (!sub) {
      firestoreMetrics.listenerStarts++;
      firestoreMetrics.activeListeners++;
      const callbacks = new Set<(data: any) => void>();
      callbacks.add(callback);

      sub = {
        refCount: 1,
        lastData: undefined,
        callbacks,
        unsubscribe: () => {},
      };

      const unsubFirestore = listenerFactory((data: T) => {
        if (!sub) return;
        sub.lastData = data;
        for (const cb of sub.callbacks) {
          try {
            cb(data);
          } catch (e) {
            console.warn(`[FirestoreSubscriptionManager] Callback error on ${key}:`, e);
          }
        }
      });

      sub.unsubscribe = unsubFirestore;
      sharedSubscriptions.set(key, sub);
    } else {
      sub.refCount++;
      sub.callbacks.add(callback);
      // Immediately emit last known value if present for instant render
      if (sub.lastData !== undefined) {
        try {
          callback(sub.lastData);
        } catch (e) {}
      }
    }

    // Return individual unsubscription function
    return () => {
      const current = sharedSubscriptions.get(key);
      if (!current) return;

      current.callbacks.delete(callback);
      current.refCount--;

      if (current.refCount <= 0) {
        firestoreMetrics.listenerStops++;
        firestoreMetrics.activeListeners = Math.max(0, firestoreMetrics.activeListeners - 1);
        try {
          current.unsubscribe();
        } catch (e) {}
        sharedSubscriptions.delete(key);
      }
    };
  },

  /**
   * Get telemetry metrics
   */
  getMetrics(): FirestoreMetrics {
    return { ...firestoreMetrics };
  },

  /**
   * Reset metrics counters
   */
  resetMetrics(): void {
    firestoreMetrics.reads = 0;
    firestoreMetrics.writes = 0;
    firestoreMetrics.cacheHits = 0;
    firestoreMetrics.cacheMisses = 0;
    firestoreMetrics.dedupedRequests = 0;
    firestoreMetrics.listenerStarts = 0;
    firestoreMetrics.listenerStops = 0;
  },
};
