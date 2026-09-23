/**
 * UniqueKey Service
 */
import { KeyRepository } from "../repositories/key.repository.js";
import { ENV } from "../config/environment.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export const KeyService = {
  buildKeyRedeemUrl(key) {
    return `${ENV.UNIQUE_KEY_REDEEM_BASE}${encodeURIComponent(String(key || ""))}`;
  },

  encodeKey(key) {
    return btoa(String(key || ""))
      .replace(/\./g, "_")
      .replace(/#/g, "_")
      .replace(/\$/g, "_")
      .replace(/\[/g, "_")
      .replace(/\]/g, "_")
      .replace(/\//g, "_");
  },

  /**
   * Allocate an available key from a specified pool
   */
  async allocateKey(poolId, docId, userId) {
    if (!poolId) return null;

    try {
      const poolData = await KeyRepository.getKeyPool(poolId);
      if (!poolData) return null;

      const keys = Array.isArray(poolData.keys)
        ? poolData.keys
        : Array.isArray(poolData)
          ? poolData
          : Object.values(poolData || {}).filter((v) => typeof v === "string");

      if (!keys.length) return null;

      const used = (await KeyRepository.getKeyAllocations(poolId)) || {};

      const available = keys.filter((k) => {
        if (!k) return false;
        return !used[this.encodeKey(k)];
      });

      if (!available.length) return null;

      // Pick a random available key
      const chosen = available[Math.floor(Math.random() * available.length)];
      const safeChosen = this.encodeKey(chosen);

      await KeyRepository.setKeyAllocation(poolId, safeChosen, {
        docId,
        userId,
        assignedAt: Date.now(),
        status: "active",
        mode: "permanent_user",
        redeemUrl: this.buildKeyRedeemUrl(chosen),
        loginCount: 0,
        lastLoginAt: null,
      });

      return chosen;
    } catch (err) {
      logger.error("Key allocation failed:", err);
      return null;
    }
  },

  /**
   * Mark key as used / increment loginCount
   */
  async recordKeyLogin(poolId, key, userInfo = {}) {
    if (!poolId || !key) return;

    const safeKey = this.encodeKey(key);
    try {
      const allocation = (await KeyRepository.getSingleAllocation(poolId, safeKey)) || {};
      await KeyRepository.updateKeyAllocation(poolId, safeKey, {
        loginCount: Number(allocation.loginCount || 0) + 1,
        lastLoginAt: Date.now(),
        lastOpenedBy: userInfo.uid || "",
        lastOpenedName: userInfo.name || userInfo.email || "",
      });
    } catch (err) {
      logger.error("Record key login failed:", err);
    }
  },

  /**
   * Reissue key: marks old key replaced and allocates a new one
   */
  async reissueKey(poolId, docId, userId, oldKey) {
    const newKey = await this.allocateKey(poolId, docId, userId);
    if (!newKey) return null;

    if (oldKey) {
      const safeOldKey = this.encodeKey(oldKey);
      try {
        await KeyRepository.updateKeyAllocation(poolId, safeOldKey, {
          status: "replaced",
          replacedAt: Date.now(),
        });
      } catch (err) {
        logger.warn("Failed to mark old key replaced:", err);
      }
    }

    return newKey;
  },

  /**
   * Log key usage
   */
  async logKeyUsage(payload) {
    try {
      await KeyRepository.logKeyUsage(payload);
    } catch (err) {
      logger.warn("Log key usage failed:", err);
    }
  },
};
