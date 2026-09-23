/**
 * Cache Policy & Invalidation Manager
 */
import { memoryCache } from "./memory-cache.js";

export const CacheKeys = {
  DOCUMENTS: "docs:all",
  DOC_PREFIX: "doc:",
  FEATURED_DOCS: "docs:featured",
  KEYWORDS: "keywords:all",
  ADMIN_USERS: "admin:users",
  ADMIN_TX: "admin:tx",
  ADMIN_REPORTS: "admin:reports",
  ADMIN_LOGS: "admin:logs",
  ADMIN_KEY_POOLS: "admin:key_pools",
  ADMIN_STATS: "admin:stats",
};

export const cachePolicy = {
  invalidateDocuments() {
    memoryCache.delete(CacheKeys.DOCUMENTS);
    memoryCache.delete(CacheKeys.FEATURED_DOCS);
    memoryCache.invalidatePrefix(CacheKeys.DOC_PREFIX);
  },

  invalidateKeywords() {
    memoryCache.delete(CacheKeys.KEYWORDS);
  },

  invalidateAdmin(tab = null) {
    if (!tab) {
      memoryCache.invalidatePrefix("admin:");
    } else {
      memoryCache.delete(`admin:${tab}`);
    }
  },
};
