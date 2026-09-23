/**
 * Bundle / Combo Repository for DkDocShop 2.0
 * Encapsulates Firebase RTDB operations for document packages.
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { logger } from "../utils/logger.js";

const COLLECTION = "bundles";
const STORAGE_KEY = "dkdocshop_admin_bundles";

export const BundleRepository = {
  /**
   * Get all bundles
   */
  async getAll() {
    try {
      const fbData = await FirebaseRepository.getAll(COLLECTION);
      if (fbData && typeof fbData === "object" && Object.keys(fbData).length > 0) {
        return fbData;
      }
    } catch (e) {
      logger.debug("BundleRepository getAll fallback to local:", e);
    }

    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const map = {};
          parsed.forEach((b) => {
            if (b && b.id) map[b.id] = b;
          });
          return map;
        }
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  },

  /**
   * Get bundle by ID
   */
  async getById(id) {
    if (!id) return null;
    try {
      const fbItem = await FirebaseRepository.get(COLLECTION, id);
      if (fbItem) return fbItem;
    } catch (e) {
      logger.debug(`BundleRepository getById fallback for ${id}:`, e);
    }

    const all = await this.getAll();
    return all[id] || null;
  },

  /**
   * Save or overwrite bundle
   */
  async save(id, bundleData) {
    if (!id || !bundleData) return false;

    // 1. Update local storage
    try {
      const all = await this.getAll();
      all[id] = { ...bundleData, id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.values(all)));
    } catch (e) {
      logger.warn("Failed to save bundle locally:", e);
    }

    // 2. Persist to Firebase
    try {
      await FirebaseRepository.set(COLLECTION, id, bundleData);
      return true;
    } catch (err) {
      logger.debug("BundleRepository save Firebase sync deferred:", err);
      return true;
    }
  },

  /**
   * Update partial bundle fields
   */
  async update(id, partial) {
    if (!id || !partial) return false;

    try {
      const all = await this.getAll();
      if (all[id]) {
        all[id] = { ...all[id], ...partial };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.values(all)));
      }
    } catch (e) {
      logger.warn("Failed to update bundle locally:", e);
    }

    try {
      await FirebaseRepository.update(COLLECTION, id, partial);
      return true;
    } catch (err) {
      logger.debug("BundleRepository update Firebase sync deferred:", err);
      return true;
    }
  },

  /**
   * Delete bundle
   */
  async remove(id) {
    if (!id) return false;

    try {
      const all = await this.getAll();
      delete all[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.values(all)));
    } catch (e) {
      logger.warn("Failed to delete bundle locally:", e);
    }

    try {
      await FirebaseRepository.remove(COLLECTION, id);
      return true;
    } catch (err) {
      logger.debug("BundleRepository remove Firebase sync deferred:", err);
      return true;
    }
  },
};

export default BundleRepository;
