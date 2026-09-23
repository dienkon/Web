/**
 * UniqueKey Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";
import { memoryCache } from "../cache/memory-cache.js";
import { CacheKeys, cachePolicy } from "../cache/cache-policy.js";
import { APP_CONFIG } from "../config/app-config.js";

export const KeyRepository = {
  /**
   * Get single key pool
   */
  async getKeyPool(poolId) {
    if (!poolId) return null;
    return await FirebaseRepository.getKeyDb(Collections.UNIQUE_KEY_POOLS, poolId);
  },

  /**
   * Get all key pools (Admin)
   */
  async getAllKeyPools(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.ADMIN_KEY_POOLS);
      if (cached) return cached;
    }

    const pools = (await FirebaseRepository.getKeyDb(Collections.UNIQUE_KEY_POOLS)) || {};
    memoryCache.set(CacheKeys.ADMIN_KEY_POOLS, pools, APP_CONFIG.CACHE.ADMIN_CACHE_TTL_MS);
    return pools;
  },

  /**
   * Set key pool
   */
  async setKeyPool(poolId, poolData) {
    cachePolicy.invalidateAdmin("key_pools");
    return await FirebaseRepository.setKeyDb(Collections.UNIQUE_KEY_POOLS, poolId, poolData);
  },

  /**
   * Delete key pool
   */
  async deleteKeyPool(poolId) {
    cachePolicy.invalidateAdmin("key_pools");
    return await FirebaseRepository.removeKeyDb(Collections.UNIQUE_KEY_POOLS, poolId);
  },

  /**
   * Get allocations for a pool
   */
  async getKeyAllocations(poolId) {
    if (!poolId) return {};
    return (await FirebaseRepository.getKeyDb(Collections.KEY_ALLOCATIONS, poolId)) || {};
  },

  /**
   * Get single key allocation
   */
  async getSingleAllocation(poolId, safeKey) {
    return await FirebaseRepository.getKeyDb(`${Collections.KEY_ALLOCATIONS}/${poolId}`, safeKey);
  },

  /**
   * Save key allocation
   */
  async setKeyAllocation(poolId, safeKey, allocationData) {
    return await FirebaseRepository.setKeyDb(
      `${Collections.KEY_ALLOCATIONS}/${poolId}`,
      safeKey,
      allocationData,
    );
  },

  /**
   * Update key allocation
   */
  async updateKeyAllocation(poolId, safeKey, partial) {
    return await FirebaseRepository.updateKeyDb(
      `${Collections.KEY_ALLOCATIONS}/${poolId}`,
      safeKey,
      partial,
    );
  },

  /**
   * Remove key allocation
   */
  async removeKeyAllocation(poolId, safeKey) {
    return await FirebaseRepository.removeKeyDb(
      `${Collections.KEY_ALLOCATIONS}/${poolId}`,
      safeKey,
    );
  },

  /**
   * Log key usage on main db
   */
  async logKeyUsage(payload) {
    cachePolicy.invalidateAdmin("logs");
    return await FirebaseRepository.push(Collections.KEY_USAGE_LOGS, {
      ...payload,
      createdAt: Date.now(),
    });
  },

  /**
   * Get all key usage logs (Admin)
   */
  async getAllKeyUsageLogs(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.ADMIN_LOGS);
      if (cached) return cached;
    }

    const logs = await FirebaseRepository.getAll(Collections.KEY_USAGE_LOGS);
    memoryCache.set(CacheKeys.ADMIN_LOGS, logs, APP_CONFIG.CACHE.ADMIN_CACHE_TTL_MS);
    return logs;
  },
};
