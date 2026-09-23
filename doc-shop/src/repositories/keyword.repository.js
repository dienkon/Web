/**
 * Keywords & Categories Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";
import { memoryCache } from "../cache/memory-cache.js";
import { CacheKeys, cachePolicy } from "../cache/cache-policy.js";
import { APP_CONFIG } from "../config/app-config.js";

export const KeywordRepository = {
  /**
   * Get all keywords with caching
   */
  async getAllKeywords(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.KEYWORDS);
      if (cached) return cached;
    }

    const keywords = (await FirebaseRepository.getAll(Collections.KEYWORDS)) || {};
    memoryCache.set(CacheKeys.KEYWORDS, keywords, APP_CONFIG.CACHE.KEYWORDS_TTL_MS);
    return keywords;
  },

  /**
   * Upsert keyword
   */
  async setKeyword(id, keywordData) {
    cachePolicy.invalidateKeywords();
    return await FirebaseRepository.update(Collections.KEYWORDS, id, keywordData);
  },

  /**
   * Delete keyword
   */
  async deleteKeyword(id) {
    cachePolicy.invalidateKeywords();
    return await FirebaseRepository.remove(Collections.KEYWORDS, id);
  },
};
