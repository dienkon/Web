/**
 * User Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";
import { memoryCache } from "../cache/memory-cache.js";
import { CacheKeys, cachePolicy } from "../cache/cache-policy.js";
import { APP_CONFIG } from "../config/app-config.js";

export const UserRepository = {
  /**
   * Get single user by UID
   */
  async getUserById(uid) {
    if (!uid) return null;
    return await FirebaseRepository.get(Collections.USERS, uid);
  },

  /**
   * Listen to current user's record in realtime
   */
  listenUser(uid, callback) {
    if (!uid) return () => {};
    return FirebaseRepository.listen(Collections.USERS, uid, callback);
  },

  /**
   * Upsert user profile
   */
  async setUser(uid, userData) {
    cachePolicy.invalidateAdmin("users");
    return await FirebaseRepository.set(Collections.USERS, uid, userData);
  },

  /**
   * Update user profile fields
   */
  async updateUser(uid, partial) {
    cachePolicy.invalidateAdmin("users");
    return await FirebaseRepository.update(Collections.USERS, uid, partial);
  },

  /**
   * Update wallet balance
   */
  async updateWalletBalance(uid, newBalance) {
    cachePolicy.invalidateAdmin("users");
    return await FirebaseRepository.update(Collections.USERS, uid, {
      walletBalance: Number(newBalance || 0),
    });
  },

  /**
   * Fetch all users (Admin only, cached)
   */
  async getAllUsers(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.ADMIN_USERS);
      if (cached) return cached;
    }

    const users = await FirebaseRepository.getAll(Collections.USERS);
    memoryCache.set(CacheKeys.ADMIN_USERS, users, APP_CONFIG.CACHE.ADMIN_CACHE_TTL_MS);
    return users;
  },

  /**
   * Delete user record (Admin only)
   */
  async deleteUser(uid) {
    cachePolicy.invalidateAdmin("users");
    return await FirebaseRepository.remove(Collections.USERS, uid);
  },
};
