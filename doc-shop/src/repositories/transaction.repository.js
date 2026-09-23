/**
 * Transaction Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";
import { memoryCache } from "../cache/memory-cache.js";
import { CacheKeys, cachePolicy } from "../cache/cache-policy.js";
import { APP_CONFIG } from "../config/app-config.js";

export const TransactionRepository = {
  /**
   * Get transactions for a user
   */
  async getTransactionsByUser(uid) {
    if (!uid) return {};
    return await FirebaseRepository.queryByChild(Collections.TRANSACTIONS, "userId", uid);
  },

  /**
   * Create transaction record
   */
  async createTransaction(txData) {
    cachePolicy.invalidateAdmin("tx");
    return await FirebaseRepository.push(Collections.TRANSACTIONS, txData);
  },

  /**
   * Update transaction (status, amount, note)
   */
  async updateTransaction(txId, partial) {
    cachePolicy.invalidateAdmin("tx");
    return await FirebaseRepository.update(Collections.TRANSACTIONS, txId, partial);
  },

  /**
   * Delete transaction (Admin only)
   */
  async deleteTransaction(txId) {
    cachePolicy.invalidateAdmin("tx");
    return await FirebaseRepository.remove(Collections.TRANSACTIONS, txId);
  },

  /**
   * Get all transactions (Admin only, cached)
   */
  async getAllTransactions(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.ADMIN_TX);
      if (cached) return cached;
    }

    const txs = await FirebaseRepository.getAll(Collections.TRANSACTIONS);
    memoryCache.set(CacheKeys.ADMIN_TX, txs, APP_CONFIG.CACHE.ADMIN_CACHE_TTL_MS);
    return txs;
  },
};
